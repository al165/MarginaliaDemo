import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import crypto from 'crypto';
import util from 'util';
import { exec } from 'child_process';
const execPromise = util.promisify(exec);

import express from 'express';
import { createServer } from 'http';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';

import multer, { diskStorage } from 'multer';

import { Server } from 'socket.io';

import { QuillDeltaToHtmlConverter } from 'quill-delta-to-html';

dotenv.configDotenv();

let UPLOADS_DIR = process.env.UPLOADS_DIR ?? "./uploads";
const storagePhoto = diskStorage({
    destination: path.join(UPLOADS_DIR, "tmp"),
    filename: (req, file, cb) => {
        console.log("file: ");
        console.log(file);

        if (!['image/webp', 'image/jpeg', 'image/png'].includes(file.mimetype))
            cb(null, false);

        cb(null, generateId(8) + path.extname(file.originalname));
    }
});
const uploadPhoto = multer({ storage: storagePhoto });


let BASE_URL = process.env.BASE_URL;
if (BASE_URL && BASE_URL.slice(-1) === '/')
    BASE_URL = BASE_URL.slice(0, -1);
console.log("BaseURL: " + BASE_URL);

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const dbPromise = open({ filename: './db/marginalia.db', driver: sqlite3.Database });

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3001;

const io = new Server(server);

let HAS_MAGICK = false;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Authentication middleware
async function checkEditToken(req, res, next) {
    if (!req.body.editToken && !req.query.editToken)
        throw new Error("editToken missing!");

    const { roomId } = req.params;

    const editToken = req.body.editToken || req.query.editToken;
    console.log(editToken);

    if (!roomId)
        throw new Error("roomId missing!");

    const row = await db.get("SELECT editToken FROM Rooms WHERE id = ?", [roomId]);

    if (!row || !row.editToken)
        throw new Error(`Error: roomId ${roomId} not found.`);

    if (row.editToken != editToken)
        throw new Error("incorrect editToken");

    next();
}

function generateId(length) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const randomBytes = crypto.randomBytes(length);
    let id = '';
    for (let i = 0; i < randomBytes.length; i++) {
        id += charset[randomBytes[i] % charset.length];
    }
    return id;
}

const DEFAULT_NOTE = JSON.stringify(
    {
        "ops": [
            { "insert": "Welcome to your room!" },
            {
                "attributes": { "header": 2 },
                "insert": "\n"
            },
            {
                "insert": "This is a room for you to start creating and editing notes.\n\nHover over this note and click on the pencil icon to enter edit mode where you can change the text. Clicking outside the note will save it automatically.\n\nYou can change the formatting by selecting some the format options below.\n\nTo make an annotation while in edit mode, highlight the text you want and click the highlighter on the right!\n\nTo publish, click on the envelope icon to be redirected to a public URL that you can share with the world! Users will not be able to edit the notes, only view them. You can share this URL if you want others to be able to edit your notes too! \n"
            }
        ]
    }
);

app.get(BASE_URL + '/room', asyncHandler(async (req, res) => {
    const rows = await db.all("SELECT id roomId, name, editToken FROM Rooms", []);

    res.json(rows);
}));

app.get(BASE_URL + '/room/:roomId', asyncHandler(async (req, res) => {
    const { roomId } = req.params;
    const { editToken } = req.query;

    const row = await db.get(
        "SELECT rootNote, createdOn, theme, name, editToken FROM Rooms WHERE id = ?",
        [roomId]
    );

    if (!row)
        throw new Error(`room ${roomId} not found`);

    row.roomId = roomId;
    row.canEdit = row.editToken == editToken;
    row.editToken = undefined;
    row.baseURL = BASE_URL;
    res.render('room', { room: row });
}));

app.get(BASE_URL + '/create', asyncHandler(async (req, res) => {
    res.render('create', { baseURL: BASE_URL });
}));

app.get(BASE_URL + '/roomlist', asyncHandler(async (req, res) => {
    res.render('roomlist', { baseURL: BASE_URL });
}));

app.get(BASE_URL + '/room/:roomId/note/:noteId', asyncHandler(async (req, res) => {
    const { roomId, noteId } = req.params;

    const row = await db.get("SELECT noteContent, noteOptions FROM Notes WHERE id = ?", [noteId]);

    if (!row || !row.noteContent)
        throw new Error(`Note ${noteId} not found`);

    res.json(row);
}));

app.get(BASE_URL + '/export/:roomId/', checkEditToken, asyncHandler(async (req, res) => {
    const { roomId } = req.params;

    console.log("Exporting room " + roomId);

    const notes = await db.all(`
        SELECT Notes.* FROM Notes 
        JOIN Rooms_Notes_XRef ON Notes.id = Rooms_Notes_XRef.noteId 
        WHERE Rooms_Notes_XRef.roomId = ?`, roomId);

    if (!notes) {
        console.err(`No notes found in room ${roomId}`);
        return res.sendStatus(404);
    }

    return res.json(notes);
}));

app.get(BASE_URL + '/static/:roomId/', asyncHandler(async (req, res) => {
    const { roomId } = req.params;

    console.log("Rendering static room " + roomId);

    const notes = await db.all(`
        SELECT Notes.id, noteContent, noteOptions FROM Notes 
        JOIN Rooms_Notes_XRef ON Notes.id = Rooms_Notes_XRef.noteId 
        WHERE Rooms_Notes_XRef.roomId = ?`, roomId);

    if (!notes) {
        console.err(`No notes found in room ${roomId}`);
        return res.sendStatus(404);
    }

    const row = await db.get(
        "SELECT rootNote, createdOn, theme, name, editToken FROM Rooms WHERE id = ?",
        [roomId]
    );

    if (!row)
        throw new Error(`room ${roomId} not found`);

    // Convert ops to HTML for easier editing
    for (const note of notes) {
        const ops = JSON.parse(note.noteContent)['ops'];
        const cfg = {
            customTag: function (format, op) {
                if (format === 'annotate') {
                    return 'mark';
                }
            },
            customTagAttributes: function (op) {
                if (op.attributes.annotate) {
                    return op.attributes.annotate;
                }
            }
        };
        const converter = new QuillDeltaToHtmlConverter(ops, cfg);

        const html = converter.convert();
        note.noteHtml = html;
        note.noteContent = undefined;
    }


    // get static resources
    const css = fs.readFileSync('./public/style.css').toString();
    // TODO: add icons (close/restore), scripts

    row.roomId = roomId;
    row.canEdit = false;
    row.editToken = undefined;
    row.baseURL = BASE_URL;
    row.renderStatic = true;

    return res.render('room', { room: row, notes, css });
}));

app.post(BASE_URL + '/room', asyncHandler(async (req, res) => {
    // Create new room
    // TODO: tidy-up new rooms that are not edited after some timeout

    const roomId = generateId(8);
    const editToken = generateId(16);
    const { roomName } = req.body;
    const createdOn = new Date();

    await db.run(
        "INSERT INTO Rooms(id, name, editToken, createdOn) VALUES (?, ?, ?, ?)",
        [roomId, roomName, editToken, createdOn]
    );

    console.log(`NEW ROOM: id ${roomId} editToken ${editToken}`);

    // Create a default note to get started:
    const noteId = generateId(16);

    await db.run(
        "INSERT INTO Notes (id, createdOn, noteContent, noteOptions) VALUES (?, ?, ?, ?)",
        [noteId, createdOn, DEFAULT_NOTE, null]
    );
    await db.run("INSERT INTO Rooms_Notes_XRef (roomId, noteId) VALUES (?, ?)", [roomId, noteId]);

    await db.run("UPDATE Rooms SET rootNote = ? WHERE id = ?", [noteId, roomId]);

    res.status(201).json({ roomId, editToken });
}));

app.delete(BASE_URL + '/room/:roomId', checkEditToken, asyncHandler(async (req, res) => {
    // Delete room
    const { roomId } = req.params;
    await db.run("DELETE FROM Rooms WHERE id = ?", [roomId]);

    // TODO: delete all notes from Notes and Rooms_notes_XRef...

    res.status(204);
}));

app.post(BASE_URL + '/room/:roomId/note', checkEditToken, asyncHandler(async (req, res) => {
    // Create a new note in the room

    const { roomId } = req.params;
    const { noteContent, noteOptions } = req.body;
    console.log("Creating new note in room " + roomId);

    if (!noteContent)
        throw new Error("noteContent is empty");

    const noteId = generateId(16);
    const createdOn = new Date();

    await db.run(
        "INSERT INTO Notes (id, createdOn, noteContent, noteOptions) VALUES (?, ?, ?, ?)",
        [noteId, createdOn, JSON.stringify(noteContent), JSON.stringify(noteOptions)]
    );

    console.log(`NEW NOTE: id ${noteId}`);

    // Add to cross-reference table
    await db.run("INSERT INTO Rooms_Notes_XRef (roomId, noteId) VALUES (?, ?)", [roomId, noteId]);

    const row = await db.get("SELECT rootNote FROM Rooms WHERE id = ?", [roomId]);

    if (!row)
        throw new Error("Error when checking rootNote: row is empty");

    if (!row.rootNote) {
        await db.run("UPDATE Rooms SET rootNote = ? WHERE id = ?", [noteId, roomId]);
        console.log(`Set rootNote to ${noteId}`);
    }

    res.status(201).json({ noteId });
}));

app.post(BASE_URL + '/upload', uploadPhoto.single('file'), asyncHandler(async (req, res) => {

    // convert to new file

    let newFilename = path.parse(req.file.filename).name + ".png";
    let newFilePath = path.join(UPLOADS_DIR, newFilename);
    let newFileURL = path.join('/uploads', newFilename);
    console.log(newFilename);

    try {
        let magickCommand = `convert ${req.file.path} -resize 256x256 -ordered-dither o2x2 ${newFilePath}`;
        if (HAS_MAGICK)
            magickCommand = 'magick ' + magickCommand;
        const { stdout, stderr } = await execPromise(magickCommand);
    } catch (err) {
        throw new Error(err.message, { cause: 'Converting image' });
    }

    // delete old file
    try {
        fs.unlinkSync(req.file.path);
    } catch (err) {
        throw new Error(err.message, { cause: 'Deleting tmp image' });
    }

    // return new file name
    res.json({ msg: { path: newFileURL } });
}));

app.delete(BASE_URL + '/room/:roomId/note/:noteId', checkEditToken, asyncHandler(async (req, res) => {
    // Delete note
    const { noteId } = req.params;
    console.log("Deleting note " + noteId);

    await db.run("DELETE FROM Notes WHERE id = ?", [noteId]);

    res.sendStatus(204);
}));

app.put(BASE_URL + '/room/:roomId/note/:noteId', checkEditToken, asyncHandler(async (req, res) => {
    // Edit a note in the room
    const { roomId, noteId } = req.params;
    console.log(`Updating note ${noteId}`);
    const { noteContent, noteOptions } = req.body;

    if (!noteContent) {
        console.log("Note is empty, deleting");

        await db.run("DELETE FROM Notes WHERE id = ?", [noteId]);
        res.status(204);
        return;
    }

    await db.run(
        "UPDATE Notes SET noteContent = ?, noteOptions = ? WHERE id = ?",
        [JSON.stringify(noteContent), JSON.stringify(noteOptions), noteId]
    );

    console.log(`UPDATED NOTE: id ${noteId}`);

    io.in(roomId).emit('noteUpdated', noteId);
    res.sendStatus(200);
}));

app.put(BASE_URL + '/room/:roomId', checkEditToken, asyncHandler(async (req, res) => {
    const { roomId } = req.params;
    console.log(`Updating room ${roomId}`);

    const { name, theme } = req.body;

    await db.run(
        "UPDATE Rooms SET name = ?, theme = ? WHERE id = ?",
        [name, theme, roomId]
    );

    res.sendStatus(200);
}));

app.get(BASE_URL + '/', asyncHandler(async (req, res) => {
    const roomId = 'welcome';

    const row = await db.get(
        "SELECT rootNote, createdOn, theme, name, editToken FROM Rooms WHERE id = ?",
        [roomId]
    );

    if (!row)
        throw new Error(`room ${roomId} not found`);

    row.roomId = roomId;
    row.canEdit = false;
    row.editToken = undefined;
    row.baseURL = BASE_URL;
    res.render('room', { room: row });
}));

app.use(BASE_URL, express.static(path.join(__dirname, 'public')));
app.use(BASE_URL + '/uploads', express.static(path.join(__dirname, UPLOADS_DIR)));

// Error handling middlewares
app.use((err, req, res, next) => {
    console.error("Unhandled Error:", err.message);
    console.error("Stack trace:", err.stack);
    res.status(500).render('error', { message: err.message || "Internal Server Error", rootURL: BASE_URL });
});

let usersEditingNotes = {};

io.on('connection', (socket) => {
    console.log('a user connected, id = ' + socket.id);

    socket.on('roomId', function (roomId) {
        console.log("user in room " + roomId);
        socket.join(roomId);

        // get currently locked notes and send list
        let lockedNotes = [];
        for (const data of Object.values(usersEditingNotes)) {
            if (data.roomId !== roomId)
                continue;

            if (data.lock)
                lockedNotes.push(data.noteId);
        }

        if (lockedNotes.length > 0) {
            socket.emit('lockedNotes', lockedNotes);
        }
    });

    socket.on('editingNote', function (data) {
        if (data.lock) {
            if (usersEditingNotes[socket.id])
                console.log("User already editing a note!");
            usersEditingNotes[socket.id] = data;
        }
        else
            delete usersEditingNotes[socket.id];

        socket.broadcast.to(data.roomId).emit('noteEditing', data);
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
        if (usersEditingNotes[socket.id]) {
            const { roomId, noteId } = usersEditingNotes[socket.id];
            socket.broadcast.to(roomId).emit('noteEditing', { roomId, noteId, lock: false });
            delete usersEditingNotes[socket.id];
        }
    });
});

let db;

async function setup() {
    // setup database
    db = await dbPromise;
    await db.migrate();
    await db.run("PRAGMA foreign_keys = ON;");
    await createHomeNote();

    fs.mkdirSync(path.join(UPLOADS_DIR, 'tmp'), { recursive: true })

    // check if `magick` command exists
    exec("which magick", (error, stdout) => {
        if (error)
            HAS_MAGICK = false;
        else
            HAS_MAGICK = true;

        console.log(`HAS_MAGICK: ${HAS_MAGICK}`);
    });

    server.listen(PORT, () => {
        console.log("listening on http://localhost:" + PORT + BASE_URL);
    });
}


async function createHomeNote() {
    console.log("Creating Homepage note");
    const roomEditToken = generateId(16);
    console.log(`Homepage editToken (keep it secret!): ${roomEditToken}`);

    const createdOn = new Date();

    const roomData = {
        id: 'welcome',
        name: 'home',
        createdOn,
        editToken: roomEditToken,
        rootNote: 'welcomeNote'
    }

    const welcomeNoteData = {
        id: 'welcomeNote',
        createdOn,
        noteContent: JSON.stringify(
            {
                "ops": [
                    {
                        "insert": "Welcome to "
                    },
                    {
                        "attributes": {
                            "annotate": {
                                "color": "oklch(0.65 0.4 312)",
                                "id": "about"
                            },
                            "italic": true
                        },
                        "insert": "Marginalia"
                    },
                    {
                        "attributes": {
                            "header": 2
                        },
                        "insert": "\n"
                    },
                    {
                        "insert": "The annotation and publishing platform that encourages writing in the margins. \n\nThis is a space for you to create notes, comment, annotate and elaborate your thoughts, and publish them for anyone else to see (or optionally edit!).\n\nWe believe that the "
                    },
                    {
                        "attributes": {
                            "annotate": {
                                "color": "oklch(0.65 0.4 95",
                                "id": "marginquote"
                            }
                        },
                        "insert": "margins"
                    },
                    {
                        "insert":
                            ", the footnotes and asides are as important as the main text, and we aim to foster a discourse within the messy organisation of thoughts and ideas in a free and open space.\n\n"
                    },
                    {
                        "attributes": {
                            "annotate": {
                                "color": "oklch(0.65 0.4 193)",
                                "id": "howtouse"
                            }
                        },
                        "insert": "Take a look around"
                    },
                    {
                        "insert": "! Or, "
                    },
                    {
                        "attributes": {
                            "link": BASE_URL + "/create"
                        },
                        "insert": "create a room"
                    },
                    {
                        "insert": " of ones own....\n\n"
                    },
                    {
                        "attributes": {
                            "italic": true
                        },
                        "insert": "Marginalia is still in early development and will be updated soon!"
                    },
                    {
                        "insert": "\n"
                    }
                ]
            }
        )

    }

    const aboutNoteData = {
        id: 'about',
        createdOn,
        noteContent: JSON.stringify(
            {
                "ops": [
                    {
                        "insert": "Marginalia is an open source project designed, created and developed by Senka and Arran.\n\nSupport from "
                    },
                    {
                        "attributes": {
                            "link": "https://www.stimuleringsfonds.nl/"
                        },
                        "insert": "Stimulerings Fonds"
                    },
                    {
                        "insert": ".\n"
                    }
                ]
            }
        )
    }

    const marginNote = {
        id: 'marginquote',
        createdOn,
        noteContent: JSON.stringify(
            {
                "ops": [
                    {
                        "insert": "Marginality as a site of resistance"
                    },
                    {
                        "attributes": {
                            "blockquote": true
                        },
                        "insert": "\n"
                    },
                    {
                        "attributes": {
                            "italic": true,
                        },
                        "insert": "bell hooks"
                    },
                    {
                        "attributes": {
                            "align": "right"
                        },
                        "insert": "\n"
                    }
                ]
            }
        )
    }

    const howToUseNote = {
        id: 'howtouse',
        createdOn,
        noteContent: JSON.stringify(
            {
                "ops": [
                    {
                        "insert": "Clicking on highlighted text opens the annotation, and deliberately disrupts the main flow of text.\n\n"
                    },
                    {
                        "attributes": {
                            "size": "small"
                        },
                        "insert": "("
                    },
                    {
                        "attributes": {
                            "italic": true,
                            "size": "small"
                        },
                        "insert": "don't worry, you can close a note by hovering over it and clicking the little X icon. You can also restore a split note by clicking the arrow icon on the upper right of any segment"
                    },
                    {
                        "attributes": {
                            "size": "small"
                        },
                        "insert": ")"
                    },
                    {
                        "insert": "\n"
                    }
                ]
            }
        )
    }

    const notes = [welcomeNoteData, aboutNoteData, marginNote, howToUseNote];
    const db = await dbPromise;
    await db.run("BEGIN TRANSACTION;");

    notes.map(async (noteData) => {
        await db.run(
            "INSERT INTO Notes (id, createdOn, noteContent) VALUES (?, ?, ?) ON CONFLICT(id) DO NOTHING;",
            [noteData.id, noteData.createdOn, noteData.noteContent],
            function (err) {
                if (err)
                    console.error(err);
                console.log("added note");
            });
    });

    await db.run(
        "INSERT INTO Rooms(id, name, editToken, createdOn, rootNote) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING;",
        [roomData.id, roomData.name, roomData.editToken, roomData.createdOn, roomData.rootNote],
        function (err) {
            if (err)
                console.error(err);
            console.log("Homepage finished");
        }

    );

    await db.run("COMMIT;");
    console.log("finished making homepage");
}

setup();
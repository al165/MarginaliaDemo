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
import { prettify, trimify } from 'htmlfy'

import multer, { diskStorage } from 'multer';

import { Server } from 'socket.io';

// For generating static marginalia
import esbuild from 'esbuild';
import { QuillDeltaToHtmlConverter } from 'quill-delta-to-html';

import { updateUploadsXRefTable } from './utils/utils.js';

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

function loadSvg(filePath, attrs = {}) {
    let svg = fs.readFileSync(path.resolve(filePath), 'utf8');

    // Strip XML/DOCTYPE headers
    svg = svg.replace(/<\?xml.*?\?>|<!DOCTYPE.*?>|<!--.*?-->/gs, '').trim();

    // Inject attributes into <svg ...>
    svg = svg.replace(/<svg\b([^>]*)>/, (match, existingAttrs) => {
        const attrString = Object.entries(attrs)
            .map(([k, v]) => `${k}="${v}"`)
            .join(' ');
        return `<svg ${existingAttrs} ${attrString}>`;
    });

    return svg;
}

function svgToBase64(filepath, attrs = {}) {
    const svg = loadSvg(filepath, attrs);
    const base64 = Buffer.from(svg).toString('base64');
    return `data:image/svg+xml;base64,${base64}`;
}

function imageToBase64(filepath) {
    const ext = path.extname(filepath).slice(1); // 'png', 'ico', 'svg'
    const mimeMap = {
        jpg: 'image/jpeg',
        png: 'image/png',
        ico: 'image/x-icon',
        svg: 'image/svg+xml',
    };

    const mime = mimeMap[ext];
    if (!mime) throw new Error(`Unsupported image type: .${ext}`);

    const buffer = fs.readFileSync(filepath);
    const base64 = buffer.toString('base64');
    const src = `data:${mime};base64,${base64}`;

    return { mime, src };
}

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

const DEFAULT_NOTE =
{
    "insert": "Welcome to your room!\n\nThis is a room for you to start creating and editing notes.\n\nHover over this note and click on the pencil icon to enter edit mode where you can change the text. Clicking outside the note will save it automatically.\n\nYou can change the formatting by selecting some the format options below.\n\nTo make an annotation while in edit mode, highlight the text you want and click the highlighter on the right!\n\nTo publish, click on the envelope icon to be redirected to a public URL that you can share with the world! Users will not be able to edit the notes, only view them. You can share this URL if you want others to be able to edit your notes too! \n"
};


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

    const row = await db.get("SELECT noteContent, noteOptions, noteType, createdOn FROM Notes WHERE id = ?", [noteId]);

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

    const noteData = {};
    for (const note of notes) {
        noteData[note.id] = note;
    }

    // Convert ops to HTML for easier editing
    for (const note of notes) {
        const ops = JSON.parse(note.noteContent)['ops'];

        // Convert image URLs to base64 strings
        for (const op of ops) {
            if (!op.insert || !op.insert.image)
                continue;

            let row = await db.get("SELECT * FROM Uploads WHERE fileUrl = ?", [op.insert.image]);
            if (!row) {
                console.log(`image with src ${fileURL} not in Uploads table, external?`);
                continue;
            }

            const filepath = path.join(row.path, row.filename);
            const imgBase64 = imageToBase64(filepath).src;
            op.insert.image = imgBase64;
        }

        const cfg = {
            customTag: function (format, op) {
                if (format === 'annotate') {
                    return 'mark';
                }
            },
            customTagAttributes: function (op) {
                if (op.attributes.annotate) {
                    return {
                        "data-id": op.attributes.annotate.id,
                        "data-color": op.attributes.annotate.color
                    }
                }
            }
        };
        const converter = new QuillDeltaToHtmlConverter(ops, cfg);

        const html = converter.convert();
        note.noteHtml = trimify(prettify(html, { ignore: ['mark', 'br'] }), ['br', 'p']);
        note.noteContent = undefined;
        note.noteOptions = JSON.parse(note.noteOptions);
    }


    // get static resources
    const css = fs.readFileSync('./public/style.css').toString();
    const closeIcon = svgToBase64('./public/icons/close.svg');
    const dragIcon = svgToBase64('./public/icons/28_drag.svg');
    const unbreakIcon = svgToBase64('./public/icons/29_unbreak.svg');
    const logo = svgToBase64('./public/0_logo.svg');

    const favicon = imageToBase64('./public/favicon.ico');
    const faviconHtml = `<link rel="icon" type="${favicon.mime}" href="${favicon.src}">`;

    row.roomId = roomId;
    row.canEdit = false;
    row.editToken = undefined;
    row.baseURL = BASE_URL;
    row.renderStatic = true;

    return res.render(
        'room',
        {
            room: row,
            notes: noteData,
            css,
            icons: { close: closeIcon, unbreak: unbreakIcon, drag: dragIcon, logo },
            favicon: faviconHtml
        });
}));

app.get(BASE_URL + '/newroom', asyncHandler(async (req, res) => {

    // app.post(BASE_URL + '/room', asyncHandler(async (req, res) => {
    // Create new room
    // TODO: tidy-up new rooms that are not edited after some timeout

    const roomId = generateId(8);
    const editToken = generateId(16);
    let { roomname } = req.query;
    if (!roomname)
        roomname = 'New room';
    const createdOn = new Date();

    await db.run(
        "INSERT INTO Rooms(id, name, editToken, createdOn) VALUES (?, ?, ?, ?)",
        [roomId, roomname, editToken, createdOn]
    );

    console.log(`NEW ROOM: id ${roomId} editToken ${editToken}`);

    // Create a default note to get started:
    const noteId = generateId(16);

    let newNoteOps = {
        'ops': [
            { "insert": roomname },
            {
                "attributes": { "header": 2 },
                "insert": "\n"
            },
            DEFAULT_NOTE
        ]
    }

    await db.run(
        "INSERT INTO Notes (id, createdOn, noteContent, noteOptions) VALUES (?, ?, ?, ?)",
        [noteId, createdOn, JSON.stringify(newNoteOps), null]
    );
    await db.run("INSERT OR IGNORE INTO Rooms_Notes_XRef (roomId, noteId) VALUES (?, ?)", [roomId, noteId]);

    await db.run("UPDATE Rooms SET rootNote = ? WHERE id = ?", [noteId, roomId]);

    // res.status(201).json({ roomId, editToken });
    res.redirect(`${BASE_URL}/room/${roomId}?editToken=${editToken}`);
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
    await db.run("INSERT OR IGNORE INTO Rooms_Notes_XRef (roomId, noteId) VALUES (?, ?)", [roomId, noteId]);

    const row = await db.get("SELECT rootNote FROM Rooms WHERE id = ?", [roomId]);

    if (!row)
        throw new Error("Error when checking rootNote: row is empty");

    if (!row.rootNote) {
        await db.run("UPDATE Rooms SET rootNote = ? WHERE id = ?", [noteId, roomId]);
        console.log(`Set rootNote to ${noteId}`);
    }

    // Check if any images are in the noteContent
    await updateUploadsXRefTable(db, noteId, noteContent);

    res.status(201).json({ noteId });
}));

app.post(BASE_URL + '/upload', uploadPhoto.single('file'), asyncHandler(async (req, res) => {

    // convert to new file

    const id = path.parse(req.file.filename).name;
    let newFilename = id + ".png";
    let newFilePath = path.join(UPLOADS_DIR, newFilename);
    let newFileURL = path.join('/uploads', newFilename);
    console.log(newFilename);

    try {
        let magickCommand = `convert ${req.file.path} -resize 512x512 -ordered-dither o2x2 ${newFilePath}`;
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

    // update Uploads table
    const createdOn = new Date();
    await db.run("INSERT INTO Uploads (id, createdOn, path, filename, fileUrl, mimetype) VALUES (?, ?, ?, ?, ?, ?)", [id, createdOn, UPLOADS_DIR, newFilename, newFileURL, 'png']);

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

    // Check if any images are in the noteContent
    await updateUploadsXRefTable(db, noteId, noteContent);

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

    // build static site for export
    esbuild.build({
        entryPoints: ['./public/js/roomStatic.js'],
        bundle: true,
        format: 'esm',
        platform: 'browser',
        write: false,
    }).then(result => {
        const bundledCode = result.outputFiles[0].text;
        fs.mkdirSync('./views/partials/generated/', { recursive: true });
        fs.writeFileSync('./views/partials/generated/roomStatic.ejs', bundledCode);
        console.log('JS bundled to roomStatic.ejs');
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
                            "annotate": {
                                "color": "oklch(0.65 0.4 312)",
                                "id": "createroom"
                            }
                        },
                        "insert": "create a room of ones own..."
                    },
                    {
                        "insert": "\n\n"
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

    const createRoomNote = {
        id: 'createroom',
        createdOn,
        noteContent: `<form action="${BASE_URL}/newroom">
<input type="text" name="roomname" style="margin: 0.5em 0.5em 0.5em 0em; padding: 0.2em" placeholder="Name of your room">
<input type="submit" value="Create your room" style="padding: 0.2em">
<p>Make sure to save or bookmark the next page so that you can return to it!<p>
</form>`,
        noteType: 1
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

    const notes = [welcomeNoteData, aboutNoteData, marginNote, howToUseNote, createRoomNote];
    const db = await dbPromise;
    await db.run("BEGIN TRANSACTION;");

    notes.map(async (noteData) => {
        await db.run(
            "INSERT INTO Notes (id, createdOn, noteContent, noteType) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO NOTHING;",
            [noteData.id, noteData.createdOn, noteData.noteContent, noteData.noteType ? noteData.noteType : 0],
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

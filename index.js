const path = require('path');
const crypto = require("crypto");

const express = require('express');
const bodyParser = require('body-parser')
const dotenv = require('dotenv');

const multer = require('multer');
const { error } = require('console');
const { diskStorage } = multer;

const storagePhoto = diskStorage({
    destination: 'uploads',
    filename: (req, file, cb) => {
        console.log("file: ");
        console.log(file);
        cb(null, generateId(8) + path.extname(file.originalname));
    }
});
const uploadPhoto = multer({ storage: storagePhoto });

dotenv.configDotenv();

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db/marginalia.db', (err) => {
    if (err)
        console.error(err.message);

    console.log('Connected to SQLite3 database');
});


const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


function checkEditToken(req, res, next) {
    if (!req.body.editToken) {
        res.status(401).json({ msg: 'editToken missing' });
        return;
    }

    const { roomId } = req.params;

    if (!roomId) {
        res.sendStatus(401).json({ msg: 'roomId missing' });
        return;
    }

    db.get("SELECT editToken FROM Rooms WHERE id = ?", [roomId], (err, row) => {
        if (err) {
            console.error("Error selecting editToken: " + err.message);
            res.status(500).json({ msg: err.message });
            return;
        }

        if (!row || !row.editToken) {
            console.error(`Error: roomId ${roomId} not found`);
            res.status(500).json({ msg: `Error: roomId ${roomId} not found` });
            return;
        }

        if (row.editToken != req.body.editToken) {
            console.error(`Edit tokens (req: ${req.body.editToken}, db: ${row.editToken}) do not match.`);
            res.status(401).json({ msg: 'incorrect editToken' });
            return;
        }

        next();
    })
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

async function createRoom() {

}

app.get('/room', function (req, res) {
    db.all("SELECT id roomId, name, editToken FROM Rooms", [], function (err, rows) {
        if (err) {
            console.err("Error getting all rooms: " + err.message);
            res.sendStatus(500);
            return;
        }

        res.json(rows);
    })
})

app.get('/room/:roomId', function (req, res) {
    const { roomId } = req.params;
    const { editToken } = req.query;

    db.get("SELECT rootNote, createdOn, theme, name, editToken FROM Rooms WHERE id = ?", [roomId], function (err, row) {
        if (err) {
            console.error("Error getting room " + roomId + ": " + err.message);
            res.status(500).json({ msg: err.message });
            return;
        }

        if (!row) {
            // not found, create a new room?
            // res.status(404).json({ msg: "Room not found" });
            res.render('notfound', { room: { roomId } })
            return;
        }

        // res.json(row);
        row.roomId = roomId;
        row.canEdit = row.editToken == editToken;
        row.editToken = undefined;
        console.log(row);
        res.render('room', { room: row });
    });
});

app.get('/room/:roomId/note/:noteId', function (req, res) {
    const { roomId, noteId } = req.params;
    db.get("SELECT noteContent, noteOptions FROM Notes WHERE id = ?", [noteId], function (err, row) {
        if (err) {
            console.log("Error getting note " + noteId + ": " + err.message);
            res.status(500).json({ msg: err.message });
            return;
        }

        if (!row || !row.noteContent) {
            res.status(404).json({ msg: "Note not found" });
            return;
        }

        res.json(row);
    });
});

app.post('/room', function (req, res) {
    // Create new room
    // TODO: tidy-up new rooms that are not edited after some timeout

    const roomId = generateId(8);
    const editToken = generateId(16);
    const { roomName } = req.body;
    const createdOn = new Date();

    db.run("INSERT INTO Rooms(id, name, editToken, createdOn) VALUES (?, ?, ?, ?)", [roomId, roomName, editToken, createdOn], function (err) {
        if (err) {
            console.error("Error creating new room: " + err.message);
            res.status(500).json({ msg: err.message });
            return;
        }

        console.log(`NEW ROOM: id ${roomId} editToken ${editToken}`);

        // Create a default note to get started:
        const noteId = generateId(16);
        const createdOn = new Date();

        db.run(
            "INSERT INTO Notes (id, createdOn, noteContent, noteOptions) VALUES (?, ?, ?, ?)",
            [noteId, createdOn, DEFAULT_NOTE, null],
            function (err) {
                if (err) {
                    console.error("Error creating new note: " + err.message);
                    res.status(500).json({ msg: err.message });
                    return;
                }

                console.log(`NEW NOTE: id ${noteId}`);
            }
        );

        db.run("UPDATE Rooms SET rootNote = ? WHERE id = ?", [noteId, roomId], function (err) {
            if (err) {
                console.error("Error when setting rootNote: " + err.message);
                return;
            }
        });

        res.status(201).json({ roomId, editToken });
    });

});

app.delete('/room/:roomId', checkEditToken, function (req, res) {
    // Delete room
    const { roomId } = req.params;
    db.run("DELETE FROM Rooms WHERE id = ?", [roomId], function (err) {
        if (err) {
            console.error(`Error deleting roomId = ${roomId}: ${err.message}`);
            res.status(500).json({ msg: err.message });
            return;
        }

        res.status(204);
    })
});

app.post('/room/:roomId/note', checkEditToken, function (req, res) {
    // Create a new note in the room

    const { roomId } = req.params;
    const { noteContent, noteOptions } = req.body;

    if (!noteContent) {
        console.log("Creating new but empty note, discarding");
        res.status(204).json({ msg: 'not creating empty note' });
        return;
    }

    const noteId = generateId(16);
    const createdOn = new Date();

    db.run(
        "INSERT INTO Notes (id, createdOn, noteContent, noteOptions) VALUES (?, ?, ?, ?)",
        [noteId, createdOn, JSON.stringify(noteContent), JSON.stringify(noteOptions)],
        function (err) {
            if (err) {
                console.error("Error creating new note: " + err.message);
                res.status(500).json({ msg: err.message });
                return;
            }

            console.log(`NEW NOTE: id ${noteId}`);

            // Todo: check if roomId has a rootNote, and if not then update to this...
            db.get("SELECT rootNote FROM Rooms WHERE id = ?", [roomId], function (err, row) {
                if (err) {
                    console.error("Error checking rootNote" + err.message);
                    return;
                }

                if (!row) {
                    console.error("Error when checking rootNote: row is empty");
                    return;
                }

                if (row.rootNote) {
                    return;
                }

                db.run("UPDATE Rooms SET rootNote = ? WHERE id = ?", [noteId, roomId], function (err) {
                    if (err) {
                        console.error("Error when setting rootNote: " + err.message);
                        return;
                    }
                    console.log(`Set rootNote to ${noteId}`);
                });
            })
            res.status(201).json({ noteId });
        }
    );
});

app.post('/upload', uploadPhoto.single('file'), function (req, res) {
    console.log(req.file.filename);

    res.json({ msg: req.file });
});

app.delete('/room/:roomId/note/:noteId', checkEditToken, function (req, res) {
    // Delete note
    const { noteId } = req.params;

    db.run("DELETE FROM Notes WHERE id = ?", [noteId], function (err) {
        if (err) {
            console.error(`Error deleting noteId = ${noteId}: ${err.message}`);
            res.status(500).json({ msg: err.message });
            return;
        }

        res.status(204);
    });
});

app.put('/room/:roomId/note/:noteId', checkEditToken, function (req, res) {
    // Edit a note in the room
    const { noteId } = req.params;
    console.log(`Updating note ${noteId}`);
    const { noteContent, noteOptions } = req.body;

    if (!noteContent) {
        console.log("Note is empty, deleting");

        db.run("DELETE FROM Notes WHERE id = ?", [noteId], function (err) {
            if (err) {
                console.error(`Error deleting noteId = ${noteId}: ${err.message}`);
                res.status(500).json({ msg: err.message });
                return;
            }

            res.status(204);
        });
        return;
    }

    db.run(
        "UPDATE Notes SET noteContent = ?, noteOptions = ? WHERE id = ?",
        [JSON.stringify(noteContent), JSON.stringify(noteOptions), noteId],
        function (err) {
            if (err) {
                console.error("Error editing note: " + err.message);
                res.status(500).json({ msg: err.message });
                return;
            }

            console.log(`UPDATED NOTE: id ${noteId}`);

            res.sendStatus(200);
        }
    );
});

app.put('/room/:roomId', checkEditToken, function (req, res) {
    const { roomId } = req.params;
    console.log(`Updating room ${roomId}`);

    const { name, theme } = req.body;

    db.run(
        "UPDATE Rooms SET name = ?, theme = ? WHERE id = ?",
        [name, theme, roomId],
        function (err) {
            if (err) {
                console.err("Errorediting room: " + err.message);
                res.status(500).json({ msg: err.message });
                return;
            }

            res.sendStatus(200);
        }
    )
});

app.get('/', function (req, res) {
    res.redirect(302, '/room/welcome');
})

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.listen(PORT, () => {
    console.log("listening on http://localhost:" + PORT);

    db.serialize(() => {

        let sql = "CREATE TABLE IF NOT EXISTS Notes (" +
            "id TEXT PRIMARY KEY UNIQUE, " +
            "userId INTEGER, " +
            "createdOn INTEGER, " +
            "noteContent TEXT, " +
            "noteOptions TEXT" +
            ")";

        db.run(sql, (err) => {
            if (err)
                console.error("Error creating Notes table: " + err.message);
            else
                console.log("Created table Notes");
        });

        sql = "CREATE TABLE IF NOT EXISTS Rooms (" +
            "id TEXT PRIMARY KEY UNIQUE, " +
            "name TEXT, " +
            "userId INTEGER, " +
            "createdOn INTEGER, " +
            "theme TEXT, " +
            "editToken TEXT, " +
            "rootNote TEXT" +
            ")";

        db.run(sql, (err) => {
            if (err)
                console.error("Error creating Rooms table: " + err.message);
            else
                console.log("Created table Rooms");
        });

        sql = "CREATE TABLE IF NOT EXISTS Rooms_Notes_XRef (" +
            "roomId TEXT, " +
            "noteId TEXT, " +
            "FOREIGN KEY (roomId) REFERENCES Rooms (id), " +
            "FOREIGN KEY (noteId) REFERENCES Notes (id)" +
            ")";

        db.run(sql, (err) => {
            if (err)
                console.error("Error creating Rooms_Notes_XRef table: " + err.message);
            else
                console.log("Created table Rooms_Notes_XRef");
        });

        sql = "CREATE TABLE IF NOT EXISTS Users (" +
            "id INTEGER, " +
            "name TEXT" +
            ")";

        db.run(sql, (err) => {
            if (err)
                console.error("Error creating Users table: " + err.message);
            else
                console.log("Created table Users");
        });

        // sql = "SELECT name FROM Rooms WHERE id = ?"
        // db.get(sql, ['welcome'], function (err, row) {
        //     if (err) {
        //         console.error("Error checking if home room exists: " + err.message);
        //         return;
        //     }

        //     if (!row)
        createHomeNote();
        // })

    });
});

function createHomeNote() {
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
                            "link": "/create.html"
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

    notes.map(noteData => {
        db.run(
            "INSERT INTO Notes (id, createdOn, noteContent) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET noteContent = ?",
            [noteData.id, noteData.createdOn, noteData.noteContent, noteData.noteContent],
            function (err) {
                if (err)
                    console.error(err);
            });
    });

    db.run(
        "INSERT INTO Rooms(id, name, editToken, createdOn, rootNote) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING",
        [roomData.id, roomData.name, roomData.editToken, roomData.createdOn, roomData.rootNote],
        function (err) {
            if (err)
                console.error(err);
        });
}
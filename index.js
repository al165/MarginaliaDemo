const path = require('path');
const crypto = require("crypto");

const express = require('express');
const bodyParser = require('body-parser')
const dotenv = require('dotenv');

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

const DEFAULT_NOTE = `
{
    "ops": [
      {
        "insert": "Welcome to Marginalia"
      },
      {
        "attributes": {
          "header": 2
        },
        "insert": "\\n"
      },
      {
        "insert": "This is a test of the api "
      },
      {
        "attributes": {
          "italic": true
        },
        "insert": "have fun!"
      },
      {
        "insert": "\\n"
      }
    ]
  }
`;

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

app.use(express.static(path.join(__dirname, 'public')));

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

    });
});


// To help with migrations, recalculate the Rooms_Notes_XRef table


// Create DB connection
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const dbPromise = open({ filename: './db/marginalia.db', driver: sqlite3.Database });
const db = await dbPromise;
await db.migrate();
await db.run("PRAGMA foreign_keys = OFF;");

// Clear Rooms_Notes_XRef table
await db.run(`DROP TRIGGER IF EXISTS delete_orphan_notes`);
await db.run("DELETE FROM Rooms_Notes_XRef");

// Iterate over every room
const rooms = await db.all("SELECT * FROM Rooms");
console.log(`Number of Rooms: ${rooms.length}`);

async function parseNote(noteId) {
    let noteList = [];

    const noteRow = await db.get("SELECT * FROM Notes WHERE id = ?", [noteId]);
    if (!noteRow) {
        console.warn(`Warning: Note ${noteId} not found in Notes. Skipping.`);
        return noteList;
    }

    const noteOps = JSON.parse(noteRow.noteContent)['ops'];

    if (!noteOps) {
        console.warn(`Warning: 'ops' not defined for note ${noteId}. Skipping.`);
        return noteList;
    }

    noteList.push(noteId);

    for (const op of noteOps) {
        if (!op.attributes) continue;

        if (!op.attributes.annotate) continue;

        const noteReference = op.attributes.annotate.id;
        // console.log(` - Found note ${noteReference}`);
        let nestedNotes = await parseNote(noteReference);
        noteList = noteList.concat(nestedNotes);
    }

    return noteList;
}

for (const room of rooms) {
    const roomId = room.id;
    console.log(`parsing room ${roomId}`);

    if (!room.rootNote) {
        console.warn(`Warning: Room ${roomId} has no root note. Skipping.`);
        continue;
    }

    const noteList = await parseNote(room.rootNote);

    db.getDatabaseInstance().serialize(async () => {
        const stmt = await db.prepare(`
          INSERT OR IGNORE INTO Rooms_Notes_XRef (roomId, noteId) VALUES (?, ?)
        `);

        for (const noteId of noteList) {
            stmt.run(roomId, noteId);
        }

        stmt.finalize((err) => {
            if (err) throw err;
            console.log(`Inserted ${noteList.length} pairs (ignoring duplicates).`);
        });
    });

    console.log("");
}

// Reinstatiate the trigger
await db.run(`
    CREATE TRIGGER IF NOT EXISTS delete_orphan_notes
    AFTER DELETE ON Rooms_Notes_XRef
    BEGIN
    DELETE FROM Notes
    WHERE id NOT IN (
        SELECT noteId FROM Rooms_Notes_XRef
    );
    END;
`);

db.close();

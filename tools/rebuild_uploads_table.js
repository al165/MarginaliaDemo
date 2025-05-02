// To help with migrating: rebuild the Uploads (and XRef) table

// Create DB connection
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

import { updateUploadsXRefTable } from '../utils/utils.js';

const dbPromise = open({ filename: './db/marginalia.db', driver: sqlite3.Database });
const db = await dbPromise;
await db.migrate();
await db.run("PRAGMA foreign_keys = OFF;");

// Clear tables
await db.run("DELETE FROM Uploads");
await db.run("DELETE FROM Notes_Uploads_XRef");

// Iterate over every note
const notes = await db.all("SELECT * FROM Notes");
console.log(`Number of Notes: ${notes.length}`);

for (const note of notes) {

    updateUploadsXRefTable(db, note.id, JSON.parse(note.noteContent));
}
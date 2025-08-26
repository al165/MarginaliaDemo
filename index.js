import process from "node:process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import util from "util";
import { exec } from "child_process";
const execPromise = util.promisify(exec);

import express from "express";
import { createServer } from "http";
import bodyParser from "body-parser";
import dotenv from "dotenv";

import multer, { diskStorage } from "multer";

import { createHomeNote, DEFAULT_NOTE } from "./server/initialise.js";
import { generateId, buildNoteTree } from "./server/utils.js";

// For generating static marginalia
import esbuild from "esbuild";
import { createStatic } from "./server/createStatic.js";

// Setup collaboration server
import { setupYjsServer } from "./server/collaboration.js";

dotenv.configDotenv();

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? "./uploads";
const storagePhoto = diskStorage({
  destination: path.join(UPLOADS_DIR, "tmp"),
  filename: (_req, file, cb) => {
    console.log("file: ");
    console.log(file);

    if (!["image/webp", "image/jpeg", "image/png"].includes(file.mimetype))
      cb(null, false);

    cb(null, generateId(8) + path.extname(file.originalname));
  },
});
const uploadPhoto = multer({ storage: storagePhoto });

let BASE_URL = process.env.BASE_URL || "";
if (BASE_URL && BASE_URL.slice(-1) === "/") BASE_URL = BASE_URL.slice(0, -1);
console.log("BaseURL: " + BASE_URL);

import { makeIconURLs } from "./server/resources.js";
const ICON_URLS = makeIconURLs(BASE_URL);

import sqlite3 from "sqlite3";
import { open } from "sqlite";

const dbPromise = open({
  filename: "./db/marginalia.db",
  driver: sqlite3.Database,
});

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3001;

let HAS_MAGICK = false;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Authentication middleware
async function checkEditToken(req, _res, next) {
  if (!req.body.editToken && !req.query.editToken)
    return next(new Error("editToken missing!"));

  const { roomId, noteId } = req.params;

  const editToken = req.body.editToken || req.query.editToken;

  if (!editToken)
    return next(new Error("editToken missing"));

  if (!roomId)
    return next(new Error("roomId missing"));

  const row = await db.get("SELECT editToken FROM Rooms WHERE id = ?", [
    roomId,
  ]);

  if (!row || !row.editToken)
    return next(new Error(`Error: roomId ${roomId} not found.`));

  if (row.editToken != editToken)
    return next(new Error("Incorrect editToken"));

  if (noteId) {
    // check if note is in same room
    const roomNotesRow = await db.get("SELECT * FROM Rooms_Notes_XRef WHERE noteId = ?", [noteId]);
    if (!roomNotesRow || roomNotesRow.roomId !== roomId)
      return next(new Error('Note in wrong room'));
  }

  next();
}

app.get(
  BASE_URL + "/room/:roomId",
  asyncHandler(async (req, res) => {
    const { roomId } = req.params;
    const { editToken } = req.query;

    const row = await db.get(
      "SELECT rootNote, createdOn, theme, name, editToken FROM Rooms WHERE id = ?",
      [roomId],
    );

    if (!row) throw new Error(`room ${roomId} not found`);

    row.roomId = roomId;
    row.canEdit = row.editToken == editToken;
    row.editToken = undefined;
    row.baseURL = BASE_URL;
    res.render("room", { room: row, icons: ICON_URLS });
  }),
);

app.get(
  BASE_URL + "/create",
  asyncHandler(async (_req, res) => {
    res.render("create", { baseURL: BASE_URL });
  }),
);

app.get(
  BASE_URL + "/roomlist",
  asyncHandler(async (_req, res) => {
    const rooms = await db.all(
      "SELECT id roomId, name, editToken FROM Rooms",
      [],
    );

    res.render("roomlist", { baseURL: BASE_URL, rooms });
  }),
);

app.get(
  BASE_URL + "/room/:roomId/note/:noteId",
  asyncHandler(async (req, res) => {
    const { noteId } = req.params;

    const row = await db.get(
      "SELECT noteContent, noteOptions, noteType, createdOn FROM Notes WHERE id = ?",
      [noteId],
    );

    if (!row || !row.noteContent)
      throw new Error(`Note ${noteId} not found`);

    res.json(row);
  }),
);

app.get(
  BASE_URL + "/export/:roomId/",
  checkEditToken,
  asyncHandler(async (req, res) => {
    const { roomId } = req.params;

    console.log("Exporting room " + roomId);

    const notes = await db.all(
      `
        SELECT Notes.* FROM Notes 
        JOIN Rooms_Notes_XRef ON Notes.id = Rooms_Notes_XRef.noteId 
        WHERE Rooms_Notes_XRef.roomId = ?`,
      roomId,
    );

    if (!notes) {
      console.err(`No notes found in room ${roomId}`);
      return res.sendStatus(404);
    }

    return res.json(notes);
  }),
);

app.get(
  BASE_URL + "/static/:roomId/",
  asyncHandler(async (req, res) => {
    const { roomId } = req.params;

    const result = await createStatic(db, roomId, BASE_URL);

    return res.render("room", result);
  }),
);

app.get(
  BASE_URL + "/newroom",
  asyncHandler(async (req, res) => {
    // app.post(BASE_URL + '/room', asyncHandler(async (req, res) => {
    // Create new room
    // TODO: tidy-up new rooms that are not edited after some timeout

    const roomId = generateId(8);
    const editToken = generateId(16);
    let { roomname } = req.query;
    if (!roomname) roomname = "New room";
    const createdOn = new Date();

    await db.run(
      "INSERT INTO Rooms(id, name, editToken, createdOn) VALUES (?, ?, ?, ?)",
      [roomId, roomname, editToken, createdOn],
    );

    console.log(`NEW ROOM: id ${roomId} editToken ${editToken}`);

    // Create a default note to get started:
    const noteId = generateId(16);

    let newNoteOps = {
      ops: [
        { insert: roomname },
        {
          attributes: { header: 2 },
          insert: "\n",
        },
        DEFAULT_NOTE,
      ],
    };

    await db.run(
      "INSERT INTO Notes (id, createdOn, noteContent, noteOptions) VALUES (?, ?, ?, ?)",
      [noteId, createdOn, JSON.stringify(newNoteOps), null],
    );
    await db.run(
      "INSERT OR IGNORE INTO Rooms_Notes_XRef (roomId, noteId) VALUES (?, ?)",
      [roomId, noteId],
    );

    await db.run("UPDATE Rooms SET rootNote = ? WHERE id = ?", [
      noteId,
      roomId,
    ]);

    // res.status(201).json({ roomId, editToken });
    res.redirect(`${BASE_URL}/room/${roomId}?editToken=${editToken}`);
  }),
);

app.get(
  BASE_URL + "/room/:roomId/newnote",
  checkEditToken,
  asyncHandler(async (req, res) => {
    const { roomId } = req.params;

    const noteId = generateId(16);
    const createdOn = new Date();

    await db.run(
      "INSERT INTO Notes (id, createdOn) VALUES (?, ?)",
      [
        noteId,
        createdOn,
      ],
    );

    await db.run(
      "INSERT OR IGNORE INTO Rooms_Notes_XRef (roomId, noteId) VALUES (?, ?)",
      [roomId, noteId],
    );

    res.json({ noteId });
  }),
);

app.get(
  BASE_URL + "/room/:roomId/path/:noteId",
  asyncHandler(async (req, res) => {
    const { roomId, noteId } = req.params;

    const roomRow = await db.get("SELECT rootNote FROM Rooms WHERE id = ?", [roomId]);

    if (!roomRow || !roomRow.rootNote)
      return res.sendStatus(404);

    const tree = await buildNoteTree(db, roomRow.rootNote);
    const path = tree.path(noteId);

    return res.json(path);
  }),
);

app.delete(
  BASE_URL + "/room/:roomId",
  checkEditToken,
  asyncHandler(async (req, res) => {
    // Delete room
    const { roomId } = req.params;
    await db.run("DELETE FROM Rooms WHERE id = ?", [roomId]);

    // TODO: delete all notes from Notes and Rooms_notes_XRef...

    res.status(204);
  }),
);

app.post(
  BASE_URL + "/upload",
  uploadPhoto.single("file"),
  asyncHandler(async (req, res) => {
    // convert to new file

    const id = path.parse(req.file.filename).name;
    let newFilename = id + ".png";
    let newFilePath = path.join(UPLOADS_DIR, newFilename);
    let newFileURL = path.join("/uploads", newFilename);
    console.log(newFilename);

    try {
      let magickCommand = `convert ${req.file.path} -resize 512x512 -ordered-dither o2x2 ${newFilePath}`;
      if (HAS_MAGICK) magickCommand = "magick " + magickCommand;
      await execPromise(magickCommand);
    } catch (err) {
      throw new Error(err.message, { cause: "Converting image" });
    }

    // delete old file
    try {
      fs.unlinkSync(req.file.path);
    } catch (err) {
      throw new Error(err.message, { cause: "Deleting tmp image" });
    }

    // update Uploads table
    const createdOn = new Date();
    await db.run(
      "INSERT INTO Uploads (id, createdOn, path, filename, fileUrl, mimetype) VALUES (?, ?, ?, ?, ?, ?)",
      [id, createdOn, UPLOADS_DIR, newFilename, newFileURL, "png"],
    );

    // return new file name
    res.json({ msg: { path: newFileURL } });
  }),
);

app.delete(
  BASE_URL + "/room/:roomId/note/:noteId",
  checkEditToken,
  asyncHandler(async (req, res) => {
    // Delete note
    const { noteId, roomId } = req.params;
    console.log("Deleting note " + noteId);

    // Check if not root note
    const roomRow = await db.get("SELECT rootNote FROM Rooms WHERE id = ?", [roomId]);

    if (!roomRow)
      throw new Error(`Room ${roomId} not found`);

    if (roomRow.rootNote === noteId) {
      return res.sendStatus(403);
    }

    await db.run("DELETE FROM Notes WHERE id = ?", [noteId]);

    res.sendStatus(204);
  }),
);

app.put(
  BASE_URL + "/room/:roomId",
  checkEditToken,
  asyncHandler(async (req, res) => {
    const { roomId } = req.params;
    console.log(`Updating room ${roomId}`);

    const { name, theme } = req.body;

    await db.run("UPDATE Rooms SET name = ?, theme = ? WHERE id = ?", [
      name,
      theme,
      roomId,
    ]);

    res.sendStatus(200);
  }),
);

app.get(
  BASE_URL + "/",
  asyncHandler(async (_req, res) => {
    const roomId = "welcome";

    const row = await db.get(
      "SELECT rootNote, createdOn, theme, name, editToken FROM Rooms WHERE id = ?",
      [roomId],
    );

    if (!row) throw new Error(`room ${roomId} not found`);

    row.roomId = roomId;
    row.canEdit = false;
    row.editToken = undefined;
    row.baseURL = BASE_URL;
    res.render("room", { room: row, icons: ICON_URLS });
  }),
);

app.use(BASE_URL, express.static(path.join(__dirname, "public")));

app.use(
  BASE_URL + "/uploads",
  express.static(path.join(__dirname, UPLOADS_DIR)),
);

// Error handling middleware
app.use((err, _req, res, _next) => {
  console.error("Error caught by middleware:", err.message);
  console.error("Stack trace:", err.stack);
  res.status(500).render("error", {
    message: err.message || "Internal Server Error",
    rootURL: BASE_URL,
  });
});

let db;

async function setup() {
  // setup database
  db = await dbPromise;
  await db.migrate();
  await db.run("PRAGMA foreign_keys = ON;");
  await createHomeNote(db, BASE_URL);
  const wss = setupYjsServer(db);

  fs.mkdirSync(path.join(UPLOADS_DIR, "tmp"), { recursive: true });

  // check if `magick` command exists
  exec("which magick", (error, _stdout) => {
    if (error) HAS_MAGICK = false;
    else HAS_MAGICK = true;

    console.log(`HAS_MAGICK: ${HAS_MAGICK}`);
  });

  // build static site for export
  esbuild
    .build({
      entryPoints: ["./public/js/roomStatic.js"],
      bundle: true,
      format: "esm",
      platform: "browser",
      write: false,
    })
    .then((result) => {
      const bundledCode = result.outputFiles[0].text;
      fs.mkdirSync("./views/partials/generated/", { recursive: true });
      fs.writeFileSync(
        "./views/partials/generated/roomStatic.ejs",
        bundledCode,
      );
      console.log("JS bundled to roomStatic.ejs\n");
    });

  server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, ws => {
      wss.emit('connection', ws, request)
    })
  });

  server.listen(PORT, () => {
    console.log("listening on http://localhost:" + PORT + BASE_URL);
    console.log();
  });
}

setup();

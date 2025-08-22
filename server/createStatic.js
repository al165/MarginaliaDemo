import fs from 'fs';
import path from 'path';

import beautify from 'js-beautify';
import { QuillDeltaToHtmlConverter } from "quill-delta-to-html";

import { svgToBase64, imageToBase64 } from './utils.js';

export async function createStatic(db, roomId, baseURL) {
    console.log("Rendering static room " + roomId);

    const notes = await db.all(
        `SELECT * FROM Notes 
         JOIN Rooms_Notes_XRef ON Notes.id = Rooms_Notes_XRef.noteId 
         WHERE Rooms_Notes_XRef.roomId = ?`,
        roomId,
    );

    if (!notes || notes.length === 0)
        throw new Error(`No notes found in room ${roomId}`);

    const row = await db.get(
        "SELECT rootNote, createdOn, theme, name, editToken FROM Rooms WHERE id = ?",
        [roomId],
    );

    if (!row)
        throw new Error(`room ${roomId} not found`);

    const noteData = {};
    for (const note of notes) {
        noteData[note.id] = note;
    }

    // Convert ops to HTML for easier editing
    for (const note of notes) {
        // console.log(note);
        note.noteOptions = JSON.parse(note.noteOptions) || {};
        if (note.noteType) {
            console.log("pure HTML note type");
            note.noteHtml = note.noteContent;
            note.noteContent = undefined;
            continue;
        }

        const ops = JSON.parse(note.noteContent)["ops"];

        // Convert image URLs to base64 strings
        for (const op of ops) {
            if (!op.insert || !op.insert.image) continue;

            let row = await db.get("SELECT * FROM Uploads WHERE fileUrl = ?", [
                op.insert.image,
            ]);
            if (!row) {
                console.log(
                    `image with src ${fileURL} not in Uploads table, external?`,
                );
                continue;
            }

            const filepath = path.join(row.path, row.filename);
            const imgBase64 = imageToBase64(filepath).src;
            op.insert.image = imgBase64;
        }

        const cfg = {
            customTag: function (format, _op) {
                if (format === "annotate") {
                    return "mark";
                }
            },
            customTagAttributes: function (op) {
                if (op.attributes.annotate) {
                    return {
                        "data-id": op.attributes.annotate.id,
                        "data-color": op.attributes.annotate.color,
                    };
                }
            },
        };
        const converter = new QuillDeltaToHtmlConverter(ops, cfg);

        console.log(note.noteOptions);
        const rawHtml = converter.convert();
        const divTag = `<div class="static-note" data-id="${note.noteId}" data-width="${note.noteOptions.width || 340}">`
        const html = `${divTag}${rawHtml}</div>`;
        const tidyHtml = beautify.html(html, {
            indent_size: 2,
            // wrap_line_length: 120,
            preserve_newlines: false,
            max_preserve_newlines: 1,
        });

        console.log(tidyHtml);
        note.noteHtml = tidyHtml;
        note.noteContent = undefined;
    }

    // get static resources
    const css = fs.readFileSync("./public/style.css").toString();
    const closeIcon = svgToBase64("./public/icons/close.svg");
    const dragIcon = svgToBase64("./public/icons/28_drag.svg");
    const unbreakIcon = svgToBase64("./public/icons/29_unbreak.svg");
    const logo = svgToBase64("./public/logo.svg");

    const favicon = imageToBase64("./public/favicon.ico");
    const faviconHtml = `<link rel="icon" type="${favicon.mime}" href="${favicon.src}">`;

    row.roomId = roomId;
    row.canEdit = false;
    row.editToken = undefined;
    row.baseURL = baseURL;
    row.renderStatic = true;

    return {
        room: row,
        notes: noteData,
        css,
        icons: { close: closeIcon, unbreak: unbreakIcon, drag: dragIcon, logo },
        favicon: faviconHtml,
    }
}
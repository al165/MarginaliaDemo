import * as Y from 'yjs';
import { WebSocketServer } from 'ws'
import { createYjsServer } from 'yjs-server'

import { updateUploadsXRefTable } from "./cleanup.js";

let yjss;

async function authorise(db, socket, req) {
    const url = new URL(req.url, 'http://localhost');

    const editToken = url.searchParams.get('editToken');
    const roomId = url.searchParams.get('roomId');
    const noteId = url.searchParams.get('noteId');

    // 1. check if note belongs in room
    const roomNotesRow = await db.get("SELECT * FROM Rooms_Notes_XRef WHERE noteId = ?", [noteId]);
    if (!roomNotesRow) {
        console.log("authorise: notes not found");
        return true;
    }

    if (roomNotesRow.roomId !== roomId)
        throw new Error('Wrong room');

    // 2. check editToken
    const noteRow = await db.get("SELECT editToken FROM Rooms WHERE id = ?", [roomId]);
    if (noteRow.editToken !== editToken)
        throw new Error('Wrong editToken');

    return true
}

export function setupYjsServer(db) {
    let wss = new WebSocketServer({ noServer: true });
    wss.on('connection', (socket, request) => {
        const whenAuthorised = authorise(db, socket, request).catch((error) => {
            console.log(`Error authorising connection: ${error.message}`);
            socket.close(4001, 'Unauthorised connection');
            return false
        })
        yjss.handleConnection(socket, request, whenAuthorised);
    });

    yjss = createYjsServer({
        createDoc: () => {
            return new Y.Doc();
        },
        docStorage: {
            loadDoc: async (docName, doc) => {
                console.log(`loadDoc ${docName}`);

                const noteId = docName.split('/')[1];
                const row = await db.get(
                    "SELECT noteContent, noteOptions, noteType, yjsState FROM Notes WHERE id = ?",
                    [noteId],
                );

                if (!row || !row.noteContent) {
                    console.error(`loadDoc: Note ${noteId} not found`);
                    return;
                }

                const ytext = doc.getText('quill');
                const ymap = doc.getMap('note-options');

                if (row.noteType == 0) {
                    if (row.yjsState) {
                        Y.applyUpdate(doc, row.yjsState);
                    } else {
                        if (row.noteOptions) {
                            for (const [key, value] of Object.entries(JSON.parse(row.noteOptions))) {
                                console.log(`setting ${key} to ${value}`);
                                ymap.set(key, value);
                            }
                        }

                        let ops = JSON.parse(row.noteContent);
                        if (ops['ops'])
                            ops = ops['ops']

                        ytext.applyDelta(ops);

                        // Update database immediately with the yjsState
                        const yjsState = Y.encodeStateAsUpdate(doc);
                        await db.run(
                            "UPDATE Notes SET yjsState = ? WHERE id = ?",
                            [yjsState, noteId],
                        );
                    }
                } else {
                    if (row.noteOptions) {
                        for (const [key, value] of Object.entries(JSON.parse(row.noteOptions))) {
                            ymap.set(key, value);
                        }
                    }
                }
            },
            storeDoc: async (docName, doc) => {
                console.log(`storeDoc ${docName}`);
                // last connection to doc closed

                // Check if any images are in the noteContent
                const ytext = doc.getText('quill');
                const noteId = docName.split('/')[1];
                const noteContent = {
                    ops: ytext.toDelta()
                };
                await updateUploadsXRefTable(db, noteId, noteContent);
            },
            onUpdate: async (docName, update, doc) => {
                // console.log(`onUpdate ${docName}`);
                const ymap = doc.getMap('note-options');

                if (ymap.noteType)
                    return;

                const yjsState = Y.encodeStateAsUpdate(doc);
                const ytext = doc.getText('quill');

                const noteId = docName.split('/')[1];
                const noteContent = {
                    ops: ytext.toDelta()
                };
                const noteOptions = ymap.toJSON();

                await db.run(
                    "UPDATE Notes SET noteContent = ?, noteOptions = ?, yjsState = ? WHERE id = ?",
                    [JSON.stringify(noteContent), JSON.stringify(noteOptions), yjsState, noteId],
                );

                // console.log(`UPDATED NOTE: id ${noteId}`);
            }
        },
    });

    return wss;
}
import { generateId } from "./utils.js";

export const DEFAULT_NOTE = {
    insert:
        "Welcome to your room.\n\n\n\nClick to start writing...\n\n\n\nTo publish, click on the envelope icon to be redirected to a public URL that you can share with the world.\n",
};

export async function createHomeNote(db, baseURL) {
    console.log("Creating Homepage note");
    const roomEditToken = generateId(16);
    console.log(`Homepage editToken (keep it secret!): ${roomEditToken}`);

    const createdOn = new Date();

    const roomData = {
        id: "welcome",
        name: "home",
        createdOn,
        editToken: roomEditToken,
        rootNote: "welcomeNote",
    };

    const welcomeNoteData = {
        id: "welcomeNote",
        createdOn,
        noteContent: JSON.stringify({
            ops: [
                {
                    insert: "Welcome to ",
                },
                {
                    attributes: {
                        annotate: {
                            color: "oklch(0.65 0.4 312)",
                            id: "about",
                        },
                        italic: true,
                    },
                    insert: "Marginalia",
                },
                {
                    attributes: {
                        header: 2,
                    },
                    insert: "\n",
                },
                {
                    insert:
                        "The annotation and publishing platform that encourages writing in the margins. \n\nThis is a space for you to create notes, comment, annotate and elaborate your thoughts, and publish them for anyone else to see (or optionally edit!).\n\nWe believe that the ",
                },
                {
                    attributes: {
                        annotate: {
                            color: "oklch(0.65 0.4 95",
                            id: "marginquote",
                        },
                    },
                    insert: "margins",
                },
                {
                    insert:
                        ", the footnotes and asides are as important as the main text, and we aim to foster a discourse within the messy organisation of thoughts and ideas in a free and open space.\n\n",
                },
                {
                    attributes: {
                        annotate: {
                            color: "oklch(0.65 0.4 193)",
                            id: "howtouse",
                        },
                    },
                    insert: "Take a look around",
                },
                {
                    insert: "! Or, ",
                },
                {
                    attributes: {
                        annotate: {
                            color: "oklch(0.65 0.4 312)",
                            id: "createroom",
                        },
                    },
                    insert: "create a room of ones own...",
                },
                {
                    insert: "\n\n",
                },
                {
                    attributes: {
                        italic: true,
                    },
                    insert:
                        "Marginalia is still in early development and will be updated soon!",
                },
                {
                    insert: "\n",
                },
            ],
        }),
    };

    const createRoomNote = {
        id: "createroom",
        createdOn,
        noteContent: `<form action="${baseURL}/newroom"><input type="text" name="roomname" style="margin: 0.5em 0.5em 0.5em 0em" placeholder="Name of your room">
  <input type="submit" value="Create your room"></form>
  <p>Tip: bookmark or save the URL of your room so that you can return to it later!</p><div id="room-history"></div><script src="${baseURL}/js/fetchhistory.js"></script>`,
        noteType: 1,
    };

    const aboutNoteData = {
        id: "about",
        createdOn,
        noteContent: JSON.stringify({
            ops: [
                {
                    insert:
                        "Marginalia is an open source project designed, created and developed by Senka and Arran.\n\nSupport from ",
                },
                {
                    attributes: {
                        link: "https://www.stimuleringsfonds.nl/",
                    },
                    insert: "Stimulerings Fonds",
                },
                {
                    insert: ".\n",
                },
            ],
        }),
    };

    const marginNote = {
        id: "marginquote",
        createdOn,
        noteContent: JSON.stringify({
            ops: [
                {
                    insert: "Marginality as a site of resistance",
                },
                {
                    attributes: {
                        blockquote: true,
                    },
                    insert: "\n",
                },
                {
                    attributes: {
                        italic: true,
                    },
                    insert: "bell hooks",
                },
                {
                    attributes: {
                        align: "right",
                    },
                    insert: "\n",
                },
            ],
        }),
    };

    const howToUseNote = {
        id: "howtouse",
        createdOn,
        noteContent: JSON.stringify({
            ops: [
                {
                    insert:
                        "Clicking on highlighted text opens the annotation, and deliberately disrupts the main flow of text.\n\n",
                },
                {
                    attributes: {
                        size: "small",
                    },
                    insert: "(",
                },
                {
                    attributes: {
                        italic: true,
                        size: "small",
                    },
                    insert:
                        "don't worry, you can close a note by hovering over it and clicking the little X icon. You can also restore a split note by clicking the arrow icon on the upper right of any segment",
                },
                {
                    attributes: {
                        size: "small",
                    },
                    insert: ")",
                },
                {
                    insert: "\n",
                },
            ],
        }),
    };

    const notes = [
        welcomeNoteData,
        aboutNoteData,
        marginNote,
        howToUseNote,
        createRoomNote,
    ];

    await db.run("BEGIN TRANSACTION;");

    notes.map(async (noteData) => {
        await db.run(
            "INSERT INTO Notes (id, createdOn, noteContent, noteType, noteOptions) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING;",
            [
                noteData.id,
                noteData.createdOn,
                noteData.noteContent,
                noteData.noteType ? noteData.noteType : 0,
                '{}'
            ],
            function (err) {
                if (err) console.error(err);
                console.log("added note");
            },
        );
    });

    await db.run(
        "INSERT INTO Rooms(id, name, editToken, createdOn, rootNote) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING;",
        [
            roomData.id,
            roomData.name,
            roomData.editToken,
            roomData.createdOn,
            roomData.rootNote,
        ],
        function (err) {
            if (err) console.error(err);
            console.log("Homepage finished");
        },
    );

    await db.run("COMMIT;");
    console.log("finished making homepage");
}
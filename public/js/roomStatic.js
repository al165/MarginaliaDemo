import { state } from './state.js';
import { getTargetedNote } from './utils.js';

async function fetchNoteStatic(noteId, note) {
    const data = window.notes[noteId];
    if (!data) {
        console.error(`Error: ${noteId} not found in window.notes`);
        return;
    }

    let options = data.noteOptions || {};

    if (!note) {
        note = new window.Note(noteId);
    }

    note.setOptions(options);
    note.setHTML(data.noteHtml);
    note.show();

    return note;
}

function fetchPathStatic(noteId) {
    window.fetchNote(noteId)
        .then((newNote) => {
            if (!newNote) {
                console.log("Could not fetch note " + noteId);
                return;
            }
            const size = newNote.getSize();
            const x = window.innerWidth / 2 - size.width / 2 + 100;
            const y = window.innerHeight / 5 + 100;
            newNote.setPosition({ left: x, top: y });

            newNote.show();
            newNote.toFront();
        });
}

window.state = state;


window.addEventListener('load', async () => {

    const { NoteStatic } = await import('./noteStatic.js');

    window.fetchNote = fetchNoteStatic;
    window.fetchPath = fetchPathStatic;
    window.Note = NoteStatic;
    window.state.roomId = roomId;

    // Clear any notes divs that might have been saved in the static HTML document
    document.getElementById("notes").innerHTML = "";

    window.notes = {};

    for (const noteHtml of document.querySelectorAll(".static-note")) {
        const noteId = noteHtml.dataset.id;
        const width = noteHtml.dataset.width;

        window.notes[noteId] = {
            noteOptions: { width },
            noteHtml: noteHtml.innerHTML
        };
    }

    window.fetchNote(rootNote).then((newNote) => {
        if (!newNote) {
            console.log("Could not fetch root note " + rootNote);
            return;
        }
        newNote.setCloseable(false);
        const size = newNote.getSize();
        const x = window.innerWidth / 2 - size.width / 2;
        const y = window.innerHeight / 5;
        newNote.setPosition({ left: x, top: y });

        getTargetedNote();
    });

});

document.addEventListener("mouseup", (ev) => {
    if (window.state.dragging) {
        window.state.dragging = false;
    }
});

document.addEventListener("mousemove", (ev) => {
    if (window.state.dragging && window.state.draggingFragment) {
        const fragmentSize = window.state.draggingFragment.getSize();
        window.state.draggingFragment.setPosition({
            left: ev.clientX + window.state.scrollX - fragmentSize.width + 20,
            top: ev.clientY + window.state.scrollY - 20
        });
    }
});

document.addEventListener("scroll", () => {
    window.state.scrollY = window.scrollY;
    window.state.scrollX = window.scrollX;
});
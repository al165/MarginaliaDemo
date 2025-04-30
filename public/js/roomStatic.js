import { state } from './state.js';
import { NoteStatic } from './noteStatic.js'


function calculateBoundingBox() {
    // Resize #notes to fit all the elements
    const notesContainer = document.getElementById("notes");
    const noteElements = document.querySelectorAll(".note");
    let w = 0;
    let h = 0;
    for (const noteElement of noteElements) {
        const bounds = noteElement.getBoundingClientRect();

        w = Math.max(w, bounds.left + bounds.width);
        h = Math.max(h, bounds.top + bounds.height);
    }
    notesContainer.style.width = w + "px";
    notesContainer.style.height = h + "px";
}

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

    calculateBoundingBox();

    return note;
}

window.Note = NoteStatic;
window.fetchNote = fetchNoteStatic;

document.addEventListener('DOMContentLoaded', () => {
    state.roomId = roomId;

    // Clear any notes divs that might have been saved in the static HTML document
    document.getElementById("notes").innerHTML = "";

    window.fetchNote(rootNote).then((newNote) => {
        if (!newNote) {
            console.log("Could not fetch root note " + rootNote);
            return;
        }
        newNote.setCloseable(false);
        const size = newNote.getSize();
        const x = window.innerWidth / 2 - size.width / 2;
        const y = window.innerHeight / 2 - size.height / 2;
        newNote.setPosition({ left: x, top: y });
    });

});

document.addEventListener("scroll", () => {
    state.scrollY = window.scrollY;
    state.scrollX = window.scrollX;
});
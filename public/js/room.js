// import Quill from 'quill';

import { THEME_LIST, setTheme } from './data/colourschemes.js'
import { fetchNote } from './note.js';
import { state } from './state.js';


let removeNoteBtn;

window.fetchNote = fetchNote;
window.state = state;

document.addEventListener('DOMContentLoaded', () => {

    window.state.roomId = roomId;

    if (canEdit) {
        import('./noteEdit.js');
    }


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

        newNote.show();
    });

    for (const colourTheme of THEME_LIST) {
        if (colourTheme.name !== theme)
            continue;
        setTheme(colourTheme);
    }

    removeNoteBtn = document.querySelector("#remove-note");
});

document.addEventListener("scroll", () => {
    window.state.scrollY = window.scrollY;
    window.state.scrollX = window.scrollX;
});

document.addEventListener("mouseup", (ev) => {
    if (window.state.resizing && window.state.notes[window.state.resizing]) {
        const note = window.state.notes[window.state.resizing];
        note.noteWindow.classList.add("grow");
        note.save(true);

        window.state.resizing = undefined;
    } else if (window.state.dragging) {
        window.state.dragging = undefined;
    }
});

document.addEventListener("mousemove", (ev) => {
    if (window.state.resizing) {
        let newWidth = window.state.resizeStartWidth + (ev.clientX - window.state.resizeStartPosition);
        newWidth = Math.min(800, Math.max(350, newWidth));
        const noteId = window.state.resizing;
        if (!window.state.notes[noteId])
            return;
        window.state.notes[noteId].setWidth(newWidth);
    } else if (window.state.dragging && window.state.draggingFragment) {
        window.state.draggingFragment.setPosition({
            left: ev.clientX + window.state.scrollX - window.state.dragging.left,
            top: ev.clientY + window.state.scrollY - window.state.dragging.top
        });
    }
});

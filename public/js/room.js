import './formats/annotateBlot.js';
import './formats/annotatePBlot.js';
import { THEME_LIST, setTheme } from './data/colourschemes.js'

import { fetchNote } from './note.js';
import { state } from './state.js';

const socket = io();

socket.on('connect', function () {
    socket.emit('roomId', roomId);
});

socket.on('noteUpdated', function (noteId) {
    console.log("socket: noteUpdated: " + noteId);
    window.fetchNote(noteId, state.notes[noteId]);
});

socket.on('noteEditing', function (data) {
    console.log("socket: noteEditing: " + data.noteId);
    if (!data.noteId)
        return;

    if (data.lock)
        state.lockedNotes.add(data.noteId);
    else
        state.lockedNotes.delete(data.noteId);

    if (state.notes[data.noteId])
        state.notes[data.noteId].setLocked(data.lock);
});

socket.on('lockedNotes', function (lockedNotes) {
    for (const noteId of lockedNotes) {
        state.lockedNotes.add(noteId);
        if (state.notes[noteId]) {
            state.notes[noteId].setLocked(true);
        }
    }
});

state.socket = socket;

window.fetchNote = fetchNote;

document.addEventListener('DOMContentLoaded', () => {

    state.roomId = roomId;

    const FontAttributor = Quill.import('attributors/class/font');
    FontAttributor.whitelist = [
        'sans-serif', 'serif', 'monospace'
    ];
    Quill.register(FontAttributor, true);
    const Clipboard = Quill.import('modules/clipboard');
    const Delta = Quill.import('delta');

    class PlainClipboard extends Clipboard {
        onPaste(range, { text, html }) {
            const delta = new Delta()
                .retain(range.index, { font: null })
                .delete(range.length)
                .insert(text);
            this.quill.updateContents(delta, Quill.sources.USER);
            this.quill.setSelection(
                delta.length() - range.length,
                Quill.sources.SILENT,
            );
            this.quill.scrollSelectionIntoView();
        }
    }

    Quill.register('modules/clipboard', PlainClipboard, true);

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

    for (const colourTheme of THEME_LIST) {
        if (colourTheme.name !== theme)
            continue;
        setTheme(colourTheme);
    }
});

document.addEventListener("scroll", () => {
    state.scrollY = window.scrollY;
    state.scrollX = window.scrollX;
});

document.addEventListener("mouseup", (ev) => {
    if (state.resizing) {
        const note = state.notes[state.resizing];
        note.noteWindow.classList.add("grow");
        note.width = note.noteWindow.clientWidth;
        note.options.width = note.width;
        note.save(true);

        state.resizing = undefined;
    } else if (state.dragging) {
        state.dragging = undefined;
    }
});

document.addEventListener("mousemove", (ev) => {
    if (state.resizing) {
        let newWidth = state.resizeStartWidth + (ev.clientX - state.resizeStartPosition);
        newWidth = Math.min(800, Math.max(350, newWidth));
        const noteId = state.resizing;
        state.notes[noteId].noteWindow.style.width = newWidth + "px";
        state.notes[noteId].noteContents.style.width = newWidth + "px";
    } else if (state.dragging && state.draggingFragment) {
        state.draggingFragment.setPosition({
            left: ev.clientX + state.scrollX - state.dragging.left,
            top: ev.clientY + state.scrollY - state.dragging.top
        });
    }
});

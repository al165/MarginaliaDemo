import './formats/annotateBlot.js';
import './formats/annotatePBlot.js';

import { fetchNote } from './note.js';
import { state } from './state.js';


document.addEventListener('DOMContentLoaded', () => {

    state.roomId = roomId;

    fetchNote(rootNote).then((newNote) => {
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
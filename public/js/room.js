import './formats/annotateBlot.js';
import './formats/annotatePBlot.js';
import { Note, fetchNote } from './note.js';
import './split.js';
import { state } from './state.js';

const Parchment = Quill.import('parchment');
const Delta = Quill.import('delta');

let newNoteBtn;

document.addEventListener('DOMContentLoaded', () => {

    state.roomId = roomId;

    newNoteBtn = document.querySelector("#new-note");
    if (canEdit && newNoteBtn) {
        newNoteBtn.addEventListener('click', function (ev) {
            console.log("new note");
            console.log(state.currentEditingNote);
            if (!state.currentEditingNote)
                return;
            const parentNote = state.currentEditingNote;
            const selection = parentNote.noteEditor.getSelection();
            const bounds = parentNote.noteEditor.getBounds(selection);
            const parentPos = parentNote.getPosition();
            console.log(parentPos);
            console.log(bounds);

            const newNote = new Note();
            newNote.enterEditMode();
            newNote.toFront();
            newNote.parent = parentNote;
            newNote.setPosition({ left: bounds.left + parentPos.left, top: bounds.top + parentPos.top });
        });
    }

    const boldBtn = document.querySelector("#bold");
    if (boldBtn) {

        boldBtn.addEventListener('click', function (ev) {
            if (state.currentEditingNote.noteEditor) {
                const { bold } = state.currentEditingNote.noteEditor.getFormat();
                state.currentEditingNote.noteEditor.format('bold', bold ? false : true, 'user');
            }
        });
    }

    const italicBtn = document.querySelector("#italic");
    if (italicBtn) {

        italicBtn.addEventListener('click', function (ev) {
            if (state.currentEditingNote.noteEditor) {
                const { italic } = state.currentEditingNote.noteEditor.getFormat();
                state.currentEditingNote.noteEditor.format('italic', italic ? false : true, 'user');
            }
        });
    }

    const editMode = document.querySelector("#edit-mode");
    if (canEdit && editMode) {
        editMode.addEventListener('change', function (ev) {
            state.editMode = ev.target.checked;
        });
    }

    // Make room title editable
    if (canEdit) {
        const roomTitle = document.querySelector('#room-title');
        roomTitle.setAttribute('contenteditable', true);
        roomTitle.addEventListener('blur', function (ev) {
            const newName = roomTitle.innerText.trim();
            if (newName) {
                fetch(`/room/${roomId}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        name: newName,
                        editToken
                    }),
                    headers: {
                        "Content-type": "application/json"
                    }
                }).then(res => {
                    if (res.msg) {
                        console.log(res.msg);
                    }
                }).catch(error => {
                    console.log("Error editing room: " + error);
                });
            } else {
                roomTitle.innerText = roomName;
            }
        });
    }

    fetchNote(rootNote).then((newNote) => {
        newNote.setCloseable(false);
        const size = newNote.getSize();
        const x = window.innerWidth / 2 - size.width / 2;
        const y = window.innerHeight / 2 - size.height / 2;
        newNote.setPosition({ left: x, top: y });
    });

});

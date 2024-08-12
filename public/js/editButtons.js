import { Note } from './note.js';
import { state } from './state.js';

document.addEventListener('DOMContentLoaded', () => {

    const newNoteBtn = document.querySelector("#new-note");
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

    const boldBtn = document.querySelector("#bold");

    boldBtn.addEventListener('click', function (ev) {
        if (state.currentEditingNote.noteEditor) {
            const { bold } = state.currentEditingNote.noteEditor.getFormat();
            state.currentEditingNote.noteEditor.format('bold', bold ? false : true, 'user');
        }
    });

    const italicBtn = document.querySelector("#italic");

    italicBtn.addEventListener('click', function (ev) {
        if (state.currentEditingNote && state.currentEditingNote.noteEditor) {
            const { italic } = state.currentEditingNote.noteEditor.getFormat();
            state.currentEditingNote.noteEditor.format('italic', italic ? false : true, 'user');
        }
    });

    const editMode = document.querySelector("#edit-mode");
    editMode.addEventListener('change', function (ev) {
        state.editMode = ev.target.checked;
    });

    // Image uploads...
    const imageUploadBtn = document.querySelector("#image-upload");
    const imageUploadInput = document.querySelector("#imgupload");
    const imageUploadForm = document.querySelector("#image-upload-form");

    imageUploadBtn.addEventListener('click', function (ev) {
        // if (!state.currentEditingNote || !state.currentEditingNote.noteEditor)
        //     return;

        imageUploadInput.click();
    });

    imageUploadInput.addEventListener('change', function (ev) {
        const allowed = ['image/webp', 'image/jpeg', 'image/png'];
        const sizeLimit = 1024 * 1024 * 8; // 8 megabytes

        for (const file of imageUploadInput.files) {
            if (!allowed.includes(file.type)) {
                console.log("Invalid image type...");
                return;
            }
            if (file.size > sizeLimit) {
                console.log("Image too big");
                return;
            }
        }

        imageUploadForm.requestSubmit();
    });

    imageUploadForm.addEventListener('submit', function (ev) {
        ev.preventDefault();

        const formData = new FormData(imageUploadForm);
        console.log(formData);

        fetch('/upload', {
            method: 'POST',
            body: formData
        }).then(
            res => res.json()
        ).then(json => {
            console.log(json);
            const { path } = json.msg;
            console.log(path);

            if (!state.currentEditingNote)
                return; // create new note instead??

            const { noteEditor } = state.currentEditingNote;
            const range = noteEditor.getSelection(true);
            noteEditor.insertText(range.index, '\n', 'user');
            noteEditor.insertEmbed(range.index + 1, 'image', '/' + path, 'user');
            noteEditor.setSelection(range.index + 2, 'silent');
        });
    });



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
});
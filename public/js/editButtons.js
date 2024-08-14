import { Note } from './note.js';
import { state } from './state.js';

import './colourschemes.js';
import { THEME_LIST, setTheme } from './colourschemes.js';

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

    function toggleFormat(btn, value) {
        btn.addEventListener('click', function (ev) {
            if (!state.currentEditingNote || !state.currentEditingNote.noteEditor)
                return;

            const format = state.currentEditingNote.noteEditor.getFormat();
            state.currentEditingNote.noteEditor.format(value, format[value] ? false : true, 'user');

        });
    }

    const boldBtn = document.querySelector("#bold");
    toggleFormat(boldBtn, 'bold');

    const italicBtn = document.querySelector("#italic");
    toggleFormat(italicBtn, 'italic');

    const underlineBtn = document.querySelector("#underline");
    toggleFormat(underlineBtn, 'underline');

    const strikethroughBtn = document.querySelector("#strikethrough");
    toggleFormat(strikethroughBtn, 'strike');

    const blockquoteBtn = document.querySelector("#citation");
    toggleFormat(blockquoteBtn, 'blockquote');


    // Image uploads...
    const imageUploadBtn = document.querySelector("#image-upload");
    const imageUploadInput = document.querySelector("#imgupload");
    const imageUploadForm = document.querySelector("#image-upload-form");

    imageUploadBtn.addEventListener('click', function (ev) {
        if (!state.currentEditingNote || !state.currentEditingNote.noteEditor)
            return;

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

    // Themes
    function updateTheme(colourTheme) {
        setTheme(colourTheme);

        if (colourTheme.name === theme)
            return;

        console.log("updating theme...");
        fetch(`/room/${state.roomId}`, {
            method: 'PUT',
            body: JSON.stringify({
                name: roomName,
                theme: colourTheme['name'],
                editToken: editToken
            }),
            headers: {
                "Content-type": "application/json"
            }
        }).then(res => {
            if (res.status != 200)
                return res.json();
            else
                return {}
        }).then(json => {
            if (json.msg)
                console.log(json.msg);
        }).catch(error => {
            console.log("Error editing room: " + error);
        });
    }

    let currentThemeIndex = 0;
    const themesBtn = document.querySelector("#themes");
    themesBtn.addEventListener('click', function (ev) {
        currentThemeIndex = (currentThemeIndex + 1) % THEME_LIST.length;
        updateTheme(THEME_LIST[currentThemeIndex]);
    });

    // Tooltips
    const unavailableTooltip = document.querySelector("#unavailable");

    for (const unavailable of document.querySelectorAll(".coming-soon")) {
        unavailable.addEventListener('mousemove', ev => {
            unavailableTooltip.style.visibility = 'visible';
            unavailableTooltip.style.top = ev.clientY + 'px';
            unavailableTooltip.style.left = ev.clientX + 'px';
        });

        unavailable.addEventListener('mouseleave', ev => {
            unavailableTooltip.style.visibility = 'hidden';
        });
    }


    // const editMode = document.querySelector("#edit-mode");
    // editMode.addEventListener('change', function (ev) {
    //     state.editMode = ev.target.checked;
    // });


    // const roomTitle = document.querySelector('#room-title');
    // roomTitle.setAttribute('contenteditable', true);
    // roomTitle.addEventListener('blur', function (ev) {
    //     const newName = roomTitle.innerText.trim();
    //     if (newName) {
    //         fetch(`/room/${roomId}`, {
    //             method: 'PUT',
    //             body: JSON.stringify({
    //                 name: newName,
    //                 editToken
    //             }),
    //             headers: {
    //                 "Content-type": "application/json"
    //             }
    //         }).then(res => {
    //             if (res.msg) {
    //                 console.log(res.msg);
    //             }
    //         }).catch(error => {
    //             console.log("Error editing room: " + error);
    //         });
    //     } else {
    //         roomTitle.innerText = roomName;
    //     }
    // });
});
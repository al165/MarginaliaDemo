import { EditableNote } from './noteEdit.js';
import { state } from './state.js';

import { THEME_LIST, setTheme } from './data/colourschemes.js';
import { TOOLTIPS } from './data/tooltips.js';

document.addEventListener('DOMContentLoaded', () => {

    const newNoteBtn = document.querySelector("#highlight");
    newNoteBtn.addEventListener('click', function (ev) {
        if (!state.currentEditingNote)
            return;
        console.log("new note");
        const parentNote = state.currentEditingNote;
        const selection = parentNote.noteEditor.getSelection();
        if (!selection || selection.length == 0) {
            console.log("selection is undefined or 0");
            return;
        }
        const bounds = parentNote.noteEditor.getBounds(selection);
        const parentPos = parentNote.getPosition();

        const newNote = new EditableNote();
        newNote.enterEditMode();
        newNote.toFront();
        newNote.parent = parentNote;
        newNote.setPosition({ left: bounds.left + parentPos.left, top: bounds.top + parentPos.top });

        ev.stopPropagation();
    });

    function toggleFormat(btn, value) {
        btn.addEventListener('click', function () {
            if (!state.currentEditingNote || !state.currentEditingNote.noteEditor)
                return;

            const format = state.currentEditingNote.noteEditor.getFormat();
            state.currentEditingNote.noteEditor.format(value, format[value] ? false : true, 'user');
        });
    }

    function cycleFormat(btn, format, values) {
        btn.addEventListener('click', function () {
            if (!state.currentEditingNote || !state.currentEditingNote.noteEditor)
                return;

            const currentFormat = state.currentEditingNote.noteEditor.getFormat();
            if (!currentFormat || !currentFormat[format]) {
                state.currentEditingNote.noteEditor.format(format, values[0], 'user');
            } else {
                let nextIndex = values.indexOf(currentFormat[format]) + 1;
                nextIndex = nextIndex % values.length;
                state.currentEditingNote.noteEditor.format(format, values[nextIndex], 'user');
            }
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

    const headingsBtn = document.querySelector("#heading");
    cycleFormat(headingsBtn, 'header', [1, 2, 3, null]);

    const writingDirection = document.querySelector("#writingdirection");
    cycleFormat(writingDirection, 'direction', ['rtl', null]);

    const justificationBtn = document.querySelector("#justification");
    cycleFormat(justificationBtn, 'align', ['center', 'right', null]);

    const numberedListBtn = document.querySelector("#bulletnumbers");
    cycleFormat(numberedListBtn, 'list', ['ordered', null]);

    const bulletListBtn = document.querySelector("#bulletpoints");
    cycleFormat(bulletListBtn, 'list', ['bullet', null]);

    const fontsBtn = document.querySelector("#font");
    cycleFormat(fontsBtn, 'font', ['serif', 'monospace', null]);

    // Pop up related tools
    const linkEditBtn = document.querySelector("#links");
    const popupClose = document.querySelector("#popup-close");
    const linkEditorPopup = document.querySelector("#link-editor");
    linkEditBtn.addEventListener('click', function () {
        if (!state.currentEditingNote || !state.currentEditingNote.noteEditor)
            return;

        const selection = state.currentEditingNote.noteEditor.getSelection();
        if (!selection || !selection.length)
            return;

        const selectionBounds = state.currentEditingNote.noteEditor.getBounds(selection.index, selection.length);
        const noteEditorBounds = state.currentEditingNote.noteContainer.getBoundingClientRect();
        const format = state.currentEditingNote.noteEditor.getFormat(selection.index, selection.length);

        if (format.link)
            document.getElementById("link-editor-url").value = format.link;
        else
            document.getElementById("link-editor-url").value = '';

        popupClose.style.visibility = 'visible';
        linkEditorPopup.style.visibility = 'visible';

        linkEditorPopup.style.left = noteEditorBounds.left + selectionBounds.left + state.scrollX + "px";
        linkEditorPopup.style.top = noteEditorBounds.top + selectionBounds.top + state.scrollY + selectionBounds.height + 2 + "px";

        const addLinkBtn = document.getElementById('link-editor-add-btn');
        const urlTextInput = document.getElementById('link-editor-url');
        urlTextInput.value = "";
        urlTextInput.focus();

        addLinkBtn.onclick = () => {
            const newURL = urlTextInput.value;
            if (newURL && state.lastEditingNote) {
                state.lastEditingNote.enterEditMode();
                state.currentEditingNote.noteEditor.format('link', newURL, 'user');
            } else {
                state.lastEditingNote.enterEditMode();
                state.currentEditingNote.noteEditor.format('link', undefined, 'user');
            }
            linkEditorPopup.style.visibility = 'hidden';
            popupClose.style.visibility = 'hidden';
            urlTextInput.value = "";
        };

        popupClose.onclick = () => {
            linkEditorPopup.style.visibility = 'hidden';
            popupClose.style.visibility = 'hidden';
            urlTextInput.value = "";
        }
    });

    // Video embed
    const videoEmbedBtn = document.querySelector("#video");
    const videoEditorAddBtn = document.querySelector("#video-editor-add-btn");
    const videoEditorPopup = document.querySelector("#video-editor");
    videoEmbedBtn.addEventListener('click', function () {
        if (!state.currentEditingNote || !state.currentEditingNote.noteEditor)
            return;

        const selection = state.currentEditingNote.noteEditor.getSelection();

        const selectionBounds = state.currentEditingNote.noteEditor.getBounds(selection.index, selection.length);
        const noteEditorBounds = state.currentEditingNote.noteContainer.getBoundingClientRect();

        popupClose.style.visibility = 'visible';
        videoEditorPopup.style.visibility = 'visible';

        videoEditorPopup.style.left = noteEditorBounds.left + selectionBounds.left + state.scrollX + "px";
        videoEditorPopup.style.top = noteEditorBounds.top + selectionBounds.top + state.scrollY + selectionBounds.height + 2 + 50 + "px";

        const urlTextInput = document.getElementById("video-editor-url");
        urlTextInput.value = "";
        urlTextInput.focus();

        videoEditorAddBtn.onclick = () => {
            let newURL = urlTextInput.value;
            if (newURL)
                newURL = extractVideoUrl(newURL);

            if (newURL && state.lastEditingNote) {
                state.lastEditingNote.enterEditMode();
                state.currentEditingNote.noteEditor.insertEmbed(selection.index + 1, 'video', newURL, 'user');
                state.currentEditingNote.noteEditor.formatText(selection.index + 1, 1, { height: '170', width: '400' });
                state.currentEditingNote.noteEditor.setSelection(selection.index + 2, Quill.sources.SILENT);
            }
            videoEditorPopup.style.visibility = 'hidden';
            popupClose.style.visibility = 'hidden';
            urlTextInput.value = "";
        }

        popupClose.onclick = () => {
            videoEditorPopup.style.visibility = 'hidden';
            popupClose.style.visibility = 'hidden';
            state.lastEditingNote.enterEditMode();
            urlTextInput.value = "";
        }
    });

    // Share/export
    const exportBtn = document.querySelector("#publish");
    const exportPopup = document.querySelector("#export-popup");
    const popupCloseBtn = document.querySelector("#popup-close-btn");
    exportBtn.addEventListener('click', function () {
        popupClose.classList.add("transparent");
        popupClose.style.visibility = 'visible';
        exportPopup.classList.add("centered");
        exportPopup.style.visibility = 'visible';

        popupClose.onclick = () => {
            exportPopup.style.visibility = 'hidden';
            exportPopup.classList.remove("centered");
            popupClose.style.visibility = 'hidden';
            popupClose.classList.remove("transparent");
        }

        popupCloseBtn.onclick = popupClose.onclick;
    });


    // Image uploads...
    const imageUploadBtn = document.querySelector("#image-upload");
    const imageUploadInput = document.querySelector("#imgupload");
    const imageUploadForm = document.querySelector("#image-upload-form");

    imageUploadBtn.addEventListener('click', function (ev) {
        imageUploadInput.click();
        ev.stopPropagation();
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

        if (!state.currentEditingNote || !state.currentEditingNote.noteEditor)
            return;

        if (!state.currentEditingNote.noteId) {
            state.currentEditingNote.save();
        }

        const formData = new FormData(imageUploadForm);

        fetch(`${baseURL}/upload`, {
            method: 'POST',
            body: formData
        }).then(
            res => res.json()
        ).then(json => {
            const { path } = json.msg;

            if (!state.currentEditingNote)
                return; // create new note instead??

            const { noteEditor } = state.currentEditingNote;
            const range = noteEditor.getSelection(true);
            noteEditor.insertText(range.index, '\n', 'user');
            noteEditor.insertEmbed(range.index + 1, 'image', baseURL + path, 'user');
            noteEditor.setSelection(range.index + 2, 'silent');
        });
    });

    // Themes
    function updateTheme(colourTheme) {
        setTheme(colourTheme);

        if (colourTheme.name === theme)
            return;

        console.log("updating theme...");
        fetch(`${baseURL}/room/${state.roomId}`, {
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
    const tools = document.querySelectorAll(".tool");
    const tooltip = document.querySelector("#tooltip");

    for (const tool of tools) {
        const toolId = tool.id;
        if (!toolId || !TOOLTIPS["en"][toolId])
            continue;

        let toolTipText = TOOLTIPS["en"][toolId];
        if (tool.classList.contains('coming-soon')) {
            toolTipText = "<b>Coming soon!</b><br>" + toolTipText;
        }

        tool.addEventListener('mousemove', ev => {
            tooltip.innerHTML = toolTipText;
            tooltip.style.visibility = 'visible';

            const toolTipMaxX = document.getElementById("room-toolbar").getBoundingClientRect().left;
            const toolTipMaxY = document.getElementById("text-toolbar").getBoundingClientRect().top;

            tooltip.style.left = Math.min(ev.clientX, toolTipMaxX - tooltip.getBoundingClientRect().width) + "px";
            tooltip.style.top = Math.min(ev.clientY, toolTipMaxY - tooltip.getBoundingClientRect().height) + "px";

        });

        tool.addEventListener('mouseleave', ev => {
            tooltip.style.visibility = 'hidden';
        });
    }
});

function extractVideoUrl(url) {
    let match =
        url.match(
            /^(?:(https?):\/\/)?(?:(?:www|m)\.)?youtube\.com\/watch.*v=([a-zA-Z0-9_-]+)/,
        ) ||
        url.match(/^(?:(https?):\/\/)?(?:(?:www|m)\.)?youtu\.be\/([a-zA-Z0-9_-]+)/);
    if (match) {
        return `${match[1] || 'https'}://www.youtube.com/embed/${match[2]
            }?showinfo=0`;
    }
    if ((match = url.match(/^(?:(https?):\/\/)?(?:www\.)?vimeo\.com\/(\d+)/))) {
        return `${match[1] || 'https'}://player.vimeo.com/video/${match[2]}/`;
    }
    return undefined;
}
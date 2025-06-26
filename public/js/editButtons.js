import { EditableNote } from './noteEdit.js';
import { state } from './state.js';

import { THEME_LIST, setTheme } from './data/colourschemes.js';
import { TOOLTIPS } from './data/tooltips.js';

let availableNoteTools = [];

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
        newNote.setPosition({ left: bounds.left + parentPos.left, top: bounds.top + bounds.height + parentPos.top });

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
                console.log("Setting format " + format + " to " + values[0]);
            } else {
                let nextIndex = values.indexOf(currentFormat[format]) + 1;
                nextIndex = nextIndex % values.length;
                state.currentEditingNote.noteEditor.format(format, values[nextIndex], 'user');
                console.log("Setting format " + format + " to " + values[nextIndex]);
            }
        });
    }

    const boldBtn = document.querySelector("#bold");
    toggleFormat(boldBtn, 'bold');
    availableNoteTools.push(boldBtn);

    const italicBtn = document.querySelector("#italic");
    toggleFormat(italicBtn, 'italic');
    availableNoteTools.push(italicBtn);

    const underlineBtn = document.querySelector("#underline");
    toggleFormat(underlineBtn, 'underline');
    availableNoteTools.push(underlineBtn);

    const strikethroughBtn = document.querySelector("#strikethrough");
    toggleFormat(strikethroughBtn, 'strike');
    availableNoteTools.push(strikethroughBtn);

    const blockquoteBtn = document.querySelector("#citation");
    toggleFormat(blockquoteBtn, 'blockquote');
    availableNoteTools.push(blockquoteBtn);

    const headingsBtn = document.querySelector("#heading");
    cycleFormat(headingsBtn, 'header', [1, 2, 3, null]);
    availableNoteTools.push(headingsBtn);

    const writingDirection = document.querySelector("#writingdirection");
    cycleFormat(writingDirection, 'direction', ['rtl', null]);
    availableNoteTools.push(writingDirection);

    const justificationBtn = document.querySelector("#justification");
    cycleFormat(justificationBtn, 'align', ['center', 'right', null]);
    availableNoteTools.push(justificationBtn);

    const numberedListBtn = document.querySelector("#bulletnumbers");
    cycleFormat(numberedListBtn, 'list', ['ordered', null]);
    availableNoteTools.push(numberedListBtn);

    const bulletListBtn = document.querySelector("#bulletpoints");
    cycleFormat(bulletListBtn, 'list', ['bullet', null]);
    availableNoteTools.push(bulletListBtn);

    const fontsBtn = document.querySelector("#font");
    cycleFormat(fontsBtn, 'font', ['serif', 'monospace', null]);
    availableNoteTools.push(fontsBtn);

    // Pop up related tools
    const linkEditBtn = document.querySelector("#links");
    const linkEditorPopup = document.querySelector("#link-editor");
    const addLinkBtn = document.getElementById('link-editor-add-btn');
    const urlTextInput = document.getElementById('link-editor-url');

    function addURL() {
        const newURL = urlTextInput.value;
        if (newURL && state.lastEditingNote) {
            state.lastEditingNote.enterEditMode();
            state.currentEditingNote.noteEditor.format('link', newURL, 'user');
        } else {
            state.lastEditingNote.enterEditMode();
            state.currentEditingNote.noteEditor.format('link', undefined, 'user');
        }
        urlTextInput.value = "";
        linkEditorPopup.close();
    }

    addLinkBtn.onclick = addURL;
    urlTextInput.addEventListener('keydown', ev => {
        if (ev.key === 'Enter')
            addURL();
    });

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

        linkEditorPopup.style.left = noteEditorBounds.left + selectionBounds.left + state.scrollX + "px";
        linkEditorPopup.style.top = noteEditorBounds.top + selectionBounds.top + state.scrollY + selectionBounds.height + 2 + "px";

        linkEditorPopup.showModal();

        urlTextInput.value = "";
        urlTextInput.focus();
    });

    linkEditorPopup.addEventListener('click', () => {
        linkEditorPopup.close();
    });

    linkEditorPopup.addEventListener('close', () => {
        if (state.lastEditingNote)
            state.lastEditingNote.enterEditMode();
    });
    document.querySelector("#link-editor>div").addEventListener('click', ev => ev.stopPropagation());

    // Video embed
    const videoEmbedBtn = document.querySelector("#video");
    const videoEditorAddBtn = document.querySelector("#video-editor-add-btn");
    const videoEditorPopup = document.querySelector("#video-editor");
    const videoUrlInput = document.getElementById("video-editor-url");
    availableNoteTools.push(videoEmbedBtn);

    function addVideo() {
        let newURL = videoUrlInput.value;
        if (newURL)
            newURL = extractVideoUrl(newURL);

        if (newURL && state.lastEditingNote) {
            state.lastEditingNote.enterEditMode();
            const selection = state.currentEditingNote.lastSelection;
            state.currentEditingNote.noteEditor.insertEmbed(selection.index + 1, 'video', newURL, 'user');
            state.currentEditingNote.noteEditor.formatText(selection.index + 1, 1, { height: '170', width: '400' });
            state.currentEditingNote.noteEditor.setSelection(selection.index + 2, Quill.sources.SILENT);
        }
        videoUrlInput.value = "";
        videoEditorPopup.close();
    }

    videoEditorAddBtn.onclick = addVideo;
    videoUrlInput.addEventListener('keydown', ev => {
        if (ev.key === 'Enter')
            addVideo();
    });

    videoEmbedBtn.addEventListener('click', function () {
        if (!state.currentEditingNote)// || !state.currentEditingNote.noteEditor)
            return;

        videoEditorPopup.showModal();

        videoUrlInput.value = "";
        videoUrlInput.focus();
    });
    videoEditorPopup.addEventListener('click', () => { videoEditorPopup.close() });
    videoEditorPopup.addEventListener('close', () => {
        if (state.lastEditingNote) {
            state.lastEditingNote.enterEditMode();
        }
    });
    document.querySelector("#video-editor>div").addEventListener('click', ev => ev.stopPropagation());

    // Share/export
    const exportBtn = document.querySelector("#publish");
    const exportPopup = document.querySelector("#export-popup");
    exportBtn.addEventListener('click', function () {
        exportPopup.showModal();
    });
    document.querySelector("#export-close-btn").addEventListener('click', () => exportPopup.close());
    exportPopup.addEventListener('click', () => exportPopup.close());
    document.querySelector("#export-popup>div").addEventListener('click', ev => ev.stopPropagation());

    // Image uploads...
    const imageAddPopup = document.querySelector("#image-editor");
    const imageAddBtn = document.querySelector("#image-add");
    const imageUploadBtn = document.querySelector("#image-upload");
    const imageUploadInput = document.querySelector("#imgupload");
    const imageUploadForm = document.querySelector("#image-upload-form");
    const imageUrlInput = document.querySelector("#image-editor-url");
    const imageUrlSubmitBtn = document.querySelector("#image-editor-submit");
    availableNoteTools.push(imageAddBtn);

    function addImage(url) {
        console.log("addImage url: " + url);
        if (!url || !state.lastEditingNote) {
            console.log("!url || !state.lastEditingNote");
            return;
        }

        state.lastEditingNote.enterEditMode();
        const { noteEditor } = state.currentEditingNote;
        const range = noteEditor.getSelection(true);
        noteEditor.insertText(range.index, '\n', 'user');
        noteEditor.insertEmbed(range.index + 1, 'image', url, 'user');
        noteEditor.setSelection(range.index + 2, 'silent');

        imageAddPopup.close();
    }

    imageAddBtn.addEventListener('click', () => {
        if (state.currentEditingNote) {
            state.currentEditingNote.exitEditMode(true);
            imageAddPopup.showModal();

            imageUrlInput.value = "";
        }
    });

    imageUploadBtn.addEventListener('click', function (ev) {
        imageUploadInput.click();
        ev.stopPropagation();
    });

    imageUploadInput.addEventListener('change', function (ev) {
        const allowed = ['image/webp', 'image/jpeg', 'image/png', 'image/gif'];
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

        imageUploadBtn.innerText = 'Uploading...';
        imageUploadBtn.disabled = true;

        const formData = new FormData(imageUploadForm);

        fetch(`${baseURL}/upload`, {
            method: 'POST',
            body: formData
        }).then(
            res => res.json()
        ).then(json => {
            const { path } = json.msg;

            imageUploadBtn.innerText = 'Upload image';
            imageUploadBtn.disabled = false;

            addImage(baseURL + path);
        });
    });

    imageUrlSubmitBtn.onclick = () => { addImage(imageUrlInput.value) };
    imageUrlInput.addEventListener('keydown', ev => {
        if (ev.key === 'Enter')
            addImage(imageUrlInput.value);
    });

    imageAddPopup.addEventListener('click', () => imageAddPopup.close());
    imageAddPopup.addEventListener('close', () => {
        if (state.lastEditingNote) {
            state.lastEditingNote.enterEditMode();
        }
    });
    document.querySelector("#image-editor>div").addEventListener('click', ev => ev.stopPropagation());

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
    const toolglow = document.querySelector("#tool-glow");

    for (const tool of tools) {
        // prevent drag ghost image
        tool.setAttribute('draggable', false);

        // add glow on hover
        tool.addEventListener('mouseenter', () => {
            if (tool.id === 'highlight')
                return;
            const toolbounds = tool.getBoundingClientRect();
            toolglow.style.visibility = 'visible';

            toolglow.style.left = toolbounds.left + toolbounds.width / 2 - toolglow.clientWidth / 2 + 'px';
            toolglow.style.top = toolbounds.top + toolbounds.height / 2 - toolglow.clientHeight / 2 + 'px';

            tool.parentNode.appendChild(toolglow);
        });

        tool.addEventListener('mouseleave', () => {
            toolglow.style.visibility = 'hidden';
        });

        // add tooltip
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

    state.addCallback('currentEditingNote', note => {
        if (note)
            availableNoteTools.forEach(btn => btn.classList.remove('tool-disabled'));
        else
            availableNoteTools.forEach(btn => btn.classList.add('tool-disabled'));
    });
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
let isFormatting = false;

document.addEventListener('DOMContentLoaded', () => {

    // --- Highlight toolbar
    const newNoteBtn = document.querySelector("#highlight");
    newNoteBtn.addEventListener('click', function (ev) {
        if (!window.state.currentEditingNote)
            return;

        window.state.currentEditingNote.addHighlight();

        ev.stopPropagation();
    });

    // --- Add URL Links
    const linkEditBtn = document.querySelector("#links");
    const linkEditorPopup = document.querySelector("#link-editor");
    const addLinkBtn = document.getElementById('link-editor-add-btn');
    const urlTextInput = document.getElementById('link-editor-url');

    function addURL() {
        if (!urlTextInput.value)
            return;

        let newURL = urlTextInput.value.trim();

        isFormatting = true;

        if (!newURL) {
            window.state.lastEditingNote.enterEditMode();
            window.state.currentEditingNote.noteEditor.format('link', undefined, 'user');
        } else {
            if (!/^https?:\/\//i.test(newURL))
                newURL = 'http://' + newURL;
            window.state.lastEditingNote.enterEditMode();
            window.state.currentEditingNote.noteEditor.format('link', newURL, 'user');
        }

        urlTextInput.value = "";
        linkEditorPopup.close();

        setTimeout(() => {
            isFormatting = false;
        }, 50);
    }

    addLinkBtn.onclick = addURL;
    urlTextInput.addEventListener('keydown', ev => {
        if (ev.key === 'Enter')
            addURL();
    });

    linkEditBtn.addEventListener('click', function (event) {
        if (!window.state.currentEditingNote || !window.state.currentEditingNote.noteEditor)
            return;

        if (isFormatting)
            return;

        const selection = window.state.currentEditingNote.noteEditor.getSelection();
        if (!selection || !selection.length)
            return;

        const selectedText = window.state.currentEditingNote.noteEditor.getText(selection.index, selection.length);
        const trimmedText = selectedText.replace(/\n+$/, ''); // Remove trailing newlines
        const trimmedLength = trimmedText.length;

        // If we trimmed something, update the selection
        if (trimmedLength < selection.length) {
            selection = {
                index: selection.index,
                length: trimmedLength
            };
            // Optionally update the actual selection in the editor
            window.state.currentEditingNote.noteEditor.setSelection(selection.index, selection.length);
        }

        const selectionBounds = window.state.currentEditingNote.noteEditor.getBounds(selection.index, selection.length);
        const noteEditorBounds = window.state.currentEditingNote.noteContainer.getBoundingClientRect();
        const format = window.state.currentEditingNote.noteEditor.getFormat(selection.index, selection.length);

        if (format.link)
            document.getElementById("link-editor-url").value = format.link;
        else
            document.getElementById("link-editor-url").value = '';

        linkEditorPopup.style.left = noteEditorBounds.left + selectionBounds.left + window.state.scrollX + "px";
        linkEditorPopup.style.top = noteEditorBounds.top + selectionBounds.top + window.state.scrollY + selectionBounds.height + 2 + "px";

        linkEditorPopup.showModal();

        urlTextInput.value = "";
    });

    linkEditorPopup.addEventListener('click', () => {
        linkEditorPopup.close();
    });

    linkEditorPopup.addEventListener('close', () => {
        if (window.state.lastEditingNote)
            window.state.lastEditingNote.enterEditMode();
    });
    document.querySelector("#link-editor>div").addEventListener('click', ev => ev.stopPropagation());

    // --- Embed Videos
    const videoEmbedBtn = document.querySelector("#video");
    const videoEditorAddBtn = document.querySelector("#video-editor-add-btn");
    const videoEditorPopup = document.querySelector("#video-editor");
    const videoUrlInput = document.getElementById("video-editor-url");

    function addVideo() {
        let newURL = videoUrlInput.value;
        if (newURL)
            newURL = extractVideoUrl(newURL);

        if (newURL && window.state.lastEditingNote) {
            isFormatting = true;
            window.state.lastEditingNote.enterEditMode();
            const selection = window.state.currentEditingNote.lastSelection;
            window.state.currentEditingNote.noteEditor.insertEmbed(selection.index + 1, 'video', newURL, 'user');
            window.state.currentEditingNote.noteEditor.formatText(selection.index + 1, 1, { height: '170', width: '400' });
            window.state.currentEditingNote.noteEditor.setSelection(selection.index + 2, Quill.sources.SILENT);

            setTimeout(() => {
                isFormatting = false;
            }, 50);
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
        if (!window.state.currentEditingNote)// || !window.state.currentEditingNote.noteEditor)
            return;

        if (isFormatting)
            return;

        videoEditorPopup.showModal();

        videoUrlInput.value = "";
        // videoUrlInput.focus();
    });
    videoEditorPopup.addEventListener('click', () => { videoEditorPopup.close() });
    videoEditorPopup.addEventListener('close', () => {
        if (window.state.lastEditingNote) {
            window.state.lastEditingNote.enterEditMode();
        }
    });
    document.querySelector("#video-editor>div").addEventListener('click', ev => ev.stopPropagation());

    // --- Embed Image
    const imageAddPopup = document.querySelector("#image-editor");
    const imageAddBtn = document.querySelector("#image-add");
    const imageUploadBtn = document.querySelector("#image-upload");
    const imageUploadInput = document.querySelector("#imgupload");
    const imageUploadForm = document.querySelector("#image-upload-form");
    const imageUrlInput = document.querySelector("#image-editor-url");
    const imageUrlSubmitBtn = document.querySelector("#image-editor-submit");

    function addImage(url) {
        if (!url || !window.state.lastEditingNote) {
            console.warn('addImage: No URL or lastEditingNote');
            return;
        }

        isFormatting = true;
        window.state.lastEditingNote.enterEditMode();
        const { noteEditor } = window.state.currentEditingNote;
        const range = noteEditor.getSelection(true);
        noteEditor.insertText(range.index, '\n', 'user');
        noteEditor.insertEmbed(range.index + 1, 'image', url, 'user');
        noteEditor.setSelection(range.index + 2, 'silent');

        imageAddPopup.close();

        setTimeout(() => {
            isFormatting = false;
        }, 50);
    }

    imageAddBtn.addEventListener('click', () => {
        if (isFormatting)
            return;

        if (window.state.currentEditingNote) {
            window.state.currentEditingNote.exitEditMode(true);
            imageAddPopup.showModal();
            document.activeElement.blur();

            const uploadMessage = document.querySelector("#image-upload-msg");
            if (uploadMessage)
                uploadMessage.innerText = '';

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
        const uploadMessage = document.querySelector("#image-upload-msg");

        for (const file of imageUploadInput.files) {
            if (!allowed.includes(file.type)) {
                console.log("Invalid image type");
                if (uploadMessage)
                    uploadMessage.innerText = "Unknown image type! Please select .jpg, .png, .gif or .webp";
                return;
            }
            if (file.size > sizeLimit) {
                console.log("Image too big");
                if (uploadMessage)
                    uploadMessage.innerText = "Filesize too large! (max size 8Mb)";
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
        if (window.state.lastEditingNote) {
            window.state.lastEditingNote.enterEditMode();
        }
    });
    document.querySelector("#image-editor>div").addEventListener('click', ev => ev.stopPropagation());

    // --- Delete note
    const deleteBtn = document.querySelector("#remove-note");
    const deleteNotePopup = document.querySelector("#delete-popup");
    const confirmDeleteBtn = document.querySelector("#confirm-delete-btn");

    deleteBtn.addEventListener('click', function () {
        if (!window.noteOptions)
            return;
        const noteId = window.noteOptions.noteId;
        if (!noteId || !window.state.notes[noteId])
            return;

        deleteNotePopup.showModal();
        window.deletingNote = noteId;
    });

    confirmDeleteBtn.addEventListener('click', function () {
        const noteId = window.deletingNote;
        if (noteId && window.state.notes[noteId]) {
            window.state.notes[noteId].delete();
            deleteNotePopup.close();
        }
    });

    deleteNotePopup.addEventListener('click', () => deleteNotePopup.close());
    document.querySelector("#delete-popup>div").addEventListener('click', ev => ev.stopPropagation());

    // --- Export / Share
    const exportBtn = document.querySelector("#publish");
    const exportPopup = document.querySelector("#export-popup");
    exportBtn.addEventListener('click', function () {
        exportPopup.showModal();
    });
    exportPopup.addEventListener('click', () => exportPopup.close());
    document.querySelector("#export-popup>div").addEventListener('click', ev => ev.stopPropagation());
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
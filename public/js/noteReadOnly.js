import { NoteStatic, updateHighlights } from './noteStatic.js'

import Quill from 'quill';
import { AnnotateBlot } from './formats/annotateBlot.js';
Quill.register(AnnotateBlot);


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

window.quillOptions = {
    placeholder: 'Write your note here...',
    formats: [
        'italic',
        'bold',
        'font',
        'strike',
        'underline',
        'blockquote',
        'header',
        'align',
        'direction',
        'list',
        'indent',
        'annotate',
        'image',
        'video',
        'link',
    ],
    history: {
        userOnly: true
    }
}

async function fetchNoteReadOnly(noteId, note) {
    try {
        const response = await fetch(
            `${baseURL}/room/${window.state.roomId}/note/${noteId}`
        );
        const data = await response.json();
        if (data.msg) {
            throw (data.msg);
        }

        if (!note) {
            let newNote;
            if (data.noteType == 0) {
                newNote = new window.Note(noteId, data.noteType);
                const options = JSON.parse(data.noteOptions) || {};
                newNote.setOptions(options);
                newNote.setContents(data.noteContent);
            } else if (data.noteType == 1) {
                newNote = new window.NoteStatic(noteId, data.noteType);
                const options = JSON.parse(data.noteOptions) || {};
                newNote.setOptions(options);
                newNote.setHTML(data.noteContent);
            }

            return newNote;
        } else {
            note.setOptions(JSON.parse(data.noteOptions));
            note.setContents(data.noteContent);

            return note;
        }
    } catch (error) {
        console.error('Error fetching note:', error);
    }
}


class Note extends NoteStatic {

    constructor(noteId, noteType = 0) {
        super(noteId, noteType);
        this.lastContent = "";
        this.lastHighlight;

        this.noteEditor = new Quill(this.noteContents, window.quillOptions);
        this.noteContents.classList.remove('ql-editor');
        this.noteEditor.enable(false);
    }

    setContents(contents) {
        // return;
        if (!contents)
            return;

        let newContents;
        try {
            newContents = JSON.parse(contents);
        } catch (err) {
            console.error(err);
            return;
        }

        this.noteEditor.setContents(newContents);
        this.lastContent = contents;
        updateHighlights(this);
        this.addLoadCallbacks();

        this.width = this.noteContents.offsetWidth;
        this.height = this.noteContents.offsetHeight;

        this.loaded = true;
        for (const fn of this.contentLoadedCallbacks)
            fn(this);
    }

    show(animate = true) {
        super.show(animate);
    }

    close() {
        super.close();
    }
}


window.Note = Note;
window.NoteStatic = NoteStatic;
window.fetchNote = fetchNoteReadOnly;

export { Note }

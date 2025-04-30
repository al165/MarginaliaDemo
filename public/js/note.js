import { state } from './state.js';
import { NoteStatic, calculateBoundingBox, updateHighlights } from './noteStatic.js'

async function fetchNote(noteId, note) {
    console.log("fetchNote ", noteId);
    try {
        const response = await fetch(
            `${baseURL}/room/${state.roomId}/note/${noteId}`
        );
        const data = await response.json();
        if (data.msg) {
            throw (data.msg);
        }

        if (!note) {
            // console.log("fetchNote: `note` not provided, making new");
            const newNote = new window.Note(noteId);
            const options = JSON.parse(data.noteOptions) || {};
            // options.width = 500;
            newNote.setOptions(options);
            newNote.setContents(JSON.parse(data.noteContent));
            newNote.show();

            calculateBoundingBox();
            return newNote;
        } else {
            // console.log("fetchNote: `note` provided, updating contents");
            note.setOptions(JSON.parse(data.noteOptions));
            note.setContents(JSON.parse(data.noteContent));

            calculateBoundingBox();
            return note;
        }
    } catch (error) {
        console.log('Error fetching note:', error);
    }
}


class Note extends NoteStatic {
    constructor(noteId) {
        super(noteId);

        this.lastContent = "";
        this.lastHighlight;
        this.locked = false;
        this.noteContents.classList.remove('ql-editor');

        this.noteEditor = new Quill(this.noteContents, {
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
            ]
        });
        this.noteEditor.enable(false);
    }

    setContents(contents) {
        this.noteEditor.setContents(contents);
        this.lastContent = JSON.stringify(contents);
        updateHighlights(this);

        this.width = this.noteContents.offsetWidth;
        this.height = this.noteContents.offsetHeight;
    }

    setLocked(lock) {
        this.locked = lock;

        if (lock)
            this.noteContainer.classList.add('note-locked');
        else
            this.noteContainer.classList.remove('note-locked');
    }

    getHTML() {
        // need to add <br> to empty <p></p> tags...
        let html = this.noteEditor.getSemanticHTML();
        html = html.replaceAll('<p></p>', '<p><br></p>');
        return html;
    }

    reload() {

    }
}


window.Note = Note;

export { Note, fetchNote }

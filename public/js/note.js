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
            let newNote;
            if (data.noteType == 0) {
                newNote = new window.Note(noteId, data.noteType);
                const options = JSON.parse(data.noteOptions) || {};
                newNote.setOptions(options);
                newNote.setContents(data.noteContent);
                newNote.setLocked(state.lockedNotes.has(noteId));
                newNote.show();
            } else if (data.noteType == 1) {
                newNote = new window.NoteStatic(noteId, data.noteType);
                const options = JSON.parse(data.noteOptions) || {};
                newNote.setOptions(options);
                newNote.setHTML(data.noteContent);
                newNote.show();
            }

            calculateBoundingBox();
            return newNote;
        } else {
            // console.log("fetchNote: `note` provided, updating contents");
            note.setOptions(JSON.parse(data.noteOptions));
            note.setContents(data.noteContent);

            calculateBoundingBox();
            return note;
        }
    } catch (error) {
        console.log('Error fetching note:', error);
    }
}


class Note extends NoteStatic {
    constructor(noteId, noteType = 0) {
        super(noteId, noteType);

        this.lastContent = "";
        this.lastHighlight;
        this.locked = false;

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
        this.noteContents.classList.remove('ql-editor');
        this.noteEditor.enable(false);
    }

    setContents(contents) {
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
    }

    setLocked(lock) {
        this.locked = lock;

        if (lock)
            this.noteContainer.classList.add('note-locked');
        else
            this.noteContainer.classList.remove('note-locked');
    }
}


window.Note = Note;
window.NoteStatic = NoteStatic;

export { Note, fetchNote }

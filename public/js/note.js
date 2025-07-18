import { NoteStatic, updateHighlights } from './noteStatic.js'

import Quill from 'quill';
import QuillCursors from 'quill-cursors';

import { AnnotateBlot } from './formats/annotateBlot.js';

Quill.register(AnnotateBlot);
Quill.register('modules/cursors', QuillCursors);

import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { QuillBinding } from 'y-quill';


window.addEventListener('load', () => {
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
});

async function fetchNote(noteId, note) {
    console.log("fetchNote ", noteId);
    try {
        const response = await fetch(
            `${baseURL}/room/${window.state.roomId}/note/${noteId}`
        );
        const data = await response.json();
        if (data.msg) {
            throw (data.msg);
        }

        if (!note) {
            console.log('fetchNote: creating note');
            // the newNote should only be made visible if is not closable, or
            // if the 
            let newNote;
            if (data.noteType == 0) {
                newNote = new window.Note(noteId, data.noteType);
                const options = JSON.parse(data.noteOptions) || {};
                newNote.setOptions(options);
                newNote.setContents(data.noteContent);
                // newNote.setLocked(window.state.lockedNotes.has(noteId));
            } else if (data.noteType == 1) {
                newNote = new window.NoteStatic(noteId, data.noteType);
                const options = JSON.parse(data.noteOptions) || {};
                newNote.setOptions(options);
                newNote.setHTML(data.noteContent);
                // newNote.show();
            }
            // newNote.close();

            return newNote;
        } else {
            console.log(`fetchNote: updating note ${note.noteId}`);
            note.setOptions(JSON.parse(data.noteOptions));
            note.setContents(data.noteContent);

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

        this.notification = document.createElement('div');
        this.notification.classList.add('notification');
        this.notification.classList.add('drop-shadow');
        this.noteContainer.appendChild(this.notification);
        this.notification.innerText = "Someone is currently editing this note...";

        const ydoc = new Y.Doc()
        const provider = new WebsocketProvider(
            `ws${location.protocol.slice(4)}//${location.host}/ws`, // alternatively: use the local ws server (run `npm start` in root directory)
            noteId,
            ydoc
        );
        const ytext = ydoc.getText('quill')

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

        const binding = new QuillBinding(ytext, this.noteEditor, provider.awareness)
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

        if (lock) {
            this.noteContainer.classList.add('note-locked');
            if (this.open)
                this.notification.style.visibility = 'visible';
        }
        else {
            this.noteContainer.classList.remove('note-locked');
            this.notification.style.visibility = 'hidden';
        }
    }

    show(animate = true) {
        super.show(animate);
        if (this.locked)
            this.notification.style.visibility = 'visible';
    }

    close() {
        super.close();
        this.notification.style.visibility = 'hidden';
    }
}


window.Note = Note;
window.NoteStatic = NoteStatic;

export { Note, fetchNote }

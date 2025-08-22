// This module adds editing functionality to noteReadOnly.js. Only imported if editToken is correct
// assumes noteReadOnly.js is already imported!

import { Split, updateHighlights } from './noteStatic.js';
import { Note } from './noteReadOnly.js';

import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { QuillBinding } from 'y-quill';

import Quill from 'quill';
import QuillCursors from 'quill-cursors';
Quill.register('modules/cursors', QuillCursors, true);

let noteButtons = document.querySelector("#note-buttons");
let removeBtn = noteButtons.querySelector("#remove-note");
let resizeHandle = document.querySelector("#resize-note");

window.quillOptions.modules = {
    cursors: true
};

if (canEdit && editToken) {
    let roomHistory = JSON.parse(localStorage.getItem("history") || '{}');
    roomHistory[roomId] = {
        url: window.location.href,
        roomName: roomName
    }
    localStorage.setItem('history', JSON.stringify(roomHistory));
}

if (resizeHandle) {
    resizeHandle.addEventListener('mousedown', (ev) => {
        ev.preventDefault();
        console.log("resize start");

        const noteId = noteButtons.dataset.noteid;
        if (!noteId)
            return;

        const note = window.state.notes[noteId];
        if (!(note instanceof Note))
            return;

        window.state.resizing = noteId;
        window.state.resizeStartPosition = ev.clientX;
        note.noteWindow.classList.remove("grow");
        window.state.resizeStartWidth = note.width;
        note.toFront();
    });
}
// });

class EditableNote extends Note {

    constructor(noteId, noteType = 0) {
        super(noteId, noteType);
        this.noteEditor.enable(false);
        this.lastSelection;
        this.parentHighlight;

        this.noteEditor.on('text-change', (_delta, _oldDelta, _source) => {
            const range = this.noteEditor.getSelection();
            window.state.currentSelection = range;
        });

        this.noteEditor.on('selection-change', (range, _oldRange, source) => {
            if (source === 'api')
                return;

            this.provider.awareness.setLocalStateField('user', {
                color: window.state.highlightColour
            });

            if (!range) {
                this.exitEditMode();
                window.state.currentSelection = undefined;
                return;
            } else {
                this.lastSelection = range;

                if (!this.editing)
                    this.enterEditMode();
            }

            this.lastHighlight = range;
            window.state.currentSelection = range;
        });

        this.noteEditor.keyboard.addBinding({
            key: 'Escape'
        }, () => {
            if (this.editing) {
                this.noteEditor.blur();
                return false;
            }
        });

        this.noteEditor.keyboard.addBinding({
            key: 's',
            shortKey: true
        }, () => {
            if (this.editing) {
                this.noteEditor.blur();
                return false;
            }
        });

        this.noteEditor.keyboard.addBinding({
            key: 'h',
            shortKey: true
        }, () => {
            if (this.editing) {
                this.addHighlight();
                return false;
            }
        });

        const ydoc = new Y.Doc()
        this.provider = new WebsocketProvider(
            `ws${location.protocol.slice(4)}//${location.host}/ws`,
            noteId,
            ydoc,
            { params: { editToken, roomId, noteId } }
        );
        this.ytext = ydoc.getText('quill');
        this.ymap = ydoc.getMap('note-options');

        ydoc.on("update", (update, origin, tr) => {
            updateHighlights(this);
            this.width = this.noteContents.offsetWidth;
            this.height = this.noteContents.offsetHeight;
            this.addLoadCallbacks();
        });

        this.ymap.observe(ymapEvent => {
            for (const key of ymapEvent.keysChanged) {
                if (key === 'width') {
                    this.setWidth(this.ymap.get('width'));
                }
            }
        });

        this.binding = new QuillBinding(this.ytext, this.noteEditor, this.provider.awareness);
        this.provider.awareness.setLocalStateField('user', {
            color: window.state.highlightColour
        });

        this.provider.on("status", (event) => {
            console.log("provider status " + event.status);
            if (event.status === 'disconnected') {

            } else if (event.status === 'connecting') {

            } else if (event.status === 'connected') {
                this.noteEditor.enable(true);
            }
        });

        this.provider.on("connection-close", (event) => {
            if (event.code == 4001) {
                console.log(event.reason);
                this.provider.shouldConnect = false;
                this.noteEditor.setContents([
                    { insert: `Error connecting to note: ${event.reason}`, attributes: { color: 'red', italic: true } }
                ], 'api');
            }
        });
    }

    onHover() {
        super.onHover();
        if ((window.state.dragging) || window.state.resizing)
            return;

        if (this.closable) {
            removeBtn.style.display = "block";
            removeBtn.dataset.noteid = this.noteId;
        } else {
            removeBtn.style.display = "none";
        }

        resizeHandle.style.display = "block";
        noteButtons.style.visibility = "visible";
    }

    enterEditMode() {
        console.log(`${this.noteId} enterEditMode()`);

        if (!canEdit) {
            console.log("enterEditMode: canEdit is false");
            this.noteEditor.enable(false);
            return;
        }

        this.noteEditor.focus();
        this.editing = true;
        this.noteWindow.classList.add('note-editing');
        if (this.lastSelection)
            this.noteEditor.setSelection(this.lastSelection,);

        window.state.enteredEditMode(this);
    }

    exitEditMode(skip_save = false) {
        console.log(`${this.noteId} exitEditMode, skip_save: ${skip_save}`);
        this.editing = false;
        this.noteWindow.classList.remove('note-editing');

        window.state.exitedEditMode(this);

        if (this.noteEditor.getText().trimEnd().length == 0) {
            console.log("Length 0, deleting note");
            this.delete();
        }
    }

    preSplit() {
        super.preSplit();
        this.noteEditor.blur();
        this.noteEditor.enable(false);
    }

    restore() {
        super.restore();
        this.noteEditor.enable(true);
    }

    delete() {
        if (!canEdit || !editToken) {
            console.log(`Cannot delete note (canEdit: ${canEdit}, editToken: ${editToken})`);
            return;
        }

        fetch(`${baseURL}/room/${window.state.roomId}/note/${this.noteId}`, {
            method: 'DELETE',
            body: JSON.stringify({
                editToken
            }),
            headers: {
                "Content-type": "application/json"
            }
        }).then(res => {
            this.close(false);

            if (!res.ok) {
                console.log("Deleting not ok:");
                console.log(res.statusText);
                return;
            }

            // remove annotation from parent
            if (this.parent) {
                let parentContents = this.parent.noteEditor.getContents();

                for (const format of parentContents.ops) {
                    if (format.attributes && format.attributes.annotate && format.attributes.annotate.id == this.noteId) {
                        delete format.attributes.annotate;
                    }
                }

                this.parent.restore();
                this.parent.setContents(JSON.stringify(parentContents.ops), 'api');
                this.parent.save();
            }

            delete this.noteEditor;
            delete window.state.deleteNote(this);
        });

    }

    addHighlight() {
        if (!canEdit || !editToken || !this.editing)
            return;

        fetch(`${baseURL}/room/${window.state.roomId}/newnote?editToken=${editToken}`)
            .then(res => res.json())
            .then(data => {
                const { noteId } = data;
                console.log("new note id: " + noteId);

                const selection = this.noteEditor.getSelection();
                if (!selection || selection.length == 0)
                    return;

                this.noteEditor.formatText(
                    selection.index,
                    selection.length,
                    'annotate',
                    { id: noteId, color: window.state.highlightColour }
                );
                const bounds = this.noteEditor.getBounds(selection);
                const parentPos = this.getPosition();

                const newNote = new EditableNote(noteId);
                newNote.setPosition({ left: bounds.left + parentPos.left, top: bounds.top + bounds.height + parentPos.top });
                newNote.toFront();
                newNote.parent = this;
                newNote.show(false);
                newNote.noteEditor.focus();
            });
    }

    save(force = false) {
        return;
    }

    setContents(contents) {
        super.setContents(contents);

        if (this.editing)
            this.noteEditor.setSelection(this.lastSelection);
    }
}

class EditableSplit extends Split {
    onHover() {
        super.onHover();
        if (window.state.dragging || window.state.resizing)
            return;
        removeBtn.style.display = "none";
        resizeHandle.style.display = "none";
    }
}

async function fetchNoteEdit(noteId, note) {
    console.log("fetchNoteEdit ", noteId);

    if (!note) {
        let newNote = new window.Note(noteId);

        return newNote;
    }
}


window.Note = EditableNote;
window.Split = EditableSplit;
window.fetchNote = fetchNoteEdit;

export { EditableNote, EditableSplit };
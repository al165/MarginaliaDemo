// This module adds editing functionality to note.js. Only imported if editToken is correct
// assumes note.js is already imported!

import { state } from './state.js';
import { Split, updateHighlights } from './noteStatic.js';
import { Note } from './note.js';

const noteButtons = document.querySelector("#note-buttons");

const removeBtn = noteButtons.querySelector("#remove-note");
const resizeHandle = document.querySelector("#resize-note");

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

        const note = state.notes[noteId];
        if (!(note instanceof Note))
            return;

        state.resizing = noteId;
        state.resizeStartPosition = ev.clientX;
        note.noteWindow.classList.remove("grow");
        state.resizeStartWidth = note.width;
        note.toFront();
    });
}

class EditableNote extends Note {

    constructor(noteId, noteType = 0) {
        super(noteId, noteType);
        this.noteEditor.enable(canEdit);
        this.lastSelection;
        this.parentHighlight;

        this.noteEditor.on('text-change', (delta, oldDelta, source) => {
            const range = this.noteEditor.getSelection();
            state.currentSelection = range;
        });

        this.noteEditor.on('selection-change', (range, oldRange, source) => {
            if (this.locked) {
                this.noteEditor.blur();
                return;
            }

            if (!range) {
                this.exitEditMode();
                state.currentSelection = undefined;
                return;
            } else {
                this.lastSelection = range;

                if (!this.editing)
                    this.enterEditMode();
            }

            this.lastHighlight = range;
            state.currentSelection = range;
        });

    }

    onHover() {
        super.onHover();
        if ((state.dragging) || state.resizing)
            return;

        if (this.locked) {
            noteButtons.style.visibility = "hidden";
        } else {
            if (this.closable) {
                removeBtn.style.display = "block";
                removeBtn.dataset.noteid = this.noteId;
            } else {
                removeBtn.style.display = "none";
            }

            resizeHandle.style.display = "block";
            noteButtons.style.visibility = "visible";
        }
    }

    enterEditMode() {
        console.log(`${this.noteId} enterEditMode()`);
        if (this.locked) {
            console.log("enterEditMode: is locked so returning");
            this.
                return;
        }

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

        state.enteredEditMode(this);
    }

    exitEditMode(skip_save = false) {
        console.log(`${this.noteId} exitEditMode, skip_save: ${skip_save}`);
        this.editing = false;
        this.noteWindow.classList.remove('note-editing');

        if (!skip_save)
            this.save();

        state.exitedEditMode(this);
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

    setLocked(lock) {
        super.setLocked(lock);
        this.noteEditor.enable(!lock);
    }

    delete() {
        if (!canEdit || !editToken || this.locked) {
            console.log(`Cannot delete note (canEdit: ${canEdit}, editToken: ${editToken}, locked: ${this.locked})`);
            return;
        }

        fetch(`${baseURL}/room/${state.roomId}/note/${this.noteId}`, {
            method: 'DELETE',
            body: JSON.stringify({
                editToken
            }),
            headers: {
                "Content-type": "application/json"
            }
        }).then(res => {
            this.exitEditMode(true);
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
            delete state.deleteNote(this);
        });

    }

    save(force = false) {
        if (!canEdit || !editToken || this.locked) {
            console.log(`Cannot edit note (canEdit: ${canEdit}, editToken: ${editToken}, locked: ${this.locked})`);
            return;
        }

        const noteContent = this.noteEditor.getContents();
        const noteOptions = this.options;

        if (!force && JSON.stringify(noteContent) === this.lastContent)
            return;

        if (this.noteId) {
            // note already saved, update it
            fetch(`${baseURL}/room/${state.roomId}/note/${this.noteId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    editToken,
                    noteContent,
                    noteOptions
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
                this.lastContent = JSON.stringify(noteContent);
                if (json.msg)
                    console.log(json.msg);
            }).catch(error => {
                console.log("Error editing note: " + error);
            });
        } else {
            // note not saved yet, create new
            console.log("note not saved, creating new");

            // if empty, ignore...
            if (this.noteEditor.getText().trim().length == 0) {
                this.delete();
                return;
            }

            // get the lastHighlight of the parent note
            // to set the annotation format...
            let lastHighlight;
            if (this.parent)
                lastHighlight = this.parent.parentHighlight;

            fetch(`${baseURL}/room/${state.roomId}/note/`, {
                method: 'POST',
                body: JSON.stringify({
                    editToken,
                    noteContent,
                    noteOptions
                }),
                headers: {
                    "Content-type": "application/json"
                }
            }).then(res => {
                return res.json();
            }).then(json => {
                if (json.msg)
                    console.log(json.msg);
                else if (json.noteId) {
                    // update the highlight with the assigned noteId
                    this.noteId = json.noteId;

                    if (lastHighlight) {
                        this.parent.noteEditor.formatText(lastHighlight.index, lastHighlight.length, 'annotate', { id: this.noteId, color: state.highlightColour });
                        updateHighlights(this.parent);
                        this.parent.save();
                    }

                    state.addNote(this);
                    this.lastContent = JSON.stringify(noteContent);
                }
                else
                    console.log(json);
            }).catch(error => {
                console.log("Error editing note: " + error);
            });
        }
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
        if (state.dragging || state.resizing)
            return;
        removeBtn.style.display = "none";
        resizeHandle.style.display = "none";
    }
}


window.Note = EditableNote;
window.Split = EditableSplit;

export { EditableNote, EditableSplit };
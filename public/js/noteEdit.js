// This module adds editing functionality to note.js. Only imported if editToken is correct
// assumes note.js is already imported!

import { Split, updateHighlights } from './noteStatic.js';
import { Note } from './note.js';

let noteButtons;
let removeBtn;
let resizeHandle;

window.addEventListener('load', () => {
    noteButtons = document.querySelector("#note-buttons");
    removeBtn = noteButtons.querySelector("#remove-note");
    resizeHandle = document.querySelector("#resize-note");

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
            console.log(noteId);
            if (!noteId)
                return;

            const note = window.state.notes[noteId];
            console.log(note);
            if (!(note instanceof Note))
                return;

            window.state.resizing = noteId;
            window.state.resizeStartPosition = ev.clientX;
            note.noteWindow.classList.remove("grow");
            window.state.resizeStartWidth = note.width;
            note.toFront();
        });
    }

});

class EditableNote extends Note {

    constructor(noteId, noteType = 0) {
        super(noteId, noteType);
        this.noteEditor.enable(canEdit);
        this.lastSelection;
        this.parentHighlight;

        this.noteEditor.on('text-change', (_delta, _oldDelta, _source) => {
            const range = this.noteEditor.getSelection();
            window.state.currentSelection = range;
        });

        this.noteEditor.on('selection-change', (range, _oldRange, _source) => {
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

    }

    onHover() {
        super.onHover();
        if ((window.state.dragging) || window.state.resizing)
            return;

        if (this.locked) {
            noteButtons.style.visibility = "hidden";
        } else {
            if (this.closable) {
                removeBtn.style.display = "block";
                removeBtn.dataset.noteid = this.noteId;
                if (this.parent && this.parent.locked) {
                    removeBtn.classList.add('tool-disabled');
                    removeBtn.title = "Cannot delete note while someone is editing the parent note";
                } else {
                    removeBtn.classList.remove('tool-disabled');
                    removeBtn.title = "Delete note";
                }
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

        window.state.lockNote(this, true);
        window.state.enteredEditMode(this);

        if (!this.noteId && this.parent) {
            console.log(`new annotation, locking parent ${this.parent.noteId}`);
            window.state.lockNote(this.parent, true);
        }
    }

    exitEditMode(skip_save = false) {
        console.log(`${this.noteId} exitEditMode, skip_save: ${skip_save}`);
        this.editing = false;
        this.noteWindow.classList.remove('note-editing');

        if (!skip_save) {
            this.save();
            this.setLocked(false, true);
        } else {
            // keep locked
            // this.setLocked(true, true);
            window.state.lockNote(this, true);
        }

        window.state.exitedEditMode(this);
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

    setLocked(lock, update_state = false) {
        if (this.editing && !lock) {
            console.log("trying to unlock but I am editing rn");
            return;
        }

        super.setLocked(lock);
        console.log(`setLocked ${this.noteId} ${lock}`)

        this.noteEditor.enable(!lock);

        if (update_state)
            window.state.lockNote(this, lock);
    }

    delete() {
        if (!canEdit || !editToken || this.locked) {
            console.log(`Cannot delete note (canEdit: ${canEdit}, editToken: ${editToken}, locked: ${this.locked})`);
            return;
        }

        // check if parent is locked...
        if (this.parent && this.parent.locked) {
            console.log(`Cannot delete note since parent is locked`);
            return;
        }

        this.setLocked(true, true);
        this.parent.setLocked(true, true);

        fetch(`${baseURL}/room/${window.state.roomId}/note/${this.noteId}`, {
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
                this.parent.setLocked(false, true);
                this.parent.setContents(JSON.stringify(parentContents.ops), 'api');
                this.parent.save();
                // window.state.currentEditingNote = undefined;
                // window.state.lockNote(this.parent, false);
            }

            delete this.noteEditor;
            delete window.state.deleteNote(this);
        });

    }

    addHighlight() {
        if (!canEdit || !editToken || this.locked || !this.editing)
            return;

        console.log("new note");
        const selection = this.noteEditor.getSelection();
        if (!selection || selection.length == 0) {
            console.log("selection is undefined or 0");
            return;
        }
        const bounds = this.noteEditor.getBounds(selection);
        const parentPos = this.getPosition();
        this.parentHighlight = selection;

        const newNote = new EditableNote();
        newNote.setPosition({ left: bounds.left + parentPos.left, top: bounds.top + bounds.height + parentPos.top });
        newNote.toFront();
        newNote.parent = this;
        newNote.show(false);
        this.exitEditMode(true);
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
            fetch(`${baseURL}/room/${window.state.roomId}/note/${this.noteId}`, {
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

            fetch(`${baseURL}/room/${window.state.roomId}/note/`, {
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
                        this.parent.noteEditor.formatText(lastHighlight.index, lastHighlight.length, 'annotate', { id: this.noteId, color: window.state.highlightColour });
                        updateHighlights(this.parent);
                        this.parent.save();
                    }

                    window.state.addNote(this);
                    this.lastContent = JSON.stringify(noteContent);

                    if (this.parent)
                        this.parent.setLocked(false, true);
                }
                else
                    console.log(json);

            }).catch(error => {
                console.log("Error editing note: " + error);

                if (this.parent)
                    this.parent.setLocked(false, true);
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
        if (window.state.dragging || window.state.resizing)
            return;
        removeBtn.style.display = "none";
        resizeHandle.style.display = "none";
    }
}


window.Note = EditableNote;
window.Split = EditableSplit;

export { EditableNote, EditableSplit };
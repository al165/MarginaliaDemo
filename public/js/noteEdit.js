// This module adds editing functionality to note.js. Only imported if editToken is correct
// assumes note.js is already imported!

import { state } from './state.js';
import { Split, updateHighlights } from './noteStatic.js';
import { Note } from './note.js';
import { HIGHLIGHT_COLOURS } from './data/colourschemes.js';

const noteButtons = document.querySelector("#note-buttons");

const hightlightToolbar = document.querySelector("#highlight-toolbar");
const removeBtn = noteButtons.querySelector("#remove-note");
const resizeHandle = document.querySelector("#resize-note");

// Color management
// TODO: add to state
let currentColor = 0;

function getNextColor() {
    //lastHue = (lastHue + 25) % 360;
    //return `oklch(0.65 0.4 ${lastHue})`
    currentColor = (currentColor + 1) % HIGHLIGHT_COLOURS.length;
    return HIGHLIGHT_COLOURS[currentColor];
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
    });
}

class EditableNote extends Note {

    constructor(noteId) {
        super(noteId);
        this.noteEditor.enable(canEdit);
        this.noteEditor.focus();

        this.noteEditor.on('selection-change', (range, oldRange, source) => {
            if (!range) {
                // console.log(`${this.noteId} lost focus`);
                hightlightToolbar.style.visibility = 'hidden';
                this.exitEditMode();
                return;
            } else {
                if (range.length > 0) {
                    let newRange = {
                        index: range.index,
                        length: 1
                    };
                    const highlightBounds = this.noteEditor.getBounds(newRange);
                    console.log(highlightBounds);

                    hightlightToolbar.style.left = highlightBounds.left + this.getPosition().left + 'px';
                    hightlightToolbar.style.top = highlightBounds.top + this.getPosition().top - hightlightToolbar.clientHeight + 'px';

                    hightlightToolbar.style.visibility = 'visible';
                }
                else
                    hightlightToolbar.style.visibility = 'hidden';
                this.enterEditMode();
            }

            this.lastHighlight = range;
        });

    }

    onHover() {
        super.onHover();
        // console.log("EditableNote.onHover()");

        if (!this.locked) {
            if (this.closable) {
                removeBtn.style.display = "block";
                removeBtn.onclick = () => {
                    this.delete();
                }
            } else {
                removeBtn.style.display = "none";
            }

            resizeHandle.style.display = "block";
            noteButtons.style.visibility = "visible";
        }
    }

    enterEditMode() {
        // console.log(`${this.noteId} enterEditMode`);
        if (this.locked) {
            console.log("enterEditMode: is locked so returning");
            return;
        }

        if (!canEdit) {
            console.log("enterEditMode: canEdit is false");
            this.noteEditor.enable(false);
            return;
        }

        if (state.currentEditingNote)
            state.currentEditingNote.exitEditMode();

        this.editing = true;
        this.noteWindow.classList.add('note-editing');
        state.currentEditingNote = this;
    }

    exitEditMode(skip_save = false) {
        console.log(`${this.noteId} exitEditMode`);
        this.editing = false;
        this.noteWindow.classList.remove('note-editing');

        if (!skip_save)
            this.save();

        state.currentEditingNote = undefined;
    }

    preSplit() {
        super.preSplit();
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
                console.log(res.statusText);
                return;
            }

            // remove annotation from parent
            if (this.parent) {
                let parentContents = this.parent.noteEditor.getContents();
                const parentId = parent.noteId;

                for (const format of parentContents.ops) {
                    if (format.attributes && format.attributes.annotate && format.attributes.annotate.id == this.noteId) {
                        delete format.attributes.annotate;
                        break;
                    }
                }

                this.parent.setContents(parentContents.ops, 'api');
                this.parent.restore();
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
        // console.log(`${this.noteId} save()`);

        const noteContent = this.noteEditor.getContents();
        const noteOptions = this.options;
        // noteOptions.width = this.width;
        if (!force && JSON.stringify(noteContent) === this.lastContent) {
            // console.log(`${this.noteId} Text has not changed.`);
            return;
        }

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

                    if (this.parent) {
                        this.parent.noteEditor.setSelection(this.parent.lastHighlight);
                        this.parent.noteEditor.format('annotate', { id: this.noteId, color: getNextColor() });
                        this.parent.noteEditor.blur();
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

}

class EditableSplit extends Split {
    onHover() {
        super.onHover();
        removeBtn.style.display = "none";
        resizeHandle.style.display = "none";
    }
}


window.Note = EditableNote;
window.Split = EditableSplit;

export { EditableNote, EditableSplit };
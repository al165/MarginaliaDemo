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

if (canEdit && editToken) {
    let roomHistory = JSON.parse(localStorage.getItem("history") || '{}');
    roomHistory[roomId] = {
        url: window.location.href,
        roomName: roomName
    }
    localStorage.setItem('history', JSON.stringify(roomHistory));
}

// Color management
let currentColor = HIGHLIGHT_COLOURS[0];

const highlighterColour = document.querySelector("#highlight-colour");
highlighterColour.style.backgroundColor = currentColor;

const highlighterPallette = document.querySelector("#highlight-colour-pallette");

for (const hiColour of HIGHLIGHT_COLOURS) {
    const colourChoice = document.createElement('div');
    colourChoice.classList.add('colour-choice');
    colourChoice.style.backgroundColor = hiColour;

    highlighterPallette.appendChild(colourChoice);

    colourChoice.addEventListener('mousedown', (ev) => {
        ev.preventDefault();
        currentColor = hiColour;
        highlighterColour.style.backgroundColor = hiColour;
        highlighterPallette.style.maxWidth = '0em';
    });
}

highlighterColour.addEventListener('mousedown', (ev) => {
    ev.preventDefault();
    highlighterPallette.style.maxWidth = '10em';
});


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

    constructor(noteId) {
        super(noteId);
        this.noteEditor.enable(canEdit);
        this.noteEditor.focus();

        this.noteEditor.on('selection-change', (range, oldRange, source) => {
            if (this.locked)
                return;

            if (!range) {
                hightlightToolbar.style.visibility = 'hidden';
                highlighterPallette.style.maxWidth = '0em';
                this.exitEditMode();
                return;
            } else {
                if (range.length > 0) {
                    let newRange = {
                        index: range.index,
                        length: 1
                    };
                    const highlightBounds = this.noteEditor.getBounds(newRange);

                    hightlightToolbar.style.left = highlightBounds.left + this.getPosition().left + 'px';
                    hightlightToolbar.style.top = highlightBounds.top + this.getPosition().top - hightlightToolbar.clientHeight + 'px';

                    hightlightToolbar.style.visibility = 'visible';
                }
                else {
                    hightlightToolbar.style.visibility = 'hidden';
                    highlighterPallette.style.maxWidth = '0em';
                }

                if (!this.editing)
                    this.enterEditMode();
            }

            this.lastHighlight = range;
        });

    }

    onHover() {
        super.onHover();
        if ((state.dragging) || state.resizing)
            return;

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
        console.log(`${this.noteId} exitEditMode, skip_save: ${skip_save}`);
        this.editing = false;
        this.noteWindow.classList.remove('note-editing');

        if (!skip_save)
            this.save();

        state.currentEditingNote = undefined;
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
                const parentId = parent.noteId;

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
                        this.parent.noteEditor.format('annotate', { id: this.noteId, color: currentColor });
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
        if (state.dragging || state.resizing)
            return;
        removeBtn.style.display = "none";
        resizeHandle.style.display = "none";
    }
}


window.Note = EditableNote;
window.Split = EditableSplit;

export { EditableNote, EditableSplit };
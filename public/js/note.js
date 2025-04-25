import { state } from './state.js';

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
            const newNote = new Note(noteId);
            newNote.setContents(JSON.parse(data.noteContent));
            newNote.show();

            calculateBoundingBox();
            return newNote;
        } else {
            // console.log("fetchNote: `note` provided, updating contents");
            note.setContents(JSON.parse(data.noteContent));

            calculateBoundingBox();
            return note;
        }
    } catch (error) {
        console.log('Error fetching note:', error);
    }
}

function calculateBoundingBox() {
    // Resize #notes to fit all the elements
    const notesContainer = document.getElementById("notes");
    const noteElements = document.querySelectorAll(".note");
    let w = 0;
    let h = 0;
    for (const noteElement of noteElements) {
        const bounds = noteElement.getBoundingClientRect();

        w = Math.max(w, bounds.left + bounds.width);
        h = Math.max(h, bounds.top + bounds.height);
    }
    notesContainer.style.width = w + "px";
    notesContainer.style.height = h + "px";
}

let lastVertical = false;

const highlightColors = [
    '#ff0063',
    '#ff87ff',
    '#b26bfe',
    '#6c9aff',
    '#dfffcd',
    '#00dfba',
    '#ffffb9',
];
let currentColor = 0;

function getNextColor() {
    //lastHue = (lastHue + 25) % 360;
    //return `oklch(0.65 0.4 ${lastHue})`
    currentColor = (currentColor + 1) % highlightColors.length;
    return highlightColors[currentColor];
}

const noteButtons = document.querySelector("#note-buttons");

const closeBtn = noteButtons.querySelector("#close-note");
const restoreBtn = noteButtons.querySelector("#restore-note");
const editBtn = noteButtons.querySelector("#edit-note");
const removeBtn = noteButtons.querySelector("#remove-note");
const resizeHandle = document.querySelector("#resize-note");

let currentHoveredNote;
let dragStart;

if (canEdit) {
    resizeHandle.addEventListener('mousedown', (ev) => {
        ev.preventDefault();
    });

    resizeHandle.addEventListener('mousedown', (ev) => {
        ev.preventDefault();
    });
}

function split(fragment, vertical, newNote, hRect) {
    const lastScrollX = state.scrollX;
    const lastScrollY = state.scrollY;

    newNote.toFront();

    const pos = fragment.getPosition();
    const size = fragment.getSize();

    const mainAxisN = vertical ? "left" : "top";
    const mainAxisP = vertical ? "right" : "bottom";
    const crossAxisN = vertical ? "top" : "left";
    const scrollMainAxis = vertical ? state.scrollX : state.scrollY;
    const scrollCrossAxis = vertical ? state.scrollY : state.scrollX;
    const mainDim = vertical ? "width" : "height";
    const crossDim = vertical ? "height" : "width";
    const offset = newNote.getSize()[mainDim];
    const mainCartesian = vertical ? "x" : "y";
    const crossCartesian = vertical ? "y" : "x";
    const crossOffset = vertical ? "offsetTop" : "offsetLeft";

    const cut = hRect[mainCartesian] - pos[mainAxisN] + scrollMainAxis + hRect[mainDim] / 2;

    const html = fragment.getHTML();
    const areaRect = fragment.noteWindow.getBoundingClientRect();
    const contentRect = fragment.noteContents.getBoundingClientRect();

    const fragmentLeft = new Split(fragment.noteId, fragment, html);
    const fragmentRight = new Split(fragment.noteId, fragment, html);

    // Size the two fragments...
    const sizeL = {};
    sizeL[mainDim] = cut;
    sizeL[crossDim] = size[crossDim];
    fragmentLeft.setSize(sizeL);

    const sizeR = {};
    sizeR[mainDim] = size[mainDim] - cut;
    sizeR[crossDim] = size[crossDim];
    fragmentRight.setSize(sizeR);

    // Position the fragments
    let posL = {};
    posL[mainAxisN] = pos[mainAxisN];
    posL[crossAxisN] = pos[crossAxisN];
    fragmentLeft.setPosition(posL);
    // incase the new position was bounded
    posL = fragmentLeft.getPosition();

    let posR = {};
    posR[mainAxisN] = posL[mainAxisN] + sizeL[mainDim];
    posR[crossAxisN] = pos[crossAxisN];
    fragmentRight.setPosition(posR);
    posR = fragmentRight.getPosition();

    const newNotePos = {};
    newNotePos[mainAxisN] = posL[mainAxisN] + sizeL[mainDim];
    newNotePos[crossAxisN] = hRect[crossCartesian] + scrollCrossAxis;
    newNote.setPosition(newNotePos);

    // now animate the positions
    fragmentLeft.noteContainer.classList.add('slide');
    fragmentRight.noteContainer.classList.add('slide');
    newNote.noteContainer.classList.add('slide');

    posL[mainAxisN] = pos[mainAxisN] - offset / 2;
    posL[crossAxisN] = pos[crossAxisN];
    fragmentLeft.setPosition(posL);

    posR[mainAxisN] = posL[mainAxisN] + sizeL[mainDim] + offset;
    posR[crossAxisN] = pos[crossAxisN];
    fragmentRight.setPosition(posR);

    newNotePos[mainAxisN] = posL[mainAxisN] + sizeL[mainDim];
    newNotePos[crossAxisN] = hRect[crossCartesian] + scrollCrossAxis;
    newNote.setPosition(newNotePos);


    // Adjust the inner content within the fragments
    fragmentLeft.noteContents.style[mainAxisN] = contentRect[mainAxisN] - areaRect[mainAxisN] + "px";
    fragmentLeft.noteContents.style[mainAxisP] = null;
    fragmentLeft.noteContents.style[crossAxisN] = fragment.noteContents[crossOffset] + "px";

    fragmentRight.noteContents.style[mainAxisP] = areaRect[mainAxisP] - contentRect[mainAxisP] + "px";
    fragmentRight.noteContents.style[mainAxisN] = null;
    fragmentRight.noteContents.style[crossAxisN] = fragment.noteContents[crossOffset] + "px";

    fragment.children.push(fragmentLeft);
    fragment.children.push(fragmentRight);

    // Calculate the position of the new Note


    fragment.close(false);

    calculateBoundingBox();

    window.scrollTo({ top: lastScrollY, left: lastScrollX });
}

function updateHighlights(note) {
    for (const highlight of note.noteContents.querySelectorAll('mark')) {
        let c = highlight.dataset.color;
        highlight.dataset.init = true;
        highlight.style.boxShadow = `0px 0px 3px 3px ${c}`;
        highlight.style.backgroundColor = c;

        highlight.onclick = (ev) => {
            // const vertical = Math.random() < 0.5;
            lastVertical = !lastVertical;

            const targetId = highlight.dataset.id;
            const hRect = highlight.getBoundingClientRect();

            if (typeof state.notes[targetId] === 'undefined') {
                fetchNote(targetId).then(newNote => {
                    if (!newNote)
                        return;

                    newNote.parent = note;
                    split(note, lastVertical, newNote, hRect);
                });
                return;
            }

            state.notes[targetId].show();
            split(note, lastVertical, state.notes[targetId], hRect);
        };
    }
}

class Fragment {
    constructor(noteId) {
        this.noteId = noteId;
        this.children = [];
        this.splits = [];
        this.parent;
        this.open = true;
        this.width = 10;
        this.height = 10;
        this.position = { left: 0, top: 0 };

        this.noteContainer = document.createElement('div');
        this.noteContainer.classList.add('note-container');

        this.noteWindow = document.createElement('div');
        this.noteWindow.classList.add('note-window');

        this.noteInternalPositioner = document.createElement('div');
        this.noteInternalPositioner.classList.add('note-positioner');

        this.noteContents = document.createElement('div');
        this.noteContents.classList.add('note');
        this.noteContents.classList.add('note-content');
        this.noteContents.classList.add('ql-container');

        this.noteContainer.appendChild(this.noteWindow);
        this.noteWindow.appendChild(this.noteInternalPositioner);
        this.noteInternalPositioner.appendChild(this.noteContents);

        this.noteContainer.addEventListener('mouseenter', (ev) => {
            currentHoveredNote = this;
            this.noteContainer.appendChild(noteButtons);
            const windowRect = this.noteWindow.getBoundingClientRect();
            const windowPos = this.getPosition();

            if (editBtn)
                editBtn.style.display = "none";

            closeBtn.onclick = () => {
                this.close(true);
                console.log("close note");
            }
            restoreBtn.onclick = () => {
                this.restore();
                console.log("restore note")
            };

            noteButtons.style.visibility = "visible";
        });

        this.noteContainer.onmouseleave = (ev) => {
            noteButtons.style.visibility = "hidden";
        };

        this.noteContainer.onclick = () => {
            this.toFront();
        }

        document.querySelector("#notes").appendChild(this.noteContainer);
    }

    show() {
        this.open = true;
        document.querySelector("#notes").appendChild(this.noteContainer);
        this.noteWindow.style.width = "0px";
        // this.noteWindow.style.height = "0px";
        this.noteWindow.classList.add("grow");
        this.noteWindow.offsetHeight;
        this.noteWindow.style.width = this.width + "px";
        // this.noteWindow.style.height = this.height + "px";
    }

    close(recurse = false) {

    }

    setPosition(pos) {
        this.position.left = Math.max(20, pos.left - this.noteWindow.offsetLeft);
        this.position.top = Math.max(20, pos.top - this.noteWindow.offsetTop);
        this.noteContainer.style.left = this.position.left + "px";
        this.noteContainer.style.top = this.position.top + "px";
    }

    addOffset(offset) {
        let currentPos = this.getPosition();
        currentPos.left = Math.max(20, currentPos.left + offset.left);
        currentPos.top = Math.max(20, currentPos.top + offset.top);
        this.setPosition(currentPos);

        for (const child of this.children) {
            child.addOffset(offset);
        }
    }

    getPosition() {
        return {
            left: this.noteWindow.offsetLeft + this.position.left,
            top: this.noteWindow.offsetTop + this.position.top
        }
    }

    setSize(size, grow = true) {
        if (grow) {
            this.noteWindow.classList.add("grow");
            this.noteWindow.offsetHeight;
        } else {
            this.noteWindow.classList.remove("grow");
        }
        this.width = size.width;
        this.height = size.height;
        this.noteWindow.style.width = size.width + "px";
        this.noteWindow.style.height = size.height + "px";
    }

    getSize() {
        return {
            width: this.width,
            height: this.height
        }
    }

    collapse() {
        if (this.children) {
            for (const childNotes of this.children) {
                childNotes.collapse();
            }
        } else {
            this.close(false);
        }
        document.querySelector("#notes").appendChild(this.noteContainer);
    }

    restore() {
        // close all fragments and restore original note
    }

    getHTML() {
        return this.noteContents.innerHTML;
    }

    toFront() {
        state.lastZIndex++;
        this.noteContainer.style.zIndex = state.lastZIndex;
    }
}

class Note extends Fragment {
    constructor(noteId) {
        super(noteId);

        this.lastContent = "";
        this.lastHighlight;
        this.closable = true;
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
        this.noteEditor.enable(false);

        // this.show();
        state.addNote(this);

        this.noteContainer.addEventListener('mouseenter', (ev) => {
            if (editBtn && !this.locked) {
                editBtn.style.display = "block";
                editBtn.onclick = () => {
                    this.enterEditMode();
                }
            }

            if (removeBtn) {
                if (this.closable && !this.locked) {
                    removeBtn.style.display = "block";
                    removeBtn.onclick = () => {
                        this.delete();
                    }
                } else {
                    removeBtn.style.display = "none";
                }
            }

            restoreBtn.style.display = "none";
            closeBtn.onclick = () => this.close();

            if (this.closable) {
                closeBtn.style.display = "block";
            } else {
                closeBtn.style.display = "none";
            }

            if (!editBtn && !this.closable) {
                noteButtons.style.visibility = "hidden";
            }
        });

        if (!canEdit)
            return;

        this.noteEditor.on('selection-change', (range, oldRange, source) => {
            // console.log("selection-change");
            if (!range) {
                // this.save();
                // this.exitEditMode();
                return;
            }

            if (length == 0)
                return;

            this.lastHighlight = range;
        });

        this.noteEditor.focus();
    }

    setCloseable(closable) {
        this.closable = closable;
    }

    setContents(contents) {
        this.noteEditor.setContents(contents);
        this.lastContent = JSON.stringify(contents);
        updateHighlights(this);

        this.width = this.noteContents.offsetWidth;
        this.height = this.noteContents.offsetHeight;
    }

    enterEditMode() {
        if (this.locked)
            return;

        if (state.currentEditingNote)
            state.currentEditingNote.exitEditMode();

        this.editing = true;
        this.noteEditor.enable(true);
        this.noteEditor.focus();
        this.noteWindow.classList.add('note-editing');
        state.editMode = true;
        state.currentEditingNote = this;
    }

    exitEditMode(skip_save = false) {
        this.editing = false;
        this.noteWindow.classList.remove('note-editing');

        if (!skip_save)
            this.save();

        if (this.noteEditor)
            this.noteEditor.enable(false);
        if (state.currentEditingNote == this)
            state.editMode = false;
        state.currentEditingNote = undefined;
    }

    setLocked(lock) {
        // console.log(`note ${this.noteId} is ${lock ? "locked" : "unlocked"}`);

        this.locked = lock;

        if (lock && canEdit)
            this.noteContainer.classList.add('note-locked');
        else
            this.noteContainer.classList.remove('note-locked');
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

    save() {
        if (!canEdit || !editToken || this.locked) {
            console.log(`Cannot edit note (canEdit: ${canEdit}, editToken: ${editToken}, locked: ${this.locked})`);
            return;
        }
        console.log("save()");

        const noteContent = this.noteEditor.getContents();
        if (JSON.stringify(noteContent) === this.lastContent) {
            console.log("Text has not changed")
            return;
        }

        if (this.noteId) {
            // note already saved, update it
            fetch(`${baseURL}/room/${state.roomId}/note/${this.noteId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    editToken,
                    noteContent
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
                    noteContent
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

    close(recurse = false) {
        this.open = false;
        this.noteContainer.remove();
    }

    getHTML() {
        // need to add <br> to empty <p></p> tags...
        let html = this.noteEditor.getSemanticHTML();
        html = html.replaceAll('<p></p>', '<p><br></p>');
        return html;
    }

    reload() {

    }

    restore() {
        for (const child of this.children) {
            child.close(true);
        }
        this.toFront();
        this.show();
    }
}

class Split extends Fragment {
    constructor(noteId, note, html) {
        super(noteId);
        this.noteContents.classList.add('absolute');
        this.noteContents.classList.add('ql-editor');
        this.noteWindow.classList.add('slide');

        this.note = note;
        this.html = html;

        this.noteContents.innerHTML = html;
        updateHighlights(this);

        this.noteContainer.addEventListener('mouseenter', (ev) => {
            if (editBtn) {
                editBtn.style.display = "none";
            }

            restoreBtn.onclick = () => this.restore();

            restoreBtn.style.display = "block";
            closeBtn.style.display = "none";
        });

    }

    close(recurse = false) {
        if (recurse)
            for (const child of this.children)
                child.close(true);
        this.noteContainer.remove();
    }

    collapse() {
        // for (const childNotes of this.children) {
        //     childNotes.close(false);
        // }
        // document.querySelector("#notes").appendChild(this.noteContainer);
    }

    restore() {
        this.note.restore();
    }
}

export { Note, fetchNote }

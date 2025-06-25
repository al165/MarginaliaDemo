import { state } from './state.js';

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

const noteButtons = document.querySelector("#note-buttons");

const closeBtn = noteButtons.querySelector("#close-note");
const restoreBtn = noteButtons.querySelector("#restore-note");
const dragHandle = document.querySelector("#drag-note");

dragHandle.addEventListener('mousedown', (ev) => {
    ev.preventDefault();
    state.draggingFragment.noteContainer.classList.remove('slide');

    const notePos = state.draggingFragment.getPosition();
    let mouseOffset = {}; // relative to noteContainer
    console.log(ev);
    mouseOffset.left = ev.clientX - notePos.left + state.scrollX;
    mouseOffset.top = ev.clientY - notePos.top + state.scrollY;

    state.dragging = mouseOffset;
});

function split(fragment, vertical, newNote, hRect) {
    const lastScrollX = state.scrollX;
    const lastScrollY = state.scrollY;

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

    fragment.preSplit();

    const html = fragment.getHTML();
    const areaRect = fragment.noteWindow.getBoundingClientRect();
    const contentRect = fragment.noteContents.getBoundingClientRect();

    const fragmentLeft = new window.Split(fragment.noteId, fragment, html);
    const fragmentRight = new window.Split(fragment.noteId, fragment, html);

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

    // Calculate the position of the new Note
    newNotePos[mainAxisN] = posL[mainAxisN] + sizeL[mainDim];
    newNotePos[crossAxisN] = hRect[crossCartesian] + scrollCrossAxis;
    newNote.setPosition(newNotePos);


    // Adjust the inner content within the fragments
    fragmentLeft.noteContents.style["width"] = contentRect["width"] + "px";
    fragmentLeft.noteContents.style[mainAxisN] = contentRect[mainAxisN] - areaRect[mainAxisN] + "px";
    fragmentLeft.noteContents.style[mainAxisP] = null;
    fragmentLeft.noteContents.style[crossAxisN] = fragment.noteContents[crossOffset] + "px";

    fragmentRight.noteContents.style["width"] = contentRect["width"] + "px";
    fragmentRight.noteContents.style[mainAxisP] = areaRect[mainAxisP] - contentRect[mainAxisP] + "px";
    fragmentRight.noteContents.style[mainAxisN] = null;
    fragmentRight.noteContents.style[crossAxisN] = fragment.noteContents[crossOffset] + "px";

    fragment.children.push(fragmentLeft);
    fragment.children.push(fragmentRight);

    fragment.close(false);

    newNote.toFront();

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
            ev.preventDefault();
            // const vertical = Math.random() < 0.5;
            lastVertical = !lastVertical;

            const targetId = highlight.dataset.id;
            const hRect = highlight.getBoundingClientRect();

            if (typeof state.notes[targetId] === 'undefined') {
                window.fetchNote(targetId).then(newNote => {
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
        this.noteContainer.style.zIndex = state.lastZIndex;
        state.lastZIndex++;

        this.notePaddingTop = document.createElement('div');
        this.notePaddingTop.classList.add('note-padding-v');
        this.notePaddingTop.style.top = '-2em';
        this.notePaddingTop.style.height = '2em';
        this.notePaddingBottom = document.createElement('div');
        this.notePaddingBottom.classList.add('note-padding-v');
        this.notePaddingBottom.style.bottom = '-6em';
        this.notePaddingBottom.style.height = '6em';
        this.notePaddingRight = document.createElement('div');
        this.notePaddingRight.classList.add('note-padding-h');
        this.notePaddingRight.style.right = '-6em';
        this.notePaddingRight.style.width = '6em';
        this.noteContainer.appendChild(this.notePaddingTop);
        this.noteContainer.appendChild(this.notePaddingBottom);
        this.noteContainer.appendChild(this.notePaddingRight);

        this.noteWindow = document.createElement('div');
        this.noteWindow.classList.add('note-window');

        this.noteContents = document.createElement('div');
        this.noteContents.classList.add('note');
        this.noteContents.classList.add('note-content');
        this.noteContents.classList.add('ql-container');

        this.noteWindow.appendChild(this.noteContents);
        this.noteContainer.appendChild(this.noteWindow);

        this.noteContainer.addEventListener('mouseenter', () => this.onHover());

        this.noteContainer.onmouseleave = (ev) => {
            noteButtons.style.visibility = "hidden";
        };

        this.noteContainer.onclick = () => {
            this.toFront();
        }

        document.querySelector("#notes").appendChild(this.noteContainer);
    }

    onHover() {
        this.noteContainer.appendChild(noteButtons);
        noteButtons.style.zIndex = this.noteContainer.style.zIndex;

        noteButtons.dataset.noteid = this.noteId;

        if (!state.dragging)
            state.draggingFragment = this;

        closeBtn.onclick = () => {
            this.close(true);
        }

        restoreBtn.onclick = () => {
            this.restore();
        };

        noteButtons.style.visibility = "visible";
    }

    show() {
        this.open = true;
        document.querySelector("#notes").appendChild(this.noteContainer);
        this.noteWindow.style.width = "0px";
        this.noteWindow.classList.add("grow");
        this.noteWindow.offsetHeight;
        this.noteWindow.style.width = this.width + "px";
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

    setSize(size, grow = false) {
        if (grow) {
            this.noteContents.classList.add("grow");
            this.noteWindow.offsetHeight;
        } else {
            this.noteWindow.classList.remove("grow");
        }
        this.width = size.width;
        this.height = size.height;
        // this.noteContents.style.width = size.width + "px";
        // this.noteContents.style.height = size.height + "px";
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


    preSplit() {
        // called before note is split.
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

class NoteStatic extends Fragment {
    constructor(noteId, noteType = 0) {
        super(noteId);
        this.noteType = noteType;
        this.options = {};

        this.noteContents.classList.add('ql-editor');

        this.closable = true;
        this.width = this.noteWindow.clientWidth;

        state.addNote(this);
    }

    onHover() {
        super.onHover();

        restoreBtn.style.display = "none";
        closeBtn.onclick = () => this.close();
        closeBtn.style.display = this.closable ? "block" : "none";
    }

    setCloseable(closable) {
        this.closable = closable;
    }

    close(recurse = false) {
        this.open = false;
        this.noteContainer.remove();
    }

    restore() {
        for (const child of this.children) {
            child.close(true);
        }
        this.toFront();
        this.show();
    }

    setHTML(html) {
        this.noteContents.innerHTML = html.trim().replaceAll("\n", "");
        updateHighlights(this);
        this.addLoadCallbacks();

        this.width = this.noteContents.offsetWidth;
        this.height = this.noteContents.offsetHeight;
    }

    addLoadCallbacks() {
        const elements = this.noteContents.querySelectorAll('img,iframe');

        for (const element of elements) {
            element.addEventListener('load', () => {
                this.width = this.noteContents.offsetWidth;
                this.height = this.noteContents.offsetHeight;
            });
        }
    }

    getHTML() {
        return this.noteContents.innerHTML;
    }

    setOptions(options) {
        this.options = options;

        if (!options)
            return;

        if (options.width) {
            this.width = options.width;
            this.noteContents.style.width = this.width + "px";
        }
    }
}

class Split extends Fragment {
    constructor(noteId, note, html) {
        super(noteId);
        this.noteContents.classList.add('ql-editor');
        this.noteContents.classList.add('absolute');

        this.note = note;
        this.html = html;

        this.noteContents.innerHTML = html;
        this.noteContents.style.width = note.noteContents.offsetWidth + "px";
        this.noteContents.style.height = note.noteContents.offsetHeight + "px";
        updateHighlights(this);
    }

    onHover() {
        super.onHover();

        restoreBtn.onclick = () => this.restore();
        restoreBtn.style.display = "block";
        closeBtn.style.display = "none";
    }

    close(recurse = false) {
        if (recurse)
            for (const child of this.children)
                child.close(true);
        this.noteContainer.remove();
    }

    collapse() {
    }

    restore() {
        this.note.restore();
    }
}

window.Note = NoteStatic;
window.Split = Split;

export { NoteStatic, Split, calculateBoundingBox, updateHighlights };
class MarginaliaRoomState {
    #currentEditingNote = undefined;
    #lastEditingNote = undefined;
    #currentSelection = undefined;
    #roomId = undefined;
    notes = {};
    lastZIndex = 0;
    scrollX = 0;
    scrollY = 0;
    #language = 'en';
    resizing = undefined;
    resizeStartPosition = undefined;
    resizeStartWidth = undefined;
    dragging = undefined;
    draggingFragment = undefined;
    highlightColour = '#FF00FF';
    callbacks = [];

    socket = undefined;

    constructor() {

    }

    addCallback(event, fn) {
        this.callbacks.push({
            event, fn
        });
    }

    enteredEditMode(note) {
        if (this.#currentEditingNote !== note)
            this.currentEditingNote = note;
    }

    exitedEditMode(note) {
        if (this.#currentEditingNote === note)
            this.currentEditingNote = undefined;
    }

    set currentEditingNote(note) {
        if (this.#currentEditingNote)
            this.#lastEditingNote = this.#currentEditingNote;

        this.#currentEditingNote = note;
        for (const callback of this.callbacks) {
            if (callback.event === 'currentEditingNote')
                callback.fn(note);
        }
    }

    get currentEditingNote() {
        return this.#currentEditingNote;
    }

    set currentSelection(selection) {
        this.#currentSelection = selection;
        for (const callback of this.callbacks) {
            if (callback.event === 'selectionChange')
                callback.fn(selection);
        }
    }

    get currentSelection() {
        return this.#currentSelection;
    }

    get lastEditingNote() {
        return this.#lastEditingNote;
    }

    set roomId(val) {
        this.#roomId = val;
        for (const callback of this.callbacks) {
            if (callback.event === 'roomId')
                callback.fn(val);
        }
    }

    get roomId() {
        return this.#roomId;
    }

    set language(val) {
        this.#language = val;
        for (const callback of this.callbacks) {
            if (callback.event === 'language')
                callback.fn(val);
        }
    }

    get language() {
        return this.#language;
    }

    addNote(note) {
        console.log("state.addNote " + note.noteId);
        this.notes[note.noteId] = note;
        for (const callback of this.callbacks) {
            if (callback.event === 'addNote')
                callback.fn(val);
        }
    }

    deleteNote(note) {
        delete this.notes[note.noteId];
        for (const callback of this.callbacks) {
            if (callback.event === 'deleteNote')
                callback.fn(note);
        }
    }

    getAllNotes() {
        return Object.values(this.notes);
    }

}


export const state = new MarginaliaRoomState();
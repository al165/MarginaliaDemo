class MarginaliaRoomState {
    #currentEditingNote = undefined;
    #lastEditingNote = undefined;
    #roomId = undefined;
    notes = {};
    lockedNotes = new Set();
    lastZIndex = 0;
    scrollX = 0;
    scrollY = 0;
    #language = 'en';
    resizing = undefined;
    resizeStartPosition = undefined;
    resizeStartWidth = undefined;
    dragging = undefined;
    draggingFragment = undefined;
    callbacks = [];

    socket = undefined;

    constructor() {

    }

    addCallback(event, fn) {
        this.callbacks.push({
            event, fn
        });
    }

    set currentEditingNote(val) {
        this.#lastEditingNote = this.#currentEditingNote;
        if (this.socket) {
            if (val) {
                this.socket.emit('editingNote', { roomId: this.roomId, noteId: val.noteId, lock: val != undefined });
            } else if (this.#currentEditingNote) {
                this.socket.emit('editingNote', { roomId: this.roomId, noteId: this.#currentEditingNote.noteId, lock: val != undefined });
            }
        }

        this.#currentEditingNote = val;
        for (const callback of this.callbacks) {
            if (callback.event === 'currentEditingNote')
                callback.fn(val);
        }
    }

    get currentEditingNote() {
        return this.#currentEditingNote;
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
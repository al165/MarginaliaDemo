import { THEME_LIST, setTheme } from './data/colourschemes.js'
import { state } from './state.js';
import { getTargetedNote } from './utils.js';

window.state = state;

let targetPath = [];

window.fetchPath = function (noteId) {
    fetch(`${baseURL}/room/${window.state.roomId}/path/${noteId}`)
        .then(res => res.json())
        .then(path => {
            targetPath = path;

            window.state.addCallback('addNote', (note) => {
                console.log("addNote callback");
                const inPath = targetPath.findIndex(el => el === note.noteId);
                if (inPath >= 0 && inPath < targetPath.length - 1) {
                    const nextNoteId = targetPath[inPath + 1];
                    note.openNote(nextNoteId);
                }
            });

            if (targetPath.length > 1) {
                const rootNote = state.notes[path[0]];
                if (rootNote.loaded)
                    rootNote.openNote(path[1]);
                else
                    rootNote.contentLoadedCallbacks.push((note) => {
                        console.log(`${note.id} loaded, opening next annotation`);
                        note.openNote(path[1]);
                    });
            }
        });
}



window.addEventListener('load', async () => {
    window.state.roomId = roomId;

    await import('./noteReadOnly.js');

    if (canEdit) {
        await import('./noteEdit.js');
    }

    window.fetchNote(rootNote).then((newNote) => {
        if (!newNote) {
            console.log("Could not fetch root note " + rootNote);
            return;
        }
        newNote.setCloseable(false);
        const size = newNote.getSize();
        const x = window.innerWidth / 2 - size.width / 2;
        const y = window.innerHeight / 5;
        newNote.setPosition({ left: x, top: y });

        newNote.show();

        getTargetedNote();
    });

    for (const colourTheme of THEME_LIST) {
        if (colourTheme.name !== theme)
            continue;
        setTheme(colourTheme);
    }
});

document.addEventListener("scroll", () => {
    window.state.scrollY = window.scrollY;
    window.state.scrollX = window.scrollX;
});

document.addEventListener("mouseup", (ev) => {
    if (window.state.resizing && window.state.notes[window.state.resizing]) {
        const note = window.state.notes[window.state.resizing];
        note.noteWindow.classList.add("grow");
        window.state.resizing = undefined;

        if (!note.ymap)
            return;

        note.ymap.set('width', note.width);
    } else if (window.state.dragging) {
        window.state.dragging = undefined;
    }
});

document.addEventListener("mousemove", (ev) => {
    if (window.state.resizing) {
        let newWidth = window.state.resizeStartWidth + (ev.clientX - window.state.resizeStartPosition);
        newWidth = Math.min(800, Math.max(350, newWidth));
        const noteId = window.state.resizing;
        if (!window.state.notes[noteId])
            return;
        window.state.notes[noteId].setWidth(newWidth);
    } else if (window.state.dragging && window.state.draggingFragment) {
        window.state.draggingFragment.setPosition({
            left: ev.clientX + window.state.scrollX - window.state.dragging.left,
            top: ev.clientY + window.state.scrollY - window.state.dragging.top
        });
    }
});

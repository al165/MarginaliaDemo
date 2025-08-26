import { THEME_LIST, setTheme, HIGHLIGHT_COLOURS } from './data/colourschemes.js';
import { expandSelection } from './utils.js';
import { TOOLTIPS } from './data/tooltips.js';

let availableNoteTools = [];

document.addEventListener('DOMContentLoaded', () => {

    function toggleFormat(btn, value) {
        btn.addEventListener('click', function () {
            if (!window.state.currentEditingNote || !window.state.currentEditingNote.noteEditor)
                return;

            const format = window.state.currentEditingNote.noteEditor.getFormat();
            window.state.currentEditingNote.noteEditor.format(value, format[value] ? false : true, 'user');
        });
    }

    function cycleFormat(btn, format, values) {
        btn.addEventListener('click', function () {
            if (!window.state.currentEditingNote || !window.state.currentEditingNote.noteEditor)
                return;

            const currentFormat = window.state.currentEditingNote.noteEditor.getFormat();
            if (!currentFormat || !currentFormat[format]) {
                window.state.currentEditingNote.noteEditor.format(format, values[0], 'user');
            } else {
                let nextIndex = values.indexOf(currentFormat[format]) + 1;
                nextIndex = nextIndex % values.length;
                window.state.currentEditingNote.noteEditor.format(format, values[nextIndex], 'user');
            }
        });
    }

    const boldBtn = document.querySelector("#bold");
    toggleFormat(boldBtn, 'bold');
    availableNoteTools.push(boldBtn);

    const italicBtn = document.querySelector("#italic");
    toggleFormat(italicBtn, 'italic');
    availableNoteTools.push(italicBtn);

    const underlineBtn = document.querySelector("#underline");
    toggleFormat(underlineBtn, 'underline');
    availableNoteTools.push(underlineBtn);

    const strikethroughBtn = document.querySelector("#strikethrough");
    toggleFormat(strikethroughBtn, 'strike');
    availableNoteTools.push(strikethroughBtn);

    const blockquoteBtn = document.querySelector("#citation");
    toggleFormat(blockquoteBtn, 'blockquote');
    availableNoteTools.push(blockquoteBtn);

    const headingsBtn = document.querySelector("#heading");
    cycleFormat(headingsBtn, 'header', [1, 2, 3, null]);
    availableNoteTools.push(headingsBtn);

    const writingDirectionBtn = document.querySelector("#writingdirection");
    cycleFormat(writingDirectionBtn, 'direction', ['rtl', null]);
    availableNoteTools.push(writingDirectionBtn);

    const justificationBtn = document.querySelector("#justification");
    cycleFormat(justificationBtn, 'align', ['center', 'right', null]);
    availableNoteTools.push(justificationBtn);

    const numberedListBtn = document.querySelector("#bulletnumbers");
    cycleFormat(numberedListBtn, 'list', ['ordered', null]);
    availableNoteTools.push(numberedListBtn);

    const bulletListBtn = document.querySelector("#bulletpoints");
    cycleFormat(bulletListBtn, 'list', ['bullet', null]);
    availableNoteTools.push(bulletListBtn);

    const fontsBtn = document.querySelector("#font");
    cycleFormat(fontsBtn, 'font', ['serif', 'monospace', null]);
    availableNoteTools.push(fontsBtn);

    const videoEmbedBtn = document.querySelector("#video");
    availableNoteTools.push(videoEmbedBtn);

    const imageAddBtn = document.querySelector("#image-add");
    availableNoteTools.push(imageAddBtn);

    // Themes
    function updateTheme(colourTheme) {
        setTheme(colourTheme);

        if (colourTheme.name === theme)
            return;

        fetch(`${baseURL}/room/${window.state.roomId}`, {
            method: 'PUT',
            body: JSON.stringify({
                name: roomName,
                theme: colourTheme['name'],
                editToken: editToken
            }),
            headers: {
                "Content-type": "application/json"
            }
        }).then(res => {
            if (res.status != 200)
                console.warn(`Error setting theme: ${res.statusText}`);
        }).catch(error => {
            console.error("Error editing room: " + error);
        });
    }

    let currentThemeIndex = 0;
    const themesBtn = document.querySelector("#themes");
    themesBtn.addEventListener('click', function (ev) {
        currentThemeIndex = (currentThemeIndex + 1) % THEME_LIST.length;
        updateTheme(THEME_LIST[currentThemeIndex]);
    });

    // Tooltips
    const tools = document.querySelectorAll(".tool");
    const tooltip = document.querySelector("#tooltip");
    const toolglow = document.querySelector("#tool-glow");

    for (const tool of tools) {
        // prevent drag ghost image
        tool.setAttribute('draggable', false);

        // add glow on hover
        tool.addEventListener('mouseenter', () => {
            if (tool.id === 'highlight')
                return;
            const toolbounds = tool.getBoundingClientRect();
            toolglow.style.visibility = 'visible';

            toolglow.style.left = toolbounds.left + toolbounds.width / 2 - toolglow.clientWidth / 2 + 'px';
            toolglow.style.top = toolbounds.top + toolbounds.height / 2 - toolglow.clientHeight / 2 + 'px';

            tool.parentNode.appendChild(toolglow);
        });

        tool.addEventListener('mouseleave', () => {
            toolglow.style.visibility = 'hidden';
        });

        // add tooltip
        const toolId = tool.id;
        if (!toolId || !TOOLTIPS["en"][toolId])
            continue;

        let toolTipText = TOOLTIPS["en"][toolId];
        if (tool.classList.contains('coming-soon')) {
            toolTipText = "<b>Coming soon!</b><br>" + toolTipText;
        }

        tool.addEventListener('mousemove', ev => {
            tooltip.innerHTML = toolTipText;
            tooltip.style.visibility = 'visible';

            const toolTipMaxX = document.getElementById("room-toolbar").getBoundingClientRect().left;
            const toolTipMaxY = document.getElementById("text-toolbar").getBoundingClientRect().top;

            tooltip.style.left = Math.min(ev.clientX, toolTipMaxX - tooltip.getBoundingClientRect().width) + "px";
            tooltip.style.top = Math.min(ev.clientY, toolTipMaxY - tooltip.getBoundingClientRect().height) + "px";

        });

        tool.addEventListener('mouseleave', ev => {
            tooltip.style.visibility = 'hidden';
        });
    }

    window.state.addCallback('currentEditingNote', note => {
        availableNoteTools.forEach(btn => btn.disabled = note === undefined);
    });

    availableNoteTools.forEach(btn => btn.disabled = true);

    // Color management
    window.state.highlightColour = HIGHLIGHT_COLOURS[0];

    const highlighterColour = document.querySelector("#highlight-colour");
    highlighterColour.style.backgroundColor = window.state.highlightColour;

    const highlighterPallette = document.querySelector("#highlight-colour-pallette");

    for (const hiColour of HIGHLIGHT_COLOURS) {
        const colourChoice = document.createElement('div');
        colourChoice.classList.add('colour-choice');
        colourChoice.style.backgroundColor = hiColour;
        colourChoice.dataset.colour = hiColour;

        highlighterPallette.appendChild(colourChoice);

        colourChoice.addEventListener('mousedown', (ev) => {
            ev.preventDefault();
            window.state.highlightColour = hiColour;
            highlighterColour.style.backgroundColor = hiColour;
            highlighterPallette.style.maxWidth = '0em';

            if (window.state.currentEditingNote && window.state.currentSelection && window.state.currentSelection.length > 1) {
                const range = window.state.currentSelection;
                const note = window.state.currentEditingNote;
                const selectedFormat = note.noteEditor.getFormat(range);

                if (selectedFormat['annotate']) {
                    selectedFormat['annotate']['color'] = hiColour;
                    note.noteEditor.formatText(range.index, range.length, 'annotate', selectedFormat['annotate']);
                }
            }
        });
    }

    highlighterColour.addEventListener('mousedown', (ev) => {
        ev.preventDefault();
        for (const colourChoice of highlighterPallette.querySelectorAll('.colour-choice')) {
            if (colourChoice.dataset.colour === window.state.highlightColour)
                colourChoice.classList.add('selected');
            else
                colourChoice.classList.remove('selected');
        }
        highlighterPallette.style.maxWidth = '10em';
    });

    // Selection callback
    const urlToolbar = document.querySelector("#url-toolbar");
    const linkEditBtn = document.querySelector("#links");
    const linkDeleteBtn = document.querySelector("#remove-link-btn");
    const hightlightToolbar = document.querySelector("#highlight-toolbar");

    function updateFormatsToolbar(range) {
        const note = window.state.currentEditingNote;
        const headingsBtnIcon = headingsBtn.querySelector("img");
        const justificationBtnIcon = justificationBtn.querySelector("img");
        const writingDirectionBtnIcon = writingDirectionBtn.querySelector("img");

        if (!note || !range) {
            // reset format buttons to default
            headingsBtnIcon.src = `${baseURL}/icons/20_heading.svg`;
            justificationBtnIcon.src = `${baseURL}/icons/18_justification_left.svg`;
            writingDirectionBtnIcon.src = `${baseURL}/icons/19_writingdirection_leftright.svg`;

            linkEditBtn.disabled = true;
        } else {
            const currentFormat = note.noteEditor.getFormat(range);

            // Headings
            switch (currentFormat.header) {
                case 2:
                    headingsBtnIcon.src = `${baseURL}/icons/20_heading_2.svg`;
                    break;
                case 3:
                    headingsBtnIcon.src = `${baseURL}/icons/20_heading_3.svg`;
                    break;
                default:
                    headingsBtnIcon.src = `${baseURL}/icons/20_heading.svg`;
                    break;
            }

            // Justification
            switch (currentFormat.align) {
                case "center":
                    justificationBtnIcon.src = `${baseURL}/icons/18_justification_centre.svg`;
                    break;
                case "right":
                    justificationBtnIcon.src = `${baseURL}/icons/18_justification_right.svg`;
                    break;
                default:
                    justificationBtnIcon.src = `${baseURL}/icons/18_justification_left.svg`;
                    break;
            }

            // Writing direction
            if (currentFormat.direction === 'rtl')
                writingDirectionBtnIcon.src = `${baseURL}/icons/19_writingdirection_rightleft.svg`;
            else
                writingDirectionBtnIcon.src = `${baseURL}/icons/19_writingdirection_leftright.svg`;

            linkEditBtn.disabled = range.length == 0;
        }
    }

    window.state.addCallback('selectionChange', range => {
        const note = window.state.currentEditingNote;

        if (!note || !range) {
            // Hide highlight and url toolbars
            hightlightToolbar.style.visibility = 'hidden';
            highlighterPallette.style.maxWidth = '0em';
            urlToolbar.style.visibility = 'hidden';

            updateFormatsToolbar(range);
        } else {
            const currentFormat = note.noteEditor.getFormat(range);
            updateFormatsToolbar(range);

            // Show highlight toolbar
            if (range.length > 0) {
                let startSelection = {
                    index: range.index,
                    length: 1
                };
                const highlightBounds = note.noteEditor.getBounds(startSelection);
                const highlightFormat = note.noteEditor.getFormat(range);

                if (highlightFormat['annotate']) {
                    highlighterColour.style.backgroundColor = highlightFormat['annotate']['color'];
                    window.state.highlightColour = highlightFormat['annotate']['color'];
                }

                hightlightToolbar.style.left = highlightBounds.left + note.getPosition().left + 'px';
                hightlightToolbar.style.top = highlightBounds.top + note.getPosition().top - hightlightToolbar.clientHeight + 'px';

                hightlightToolbar.style.visibility = 'visible';
            } else {
                hightlightToolbar.style.visibility = 'hidden';
                highlighterPallette.style.maxWidth = '0em';
            }

            // Show URL bar
            if (currentFormat.link) {
                const linkRange = expandSelection(note.noteEditor, range, true);
                const linkBounds = note.noteEditor.getBounds(linkRange);
                urlToolbar.style.left = linkBounds.left + note.getPosition().left + 'px';
                urlToolbar.style.top = linkBounds.top + linkBounds.height + note.getPosition().top + 'px';

                const linkElement = urlToolbar.querySelector("a");
                linkElement.href = currentFormat.link;
                linkElement.innerText = currentFormat.link;

                linkDeleteBtn.onclick = () => {
                    note.noteEditor.formatText(linkRange.index, linkRange.length, 'link', false, 'user');
                    this.save();
                };

                urlToolbar.style.visibility = 'visible';
            } else {
                urlToolbar.style.visibility = 'hidden';
            }
        }
    });
});
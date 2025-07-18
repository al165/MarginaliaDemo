/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./public/js/data/colourschemes.js":
/*!*****************************************!*\
  !*** ./public/js/data/colourschemes.js ***!
  \*****************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   DARK_THEME: () => (/* binding */ DARK_THEME),
/* harmony export */   HIGHLIGHT_COLOURS: () => (/* binding */ HIGHLIGHT_COLOURS),
/* harmony export */   LIGHT_THEME: () => (/* binding */ LIGHT_THEME),
/* harmony export */   PURPLE_THEME: () => (/* binding */ PURPLE_THEME),
/* harmony export */   SUMMER_THEME: () => (/* binding */ SUMMER_THEME),
/* harmony export */   THEME_LIST: () => (/* binding */ THEME_LIST),
/* harmony export */   setTheme: () => (/* binding */ setTheme)
/* harmony export */ });
const LIGHT_THEME = {
    name: "light",
    icons: "light",
    backgroundColor: "#FFFFFF",
    noteBgColor: "#E8E8E8",
    menuBgColor: "#E8E8E8",
    textMenuBgColor: "#CCCCCC",
    glowColor: "#C2C1FF",
    textColor: "#000000",
    linkColor: "#0000FF",
    iconFilter: "",
};

const DARK_THEME = {
    name: "dark",
    icons: "magenta",
    backgroundColor: "#494949",
    noteBgColor: "#000000",
    menuBgColor: "#000000",
    textMenuBgColor: "#595959",
    glowColor: "#ff00ff",
    textColor: "#ffffff",
    linkColor: "#ff00ff",
    iconFilter: "invert(100%)",
};

const SUMMER_THEME = {
    name: "summer",
    icons: "yellow",
    backgroundColor: "#ec8e6f",
    noteBgColor: "#ffd200",
    menuBgColor: "#ffd200",
    textMenuBgColor: "#EEC400",
    glowColor: "#de3800",
    textColor: "#000000",
    linkColor: "#de3800",
    iconFilter: "",
};

const PURPLE_THEME = {
    name: "purple",
    icons: "magenta",
    backgroundColor: "#cabcfa",
    noteBgColor: "#cabcfa",
    menuBgColor: "#210000",
    textMenuBgColor: "#595959",
    glowColor: "#b26bfe",
    textColor: "#000000",
    linkColor: "#b26bfe",
    iconFilter: "invert(100%)",
};

const THEME_LIST = [
    LIGHT_THEME,
    DARK_THEME,
    SUMMER_THEME,
    PURPLE_THEME,
];

const HIGHLIGHT_COLOURS = [
    "#ff5cff", "#ffd2af", "#A6BDFF", "#3CFFB6", "#FFFF78"
];

function setTheme(colourTheme) {
    console.log(colourTheme['name']);

    document.documentElement.style.setProperty('--background-color', colourTheme.backgroundColor);
    document.documentElement.style.setProperty('--note-bg-color', colourTheme.noteBgColor);
    document.documentElement.style.setProperty('--menu-bg-color', colourTheme.menuBgColor);
    document.documentElement.style.setProperty('--text-menu-bg-color', colourTheme.textMenuBgColor);
    document.documentElement.style.setProperty('--glow-color', colourTheme.glowColor);
    document.documentElement.style.setProperty('--text-color', colourTheme.textColor);
    document.documentElement.style.setProperty('--link-color', colourTheme.linkColor);

    for (const toolIcon of document.querySelectorAll(".tool")) {
        toolIcon.style.filter = colourTheme.iconFilter;
    }
    for (const logo of document.querySelectorAll(".logo-text")) {
        logo.style.filter = colourTheme.iconFilter;
    }
}


/***/ }),

/***/ "./public/js/data/tooltips.js":
/*!************************************!*\
  !*** ./public/js/data/tooltips.js ***!
  \************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   TOOLTIPS: () => (/* binding */ TOOLTIPS)
/* harmony export */ });
const TOOLTIPS = {
    "en": {
        "new-note": "Creates a new marginalia and highlights your text with a bright colour",
        "pencil": "Free draw lines and shapes",
        "themes": "Set the colour theme",
        "viewmode": "Switch to view mode",
        "trash": "Deletes the marginalia",
        "undo": "Unbreaks a marginalia into it's original state",
        "info": "Displays information about the room",
        "page": "Add a loose note",
        "publish": "Publish your room as HTML, or share a link to here.",
        "font-size": "Adjusts your text size",
        "bold": "Makes text bold",
        "italic": "Makes text italic",
        "underline": "Underlines text with a straight line",
        "strikethrough": "Crosses out your text by drawing a line through it",
        "heading": "Applies headers of different size to your text",
        "writingdirection": "Adjusts your writing direction to from right to left, or left to right",
        "justification": "Justify the text",
        "bulletnumbers": "Makes a numbered list",
        "bulletpoints": "Makes a bulleted list",
        "citation": "Add a quote",
        "font": "Changes font",
        "audio": "Embed audio from an online link",
        "video": "Embed a video from an online link",
        "image-add": "Upload or embed an image",
        "links": "Links text to URLs"
    }
}

/***/ }),

/***/ "./public/js/utils.js":
/*!****************************!*\
  !*** ./public/js/utils.js ***!
  \****************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   compareObjects: () => (/* binding */ compareObjects),
/* harmony export */   expandSelection: () => (/* binding */ expandSelection)
/* harmony export */ });
function compareValues(val1, val2) {
    switch (typeof val1) {
        case 'number':
        case 'boolean':
        case 'string':
            return val1 === val2;
        case 'function':
            return val1.call(val1) === val2.call(val2)
        case 'object':
            // Every Array is an Object, so we first have to confirm if the Object is an array before proceeding
            if (Array.isArray(val1) && Array.isArray(val2)) {
                if (val1.length !== val2.length)
                    return false;

                for (let j in val1) {
                    //loop through the array and handle each data type in the array recursively
                    if (!valueHandler(val1[j], val2[j]))
                        return false;
                }
                return true;
            }
            //Check if both Objects are instances of a Regular Expresion
            if (val1 instanceof RegExp || val2 instanceof RegExp) {
                return String(val1) === String(val2);
            }
            //Check if both Objects are instances of a Date Object
            if (val1 instanceof Date || val2 instanceof Date) {
                return val1.valueOf() === val2.valueOf();
            }
            //Check if both functions are instanes of a Set Object
            if (val1 instanceof Set || val2 instanceof Set) {
                if (val1.size !== val2.size)
                    return false;
                for (let a of val1) {
                    if (!val2.has(a))
                        return false;
                }
                return true;
            }
            //If it's a regular object, call the parent function (compareObjects) recursively
            return compareObjects(val1, val2);
        default:
            return false;

    }
}

function compareObjects(fmt1, fmt2) {
    const keys1 = Object.keys(fmt1).sort();
    const keys2 = Object.keys(fmt2).sort();

    if (keys1.length != keys2.length)
        return false;

    for (let i in keys1) {
        if (keys1[i] !== keys2[i])
            return false;

        const value1 = fmt1[keys1[i]];
        const value2 = fmt2[keys1[i]];

        if (!compareValues(value1, value2))
            return false;
    }

    return true;
}

function expandSelection(editor, range) {
    // Expand a range to select the current format

    const format = editor.getFormat(range);

    let index = range.index;
    let length = range.length;

    const totalLength = editor.getLength();

    // Expand left...
    while (index > 0) {
        let newFormat = editor.getFormat(index, length);

        if (!compareObjects(format, newFormat)) {
            index += 1;
            length -= 1;
            break;
        }


        index -= 1;
        length += 1;
    }

    // Expand right...
    while (index + length < totalLength) {
        let newFormat = editor.getFormat(index, length);

        if (!compareObjects(format, newFormat)) {
            break;
        }

        length += 1;
    }

    return { index, length }
}

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!**********************************!*\
  !*** ./public/js/editButtons.js ***!
  \**********************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _data_colourschemes_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./data/colourschemes.js */ "./public/js/data/colourschemes.js");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./utils.js */ "./public/js/utils.js");
/* harmony import */ var _data_tooltips_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./data/tooltips.js */ "./public/js/data/tooltips.js");




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
                console.log("Setting format " + format + " to " + values[0]);
            } else {
                let nextIndex = values.indexOf(currentFormat[format]) + 1;
                nextIndex = nextIndex % values.length;
                window.state.currentEditingNote.noteEditor.format(format, values[nextIndex], 'user');
                console.log("Setting format " + format + " to " + values[nextIndex]);
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
        (0,_data_colourschemes_js__WEBPACK_IMPORTED_MODULE_0__.setTheme)(colourTheme);

        if (colourTheme.name === theme)
            return;

        console.log("updating theme...");
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
                return res.json();
            else
                return {}
        }).then(json => {
            if (json.msg)
                console.log(json.msg);
        }).catch(error => {
            console.log("Error editing room: " + error);
        });
    }

    let currentThemeIndex = 0;
    const themesBtn = document.querySelector("#themes");
    themesBtn.addEventListener('click', function (ev) {
        currentThemeIndex = (currentThemeIndex + 1) % _data_colourschemes_js__WEBPACK_IMPORTED_MODULE_0__.THEME_LIST.length;
        updateTheme(_data_colourschemes_js__WEBPACK_IMPORTED_MODULE_0__.THEME_LIST[currentThemeIndex]);
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
        if (!toolId || !_data_tooltips_js__WEBPACK_IMPORTED_MODULE_2__.TOOLTIPS["en"][toolId])
            continue;

        let toolTipText = _data_tooltips_js__WEBPACK_IMPORTED_MODULE_2__.TOOLTIPS["en"][toolId];
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
    window.state.highlightColour = _data_colourschemes_js__WEBPACK_IMPORTED_MODULE_0__.HIGHLIGHT_COLOURS[0];

    const highlighterColour = document.querySelector("#highlight-colour");
    highlighterColour.style.backgroundColor = window.state.highlightColour;

    const highlighterPallette = document.querySelector("#highlight-colour-pallette");

    for (const hiColour of _data_colourschemes_js__WEBPACK_IMPORTED_MODULE_0__.HIGHLIGHT_COLOURS) {
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
        console.log('editButtons selectionChange');
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

                hightlightToolbar.style.left = highlightBounds.left + note.getPosition().left + 'px';
                hightlightToolbar.style.top = highlightBounds.top + note.getPosition().top - hightlightToolbar.clientHeight + 'px';

                hightlightToolbar.style.visibility = 'visible';
            } else {
                hightlightToolbar.style.visibility = 'hidden';
                highlighterPallette.style.maxWidth = '0em';
            }

            // Show URL bar
            if (currentFormat.link) {
                const linkRange = (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.expandSelection)(note.noteEditor, range);
                const linkBounds = note.noteEditor.getBounds(linkRange);
                urlToolbar.style.left = linkBounds.left + note.getPosition().left + 'px';
                urlToolbar.style.top = linkBounds.top + linkBounds.height + note.getPosition().top + 'px';

                const linkElement = urlToolbar.querySelector("a");
                linkElement.href = currentFormat.link;
                linkElement.innerText = currentFormat.link;

                linkDeleteBtn.onclick = () => {
                    undefined.noteEditor.formatText(linkRange.index, linkRange.length, 'link', false, 'user');
                    undefined.save();
                    undefined.noteEditor.setSelection(linkRange);
                };

                urlToolbar.style.visibility = 'visible';
            } else {
                urlToolbar.style.visibility = 'hidden';
            }
        }
    });
});
})();

/******/ })()
;
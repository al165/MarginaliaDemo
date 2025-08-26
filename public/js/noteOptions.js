class NoteOptions {
    constructor(hide_extras = false) {
        this.options = {};
        this.avaliableExtras = [];
        this.expanded = false;
        this.noteId = undefined;

        this.container = document.querySelector("#note-buttons");
        if (!this.container) {
            console.log("NoteOptions container not found");
            return;
        }

        this.moreOptions = this.container.querySelector("#more-options");
        if (!this.moreOptions) {
            this.hide_extras = false;
        } else {
            this.moreOptions.addEventListener('click', () => {
                this.expanded = !this.expanded;

                if (this.expanded)
                    this.expand();
                else
                    this.contract();
            });
        }
        this.setExpandable(hide_extras);
    }

    addOption(name, element, extra = false) {
        this.options[name] = { element, extra };

        if (extra) {
            this.container.appendChild(element);
            if (!this.expanded)
                element.style.display = 'none';
        }
        else
            this.container.insertBefore(element, this.moreOptions);

    }

    addEventListener(name, event, fn) {
        if (!this.options[name])
            return;
        this.options[name].element.addEventListener(event, fn);
    }

    getElement(name) {
        return this.options[name];
    }

    show(element, noteId) {
        this.noteId = noteId;
        element.appendChild(this.container);
        this.container.style.zIndex = element.style.zIndex;
        this.container.style.visibility = "visible";
    }

    hide() {
        this.noteId = undefined;
        this.container.style.visibility = "hidden";
    }

    onlyShow(options) {
        let showExtraButton = false;
        this.avaliableExtras = [];
        for (const [name, button] of Object.entries(this.options)) {
            if (options.has(name)) {
                if (button.extra && this.hide_extras)
                    showExtraButton = true;

                if (!button.extra || this.expanded || !this.hide_extras)
                    button.element.style.display = 'block';

                this.avaliableExtras.push(name);
            }
            else
                button.element.style.display = 'none';
        }

        if (!this.moreOptions)
            return;

        if (showExtraButton)
            this.moreOptions.style.display = 'block';
        else
            this.moreOptions.style.display = 'none';
    }

    setExpandable(expandable) {
        this.hide_extras = expandable;

        if (!this.moreOptions)
            return;

        if (!this.hide_extras)
            this.moreOptions.style.display = 'none';
        else
            this.moreOptions.style.display = 'block';
    }

    expand() {
        if (!this.moreOptions || !this.hide_extras)
            return;

        this.moreOptions.title = 'Hide extra options';
        this.moreOptions.style.transform = 'scaleY(-1)';
        for (const [name, button] of Object.entries(this.options)) {
            if (button.extra && this.avaliableExtras.includes(name))
                button.element.style.display = 'block';
        }
    }

    contract() {
        if (!this.moreOptions || !this.hide_extras)
            return;

        this.moreOptions.title = 'More...';
        this.moreOptions.style.transform = '';
        for (const button of Object.values(this.options)) {
            if (button.extra)
                button.element.style.display = 'none';
        }
    }
}

export { NoteOptions }

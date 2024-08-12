const Inline = Quill.import('blots/inline');

class BoldBlot extends Inline {
    static blotName = 'bold';
    static tagName = 'strong';
}

Quill.register(BoldBlot);
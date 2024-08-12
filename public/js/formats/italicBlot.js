const Inline = Quill.import('blots/inline');

class ItalicBlot extends Inline {
    static blotName = 'italic';
    static tagName = ['I', 'EM'];
}

Quill.register(ItalicBlot);
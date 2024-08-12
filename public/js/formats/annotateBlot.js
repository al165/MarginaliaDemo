const Inline = Quill.import('blots/inline');

class AnnotateBlot extends Inline {
    static blotName = 'annotate';
    static tagName = 'mark';
    static className = 'mg-note';

    static create(data) {
        let node = super.create();
        node.setAttribute('data-id', data.id);
        node.setAttribute('data-color', data.color);
        return node;
    }

    // static value(el) {
    //     return el.getAttribute('data-id');
    // }

    static formats(node) {
        return {
            id: node.getAttribute('data-id'),
            color: node.getAttribute('data-color')
        };
    }
}

Quill.register(AnnotateBlot);
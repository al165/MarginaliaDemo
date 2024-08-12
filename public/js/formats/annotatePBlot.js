// const Block = Quill.import('blots/block');

// class AnnotatePBlot extends Block {
//     static blotName = 'annotateP';
//     static tagName = 'p';
//     static className = 'noteP';

//     static create(data) {
//         let node = super.create();
//         node.setAttribute('data-id', data.id);
//         node.setAttribute('data-color', data.color);
//         return node;
//     }

//     static formats(node) {
//         return {
//             id: node.getAttribute('data-id'),
//             color: node.getAttribute('data-color')
//         };
//     }
// }
const Parchment = Quill.import('parchment');

const config = {
    scope: Parchment.Scope.INLINE,
};

let AnnotatePBlot = new Parchment.ClassAttributor('annotateP', 'noteP', config);


Quill.register(AnnotatePBlot, true);
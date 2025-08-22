import Quill from 'quill';
const Parchment = Quill.import('parchment');

const config = {
    scope: Parchment.Scope.INLINE,
};

let AnnotatePBlot = new Parchment.ClassAttributor('annotateP', 'noteP', config);


Quill.register(AnnotatePBlot, true);
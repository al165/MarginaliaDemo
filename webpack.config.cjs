const path = require('path');

module.exports = {
    entry: {
        main: './public/js/room.js',
        noteEdit: './public/js/noteEdit.js',
        editButtons: './public/js/editButtons.js',
        dialogs: './public/js/dialogs.js'
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'public', 'dist'),
    },
    mode: 'development',
    devtool: false,
    watch: true
};
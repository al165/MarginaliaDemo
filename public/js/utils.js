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

export function compareObjects(fmt1, fmt2) {
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

export function expandSelection(editor, range, stopOnNewline = false) {
    // Expand a range to select the current format

    const format = editor.getFormat(range);

    let index = range.index;
    let length = range.length;

    const totalLength = editor.getLength();
    let selectionText = editor.getText({ index, length });

    // Expand left...
    while (index > 0) {
        let newFormat = editor.getFormat(index, length);

        if (!compareObjects(format, newFormat)) {
            index += 1;
            length -= 1;
            break;
        }

        if (stopOnNewline) {
            if (stopOnNewline) {
                selectionText = editor.getText({ index, length });
                if (selectionText.startsWith('\n')) {
                    index += 1;
                    length -= 1;
                    break;
                }
            }
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

        if (stopOnNewline) {
            selectionText = editor.getText({ index, length });
            if (selectionText.endsWith('\n'))
                break;
        }

        length += 1;
    }

    return { index, length }
}
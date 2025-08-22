import fs from 'fs';
import path from 'path';

import crypto from "crypto";

export function generateId(length) {
    const charset =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const randomBytes = crypto.randomBytes(length);
    let id = "";
    for (let i = 0; i < randomBytes.length; i++) {
        id += charset[randomBytes[i] % charset.length];
    }
    return id;
}

function loadSvg(filePath, attrs = {}) {
    let svg = fs.readFileSync(path.resolve(filePath), "utf8");

    // Strip XML/DOCTYPE headers
    svg = svg.replace(/<\?xml.*?\?>|<!DOCTYPE.*?>|<!--.*?-->/gs, "").trim();

    // Inject attributes into <svg ...>
    svg = svg.replace(/<svg\b([^>]*)>/, (_match, existingAttrs) => {
        const attrString = Object.entries(attrs)
            .map(([k, v]) => `${k}="${v}"`)
            .join(" ");
        return `<svg ${existingAttrs} ${attrString}>`;
    });

    return svg;
}

export function svgToBase64(filepath, attrs = {}) {
    const svg = loadSvg(filepath, attrs);
    const base64 = Buffer.from(svg).toString("base64");
    return `data:image/svg+xml;base64,${base64}`;
}

export function imageToBase64(filepath) {
    const ext = path.extname(filepath).slice(1); // 'png', 'ico', 'svg'
    const mimeMap = {
        jpg: "image/jpeg",
        png: "image/png",
        ico: "image/x-icon",
        svg: "image/svg+xml",
    };

    const mime = mimeMap[ext];
    if (!mime)
        throw new Error(`Unsupported image type: .${ext}`);

    const buffer = fs.readFileSync(filepath);
    const base64 = buffer.toString("base64");
    const src = `data:${mime};base64,${base64}`;

    return { mime, src };
}

class TreeNode {
    constructor(key, value = key, parent = null) {
        this.key = key;
        this.value = value;
        this.parent = parent;
        this.children = [];
    }

    get isLeaf() {
        return this.children.length == 0;
    }
}

class Tree {
    constructor(key, value = key) {
        this.root = new TreeNode(key, value);
    }

    *preOrderTraversal(node = this.root) {
        yield node;
        if (node.children.length) {
            for (let child of node.children) {
                yield* this.preOrderTraversal(child);
            }
        }
    }

    *postOrderTraversal(node = this.root) {
        if (node.children.length) {
            for (let child of node.children) {
                yield* this.postOrderTraversal(child);
            }
        }
        yield node;
    }

    insert(parentNodeKey, key, value = key) {
        for (let node of this.preOrderTraversal()) {
            if (node.key === parentNodeKey) {
                node.children.push(new TreeNode(key, value, node));
                return true;
            }
        }
        return false;
    }

    remove(key) {
        for (let node of this.preOrderTraversal()) {
            const filtered = node.children.filter(c => c.key !== key);
            if (filtered.length !== node.children.length) {
                node.children = filtered;
                return true;
            }
        }
        return false;
    }

    find(key) {
        for (let node of this.preOrderTraversal()) {
            if (node.key === key) return node;
        }
        return undefined;
    }

    path(key) {
        let result = [key];
        let lastNode = this.find(key);
        if (!lastNode)
            return [];

        let iteration = 0;
        while (true && iteration < 50) {
            let parent = lastNode.parent;
            if (!parent)
                break;
            result.unshift(parent.key);
            lastNode = parent;
            iteration++;
        }
        return result;
    }
}

export async function buildNoteTree(db, rootNoteId) {
    // given a root note, build a tree where each node is a note,
    // and each child is another note linked from it

    const tree = new Tree(rootNoteId);

    async function build(tree, noteId) {
        const noteRow = await db.get("SELECT noteContent, noteType FROM Notes WHERE id = ?", [noteId]);

        if (!noteRow || noteRow.noteType)
            return;

        const ops = JSON.parse(noteRow.noteContent)["ops"];
        for (const op of ops) {
            if (!op.attributes || !op.attributes.annotate || !op.attributes.annotate.id)
                continue;

            const childId = op.attributes.annotate.id;
            tree.insert(noteId, childId);
            await build(tree, childId);
        }
    }

    await build(tree, rootNoteId);

    return tree;
}
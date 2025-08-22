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
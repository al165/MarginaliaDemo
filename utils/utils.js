import fs from 'fs';
import path from 'path';

import dotenv from 'dotenv';
dotenv.configDotenv();
let UPLOADS_DIR = process.env.UPLOADS_DIR ?? "./uploads";

async function updateUploadsXRefTable(db, noteId, noteContent) {
    let ops;
    if (!noteContent.ops)
        ops = noteContent
    else
        ops = noteContent.ops;

    for (const op of ops) {
        if (!op.insert)
            continue;

        if (!op.insert.image)
            continue;

        let row = await db.get("SELECT * FROM Uploads WHERE fileUrl = ?", [op.insert.image]);
        if (!row) {
            console.warn(`Warning: upload with URL ${op.insert.image} not found in Uploads table.`);
            // Check if it exists in uploads dir
            const filename = path.basename(op.insert.image);
            const uploadPath = path.join('..', UPLOADS_DIR, filename);
            if (fs.existsSync(uploadPath)) {
                console.log(`- ${uploadPath} does not exist in file system, skipping`);
                continue;
            }

            console.log(` - Adding ${filename} to Uploads`);
            const id = path.parse(filename).name;
            const createdOn = new Date();
            const mimetype = path.extname(filename).slice(1);

            await db.run(
                "INSERT INTO Uploads (id, createdOn, path, filename, fileUrl, mimetype) VALUES (?, ?, ?, ?, ?, ?)",
                [id, createdOn, UPLOADS_DIR, filename, op.insert.image, mimetype]
            );

            row = { id };
        }

        const uploadId = row.id;
        const xref = await db.get("SELECT * FROM Notes_Uploads_XRef WHERE noteId = ? AND uploadId = ?", [noteId, uploadId]);
        if (!xref)
            await db.run("INSERT INTO Notes_Uploads_XRef (noteId, uploadId) VALUES (?, ?)", [noteId, uploadId]);
    }
}

async function cleanUploadsDir(db) {
    // removes any file not registered in Uploads table
    console.log("Cleaning Uploads dir");

    const files = fs.readdirSync(UPLOADS_DIR);
    console.log(`Found ${files.length} uploads`);

    for (const file of files) {
        if (fs.lstatSync(path.join(UPLOADS_DIR, file)).isDirectory())
            continue;
        console.log(`Checking ${file}`);
        const row = await db.get("SELECT * FROM Uploads WHERE filename = ?", [file]);
        if (!row) {
            const filepath = path.join(UPLOADS_DIR, file);
            console.log(`- Deleting ${filepath}`);
            fs.unlinkSync(filepath);
        }
        else {
            console.log('- Found, continuing');
        }
    }
}

export { updateUploadsXRefTable, cleanUploadsDir };
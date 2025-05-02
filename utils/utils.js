async function updateUploadsXRefTable(db, noteId, noteContent) {
    const ops = noteContent.ops;
    for (const op of ops) {
        if (!op.insert)
            continue;

        if (!op.insert.image)
            continue;

        const row = await db.get("SELECT * FROM Uploads WHERE fileUrl = ?", [op.insert.image]);
        if (!row) {
            console.error(`Error: upload with URL ${op.insert.image} not found in Uploads.`)
            continue;
        }

        const uploadId = row.id;
        const xref = await db.get("SELECT * FROM Notes_Uploads_XRef WHERE noteId = ? AND uploadId = ?", [noteId, uploadId]);
        if (!xref)
            await db.run("INSERT INTO Notes_Uploads_XRef (noteId, uploadId) VALUES (?, ?)", [noteId, uploadId]);
    }
}

export { updateUploadsXRefTable };
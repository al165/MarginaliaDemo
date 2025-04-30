-- Up

CREATE TABLE Uploads (
    id TEXT PRIMARY KEY UNIQUE,
    createdOn INTEGER,
    path TEXT,
    filename TEXT,
    fileUrl TEXT,
    mimetype TEXT
);

CREATE TABLE Notes_Uploads_XRef (
    noteId TEXT,
    uploadId TEXT,
    FOREIGN KEY (noteId) REFERENCES Notes (id) ON DELETE CASCADE,
    FOREIGN KEY (uploadId) REFERENCES Uploads (id)
);

-- Down

DROP TABLE Uploads;
DROP TABLE Notes_Uploads_XRef;


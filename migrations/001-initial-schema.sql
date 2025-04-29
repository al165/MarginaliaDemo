-- Up

PRAGMA foreign_keys = ON;

CREATE TABLE Notes (
    id TEXT PRIMARY KEY UNIQUE,
    userId INTEGER,
    createdOn INTEGER,
    noteContent TEXT,
    noteOptions TEXT
);

CREATE TABLE Rooms (
    id TEXT PRIMARY KEY UNIQUE,
    name TEXT,
    userId INTEGER,
    createdOn INTEGER,
    theme TEXT,
    editToken TEXT,
    rootNote TEXT
);

CREATE TABLE Rooms_Notes_XRef (
    roomId TEXT,
    noteId TEXT,
    FOREIGN KEY (roomId) REFERENCES Rooms (id) ON DELETE CASCADE,
    FOREIGN KEY (noteId) REFERENCES Notes (id) ON DELETE CASCADE
);

CREATE TABLE Users (
    id INTEGER,
    name TEXT
);

-- Down
PRAGMA foreign_keys = OFF;

DROP TABLE Notes;
DROP TABLE Rooms;
DROP TABLE Rooms_Notes_XRef;
DROP TABLE Users;

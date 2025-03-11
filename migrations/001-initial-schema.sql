-- Up

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
    FOREIGN KEY (roomId) REFERENCES Rooms (id),
    FOREIGN KEY (noteId) REFERENCES Notes (id)
);

CREATE TABLE Users (
    id INTEGER,
    name TEXT
);

-- Down

DROP TABLE Notes;
DROP TABLE Rooms;
DROP TABLE Rooms_Notes_XRef;
DROP TABLE Users;

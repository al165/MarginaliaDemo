-- Up

ALTER TABLE Notes ADD yjsState BLOB;

-- Down

ALTER TABLE Notes DROP COLUMN yjsState;


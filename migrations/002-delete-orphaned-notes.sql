-- Up

CREATE TRIGGER IF NOT EXISTS delete_orphan_notes
AFTER DELETE ON Rooms_Notes_XRef
BEGIN
  DELETE FROM Notes
  WHERE id NOT IN (
    SELECT noteId FROM Rooms_Notes_XRef
  );
END;

-- Down

DROP TRIGGER IF EXISTS delete_orphan_notes;


 ALTER TABLE todos ADD COLUMN priority VARCHAR(8) DEFAULT 'p2' AFTER images;
 ALTER TABLE shared_todos ADD COLUMN priority VARCHAR(8) DEFAULT 'p2' AFTER images;

ALTER TABLE todos ADD COLUMN parent_id VARCHAR(64) DEFAULT NULL AFTER todo_id;
ALTER TABLE todos ADD INDEX idx_parent (parent_id);

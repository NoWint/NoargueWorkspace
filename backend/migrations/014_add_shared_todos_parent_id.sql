ALTER TABLE shared_todos ADD COLUMN parent_id BIGINT DEFAULT NULL AFTER text;
ALTER TABLE shared_todos ADD INDEX idx_shared_parent (parent_id);

ALTER TABLE share_snapshots ADD COLUMN todo_id INT DEFAULT NULL AFTER user_id;
UPDATE share_snapshots SET todo_id = JSON_EXTRACT(data, '$.todo.id') WHERE todo_id IS NULL;

-- 迁移脚本：添加同步所需的新字段
-- 执行前请备份数据

-- 添加 todo_id 字段
ALTER TABLE todos ADD COLUMN todo_id VARCHAR(64);

-- 添加 version 字段
ALTER TABLE todos ADD COLUMN version INT DEFAULT 1;

-- 为现有数据生成 todo_id（使用 id 作为初始值）
UPDATE todos SET todo_id = CAST(id AS CHAR) WHERE todo_id IS NULL OR todo_id = '';

-- 初始化 version
UPDATE todos SET version = 1 WHERE version IS NULL;

-- 初始化 updated_at
UPDATE todos SET updated_at = created_at WHERE updated_at IS NULL;

-- 初始化 is_deleted
UPDATE todos SET is_deleted = 0 WHERE is_deleted IS NULL;

-- 添加索引
CREATE INDEX idx_todo_id ON todos(todo_id);

-- 为 todos 表添加 images 字段
ALTER TABLE todos ADD COLUMN images TEXT DEFAULT NULL AFTER tags;

-- 为 shared_todos 表添加 images 字段
ALTER TABLE shared_todos ADD COLUMN images TEXT DEFAULT NULL AFTER tags;

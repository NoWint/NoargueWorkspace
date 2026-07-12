-- 迁移脚本：为 shared_todos 表添加 tags 字段
-- 执行前请备份数据

-- 添加 tags 字段（TEXT 格式存储标签ID数组的JSON字符串）
ALTER TABLE shared_todos ADD COLUMN tags TEXT DEFAULT NULL;

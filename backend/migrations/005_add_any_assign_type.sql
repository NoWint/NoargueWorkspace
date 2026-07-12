-- 迁移脚本：为 shared_todos 表的 assign_type 字段添加 'any' 类型
-- 用于支持"任一完成"模式：任何一个人完成待办即算作全员完成

ALTER TABLE shared_todos 
MODIFY COLUMN assign_type ENUM('all', 'any', 'specific') NOT NULL DEFAULT 'all';

-- 迁移脚本：添加 combo_limit 字段并调整上限
-- 执行前请备份数据

-- 添加 combo_limit 字段（组合上限）
ALTER TABLE users ADD COLUMN combo_limit INT DEFAULT 10;

-- 初始化 combo_limit
UPDATE users SET combo_limit = 10 WHERE combo_limit IS NULL;

-- 修改 todo_limit 默认值为 100（待办上限）
ALTER TABLE users MODIFY COLUMN todo_limit INT DEFAULT 100;

-- 更新现有用户的 todo_limit 为 100（如果之前是 500）
UPDATE users SET todo_limit = 100 WHERE todo_limit = 500 OR todo_limit IS NULL;

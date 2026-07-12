-- 迁移脚本：为 shared_todos 表添加 exclude_type 字段
-- 用于存储免完成设置：owner（免完成超管）、self（免完成自己）、admins（免完成管理）、空字符串（无免完成）

ALTER TABLE shared_todos ADD COLUMN exclude_type VARCHAR(16) DEFAULT '' AFTER assign_type;

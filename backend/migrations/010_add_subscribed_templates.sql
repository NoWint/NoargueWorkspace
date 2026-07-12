-- 添加用户订阅模板字段
-- 用于存储用户订阅的消息模板ID列表

ALTER TABLE users ADD COLUMN subscribed_templates TEXT DEFAULT NULL COMMENT '用户订阅的消息模板ID列表，JSON数组格式';

-- 添加索引以优化查询（可选）
-- ALTER TABLE users ADD INDEX idx_subscribed_templates ((JSON_CONTAINS(subscribed_templates, '"template_id"')));

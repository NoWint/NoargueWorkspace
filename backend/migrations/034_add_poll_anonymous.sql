-- 给 post_polls 表添加 is_anonymous 字段（匿名投票开关）
ALTER TABLE post_polls ADD COLUMN is_anonymous TINYINT DEFAULT 0 AFTER is_closed;

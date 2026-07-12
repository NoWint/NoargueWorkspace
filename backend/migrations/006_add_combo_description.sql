-- 添加组合描述字段
ALTER TABLE combos ADD COLUMN description TEXT DEFAULT NULL AFTER color;

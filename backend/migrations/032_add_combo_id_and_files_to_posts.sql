-- 组合内私有帖子：combo_id 标记帖子归属
ALTER TABLE posts ADD COLUMN combo_id BIGINT DEFAULT NULL AFTER user_id;
CREATE INDEX idx_combo_id ON posts(combo_id);

-- 帖子文件附件：JSON 数组，存储 storage.to 返回的文件元数据（含 owner_token）
ALTER TABLE posts ADD COLUMN files TEXT DEFAULT NULL AFTER images;

SELECT '组合ID和文件字段添加成功' as result;

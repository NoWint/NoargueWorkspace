-- 迁移脚本：创建共享待办评论表
-- 版本：009
-- 日期：2025-04-03

CREATE TABLE IF NOT EXISTS shared_todo_comments (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  shared_todo_id BIGINT NOT NULL COMMENT '共享待办ID',
  user_id BIGINT NOT NULL COMMENT '评论者用户ID',
  content TEXT NOT NULL COMMENT '评论内容',
  parent_id BIGINT DEFAULT NULL COMMENT '父评论ID（支持回复）',
  reply_to_user_id BIGINT DEFAULT NULL COMMENT '被回复用户ID',
  location_text TEXT DEFAULT NULL COMMENT '位置信息（预留）',
  images TEXT DEFAULT NULL COMMENT '图片列表JSON（预留）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT NULL COMMENT '更新时间（应用层管理）',
  is_deleted TINYINT DEFAULT 0 COMMENT '软删除标记',
  
  INDEX idx_todo (shared_todo_id),
  INDEX idx_user (user_id),
  INDEX idx_parent (parent_id),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='共享待办评论表';

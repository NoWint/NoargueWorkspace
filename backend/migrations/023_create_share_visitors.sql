CREATE TABLE IF NOT EXISTS share_visitors (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  share_id VARCHAR(32) NOT NULL,
  visitor_ip VARCHAR(45) NOT NULL COMMENT '访客IP，IPv6最长45字符',
  visitor_user_id BIGINT DEFAULT NULL COMMENT '已登录访客的用户ID',
  action ENUM('view', 'add') NOT NULL COMMENT 'view=查看, add=添加到我的待办',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_share_id (share_id),
  INDEX idx_share_action (share_id, action),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='分享访客记录';

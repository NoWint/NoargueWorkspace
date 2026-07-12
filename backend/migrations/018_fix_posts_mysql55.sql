-- 修复 017：MySQL 5.5 不支持第二个 TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- 将 updated_at 改为 NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP

CREATE TABLE IF NOT EXISTS posts (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    post_id VARCHAR(64) NOT NULL UNIQUE,
    user_id BIGINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    body TEXT,
    images TEXT,
    todo_ids TEXT,
    share_code VARCHAR(10),
    ip_address VARCHAR(45),
    ip_province VARCHAR(100),
    location TEXT,
    likes_count INT DEFAULT 0,
    comments_count INT DEFAULT 0,
    views_count INT DEFAULT 0,
    viewer_ids TEXT,
    is_edited TINYINT DEFAULT 0,
    is_deleted TINYINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

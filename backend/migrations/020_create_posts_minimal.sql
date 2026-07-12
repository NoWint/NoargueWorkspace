-- MySQL 5.5 兼容：只有一个 TIMESTAMP 能用 CURRENT_TIMESTAMP
-- updated_at 不能有 ON UPDATE CURRENT_TIMESTAMP，改为应用层手动维护
DROP TABLE IF EXISTS posts;

CREATE TABLE posts (
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
    updated_at TIMESTAMP NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_user_id ON posts(user_id);
CREATE INDEX idx_created_at ON posts(created_at);

INSERT INTO posts (post_id, user_id, title) VALUES ('_test_check_', 0, '验证帖');
SELECT 'posts 表创建成功' as result;

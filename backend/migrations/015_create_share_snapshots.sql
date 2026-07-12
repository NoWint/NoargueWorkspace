CREATE TABLE IF NOT EXISTS share_snapshots (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    share_id VARCHAR(32) NOT NULL UNIQUE,
    user_id BIGINT NOT NULL,
    data TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_share_id (share_id),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 共享待办通知表
CREATE TABLE IF NOT EXISTS shared_todo_notifications (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    shared_todo_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    notify_time DATETIME NOT NULL,
    is_sent TINYINT DEFAULT 0,
    sent_at DATETIME NULL,
    template_msg_id VARCHAR(64),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL,
    INDEX idx_shared_todo (shared_todo_id),
    INDEX idx_user_time (user_id, notify_time),
    INDEX idx_sent (is_sent, notify_time),
    UNIQUE KEY uk_todo_user (shared_todo_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

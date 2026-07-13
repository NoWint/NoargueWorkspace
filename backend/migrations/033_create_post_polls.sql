-- 帖子投票系统
-- MySQL 5.5 兼容：仅一个 TIMESTAMP 带 CURRENT_TIMESTAMP
-- updated_at 需应用层手动维护

CREATE TABLE IF NOT EXISTS post_polls (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    post_id     BIGINT NOT NULL,
    title       VARCHAR(200) NOT NULL,
    type        TINYINT DEFAULT 0 COMMENT '0=单选 1=多选',
    allow_other TINYINT DEFAULT 0 COMMENT '允许其他输入',
    end_time    TIMESTAMP NULL DEFAULT NULL COMMENT '截止时间,null=一直开放',
    is_closed   TINYINT DEFAULT 0 COMMENT '已结束(手动/截止均置1)',
    total_votes INT DEFAULT 0 COMMENT '反范化总投票人数',
    is_deleted  TINYINT DEFAULT 0 COMMENT '级联帖子删除',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NULL DEFAULT NULL,
    UNIQUE KEY uk_post_id (post_id),
    INDEX idx_deleted (is_deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS post_poll_options (
    id         BIGINT PRIMARY KEY AUTO_INCREMENT,
    poll_id    BIGINT NOT NULL,
    text       VARCHAR(100) NOT NULL,
    is_other   TINYINT DEFAULT 0 COMMENT '是否为其他选项',
    sort_order INT DEFAULT 0,
    vote_count INT DEFAULT 0 COMMENT '反范化得票数',
    INDEX idx_poll_id (poll_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS post_poll_votes (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    poll_id     BIGINT NOT NULL,
    option_id   BIGINT NOT NULL,
    user_id     BIGINT NOT NULL,
    custom_text VARCHAR(200) NULL COMMENT '其他选项用户输入',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_poll_id (poll_id),
    INDEX idx_option_id (option_id),
    INDEX idx_user_id (user_id),
    UNIQUE KEY uk_user_option (poll_id, user_id, option_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SELECT '投票系统表创建成功' as result;

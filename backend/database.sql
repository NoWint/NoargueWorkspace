-- 时光绿径待办数据库建表脚本
-- 兼容 MySQL 5.5（每个表只能有一个TIMESTAMP使用CURRENT_TIMESTAMP）
-- 数据库名: timegreenpath

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS timegreenpath 
DEFAULT CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE timegreenpath;

-- ==================== 用户表 ====================
CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    openid VARCHAR(64) NOT NULL UNIQUE,
    unionid VARCHAR(64),
    nickname VARCHAR(64),
    avatar_url VARCHAR(512),
    todo_limit INT DEFAULT 100,
    combo_limit INT DEFAULT 10,
    collab_limit INT DEFAULT 5,
    last_sync_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    INDEX idx_openid (openid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==================== 标签表 ====================
CREATE TABLE IF NOT EXISTS tags (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(32) NOT NULL,
    color VARCHAR(16) NOT NULL,
    icon VARCHAR(64),
    is_system TINYINT DEFAULT 0,
    user_id BIGINT,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_system (is_system)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==================== 待办-标签关联表 ====================
CREATE TABLE IF NOT EXISTS todo_tags (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    todo_id BIGINT NOT NULL,
    tag_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_todo_tag (todo_id, tag_id),
    INDEX idx_todo (todo_id),
    INDEX idx_tag (tag_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==================== 待办表 ====================
CREATE TABLE IF NOT EXISTS todos (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    todo_id VARCHAR(64),
    text VARCHAR(256) NOT NULL,
    set_date DATE,
    set_time TIME,
    remarks TEXT,
    location_text TEXT,
    completed BIGINT DEFAULT 0,
    is_star TINYINT DEFAULT 0,
    tags TEXT DEFAULT NULL,
    images TEXT DEFAULT NULL,
    version INT DEFAULT 1,
    is_deleted TINYINT DEFAULT 0,
    deleted_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    combo_id BIGINT DEFAULT NULL,
    INDEX idx_user (user_id),
    INDEX idx_user_date (user_id, set_date),
    INDEX idx_user_completed (user_id, completed),
    INDEX idx_combo (combo_id),
    INDEX idx_deleted (is_deleted),
    INDEX idx_todo_id (todo_id),
    UNIQUE KEY uk_user_todo_id (user_id, todo_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==================== 待办通知表 ====================
CREATE TABLE IF NOT EXISTS todo_notifications (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    todo_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    notify_time DATETIME NOT NULL,
    is_sent TINYINT DEFAULT 0,
    sent_at DATETIME NULL,
    template_msg_id VARCHAR(64),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_todo (todo_id),
    INDEX idx_user_time (user_id, notify_time),
    INDEX idx_sent (is_sent, notify_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==================== 组合表 ====================
CREATE TABLE IF NOT EXISTS combos (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    name VARCHAR(64) NOT NULL,
    icon VARCHAR(64) DEFAULT 'folder',
    color VARCHAR(16) DEFAULT '#4CAF50',
    description TEXT DEFAULT NULL,
    is_shared TINYINT DEFAULT 0,
    share_code VARCHAR(8) UNIQUE,
    member_limit INT DEFAULT 50,
    todo_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    INDEX idx_user (user_id),
    INDEX idx_share_code (share_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==================== 组合成员表 ====================
CREATE TABLE IF NOT EXISTS combo_members (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    combo_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    role ENUM('owner', 'admin', 'member') NOT NULL DEFAULT 'member',
    nickname VARCHAR(64),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_combo_user (combo_id, user_id),
    INDEX idx_user (user_id),
    INDEX idx_combo (combo_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==================== 共享待办表 ====================
CREATE TABLE IF NOT EXISTS shared_todos (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    combo_id BIGINT NOT NULL,
    creator_id BIGINT NOT NULL,
    text VARCHAR(256) NOT NULL,
    set_date DATE,
    set_time TIME,
    remarks TEXT,
    location_text TEXT DEFAULT NULL,
    assign_type ENUM('all', 'any', 'specific') NOT NULL DEFAULT 'all',
    exclude_type VARCHAR(16) DEFAULT '',
    tags TEXT DEFAULT NULL,
    images TEXT DEFAULT NULL,
    completed_at BIGINT DEFAULT 0,
    is_deleted TINYINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    INDEX idx_combo (combo_id),
    INDEX idx_creator (creator_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==================== 共享待办分配表 ====================
CREATE TABLE IF NOT EXISTS shared_todo_assignments (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    shared_todo_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    completed_at BIGINT DEFAULT 0,
    UNIQUE KEY uk_todo_user (shared_todo_id, user_id),
    INDEX idx_user (user_id),
    INDEX idx_todo (shared_todo_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==================== 协作申请表 ====================
CREATE TABLE IF NOT EXISTS collab_requests (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    combo_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    message VARCHAR(256),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME NULL,
    processed_by BIGINT,
    INDEX idx_combo_status (combo_id, status),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==================== 同步日志表 ====================
CREATE TABLE IF NOT EXISTS sync_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    action ENUM('upload', 'download', 'merge', 'sync', 'full_sync'),
    todo_count INT DEFAULT 0,
    status ENUM('success', 'failed', 'partial'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==================== 共享待办评论表 ====================
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

-- ==================== 系统预设标签 ====================
INSERT INTO tags (name, color, icon, is_system, sort_order) VALUES
('工作', '#2196F3', 'briefcase', 1, 1),
('学习', '#9C27B0', 'book', 1, 2),
('生活', '#4CAF50', 'home', 1, 3),
('健康', '#F44336', 'heart', 1, 4),
('购物', '#FF9800', 'cart', 1, 5),
('其他', '#607D8B', 'more', 1, 6);

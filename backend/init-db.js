const mysql = require('mysql');
const logger = require('./utils/logger');

const connection = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: 'Yzj_201002930951',
  database: 'timegreenpath',
  port: 3306,
  multipleStatements: true
});

const initDatabase = () => {
  connection.connect((err) => {
    if (err) {
      logger.systemError('数据库', '数据库连接失败', { error: err.message });
      return;
    }
    logger.systemInfo('数据库', '数据库连接成功，开始初始化');
    
    const createTables = `
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        openid VARCHAR(64) NOT NULL UNIQUE,
        unionid VARCHAR(64),
        nickname VARCHAR(64),
        avatar_url VARCHAR(512),
        todo_limit INT DEFAULT 500,
        collab_limit INT DEFAULT 5,
        subscribed_templates TEXT,
        last_sync_at DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME,
        INDEX idx_openid (openid)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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

      CREATE TABLE IF NOT EXISTS todo_tags (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        todo_id BIGINT NOT NULL,
        tag_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_todo_tag (todo_id, tag_id),
        INDEX idx_todo (todo_id),
        INDEX idx_tag (tag_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE IF NOT EXISTS todos (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT NOT NULL,
        text VARCHAR(256) NOT NULL,
        set_date DATE,
        set_time TIME,
        remarks TEXT,
        location_text TEXT,
        completed BIGINT DEFAULT 0,
        is_star TINYINT DEFAULT 0,
        tags TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME,
        combo_id BIGINT DEFAULT NULL,
        is_deleted TINYINT DEFAULT 0,
        deleted_at DATETIME NULL,
        version INT DEFAULT 1,
        todo_id VARCHAR(64),
        INDEX idx_user (user_id),
        INDEX idx_user_date (user_id, set_date),
        INDEX idx_user_completed (user_id, completed),
        INDEX idx_combo (combo_id),
        INDEX idx_deleted (is_deleted),
        INDEX idx_todo_id (todo_id),
        UNIQUE KEY uk_user_todo_id (user_id, todo_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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

      CREATE TABLE IF NOT EXISTS combos (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT NOT NULL,
        name VARCHAR(64) NOT NULL,
        icon VARCHAR(64) DEFAULT 'folder',
        color VARCHAR(16) DEFAULT '#4CAF50',
        is_shared TINYINT DEFAULT 0,
        share_code VARCHAR(8) UNIQUE,
        member_limit INT DEFAULT 50,
        todo_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME,
        INDEX idx_user (user_id),
        INDEX idx_share_code (share_code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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

      CREATE TABLE IF NOT EXISTS shared_todo_assignments (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        shared_todo_id BIGINT NOT NULL,
        user_id BIGINT NOT NULL,
        completed_at BIGINT DEFAULT 0,
        UNIQUE KEY uk_todo_user (shared_todo_id, user_id),
        INDEX idx_user (user_id),
        INDEX idx_todo (shared_todo_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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

      CREATE TABLE IF NOT EXISTS sync_logs (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT NOT NULL,
        action ENUM('upload', 'download', 'merge', 'sync', 'full_sync'),
        todo_count INT DEFAULT 0,
        status ENUM('success', 'failed', 'partial'),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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

      CREATE TABLE IF NOT EXISTS share_snapshots (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        share_id VARCHAR(32) NOT NULL UNIQUE,
        user_id BIGINT NOT NULL,
        todo_id INT DEFAULT NULL,
        data TEXT NOT NULL,
        revoked TINYINT(1) NOT NULL DEFAULT 0,
        password VARCHAR(64) DEFAULT NULL,
        max_views INT DEFAULT NULL,
        current_views INT NOT NULL DEFAULT 0,
        remark VARCHAR(255) DEFAULT NULL,
        allow_copy TINYINT(1) NOT NULL DEFAULT 1,
        track_visitors TINYINT(1) NOT NULL DEFAULT 0,
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_share_id (share_id),
        INDEX idx_expires (expires_at),
        INDEX idx_revoked (revoked)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='分享快照（24h TTL）';

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

	      -- 016 撤回支持
    `;
    
    connection.query(createTables, (err, result) => {
      if (err) {
        logger.systemError('数据库', '创建表失败', { error: err.message });
        return;
      }
      logger.systemInfo('数据库', '数据表创建成功');
      
      const insertSystemTags = `
        INSERT IGNORE INTO tags (name, color, icon, is_system, sort_order) VALUES
        ('工作', '#2196F3', 'briefcase', 1, 1),
        ('学习', '#9C27B0', 'book', 1, 2),
        ('生活', '#4CAF50', 'home', 1, 3),
        ('健康', '#F44336', 'heart', 1, 4),
        ('购物', '#FF9800', 'cart', 1, 5),
        ('其他', '#607D8B', 'more', 1, 6);
      `;
      
      connection.query(insertSystemTags, (err, result) => {
        if (err) {
          logger.systemError('数据库', '插入系统标签失败', { error: err.message });
        } else {
          logger.systemInfo('数据库', '系统标签初始化成功');
        }
        
        logger.systemInfo('数据库', '数据库初始化完成');
        connection.end();
      });
    });
  });
};

initDatabase();

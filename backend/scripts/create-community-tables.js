/**
 * 社区系统建表脚本（MySQL 5.5 兼容）
 * 用法: node scripts/create-community-tables.js
 * 只创建不存在的表，已有表不影响
 */
const mysql = require('mysql');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'timegreenpath',
  port: parseInt(process.env.DB_PORT) || 3306,
  connectionLimit: 1,
  charset: 'utf8mb4'
});

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, conn) => {
      if (err) return reject(err);
      conn.query(sql, params, (err, rows) => {
        conn.release();
        if (err) reject(err);
        else resolve(rows);
      });
    });
  });
}

const TABLES = [
  {
    name: 'posts',
    sql: `CREATE TABLE IF NOT EXISTS posts (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  },
  {
    name: 'post_views',
    sql: `CREATE TABLE IF NOT EXISTS post_views (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      post_id BIGINT NOT NULL,
      user_id BIGINT NOT NULL,
      viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_post_id (post_id),
      INDEX idx_post_user (post_id, user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  },
  {
    name: 'post_likes',
    sql: `CREATE TABLE IF NOT EXISTS post_likes (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      post_id BIGINT NOT NULL,
      user_id BIGINT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_post_user (post_id, user_id),
      INDEX idx_post_id (post_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  },
  {
    name: 'post_comments',
    sql: `CREATE TABLE IF NOT EXISTS post_comments (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      post_id BIGINT NOT NULL,
      user_id BIGINT NOT NULL,
      content TEXT NOT NULL,
      images TEXT,
      parent_id BIGINT DEFAULT NULL,
      reply_to_user_id BIGINT DEFAULT NULL,
      reply_to_content TEXT,
      likes_count INT DEFAULT 0,
      is_deleted TINYINT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_post_id (post_id),
      INDEX idx_parent_id (parent_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  },
  {
    name: 'reports',
    sql: `CREATE TABLE IF NOT EXISTS reports (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      user_id BIGINT NOT NULL,
      target_type VARCHAR(20) NOT NULL,
      target_id VARCHAR(64) NOT NULL,
      target_content VARCHAR(200),
      reason VARCHAR(50) NOT NULL,
      detail TEXT,
      status TINYINT DEFAULT 0,
      result_note TEXT,
      processed_by BIGINT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      processed_at TIMESTAMP NULL,
      INDEX idx_status (status),
      INDEX idx_user_id (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  }
];

async function run() {
  console.log('检查社区系统表...\n');

  // 检查已有表
  const existing = await query("SHOW TABLES LIKE 'post%'");
  const existingNames = existing.map(r => Object.values(r)[0]);
  const reportExists = (await query("SHOW TABLES LIKE 'reports'")).length > 0;

  console.log('已有表:', [...existingNames, ...(reportExists ? ['reports'] : [])].join(', ') || '(无)');
  console.log('');

  let created = 0;
  for (const t of TABLES) {
    const exists = t.name === 'reports'
      ? reportExists
      : existingNames.includes(t.name);

    if (exists) {
      console.log(`  ✓ ${t.name} 已存在，跳过`);
      continue;
    }

    try {
      await query(t.sql);
      console.log(`  ✓ ${t.name} 创建成功`);
      created++;
    } catch (err) {
      console.error(`  ✗ ${t.name} 创建失败: ${err.message}`);
    }
  }

  // 特别处理 posts: 如果 IF NOT EXISTS 被空表阻挡，DROP 后重建
  const postsStillMissing = (await query("SHOW TABLES LIKE 'posts'")).length === 0;
  if (!postsStillMissing) {
    // 验证 posts 表结构是否正确（updated_at 是否为 TIMESTAMP NULL）
    const cols = await query("SHOW COLUMNS FROM posts");
    const updatedAt = cols.find(c => c.Field === 'updated_at');
    if (updatedAt && updatedAt.Type.includes('timestamp') && updatedAt.Null === 'NO') {
      console.log('\n⚠ posts 表 updated_at 列不兼容 MySQL 5.5，重建中...');
      await query('DROP TABLE IF EXISTS posts');
      try {
        await query(TABLES.find(t => t.name === 'posts').sql);
        console.log('  ✓ posts 重建成功');
        created++;
      } catch (err) {
        console.error(`  ✗ posts 重建失败: ${err.message}`);
      }
    }
  }

  console.log(`\n完成。本次创建 ${created} 张表。`);
  pool.end();
}

run().catch(err => {
  console.error('脚本执行失败:', err.message);
  pool.end();
  process.exit(1);
});

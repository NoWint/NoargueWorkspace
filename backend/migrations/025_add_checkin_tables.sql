-- 025_add_checkin_tables.sql
-- TimeGreen Path Todo — check-in system schema (MySQL 5.5 compatible)

-- 签到记录表
CREATE TABLE IF NOT EXISTS check_ins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  check_in_date DATE NOT NULL,
  points INT DEFAULT 5 COMMENT '本次签到获得积分',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_date (user_id, check_in_date),
  INDEX idx_user_date (user_id, check_in_date),
  INDEX idx_date (check_in_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 里程碑奖励记录表
CREATE TABLE IF NOT EXISTS checkin_milestones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  milestone_day INT NOT NULL COMMENT '里程碑连续天数（7/15/30/60）',
  points INT NOT NULL COMMENT '本次奖励积分',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_milestone (user_id, milestone_day),
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 积分变动审计表
CREATE TABLE IF NOT EXISTS points_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type VARCHAR(20) NOT NULL COMMENT 'earn/deduct',
  points INT NOT NULL COMMENT '正数',
  note VARCHAR(255) DEFAULT '' COMMENT '备注，如"签到" "分享配置" "里程碑7天"',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_created (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 用户表追加字段
ALTER TABLE users
  ADD COLUMN total_points INT DEFAULT 0 COMMENT '总积分' AFTER badge_colors;

ALTER TABLE users
  ADD COLUMN current_streak INT DEFAULT 0 COMMENT '当前连签天数' AFTER total_points;

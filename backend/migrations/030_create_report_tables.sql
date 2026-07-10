-- 日报/周报系统 v1.0
-- MySQL 5.5 compatible (MEDIUMTEXT instead of JSON type)
-- 2026-07-10

CREATE TABLE IF NOT EXISTS `work_reports` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL COMMENT '创建人',
  `type` VARCHAR(10) NOT NULL COMMENT 'daily|weekly',
  `period_date` DATE NOT NULL COMMENT '日报=当天日期; 周报=当周周一',
  `period_label` VARCHAR(32) DEFAULT NULL COMMENT '前端展示用，如"第28周""07.10"',
  `combo_id` BIGINT DEFAULT 0 COMMENT '0=私人; >0=归属某组合',
  `content` MEDIUMTEXT COMMENT 'JSON: {"sections": [{"key":"...","title":"...","lines":[...]}]}',
  `is_deleted` TINYINT DEFAULT 0,
  `created_at` DATETIME,
  `updated_at` DATETIME,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_period` (`user_id`, `type`, `period_date`, `combo_id`),
  KEY `idx_combo` (`combo_id`),
  KEY `idx_period` (`period_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `report_templates` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `combo_id` BIGINT DEFAULT 0 COMMENT '0=私人默认; >0=组合专属模板',
  `type` VARCHAR(10) NOT NULL COMMENT 'daily|weekly',
  `sections` MEDIUMTEXT COMMENT 'JSON: [{"key":"...","title":"...","sort_order":1,"max_lines":20}]',
  `created_at` DATETIME,
  `updated_at` DATETIME,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_combo_type` (`combo_id`, `type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

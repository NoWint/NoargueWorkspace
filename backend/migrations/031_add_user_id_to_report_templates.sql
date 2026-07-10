-- Add user_id to report_templates for per-user private templates
-- ALTER TABLE is MySQL 5.5 compatible

ALTER TABLE `report_templates`
  ADD COLUMN `user_id` BIGINT DEFAULT 0 COMMENT '0=组合模板; >0=私人用户' AFTER `id`,
  DROP INDEX `uk_combo_type`,
  ADD UNIQUE KEY `uk_template` (`combo_id`, `user_id`, `type`);

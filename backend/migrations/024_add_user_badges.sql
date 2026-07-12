ALTER TABLE users
  ADD COLUMN badge_titles TEXT DEFAULT NULL COMMENT '徽标称号列表，JSON 数组',
  ADD COLUMN badge_colors TEXT DEFAULT NULL COMMENT '徽标颜色列表，JSON 数组，与 badge_titles 下标对应';

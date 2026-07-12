const { query } = require('../config/database');
const logger = require('../utils/logger');
const { appendCheckinBadges } = require('../utils/checkinBadgeHelper');

const USER_LOG = 'USER';

function getFullAvatarUrl(avatarUrl) {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith('http')) return avatarUrl;
  if (avatarUrl.startsWith('/uploads/')) {
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    return `${baseUrl}${avatarUrl}`;
  }
  return avatarUrl;
}

const getProfile = async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ success: false, message: '缺少userId参数' });
  }

  try {
    const users = await query(
      `SELECT id, nickname, avatar_url, badge_titles, badge_colors, created_at,
              (SELECT COUNT(*) FROM posts WHERE user_id = ? AND is_deleted = 0) as post_count
       FROM users WHERE id = ?`,
      [userId, userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    const user = users[0];

    const badgeData = await appendCheckinBadges(
      user.id,
      user.badge_titles ? JSON.parse(user.badge_titles) : [],
      user.badge_colors ? JSON.parse(user.badge_colors) : []
    );

    res.json({
      success: true,
      data: {
        id: user.id,
        nickname: user.nickname || '用户',
        avatarUrl: getFullAvatarUrl(user.avatar_url),
        badgeTitles: badgeData.badgeTitles,
        badgeColors: badgeData.badgeColors,
        postCount: user.post_count,
        createdAt: user.created_at
      }
    });
  } catch (err) {
    logger.error(USER_LOG, '获取用户资料', '获取用户公开资料失败', { userId, error: err.message });
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

const search = async (req, res) => {
  const { q, limit = 20 } = req.query;
  if (!q || q.trim().length === 0) {
    return res.json({ success: true, data: [] });
  }
  try {
    const pageSize = Math.min(parseInt(limit), 50);
    const users = await query(
      `SELECT id, nickname, avatar_url FROM users
       WHERE nickname LIKE ?
       ORDER BY nickname ASC LIMIT ?`,
      [`%${q.trim()}%`, pageSize]
    );
    res.json({
      success: true,
      data: users.map(u => ({
        id: u.id,
        nickname: u.nickname,
        avatar: getFullAvatarUrl(u.avatar_url)
      }))
    });
  } catch (err) {
    logger.error(USER_LOG, '搜索', '搜索用户失败', { keyword: q, error: err.message });
    res.status(500).json({ success: false, message: '搜索失败' });
  }
};

const getBatch = async (req, res) => {
  const { ids } = req.query;
  if (!ids) return res.json({ success: true, data: [] });
  const idArray = ids.split(',').map(Number).filter(id => !isNaN(id));
  if (idArray.length === 0) return res.json({ success: true, data: [] });
  try {
    const users = await query(
      `SELECT id, nickname, avatar_url FROM users WHERE id IN (?)`,
      [idArray]
    );
    res.json({
      success: true,
      data: users.map(u => ({
        id: u.id,
        nickname: u.nickname,
        avatar: getFullAvatarUrl(u.avatar_url)
      }))
    });
  } catch (err) {
    logger.error(USER_LOG, '批量查询', '批量查询用户失败', { ids, error: err.message });
    res.status(500).json({ success: false, message: '查询失败' });
  }
};

module.exports = { getProfile, search, getBatch };

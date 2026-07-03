const { query } = require('../config/database');
const logger = require('../utils/logger');

const USER_LOG = '用户';

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

    let badgeTitles = [], badgeColors = [];
    if (user.badge_titles) try { badgeTitles = JSON.parse(user.badge_titles); } catch {}
    if (user.badge_colors) try { badgeColors = JSON.parse(user.badge_colors); } catch {}

    res.json({
      success: true,
      data: {
        id: user.id,
        nickname: user.nickname || '用户',
        avatarUrl: getFullAvatarUrl(user.avatar_url),
        badgeTitles,
        badgeColors,
        postCount: user.post_count,
        createdAt: user.created_at
      }
    });
  } catch (err) {
    logger.error(USER_LOG, '获取用户资料', '获取用户公开资料失败', { userId, error: err.message });
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

module.exports = { getProfile };

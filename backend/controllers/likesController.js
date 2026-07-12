const { query } = require('../config/database');
const logger = require('../utils/logger');
const { appendCheckinBadges } = require('../utils/checkinBadgeHelper');

const getFullAvatarUrl = (avatarUrl) => {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) return avatarUrl;
  if (avatarUrl.startsWith('/uploads/')) {
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    return `${baseUrl}${avatarUrl}`;
  }
  return null;
};

async function getBadges(row) {
  const titles = row.badge_titles ? JSON.parse(row.badge_titles) : [];
  const colors = row.badge_colors ? JSON.parse(row.badge_colors) : [];
  const result = await appendCheckinBadges(row.user_id, titles, colors);
  return { badgeTitles: result.badgeTitles, badgeColors: result.badgeColors };
}

const toggle = async (req, res) => {
  const userId = req.user.id;
  const { postId } = req.body;

  if (!postId) {
    return res.status(400).json({ success: false, message: '缺少postId' });
  }

  try {
    const posts = await query('SELECT id FROM posts WHERE post_id = ? AND is_deleted = 0', [postId]);
    if (posts.length === 0) {
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }

    const postDbId = posts[0].id;
    const existing = await query(
      'SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?',
      [postDbId, userId]
    );

    if (existing.length > 0) {
      await query('DELETE FROM post_likes WHERE id = ?', [existing[0].id]);
      await query('UPDATE posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = ?', [postDbId]);
      res.json({ success: true, data: { liked: false } });
    } else {
      await query('INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)', [postDbId, userId]);
      await query('UPDATE posts SET likes_count = likes_count + 1 WHERE id = ?', [postDbId]);
      res.json({ success: true, data: { liked: true } });
    }
  } catch (err) {
    logger.error('POST', '点赞', '切换点赞失败', { postId, userId, error: err.message });
    res.status(500).json({ success: false, message: '操作失败' });
  }
};

const getUsers = async (req, res) => {
  const { postId } = req.params;

  try {
    const posts = await query('SELECT id FROM posts WHERE post_id = ?', [postId]);
    if (posts.length === 0) {
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }

    const users = await query(
      `SELECT u.id, u.nickname, u.avatar_url, u.badge_titles, u.badge_colors, pl.created_at as liked_at
       FROM post_likes pl
       LEFT JOIN users u ON pl.user_id = u.id
       WHERE pl.post_id = ?
       ORDER BY pl.created_at DESC`,
      [posts[0].id]
    );

    const usersWithBadges = await Promise.all(users.map(async u => ({
      userId: u.id,
      nickname: u.nickname || '用户',
      avatar: getFullAvatarUrl(u.avatar_url),
      likedAt: u.liked_at,
      ...(await getBadges(u))
    })));

    res.json({
      success: true,
      data: usersWithBadges
    });
  } catch (err) {
    logger.error('POST', '点赞列表', '获取点赞用户失败', { postId, error: err.message });
    res.status(500).json({ success: false, message: '获取失败' });
  }
};

module.exports = { toggle, getUsers };

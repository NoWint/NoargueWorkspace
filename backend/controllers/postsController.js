const { query } = require('../config/database');
const logger = require('../utils/logger');
const { getProvince } = require('../utils/ipLocator');
const { appendCheckinBadges } = require('../utils/checkinBadgeHelper');

const POST_LOG = 'POST';

async function checkComboAccess(comboId, userId) {
  const { query } = require('./config/database');
  const combos = await query('SELECT user_id FROM combos WHERE id = ?', [comboId]);
  if (combos.length === 0) return false;
  if (combos[0].user_id === userId) return true;
  const member = await query(
    'SELECT id FROM combo_members WHERE combo_id = ? AND user_id = ?',
    [comboId, userId]
  );
  return member.length > 0;
}

const getFullAvatarUrl = (avatarUrl) => {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) return avatarUrl;
  if (avatarUrl.startsWith('/uploads/')) {
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    return `${baseUrl}${avatarUrl}`;
  }
  return null;
};

async function parseBadges(row) {
  const titles = row.badge_titles ? JSON.parse(row.badge_titles) : [];
  const colors = row.badge_colors ? JSON.parse(row.badge_colors) : [];
  const result = await appendCheckinBadges(row.user_id, titles, colors);
  return { badgeTitles: result.badgeTitles, badgeColors: result.badgeColors };
}

async function formatPost(row, userId) {
  const images = row.images ? JSON.parse(row.images) : [];
  const todoIds = row.todo_ids ? JSON.parse(row.todo_ids) : [];
  const locationObj = row.location ? JSON.parse(row.location) : null;
  const viewerIds = row.viewer_ids ? JSON.parse(row.viewer_ids) : [];
  const files = row.files ? JSON.parse(row.files) : [];

  // 若 ip_province 为空但有 ip_address，实时查询补上
  let ipProvince = row.ip_province;
  if (!ipProvince && row.ip_address) {
    ipProvince = getProvince(row.ip_address);
  }

  const badgeData = await parseBadges(row);

  return {
    postId: row.post_id,
    userId: row.user_id,
    title: row.title,
    body: row.body,
    images,
    todoIds,
    shareCode: row.share_code,
    shareComboName: row.share_combo_name || null,
    comboId: row.combo_id || null,
    files,
    ipProvince,
    location: locationObj,
    likesCount: row.likes_count,
    commentsCount: row.comments_count,
    viewsCount: row.views_count,
    isLiked: !!(row.user_like_id),
    isEdited: !!row.is_edited,
    isDeleted: !!row.is_deleted,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    user: {
      id: row.user_id,
      nickname: row.nickname || '用户',
      avatar: getFullAvatarUrl(row.avatar_url),
      ...badgeData
    }
  };
}

const create = async (req, res) => {
  const { postId, title, body, images, todoIds, shareCode, location, comboId, files } = req.body;
  const userId = req.user.id;

  if (!title || title.trim().length === 0) {
    return res.status(400).json({ success: false, message: '标题不能为空' });
  }
  if (title.length > 200) {
    return res.status(400).json({ success: false, message: '标题不能超过200字' });
  }

  if (comboId) {
    const combo = await query('SELECT user_id FROM combos WHERE id = ?', [comboId]);
    if (combo.length === 0) {
      return res.status(404).json({ success: false, message: '组合不存在' });
    }
    if (combo[0].user_id !== userId) {
      const member = await query(
        'SELECT id FROM combo_members WHERE combo_id = ? AND user_id = ?',
        [comboId, userId]
      );
      if (member.length === 0) {
        return res.status(403).json({ success: false, message: '你不是该组合成员' });
      }
    }
  }

  const clientIp = req.headers['x-forwarded-for'] || req.ip;

  try {
    const ipProvince = getProvince(clientIp);

    await query(
      `INSERT INTO posts (post_id, user_id, combo_id, title, body, images, todo_ids, share_code, files, ip_address, ip_province, location)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        postId, userId, comboId || null, title.trim(), body || null,
        images && images.length ? JSON.stringify(images) : null,
        todoIds && todoIds.length ? JSON.stringify(todoIds) : null,
        comboId ? null : (shareCode || null),
        files && files.length ? JSON.stringify(files) : null,
        clientIp,
        ipProvince,
        location ? JSON.stringify(location) : null
      ]
    );

    res.json({ success: true, message: '发布成功' });
  } catch (err) {
    logger.error(POST_LOG, '创建', '发布帖子失败', { userId, error: err.message });
    res.status(500).json({ success: false, message: '发布失败' });
  }
};

const getList = async (req, res) => {
  const userId = req.user.id;
  const { cursor, limit = 20 } = req.query;
  const pageSize = Math.min(parseInt(limit), 50);

  try {
    let cursorWhere = '';
    let params = [userId];
    if (cursor) {
      const parts = cursor.split('_');
      if (parts.length === 2) {
        cursorWhere = 'AND (p.created_at < ? OR (p.created_at = ? AND p.id < ?))';
        params.push(parts[0], parts[0], parts[1]);
      }
    }

    const rows = await query(
      `SELECT p.*, u.nickname, u.avatar_url, u.badge_titles, u.badge_colors,
              c.name as share_combo_name,
              (SELECT id FROM post_likes WHERE post_id = p.id AND user_id = ?) as user_like_id
       FROM posts p
       LEFT JOIN users u ON p.user_id = u.id
       LEFT JOIN combos c ON p.share_code = c.share_code
       WHERE p.is_deleted = 0 AND p.combo_id IS NULL ${cursorWhere}
       ORDER BY p.created_at DESC, p.id DESC
       LIMIT ?`,
      [...params, pageSize + 1]
    );

    const hasMore = rows.length > pageSize;
    if (hasMore) rows.pop();

    const list = await Promise.all(rows.map(row => formatPost(row, userId)));

    const nextCursor = hasMore && rows.length > 0
      ? `${rows[rows.length - 1].created_at}_${rows[rows.length - 1].id}`
      : null;

    res.json({ success: true, data: { list, nextCursor, hasMore } });
  } catch (err) {
    logger.error(POST_LOG, '列表', '获取帖子列表失败', { userId, error: err.message });
    res.status(500).json({ success: false, message: '获取列表失败' });
  }
};

const getById = async (req, res) => {
  const userId = req.user.id;
  const { postId } = req.params;

  try {
    const rows = await query(
      `SELECT p.*, u.nickname, u.avatar_url, u.badge_titles, u.badge_colors,
              c.name as share_combo_name,
              (SELECT id FROM post_likes WHERE post_id = p.id AND user_id = ?) as user_like_id
       FROM posts p
       LEFT JOIN users u ON p.user_id = u.id
       LEFT JOIN combos c ON p.share_code = c.share_code
       WHERE p.post_id = ?`,
      [userId, postId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }

    const post = rows[0];

    if (post.is_deleted) {
      return res.json({ success: true, data: { isDeleted: true, postId } });
    }

    if (post.combo_id) {
      const hasAccess = await checkComboAccess(post.combo_id, userId);
      if (!hasAccess) {
        return res.status(403).json({ success: false, message: '无权查看该帖子' });
      }
    }

    const alreadyViewed = await query(
      'SELECT id FROM post_views WHERE post_id = ? AND user_id = ?',
      [post.id, userId]
    );
    if (alreadyViewed.length === 0) {
      await query('INSERT INTO post_views (post_id, user_id) VALUES (?, ?)', [post.id, userId]);
      await query('UPDATE posts SET views_count = views_count + 1 WHERE post_id = ?', [postId]);
    }

    const viewerIds = post.viewer_ids ? JSON.parse(post.viewer_ids) : [];
    if (!viewerIds.includes(userId)) {
      viewerIds.push(userId);
      await query('UPDATE posts SET viewer_ids = ? WHERE post_id = ?', [JSON.stringify(viewerIds), postId]);
    }

    res.json({ success: true, data: await formatPost(post, userId) });
  } catch (err) {
    logger.error(POST_LOG, '详情', '获取帖子详情失败', { postId, userId, error: err.message });
    res.status(500).json({ success: false, message: '获取详情失败' });
  }
};

const update = async (req, res) => {
  const { postId } = req.params;
  const userId = req.user.id;
  const { title, body, images, todoIds, shareCode, location, files } = req.body;

  try {
    const posts = await query('SELECT * FROM posts WHERE post_id = ?', [postId]);
    if (posts.length === 0) {
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }
    if (posts[0].user_id !== userId) {
      return res.status(403).json({ success: false, message: '无权编辑该帖子' });
    }
    if (posts[0].is_deleted) {
      return res.status(400).json({ success: false, message: '帖子已删除' });
    }

    await query(
      `UPDATE posts SET title = ?, body = ?, images = ?, todo_ids = ?, share_code = ?, files = ?, location = ?, is_edited = 1, updated_at = NOW()
       WHERE post_id = ?`,
      [
        title || posts[0].title,
        body || null,
        images && images.length > 0 ? JSON.stringify(images) : null,
        todoIds && todoIds.length > 0 ? JSON.stringify(todoIds) : null,
        shareCode || null,
        files && files.length > 0 ? JSON.stringify(files) : null,
        location ? JSON.stringify(location) : null,
        postId
      ]
    );

    res.json({ success: true, message: '编辑成功' });
  } catch (err) {
    logger.error(POST_LOG, '编辑', '编辑帖子失败', { postId, userId, error: err.message });
    res.status(500).json({ success: false, message: '编辑失败' });
  }
};

const deletePost = async (req, res) => {
  const { postId } = req.params;
  const userId = req.user.id;

  try {
    const posts = await query('SELECT * FROM posts WHERE post_id = ?', [postId]);
    if (posts.length === 0) {
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }

    const { getAdminIds } = require('./adminController');
    const admins = getAdminIds();
    const isAdmin = admins.includes(userId);

    if (posts[0].user_id !== userId && !isAdmin) {
      return res.status(403).json({ success: false, message: '无权删除该帖子' });
    }

    if (posts[0].files) {
      try {
        const fileList = JSON.parse(posts[0].files);
        const https = require('https');
        for (const f of fileList) {
          if (f.owner_token && f.id) {
            const req = https.request(
              `https://storage.to/api/file/${f.id}`,
              { method: 'DELETE', headers: { 'Authorization': `Owner ${f.owner_token}` } },
              () => {}
            );
            req.on('error', () => {});
            req.end();
          }
        }
      } catch (e) {}
    }

    await query('UPDATE posts SET is_deleted = 1 WHERE post_id = ?', [postId]);

    // Cascade soft-delete: mark all comments on this post as deleted
    await query('UPDATE post_comments SET is_deleted = 1 WHERE post_id = ?', [posts[0].id]);

    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    logger.error(POST_LOG, '删除', '删除帖子失败', { postId, userId, error: err.message });
    res.status(500).json({ success: false, message: '删除失败' });
  }
};

const getVisitors = async (req, res) => {
  const { postId } = req.params;
  const userId = req.user.id;
  const { page = 1, pageSize = 20 } = req.query;

  try {
    const posts = await query('SELECT * FROM posts WHERE post_id = ?', [postId]);
    if (posts.length === 0) {
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }
    if (posts[0].user_id !== userId) {
      return res.status(403).json({ success: false, message: '仅发布者可查看访客记录' });
    }

    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const visitors = await query(
      `SELECT pv.user_id, u.nickname, u.avatar_url, u.badge_titles, u.badge_colors, pv.viewed_at
       FROM post_views pv
       LEFT JOIN users u ON pv.user_id = u.id
       WHERE pv.post_id = ?
       ORDER BY pv.viewed_at DESC
       LIMIT ? OFFSET ?`,
      [posts[0].id, parseInt(pageSize), offset]
    );

    const totalResult = await query(
      'SELECT COUNT(*) as total FROM post_views WHERE post_id = ?',
      [posts[0].id]
    );

    const visitorsWithBadges = await Promise.all(visitors.map(async v => ({
      userId: v.user_id,
      nickname: v.nickname || '用户',
      avatar: getFullAvatarUrl(v.avatar_url),
      viewedAt: v.viewed_at,
      ...(await parseBadges(v))
    })));

    res.json({
      success: true,
      data: {
        list: visitorsWithBadges,
        total: totalResult[0].total,
        hasMore: offset + visitors.length < totalResult[0].total
      }
    });
  } catch (err) {
    logger.error(POST_LOG, '访客', '获取访客记录失败', { postId, userId, error: err.message });
    res.status(500).json({ success: false, message: '获取访客记录失败' });
  }
};

const getUserPosts = async (req, res) => {
  const currentUserId = req.user.id;
  const { userId } = req.params;
  const { cursor, limit = 20 } = req.query;
  const pageSize = Math.min(parseInt(limit) || 20, 50);

  try {
    let cursorWhere = '';
    let params = [currentUserId];
    if (cursor) {
      const parts = cursor.split('_');
      if (parts.length === 2) {
        cursorWhere = 'AND (p.created_at < ? OR (p.created_at = ? AND p.id < ?))';
        params.push(parts[0], parts[0], parts[1]);
      }
    }

    params.push(userId);

    const rows = await query(
      `SELECT p.*, u.nickname, u.avatar_url, u.badge_titles, u.badge_colors,
              c.name as share_combo_name,
              (SELECT id FROM post_likes WHERE post_id = p.id AND user_id = ?) as user_like_id
       FROM posts p
       LEFT JOIN users u ON p.user_id = u.id
       LEFT JOIN combos c ON p.share_code = c.share_code
       WHERE p.is_deleted = 0 AND p.combo_id IS NULL AND p.user_id = ? ${cursorWhere}
       ORDER BY p.created_at DESC, p.id DESC
       LIMIT ?`,
      [...params, pageSize + 1]
    );

    const hasMore = rows.length > pageSize;
    if (hasMore) rows.pop();

    const list = await Promise.all(rows.map(row => formatPost(row, currentUserId)));

    const nextCursor = hasMore && rows.length > 0
      ? `${rows[rows.length - 1].created_at}_${rows[rows.length - 1].id}`
      : null;

    res.json({ success: true, data: { list, nextCursor, hasMore } });
  } catch (err) {
    logger.error(POST_LOG, '用户帖子列表', '获取用户帖子列表失败', { userId, currentUserId, error: err.message });
    res.status(500).json({ success: false, message: '获取用户帖子列表失败' });
  }
}

const getComboPosts = async (req, res) => {
  const userId = req.user.id;
  const { comboId } = req.params;
  const { cursor, limit = 20 } = req.query;
  const pageSize = Math.min(parseInt(limit), 50);

  try {
    const hasAccess = await checkComboAccess(comboId, userId);
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: '你不是该组合成员' });
    }

    let cursorWhere = '';
    let params = [userId];
    if (cursor) {
      const parts = cursor.split('_');
      if (parts.length === 2) {
        cursorWhere = 'AND (p.created_at < ? OR (p.created_at = ? AND p.id < ?))';
        params.push(parts[0], parts[0], parts[1]);
      }
    }

    params.push(comboId);

    const rows = await query(
      `SELECT p.*, u.nickname, u.avatar_url, u.badge_titles, u.badge_colors,
              (SELECT id FROM post_likes WHERE post_id = p.id AND user_id = ?) as user_like_id
       FROM posts p
       LEFT JOIN users u ON p.user_id = u.id
       WHERE p.combo_id = ? AND p.is_deleted = 0 ${cursorWhere}
       ORDER BY p.created_at DESC, p.id DESC
       LIMIT ?`,
      [...params, pageSize + 1]
    );

    const hasMore = rows.length > pageSize;
    if (hasMore) rows.pop();

    const list = await Promise.all(rows.map(row => formatPost(row, userId)));

    const nextCursor = hasMore && rows.length > 0
      ? `${rows[rows.length - 1].created_at}_${rows[rows.length - 1].id}`
      : null;

    res.json({ success: true, data: { list, nextCursor, hasMore } });
  } catch (err) {
    logger.error(POST_LOG, '组合帖子列表', '获取组合帖子列表失败', { comboId, userId, error: err.message });
    res.status(500).json({ success: false, message: '获取列表失败' });
  }
};

module.exports = { create, getList, getById, update, deletePost, getVisitors, getUserPosts, getComboPosts };

const { query } = require('../config/database');
const logger = require('../utils/logger');
const axios = require('axios');

const POST_LOG = 'POST';

const IP_API_KEY = process.env.IP_API_KEY || '';

const getFullAvatarUrl = (avatarUrl) => {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) return avatarUrl;
  if (avatarUrl.startsWith('/uploads/')) {
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    return `${baseUrl}${avatarUrl}`;
  }
  return null;
};

function formatPost(row, userId) {
  const images = row.images ? JSON.parse(row.images) : [];
  const todoIds = row.todo_ids ? JSON.parse(row.todo_ids) : [];
  const locationText = row.location ? (JSON.parse(row.location).text || null) : null;
  const viewerIds = row.viewer_ids ? JSON.parse(row.viewer_ids) : [];

  return {
    postId: row.post_id,
    userId: row.user_id,
    title: row.title,
    body: row.body,
    images,
    todoIds,
    shareCode: row.share_code,
    ipProvince: row.ip_province,
    location: locationText,
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
      avatar: getFullAvatarUrl(row.avatar_url)
    }
  };
}

const create = async (req, res) => {
  const { postId, title, body, images, todoIds, shareCode, location } = req.body;
  const userId = req.user.id;

  if (!title || title.trim().length === 0) {
    return res.status(400).json({ success: false, message: '标题不能为空' });
  }
  if (title.length > 200) {
    return res.status(400).json({ success: false, message: '标题不能超过200字' });
  }

  const clientIp = req.headers['x-forwarded-for'] || req.ip;

  try {
    let ipProvince = null;
    if (clientIp && clientIp !== '127.0.0.1' && clientIp !== '::1') {
      try {
        const ipRes = await axios.get(`https://qryip.market.alicloudapi.com/locateip?ip=${clientIp}`, {
          headers: { 'Authorization': `APPCODE ${IP_API_KEY}` }
        });
        if (ipRes.data && ipRes.data.province) {
          ipProvince = ipRes.data.province;
        }
      } catch (ipErr) {
        logger.warn(POST_LOG, 'IP查询', 'IP归属地查询失败', { error: ipErr.message });
      }
    }

    await query(
      `INSERT INTO posts (post_id, user_id, title, body, images, todo_ids, share_code, ip_address, ip_province, location)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        postId, userId, title.trim(), body || null,
        images && images.length ? JSON.stringify(images) : null,
        todoIds && todoIds.length ? JSON.stringify(todoIds) : null,
        shareCode || null,
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
      `SELECT p.*, u.nickname, u.avatar_url,
              (SELECT id FROM post_likes WHERE post_id = p.id AND user_id = ?) as user_like_id
       FROM posts p
       LEFT JOIN users u ON p.user_id = u.id
       WHERE p.is_deleted = 0 ${cursorWhere}
       ORDER BY p.created_at DESC, p.id DESC
       LIMIT ?`,
      [...params, pageSize + 1]
    );

    const hasMore = rows.length > pageSize;
    if (hasMore) rows.pop();

    const list = rows.map(row => formatPost(row, userId));

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
      `SELECT p.*, u.nickname, u.avatar_url,
              (SELECT id FROM post_likes WHERE post_id = p.id AND user_id = ?) as user_like_id
       FROM posts p
       LEFT JOIN users u ON p.user_id = u.id
       WHERE p.post_id = ?`,
      [userId, postId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }

    const post = rows[0];

    if (!post.is_deleted) {
      await query('UPDATE posts SET views_count = views_count + 1 WHERE post_id = ?', [postId]);

      const alreadyViewed = await query(
        'SELECT id FROM post_views WHERE post_id = ? AND user_id = ?',
        [post.id, userId]
      );
      if (alreadyViewed.length === 0) {
        await query('INSERT INTO post_views (post_id, user_id) VALUES (?, ?)', [post.id, userId]);
      }

      const viewerIds = post.viewer_ids ? JSON.parse(post.viewer_ids) : [];
      if (!viewerIds.includes(userId)) {
        viewerIds.push(userId);
        await query('UPDATE posts SET viewer_ids = ? WHERE post_id = ?', [JSON.stringify(viewerIds), postId]);
      }
    }

    res.json({ success: true, data: formatPost(post, userId) });
  } catch (err) {
    logger.error(POST_LOG, '详情', '获取帖子详情失败', { postId, userId, error: err.message });
    res.status(500).json({ success: false, message: '获取详情失败' });
  }
};

const update = async (req, res) => {
  const { postId } = req.params;
  const userId = req.user.id;
  const { title, body, images, todoIds, shareCode, location } = req.body;

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
      `UPDATE posts SET title = ?, body = ?, images = ?, todo_ids = ?, share_code = ?, location = ?, is_edited = 1, updated_at = NOW()
       WHERE post_id = ?`,
      [
        title || posts[0].title,
        body || null,
        images ? JSON.stringify(images) : posts[0].images,
        todoIds ? JSON.stringify(todoIds) : posts[0].todo_ids,
        shareCode || posts[0].share_code,
        location ? JSON.stringify(location) : posts[0].location,
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

    await query('UPDATE posts SET is_deleted = 1 WHERE post_id = ?', [postId]);
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
      `SELECT pv.user_id, u.nickname, u.avatar_url, pv.viewed_at
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

    res.json({
      success: true,
      data: {
        list: visitors.map(v => ({
          userId: v.user_id,
          nickname: v.nickname || '用户',
          avatar: getFullAvatarUrl(v.avatar_url),
          viewedAt: v.viewed_at
        })),
        total: totalResult[0].total,
        hasMore: offset + visitors.length < totalResult[0].total
      }
    });
  } catch (err) {
    logger.error(POST_LOG, '访客', '获取访客记录失败', { postId, userId, error: err.message });
    res.status(500).json({ success: false, message: '获取访客记录失败' });
  }
};

module.exports = { create, getList, getById, update, deletePost, getVisitors };

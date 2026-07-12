const crypto = require('crypto');
const { query } = require('../config/database');
const logger = require('../utils/logger');

function generateShareId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 12; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

const createSnapshot = async (req, res) => {
  const userId = req.user.id;
  const { todo, subtasks, options = {} } = req.body;

  if (!todo || !todo.text) {
    return res.status(400).json({
      success: false,
      message: '待办数据不能为空'
    });
  }

  try {
    const shareId = generateShareId();
    const expiryMap = { '1h': 1, '6h': 6, '24h': 24, '3d': 72, '7d': 168 };
    const hours = expiryMap[options.expiry] || 24;
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
    const { password, maxViews, remark, allowCopy, trackVisitors } = options;
    let todoId = null;
    if (todo && todo.id) {
      const parsed = parseInt(todo.id);
      if (!isNaN(parsed)) {
        todoId = parsed;
      }
    }

    await query(
      `INSERT INTO share_snapshots (share_id, user_id, todo_id, data, expires_at, password, max_views, remark, allow_copy, track_visitors)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [shareId, userId, todoId, JSON.stringify({ todo, subtasks }), expiresAt,
       password ? crypto.createHash('sha256').update(password).digest('hex') : null,
       parseInt(maxViews) || null, remark || null,
       allowCopy !== false ? 1 : 0,
       trackVisitors ? 1 : 0]
    );

    res.json({ success: true, shareId });
  } catch (err) {
    console.error('createSnapshot error:', err);
    logger.dbError('分享', '创建分享快照失败', { userId, error: err.message, sql: err.sql, code: err.code });
    res.status(500).json({
      success: false,
      message: err.message || '服务器错误'
    });
  }
};

const getSnapshot = async (req, res) => {
  const { shareId } = req.params;

  try {
    // 先查分享是否存在，独立于过期/撤回状态
    const existing = await query(
      'SELECT revoked, expires_at FROM share_snapshots WHERE share_id = ?',
      [shareId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: '分享不存在' });
    }

    if (existing[0].revoked) {
      return res.status(410).json({
        success: false, revoked: true,
        message: '该分享已被发布者撤回'
      });
    }

    if (new Date(existing[0].expires_at) < new Date()) {
      return res.status(404).json({ success: false, message: '分享已过期' });
    }

    // 分享有效，拉取完整数据
    const snapshots = await query(
      `SELECT data, password, max_views, current_views,
              track_visitors, remark, allow_copy, user_id AS owner_id
       FROM share_snapshots WHERE share_id = ?`,
      [shareId]
    );

    const snapshot = snapshots[0];

    // 设置了密码，返回 needPassword（不计数查看次数）
    if (snapshot.password) {
      return res.json({
        success: true, needPassword: true, shareId,
        remark: snapshot.remark, allowCopy: !!snapshot.allow_copy
      });
    }

    // 原子更新：只在未超过上限时计数
    const result = await query(
      'UPDATE share_snapshots SET current_views = current_views + 1 WHERE share_id = ? AND (max_views IS NULL OR current_views < max_views)',
      [shareId]
    );
    if (result.affectedRows === 0) {
      return res.status(403).json({ success: false, message: '分享已超过最大查看次数' });
    }

    if (snapshot.track_visitors) {
      const visitorIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown';
      const visitorUserId = req.user?.id || null;
      await query(
        'INSERT INTO share_visitors (share_id, visitor_ip, visitor_user_id, action) VALUES (?, ?, ?, ?)',
        [shareId, visitorIp, visitorUserId, 'view']
      );
    }

    res.json({
      success: true,
      data: JSON.parse(snapshot.data),
      remark: snapshot.remark,
      allowCopy: !!snapshot.allow_copy,
      trackVisitors: !!snapshot.track_visitors
    });
  } catch (err) {
    logger.dbError('分享', '获取分享快照失败', { shareId, error: err.message });
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

const revokeSnapshot = async (req, res) => {
  const userId = req.user.id;
  const { shareId } = req.params;

  try {
    const result = await query(
      'UPDATE share_snapshots SET revoked = TRUE WHERE share_id = ? AND user_id = ?',
      [shareId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: '分享不存在或无权撤回'
      });
    }

    res.json({ success: true, message: '分享已撤回' });
  } catch (err) {
    logger.dbError('分享', '撤回分享失败', { shareId, userId, error: err.message });
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

const verifyPassword = async (req, res) => {
  const { shareId } = req.params;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ success: false, message: '请输入密码' });
  }

  try {
    // 先检查分享状态
    const existing = await query(
      'SELECT revoked, expires_at FROM share_snapshots WHERE share_id = ?',
      [shareId]
    );
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: '分享不存在' });
    }
    if (existing[0].revoked) {
      return res.status(410).json({ success: false, revoked: true, message: '该分享已被发布者撤回' });
    }
    if (new Date(existing[0].expires_at) < new Date()) {
      return res.status(404).json({ success: false, message: '分享已过期' });
    }

    const snapshots = await query(
      `SELECT password, data, max_views, current_views, track_visitors
       FROM share_snapshots WHERE share_id = ?`,
      [shareId]
    );
    const hashed = crypto.createHash('sha256').update(password).digest('hex');
    if (snapshots[0].password !== hashed) {
      return res.status(403).json({ success: false, message: '密码错误' });
    }

    // 原子更新：只在未超过上限时计数
    const result = await query(
      'UPDATE share_snapshots SET current_views = current_views + 1 WHERE share_id = ? AND (max_views IS NULL OR current_views < max_views)',
      [shareId]
    );
    if (result.affectedRows === 0) {
      return res.status(403).json({ success: false, message: '分享已超过最大查看次数' });
    }

    if (snapshots[0].track_visitors) {
      const visitorIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown';
      const visitorUserId = req.user?.id || null;
      await query(
        'INSERT INTO share_visitors (share_id, visitor_ip, visitor_user_id, action) VALUES (?, ?, ?, ?)',
        [shareId, visitorIp, visitorUserId, 'view']
      );
    }

    res.json({ success: true, data: JSON.parse(snapshots[0].data) });
  } catch (err) {
    logger.dbError('分享', '验证密码失败', { shareId, error: err.message });
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

const recordAddAction = async (req, res) => {
  const { shareId } = req.params;
  try {
    const snapshots = await query(
      'SELECT track_visitors FROM share_snapshots WHERE share_id = ?',
      [shareId]
    );
    if (snapshots.length === 0 || !snapshots[0].track_visitors) {
      return res.json({ success: true });
    }
    const visitorIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown';
    const visitorUserId = req.user?.id || null;
    await query(
      'INSERT INTO share_visitors (share_id, visitor_ip, visitor_user_id, action) VALUES (?, ?, ?, ?)',
      [shareId, visitorIp, visitorUserId, 'add']
    );
    res.json({ success: true });
  } catch (err) {
    logger.dbError('分享', '记录访客添加失败', { shareId, error: err.message });
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

const batchMetadata = async (req, res) => {
  const userId = req.user.id;
  const { shareIds } = req.body;

  if (!Array.isArray(shareIds) || shareIds.length === 0) {
    return res.json({ success: true, data: [] });
  }

  try {
    const placeholders = shareIds.map(() => '?').join(',');
    const rows = await query(
      `SELECT share_id, remark, expires_at, created_at, current_views, max_views,
              password IS NOT NULL AS has_password, allow_copy
       FROM share_snapshots
       WHERE share_id IN (${placeholders}) AND user_id = ? AND revoked = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC`,
      [...shareIds, userId]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    logger.dbError('分享', '批量查询分享元数据失败', { shareIds, userId, error: err.message });
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

const listByTodo = async (req, res) => {
  const userId = req.user.id;
  const { todoId } = req.params;

  try {
    const snapshots = await query(
      `SELECT share_id, remark, expires_at, created_at, current_views, max_views,
              password IS NOT NULL AS has_password, allow_copy
       FROM share_snapshots
       WHERE todo_id = ? AND user_id = ? AND revoked = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC`,
      [todoId, userId]
    );

    res.json({ success: true, data: snapshots });
  } catch (err) {
    logger.dbError('分享', '获取待办分享列表失败', { todoId, userId, error: err.message });
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

const getVisitors = async (req, res) => {
  const userId = req.user.id;
  const { shareId } = req.params;
  try {
    const snapshots = await query(
      'SELECT user_id FROM share_snapshots WHERE share_id = ?',
      [shareId]
    );
    if (snapshots.length === 0) return res.status(404).json({ success: false, message: '分享不存在' });
    if (snapshots[0].user_id !== userId) return res.status(403).json({ success: false, message: '无权查看' });

    const visitors = await query(
      `SELECT v.id, v.visitor_ip, v.visitor_user_id, v.action, v.created_at,
              u.nickname AS visitor_nickname
       FROM share_visitors v
       LEFT JOIN users u ON v.visitor_user_id = u.id
       WHERE v.share_id = ?
       ORDER BY v.created_at DESC LIMIT 200`,
      [shareId]
    );
    res.json({ success: true, data: visitors });
  } catch (err) {
    logger.dbError('分享', '获取访客记录失败', { shareId, userId, error: err.message });
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

module.exports = {
  createSnapshot,
  getSnapshot,
  revokeSnapshot,
  verifyPassword,
  recordAddAction,
  getVisitors,
  listByTodo,
  batchMetadata
};

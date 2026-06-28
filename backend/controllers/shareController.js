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
  const { todo, subtasks } = req.body;

  if (!todo || !todo.text) {
    return res.status(400).json({
      success: false,
      message: '待办数据不能为空'
    });
  }

  try {
    const shareId = generateShareId();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await query(
      'INSERT INTO share_snapshots (share_id, user_id, data, expires_at) VALUES (?, ?, ?, ?)',
      [shareId, userId, JSON.stringify({ todo, subtasks }), expiresAt]
    );

    res.json({ success: true, shareId });
  } catch (err) {
    logger.dbError('分享', '创建分享快照失败', { userId, error: err.message });
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

const getSnapshot = async (req, res) => {
  const { shareId } = req.params;

  try {
    const snapshots = await query(
      'SELECT data, revoked FROM share_snapshots WHERE share_id = ? AND expires_at > NOW()',
      [shareId]
    );

    if (snapshots.length === 0) {
      return res.status(404).json({
        success: false,
        message: '分享已过期或不存在'
      });
    }

    const snapshot = snapshots[0];
    if (snapshot.revoked) {
      return res.status(410).json({
        success: false,
        revoked: true,
        message: '该分享已被发布者撤回'
      });
    }

    res.json({ success: true, data: JSON.parse(snapshot.data) });
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

module.exports = {
  createSnapshot,
  getSnapshot,
  revokeSnapshot
};

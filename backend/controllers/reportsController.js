const { query } = require('../config/database');
const logger = require('../utils/logger');
const { sendReportResultMessage } = require('../services/wechatService');

const create = async (req, res) => {
  const userId = req.user.id;
  const { targetType, targetId, reason, detail } = req.body;

  if (!targetType || !targetId || !reason) {
    return res.status(400).json({ success: false, message: '缺少必要参数' });
  }
  if (!['post', 'comment'].includes(targetType)) {
    return res.status(400).json({ success: false, message: '无效的举报类型' });
  }
  const validReasons = ['垃圾广告', '色情低俗', '人身攻击', '违法信息', '其他'];
  if (!validReasons.includes(reason)) {
    return res.status(400).json({ success: false, message: '无效的举报原因' });
  }

  try {
    let targetContent = '';
    if (targetType === 'post') {
      const posts = await query('SELECT title, body FROM posts WHERE post_id = ?', [targetId]);
      if (posts.length > 0) {
        targetContent = posts[0].title + (posts[0].body ? ' - ' + posts[0].body : '');
      }
    } else {
      const comments = await query('SELECT content FROM post_comments WHERE id = ?', [targetId]);
      if (comments.length > 0) {
        targetContent = comments[0].content;
      }
    }

    await query(
      `INSERT INTO reports (user_id, target_type, target_id, target_content, reason, detail)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, targetType, targetId, targetContent.substring(0, 200), reason, detail || null]
    );

    res.json({ success: true, message: '举报已提交' });
  } catch (err) {
    logger.adminError('举报', '提交举报失败', { userId, targetType, targetId, error: err.message });
    res.status(500).json({ success: false, message: '提交举报失败' });
  }
};

const getMyReports = async (req, res) => {
  const userId = req.user.id;

  try {
    const reports = await query(
      'SELECT * FROM reports WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    const statusMap = { 0: '待处理', 1: '已处理', 2: '已驳回' };

    res.json({
      success: true,
      data: reports.map(r => ({
        id: r.id,
        targetType: r.target_type,
        targetId: r.target_id,
        targetContent: r.target_content,
        reason: r.reason,
        detail: r.detail,
        status: r.status,
        statusText: statusMap[r.status] || '未知',
        resultNote: r.result_note,
        createdAt: r.created_at,
        processedAt: r.processed_at
      }))
    });
  } catch (err) {
    logger.adminError('举报列表', '获取我的举报失败', { userId, error: err.message });
    res.status(500).json({ success: false, message: '获取举报记录失败' });
  }
};

const getList = async (req, res) => {
  const { status, page = 1, pageSize = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);

  try {
    let whereClause = '';
    let params = [];
    if (status !== undefined && status !== '') {
      whereClause = 'WHERE r.status = ?';
      params.push(parseInt(status));
    }

    const totalResult = await query(
      'SELECT COUNT(*) as total FROM reports r ' + whereClause, params
    );

    const reports = await query(
      `SELECT r.*, u.nickname as reporter_nickname, pu.nickname as processor_nickname
       FROM reports r
       LEFT JOIN users u ON r.user_id = u.id
       LEFT JOIN users pu ON r.processed_by = pu.id
       ${whereClause}
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(pageSize), offset]
    );

    const statusMap = { 0: '待处理', 1: '已处理', 2: '已驳回' };

    res.json({
      success: true,
      data: {
        list: reports.map(r => ({
          id: r.id,
          userId: r.user_id,
          reporterNickname: r.reporter_nickname || '用户',
          targetType: r.target_type,
          targetId: r.target_id,
          targetContent: r.target_content,
          reason: r.reason,
          detail: r.detail,
          status: r.status,
          statusText: statusMap[r.status] || '未知',
          resultNote: r.result_note,
          processorNickname: r.processor_nickname,
          createdAt: r.created_at,
          processedAt: r.processed_at
        })),
        total: totalResult[0].total,
        hasMore: offset + reports.length < totalResult[0].total
      }
    });
  } catch (err) {
    logger.adminError('举报管理', '获取举报列表失败', { error: err.message });
    res.status(500).json({ success: false, message: '获取举报列表失败' });
  }
};

const getDetail = async (req, res) => {
  const { id } = req.params;

  try {
    const reports = await query(
      `SELECT r.*, u.nickname as reporter_nickname
       FROM reports r
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.id = ?`,
      [id]
    );

    if (reports.length === 0) {
      return res.status(404).json({ success: false, message: '举报不存在' });
    }

    const r = reports[0];
    const statusMap = { 0: '待处理', 1: '已处理', 2: '已驳回' };

    res.json({
      success: true,
      data: {
        id: r.id,
        userId: r.user_id,
        reporterNickname: r.reporter_nickname || '用户',
        targetType: r.target_type,
        targetId: r.target_id,
        targetContent: r.target_content,
        reason: r.reason,
        detail: r.detail,
        status: r.status,
        statusText: statusMap[r.status] || '未知',
        resultNote: r.result_note,
        processedBy: r.processed_by,
        createdAt: r.created_at,
        processedAt: r.processed_at
      }
    });
  } catch (err) {
    logger.adminError('举报详情', '获取举报详情失败', { id, error: err.message });
    res.status(500).json({ success: false, message: '获取举报详情失败' });
  }
};

const processReport = async (req, res) => {
  const { id } = req.params;
  const adminId = req.user.id;
  const { action, resultNote } = req.body;

  try {
    const reports = await query('SELECT * FROM reports WHERE id = ?', [id]);
    if (reports.length === 0) {
      return res.status(404).json({ success: false, message: '举报不存在' });
    }

    const report = reports[0];

    if (action === 'delete') {
      if (report.target_type === 'post') {
        await query('UPDATE posts SET is_deleted = 1 WHERE post_id = ?', [report.target_id]);
      } else if (report.target_type === 'comment') {
        await query('UPDATE post_comments SET is_deleted = 1 WHERE id = ?', [report.target_id]);
      }
    }

    await query(
      'UPDATE reports SET status = ?, result_note = ?, processed_by = ?, processed_at = NOW() WHERE id = ?',
      [action === 'delete' ? 1 : 2, resultNote || null, adminId, id]
    );

    // Send notification to reporter
    try {
      const reporters = await query('SELECT openid FROM users WHERE id = ?', [report.user_id]);
      if (reporters.length > 0) {
        await sendReportResultMessage(reporters[0].openid, {
          title: report.target_content || '举报内容',
          reason: report.reason,
          targetType: report.target_type === 'post' ? '帖子' : '评论',
          result: (action === 'delete' ? '已处理（内容已删除）' : '已驳回') + (resultNote ? '，' + resultNote : ''),
          processedAt: new Date().toISOString()
        });
      }
    } catch (notifyErr) {
      logger.warn('ADMIN', '举报通知', '发送举报结果通知失败', { error: notifyErr.message });
    }

    res.json({ success: true, message: '处理成功' });
  } catch (err) {
    logger.adminError('举报处理', '处理举报失败', { id, adminId, error: err.message });
    res.status(500).json({ success: false, message: '处理失败' });
  }
};

module.exports = { create, getMyReports, getList, getDetail, processReport };

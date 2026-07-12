const { query } = require('../config/database');
const logger = require('../utils/logger');
const { appendCheckinBadges } = require('../utils/checkinBadgeHelper');

const getFullAvatarUrl = (avatarUrl) => {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    return avatarUrl;
  }
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

const checkMembership = async (userId, sharedTodoId) => {
  const results = await query(
    `SELECT cm.role, cm.combo_id 
     FROM combo_members cm
     JOIN shared_todos st ON st.combo_id = cm.combo_id
     WHERE cm.user_id = ? AND st.id = ?`,
    [userId, sharedTodoId]
  );
  return results.length > 0 ? results[0] : null;
};

const getComments = async (req, res) => {
  const { sharedTodoId } = req.params;
  const { page = 1, size = 20 } = req.query;
  const userId = req.user.id;
  const pageNum = parseInt(page);
  const pageSize = parseInt(size);
  const offset = (pageNum - 1) * pageSize;

  try {
    const membership = await checkMembership(userId, sharedTodoId);
    if (!membership) {
      return res.status(403).json({
        success: false,
        message: '无权查看该待办的评论'
      });
    }

    const comboId = membership.combo_id;

    const totalResult = await query(
      `SELECT COUNT(*) as total FROM shared_todo_comments 
       WHERE shared_todo_id = ? AND is_deleted = 0`,
      [sharedTodoId]
    );
    const total = totalResult[0].total;

    const sharedTodoInfo = await query(
      'SELECT creator_id FROM shared_todos WHERE id = ?',
      [sharedTodoId]
    );
    const creatorId = sharedTodoInfo.length > 0 ? sharedTodoInfo[0].creator_id : null;

    const mainComments = await query(
      `SELECT c.*, u.nickname, u.avatar_url, u.badge_titles, u.badge_colors,
              cm.role as combo_role,
              sta.completed_at as assignment_completed_at
       FROM shared_todo_comments c
       LEFT JOIN users u ON c.user_id = u.id
       LEFT JOIN combo_members cm ON cm.combo_id = ? AND cm.user_id = c.user_id
       LEFT JOIN shared_todo_assignments sta ON sta.shared_todo_id = ? AND sta.user_id = c.user_id
       WHERE c.shared_todo_id = ? AND c.is_deleted = 0 AND c.parent_id IS NULL
       ORDER BY c.created_at DESC
       LIMIT ? OFFSET ?`,
      [comboId, sharedTodoId, sharedTodoId, pageSize, offset]
    );

    const commentIds = mainComments.map(c => c.id);
    let replies = [];
    if (commentIds.length > 0) {
      replies = await query(
        `SELECT c.*, u.nickname, u.avatar_url, u.badge_titles, u.badge_colors,
                ru.nickname as reply_to_nickname,
                cm.role as combo_role,
                sta.completed_at as assignment_completed_at
         FROM shared_todo_comments c
         LEFT JOIN users u ON c.user_id = u.id
         LEFT JOIN users ru ON c.reply_to_user_id = ru.id
         LEFT JOIN combo_members cm ON cm.combo_id = ? AND cm.user_id = c.user_id
         LEFT JOIN shared_todo_assignments sta ON sta.shared_todo_id = ? AND sta.user_id = c.user_id
         WHERE c.parent_id IN (?) AND c.is_deleted = 0
         ORDER BY c.created_at ASC`,
        [comboId, sharedTodoId, commentIds]
      );
    }

    const getTodoRole = (commentUserId, assignmentCompletedAt) => {
      if (commentUserId === creatorId) {
        return 'creator';
      }
      if (assignmentCompletedAt) {
        return 'completed';
      }
      if (assignmentCompletedAt === null && assignmentCompletedAt !== undefined) {
        return 'uncompleted';
      }
      return null;
    };

    // Build replyMap with async badge processing
    const replyMap = {};
    await Promise.all(replies.map(async r => {
      if (!replyMap[r.parent_id]) {
        replyMap[r.parent_id] = [];
      }
      const badgeData = await getBadges(r);
      replyMap[r.parent_id].push({
        id: r.id,
        parentId: r.parent_id,
        content: r.content,
        createdAt: r.created_at,
        user: {
          id: r.user_id,
          nickname: r.nickname || '用户',
          avatar: getFullAvatarUrl(r.avatar_url),
          ...badgeData
        },
        comboRole: r.combo_role || 'member',
        todoRole: getTodoRole(r.user_id, r.assignment_completed_at),
        replyToUser: r.reply_to_user_id ? {
          id: r.reply_to_user_id,
          nickname: r.reply_to_nickname || '用户'
        } : null,
        canDelete: r.user_id === userId || membership.role === 'owner' || membership.role === 'admin'
      });
    }));

    const comments = await Promise.all(mainComments.map(async c => {
      const badgeData = await getBadges(c);
      return {
        id: c.id,
        sharedTodoId: c.shared_todo_id,
        content: c.content,
        parentId: c.parent_id,
        createdAt: c.created_at,
        user: {
          id: c.user_id,
          nickname: c.nickname || '用户',
          avatar: getFullAvatarUrl(c.avatar_url),
          ...badgeData
        },
        comboRole: c.combo_role || 'member',
        todoRole: getTodoRole(c.user_id, c.assignment_completed_at),
        canDelete: c.user_id === userId || membership.role === 'owner' || membership.role === 'admin',
        replies: replyMap[c.parent_id] || replyMap[c.id] || []
      };
    }));

    res.json({
      success: true,
      data: {
        list: comments,
        total,
        hasMore: offset + mainComments.length < total
      }
    });
  } catch (err) {
    logger.commentError('获取', '获取评论失败', { sharedTodoId, userId, error: err.message });
    res.status(500).json({
      success: false,
      message: '获取评论失败'
    });
  }
};

const createComment = async (req, res) => {
  const { sharedTodoId } = req.params;
  const { content, parentId, replyToUserId } = req.body;
  const userId = req.user.id;

  if (!content || content.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: '评论内容不能为空'
    });
  }

  if (content.length > 500) {
    return res.status(400).json({
      success: false,
      message: '评论内容不能超过500字'
    });
  }

  try {
    const membership = await checkMembership(userId, sharedTodoId);
    if (!membership) {
      return res.status(403).json({
        success: false,
        message: '无权在该待办下评论'
      });
    }

    if (parentId) {
      const parentComment = await query(
        'SELECT id, shared_todo_id FROM shared_todo_comments WHERE id = ? AND is_deleted = 0',
        [parentId]
      );
      if (parentComment.length === 0) {
        return res.status(400).json({
          success: false,
          message: '回复的评论不存在'
        });
      }
      if (parentComment[0].shared_todo_id !== parseInt(sharedTodoId)) {
        return res.status(400).json({
          success: false,
          message: '评论不匹配'
        });
      }
    }

    const result = await query(
      `INSERT INTO shared_todo_comments (shared_todo_id, user_id, content, parent_id, reply_to_user_id) 
       VALUES (?, ?, ?, ?, ?)`,
      [sharedTodoId, userId, content.trim(), parentId || null, replyToUserId || null]
    );

    const newComment = await query(
      'SELECT * FROM shared_todo_comments WHERE id = ?',
      [result.insertId]
    );

    res.json({
      success: true,
      data: {
        id: result.insertId,
        createdAt: newComment[0].created_at
      }
    });
  } catch (err) {
    logger.commentError('发表', '发表评论失败', { sharedTodoId, userId, error: err.message });
    res.status(500).json({
      success: false,
      message: '发表评论失败'
    });
  }
};

const deleteComment = async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user.id;

  try {
    const comments = await query(
      `SELECT c.*, st.combo_id 
       FROM shared_todo_comments c
       JOIN shared_todos st ON st.id = c.shared_todo_id
       WHERE c.id = ?`,
      [commentId]
    );

    if (comments.length === 0) {
      return res.status(404).json({
        success: false,
        message: '评论不存在'
      });
    }

    const comment = comments[0];

    if (comment.is_deleted) {
      return res.status(400).json({
        success: false,
        message: '评论已删除'
      });
    }

    const membership = await query(
      'SELECT role FROM combo_members WHERE combo_id = ? AND user_id = ?',
      [comment.combo_id, userId]
    );

    const isAdmin = membership.length > 0 && 
                   (membership[0].role === 'owner' || membership[0].role === 'admin');

    if (comment.user_id !== userId && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: '无权删除该评论'
      });
    }

    await query(
      'UPDATE shared_todo_comments SET is_deleted = 1 WHERE id = ?',
      [commentId]
    );

    if (comment.parent_id) {
      await query(
        'UPDATE shared_todo_comments SET is_deleted = 1 WHERE parent_id = ?',
        [commentId]
      );
    }

    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (err) {
    logger.commentError('删除', '删除评论失败', { commentId, userId, error: err.message });
    res.status(500).json({
      success: false,
      message: '删除评论失败'
    });
  }
};

module.exports = {
  getComments,
  createComment,
  deleteComment
};

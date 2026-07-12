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

const getList = async (req, res) => {
  const { postId } = req.params;
  const userId = req.user.id;
  const { cursor, limit = 20 } = req.query;
  const pageSize = Math.min(parseInt(limit), 50);

  try {
    const posts = await query('SELECT id FROM posts WHERE post_id = ?', [postId]);
    if (posts.length === 0) {
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }
    const postDbId = posts[0].id;

    const postsTable = await query('SELECT user_id FROM posts WHERE post_id = ?', [postId]);
    const postCreatorId = postsTable[0].user_id;

    let cursorWhere = '';
    let params = [];
    if (cursor) {
      cursorWhere = 'AND c.id < ?';
      params = [parseInt(cursor)];
    }

    const mainComments = await query(
      `SELECT c.*, u.nickname, u.avatar_url, u.badge_titles, u.badge_colors,
              (SELECT id FROM post_comment_likes WHERE comment_id = c.id AND user_id = ?) as user_like_id
       FROM post_comments c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.post_id = ? AND c.parent_id IS NULL AND c.is_deleted = 0 ${cursorWhere}
       ORDER BY c.created_at DESC
       LIMIT ?`,
      [userId, postDbId, ...params, pageSize + 1]
    );

    const hasMore = mainComments.length > pageSize;
    if (hasMore) mainComments.pop();

    let allReplies = [];
    const replies = await query(
      `SELECT c.*, u.nickname, u.avatar_url, u.badge_titles, u.badge_colors,
              ru.nickname as reply_to_nickname,
              (SELECT id FROM post_comment_likes WHERE comment_id = c.id AND user_id = ?) as user_like_id
       FROM post_comments c
       LEFT JOIN users u ON c.user_id = u.id
       LEFT JOIN users ru ON c.reply_to_user_id = ru.id
       WHERE c.post_id = ? AND c.parent_id IS NOT NULL AND c.is_deleted = 0
       ORDER BY c.created_at ASC`,
      [userId, postDbId]
    );
    // buildTree handles all nesting levels from flat reply list
    allReplies = replies;

    // Build nested tree (max 3 levels deep)
    async function buildTree(comments, parentId, depth = 0) {
      if (depth >= 3) return [];
      const filtered = comments.filter(c => c.parent_id === parentId);
      return Promise.all(filtered.map(async c => {
        const badgeData = await getBadges(c);
        return {
          id: c.id,
          postId: c.post_id,
          content: c.content,
          images: c.images ? JSON.parse(c.images) : [],
          parentId: c.parent_id,
          replyToUser: c.reply_to_user_id ? {
            id: c.reply_to_user_id,
            nickname: c.reply_to_nickname || '用户'
          } : null,
          replyToContent: c.reply_to_content,
          likesCount: c.likes_count,
          isLiked: !!c.user_like_id,
          createdAt: c.created_at,
          isDeleted: !!c.is_deleted,
          user: {
            id: c.user_id,
            nickname: c.nickname || '用户',
            avatar: getFullAvatarUrl(c.avatar_url),
            ...badgeData
          },
          canDelete: c.user_id === userId || postCreatorId === userId,
          replies: await buildTree(comments, c.id, depth + 1)
        };
      }));
    }

    const rootComments = await Promise.all(mainComments.map(async c => {
      const badgeData = await getBadges(c);
      return {
        id: c.id,
        postId: c.post_id,
        content: c.content,
        images: c.images ? JSON.parse(c.images) : [],
        parentId: c.parent_id,
        replyToUser: null,
        replyToContent: null,
        likesCount: c.likes_count,
        isLiked: !!c.user_like_id,
        createdAt: c.created_at,
        isDeleted: !!c.is_deleted,
        user: {
          id: c.user_id,
          nickname: c.nickname || '用户',
          avatar: getFullAvatarUrl(c.avatar_url),
          ...badgeData
        },
        canDelete: c.user_id === userId || postCreatorId === userId,
        replies: await buildTree(allReplies, c.id, 1)
      };
    }));

    const nextCursor = hasMore && mainComments.length > 0
      ? String(mainComments[mainComments.length - 1].id)
      : null;

    res.json({ success: true, data: { list: rootComments, nextCursor, hasMore } });
  } catch (err) {
    logger.commentError('获取', '获取帖子评论失败', { postId, userId, error: err.message });
    res.status(500).json({ success: false, message: '获取评论失败' });
  }
};

const create = async (req, res) => {
  const { postId } = req.params;
  const userId = req.user.id;
  const { content, images, parentId, replyToUserId, replyToContent } = req.body;

  if ((!content || content.trim().length === 0) && (!images || images.length === 0)) {
    return res.status(400).json({ success: false, message: '评论内容不能为空' });
  }
  if (content && content.length > 500) {
    return res.status(400).json({ success: false, message: '评论内容不能超过500字' });
  }

  try {
    const posts = await query('SELECT id FROM posts WHERE post_id = ? AND is_deleted = 0', [postId]);
    if (posts.length === 0) {
      return res.status(404).json({ success: false, message: '帖子不存在或已删除' });
    }
    const postDbId = posts[0].id;

    if (parentId) {
      const parentComment = await query(
        'SELECT id, post_id FROM post_comments WHERE id = ? AND is_deleted = 0',
        [parentId]
      );
      if (parentComment.length === 0) {
        return res.status(400).json({ success: false, message: '回复的评论不存在' });
      }
      if (parentComment[0].post_id !== postDbId) {
        return res.status(400).json({ success: false, message: '评论不匹配' });
      }
    }

    const result = await query(
      `INSERT INTO post_comments (post_id, user_id, content, images, parent_id, reply_to_user_id, reply_to_content)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        postDbId, userId, (content || '').trim(),
        images && images.length ? JSON.stringify(images) : null,
        parentId || null, replyToUserId || null, replyToContent || null
      ]
    );

    await query('UPDATE posts SET comments_count = comments_count + 1 WHERE id = ?', [postDbId]);

    const newComment = await query('SELECT * FROM post_comments WHERE id = ?', [result.insertId]);

    res.json({
      success: true,
      data: { id: result.insertId, createdAt: newComment[0].created_at }
    });
  } catch (err) {
    logger.commentError('发表', '发表评论失败', { postId, userId, error: err.message });
    res.status(500).json({ success: false, message: '发表评论失败' });
  }
};

const deleteComment = async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user.id;

  try {
    const comments = await query(
      `SELECT c.*, p.user_id as post_creator_id
       FROM post_comments c
       JOIN posts p ON p.id = c.post_id
       WHERE c.id = ?`,
      [commentId]
    );

    if (comments.length === 0) {
      return res.status(404).json({ success: false, message: '评论不存在' });
    }

    const comment = comments[0];
    if (comment.user_id !== userId && comment.post_creator_id !== userId) {
      return res.status(403).json({ success: false, message: '无权删除该评论' });
    }

    await query('UPDATE post_comments SET is_deleted = 1 WHERE id = ?', [commentId]);
    await query('UPDATE posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = ?', [comment.post_id]);

    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    logger.commentError('删除', '删除评论失败', { commentId, userId, error: err.message });
    res.status(500).json({ success: false, message: '删除评论失败' });
  }
};

const toggleLike = async (req, res) => {
  const userId = req.user.id;
  const { commentId } = req.params;

  try {
    const comments = await query(
      'SELECT id, post_id FROM post_comments WHERE id = ? AND is_deleted = 0',
      [commentId]
    );
    if (comments.length === 0) {
      return res.status(404).json({ success: false, message: '评论不存在' });
    }

    const existing = await query(
      'SELECT id FROM post_comment_likes WHERE comment_id = ? AND user_id = ?',
      [commentId, userId]
    );

    if (existing.length > 0) {
      await query('DELETE FROM post_comment_likes WHERE id = ?', [existing[0].id]);
      await query('UPDATE post_comments SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = ?', [commentId]);
      const updated = await query('SELECT likes_count FROM post_comments WHERE id = ?', [commentId]);
      res.json({ success: true, data: { liked: false, likesCount: updated[0].likes_count } });
    } else {
      await query('INSERT INTO post_comment_likes (comment_id, user_id) VALUES (?, ?)', [commentId, userId]);
      await query('UPDATE post_comments SET likes_count = likes_count + 1 WHERE id = ?', [commentId]);
      const updated = await query('SELECT likes_count FROM post_comments WHERE id = ?', [commentId]);
      res.json({ success: true, data: { liked: true, likesCount: updated[0].likes_count } });
    }
  } catch (err) {
    logger.commentError('点赞', '切换评论点赞失败', { commentId, userId, error: err.message });
    res.status(500).json({ success: false, message: '操作失败' });
  }
};

module.exports = { getList, create, deleteComment, toggleLike };

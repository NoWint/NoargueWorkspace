# 社区系统 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Twitter-like community content sharing system to the TimeGreen Path Todo Mini Program, including posts, comments, likes, view tracking, and a reporting system.

**Architecture:** Express.js backend with MySQL 5.5 (TEXT columns for JSON, backend parses). 4 new backend route modules + controllers. 2 new frontend pages (community-home as tabbar page in main package, post-detail and post-edit in new packageCommunity subpackage). 2 new admin pages in packageAdmin. Image upload reuses existing img.scdn.io pattern from add-todo.

**Tech Stack:** WeChat Mini Program (lib 3.15.0), Express.js, MySQL 5.5, TDesign MiniProgram components, JWT auth, wx.uploadFile for images

---

### Task 1: Database — Create 5 new tables

**Files:**
- Execute: MySQL schema via backend database

- [ ] **Step 1: Create posts table**

Run this SQL on the MySQL database:

```sql
CREATE TABLE posts (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    post_id VARCHAR(64) NOT NULL UNIQUE,
    user_id BIGINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    body TEXT,
    images TEXT,
    todo_ids TEXT,
    share_code VARCHAR(10),
    ip_address VARCHAR(45),
    ip_province VARCHAR(100),
    location TEXT,
    likes_count INT DEFAULT 0,
    comments_count INT DEFAULT 0,
    views_count INT DEFAULT 0,
    viewer_ids TEXT,
    is_edited TINYINT DEFAULT 0,
    is_deleted TINYINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
);
```

- [ ] **Step 2: Create post_views table**

```sql
CREATE TABLE post_views (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    post_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_post_id (post_id),
    INDEX idx_post_user (post_id, user_id)
);
```

- [ ] **Step 3: Create post_likes table**

```sql
CREATE TABLE post_likes (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    post_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_post_user (post_id, user_id),
    INDEX idx_post_id (post_id)
);
```

- [ ] **Step 4: Create post_comments table**

```sql
CREATE TABLE post_comments (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    post_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    content TEXT NOT NULL,
    images TEXT,
    parent_id BIGINT DEFAULT NULL,
    reply_to_user_id BIGINT DEFAULT NULL,
    reply_to_content TEXT,
    likes_count INT DEFAULT 0,
    is_deleted TINYINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_post_id (post_id),
    INDEX idx_parent_id (parent_id)
);
```

- [ ] **Step 5: Create reports table**

```sql
CREATE TABLE reports (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    target_type VARCHAR(20) NOT NULL,
    target_id BIGINT NOT NULL,
    target_content TEXT,
    reason VARCHAR(50) NOT NULL,
    detail TEXT,
    status TINYINT DEFAULT 0,
    result_note TEXT,
    processed_by BIGINT,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_target (target_type, target_id)
);
```

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(community): add 5 database tables (posts, post_views, post_likes, post_comments, reports)"
```

---

### Task 2: Backend — postsController & postsRoutes

**Files:**
- Create: `backend/controllers/postsController.js`
- Create: `backend/routes/postsRoutes.js`

- [ ] **Step 1: Create postsController.js**

```javascript
const { query } = require('../config/database');
const logger = require('../utils/logger');
const axios = require('axios');

// The logger does not have a predefined POST module — use generic error/warn/info
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
    let params = [];
    if (cursor) {
      const parts = cursor.split('_');
      if (parts.length === 2) {
        cursorWhere = 'AND (p.created_at < ? OR (p.created_at = ? AND p.id < ?))';
        params = [parts[0], parts[0], parts[1]];
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
      [userId, ...params, pageSize + 1]
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
      await query(
        'UPDATE posts SET views_count = views_count + 1 WHERE post_id = ?',
        [postId]
      );

      const alreadyViewed = await query(
        'SELECT id FROM post_views WHERE post_id = ? AND user_id = ?',
        [post.id, userId]
      );
      if (alreadyViewed.length === 0) {
        await query(
          'INSERT INTO post_views (post_id, user_id) VALUES (?, ?)',
          [post.id, userId]
        );
      }

      const viewerIds = post.viewer_ids ? JSON.parse(post.viewer_ids) : [];
      if (!viewerIds.includes(userId)) {
        viewerIds.push(userId);
        await query(
          'UPDATE posts SET viewer_ids = ? WHERE post_id = ?',
          [JSON.stringify(viewerIds), postId]
        );
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

    const admins = require('./adminController').getAdminIds();
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
```

- [ ] **Step 2: Create postsRoutes.js**

```javascript
const express = require('express');
const router = express.Router();
const postsController = require('../controllers/postsController');
const { authMiddleware } = require('../middleware/auth');

router.post('/create', authMiddleware, postsController.create);
router.get('/list', authMiddleware, postsController.getList);
router.get('/:postId', authMiddleware, postsController.getById);
router.put('/:postId', authMiddleware, postsController.update);
router.delete('/:postId', authMiddleware, postsController.deletePost);
router.get('/:postId/visitors', authMiddleware, postsController.getVisitors);

module.exports = router;
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(community): add postsController and postsRoutes"
```

---

### Task 3: Backend — likesController & likesRoutes

**Files:**
- Create: `backend/controllers/likesController.js`
- Create: `backend/routes/likesRoutes.js`

- [ ] **Step 1: Create likesController.js**

```javascript
const { query } = require('../config/database');
const logger = require('../utils/logger');

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
    logger.error(POST_LOG, '点赞', '切换点赞失败', { postId, userId, error: err.message });
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
      `SELECT u.id, u.nickname, u.avatar_url, pl.created_at as liked_at
       FROM post_likes pl
       LEFT JOIN users u ON pl.user_id = u.id
       WHERE pl.post_id = ?
       ORDER BY pl.created_at DESC`,
      [posts[0].id]
    );

    res.json({
      success: true,
      data: users.map(u => ({
        userId: u.id,
        nickname: u.nickname || '用户',
        avatar: u.avatar_url,
        likedAt: u.liked_at
      }))
    });
  } catch (err) {
    logger.error(POST_LOG, '点赞列表', '获取点赞用户失败', { postId, error: err.message });
    res.status(500).json({ success: false, message: '获取失败' });
  }
};

module.exports = { toggle, getUsers };
```

- [ ] **Step 2: Create likesRoutes.js**

```javascript
const express = require('express');
const router = express.Router();
const likesController = require('../controllers/likesController');
const { authMiddleware } = require('../middleware/auth');

router.post('/toggle', authMiddleware, likesController.toggle);
router.get('/:postId/users', authMiddleware, likesController.getUsers);

module.exports = router;
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(community): add likesController and likesRoutes"
```

---

### Task 4: Backend — postCommentsController & postCommentsRoutes

**Files:**
- Create: `backend/controllers/postCommentsController.js`
- Create: `backend/routes/postCommentsRoutes.js`

- [ ] **Step 1: Create postCommentsController.js**

```javascript
const { query } = require('../config/database');
const logger = require('../utils/logger');

const getFullAvatarUrl = (avatarUrl) => {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) return avatarUrl;
  if (avatarUrl.startsWith('/uploads/')) {
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    return `${baseUrl}${avatarUrl}`;
  }
  return null;
};

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

    const postsTable = await query(
      'SELECT user_id FROM posts WHERE post_id = ?', [postId]
    );
    const postCreatorId = postsTable[0].user_id;

    let cursorWhere = '';
    let params = [];
    if (cursor) {
      cursorWhere = 'AND c.id < ?';
      params = [parseInt(cursor)];
    }

    const mainComments = await query(
      `SELECT c.*, u.nickname, u.avatar_url
       FROM post_comments c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.post_id = ? AND c.parent_id IS NULL AND c.is_deleted = 0 ${cursorWhere}
       ORDER BY c.created_at DESC
       LIMIT ?`,
      [postDbId, ...params, pageSize + 1]
    );

    const hasMore = mainComments.length > pageSize;
    if (hasMore) mainComments.pop();

    const commentIds = mainComments.map(c => c.id);
    let allReplies = [];
    if (commentIds.length > 0) {
      allReplies = await query(
        `SELECT c.*, u.nickname, u.avatar_url,
                ru.nickname as reply_to_nickname
         FROM post_comments c
         LEFT JOIN users u ON c.user_id = u.id
         LEFT JOIN users ru ON c.reply_to_user_id = ru.id
         WHERE c.parent_id IN (?) AND c.is_deleted = 0
         ORDER BY c.created_at ASC`,
        [commentIds]
      );
    }

    // Build nested tree (max 3 levels deep)
    function buildTree(comments, parentId, depth = 0) {
      if (depth >= 3) return [];
      return comments
        .filter(c => c.parent_id === parentId)
        .map(c => ({
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
          createdAt: c.created_at,
          isDeleted: !!c.is_deleted,
          user: {
            id: c.user_id,
            nickname: c.nickname || '用户',
            avatar: getFullAvatarUrl(c.avatar_url)
          },
          canDelete: c.user_id === userId || postCreatorId === userId,
          replies: buildTree(comments, c.id, depth + 1)
        }));
    }

    const rootComments = mainComments.map(c => ({
      id: c.id,
      postId: c.post_id,
      content: c.content,
      images: c.images ? JSON.parse(c.images) : [],
      parentId: c.parent_id,
      replyToUser: null,
      replyToContent: null,
      likesCount: c.likes_count,
      createdAt: c.created_at,
      isDeleted: !!c.is_deleted,
      user: {
        id: c.user_id,
        nickname: c.nickname || '用户',
        avatar: getFullAvatarUrl(c.avatar_url)
      },
      canDelete: c.user_id === userId || postCreatorId === userId,
      replies: buildTree(allReplies, c.id, 1)
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

  if (!content || content.trim().length === 0) {
    return res.status(400).json({ success: false, message: '评论内容不能为空' });
  }
  if (content.length > 500) {
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
        postDbId, userId, content.trim(),
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

module.exports = { getList, create, deleteComment };
```

- [ ] **Step 2: Create postCommentsRoutes.js**

```javascript
const express = require('express');
const router = express.Router();
const postCommentsController = require('../controllers/postCommentsController');
const { authMiddleware } = require('../middleware/auth');

router.get('/:postId', authMiddleware, postCommentsController.getList);
router.post('/:postId', authMiddleware, postCommentsController.create);
router.delete('/:commentId', authMiddleware, postCommentsController.deleteComment);

module.exports = router;
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(community): add postCommentsController and postCommentsRoutes"
```

---

### Task 5: Backend — reportsController & reportsRoutes + wechatService.update

**Files:**
- Create: `backend/controllers/reportsController.js`
- Create: `backend/routes/reportsRoutes.js`
- Modify: `backend/services/wechatService.js` (add `sendReportResultMessage`)

- [ ] **Step 1: Create reportsController.js**

```javascript
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
      const posts = await query(
        'SELECT title, body FROM posts WHERE post_id = ?', [targetId]
      );
      if (posts.length > 0) {
        targetContent = posts[0].title + (posts[0].body ? ' - ' + posts[0].body : '');
      }
    } else {
      const comments = await query(
        'SELECT content FROM post_comments WHERE id = ?', [targetId]
      );
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
      `SELECT * FROM reports WHERE user_id = ? ORDER BY created_at DESC`,
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
      `SELECT COUNT(*) as total FROM reports r ${whereClause}`, params
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
  const { action, resultNote } = req.body; // action: 'delete' or 'reject'

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
      `UPDATE reports SET status = ?, result_note = ?, processed_by = ?, processed_at = NOW()
       WHERE id = ?`,
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
          result: action === 'delete' ? '已处理（内容已删除）' : '已驳回',
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
```

- [ ] **Step 2: Create reportsRoutes.js**

```javascript
const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reportsController');
const { authMiddleware, isAdmin } = require('../middleware/auth');

router.post('/create', authMiddleware, reportsController.create);
router.get('/my', authMiddleware, reportsController.getMyReports);
router.get('/list', authMiddleware, isAdmin, reportsController.getList);
router.get('/:id', authMiddleware, isAdmin, reportsController.getDetail);
router.post('/:id/process', authMiddleware, isAdmin, reportsController.processReport);

module.exports = router;
```

- [ ] **Step 3: Add sendReportResultMessage to wechatService.js**

Add this function to `backend/services/wechatService.js` (after `sendApprovalResultMessage`):

```javascript
const REPORT_TEMPLATE_ID = 'yXtj85psFqKHQsAbcjxFo5wYX8SdU4acoYiENIRpiAE';

// Inside module.exports, add:

sendReportResultMessage: async (openid, data) => {
  try {
    const accessToken = await getAccessToken();
    const url = `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${accessToken}`;

    const body = {
      touser: openid,
      template_id: REPORT_TEMPLATE_ID,
      data: {
        thing1: { value: (data.title || '').substring(0, 20) },
        thing2: { value: (data.reason || '').substring(0, 20) },
        thing5: { value: (data.targetType || '帖子').substring(0, 20) },
        thing3: { value: (data.result || '').substring(0, 20) },
        time4: { value: data.processedAt ? new Date(data.processedAt).toLocaleString('zh-CN') : '' }
      }
    };

    const response = await axios.post(url, body);
    if (response.data.errcode && response.data.errcode !== 0) {
      logger.warn('WECHAT', '发送举报结果通知失败', { errcode: response.data.errcode, errmsg: response.data.errmsg });
    } else {
      logger.info('WECHAT', '举报结果通知发送成功', { openid });
    }
  } catch (err) {
    logger.wechatError('发送举报结果通知', err.message, { openid });
  }
}
```

Also add `REPORT_TEMPLATE_ID` as a constant at the top alongside existing template IDs.

- [ ] **Step 4: Register new routes in app.js**

Add these lines to `backend/app.js` after the existing route registrations (after line 60 for `/comments`):

```javascript
const postsRoutes = require('./routes/postsRoutes');
const likesRoutes = require('./routes/likesRoutes');
const postCommentsRoutes = require('./routes/postCommentsRoutes');
const reportsRoutes = require('./routes/reportsRoutes');

// Add these after the existing app.use('/comments', ...) line:
app.use('/posts', postsRoutes);
app.use('/likes', likesRoutes);
app.use('/post-comments', postCommentsRoutes);
app.use('/reports', reportsRoutes);
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(community): add reportsController and routes, register community routes in app.js"
```

---

### Task 6: Frontend — app.json tabbar & subpackage config

**Files:**
- Modify: `app.json`

- [ ] **Step 1: Update app.json**

Change the tabbar list from 4 items to 5, inserting `pages/community-home/community-home` as the 3rd tab:

```json
"tabBar": {
  "color": "#666",
  "selectedColor": "#00b26a",
  "backgroundColor": "#fff",
  "list": [
    { "pagePath": "pages/todo/todo", "text": "待办", "iconPath": "images/todo.png", "selectedIconPath": "images/todo-active.png" },
    { "pagePath": "pages/calendar/calendar", "text": "日历", "iconPath": "images/calendar.png", "selectedIconPath": "images/calendar-active.png" },
    { "pagePath": "pages/community-home/community-home", "text": "社区", "iconPath": "images/community.png", "selectedIconPath": "images/community-active.png" },
    { "pagePath": "pages/stats/stats", "text": "统计", "iconPath": "images/stats.png", "selectedIconPath": "images/stats-active.png" },
    { "pagePath": "pages/more/more", "text": "更多", "iconPath": "images/more.png", "selectedIconPath": "images/more-active.png" }
  ]
}
```

Add `pages/community-home/community-home` to the `pages` array:

```json
"pages": [
  "pages/todo/todo",
  "pages/calendar/calendar",
  "pages/community-home/community-home",
  "pages/stats/stats",
  "pages/more/more"
]
```

Add the new subpackage `packageCommunity`:

```json
"subPackages": [
  // ... existing subpackages ...
  {
    "root": "packageCommunity",
    "name": "community",
    "pages": [
      "post-detail/post-detail",
      "post-edit/post-edit"
    ]
  }
]
```

Add preload rule for community-home:

```json
"preloadRule": {
  "pages/todo/todo": { "network": "all", "packages": ["combo", "pages"] },
  "pages/community-home/community-home": { "network": "all", "packages": ["community"] },
  "pages/more/more": { "network": "all", "packages": ["tools"] }
}
```

- [ ] **Step 2: Create tabbar icon files**

Create two icon files for the community tab:
- `images/community.png` — community icon
- `images/community-active.png` — active community icon

Use one of the existing icon files as a placeholder reference or copy from an existing TDesign icon.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(community): update app.json tabbar and add packageCommunity subpackage"
```

---

### Task 7: Frontend — API module for community

**Files:**
- Modify: `utils/api.js` (add community API module)

- [ ] **Step 1: Add communityApi to api.js**

Add this module definition before `module.exports`:

```javascript
const communityApi = {
  // Posts
  createPost: (data) => request({ url: '/api/posts/create', method: 'POST', data }),
  getPostList: (params) => request({ url: '/api/posts/list', method: 'GET', data: params }),
  getPostById: (postId) => request({ url: `/api/posts/${postId}`, method: 'GET' }),
  updatePost: (postId, data) => request({ url: `/api/posts/${postId}`, method: 'PUT', data }),
  deletePost: (postId) => request({ url: `/api/posts/${postId}`, method: 'DELETE' }),
  getVisitors: (postId, params) => request({ url: `/api/posts/${postId}/visitors`, method: 'GET', data: params }),

  // Likes
  toggleLike: (data) => request({ url: '/api/likes/toggle', method: 'POST', data }),
  getLikeUsers: (postId) => request({ url: `/api/likes/${postId}/users`, method: 'GET' }),

  // Comments
  getComments: (postId, params) => request({ url: `/api/post-comments/${postId}`, method: 'GET', data: params }),
  createComment: (postId, data) => request({ url: `/api/post-comments/${postId}`, method: 'POST', data }),
  deleteComment: (commentId) => request({ url: `/api/post-comments/${commentId}`, method: 'DELETE' }),

  // Reports
  createReport: (data) => request({ url: '/api/reports/create', method: 'POST', data }),
  getMyReports: () => request({ url: '/api/reports/my', method: 'GET' }),
  getReportList: (params) => request({ url: '/api/reports/list', method: 'GET', data: params }),
  getReportDetail: (id) => request({ url: `/api/reports/${id}`, method: 'GET' }),
  processReport: (id, data) => request({ url: `/api/reports/${id}/process`, method: 'POST', data }),
};

// Add to module.exports:
// communityApi,
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat(community): add communityApi module to api.js"
```

---

### Task 8: Frontend — community-home page (tabbar + feed)

**Files:**
- Create: `pages/community-home/community-home.js`
- Create: `pages/community-home/community-home.wxml`
- Create: `pages/community-home/community-home.wxss`
- Create: `pages/community-home/community-home.json`

- [ ] **Step 1: Create community-home.json**

```json
{
  "usingComponents": {
    "t-navbar": "tdesign-miniprogram/navbar/navbar",
    "t-fab": "tdesign-miniprogram/fab/fab",
    "t-icon": "tdesign-miniprogram/icon/icon",
    "t-image": "tdesign-miniprogram/image/image",
    "t-loading": "tdesign-miniprogram/loading/loading"
  },
  "navigationStyle": "custom",
  "enablePullDownRefresh": true,
  "backgroundTextStyle": "dark"
}
```

- [ ] **Step 2: Create community-home.wxml**

```xml
<t-navbar title="社区" bind:left-click="goBack">
  <view slot="right">
    <t-icon name="search" size="40rpx" bind:tap="onSearch" />
  </view>
</t-navbar>

<scroll-view
  scroll-y
  style="height: calc(100vh - {{navBarHeight}}px - 110rpx);"
  bind:scrolltolower="onLoadMore"
  refresher-enabled="{{true}}"
  refresher-triggered="{{refreshing}}"
  bind:refresherrefresh="onRefresh"
>

  <view class="feed-list">
    <block wx:for="{{postList}}" wx:key="postId">
      <view class="post-card" data-post-id="{{item.postId}}" bind:tap="goToDetail">
        <!-- Header: avatar + nickname + time -->
        <view class="post-header">
          <image class="post-avatar" src="{{item.user.avatar || '/images/default-avatar.png'}}" mode="aspectFill" />
          <view class="post-user-info">
            <text class="post-nickname">{{item.user.nickname}}</text>
            <text class="post-time">{{formatTime(item.createdAt)}}</text>
          </view>
        </view>

        <!-- Title -->
        <view class="post-title">{{item.title}}</view>

        <!-- Body preview (2 lines) -->
        <view wx:if="{{item.body}}" class="post-body">{{item.body}}</view>

        <!-- Images: adaptive layout -->
        <view wx:if="{{item.images && item.images.length > 0}}" class="post-images">
          <view class="grid-{{item.images.length === 1 ? 'single' : (item.images.length === 2 ? 'double' : 'triple')}}">
            <image
              wx:for="{{item.images}}"
              wx:key="*this"
              src="{{item}}"
              mode="{{item.images.length === 1 ? 'widthFix' : 'aspectFill'}}"
              class="post-image"
              bind:tap.stop="previewImage"
              data-url="{{item}}"
            />
          </view>
        </view>

        <!-- IP province & location -->
        <view class="post-meta-row">
          <text wx:if="{{item.location}}" class="post-location">📍 {{item.location}}</text>
          <text wx:if="{{item.ipProvince}}" class="post-ip">IP属地 · {{item.ipProvince}}</text>
        </view>

        <!-- Stats row -->
        <view class="post-stats-row">
          <view class="stat-item" bind:tap.stop="goToDetail" data-post-id="{{item.postId}}">
            <t-icon name="chat" size="28rpx" />
            <text>{{item.commentsCount || 0}}</text>
          </view>
          <view class="stat-item {{item.isLiked ? 'liked' : ''}}" bind:tap.stop="toggleLike" data-post-id="{{item.postId}}">
            <t-icon name="{{item.isLiked ? 'heart-filled' : 'heart'}}" size="28rpx" />
            <text>{{item.likesCount || 0}}</text>
          </view>
          <view class="stat-item">
            <t-icon name="browse" size="28rpx" />
            <text>{{item.viewsCount || 0}}</text>
          </view>
        </view>
      </view>
    </block>

    <!-- Loading more -->
    <view wx:if="{{loadingMore}}" class="loading-more">
      <t-loading loading="{{true}}" size="40rpx" />
      <text>加载中...</text>
    </view>

    <!-- No more -->
    <view wx:if="{{!hasMore && postList.length > 0}}" class="no-more">
      <text>— 没有更多了 —</text>
    </view>

    <!-- Empty state -->
    <view wx:if="{{!loading && postList.length === 0}}" class="empty-state">
      <t-icon name="message" size="100rpx" />
      <text>暂无帖子，快来发布第一条吧</text>
    </view>
  </view>
</scroll-view>

<!-- FAB -->
<t-fab
  icon="add"
  bind:click="goToEdit"
  style="right: 32rpx; bottom: 100rpx;"
/>
```

- [ ] **Step 3: Create community-home.wxss**

```css
page {
  background: #e3f5eb;
}

.feed-list {
  padding: 0 0 20rpx 0;
}

.post-card {
  background: #fff;
  margin: 20rpx;
  padding: 30rpx;
  border-radius: 32rpx;
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.06);
}

.post-header {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}

.post-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  margin-right: 16rpx;
}

.post-user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.post-nickname {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}

.post-time {
  font-size: 22rpx;
  color: #999;
  margin-top: 4rpx;
}

.post-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a1a;
  line-height: 1.5;
  margin-bottom: 12rpx;
}

.post-body {
  font-size: 28rpx;
  color: #666;
  line-height: 1.6;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  margin-bottom: 16rpx;
}

.post-images {
  margin-bottom: 16rpx;
}

.grid-single .post-image {
  width: 100%;
  max-height: 400rpx;
  border-radius: 16rpx;
  margin-bottom: 8rpx;
}

.grid-double {
  display: flex;
  gap: 8rpx;
}

.grid-double .post-image {
  width: 50%;
  height: 300rpx;
  border-radius: 16rpx;
}

.grid-triple {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8rpx;
}

.grid-triple .post-image {
  width: 100%;
  height: 200rpx;
  border-radius: 16rpx;
}

.post-meta-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-bottom: 16rpx;
  font-size: 22rpx;
  color: #999;
}

.post-stats-row {
  display: flex;
  align-items: center;
  gap: 40rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #f0f0f0;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 24rpx;
  color: #999;
}

.stat-item.liked {
  color: #ff4757;
}

.loading-more, .no-more {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12rpx;
  padding: 30rpx;
  color: #999;
  font-size: 24rpx;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 0;
  color: #999;
  font-size: 28rpx;
  gap: 20rpx;
}
```

- [ ] **Step 4: Create community-home.js**

```javascript
const app = getApp();
const { communityApi } = require('../../utils/api');

Page({
  data: {
    navBarHeight: app.globalData.navBarHeight || 44,
    postList: [],
    nextCursor: null,
    hasMore: true,
    loading: false,
    loadingMore: false,
    refreshing: false,
    isLoggedIn: false
  },

  onLoad() {
    this.setData({
      isLoggedIn: app.globalData.isLoggedIn || !!wx.getStorageSync('authToken'),
      navBarHeight: app.globalData.navBarHeight || 44
    });
  },

  onShow() {
    if (this.data.postList.length === 0) {
      this.loadPosts(true);
    }
  },

  onPullDownRefresh() {
    this.loadPosts(true).then(() => {
      wx.stopPullDownRefresh();
    });
  },

  onRefresh() {
    this.loadPosts(true);
  },

  async loadPosts(reset = false) {
    if (this.data.loading) return;
    if (!reset && !this.data.hasMore) return;

    this.setData({
      loading: reset ? true : this.data.loading,
      loadingMore: !reset ? true : false,
      refreshing: reset ? true : false
    });

    try {
      const params = { limit: 20 };
      if (!reset && this.data.nextCursor) {
        params.cursor = this.data.nextCursor;
      }

      const res = await communityApi.getPostList(params);
      if (res.success) {
        this.setData({
          postList: reset ? res.data.list : [...this.data.postList, ...res.data.list],
          nextCursor: res.data.nextCursor,
          hasMore: res.data.hasMore,
          loading: false,
          loadingMore: false,
          refreshing: false
        });
      }
    } catch (err) {
      console.error('获取帖子列表失败', err);
      this.setData({ loading: false, loadingMore: false, refreshing: false });
    }
  },

  onLoadMore() {
    this.loadPosts(false);
  },

  goToDetail(e) {
    const postId = e.currentTarget.dataset.postId || (e.detail && e.detail.postId);
    wx.navigateTo({ url: `/packageCommunity/post-detail/post-detail?postId=${postId}` });
  },

  goToEdit() {
    const token = wx.getStorageSync('authToken');
    if (!token) {
      wx.navigateTo({ url: '/packagePages/login/login' });
      return;
    }
    wx.navigateTo({ url: '/packageCommunity/post-edit/post-edit' });
  },

  async toggleLike(e) {
    const postId = e.currentTarget.dataset.postId;
    try {
      const res = await communityApi.toggleLike({ postId });
      if (res.success) {
        const list = [...this.data.postList];
        const idx = list.findIndex(p => p.postId === postId);
        if (idx !== -1) {
          list[idx].isLiked = res.data.liked;
          list[idx].likesCount += res.data.liked ? 1 : -1;
          this.setData({ postList: list });
        }
      }
    } catch (err) {
      console.error('点赞失败', err);
    }
  },

  previewImage(e) {
    const url = e.currentTarget.dataset.url;
    const postId = e.currentTarget.dataset.postId;
    const post = this.data.postList.find(p => p.postId === postId);
    if (post && post.images) {
      wx.previewImage({ current: url, urls: post.images });
    }
  },

  onSearch() {
    wx.showToast({ title: '搜索功能开发中', icon: 'none' });
  },

  formatTime(dateStr) {
    if (!dateStr) return '';
    const now = Date.now();
    const date = new Date(dateStr.replace(' ', 'T'));
    const diff = Math.floor((now - date.getTime()) / 1000);
    if (diff < 60) return '刚刚';
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)}天前`;
    const m = date.getMonth() + 1;
    const d = date.getDate();
    return `${m}月${d}日`;
  },

  onShareAppMessage() {
    return { title: '时光绿径待办 · 社区', path: '/pages/community-home/community-home' };
  }
});
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(community): add community-home page with feed list and FAB"
```

---

### Task 9: Frontend — post-edit page

**Files:**
- Create: `packageCommunity/post-edit/post-edit.js`
- Create: `packageCommunity/post-edit/post-edit.wxml`
- Create: `packageCommunity/post-edit/post-edit.wxss`
- Create: `packageCommunity/post-edit/post-edit.json`

- [ ] **Step 1: Create post-edit.json**

```json
{
  "usingComponents": {
    "t-navbar": "tdesign-miniprogram/navbar/navbar",
    "t-textarea": "tdesign-miniprogram/textarea/textarea",
    "t-upload": "tdesign-miniprogram/upload/upload",
    "t-button": "tdesign-miniprogram/button/button",
    "t-icon": "tdesign-miniprogram/icon/icon",
    "t-switch": "tdesign-miniprogram/switch/switch"
  },
  "navigationStyle": "custom"
}
```

- [ ] **Step 2: Create post-edit.wxml**

```xml
<t-navbar
  title="{{editMode ? '编辑帖子' : '发帖'}}"
  bind:left-click="goBack"
>
  <view slot="right">
    <t-button
      theme="primary"
      size="small"
      disabled="{{!canPublish}}"
      loading="{{submitting}}"
      bind:tap="handleSubmit"
    >
      {{editMode ? '保存' : '发布'}}
    </t-button>
  </view>
</t-navbar>

<view class="edit-container">
  <!-- Avatar -->
  <view class="user-row">
    <image class="user-avatar" src="{{userInfo.avatar || '/images/default-avatar.png'}}" mode="aspectFill" />
    <text class="user-nickname">{{userInfo.nickname || '用户'}}</text>
  </view>

  <!-- Textarea: first line = title, rest = body -->
  <textarea
    class="content-textarea"
    placeholder="分享你的想法..."
    value="{{content}}"
    bind:input="onContentInput"
    maxlength="2000"
    auto-height
    show-confirm-bar="{{false}}"
  />

  <!-- Image upload -->
  <view class="upload-section">
    <t-upload
      mediaType="{{['image']}}"
      source="{{imageSource}}"
      max="{{9}}"
      files="{{fileList}}"
      gridConfig="{{gridConfig}}"
      config="{{uploadConfig}}"
      draggable="{{true}}"
      bind:add="handleImageAdd"
      bind:remove="handleImageRemove"
      bind:click="handleImageClick"
    />
    <view class="source-toggle" bind:tap="toggleImageSource">
      <text class="source-text">{{imageSource === 'media' ? '📷 相册/拍照' : '💬 聊天记录'}}</text>
      <t-switch checked="{{imageSource === 'media'}}" size="24" />
    </view>
  </view>

  <!-- Word count -->
  <view class="word-count">
    <text>{{content.length}}/2000</text>
    <text wx:if="{{!title && content.length > 0}}" class="hint">首行将作为标题</text>
  </view>
</view>

<!-- Bottom toolbar -->
<view class="bottom-toolbar">
  <view class="toolbar-item" bind:tap="pickImage">
    <t-icon name="image" size="48rpx" />
    <text>图片</text>
  </view>
  <view class="toolbar-item" bind:tap="pickTodos">
    <t-icon name="checklist" size="48rpx" />
    <text>待办</text>
  </view>
  <view class="toolbar-item" bind:tap="pickCombo">
    <t-icon name="group" size="48rpx" />
    <text>组合</text>
  </view>
  <view class="toolbar-item" bind:tap="pickLocation">
    <t-icon name="location" size="48rpx" />
    <text>位置</text>
  </view>
</view>
```

- [ ] **Step 3: Create post-edit.wxss**

```css
page {
  background: #fff;
}

.edit-container {
  padding: 20rpx 30rpx;
  padding-bottom: 120rpx;
}

.user-row {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}

.user-avatar {
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  margin-right: 12rpx;
}

.user-nickname {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}

.content-textarea {
  width: 100%;
  min-height: 300rpx;
  font-size: 30rpx;
  line-height: 1.6;
  color: #1a1a1a;
  margin-bottom: 20rpx;
}

.upload-section {
  margin-bottom: 20rpx;
}

.source-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 0;
  margin-top: 8rpx;
}

.source-text {
  font-size: 26rpx;
  color: #666;
}

.word-count {
  font-size: 24rpx;
  color: #999;
  text-align: right;
  margin-top: 10rpx;
}

.word-count .hint {
  color: #00b26a;
  margin-left: 12rpx;
}

.bottom-toolbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 16rpx 30rpx;
  padding-bottom: env(safe-area-inset-bottom);
  background: #fff;
  border-top: 1rpx solid #f0f0f0;
  z-index: 100;
}

.toolbar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  font-size: 20rpx;
  color: #666;
}
```

- [ ] **Step 4: Create post-edit.js**

```javascript
const app = getApp();
const { communityApi } = require('../../utils/api');

const compressImage = (filePath) => {
  return new Promise((resolve) => {
    wx.getFileInfo({
      filePath,
      success(info) {
        if (info.size > 2 * 1024 * 1024) {
          wx.compressImage({ src: filePath, quality: 80, success: (r) => resolve(r.tempFilePath) });
        } else {
          resolve(filePath);
        }
      },
      fail: () => resolve(filePath)
    });
  });
};

const uploadImage = (filePath, retryCount = 0) => {
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: 'https://img.scdn.io/api/v1.php',
      filePath,
      name: 'image',
      success(res) {
        try {
          const data = JSON.parse(res.data);
          if (data && data.data && data.data.url) {
            resolve(data.data.url);
          } else if (data && data.url) {
            resolve(data.url);
          } else {
            reject(new Error('上传返回URL异常'));
          }
        } catch {
          reject(new Error('上传返回格式异常'));
        }
      },
      fail(err) {
        if (retryCount < 3) {
          setTimeout(() => {
            uploadImage(filePath, retryCount + 1).then(resolve).catch(reject);
          }, 1000 * (retryCount + 1));
        } else {
          reject(err);
        }
      }
    });
  });
};

Page({
  data: {
    navBarHeight: app.globalData.navBarHeight || 44,
    content: '',
    title: '',
    body: '',
    fileList: [],
    imageUrls: [],
    imageSource: 'media',
    gridConfig: { column: 3, width: 200, height: 200 },
    uploadConfig: { count: 9, sizeType: ['compressed'], sourceType: ['album', 'camera'] },
    submitting: false,
    editMode: false,
    editPostId: null,
    selectedTodoIds: [],
    selectedComboCode: null,
    location: null,
    userInfo: app.globalData.userInfo || {}
  },

  onLoad(options) {
    const userInfo = app.globalData.userInfo || wx.getStorageSync('user') || {};
    this.setData({ userInfo });

    if (options.postId) {
      this.loadEditData(options.postId);
    }

    // Restore draft
    const draft = wx.getStorageSync('communityDraft');
    if (draft && !options.postId) {
      this.setData({
        content: draft.content || '',
        fileList: draft.fileList || [],
        imageUrls: draft.imageUrls || [],
        selectedTodoIds: draft.selectedTodoIds || [],
        selectedComboCode: draft.selectedComboCode || null,
        location: draft.location || null
      });
    }
  },

  onUnload() {
    if (!this.data.editMode && this.data.content) {
      wx.setStorageSync('communityDraft', {
        content: this.data.content,
        fileList: this.data.fileList,
        imageUrls: this.data.imageUrls,
        selectedTodoIds: this.data.selectedTodoIds,
        selectedComboCode: this.data.selectedComboCode,
        location: this.data.location
      });
    } else if (!this.data.content) {
      wx.removeStorageSync('communityDraft');
    }
  },

  async loadEditData(postId) {
    try {
      const res = await communityApi.getPostById(postId);
      if (res.success && res.data) {
        const post = res.data;
        const fileList = (post.images || []).map(url => ({ url }));
        const firstLineEnd = post.title.length;
        this.setData({
          editMode: true,
          editPostId: postId,
          content: post.title + (post.body ? '\n' + post.body : ''),
          title: post.title,
          body: post.body || '',
          fileList,
          imageUrls: post.images || [],
          selectedTodoIds: post.todoIds || [],
          selectedComboCode: post.shareCode || null,
          location: post.location || null
        });
      }
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  onContentInput(e) {
    const content = e.detail.value || e.detail;
    const lines = content.split('\n');
    const title = lines[0] || '';
    const body = lines.slice(1).join('\n').trim();
    this.setData({
      content,
      title: title.trim(),
      body,
      canPublish: title.trim().length > 0
    });
  },

  async handleImageAdd(e) {
    const files = e.detail.files || [];
    const newFiles = files.filter(f => !f.url);

    for (const file of newFiles) {
      try {
        const compressed = await compressImage(file.path || file.url);
        const url = await uploadImage(compressed);
        if (url) {
          const list = [...this.data.fileList, { url }];
          const urls = [...this.data.imageUrls, url];
          this.setData({
            fileList: list,
            imageUrls: urls
          });
        }
      } catch (err) {
        wx.showToast({ title: '图片上传失败', icon: 'none' });
      }
    }
  },

  handleImageRemove(e) {
    const { index } = e.detail;
    const list = [...this.data.fileList];
    const urls = [...this.data.imageUrls];
    list.splice(index, 1);
    urls.splice(index, 1);
    this.setData({ fileList: list, imageUrls: urls });
  },

  handleImageClick(e) {
    const { index } = e.detail || {};
    if (index !== undefined && this.data.imageUrls[index]) {
      wx.previewImage({ current: this.data.imageUrls[index], urls: this.data.imageUrls });
    }
  },

  toggleImageSource() {
    const src = this.data.imageSource === 'media' ? 'messageFile' : 'media';
    this.setData({
      imageSource: src,
      uploadConfig: { ...this.data.uploadConfig, sourceType: src === 'media' ? ['album', 'camera'] : ['album'] }
    });
  },

  pickImage() {
    // Trigger t-upload add through the source toggle
    wx.chooseMedia({
      count: 9 - this.data.imageUrls.length,
      mediaType: ['image'],
      sourceType: this.data.imageSource === 'media' ? ['album', 'camera'] : ['album'],
      success: (res) => {
        const files = res.tempFiles.map(f => ({ path: f.tempFilePath }));
        this.handleImageAdd({ detail: { files } });
      }
    });
  },

  pickTodos() {
    wx.navigateTo({
      url: '/packagePages/todo-search/todo-search?mode=select',
      events: {
        acceptData: (data) => {
          this.setData({ selectedTodoIds: data.todoIds || [] });
        }
      }
    });
  },

  pickCombo() {
    wx.showActionSheet({
      itemList: ['邀请成员加入我的组合'],
      success: () => {
        // Simplified: In real implementation, show combo picker
        wx.showToast({ title: '组合功能开发中', icon: 'none' });
      }
    });
  },

  pickLocation() {
    wx.chooseLocation({
      success: (res) => {
        this.setData({
          location: { text: res.name || res.address }
        });
      }
    });
  },

  async handleSubmit() {
    if (!this.data.title.trim()) {
      wx.showToast({ title: '请输入标题', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });

    try {
      const payload = {
        postId: `post_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        title: this.data.title,
        body: this.data.body || null,
        images: this.data.imageUrls.length > 0 ? this.data.imageUrls : null,
        todoIds: this.data.selectedTodoIds.length > 0 ? this.data.selectedTodoIds : null,
        shareCode: this.data.selectedComboCode || null,
        location: this.data.location || null
      };

      if (this.data.editMode) {
        await communityApi.updatePost(this.data.editPostId, payload);
        wx.showToast({ title: '保存成功', icon: 'success' });
      } else {
        await communityApi.createPost(payload);
        wx.showToast({ title: '发布成功', icon: 'success' });
        wx.removeStorageSync('communityDraft');
      }

      setTimeout(() => wx.navigateBack(), 1500);
    } catch (err) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
      this.setData({ submitting: false });
    }
  },

  goBack() {
    if (this.data.content) {
      wx.showModal({
        title: '提示',
        content: '确定放弃当前编辑吗？',
        success: (res) => {
          if (res.confirm) wx.navigateBack();
        }
      });
    } else {
      wx.navigateBack();
    }
  }
});
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(community): add post-edit page with image upload and draft storage"
```

---

### Task 10: Frontend — post-detail page

**Files:**
- Create: `packageCommunity/post-detail/post-detail.js`
- Create: `packageCommunity/post-detail/post-detail.wxml`
- Create: `packageCommunity/post-detail/post-detail.wxss`
- Create: `packageCommunity/post-detail/post-detail.json`

- [ ] **Step 1: Create post-detail.json**

```json
{
  "usingComponents": {
    "t-navbar": "tdesign-miniprogram/navbar/navbar",
    "t-icon": "tdesign-miniprogram/icon/icon",
    "t-image": "tdesign-miniprogram/image/image",
    "t-loading": "tdesign-miniprogram/loading/loading",
    "t-popup": "tdesign-miniprogram/popup/popup",
    "t-button": "tdesign-miniprogram/button/button"
  },
  "navigationStyle": "custom",
  "enablePullDownRefresh": false
}
```

- [ ] **Step 2: Create post-detail.wxml**

```xml
<t-navbar title="帖子" bind:left-click="goBack">
  <view slot="right">
    <t-icon name="more" size="40rpx" bind:tap="showMenu" />
  </view>
</t-navbar>

<scroll-view
  scroll-y
  style="height: calc(100vh - {{navBarHeight}}px - 100rpx);"
  bind:scrolltolower="onLoadMoreComments"
>

  <view class="detail-container">
    <!-- Deleted post placeholder -->
    <view wx:if="{{isDeleted}}" class="deleted-notice">
      <t-icon name="error-circle" size="60rpx" />
      <text>该内容因违规已被删除</text>
    </view>

    <!-- Post content -->
    <view wx:else class="post-content">
      <!-- User info -->
      <view class="post-user-row">
        <image class="post-avatar" src="{{post.user.avatar || '/images/default-avatar.png'}}" mode="aspectFill" />
        <view class="post-user-info">
          <text class="post-nickname">{{post.user.nickname}}</text>
          <text class="post-time">{{post.createdAt}}</text>
        </view>
      </view>

      <!-- Title -->
      <view class="post-title">{{post.title}}</view>

      <!-- Body -->
      <view wx:if="{{post.body}}" class="post-body">{{post.body}}</view>

      <!-- Images -->
      <view wx:if="{{post.images && post.images.length > 0}}" class="post-images">
        <image
          wx:for="{{post.images}}"
          wx:key="*this"
          src="{{item}}"
          mode="widthFix"
          class="detail-image"
          bind:tap="previewImage"
          data-url="{{item}}"
        />
      </view>

      <!-- Meta row: edited badge, location, IP -->
      <view class="post-meta">
        <text wx:if="{{post.isEdited}}" class="edited-badge">已编辑</text>
        <text wx:if="{{post.location}}">📍 {{post.location}}</text>
        <text wx:if="{{post.ipProvince}}">IP属地 · {{post.ipProvince}}</text>
      </view>

      <!-- Stats row -->
      <view class="post-stats">
        <text>👁 {{post.viewsCount}}次浏览</text>
        <text>❤ {{post.likesCount}}人赞过</text>
        <text wx:if="{{isOwner}}" class="visitor-link" bind:tap="showVisitors">查看访客记录 →</text>
      </view>
    </view>

    <!-- Comment section -->
    <view class="comment-section">
      <view class="comment-header">评论 ({{post.commentsCount || 0}})</view>

      <view wx:if="{{comments.length === 0 && !loadingComments}}" class="no-comments">
        <text>暂无评论，来说点什么吧</text>
      </view>

      <view wx:for="{{comments}}" wx:key="id" class="comment-item">
        <!-- Deleted comment -->
        <view wx:if="{{item.isDeleted}}" class="comment-deleted">
          <text>该评论因违规已被删除</text>
        </view>

        <!-- Normal comment -->
        <view wx:else class="comment-normal">
          <image class="comment-avatar" src="{{item.user.avatar || '/images/default-avatar.png'}}" mode="aspectFill" />
          <view class="comment-body">
            <view class="comment-header-row">
              <text class="comment-nickname">{{item.user.nickname}}</text>
              <view class="comment-actions">
                <text wx:if="{{item.canDelete}}" class="action-btn" bind:tap="deleteComment" data-id="{{item.id}}">删除</text>
                <text class="action-btn" bind:tap="replyComment" data-id="{{item.id}}" data-user="{{item.user.nickname}}">回复</text>
              </view>
            </view>
            <text class="comment-content">{{item.content}}</text>
            <view wx:if="{{item.images && item.images.length > 0}}" class="comment-images">
              <image
                wx:for="{{item.images}}"
                wx:key="*this"
                src="{{item}}"
                mode="aspectFill"
                class="comment-image"
                bind:tap="previewImage"
                data-url="{{item}}"
              />
            </view>
            <text class="comment-time">{{formatTime(item.createdAt)}}</text>

            <!-- Nested replies -->
            <view wx:if="{{item.replies && item.replies.length > 0}}" class="replies-list">
              <view wx:for="{{item.replies}}" wx:for-item="reply" wx:key="id" class="reply-item">
                <view wx:if="{{reply.isDeleted}}" class="comment-deleted">
                  <text>该评论因违规已被删除</text>
                </view>
                <view wx:else>
                  <view class="reply-header">
                    <text class="reply-nickname">{{reply.user.nickname}}</text>
                    <text wx:if="{{reply.replyToUser}}" class="reply-target">回复 @{{reply.replyToUser.nickname}}</text>
                    <view class="comment-actions">
                      <text wx:if="{{reply.canDelete}}" class="action-btn" bind:tap="deleteComment" data-id="{{reply.id}}">删除</text>
                      <text class="action-btn" bind:tap="replyComment" data-id="{{item.id}}" data-user="{{reply.user.nickname}}">回复</text>
                    </view>
                  </view>
                  <text class="reply-content">{{reply.content}}</text>
                  <text class="comment-time">{{formatTime(reply.createdAt)}}</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view wx:if="{{loadingComments}}" class="loading-comments">
        <t-loading loading="{{true}}" size="40rpx" />
      </view>
    </view>
  </view>
</scroll-view>

<!-- Bottom input bar -->
<view class="bottom-input-bar">
  <input
    class="comment-input"
    placeholder="{{replyTarget ? '回复 @' + replyTarget : '输入评论...'}}"
    value="{{commentText}}"
    bind:input="onCommentInput"
    confirm-type="send"
    bind:confirm="submitComment"
  />
  <view wx:if="{{replyTarget}}" class="cancel-reply" bind:tap="cancelReply">取消</view>
  <t-button size="small" bind:tap="submitComment" disabled="{{!commentText.trim()}}">发送</t-button>
</view>

<!-- Menu popup -->
<t-popup visible="{{showMenuPopup}}" placement="bottom" bind:visible-change="onMenuClose">
  <view class="menu-items">
    <view wx:if="{{isOwner}}" class="menu-item" bind:tap="editPost">
      <t-icon name="edit" size="40rpx" />
      <text>编辑帖子</text>
    </view>
    <view wx:if="{{isOwner}}" class="menu-item" bind:tap="deletePost">
      <t-icon name="delete" size="40rpx" />
      <text>删除帖子</text>
    </view>
    <view wx:if="{{!isOwner}}" class="menu-item" bind:tap="reportPost">
      <t-icon name="flag" size="40rpx" />
      <text>举报帖子</text>
    </view>
    <view class="menu-item menu-cancel" bind:tap="closeMenu">
      <text>取消</text>
    </view>
  </view>
</t-popup>

<!-- Report popup -->
<t-popup visible="{{showReportPopup}}" placement="bottom" bind:visible-change="onReportClose">
  <view class="report-panel">
    <view class="report-title">选择举报原因</view>
    <view wx:for="{{reportReasons}}" wx:key="*this" class="report-reason" bind:tap="submitReport" data-reason="{{item}}">
      <text>{{item}}</text>
    </view>
    <view class="report-cancel" bind:tap="closeReport">取消</view>
  </view>
</t-popup>

<!-- Visitors popup -->
<t-popup visible="{{showVisitorsPopup}}" placement="bottom" bind:visible-change="onVisitorsClose">
  <view class="visitors-panel">
    <view class="visitors-title">访客记录</view>
    <view wx:if="{{visitors.length === 0}}" class="no-visitors">
      <text>暂无访客记录</text>
    </view>
    <view wx:for="{{visitors}}" wx:for-item="visitor" wx:key="userId" class="visitor-item">
      <image class="visitor-avatar" src="{{visitor.avatar || '/images/default-avatar.png'}}" mode="aspectFill" />
      <view class="visitor-info">
        <text class="visitor-nickname">{{visitor.nickname}}</text>
        <text class="visitor-time">{{visitor.viewedAt}}</text>
      </view>
    </view>
    <view class="report-cancel" bind:tap="closeVisitors">关闭</view>
  </view>
</t-popup>
```

- [ ] **Step 3: Create post-detail.wxss**

```css
page {
  background: #fff;
}

.detail-container {
  padding-bottom: 20rpx;
}

.deleted-notice {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 0;
  color: #999;
  font-size: 28rpx;
  gap: 20rpx;
}

.post-content {
  padding: 30rpx;
}

.post-user-row {
  display: flex;
  align-items: center;
  margin-bottom: 24rpx;
}

.post-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  margin-right: 16rpx;
}

.post-user-info {
  display: flex;
  flex-direction: column;
}

.post-nickname {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}

.post-time {
  font-size: 22rpx;
  color: #999;
  margin-top: 4rpx;
}

.post-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.5;
  margin-bottom: 16rpx;
}

.post-body {
  font-size: 30rpx;
  color: #444;
  line-height: 1.8;
  margin-bottom: 20rpx;
}

.post-images {
  margin-bottom: 20rpx;
}

.detail-image {
  width: 100%;
  border-radius: 16rpx;
  margin-bottom: 8rpx;
}

.post-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16rpx;
  font-size: 24rpx;
  color: #999;
  margin-bottom: 20rpx;
}

.edited-badge {
  color: #00b26a;
}

.post-stats {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 20rpx;
  font-size: 24rpx;
  color: #999;
  padding: 20rpx 0;
  border-top: 1rpx solid #f0f0f0;
  margin-bottom: 20rpx;
}

.visitor-link {
  color: #00b26a;
}

/* Comments */
.comment-section {
  padding: 0 30rpx;
}

.comment-header {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 20rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.no-comments {
  text-align: center;
  color: #999;
  font-size: 26rpx;
  padding: 60rpx 0;
}

.comment-item {
  margin-bottom: 24rpx;
}

.comment-deleted {
  padding: 16rpx;
  background: #f9f9f9;
  border-radius: 12rpx;
  font-size: 24rpx;
  color: #999;
  text-align: center;
}

.comment-normal {
  display: flex;
  gap: 16rpx;
}

.comment-avatar {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  flex-shrink: 0;
}

.comment-body {
  flex: 1;
  min-width: 0;
}

.comment-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4rpx;
}

.comment-nickname {
  font-size: 24rpx;
  font-weight: 600;
  color: #333;
}

.comment-actions {
  display: flex;
  gap: 16rpx;
}

.action-btn {
  font-size: 22rpx;
  color: #00b26a;
}

.comment-content {
  font-size: 26rpx;
  color: #444;
  line-height: 1.6;
}

.comment-images {
  display: flex;
  gap: 8rpx;
  margin-top: 8rpx;
}

.comment-image {
  width: 120rpx;
  height: 120rpx;
  border-radius: 8rpx;
}

.comment-time {
  font-size: 20rpx;
  color: #bbb;
  margin-top: 4rpx;
  display: block;
}

/* Nested replies */
.replies-list {
  margin-top: 12rpx;
  padding-left: 16rpx;
  border-left: 2rpx solid #e0e0e0;
}

.reply-item {
  margin-bottom: 12rpx;
}

.reply-header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-bottom: 4rpx;
}

.reply-nickname {
  font-size: 24rpx;
  font-weight: 600;
  color: #333;
}

.reply-target {
  font-size: 22rpx;
  color: #00b26a;
}

.reply-content {
  font-size: 26rpx;
  color: #444;
  line-height: 1.5;
}

/* Bottom input bar */
.bottom-input-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 12rpx 20rpx;
  padding-bottom: calc(12rpx + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1rpx solid #eee;
  z-index: 100;
}

.comment-input {
  flex: 1;
  height: 64rpx;
  background: #f5f5f5;
  border-radius: 32rpx;
  padding: 0 24rpx;
  font-size: 26rpx;
}

.cancel-reply {
  font-size: 24rpx;
  color: #999;
  padding: 8rpx;
}

/* Menu popup */
.menu-items {
  padding: 20rpx 30rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx 0;
  font-size: 28rpx;
  color: #333;
  border-bottom: 1rpx solid #f0f0f0;
}

.menu-cancel {
  justify-content: center;
  color: #999;
  border-bottom: none;
  margin-top: 12rpx;
}

/* Report popup */
.report-panel {
  padding: 30rpx;
  padding-bottom: calc(30rpx + env(safe-area-inset-bottom));
}

.report-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 20rpx;
  text-align: center;
}

.report-reason {
  padding: 20rpx 0;
  font-size: 28rpx;
  color: #333;
  text-align: center;
  border-bottom: 1rpx solid #f0f0f0;
}

.report-cancel {
  padding: 20rpx 0;
  font-size: 28rpx;
  color: #999;
  text-align: center;
  margin-top: 12rpx;
}

/* Visitors popup */
.visitors-panel {
  padding: 30rpx;
  padding-bottom: calc(30rpx + env(safe-area-inset-bottom));
  max-height: 600rpx;
  overflow-y: auto;
}

.visitors-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 20rpx;
  text-align: center;
}

.no-visitors {
  text-align: center;
  color: #999;
  font-size: 26rpx;
  padding: 40rpx 0;
}

.visitor-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.visitor-avatar {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
}

.visitor-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.visitor-nickname {
  font-size: 26rpx;
  color: #333;
}

.visitor-time {
  font-size: 20rpx;
  color: #999;
  margin-top: 4rpx;
}
```

- [ ] **Step 4: Create post-detail.js**

```javascript
const app = getApp();
const { communityApi } = require('../../utils/api');

Page({
  data: {
    navBarHeight: app.globalData.navBarHeight || 44,
    postId: null,
    post: {},
    isDeleted: false,
    isOwner: false,
    comments: [],
    commentCursor: null,
    hasMoreComments: true,
    loadingComments: false,
    commentText: '',
    replyTarget: null,
    replyParentId: null,
    replyToUserId: null,
    showMenuPopup: false,
    showReportPopup: false,
    showVisitorsPopup: false,
    visitors: [],
    reportReasons: ['垃圾广告', '色情低俗', '人身攻击', '违法信息', '其他'],
    isLoggedIn: false
  },

  onLoad(options) {
    const postId = options.postId;
    if (!postId) {
      wx.showToast({ title: '参数错误', icon: 'none' });
      return;
    }

    this.setData({
      postId,
      isLoggedIn: app.globalData.isLoggedIn || !!wx.getStorageSync('authToken'),
      navBarHeight: app.globalData.navBarHeight || 44
    });

    this.loadPost();
  },

  async loadPost() {
    try {
      const res = await communityApi.getPostById(this.data.postId);
      if (res.success && res.data) {
        const post = res.data;
        const userInfo = app.globalData.userInfo || wx.getStorageSync('user') || {};
        this.setData({
          post,
          isDeleted: post.isDeleted,
          isOwner: post.userId === userInfo.id
        });
        this.loadComments(true);
      } else {
        this.setData({ isDeleted: true });
      }
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  async loadComments(reset = false) {
    if (this.data.loadingComments) return;
    if (!reset && !this.data.hasMoreComments) return;

    this.setData({ loadingComments: true });

    try {
      const params = { limit: 20 };
      if (!reset && this.data.commentCursor) {
        params.cursor = this.data.commentCursor;
      }

      const res = await communityApi.getComments(this.data.postId, params);
      if (res.success) {
        this.setData({
          comments: reset ? res.data.list : [...this.data.comments, ...res.data.list],
          commentCursor: res.data.nextCursor,
          hasMoreComments: res.data.hasMore,
          loadingComments: false
        });
      }
    } catch (err) {
      this.setData({ loadingComments: false });
    }
  },

  onLoadMoreComments() {
    this.loadComments(false);
  },

  onCommentInput(e) {
    this.setData({ commentText: e.detail.value });
  },

  replyComment(e) {
    const { id, user } = e.currentTarget.dataset;
    this.setData({
      replyTarget: user,
      replyParentId: id,
      replyToUserId: null
    });
  },

  cancelReply() {
    this.setData({
      replyTarget: null,
      replyParentId: null,
      replyToUserId: null
    });
  },

  async submitComment() {
    const text = this.data.commentText.trim();
    if (!text) return;

    try {
      const payload = {
        content: text,
        parentId: this.data.replyParentId || null,
        replyToUserId: this.data.replyToUserId || null
      };

      await communityApi.createComment(this.data.postId, payload);
      this.setData({ commentText: '', replyTarget: null, replyParentId: null, replyToUserId: null });
      wx.showToast({ title: '发送成功', icon: 'success' });
      this.loadComments(true);
    } catch (err) {
      wx.showToast({ title: err.message || '发送失败', icon: 'none' });
    }
  },

  async deleteComment(e) {
    const commentId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条评论吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await communityApi.deleteComment(commentId);
            wx.showToast({ title: '删除成功', icon: 'success' });
            this.loadComments(true);
          } catch (err) {
            wx.showToast({ title: err.message || '删除失败', icon: 'none' });
          }
        }
      }
    });
  },

  showMenu() {
    this.setData({ showMenuPopup: true });
  },

  closeMenu() {
    this.setData({ showMenuPopup: false });
  },

  onMenuClose(e) {
    if (!e.detail.visible) {
      this.setData({ showMenuPopup: false });
    }
  },

  editPost() {
    this.setData({ showMenuPopup: false });
    wx.navigateTo({ url: `/packageCommunity/post-edit/post-edit?postId=${this.data.postId}` });
  },

  deletePost() {
    this.setData({ showMenuPopup: false });
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这篇帖子吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await communityApi.deletePost(this.data.postId);
            wx.showToast({ title: '删除成功', icon: 'success' });
            setTimeout(() => wx.navigateBack(), 1500);
          } catch (err) {
            wx.showToast({ title: err.message || '删除失败', icon: 'none' });
          }
        }
      }
    });
  },

  reportPost() {
    this.setData({ showMenuPopup: false, showReportPopup: true });
  },

  closeReport() {
    this.setData({ showReportPopup: false });
  },

  onReportClose(e) {
    if (!e.detail.visible) {
      this.setData({ showReportPopup: false });
    }
  },

  async submitReport(e) {
    const reason = e.currentTarget.dataset.reason;
    this.setData({ showReportPopup: false });

    // Request subscribe message permission
    try {
      const tmplRes = await new Promise((resolve, reject) => {
        wx.requestSubscribeMessage({
          tmplIds: ['yXtj85psFqKHQsAbcjxFo5wYX8SdU4acoYiENIRpiAE'],
          success: resolve,
          fail: reject
        });
      });

      if (tmplRes.errMsg !== 'requestSubscribeMessage:ok') {
        wx.showToast({ title: '需要订阅通知才能举报', icon: 'none' });
        return;
      }
    } catch (err) {
      // User declined, continue anyway
    }

    try {
      await communityApi.createReport({
        targetType: 'post',
        targetId: this.data.postId,
        reason,
        detail: ''
      });
      wx.showToast({ title: '举报已提交', icon: 'success' });
    } catch (err) {
      wx.showToast({ title: err.message || '提交失败', icon: 'none' });
    }
  },

  async showVisitors() {
    this.setData({ showVisitorsPopup: true });
    try {
      const res = await communityApi.getVisitors(this.data.postId);
      if (res.success) {
        this.setData({ visitors: res.data.list || [] });
      }
    } catch (err) {
      console.error('获取访客记录失败', err);
    }
  },

  closeVisitors() {
    this.setData({ showVisitorsPopup: false, visitors: [] });
  },

  onVisitorsClose(e) {
    if (!e.detail.visible) {
      this.setData({ showVisitorsPopup: false, visitors: [] });
    }
  },

  previewImage(e) {
    const url = e.currentTarget.dataset.url;
    const allImages = [...(this.data.post.images || [])];
    wx.previewImage({ current: url, urls: allImages.length > 0 ? allImages : [url] });
  },

  goBack() {
    wx.navigateBack();
  },

  formatTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr.replace(' ', 'T'));
    const m = date.getMonth() + 1;
    const d = date.getDate();
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${m}月${d}日 ${h}:${min}`;
  }
});
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(community): add post-detail page with comments and reporting"
```

---

### Task 11: Frontend — Admin report management pages

**Files:**
- Create: `packageAdmin/reports/reports.js`
- Create: `packageAdmin/reports/reports.wxml`
- Create: `packageAdmin/reports/reports.wxss`
- Create: `packageAdmin/reports/reports.json`
- Create: `packageAdmin/report-detail/report-detail.js`
- Create: `packageAdmin/report-detail/report-detail.wxml`
- Create: `packageAdmin/report-detail/report-detail.wxss`
- Create: `packageAdmin/report-detail/report-detail.json`
- Modify: `packageAdmin/index/index.wxml` (add reports entry)
- Modify: `app.json` (register report pages)

- [ ] **Step 1: Add report pages to app.json subpackage**

In the `packageAdmin` subpackage config, add to the pages array:
```json
"pages": [
  "index/index",
  "users/users",
  "user-detail/user-detail",
  "notices/notices",
  "notice-edit/notice-edit",
  "changelog/changelog",
  "changelog-edit/changelog-edit",
  "reports/reports",
  "report-detail/report-detail"
]
```

- [ ] **Step 2: Create reports.json**

```json
{
  "usingComponents": {
    "t-navbar": "tdesign-miniprogram/navbar/navbar",
    "t-cell": "tdesign-miniprogram/cell/cell",
    "t-badge": "tdesign-miniprogram/badge/badge"
  },
  "navigationStyle": "custom"
}
```

- [ ] **Step 3: Create reports.wxml**

```xml
<t-navbar title="举报管理" bind:left-click="goBack" />

<view class="tabs">
  <view class="tab {{currentTab === 0 ? 'active' : ''}}" bind:tap="switchTab" data-tab="0">待处理</view>
  <view class="tab {{currentTab === 1 ? 'active' : ''}}" bind:tap="switchTab" data-tab="1">已处理</view>
  <view class="tab {{currentTab === 2 ? 'active' : ''}}" bind:tap="switchTab" data-tab="2">已驳回</view>
</view>

<scroll-view scroll-y style="height: calc(100vh - 180rpx);" bind:scrolltolower="loadMore">
  <view wx:if="{{list.length === 0 && !loading}}" class="empty">
    <text>暂无举报记录</text>
  </view>

  <view wx:for="{{list}}" wx:key="id" class="report-card" bind:tap="goToDetail" data-id="{{id}}">
    <view class="report-header">
      <text class="report-reason">{{item.reason}}</text>
      <text class="report-status status-{{item.status}}">{{item.statusText}}</text>
    </view>
    <text class="report-content">{{item.targetContent}}</text>
    <view class="report-meta">
      <text>举报者：{{item.reporterNickname}}</text>
      <text>{{item.createdAt}}</text>
    </view>
  </view>

  <view wx:if="{{loading}}" class="loading">加载中...</view>
</scroll-view>
```

- [ ] **Step 4: Create reports.wxss**

```css
page { background: #f5f5f5; }

.tabs {
  display: flex;
  background: #fff;
  padding: 20rpx;
  border-bottom: 1rpx solid #eee;
}

.tab {
  flex: 1;
  text-align: center;
  padding: 12rpx;
  font-size: 26rpx;
  color: #666;
}

.tab.active {
  color: #00b26a;
  font-weight: 600;
  border-bottom: 4rpx solid #00b26a;
}

.report-card {
  background: #fff;
  margin: 20rpx;
  padding: 24rpx;
  border-radius: 16rpx;
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.report-reason {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}

.report-status {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}

.status-0 { background: #fff3e0; color: #ff9800; }
.status-1 { background: #e8f5e9; color: #4caf50; }
.status-2 { background: #f5f5f5; color: #999; }

.report-content {
  font-size: 24rpx;
  color: #666;
  display: block;
  margin-bottom: 12rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.report-meta {
  display: flex;
  justify-content: space-between;
  font-size: 20rpx;
  color: #999;
}

.empty, .loading {
  text-align: center;
  padding: 100rpx 0;
  color: #999;
  font-size: 26rpx;
}
```

- [ ] **Step 5: Create reports.js**

```javascript
const { communityApi, adminApi } = require('../../utils/api');

Page({
  data: {
    currentTab: 0,
    list: [],
    page: 1,
    hasMore: true,
    loading: false
  },

  onLoad() {
    this.loadList(true);
  },

  switchTab(e) {
    const tab = parseInt(e.currentTarget.dataset.tab);
    this.setData({ currentTab: tab, list: [], page: 1, hasMore: true });
    this.loadList(true);
  },

  async loadList(reset = false) {
    if (this.data.loading) return;
    if (!reset && !this.data.hasMore) return;

    this.setData({ loading: true });

    try {
      const res = await communityApi.getReportList({ status: this.data.currentTab });
      if (res.success) {
        const list = res.data.list || [];
        if (reset) {
          this.setData({ list });
        } else {
          this.setData({ list: [...this.data.list, ...list] });
        }
        this.setData({ hasMore: res.data.hasMore });
      }
    } catch (err) {
      console.error('加载举报列表失败', err);
    }

    this.setData({ loading: false });
  },

  loadMore() {
    if (this.data.hasMore) this.loadList(false);
  },

  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/packageAdmin/report-detail/report-detail?id=${id}` });
  },

  goBack() {
    wx.navigateBack();
  }
});
```

**Note:** The admin reports page needs a proper admin API call. Add this to the `communityApi` in `api.js`:

```javascript
getReportList: (params) => request({ url: '/api/reports/list', method: 'GET', data: params }),
getReportDetail: (id) => request({ url: `/api/reports/${id}`, method: 'GET' }),
processReport: (id, data) => request({ url: `/api/reports/${id}/process`, method: 'POST', data }),
```

- [ ] **Step 6: Create report-detail.json**

```json
{
  "usingComponents": {
    "t-navbar": "tdesign-miniprogram/navbar/navbar",
    "t-button": "tdesign-miniprogram/button/button",
    "t-textarea": "tdesign-miniprogram/textarea/textarea"
  },
  "navigationStyle": "custom"
}
```

- [ ] **Step 7: Create report-detail.wxml**

```xml
<t-navbar title="举报详情" bind:left-click="goBack" />

<view class="detail-container">
  <view class="info-row">
    <text class="label">举报者</text>
    <text class="value">{{report.reporterNickname}}</text>
  </view>
  <view class="info-row">
    <text class="label">举报类型</text>
    <text class="value">{{report.targetType === 'post' ? '帖子' : '评论'}}</text>
  </view>
  <view class="info-row">
    <text class="label">举报原因</text>
    <text class="value">{{report.reason}}</text>
  </view>
  <view class="info-row">
    <text class="label">举报时间</text>
    <text class="value">{{report.createdAt}}</text>
  </view>
  <view class="info-row">
    <text class="label">状态</text>
    <text class="value status-{{report.status}}">{{report.statusText}}</text>
  </view>

  <view class="section-title">被举报内容</view>
  <view class="content-box">
    <text>{{report.targetContent || '无内容'}}</text>
  </view>

  <view wx:if="{{report.detail}}" class="section-title">补充说明</view>
  <view wx:if="{{report.detail}}" class="content-box">
    <text>{{report.detail}}</text>
  </view>

  <!-- Processing area (only for pending) -->
  <view wx:if="{{report.status === 0}}" class="process-area">
    <view class="section-title">处理操作</view>
    <view class="process-buttons">
      <t-button theme="danger" bind:tap="processReport" data-action="delete">删除内容</t-button>
      <t-button theme="default" bind:tap="processReport" data-action="reject">驳回举报</t-button>
    </view>
    <textarea
      class="note-input"
      placeholder="处理备注（可选）"
      value="{{resultNote}}"
      bind:input="onNoteInput"
    />
  </view>

  <view wx:if="{{report.resultNote}}" class="section-title">处理备注</view>
  <view wx:if="{{report.resultNote}}" class="content-box">
    <text>{{report.resultNote}}</text>
  </view>
</view>
```

- [ ] **Step 8: Create report-detail.wxss**

```css
page { background: #f5f5f5; }

.detail-container {
  padding: 20rpx;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 20rpx 24rpx;
  background: #fff;
  border-bottom: 1rpx solid #f0f0f0;
  font-size: 26rpx;
}

.label { color: #999; }
.value { color: #333; }
.status-0 { color: #ff9800; }
.status-1 { color: #4caf50; }
.status-2 { color: #999; }

.section-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #333;
  margin: 24rpx 20rpx 12rpx;
}

.content-box {
  background: #fff;
  padding: 24rpx;
  border-radius: 16rpx;
  font-size: 26rpx;
  color: #444;
  line-height: 1.6;
  margin: 0 20rpx;
}

.process-area {
  margin-top: 30rpx;
  padding: 0 20rpx;
}

.process-buttons {
  display: flex;
  gap: 20rpx;
  margin-bottom: 20rpx;
}

.note-input {
  width: 100%;
  min-height: 120rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx;
  font-size: 26rpx;
  box-sizing: border-box;
}
```

- [ ] **Step 9: Create report-detail.js**

```javascript
const { communityApi } = require('../../utils/api');

Page({
  data: {
    reportId: null,
    report: {},
    resultNote: '',
    processing: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ reportId: parseInt(options.id) });
      this.loadDetail();
    }
  },

  async loadDetail() {
    try {
      const res = await communityApi.getReportDetail(this.data.reportId);
      if (res.success) {
        this.setData({ report: res.data });
      }
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  onNoteInput(e) {
    this.setData({ resultNote: e.detail.value });
  },

  async processReport(e) {
    const action = e.currentTarget.dataset.action;
    const actionText = action === 'delete' ? '删除内容并标记为已处理' : '驳回举报';

    wx.showModal({
      title: '确认操作',
      content: `确定要${actionText}吗？`,
      success: async (res) => {
        if (res.confirm) {
          this.setData({ processing: true });
          try {
            await communityApi.processReport(this.data.reportId, {
              action,
              resultNote: this.data.resultNote || null
            });
            wx.showToast({ title: '处理成功', icon: 'success' });
            this.loadDetail();
          } catch (err) {
            wx.showToast({ title: err.message || '处理失败', icon: 'none' });
          }
          this.setData({ processing: false });
        }
      }
    });
  },

  goBack() {
    wx.navigateBack();
  }
});
```

- [ ] **Step 10: Add reports entry to admin index page**

In `packageAdmin/index/index.wxml`, find the existing menu items and add:
```xml
<t-cell title="举报管理" arrow bind:tap="navigateTo" data-url="/packageAdmin/reports/reports" />
```

- [ ] **Step 11: Commit**

```bash
git add -A && git commit -m "feat(community): add admin report management pages"
```

---

### Task 12: Frontend — Add "我的举报" entry to more page

**Files:**
- Modify: `pages/more/more.wxml`
- Modify: `pages/more/more.js`

- [ ] **Step 1: Add "我的举报" cell to more.wxml**

Find the tools card section and add a cell after existing entries:
```xml
<!-- In the tools card, add: -->
<t-cell title="我的举报" arrow bind:tap="goToMyReports" />
```

- [ ] **Step 2: Add goToMyReports handler to more.js**

```javascript
goToMyReports() {
  wx.navigateTo({ url: '/packageAdmin/reports/reports' });
},
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(community): add 'my reports' entry to more page"
```

---

### Task 13: Review and integration pass

- [ ] **Step 1: Verify all route paths match api.js module**

Check that every route path in the backend matches what `communityApi` in `api.js` calls. The backend prefix is `/api` (added by nginx/apache proxy), so the actual backend routes are:
- `/posts/create`, `/posts/list`, `/posts/:postId`, `/posts/:postId/visitors`
- `/likes/toggle`, `/likes/:postId/users`
- `/post-comments/:postId`, `/post-comments/:commentId`
- `/reports/create`, `/reports/my`, `/reports/list`, `/reports/:id`, `/reports/:id/process`

- [ ] **Step 2: Verify frontend route consistency**

Check all `wx.navigateTo` calls:
- community-home → post-detail: `/packageCommunity/post-detail/post-detail?postId=xxx`
- community-home → post-edit: `/packageCommunity/post-edit/post-edit`
- post-detail → post-edit: `/packageCommunity/post-edit/post-edit?postId=xxx`
- more → my reports: `/packageAdmin/reports/reports`
- admin index → reports: `/packageAdmin/reports/reports`
- reports → report-detail: `/packageAdmin/report-detail/report-detail?id=xxx`

- [ ] **Step 3: Verify logger module usage**

All controllers use the existing logger methods (`logger.error(module, ...)`, `logger.warn(module, ...)`, `logger.commentError`, `logger.adminError`). Add `POST` as a module constant if desired, or keep using string literals. Ensure the `logger.info`/`logger.warn`/`logger.error` generic methods exist in `backend/utils/logger.js` (they do at lines 84-87).

- [ ] **Step 4: Test backend endpoints**

Restart the backend server and test each endpoint:
```bash
# Start/restart backend
cd backend && node app.js
```

Test with curl or from the mini program:
```bash
curl -X POST /posts/create -H "Authorization: Bearer $TOKEN" -d '{"postId":"test_1","title":"Hello World"}'
curl /posts/list -H "Authorization: Bearer $TOKEN"
curl /posts/xxx -H "Authorization: Bearer $TOKEN"
```

- [ ] **Step 5: Commit final integration fixes**

```bash
git add -A && git commit -m "fix(community): integration fixes after review"
```

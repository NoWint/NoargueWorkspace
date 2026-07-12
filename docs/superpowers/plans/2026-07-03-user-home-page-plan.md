# 用户主页系统 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增用户主页系统，包括独立 post-card 组件、后端用户资料/帖子接口、user-home 页面、以及从 community-home/post-detail/todo-detail 的跳转入口。

**Architecture:** 提取 community-home 的帖子卡片为独立组件 → post-detail 复用 → 新增后端接口 `/users/:userId/profile` 和 `/posts/user/:userId` → 新建 `packageProfile/pages/user-home` 页面 → 三个入口加跳转。

**Tech Stack:** WeChat Mini Program + Express/Node.js + MySQL

---

### Task 1: Backend — 新增 `/posts/user/:userId` 帖子列表接口

**Files:**
- Modify: `backend/controllers/postsController.js`
- Modify: `backend/routes/postsRoutes.js`

- [ ] **Step 1: 添加 getUserPosts 方法到 postsController**

在 `postsController.js` 中新增 `getUserPosts` 方法，复用现有的 `formatPost` 和查询逻辑，增加 `WHERE p.user_id = ?` 过滤：

```js
const getUserPosts = async (req, res) => {
  const currentUserId = req.user.id;
  const { userId } = req.params;
  const { cursor, limit: pageSize = 10 } = req.query;

  if (!userId) {
    return res.status(400).json({ success: false, message: '缺少userId参数' });
  }

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

    // getUserPosts: 按指定 userId 过滤
    params.push(userId);

    const rows = await query(
      `SELECT p.*, u.nickname, u.avatar_url, u.badge_titles, u.badge_colors,
              c.name as share_combo_name,
              (SELECT id FROM post_likes WHERE post_id = p.id AND user_id = ?) as user_like_id
       FROM posts p
       LEFT JOIN users u ON p.user_id = u.id
       LEFT JOIN combos c ON p.share_code = c.share_code
       WHERE p.is_deleted = 0 AND p.user_id = ? ${cursorWhere}
       ORDER BY p.created_at DESC, p.id DESC
       LIMIT ?`,
      [...params, pageSize + 1]
    );

    const hasMore = rows.length > pageSize;
    if (hasMore) rows.pop();

    const list = rows.map(row => formatPost(row, currentUserId));

    const nextCursor = hasMore && rows.length > 0
      ? `${rows[rows.length - 1].created_at}_${rows[rows.length - 1].id}`
      : null;

    res.json({ success: true, data: { list, nextCursor, hasMore } });
  } catch (err) {
    logger.error(POST_LOG, '用户帖子列表', '获取用户帖子列表失败', { userId, currentUserId, error: err.message });
    res.status(500).json({ success: false, message: '获取用户帖子列表失败' });
  }
};
```

注意：SQL 中 `?` 占位符顺序——`LIMIT` 必须在最后。上面代码中 params 顺序为 `[currentUserId, cursorParts..., userId]`，需要在 `...params` 之后 `push` `pageSize + 1`。请确保占位符数量和参数数组长度一致。

- [ ] **Step 2: 在 postsRoutes 中注册新路由**

```js
router.get('/user/:userId', authMiddleware, postsController.getUserPosts);
```

放在 `/list` 路由之后，`:postId` 路由之前（避免路由冲突，因为 `user` 不是数字 ID）。

- [ ] **Step 3: 导出 getUserPosts**

在 `postsController.js` 文件末尾的 `module.exports` 中添加：

```js
module.exports = {
  create,
  getList,
  getById,
  update,
  deletePost,
  getVisitors,
  getUserPosts  // 新增
};
```

- [ ] **Step 4: Commit**

```bash
git add backend/controllers/postsController.js backend/routes/postsRoutes.js
git commit -m "feat: add GET /posts/user/:userId endpoint for user post list"
```

---

### Task 2: Backend — 新增 `/users/:userId/profile` 用户资料接口

**Files:**
- Create: `backend/controllers/userController.js`
- Create: `backend/routes/userRoutes.js`
- Modify: `backend/app.js`

- [ ] **Step 1: 创建 userController.js**

新建文件 `backend/controllers/userController.js`：

```js
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
```

- [ ] **Step 2: 创建 userRoutes.js**

新建文件 `backend/routes/userRoutes.js`：

```js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware } = require('../middleware/auth');

router.get('/:userId/profile', authMiddleware, userController.getProfile);

module.exports = router;
```

- [ ] **Step 3: 在 app.js 中注册路由**

在 `backend/app.js` 中，与其他 `app.use` 一起添加：

```js
const userRoutes = require('./routes/userRoutes');
// ... 其他 require ...

app.use('/users', userRoutes);
```

建议放在 `app.use('/share', shareRoutes)` 之后（约第 67 行附近）。

- [ ] **Step 4: Commit**

```bash
git add backend/controllers/userController.js backend/routes/userRoutes.js backend/app.js
git commit -m "feat: add GET /users/:userId/profile endpoint for public user profile"
```

---

### Task 3: Frontend API client — 添加新接口调用方法

**Files:**
- Modify: `utils/api.js`

- [ ] **Step 1: 在 utils/api.js 中添加 userApi 和 postsByUser**

在 `communityApi` 定义附近，新建 `userApi` 对象：

```js
const userApi = {
  getProfile: (userId) => request({
    url: `/users/${userId}/profile`,
    method: 'GET'
  })
};
```

在 `communityApi` 中添加 `getUserPosts` 方法：

```js
const communityApi = {
  // ... 现有方法 ...
  getPostList: (params) => request({ url: '/posts/list', method: 'GET', data: params }),
  getUserPosts: (userId, params) => request({
    url: `/posts/user/${userId}`,
    method: 'GET',
    data: params
  }),
  // ... 其他方法 ...
};
```

注意：`utils/api.js` 末尾应该已经有一行 `module.exports = { ... }`。确保加入 `userApi`：

```js
module.exports = {
  authApi,
  todosApi,
  tagsApi,
  combosApi,
  collabApi,
  configApi,
  notifyApi,
  shareApi,
  adminApi,
  postsApi,
  reportsApi,
  communityApi,
  userApi  // 新增
};
```

- [ ] **Step 2: Commit**

```bash
git add utils/api.js
git commit -m "feat: add userApi.getProfile and communityApi.getUserPosts to API client"
```

---

### Task 4: 前端 — 抽取 post-card 独立组件

**Files:**
- Create: `components/post-card/post-card.json`
- Create: `components/post-card/post-card.wxml`
- Create: `components/post-card/post-card.wxss`
- Create: `components/post-card/post-card.js`
- Modify: `pages/community-home/community-home.json`
- Modify: `pages/community-home/community-home.wxml`
- Modify: `pages/community-home/community-home.wxss`
- Modify: `pages/community-home/community-home.js`

- [ ] **Step 1: 创建 post-card 组件配置 post-card.json**

```json
{
  "component": true,
  "usingComponents": {}
}
```

- [ ] **Step 2: 创建 post-card.wxml**

从 community-home.wxml 的 `<view class="post-card">` 内容（行 23-93）提取，包裹在 `<slot>` 外，用 `properties.post` 替代 `item`：

```xml
<view class="post-card" data-post-id="{{post.postId}}" bind:tap="onTapCard">
  <view class="post-header" bind:tap="onTapAuthor" data-user-id="{{post.user.id}}">
    <image class="post-avatar" src="{{post.user.avatar || '/images/avatar.png'}}" mode="aspectFill" binderror="onAvatarError" />
    <view class="post-user-info">
      <view class="nickname-row">
        <text class="post-nickname">{{post.user.nickname}}</text>
        <block wx:for="{{post.user.badgeTitles || []}}" wx:for-item="badge" wx:key="index">
          <text class="user-badge" style="color: {{post.user.badgeColors[index]}}; border-color: {{post.user.badgeColors[index]}}">{{badge}}</text>
        </block>
      </view>
      <view class="time-row">
        <text class="post-time">{{post.createdAtDisplay}}</text>
        <text wx:if="{{post.ipProvince}}" class="post-ip">IP属地 · {{post.ipProvince}}</text>
      </view>
    </view>
  </view>
  <view class="post-title">{{post.title}}</view>
  <view wx:if="{{post.body}}" class="post-body">{{post.body}}</view>
  <view wx:if="{{post.images && post.images.length > 0}}" class="post-images">
    <view class="grid-{{post.images.length === 1 ? 'single' : (post.images.length === 2 ? 'double' : 'triple')}}">
      <image
        wx:for="{{post.images}}" wx:key="*this"
        src="{{item}}" mode="{{post.images.length === 1 ? 'widthFix' : 'aspectFill'}}"
        class="post-image" catch:tap="onTapImage" data-url="{{item}}"
      />
    </view>
  </view>
  <view wx:if="{{post.location}}" class="location-card" catch:tap="onTapLocation" data-lat="{{post.location.latitude}}" data-lng="{{post.location.longitude}}" data-name="{{post.location.name || post.location}}">
    <t-icon name="location" size="28rpx" color="#00b26a" />
    <text class="location-text">{{post.location.name || post.location.address || post.location.text || post.location}}</text>
  </view>
  <view wx:if="{{post.todoIds && post.todoIds.length > 0 || post.shareCode}}" class="post-tags">
    <view wx:if="{{post.todoIds && post.todoIds.length > 0}}" class="tag-card" catch:tap="onTapTodoExpand" data-post-id="{{post.postId}}">
      <view class="tag-card-header">
        <t-icon name="check-circle" size="28rpx" color="#00b26a" />
        <text class="tag-card-title">{{post.todoIds.length}}个待办</text>
        <t-icon name="{{expanded ? 'chevron-up' : 'chevron-down'}}" size="28rpx" color="#999" />
      </view>
      <view wx:if="{{expanded}}" class="tag-card-body">
        <block wx:if="{{todoItems && todoItems.length > 0}}">
          <block wx:for="{{todoItems}}" wx:for-item="todoItem" wx:key="id">
            <view class="todo-mini-item" catch:tap="onTapTodo" data-todo-id="{{todoItem.id}}" data-creator-name="{{post.user.nickname}}" data-creator-avatar="{{post.user.avatar}}" data-post-id="{{post.postId}}" hover-class="tap-active">
              <view class="todo-mini-dot" data-priority="{{todoItem.priority}}"></view>
              <text class="todo-mini-text">{{todoItem.text}}</text>
            </view>
          </block>
        </block>
        <view wx:else class="tag-card-empty">加载中...</view>
      </view>
    </view>
    <view wx:if="{{post.shareCode}}" class="tag-item tag-combo" catch:tap="onTapCombo" data-code="{{post.shareCode}}">
      <t-icon name="user-add" size="28rpx" color="#00b26a" />
      <text wx:if="{{post.shareComboName}}">分享了组合：{{post.shareComboName}}</text>
      <text wx:else>加入组合</text>
    </view>
  </view>
  <view class="post-stats-row">
    <view class="stat-item" catch:tap="onTapDetail" data-post-id="{{post.postId}}">
      <t-icon name="chat" size="28rpx" />
      <text>{{post.commentsCount || 0}}</text>
    </view>
    <view class="stat-item {{post.isLiked ? 'liked' : ''}}" catch:tap="onToggleLike" data-post-id="{{post.postId}}">
      <t-icon name="{{post.isLiked ? 'heart-filled' : 'heart'}}" size="28rpx" />
      <text>{{post.likesCount || 0}}</text>
    </view>
    <view class="stat-item">
      <t-icon name="browse" size="28rpx" />
      <text>{{post.viewsCount || 0}}</text>
    </view>
  </view>
</view>
```

关键变更：所有事件从 `bindtap` 改为 `catch:tap="onXxx"`，通过 `triggerEvent` 向父组件传递。

- [ ] **Step 3: 创建 post-card.js**

```js
Component({
  properties: {
    post: {
      type: Object,
      value: {}
    },
    showAuthor: {
      type: Boolean,
      value: true
    },
    compact: {
      type: Boolean,
      value: false
    },
    showStats: {
      type: Boolean,
      value: true
    },
    expanded: {
      type: Boolean,
      value: false
    },
    todoItems: {
      type: Array,
      value: []
    }
  },

  methods: {
    onTapAuthor(e) {
      this.triggerEvent('tapAuthor', { userId: this.data.post.user.id, post: this.data.post });
    },

    onTapCard(e) {
      this.triggerEvent('tapCard', { postId: this.data.post.postId });
    },

    onTapDetail(e) {
      this.triggerEvent('tapDetail', { postId: this.data.post.postId });
    },

    onTapImage(e) {
      const url = e.currentTarget.dataset.url;
      this.triggerEvent('tapImage', { url, images: this.data.post.images });
    },

    onTapTodoExpand(e) {
      this.triggerEvent('tapTodoExpand', { postId: this.data.post.postId });
    },

    onTapTodo(e) {
      const { todoId, creatorName, creatorAvatar, postId } = e.currentTarget.dataset;
      this.triggerEvent('tapTodo', { todoId, creatorName, creatorAvatar, postId });
    },

    onTapCombo(e) {
      const code = e.currentTarget.dataset.code;
      this.triggerEvent('tapCombo', { shareCode: code });
    },

    onTapLocation(e) {
      const { lat, lng, name } = e.currentTarget.dataset;
      this.triggerEvent('tapLocation', { lat, lng, name });
    },

    onToggleLike(e) {
      const postId = e.currentTarget.dataset.postId;
      this.triggerEvent('toggleLike', { postId });
    },

    onAvatarError() {
      // 不修改 this.data, 只触发父组件做 fallback
      this.triggerEvent('avatarError');
    }
  }
});
```

- [ ] **Step 4: 创建 post-card.wxss**

从 community-home.wxss 复制所有以 `.post-card`、`.post-header`、`.post-avatar`、`.post-user-info`、`.post-nickname`、`.nickname-row`、`.user-badge`、`.post-time`、`.time-row`、`.post-ip`、`.post-title`、`.post-body`、`.post-images`、`.grid-single`、`.grid-double`、`.grid-triple`、`.post-image`、`.location-card`、`.location-text`、`.post-tags`、`.tag-item`、`.tag-card`、`.tag-card-header`、`.tag-card-title`、`.tag-card-body`、`.tag-card-empty`、`.todo-mini-item`、`.todo-mini-dot`、`.todo-mini-dot[data-priority]`、`.todo-mini-text`、`.tag-combo`、`.post-stats-row`、`.stat-item`、`.stat-item.liked`、`.tap-active` 开头的样式块。

精简后（不含 community-home 专有样式如 `.top`、`.header`、`.feed-list`、`.loading-more` 等）：

```css
.post-card {
  background: #fff;
  margin: 20rpx;
  padding: 30rpx;
  border-radius: 32rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.06);
}

.post-header {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}

.post-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  margin-right: 16rpx;
}

.post-user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.post-nickname {
  font-size: 38rpx;
  font-weight: 600;
  color: #333;
  margin-right: 8rpx;
}

.nickname-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8rpx;
}

.user-badge {
  font-size: 20rpx;
  padding: 2rpx 10rpx;
  border-radius: 32rpx;
  border: 2rpx solid;
  white-space: nowrap;
  line-height: 1.4;
}

.post-time {
  font-size: 22rpx;
  color: #999;
  margin-top: 4rpx;
}

.time-row {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.post-ip {
  font-size: 20rpx;
  color: #999;
}

.post-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a1a;
  line-height: 1.5;
  margin-bottom: 8rpx;
}

.post-body {
  font-size: 30rpx;
  color: #666;
  line-height: 1.2;
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
  border-radius: 32rpx;
  margin-bottom: 8rpx;
}

.grid-double {
  display: flex;
  gap: 12rpx;
}

.grid-double .post-image {
  width: 50%;
  height: 300rpx;
  border-radius: 32rpx;
}

.grid-triple {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12rpx;
}

.grid-triple .post-image {
  width: 100%;
  height: 200rpx;
  border-radius: 32rpx;
}

.location-card {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  background: #f0fdf6;
  padding: 8rpx 20rpx;
  border-radius: 24rpx;
  font-size: 26rpx;
  color: #00b26a;
  margin-bottom: 8rpx;
}

.post-tags {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  margin-bottom: 8rpx;
}

.tag-item {
  display: flex;
  align-items: center;
  gap: 4rpx;
  font-size: 26rpx;
  color: #00b26a;
  background: #f0fdf6;
  padding: 4rpx 14rpx;
  border-radius: 32rpx;
}

.tag-card {
  width: 100%;
  background: #f0fdf6;
  border-radius: 20rpx;
  overflow: hidden;
}

.tag-card-header {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 10rpx 16rpx;
}

.tag-card-title {
  flex: 1;
  font-size: 26rpx;
  color: #00b26a;
}

.tag-card-body {
  padding: 0 16rpx 10rpx;
}

.tag-card-empty {
  font-size: 24rpx;
  color: #999;
  padding: 8rpx 0;
}

.todo-mini-item {
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 4rpx 16rpx;
  margin-bottom: 12rpx;
  border-radius: 32rpx;
  background: #ccebda;
  border-top: 1rpx solid rgba(0, 178, 106, 0.1);
  min-height: 60rpx;
}

.todo-mini-dot {
  width: 20rpx;
  height: 20rpx;
  border-radius: 50%;
  background: #bbb;
  flex-shrink: 0;
}

.todo-mini-dot[data-priority="p1"] { background: #e34d59; }
.todo-mini-dot[data-priority="p2"] { background: #2196F3; }
.todo-mini-dot[data-priority="p3"] { background: #ff9800; }
.todo-mini-dot[data-priority="p4"] { background: #999; }

.todo-mini-text {
  flex: 1;
  font-size: 28rpx;
  color: #555;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag-combo {
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
  font-size: 26rpx;
  color: #00b26a;
  background: #f0fdf6;
  padding: 4rpx 14rpx;
  border-radius: 32rpx;
  align-self: flex-start;
}

.post-stats-row {
  display: flex;
  align-items: center;
  gap: 40rpx;
  padding-top: 12rpx;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 28rpx;
  color: #999;
}

.stat-item.liked {
  color: #ff4757;
}

.tap-active {
  opacity: 0.6;
}
```

- [ ] **Step 5: 改造 community-home 使用 post-card 组件**

修改 `community-home.json`，添加 usingComponents：

```json
{
  "usingComponents": {
    "post-card": "/components/post-card/post-card"
  }
}
```

修改 `community-home.wxml`，将帖子卡片内容替换为组件调用：

```xml
<view class="feed-list">
  <block wx:for="{{postList}}" wx:key="postId">
    <post-card
      post="{{item}}"
      expanded="{{expandedPostId === item.postId}}"
      todoItems="{{postTodoMap[item.postId] || []}}"
      bind:tapAuthor="onPostTapAuthor"
      bind:tapCard="goToDetail"
      bind:tapDetail="goToDetail"
      bind:tapImage="previewImage"
      bind:tapTodoExpand="toggleTodoExpand"
      bind:tapTodo="goToTodoDetail"
      bind:tapCombo="handleComboTap"
      bind:tapLocation="openLocation"
      bind:toggleLike="toggleLike"
    />
  </block>
  <!-- 加载更多/空状态保持不变 -->
</view>
```

注意：`.post-card` 原有 `data-post-id="{{item.postId}}" bind:tap="goToDetail"` 逻辑现在由 `bind:tapCard="goToDetail"` 处理。同时需要移除 community-home.wxml 中原来的卡片 WXML 代码（行 22-93）。

在 `community-home.js` 中，事件处理函数保持不变（`toggleTodoExpand`、`previewImage`、`goToTodoDetail` 等依然使用 `e.currentTarget.dataset` 读取数据——但因为组件的 `catch:tap` 事件通过 `triggerEvent` 传递，需要改为从 `e.detail` 读取数据）。

需要修改的事件处理函数：

**toggleTodoExpand**: 原来用 `e.currentTarget.dataset.postId` → 改为 `e.detail.postId`

```js
async toggleTodoExpand(e) {
  const postId = e.detail.postId;
  // ... 剩余逻辑不变（this.data.postList.find、todoIds等）
},
```

**previewImage**: 原来用 `e.currentTarget.dataset` → 改为 `e.detail`

```js
previewImage(e) {
  const { url, images } = e.detail;
  // 如果 post 有 images，从 e.detail 获取
  // 否则直接用 url
  wx.previewImage({ current: url, urls: images || [url] });
},
```

**goToTodoDetail**: 原来用 `e.currentTarget.dataset` → 改为 `e.detail`

```js
goToTodoDetail(e) {
  const { todoId, creatorName, creatorAvatar, postId } = e.detail;
  // ... 剩余逻辑不变
},
```

**toggleLike**: 原来用 `e.currentTarget.dataset.postId` → 改为 `e.detail.postId`

```js
async toggleLike(e) {
  const postId = e.detail.postId;
  // ... 剩余逻辑不变
},
```

**openLocation**: 原来用 `e.currentTarget.dataset` → 改为 `e.detail`

```js
openLocation(e) {
  const { lat, lng, name } = e.detail;
  // ... 剩余逻辑不变
},
```

**handleComboTap**: 原来用 `e.currentTarget.dataset.code` → 改为 `e.detail.shareCode`

```js
handleComboTap(e) {
  const shareCode = e.detail.shareCode;
  // ... 剩余逻辑不变
},
```

**新增 onPostTapAuthor**（跳转到 user-home 页面）：

```js
onPostTapAuthor(e) {
  const { userId } = e.detail;
  if (!userId) return;
  wx.navigateTo({ url: `/packageProfile/pages/user-home/user-home?userId=${userId}` });
},
```

移除 community-home.wxss 中已被提取到 post-card.wxss 的样式（`.post-card` 到 `.tap-active` 之间的整段），仅保留 community-home 专有样式（`.top`, `.header`, `.title`, `.scroll-view`, `.feed-list`, `.loading-more`, `.no-more`, `.empty-state`）。

注意：需要在 community-home.wxss 中添加 `@import` 引入组件样式（实际上组件样式由组件自己加载，不需要父页面 @import——小程序会自动处理组件样式隔离）。但 community-home 还需要保留自己的 `@import "../todo/todo.wxss";`（如果是原有）。

- [ ] **Step 6: Commit**

```bash
git add components/post-card/ pages/community-home/
git commit -m "feat: extract post-card component from community-home"
```

---

### Task 5: 改造 post-detail 使用 post-card 组件

**Files:**
- Modify: `packageCommunity/post-detail/post-detail.json`
- Modify: `packageCommunity/post-detail/post-detail.wxml`
- Modify: `packageCommunity/post-detail/post-detail.wxss`
- Modify: `packageCommunity/post-detail/post-detail.js`

- [ ] **Step 1: 在 post-detail.json 中注册组件**

```json
{
  "usingComponents": {
    "post-card": "/components/post-card/post-card"
  }
}
```

- [ ] **Step 2: 改造 post-detail.wxml 中的帖子卡片**

将 `<view class="post-card">`（行 8-68）替换为 post-card 组件调用。但注意 post-detail 的卡片与 community-home 的卡片有以下几个差异：
1. 没有 `bindtap` 跳转到详情（已经在详情页了）
2. 统计行多了一个「更多」按钮
3. 没有评论数统计，但有「N次浏览」文本
4. 有「已编辑」徽标

因此 post-detail 不直接完全替换为 post-card 组件，而是保留自己的卡片布局但引入 post-card 的样式。或者我们保留 post-detail 的现有卡片代码，从 post-card.wxss 中 @import 样式。

实际更干净的方案：post-detail 引用 post-card.wxss，保持自己的 WXML 结构差异。但这次的任务中用户要求的是 post-detail 也要重新引入 post-card 组件。

考虑到 post-detail 的统计行和行为不同，我们可以给 post-card 加一个 `mode="detail"` 属性来控制显示差异。但这会增加组件的复杂度。

更好的方案：post-detail 使用 post-card 显示帖子主体内容（标题、正文、图片、位置、标签），然后用自己的WXML加统计行和更多按钮。

但这样的话组件内部还是要区分模式。让我们换个思路：

post-detail 只使用 post-card 作为帖子内容展示区域，然后在 post-card 上方或下方用自己的元素。post-card 内不包含统计行。

这需要重新设计 post-card，让它包含/不包含 stats-row 由属性控制。

实际上，最简单的做法是：post-card 组件通过 `showStats` 属性控制是否显示统计行，post-detail 场景下传 `showStats="{{false}}"`, 然后 post-detail 自己在组件下方写统计行。

但这样 post-card 内部仍然需要有一层条件渲染。

**最佳方案**：让 post-card 支持 `slot` 或使用 `showStats` 控制。因为 post-detail 的统计行布局与 community-home 的完全不同（有更多按钮、浏览文字），所以用 `showStats` 隐藏内部统计行，在 post-detail 的组件外自己渲染统计行。

修改一个步骤：在 Task 4 的 post-card.wxml 中，将 stats-row 包裹在 `wx:if="{{showStats}}"` 中：

```xml
<view wx:if="{{showStats !== false}}" class="post-stats-row">
  ...
</view>
```

在 post-card.js 的 properties 中增加 `showStats`：

```js
showStats: {
  type: Boolean,
  value: true
}
```

然后在 post-detail.wxml 中：

```xml
<post-card
  post="{{post}}"
  showStats="{{false}}"
  todoExpanded="{{todoExpanded}}"
  todoItems="{{todoItems}}"
  bind:tapImage="previewImage"
  bind:tapTodoExpand="toggleTodoExpand"
  bind:tapTodo="goToTodoDetail"
  bind:tapCombo="handleComboTap"
  bind:tapLocation="openLocation"
  bind:toggleLike="toggleLike"
  bind:tapAuthor="onPostTapAuthor"
/>

<!-- post-detail 特有的统计行 -->
<view class="post-stats">
  <view class="stat-item {{isOwner ? 'visitor-link' : ''}}" bind:tap="{{isOwner ? 'showVisitors' : ''}}">
    <t-icon name="browse" size="28rpx" />
    <text>{{post.viewsCount}}次浏览{{isOwner ? ' · 查看访客记录' : ''}}</text>
  </view>
  <view class="stat-item {{post.isLiked ? 'liked' : ''}}" catch:tap="toggleLike">
    <t-icon name="{{post.isLiked ? 'heart-filled' : 'heart'}}" size="28rpx" />
    <text>{{post.likesCount || 0}}</text>
  </view>
  <view class="stat-item more-btn" bind:tap="onMore">
    <t-icon name="more" size="36rpx" color="#999" />
  </view>
</view>
```

post-detail 的 toggleLike 需要从 `e.detail.postId` 接收：

```js
async toggleLike(e) {
  // 可以忽略 e.detail.postId，因为 post-detail 只有一篇帖子
  // ... 现有逻辑不变
},
```

但注意，post-detail 中原来的 `bind:tap="toggleLike"` 在组件里是通过 `catch:tap="onToggleLike"` → `triggerEvent('toggleLike')`，所以 `toggleLike(e)` 方法接收到的 `e.detail` 是 `{ postId }`，实际用不到。

其实 `post-detail` 场景下不需要 `showStats` 属性，因为统计行完全在 post-card 之外。我们把 `post-card` 内的 stats-row 用 `wx:if` 控制：

在 post-card.wxml 中，stats-row 包裹：

```xml
<view wx:if="{{showStats}}" class="post-stats-row">
  ...
</view>
```

在 post-detail 中传 `showStats="{{false}}"`。

需要从 community-home 的事件处理函数调整中把 `tapCard`（原本用来跳转详情）重命名为更清晰的命名。实际上 community-home 中需要的是 `tapCard` 跳转到 post-detail，而 post-detail 中 `tapCard` 不需要操作。

**简化**：post-card 不处理 `tapCard` 事件，让父页面决定。community-home 监听 `tapCard`，post-detail 不监听即可。

WXML 改造完成步骤：

上方的 post-header 部分（作者信息行）在 post-detail 中也应保留。只是 post-detail 的 post-header 不需要 `bind:tap="onTapAuthor"` 跳转——不对，post-detail 也需要跳转到用户主页（当点击帖子作者时）。实际上用户的要求中也说了 post-detail 点击帖子作者区域要跳转到 user-home。

所以 post-detail 跟 community-home 一样要监听 `tapAuthor`。

OK，那么 post-detail 改造后的 WXML 就像上面那样。

原有的 post-detail.wxss 中 `.post-card` 到 `.tap-active` 的样式（行 14-245）需要在 post-detail.wxss 中替换为 `@import` 引入 post-card 的样式；或者直接从 post-detail.wxss 中删除这些样式（因为 post-card 组件自己会加载样式，小程序组件样式隔离默认情况下组件样式不会影响页面，页面样式也不会影响组件）。

**这里有一个重要的坑**：微信小程序自定义组件的样式隔离。组件的 wxss 只对组件内部生效，页面 wxss 只对页面内部生效。所以 post-detail.wxss 中原来定义 `.post-card` 等样式不需要了——它们被 post-card 自己的样式替代。但 post-detail 自己的 `.post-stats`、`.more-btn` 等以下（统计行及评论区）的样式需要保留。

因此从 `post-detail.wxss` 中删除行 14-245（`.post-card` 到 `.tag-combo` 结束），保留剩下的评论样式和底部输入栏样式。

- [ ] **Step 3: 修复 post-detail 的 createdAtDisplay 字段名一致性**

post-detail.js 中的 `loadPost` 方法设置了 `post._createdAtDisplay`（带下划线前缀），但 post-card 组件模板中读取的是 `post.createdAtDisplay`。需要设置两个字段以确保组件兼容：

在 `post-detail.js` 的 `loadPost` 方法中（约第 113 行），修改为：

```js
post._createdAtDisplay = this.formatTime(post.createdAt);
post.createdAtDisplay = post._createdAtDisplay; // post-card 组件兼容
post._updatedAtDisplay = this.formatTime(post.updatedAt);
post.updatedAtDisplay = post._updatedAtDisplay;
```

- [ ] **Step 4: 在 post-detail 中添加 onPostTapAuthor**

```js
// post-detail.js 中新增方法
onPostTapAuthor(e) {
  const { userId } = e.detail;
  if (!userId) return;
  wx.navigateTo({ url: `/packageProfile/pages/user-home/user-home?userId=${userId}` });
},
```

与此同时，评论和回复区域中的用户头像、昵称，也需要加上跳转到 user-home 的能力（根据 spec）。在 post-detail.wxml 中，评论用户头像和昵称区域添加 `bind:tap="onCommentTapAuthor"`，通过 `data-user-id="{{item.user.id}}"` 传值。

```xml
<!-- 评论作者头像 -->
<image class="comment-avatar" src="{{item.user.avatar || '/images/avatar.png'}}" mode="aspectFill" catch:tap="onCommentTapAuthor" data-user-id="{{item.user.id}}" />
<!-- 评论作者昵称 -->
<text class="comment-nickname" catch:tap="onCommentTapAuthor" data-user-id="{{item.user.id}}">{{item.user.nickname}}</text>
```

对应 JS：

```js
onCommentTapAuthor(e) {
  const userId = e.currentTarget.dataset.userId;
  if (!userId) return;
  wx.navigateTo({ url: `/packageProfile/pages/user-home/user-home?userId=${userId}` });
},
```

- [ ] **Step 4: Commit**

```bash
git add components/post-card/post-card.js components/post-card/post-card.wxml packageCommunity/post-detail/
git commit -m "refactor: integrate post-card component into post-detail"
```

---

### Task 6: 注册 packageProfile 子包

**Files:**
- Modify: `app.json`

- [ ] **Step 1: 在 app.json 中注册子包**

在 `subPackages` 数组中新增：

```json
{
  "root": "packageProfile",
  "name": "profile",
  "pages": [
    "pages/user-home/user-home"
  ]
}
```

在 `preloadRule` 中，为 `community-home` 和 `post-detail` 所在包添加预加载规则：

```json
"preloadRule": {
  // ... 已有规则 ...
  "pages/community-home/community-home": {
    "network": "all",
    "packages": ["community", "profile"]
  }
}
```

注意：`preloadRule` 中的 key 需要调整。目前 `community-home` 已经是 key 且有 `"packages": ["community"]`。改为 `"packages": ["community", "profile"]`。

同时，`todo` 页面的 preload 也要加上 `"profile"`（因为 todo-detail 中也需要跳转到 user-home）：

```json
"pages/todo/todo": {
  "network": "all",
  "packages": ["combo", "pages", "profile"]
}
```

- [ ] **Step 2: 创建包目录和占位文件**

```bash
mkdir -p "E:\WechatDevelop\TimeGreen Path Todo\packageProfile\pages\user-home"
```

- [ ] **Step 3: Commit**

```bash
git add app.json
git commit -m "feat: register packageProfile sub-package with user-home page"
```

---

### Task 7: 创建 user-home 页面

**Files:**
- Create: `packageProfile/pages/user-home/user-home.json`
- Create: `packageProfile/pages/user-home/user-home.wxml`
- Create: `packageProfile/pages/user-home/user-home.wxss`
- Create: `packageProfile/pages/user-home/user-home.js`

- [ ] **Step 1: 创建 user-home.json**

```json
{
  "usingComponents": {
    "post-card": "/components/post-card/post-card"
  },
  "enablePullDownRefresh": true,
  "backgroundColor": "#e3f5eb",
  "navigationBarTitleText": "用户主页"
}
```

- [ ] **Step 2: 创建 user-home.wxml**

布局：顶部用户资料区域 + 帖子列表

```xml
<!-- 骨架屏 -->
<view wx:if="{{pageLoading}}" class="skeleton">
  <view class="skeleton-avatar"></view>
  <view class="skeleton-line skeleton-name"></view>
  <view class="skeleton-line skeleton-badge"></view>
  <view class="skeleton-line skeleton-id"></view>
  <view class="skeleton-btn-group">
    <view class="skeleton-btn"></view>
    <view class="skeleton-btn"></view>
  </view>
  <view class="skeleton-section-title"></view>
  <view class="skeleton-card"></view>
  <view class="skeleton-card"></view>
</view>

<!-- 正常内容 -->
<scroll-view wx:else
  scroll-y
  class="scroll-view"
  style="height: 100vh;"
  refresher-enabled="{{true}}"
  refresher-triggered="{{refreshing}}"
  bind:refresherrefresh="onRefresh"
  bind:scrolltolower="onLoadMore"
>
  <!-- 用户资料头部 -->
  <view class="profile-header">
    <view class="avatar-wrapper">
      <image class="profile-avatar" src="{{user.avatarUrl || '/images/avatar.png'}}" mode="aspectFill" binderror="onAvatarError" />
    </view>
    <view class="profile-name">{{user.nickname || '未知用户'}}</view>
    <view wx:if="{{user.badgeTitles && user.badgeTitles.length > 0}}" class="profile-badges">
      <block wx:for="{{user.badgeTitles}}" wx:for-item="badge" wx:key="index">
        <text class="user-badge" style="color: {{user.badgeColors[index]}}; border-color: {{user.badgeColors[index]}}">{{badge}}</text>
      </block>
    </view>
    <view class="profile-id">#{{userId}}</view>

    <!-- 按钮组 -->
    <view wx:if="{{isSelf}}" class="profile-actions self-actions">
      <view class="profile-stat-text">
        <text>发布了{{user.postCount || 0}}篇帖子 · 注册了{{regDays}}天</text>
      </view>
      <view class="profile-edit-btn" bindtap="goToEditProfile">
        <text>编辑个人资料</text>
      </view>
    </view>
    <view wx:else class="profile-actions">
      <view class="action-btn action-btn-placeholder" bindtap="onPlaceholderAction">
        <text>私信</text>
      </view>
      <view class="action-btn action-btn-placeholder" bindtap="onPlaceholderAction">
        <text>关注</text>
      </view>
    </view>
  </view>

  <!-- 帖子列表 -->
  <view class="posts-section">
    <view class="section-title">帖子（{{user.postCount || 0}}）</view>
    <block wx:for="{{posts}}" wx:key="postId">
      <post-card
        post="{{item}}"
        expanded="{{expandedPostId === item.postId}}"
        todoItems="{{postTodoMap[item.postId] || []}}"
        bind:tapCard="goToPostDetail"
        bind:tapImage="previewImage"
        bind:tapTodoExpand="toggleTodoExpand"
        bind:tapTodo="goToTodoDetail"
        bind:tapCombo="handleComboTap"
        bind:tapLocation="openLocation"
        bind:toggleLike="toggleLike"
      />
    </block>
    <view wx:if="{{loadingMore}}" class="loading-more">
      <t-loading loading="{{true}}" size="40rpx" />
      <text>加载中...</text>
    </view>
    <view wx:if="{{!hasMore && posts.length > 0}}" class="no-more">
      <text>— 没有更多了 —</text>
    </view>
    <view wx:if="{{!loading && posts.length === 0}}" class="empty-state">
      <t-icon name="message" size="100rpx" />
      <text>暂无帖子</text>
    </view>
  </view>
</scroll-view>
```

- [ ] **Step 3: 创建 user-home.wxss**

```css
/* ========== 骨架屏 ========== */
.skeleton {
  padding: 60rpx 40rpx;
}

.skeleton-avatar {
  width: 128rpx;
  height: 128rpx;
  border-radius: 50%;
  background: linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  margin: 0 auto 24rpx;
}

.skeleton-line {
  height: 28rpx;
  border-radius: 14rpx;
  background: linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  margin: 0 auto 16rpx;
}

.skeleton-name {
  width: 200rpx;
  height: 48rpx;
}

.skeleton-badge {
  width: 300rpx;
}

.skeleton-id {
  width: 120rpx;
}

.skeleton-btn-group {
  display: flex;
  justify-content: center;
  gap: 30rpx;
  margin: 40rpx 0;
}

.skeleton-btn {
  width: 160rpx;
  height: 64rpx;
  border-radius: 32rpx;
  background: linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-section-title {
  width: 180rpx;
  height: 32rpx;
  margin: 40rpx 0 20rpx;
}

.skeleton-card {
  height: 200rpx;
  border-radius: 32rpx;
  background: linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  margin-bottom: 20rpx;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ========== 用户资料头部 ========== */
.profile-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60rpx 40rpx 30rpx;
}

.avatar-wrapper {
  margin-bottom: 20rpx;
}

.profile-avatar {
  width: 128rpx;
  height: 128rpx;
  border-radius: 50%;
}

.profile-name {
  font-size: 64rpx;
  font-weight: 700;
  color: #333;
  margin-bottom: 16rpx;
}

.profile-badges {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12rpx;
  margin-bottom: 12rpx;
}

.user-badge {
  font-size: 20rpx;
  padding: 2rpx 10rpx;
  border-radius: 32rpx;
  border: 2rpx solid;
  white-space: nowrap;
  line-height: 1.4;
}

.profile-id {
  font-size: 24rpx;
  color: #999;
  margin-bottom: 30rpx;
}

.profile-actions {
  display: flex;
  justify-content: center;
  gap: 30rpx;
  width: 100%;
}

.action-btn {
  width: 200rpx;
  height: 72rpx;
  border-radius: 36rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
}

.action-btn-placeholder {
  border: 2rpx dashed #ccc;
  color: #999;
  background: transparent;
}

.self-actions {
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}

.profile-stat-text {
  font-size: 26rpx;
  color: #999;
}

.profile-edit-btn {
  width: 280rpx;
  height: 72rpx;
  border-radius: 36rpx;
  background: #00b26a;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
}

/* ========== 帖子区域 ========== */
.posts-section {
  padding: 0 0 100rpx 0;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  padding: 20rpx 30rpx;
}

.loading-more,
.no-more {
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
  padding: 100rpx 0;
  color: #999;
  font-size: 28rpx;
  gap: 20rpx;
}
```

- [ ] **Step 4: 创建 user-home.js**

```js
const app = getApp();
const { communityApi, userApi } = require('../../utils/api');

Page({
  data: {
    userId: null,
    isSelf: false,
    user: null,
    posts: [],
    nextCursor: null,
    hasMore: true,
    loading: false,
    loadingMore: false,
    refreshing: false,
    pageLoading: true,
    expandedPostId: null,
    postTodoMap: {},
    regDays: 0
  },

  onLoad(options) {
    const userId = options.userId;
    if (!userId) {
      wx.showToast({ title: '参数错误', icon: 'none' });
      wx.navigateBack();
      return;
    }

    // 判断是否自己的主页
    const currentUser = app.globalData.userInfo || wx.getStorageSync('user') || {};
    const isSelf = String(currentUser.id) === String(userId);

    this.setData({ userId, isSelf });
    this.loadAll();
  },

  async loadAll() {
    this.setData({ loading: true, refreshing: true });
    try {
      // 并行拉取用户资料和帖子列表
      const [profileRes, postsRes] = await Promise.all([
        userApi.getProfile(this.data.userId),
        communityApi.getUserPosts(this.data.userId, { limit: 20 })
      ]);

      let user = null;
      let regDays = 0;

      if (profileRes.success) {
        user = profileRes.data;
        if (user.createdAt) {
          const created = new Date(user.createdAt);
          regDays = Math.floor((Date.now() - created.getTime()) / 86400000) + 1;
        }
      }

      let posts = [];
      let nextCursor = null;
      let hasMore = true;

      if (postsRes.success) {
        const list = (postsRes.data.list || []).map(item => {
          const ts = item.createdAt || item.created_at || null;
          return { ...item, createdAt: ts, createdAtDisplay: this.formatTime(ts) };
        });
        posts = list;
        nextCursor = postsRes.data.nextCursor;
        hasMore = postsRes.data.hasMore;
      }

      this.setData({
        user,
        regDays,
        posts,
        nextCursor,
        hasMore,
        loading: false,
        loadingMore: false,
        refreshing: false,
        pageLoading: false
      });
    } catch (err) {
      console.error('加载用户主页失败', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
      this.setData({ loading: false, loadingMore: false, refreshing: false, pageLoading: false });
    }
  },

  onRefresh() {
    this.loadAll();
  },

  onLoadMore() {
    if (this.data.loadingMore || !this.data.hasMore) return;
    this.setData({ loadingMore: true });
    communityApi.getUserPosts(this.data.userId, { cursor: this.data.nextCursor, limit: 20 })
      .then(res => {
        if (res.success) {
          const list = (res.data.list || []).map(item => {
            const ts = item.createdAt || item.created_at || null;
            return { ...item, createdAt: ts, createdAtDisplay: this.formatTime(ts) };
          });
          this.setData({
            posts: [...this.data.posts, ...list],
            nextCursor: res.data.nextCursor,
            hasMore: res.data.hasMore,
            loadingMore: false
          });
        }
      })
      .catch(() => {
        this.setData({ loadingMore: false });
        wx.showToast({ title: '加载失败', icon: 'none' });
      });
  },

  goToPostDetail(e) {
    const postId = e.detail.postId;
    if (!postId) return;
    wx.navigateTo({ url: `/packageCommunity/post-detail/post-detail?postId=${postId}` });
  },

  goToEditProfile() {
    wx.navigateTo({ url: '/packagePages/user-center/user-center' });
  },

  onPlaceholderAction() {
    wx.showToast({ title: '即将开放', icon: 'none' });
  },

  async toggleTodoExpand(e) {
    const postId = e.detail.postId;
    const post = this.data.posts.find(p => p.postId === postId);
    if (!post || !post.todoIds || post.todoIds.length === 0) return;

    if (this.data.expandedPostId === postId) {
      this.setData({ expandedPostId: null });
      return;
    }

    if (!this.data.postTodoMap[postId]) {
      try {
        const { todosApi } = require('../../utils/api');
        const res = await todosApi.getTodosBatch(post.todoIds);
        if (res.success && res.data) {
          this.data.postTodoMap[postId] = res.data;
          this.setData({ postTodoMap: this.data.postTodoMap, expandedPostId: postId });
        }
      } catch (err) {
        wx.showToast({ title: '加载待办失败', icon: 'none' });
      }
    } else {
      this.setData({ expandedPostId: postId });
    }
  },

  async toggleLike(e) {
    const postId = e.detail.postId;
    try {
      const res = await communityApi.toggleLike({ postId });
      if (res.success) {
        const posts = [...this.data.posts];
        const idx = posts.findIndex(p => p.postId === postId);
        if (idx !== -1) {
          posts[idx].isLiked = res.data.liked;
          posts[idx].likesCount += res.data.liked ? 1 : -1;
          this.setData({ posts });
        }
      }
    } catch (err) { console.error('点赞失败', err); }
  },

  previewImage(e) {
    const { url, images } = e.detail;
    wx.previewImage({ current: url, urls: images || [url] });
  },

  goToTodoDetail(e) {
    const { todoId, creatorName, creatorAvatar, postId } = e.detail;
    if (!todoId) return;
    wx.navigateTo({
      url: `/packagePages/todo-detail/todo-detail?communityTodoId=${todoId}&creatorName=${encodeURIComponent(creatorName || '')}&creatorAvatar=${encodeURIComponent(creatorAvatar || '')}&postId=${postId || ''}`
    });
  },

  openLocation(e) {
    const { lat, lng, name } = e.detail;
    if (!lat || !lng) return;
    wx.openLocation({
      latitude: parseFloat(lat),
      longitude: parseFloat(lng),
      name: name || '目标位置',
      scale: 18
    });
  },

  handleComboTap(e) {
    const shareCode = e.detail.shareCode;
    if (!shareCode) return;
    wx.setStorageSync('pendingShareData', {
      type: 'combo_invite',
      code: shareCode,
      auto: false,
      timestamp: Date.now()
    });
    wx.switchTab({ url: '/pages/todo/todo' });
  },

  onAvatarError() {
    // fallback handled in wxml
  },

  formatTime(dateStr) {
    if (!dateStr) return '';
    try {
      let date;
      if (typeof dateStr === 'string') {
        const s = dateStr.replace('T', ' ').replace(/\.\d+Z$/, '');
        const p = s.split(/[- :]/);
        date = new Date(+p[0], +p[1] - 1, +p[2], +(p[3]||0), +(p[4]||0), +(p[5]||0));
      } else {
        date = new Date(dateStr);
      }
      if (isNaN(date.getTime())) { console.warn('[user-home formatTime] Invalid date:', dateStr); return ''; }
      const now = Date.now();
      const diff = Math.floor((now - date.getTime()) / 1000);
      if (diff < 60) return '刚刚';
      if (diff < 3600) return Math.floor(diff / 60) + '分钟前';
      if (diff < 86400) return Math.floor(diff / 3600) + '小时前';
      if (diff < 2592000) return Math.floor(diff / 86400) + '天前';
      const m = date.getMonth() + 1;
      const d = date.getDate();
      return m + '月' + d + '日';
    } catch (e) { console.warn('[user-home formatTime] error:', e, dateStr); return ''; }
  }
});
```

- [ ] **Step 5: Commit**

```bash
git add packageProfile/pages/user-home/
git commit -m "feat: implement user-home page with profile header and post list"
```

---

### Task 8: 入口跳转改造 — community-home 添加帖子作者跳转

**Files:**
- Modify: `pages/community-home/community-home.js`

这个任务实际上已经在 Task 4（Step 5）中通过 `onPostTapAuthor` 方法完成了。确认不需要额外操作。

- [ ] **Step 1: 验证 community-home 中的 onPostTapAuthor 方法已存在**

从 Task 4 Step 5 中，`onPostTapAuthor` 方法已经添加：

```js
onPostTapAuthor(e) {
  const { userId } = e.detail;
  if (!userId) return;
  wx.navigateTo({ url: `/packageProfile/pages/user-home/user-home?userId=${userId}` });
},
```

- [ ] **Step 2: Commit**（如果之前提交未包含此变更）

此步骤的变更已在 Task 4 中包含。无需单独提交。

---

### Task 9: 入口跳转改造 — post-detail 添加帖子作者和评论用户跳转

**Files:**
- Modify: `packageCommunity/post-detail/post-detail.wxml`
- Modify: `packageCommunity/post-detail/post-detail.js`

- [ ] **Step 1: 评论和回复头像/昵称添加跳转**

在 post-detail.wxml 中，给评论作者头像（行 77）、昵称（行 81）添加 `catch:tap="onCommentTapAuthor"`：

```xml
<!-- 评论作者头像 -->
<image class="comment-avatar" src="{{item.user.avatar || '/images/avatar.png'}}" mode="aspectFill" catch:tap="onCommentTapAuthor" data-user-id="{{item.user.id}}" />
<!-- 评论作者昵称 -->
<text class="comment-nickname" catch:tap="onCommentTapAuthor" data-user-id="{{item.user.id}}">{{item.user.nickname}}</text>
```

同理，回复的头像（行 113/145）和昵称（行 117/149）也加上：

```xml
<!-- 回复作者头像 -->
<image class="reply-avatar" src="{{reply.user.avatar || '/images/avatar.png'}}" mode="aspectFill" catch:tap="onCommentTapAuthor" data-user-id="{{reply.user.id}}" />
<!-- 回复作者昵称 -->
<text class="reply-nickname" catch:tap="onCommentTapAuthor" data-user-id="{{reply.user.id}}">{{reply.user.nickname}}</text>
```

- [ ] **Step 2: 添加 onCommentTapAuthor 方法**

在 `post-detail.js` 中添加：

```js
onCommentTapAuthor(e) {
  const userId = e.currentTarget.dataset.userId;
  if (!userId) return;
  wx.navigateTo({ url: `/packageProfile/pages/user-home/user-home?userId=${userId}` });
},
```

- [ ] **Step 3: Commit**

```bash
git add packageCommunity/post-detail/
git commit -m "feat: add user-home navigation from post author and comment users"
```

---

### Task 10: 入口跳转改造 — todo-detail 创建人员跳转 + creator.id 修复

**Files:**
- Modify: `packagePages/todo-detail/todo-detail.wxml`
- Modify: `packagePages/todo-detail/todo-detail.js`
- Modify: `pages/community-home/community-home.js` (传递 creatorId)

- [ ] **Step 1: 分析并补全各路径 creator.id**

**路径1 — 管理员查看路径**（`_loadAdminViewWithApi`）：
需要确保 API 返回的 `creator` 包含 `id`。查看 `backend/controllers/adminController.js` 约第 1974 行，已经有 `id, nickname, avatar_url` 字段。在前端 `_loadAdminViewWithApi` 中设置 `creator` 时同时取 `id`：

```js
// 在 todo-detail.js _loadAdminViewWithApi 方法中
creator: creator ? {
  id: creator.id,  // 新增
  nickname: creator.nickname || '未知用户',
  avatar: creator.avatar || '/images/avatar.png'
} : null,
```

**路径2 — 共享待办路径**（`loadSharedTodo`）：
`comboController.getById` 已在 sharedTodos 的每个 todo 上附加了 `creator: { id, nickname, avatar }`。所以 `sharedTodo.creator.id` 已经有值。确认 post-detail.js 中 `loadSharedTodo` 的代码也用了这个结构：

```js
// loadSharedTodo 中 sharedTodo.creator 来自后端，已有 id
const creator = sharedTodo.creator || null;
// 后续 setData({ creator }) - 直接使用
```

如果 `sharedTodo.creator` 为 null 或没有 id 的情况，需要添加 fallback：

```js
const creator = sharedTodo.creator ? {
  id: sharedTodo.creator.id,
  nickname: sharedTodo.creator.nickname || '未知用户',
  avatar: sharedTodo.creator.avatar || '/images/avatar.png'
} : null;
```

**路径3 — 社区帖子路径**（`_loadByCommunityTodo`）：
需要从跳转 URL 中获取 `creatorId`。在 `community-home` 的 `goToTodoDetail` 中，添加传递 `creatorId`：

```js
// community-home.js goToTodoDetail
goToTodoDetail(e) {
  const { todoId, creatorName, creatorAvatar, postId } = e.detail;
  if (!todoId) return;
  wx.navigateTo({
    url: `/packagePages/todo-detail/todo-detail?communityTodoId=${todoId}&creatorName=${encodeURIComponent(creatorName || '')}&creatorAvatar=${encodeURIComponent(creatorAvatar || '')}&postId=${postId || ''}&creatorId=${e.detail.creatorId || ''}`
  });
},
```

同时需要在 post-card 的 `onTapTodo` 事件中传递 `creatorId`。在 post-card.wxml 的 todo-mini-item 添加 `data-creator-id="{{post.user.id}}"`：

```xml
<view class="todo-mini-item" catch:tap="onTapTodo"
  data-todo-id="{{todoItem.id}}"
  data-creator-name="{{post.user.nickname}}"
  data-creator-avatar="{{post.user.avatar}}"
  data-creator-id="{{post.user.id}}"
  data-post-id="{{post.postId}}"
  hover-class="tap-active">
```

并在 `onTapTodo` 中传递：

```js
onTapTodo(e) {
  const { todoId, creatorName, creatorAvatar, creatorId, postId } = e.currentTarget.dataset;
  this.triggerEvent('tapTodo', { todoId, creatorName, creatorAvatar, creatorId, postId });
},
```

在 `_loadByCommunityTodo` 中读取并设置 creator.id：

```js
// 在 onLoad 中从 options 读取
const { communityTodoId, creatorName, creatorAvatar, postId, creatorId } = options;

// 构建 creator 时
const creator = creatorName ? {
  id: creatorId ? Number(creatorId) : null,  // 新增
  nickname: decodeURIComponent(creatorName),
  avatar: creatorAvatar ? decodeURIComponent(creatorAvatar) : null
} : null;
```

**路径4 — 分享链接路径**（`options.creator`）：
在 `onLoad` 的分享路径中将 `creator` JSON 解析后，确保有 id：

```js
try {
  creator = JSON.parse(creatorInfo);
  // 如果 creator 对象缺少 id，补 null
  if (creator && !creator.id) creator.id = null;
} catch (e) {
  creator = { id: null, nickname: creatorInfo || '未知用户', avatar: '/images/avatar.png' };
}
```

- [ ] **Step 2: 在 todo-detail.wxml 的创建人员区域添加跳转**

```xml
<view class="creator-content" bindlongpress="copyCreator" catch:tap="goToUserHome" data-user-id="{{creator.id}}">
```

添加跳转方法：

```js
goToUserHome(e) {
  const userId = e.currentTarget.dataset.userId;
  if (!userId) return;
  wx.navigateTo({ url: `/packageProfile/pages/user-home/user-home?userId=${userId}` });
},
```

- [ ] **Step 3: Commit**

```bash
git add packagePages/todo-detail/ pages/community-home/community-home.js
git commit -m "feat: add user-home navigation from todo-detail creator area, fix creator.id"
```

---

### Task 11: Spec 自检 & 计划完善

- [ ] **Step 1: Spec 覆盖检查**

对照 spec 检查每个需求是否被计划覆盖：

| Spec 需求 | 对应 Task |
|-----------|----------|
| post-card 组件抽取 | Task 4 |
| community-home 使用 post-card | Task 4 |
| post-detail 使用 post-card | Task 5 |
| user-home 使用 post-card | Task 7 |
| GET /users/:userId/profile | Task 2 |
| GET /posts/user/:userId | Task 1 |
| API client 接口 | Task 3 |
| packageProfile 子包 | Task 6 |
| user-home 页面布局 | Task 7 |
| 骨架屏加载态 | Task 7 |
| 下拉刷新 | Task 7 |
| 他人→占位按钮 | Task 7 |
| 自己→统计+编辑 | Task 7 |
| community-home 跳转 | Task 4 (onPostTapAuthor) + Task 8 |
| post-detail 跳转 | Task 5 (onPostTapAuthor) + Task 9 |
| post-detail 评论用户跳转 | Task 9 |
| todo-detail 跳转 | Task 10 |
| todo-detail creator.id 修复 | Task 10 |

- [ ] **Step 2: 搜索计划中的占位符**

搜索关键词：TBD、TODO、待补充、later、will be done、后续、以后 — 确保没有遗漏。

- [ ] **Step 3: 确认类型一致性**

检查跨 Task 的类型名和属性是否一致：
- `userApi.getProfile(userId)` 返回 `{ success, data: { id, nickname, avatarUrl, badgeTitles, badgeColors, postCount, createdAt } }` — Task 3 定义，Task 7 使用 ✓
- `communityApi.getUserPosts(userId, params)` 返回 `{ success, data: { list, nextCursor, hasMore } }` — Task 3 定义，Task 7 使用 ✓
- `post-card` 组件属性 `post, showAuthor, compact, showStats, expanded, todoItems` — Task 4 定义，Task 5/7 使用 ✓
- post-card 事件 `tapAuthor` 的 `detail` 包含 `{ userId }` — Task 4 定义，Task 4/5 使用 ✓

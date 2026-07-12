# Post-Detail 评论系统完善实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为帖子评论系统添加点赞功能和图片上传能力

**Architecture:** 点赞沿用帖子点赞的 toggle 模式（新建 `post_comment_likes` 表 + toggle API），图片上传复用 post-edit 的 `uploadImage` 函数和 `t-upload` 组件

**Tech Stack:** Express.js + MySQL, WeChat MiniProgram, TDesign

---

## 文件结构

| 文件 | 操作 | 说明 |
|------|------|------|
| `backend/migrations/027_create_post_comment_likes.sql` | 新建 | 评论点赞关联表 |
| `backend/controllers/postCommentsController.js` | 修改 | 新增 `toggleLike`；`getList` 增加 `isLiked` 字段 |
| `backend/routes/postCommentsRoutes.js` | 修改 | 新增 `POST /:commentId/like` 路由 |
| `utils/api.js` | 修改 | `communityApi` 新增 `toggleCommentLike` |
| `packageCommunity/post-detail/post-detail.json` | 修改 | 添加 `t-upload` 组件引用 |
| `packageCommunity/post-detail/post-detail.wxml` | 修改 | 评论项加点赞图标、输入栏加图片上传区域 |
| `packageCommunity/post-detail/post-detail.wxss` | 修改 | 点赞样式、图片上传区域样式 |
| `packageCommunity/post-detail/post-detail.js` | 修改 | 点赞 handler、图片选择/上传/提交逻辑 |

---

### Task 1: 数据库迁移 — 创建 post_comment_likes 表

**Files:**
- Create: `backend/migrations/027_create_post_comment_likes.sql`

- [ ] **Step 1: 创建迁移文件**

```sql
-- 评论点赞关联表
CREATE TABLE IF NOT EXISTS post_comment_likes (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    comment_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_comment_user (comment_id, user_id),
    INDEX idx_comment_id (comment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='评论点赞记录';
```

- [ ] **Step 2: Commit**

```bash
git add backend/migrations/027_create_post_comment_likes.sql
git commit -m "feat: add post_comment_likes table for comment likes"
```

---

### Task 2: 后端 — 评论点赞 toggle API

**Files:**
- Modify: `backend/controllers/postCommentsController.js` (末尾, 在 `module.exports` 前新增 `toggleLike`)
- Modify: `backend/routes/postCommentsRoutes.js`

- [ ] **Step 1: 在 postCommentsController.js 新增 toggleLike**

在 `deleteComment` 函数之后、`module.exports` 之前添加：

```js
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
```

- [ ] **Step 2: 注册路由**

修改 `backend/routes/postCommentsRoutes.js`：

在 `router.delete('/:commentId', ...)` 之后添加一行：

```js
router.post('/:commentId/like', authMiddleware, postCommentsController.toggleLike);
```

- [ ] **Step 3: 更新 exports**

确认 `postCommentsController.js` 末尾的 `module.exports` 包含 `toggleLike`：

```js
module.exports = { getList, create, deleteComment, toggleLike };
```

- [ ] **Step 4: Commit**

```bash
git add backend/controllers/postCommentsController.js backend/routes/postCommentsRoutes.js
git commit -m "feat: add comment like toggle API"
```

---

### Task 3: 后端 — 评论列表返回 isLiked 标识

**Files:**
- Modify: `backend/controllers/postCommentsController.js`

- [ ] **Step 1: 修改主评论 SQL，增加 user_like_id 子查询**

将 `getList` 中的主评论查询 SQL 修改（在 `c.is_deleted` 条件后追加子查询列）：

```js
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
```

注意：参数需额外传入 `userId` 作为第一个参数，原 `[postDbId, ...params, pageSize + 1]` → 改为 `[userId, postDbId, ...params, pageSize + 1]`。

- [ ] **Step 2: 修改回复 SQL，增加 user_like_id 子查询**

```js
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
```

- [ ] **Step 3: 修改 rootComments 和 buildTree 中的返回对象，加入 isLiked**

在 `rootComments.map()` 的返回对象中增加 `isLiked: !!c.user_like_id`：

```js
const rootComments = mainComments.map(c => ({
  id: c.id,
  // ... 保持现有字段不变 ...
  likesCount: c.likes_count,
  isLiked: !!c.user_like_id,
  // ...
}));
```

在 `buildTree` 函数的 `c.map()` 返回对象中同样增加：

```js
.map(c => ({
  id: c.id,
  // ... 保持现有字段不变 ...
  likesCount: c.likes_count,
  isLiked: !!c.user_like_id,
  // ...
}));
```

- [ ] **Step 4: Commit**

```bash
git add backend/controllers/postCommentsController.js
git commit -m "feat: add isLiked flag to comment list response"
```

---

### Task 4: 前端 API — 新增 toggleCommentLike

**Files:**
- Modify: `utils/api.js`

- [ ] **Step 1: 在 communityApi 对象中新增方法**

在 `communityApi` 的 `deleteComment` 之后、`reports` 部分之前插入：

```js
toggleCommentLike: (commentId) => request({
  url: `/post-comments/${commentId}/like`,
  method: 'POST'
}),
```

- [ ] **Step 2: Commit**

```bash
git add utils/api.js
git commit -m "feat: add toggleCommentLike API"
```

---

### Task 5: 前端 — 评论点赞 UI

**Files:**
- Modify: `packageCommunity/post-detail/post-detail.wxml`
- Modify: `packageCommunity/post-detail/post-detail.wxss`
- Modify: `packageCommunity/post-detail/post-detail.js`

- [ ] **Step 1: wxml — 在评论/回复的 comment-time 旁增加点赞按钮**

评论项的 `comment-header-row` 下方，`comment-content` 之后修改：

```xml
<text class="comment-content">{{item.content}}</text>
<view wx:if="{{item.images && item.images.length > 0}}" class="comment-images">
  <image wx:for="{{item.images}}" wx:key="*this" src="{{item}}" mode="aspectFill" class="comment-image" bind:tap="previewImage" data-url="{{item}}" />
</view>
<view class="comment-footer">
  <text class="comment-time">{{item._createdDisplay}}</text>
  <view class="comment-like {{item.isLiked ? 'liked' : ''}}" catch:tap="toggleCommentLike" data-id="{{item.id}}">
    <t-icon name="{{item.isLiked ? 'heart-filled' : 'heart'}}" size="24rpx" />
    <text wx:if="{{item.likesCount > 0}}" class="like-count">{{item.likesCount}}</text>
  </view>
</view>
```

回复项的 `reply-content` 之后同样修改：

```xml
<text class="reply-content">{{reply.content}}</text>
<view class="comment-footer">
  <text class="comment-time">{{reply._createdDisplay}}</text>
  <view class="comment-like {{reply.isLiked ? 'liked' : ''}}" catch:tap="toggleCommentLike" data-id="{{reply.id}}">
    <t-icon name="{{reply.isLiked ? 'heart-filled' : 'heart'}}" size="24rpx" />
    <text wx:if="{{reply.likesCount > 0}}" class="like-count">{{reply.likesCount}}</text>
  </view>
</view>
```

注意：替换掉原来单独的 `<text class="comment-time">...</text>`。

- [ ] **Step 2: wxss — 新增点赞和评论底部栏样式**

在 `comment-time` 样式附近追加：

```css
.comment-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4rpx;
}
.comment-like {
  display: flex;
  align-items: center;
  gap: 4rpx;
  font-size: 20rpx;
  color: #bbb;
  padding: 4rpx;
}
.comment-like.liked {
  color: #00b26a;
}
.like-count {
  font-size: 20rpx;
  color: inherit;
  min-width: 16rpx;
}
```

- [ ] **Step 3: js — 新增 toggleCommentLike handler**

在 `post-detail.js` 中 `deleteComment` 之后添加：

```js
async toggleCommentLike(e) {
  const commentId = e.currentTarget.dataset.id;
  try {
    const res = await communityApi.toggleCommentLike(commentId);
    if (res.success) {
      // 更新本地评论列表中的点赞状态
      const updateItem = (items) => items.map(c => {
        if (c.id === commentId) {
          c.isLiked = res.data.liked;
          c.likesCount = res.data.likesCount;
        }
        if (c.replies) c.replies = updateItem(c.replies);
        return c;
      });
      this.setData({ comments: updateItem(this.data.comments) });
    }
  } catch (err) {
    wx.showToast({ title: '操作失败', icon: 'none' });
  }
},
```

同时确认文件顶部的 import 有 `communityApi`：

```js
const { communityApi, todosApi } = require('../../utils/api');
```
`communityApi` 应该已经在 `require` 中了（从当前代码看是第 2 行）。

- [ ] **Step 4: Commit**

```bash
git add packageCommunity/post-detail/post-detail.wxml packageCommunity/post-detail/post-detail.wxss packageCommunity/post-detail/post-detail.js
git commit -m "feat: add comment like UI with toggle handler"
```

---

### Task 6: 前端 — 评论配图上传

**Files:**
- Modify: `packageCommunity/post-detail/post-detail.json` (添加 `t-upload` 组件)
- Modify: `packageCommunity/post-detail/post-detail.wxml` (输入区增加图片上传)
- Modify: `packageCommunity/post-detail/post-detail.wxss` (图片上传区域样式)
- Modify: `packageCommunity/post-detail/post-detail.js` (图片选择/上传/提交逻辑)

- [ ] **Step 1: 在 post-detail.json 注册 t-upload 组件**

```json
{
  "usingComponents": {
    "t-icon": "tdesign-miniprogram/icon/icon",
    "t-image": "tdesign-miniprogram/image/image",
    "t-loading": "tdesign-miniprogram/loading/loading",
    "t-popup": "tdesign-miniprogram/popup/popup",
    "t-upload": "tdesign-miniprogram/upload/upload"
  }
}
```

- [ ] **Step 2: wxml — 在输入栏上方添加图片上传区域**

将原有底部输入栏区域修改，增加 `t-upload` 组件在 `bottom-input-bar` 上方：

在 `</scroll-view>` 之后（即 `bottom-input-bar` 所在的 view 之前）添加：

```xml
<view wx:if="{{showImageUpload}}" class="comment-image-bar">
  <t-upload
    mediaType="{{['image']}}"
    max="{{9}}"
    files="{{commentFiles}}"
    gridConfig="{{gridConfig}}"
    config="{{uploadConfig}}"
    draggable="{{false}}"
    bind:add="handleCommentImageAdd"
    bind:remove="handleCommentImageRemove"
    bind:click="handleCommentImageClick"
  />
</view>
```

在 `bottom-input-bar` 内部左侧增加图片按钮（输入框前面）：

```xml
<view class="bottom-input-bar">
  <t-icon name="image" size="40rpx" color="#999" catch:tap="toggleImagePicker" />
  <input class="comment-input" ... />
  ...
</view>
```

- [ ] **Step 3: wxss — 新增图片上传栏样式**

```css
.comment-image-bar {
  background: #fff;
  padding: 12rpx 20rpx 0;
  border-top: 1rpx solid #f0f0f0;
}
```

- [ ] **Step 4: js — 在 data 中初始化图片相关字段**

在 `data` 对象中添加：

```js
data: {
  // ... 现有字段 ...
  commentFiles: [],
  commentImageUrls: [],
  showImageUpload: false,
  gridConfig: { column: 5, width: 120, height: 120 },
  uploadConfig: { count: 9, sizeType: ['compressed'], sourceType: ['album', 'camera'] },
},
```

- [ ] **Step 5: js — 添加 compressImage 和 uploadImage 函数（文件级，Page 外）**

在 `Page({` 定义之前添加（跟在 `require` 语句之后）：

```js
const compressImage = (filePath) => {
  return new Promise((resolve) => {
    wx.getFileInfo({
      filePath,
      success(info) {
        if (info.size > 2 * 1024 * 1024) {
          wx.compressImage({ src: filePath, quality: 80, success: (r) => resolve(r.tempFilePath) });
        } else { resolve(filePath); }
      },
      fail: () => resolve(filePath)
    });
  });
};

const uploadImage = (filePath, retryCount = 0) => {
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: 'https://img.scdn.io/api/v1.php',
      filePath, name: 'image',
      success(res) {
        try {
          const data = JSON.parse(res.data);
          const url = data && data.data && data.data.url ? data.data.url : (data && data.url ? data.url : null);
          if (url) resolve(url);
          else reject(new Error('上传返回URL异常'));
        } catch { reject(new Error('上传返回格式异常')); }
      },
      fail(err) {
        if (retryCount < 3) {
          setTimeout(() => uploadImage(filePath, retryCount + 1).then(resolve).catch(reject), 1000 * (retryCount + 1));
        } else { reject(err); }
      }
    });
  });
};
```

- [ ] **Step 6: js — 添加图片选择/删除/预览 handler**

在 Page 的 methods 中添加（`toggleCommentLike` 之后）：

```js
toggleImagePicker() {
  this.setData({ showImageUpload: !this.data.showImageUpload });
},

async handleCommentImageAdd(e) {
  const { files } = e.detail;
  const currentCount = this.data.commentFiles.length;
  if (currentCount >= 9) { wx.showToast({ title: '最多上传9张图片', icon: 'none' }); return; }
  const filesToAdd = files.slice(0, 9 - currentCount);
  if (filesToAdd.length === 0) return;
  for (let i = 0; i < filesToAdd.length; i++) {
    const file = filesToAdd[i];
    wx.showLoading({ title: `上传中 ${i + 1}/${filesToAdd.length}`, mask: true });
    try {
      const compressed = await compressImage(file.url);
      const url = await uploadImage(compressed);
      const newItem = { url, name: `comment_img_${Date.now()}_${i}`, type: 'image', status: 'done' };
      this.setData({
        commentFiles: [...this.data.commentFiles, newItem],
        commentImageUrls: [...this.data.commentImageUrls, url]
      });
    } catch (err) {
      wx.showToast({ title: '图片上传失败', icon: 'none' });
    }
  }
  wx.hideLoading();
},

handleCommentImageRemove(e) {
  const { index } = e.detail;
  const files = [...this.data.commentFiles];
  const urls = [...this.data.commentImageUrls];
  files.splice(index, 1);
  urls.splice(index, 1);
  this.setData({ commentFiles: files, commentImageUrls: urls });
},

handleCommentImageClick(e) {
  const { index } = e.detail;
  wx.previewImage({ current: this.data.commentImageUrls[index], urls: this.data.commentImageUrls });
},
```

- [ ] **Step 7: js — 修改 submitComment 在提交时携带图片**

```js
async submitComment() {
  const text = this.data.commentText.trim();
  if (!text && this.data.commentImageUrls.length === 0) return;
  try {
    await communityApi.createComment(this.data.postId, {
      content: text,
      images: this.data.commentImageUrls.length > 0 ? this.data.commentImageUrls : null,
      parentId: this.data.replyParentId || null,
      replyToUserId: this.data.replyToUserId || null
    });
    this.setData({
      commentText: '', replyTarget: null, replyParentId: null, replyToUserId: null,
      commentFiles: [], commentImageUrls: [], showImageUpload: false
    });
    wx.showToast({ title: '发送成功', icon: 'success' });
    this.loadComments(true);
  } catch (err) { wx.showToast({ title: err.message || '发送失败', icon: 'none' }); }
},
```

注意：原来的 `submitComment` 检查 `if (!text) return` → 改为 `if (!text && this.data.commentImageUrls.length === 0) return`，允许纯图片评论。

- [ ] **Step 8: Commit**

```bash
git add packageCommunity/post-detail/post-detail.json packageCommunity/post-detail/post-detail.wxml packageCommunity/post-detail/post-detail.wxss packageCommunity/post-detail/post-detail.js
git commit -m "feat: add comment image upload with t-upload"
```

---

## 验证方法

1. 运行迁移 `027_create_post_comment_likes.sql`，确认表创建成功
2. 对主评论点赞 → 心形变实心绿色、计数+1 → 再次点击取消 → 恢复空心灰色、计数-1
3. 对回复点赞/取消，行为同上
4. 点击输入框左侧图片按钮 → t-upload 展开 → 选图 → 上传 → 缩略图显示
5. 发送带图片的评论 → 评论卡片显示图片 → 点击可 preview
6. 纯图片评论（无文字）正常发送
7. 回复评论时也可选图发送

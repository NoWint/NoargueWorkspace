# Post-Detail 评论系统完善设计

## 概述

对社区帖子详情页的评论系统进行两个方向的增强：评论点赞 和 评论配图。保持和现有系统风格一致，复用已有组件和工具函数。

## 1. 评论点赞

### 数据库

新迁移文件 `027_create_post_comment_likes.sql`：

```sql
CREATE TABLE IF NOT EXISTS post_comment_likes (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    comment_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_comment_user (comment_id, user_id),
    INDEX idx_comment_id (comment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

`post_comments` 表已有 `likes_count` 字段，复用。

### 后端

**`postCommentsController.js`** 新增：

- `toggleLike(req, res)` — 检测 `post_comment_likes` 是否有记录，有则删除（取消赞）并 `likes_count - 1`，无则插入（点赞）并 `likes_count + 1`
  - 校验评论存在且未删除
  - 使用 `transaction` 保证点赞计数与明细记录一致
- `getList` 返回数据中增加 `isLiked` 标识：左连查询当前用户是否已赞（方式同 posts 的 `user_like_id`）

**路由 `postCommentsRoutes.js`** 新增：

- `POST /post-comments/:commentId/like` → `postCommentsController.toggleLike`

### 前端

- 每条评论/回复的 `comment-time` 旁增加点赞区域：心形图标 + 点赞数
- 已赞状态用实心心形+绿色，未赞用空心+灰色
- 点击调用 `communityApi.toggleCommentLike(commentId)` 后更新本地状态
- 点赞 API 返回新的 `likesCount` 和 `isLiked`，直接 setData 避免重新拉取列表

**`api.js`** `communityApi` 新增：

```js
toggleCommentLike: (commentId) => request({
  url: `/post-comments/${commentId}/like`,
  method: 'POST'
})
```

## 2. 评论配图

### 后端

`postCommentsController.js` 的 `create` 方法已支持 `images` 参数（JSON 数组），无需改动。

### 前端 UI

在底部输入栏扩充图片上传能力：

- **图片选择入口**：输入框左侧增加图片按钮（`t-icon name="image"`），点击触发 `wx.chooseImage`
- **缩略图预览**：选图后在输入框上方显示缩略图行（横向滚动），每张图右上角有删除按钮
- **上传时机**：点击发送时，先调用 `uploadImage` 逐个上传图片（复用 post-edit 的 `uploadImage` 函数），获得 URL 数组后与文字评论一同提交
- 使用 `t-upload` 组件实现，参考 post-edit 页的图片选择模式：

- `t-upload` 配置：`count: 9`, `sizeType: ['compressed']`, `sourceType: ['album', 'camera']`
- 图片选择入口位于输入框上方，选图后以缩略图列表形式展示
- 图片在 `t-upload` 中可预览、可删除
- 提交评论时逐个上传图片 URL，连同文字一起发送

### 数据流

1. 用户选图 → `wx.chooseImage({ count: 9 - pendingImages.length })`
2. 暂存 `pendingImages`（本地临时路径列表）
3. 用户点击发送 → 并行上传所有未上传图片 → 得到 URL 数组
4. 调用 `communityApi.createComment(postId, { content, images: urls, parentId, replyToUserId })`
5. 成功后清空输入栏和图片列表，刷新评论

## 文件改动清单

| 文件 | 改动 |
|------|------|
| `backend/migrations/027_create_post_comment_likes.sql` | 新建 |
| `backend/controllers/postCommentsController.js` | 新增 `toggleLike`，修改 `getList` 加 `isLiked` |
| `backend/routes/postCommentsRoutes.js` | 新增点赞路由 |
| `utils/api.js` | `communityApi` 新增 `toggleCommentLike` |
| `packageCommunity/post-detail/post-detail.js` | 新增点赞 handler、图片选择/上传/预览逻辑 |
| `packageCommunity/post-detail/post-detail.wxml` | 评论项加点赞图标、输入栏加图片按钮+缩略图区 |
| `packageCommunity/post-detail/post-detail.wxss` | 点赞样式、图片选择/缩略图样式 |

## 验证方法

1. 运行迁移 `027_create_post_comment_likes.sql`，确认表创建成功
2. 对主评论点赞 -> 心形变实心、计数+1 -> 再次点击取消 -> 恢复空心、计数-1
3. 对回复点赞/取消，行为同上
4. 发评论时选择图片 -> 发送后评论显示图片 -> 点击图片可 preview
5. 回复时也可选图发送

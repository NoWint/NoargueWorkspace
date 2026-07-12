# 第一阶段：共享待办评论功能实现计划

## 一、功能概述

在 `todo-detail` 页面为**共享待办**添加评论功能：
- 添加一个 `t-fab` 按钮（评论图标）
- 点击后弹出底部 `t-popup` 
- 在 popup 中展示评论列表和发表评论功能

---

## 二、数据库设计

### 新增表：shared_todo_comments

```sql
CREATE TABLE IF NOT EXISTS shared_todo_comments (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  shared_todo_id BIGINT NOT NULL COMMENT '共享待办ID',
  user_id BIGINT NOT NULL COMMENT '评论者用户ID',
  content TEXT NOT NULL COMMENT '评论内容',
  parent_id BIGINT DEFAULT NULL COMMENT '父评论ID（支持回复）',
  reply_to_user_id BIGINT DEFAULT NULL COMMENT '被回复用户ID',
  location_text TEXT DEFAULT NULL COMMENT '位置信息（预留）',
  images TEXT DEFAULT NULL COMMENT '图片列表JSON（预留）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  is_deleted TINYINT DEFAULT 0 COMMENT '软删除标记',
  
  INDEX idx_todo (shared_todo_id),
  INDEX idx_user (user_id),
  INDEX idx_parent (parent_id),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='共享待办评论表';
```

> **预留字段说明**：
> - `location_text`: 预留用于存储评论关联的位置信息（JSON格式）
> - `images`: 预留用于存储评论图片列表（JSON数组格式）
> - 这两个字段暂不实现前端功能，便于日后扩展

---

## 三、后端 API 设计

### 新增文件：`backend/controllers/commentController.js`

| 接口 | 方法 | 说明 | 权限 |
|------|------|------|------|
| `/comments/:sharedTodoId` | GET | 获取评论列表 | 组合成员 |
| `/comments/:sharedTodoId` | POST | 发表评论 | 组合成员 |
| `/comments/:commentId` | DELETE | 删除评论 | 评论作者/管理员 |

### 接口详细设计

#### 1. 获取评论列表
```
GET /comments/:sharedTodoId?page=1&size=20

Response:
{
  success: true,
  data: {
    list: [{
      id: 1,
      sharedTodoId: 123,
      content: '评论内容',
      parentId: null,
      createdAt: '2025-04-03 14:30:00',
      user: {
        id: 456,
        nickname: '张三',
        avatar: 'https://...'
      },
      canDelete: true,
      replies: [{
        id: 2,
        content: '回复内容',
        parentId: 1,
        replyToUser: { id: 456, nickname: '张三' },
        user: { id: 789, nickname: '李四', avatar: '...' },
        createdAt: '2025-04-03 14:35:00',
        canDelete: true
      }]
    }],
    total: 5,
    hasMore: false
  }
}
```

#### 2. 发表评论
```
POST /comments/:sharedTodoId

Request:
{
  content: '评论内容',
  parentId: 1,           // 可选，回复时传父评论ID
  replyToUserId: 456     // 可选，回复时传被回复用户ID
}

Response:
{
  success: true,
  data: {
    id: 10,
    createdAt: '2025-04-03 15:00:00'
  }
}
```

#### 3. 删除评论
```
DELETE /comments/:commentId

Response:
{
  success: true,
  message: '删除成功'
}
```

### 修改文件：`backend/routes/api.js`

新增评论相关路由：
```javascript
const commentController = require('../controllers/commentController');

// 评论相关路由
router.get('/comments/:sharedTodoId', commentController.getComments);
router.post('/comments/:sharedTodoId', authMiddleware, commentController.createComment);
router.delete('/comments/:commentId', authMiddleware, commentController.deleteComment);
```

---

## 四、前端实现

### 1. 修改 `utils/api.js` - 新增评论 API

```javascript
const commentsApi = {
  getList: (sharedTodoId, page = 1, size = 20) => request({
    url: `/comments/${sharedTodoId}`,
    method: 'GET',
    data: { page, size }
  }),
  
  create: (sharedTodoId, content, parentId = null, replyToUserId = null) => request({
    url: `/comments/${sharedTodoId}`,
    method: 'POST',
    data: { content, parentId, replyToUserId }
  }),
  
  delete: (commentId) => request({
    url: `/comments/${commentId}`,
    method: 'DELETE'
  })
};

// 在 module.exports 中添加
module.exports = {
  // ...existing
  commentsApi
};
```

### 2. 修改 `pages/todo-detail/todo-detail.wxml`

#### 2.1 添加评论 FAB 按钮（仅共享待办显示）
在现有 FAB 按钮区域添加：
```xml
<!-- 评论按钮（仅共享待办显示） -->
<t-fab 
  wx:if="{{!isShare && isSharedTodo}}" 
  icon="chat" 
  text="" 
  style="right: 386rpx; bottom: 150rpx;" 
  bind:click="openCommentPopup"
/>
```

#### 2.2 添加评论 Popup 组件
在页面底部添加：
```xml
<!-- 评论弹窗 -->
<t-popup
  visible="{{showCommentPopup}}"
  placement="bottom"
  bind:visible-change="onCommentPopupChange"
  custom-style="border-radius: 32rpx 32rpx 0 0; max-height: 70vh;"
>
  <view class="comment-popup">
    <!-- 头部 -->
    <view class="comment-header">
      <text class="comment-title">评论 ({{commentTotal}})</text>
      <view class="comment-close" bindtap="closeCommentPopup">
        <t-icon name="close" size="40rpx" color="#999" />
      </view>
    </view>
    
    <!-- 评论列表 -->
    <scroll-view 
      class="comment-list" 
      scroll-y 
      bindscrolltolower="loadMoreComments"
      refresher-enabled
      refresher-triggered="{{commentRefreshing}}"
      bindrefresherrefresh="refreshComments"
    >
      <view wx:if="{{comments.length === 0 && !commentLoading}}" class="comment-empty">
        <t-icon name="chat" size="80rpx" color="#ddd" />
        <text>暂无评论，来说点什么吧~</text>
      </view>
      
      <block wx:for="{{comments}}" wx:key="id">
        <!-- 主评论 -->
        <view class="comment-item">
          <image class="comment-avatar" src="{{item.user.avatar || '/images/avatar.png'}}" mode="aspectFill" />
          <view class="comment-body">
            <view class="comment-meta">
              <text class="comment-name">{{item.user.nickname || '用户'}}</text>
              <text class="comment-time">{{item.formattedTime}}</text>
            </view>
            <text class="comment-content">{{item.content}}</text>
            <view class="comment-actions">
              <view class="action-btn" bindtap="replyComment" data-comment="{{item}}">
                <t-icon name="chat" size="28rpx" color="#999" />
                <text>回复</text>
              </view>
              <view wx:if="{{item.canDelete}}" class="action-btn delete" bindtap="deleteComment" data-id="{{item.id}}">
                <t-icon name="delete" size="28rpx" color="#ff4d4f" />
                <text style="color: #ff4d4f;">删除</text>
              </view>
            </view>
            
            <!-- 回复列表 -->
            <view wx:if="{{item.replies && item.replies.length > 0}}" class="reply-list">
              <view class="reply-item" wx:for="{{item.replies}}" wx:for-item="reply" wx:key="id">
                <image class="reply-avatar" src="{{reply.user.avatar || '/images/avatar.png'}}" mode="aspectFill" />
                <view class="reply-body">
                  <view class="reply-meta">
                    <text class="reply-name">{{reply.user.nickname || '用户'}}</text>
                    <text wx:if="{{reply.replyToUser}}" class="reply-to">回复 {{reply.replyToUser.nickname}}</text>
                  </view>
                  <text class="reply-content">{{reply.content}}</text>
                  <view class="comment-actions">
                    <view class="action-btn" bindtap="replyComment" data-comment="{{item}}" data-reply="{{reply}}">
                      <t-icon name="chat" size="24rpx" color="#999" />
                      <text>回复</text>
                    </view>
                    <view wx:if="{{reply.canDelete}}" class="action-btn delete" bindtap="deleteComment" data-id="{{reply.id}}" data-parent-id="{{item.id}}">
                      <t-icon name="delete" size="24rpx" color="#ff4d4f" />
                      <text style="color: #ff4d4f;">删除</text>
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </block>
      
      <view wx:if="{{commentLoading}}" class="comment-loading">
        <t-loading theme="circular" size="40rpx" />
      </view>
      
      <view wx:if="{{!commentHasMore && comments.length > 0}}" class="comment-end">
        <text>没有更多评论了</text>
      </view>
    </scroll-view>
    
    <!-- 评论输入框 -->
    <view class="comment-input-bar">
      <view wx:if="{{replyTarget}}" class="reply-target">
        <text>回复 {{replyTarget.user.nickname}}</text>
        <t-icon name="close" size="32rpx" color="#999" bind:click="cancelReply" />
      </view>
      <view class="input-wrapper">
        <input 
          class="comment-input"
          placeholder="{{replyTarget ? '回复 ' + replyTarget.user.nickname + '...' : '发表评论...'}}"
          value="{{commentInput}}"
          bindinput="onCommentInput"
          bindconfirm="submitComment"
          maxlength="500"
          confirm-type="send"
        />
        <button class="send-btn {{commentInput.length > 0 ? 'active' : ''}}" bindtap="submitComment">
          发送
        </button>
      </view>
    </view>
  </view>
</t-popup>
```

### 3. 修改 `pages/todo-detail/todo-detail.js`

#### 3.1 在 data 中添加评论相关状态
```javascript
data: {
  // ...existing data
  showCommentPopup: false,
  comments: [],
  commentTotal: 0,
  commentInput: '',
  commentLoading: false,
  commentRefreshing: false,
  commentPage: 1,
  commentHasMore: true,
  replyTarget: null
}
```

#### 3.2 添加评论相关方法
```javascript
// 引入评论API
const { commentsApi } = require('../../utils/api.js');

// 打开评论弹窗
openCommentPopup() {
  this.setData({ showCommentPopup: true });
  this.loadComments();
},

// 关闭评论弹窗
closeCommentPopup() {
  this.setData({ 
    showCommentPopup: false,
    replyTarget: null,
    commentInput: ''
  });
},

// 弹窗状态变化
onCommentPopupChange(e) {
  if (!e.detail.visible) {
    this.setData({ 
      showCommentPopup: false,
      replyTarget: null,
      commentInput: ''
    });
  }
},

// 加载评论列表
async loadComments(page = 1) {
  if (!this.data.sharedTodoId) return;
  
  this.setData({ commentLoading: true });
  
  try {
    const result = await commentsApi.getList(this.data.sharedTodoId, page, 20);
    
    const comments = (result.data.list || []).map(comment => ({
      ...comment,
      formattedTime: this.formatCommentTime(comment.createdAt),
      canDelete: this.canDeleteComment(comment)
    }));
    
    if (page === 1) {
      this.setData({
        comments,
        commentTotal: result.data.total,
        commentPage: page,
        commentHasMore: result.data.hasMore,
        commentLoading: false,
        commentRefreshing: false
      });
    } else {
      this.setData({
        comments: [...this.data.comments, ...comments],
        commentPage: page,
        commentHasMore: result.data.hasMore,
        commentLoading: false
      });
    }
  } catch (err) {
    console.error('加载评论失败:', err);
    this.setData({ 
      commentLoading: false,
      commentRefreshing: false
    });
  }
},

// 刷新评论
refreshComments() {
  this.setData({ commentRefreshing: true });
  this.loadComments(1);
},

// 加载更多评论
loadMoreComments() {
  if (this.data.commentLoading || !this.data.commentHasMore) return;
  this.loadComments(this.data.commentPage + 1);
},

// 格式化评论时间
formatCommentTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
  if (diff < 604800000) return Math.floor(diff / 86400000) + '天前';
  
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours().toString().padStart(2, '0');
  const minute = date.getMinutes().toString().padStart(2, '0');
  return `${month}月${day}日 ${hour}:${minute}`;
},

// 判断是否可删除评论
canDeleteComment(comment) {
  const userId = wx.getStorageSync('userId');
  if (comment.user.id === userId) return true;
  if (this.data.userRole === 'owner' || this.data.userRole === 'admin') return true;
  return false;
},

// 输入评论
onCommentInput(e) {
  this.setData({ commentInput: e.detail.value });
},

// 回复评论
replyComment(e) {
  const { comment, reply } = e.currentTarget.dataset;
  this.setData({
    replyTarget: reply || comment
  });
},

// 取消回复
cancelReply() {
  this.setData({ replyTarget: null });
},

// 发表评论
async submitComment() {
  const { commentInput, replyTarget, sharedTodoId } = this.data;
  
  if (!commentInput.trim()) {
    wx.showToast({ title: '请输入评论内容', icon: 'none' });
    return;
  }
  
  try {
    wx.showLoading({ title: '发送中...' });
    
    const result = await commentsApi.create(
      sharedTodoId,
      commentInput.trim(),
      replyTarget ? replyTarget.parentId || replyTarget.id : null,
      replyTarget ? replyTarget.user.id : null
    );
    
    wx.hideLoading();
    
    if (result.success) {
      this.setData({ 
        commentInput: '',
        replyTarget: null
      });
      this.loadComments(1);
      wx.showToast({ title: '发送成功', icon: 'success' });
    }
  } catch (err) {
    wx.hideLoading();
    wx.showToast({ title: err.message || '发送失败', icon: 'none' });
  }
},

// 删除评论
deleteComment(e) {
  const { id, parentId } = e.currentTarget.dataset;
  
  wx.showModal({
    title: '删除确认',
    content: '确定要删除这条评论吗？',
    confirmColor: '#ff4d4f',
    success: async (res) => {
      if (res.confirm) {
        try {
          wx.showLoading({ title: '删除中...' });
          await commentsApi.delete(id);
          wx.hideLoading();
          
          if (parentId) {
            // 删除的是回复
            const comments = this.data.comments.map(c => {
              if (c.id === parentId) {
                c.replies = c.replies.filter(r => r.id !== id);
              }
              return c;
            });
            this.setData({ comments });
          } else {
            // 删除的是主评论
            this.setData({
              comments: this.data.comments.filter(c => c.id !== id),
              commentTotal: this.data.commentTotal - 1
            });
          }
          
          wx.showToast({ title: '删除成功', icon: 'success' });
        } catch (err) {
          wx.hideLoading();
          wx.showToast({ title: err.message || '删除失败', icon: 'none' });
        }
      }
    }
  });
}
```

### 4. 修改 `pages/todo-detail/todo-detail.wxss`

添加评论相关样式：
```css
/* 评论弹窗样式 */
.comment-popup {
  display: flex;
  flex-direction: column;
  height: 70vh;
  background: #fff;
}

.comment-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.comment-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #333;
}

.comment-close {
  padding: 8rpx;
}

.comment-list {
  flex: 1;
  padding: 24rpx 32rpx;
  overflow-y: auto;
}

.comment-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 0;
  color: #999;
}

.comment-empty text {
  margin-top: 20rpx;
  font-size: 28rpx;
}

.comment-item {
  display: flex;
  margin-bottom: 32rpx;
}

.comment-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  margin-right: 20rpx;
  flex-shrink: 0;
}

.comment-body {
  flex: 1;
}

.comment-meta {
  display: flex;
  align-items: center;
  margin-bottom: 8rpx;
}

.comment-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
  margin-right: 16rpx;
}

.comment-time {
  font-size: 24rpx;
  color: #999;
}

.comment-content {
  font-size: 30rpx;
  color: #333;
  line-height: 1.6;
  word-break: break-all;
}

.comment-actions {
  display: flex;
  align-items: center;
  gap: 32rpx;
  margin-top: 12rpx;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 24rpx;
  color: #999;
}

.action-btn:active {
  opacity: 0.7;
}

/* 回复列表样式 */
.reply-list {
  margin-top: 16rpx;
  padding: 16rpx;
  background: #f9f9f9;
  border-radius: 16rpx;
}

.reply-item {
  display: flex;
  margin-bottom: 16rpx;
}

.reply-item:last-child {
  margin-bottom: 0;
}

.reply-avatar {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  margin-right: 12rpx;
  flex-shrink: 0;
}

.reply-body {
  flex: 1;
}

.reply-meta {
  display: flex;
  align-items: center;
  margin-bottom: 4rpx;
}

.reply-name {
  font-size: 26rpx;
  font-weight: 500;
  color: #333;
}

.reply-to {
  font-size: 24rpx;
  color: #999;
  margin-left: 8rpx;
}

.reply-content {
  font-size: 28rpx;
  color: #333;
  line-height: 1.5;
}

/* 评论输入框样式 */
.comment-input-bar {
  padding: 20rpx 32rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid #f0f0f0;
  background: #fff;
}

.reply-target {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12rpx 16rpx;
  margin-bottom: 12rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
  font-size: 26rpx;
  color: #666;
}

.input-wrapper {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.comment-input {
  flex: 1;
  height: 72rpx;
  padding: 0 24rpx;
  background: #f5f5f5;
  border-radius: 36rpx;
  font-size: 30rpx;
}

.send-btn {
  width: 120rpx;
  height: 72rpx;
  line-height: 72rpx;
  padding: 0;
  background: #ddd;
  color: #fff;
  font-size: 28rpx;
  border-radius: 36rpx;
}

.send-btn.active {
  background: #00b26a;
}

.comment-loading {
  display: flex;
  justify-content: center;
  padding: 32rpx;
}

.comment-end {
  text-align: center;
  padding: 32rpx;
  font-size: 26rpx;
  color: #999;
}
```

---

## 五、权限控制

| 操作 | owner | admin | member | 说明 |
|------|:-----:|:-----:|:------:|------|
| 查看评论 | ✅ | ✅ | ✅ | 所有组合成员可见 |
| 发表评论 | ✅ | ✅ | ✅ | 所有组合成员可评论 |
| 删除自己的评论 | ✅ | ✅ | ✅ | 仅可删除自己的 |
| 删除他人评论 | ✅ | ✅ | ❌ | 管理员可管理评论 |

---

## 六、文件修改清单

### 后端
| 文件 | 操作 | 说明 |
|------|------|------|
| `backend/init-db.js` | 修改 | 添加 shared_todo_comments 表 |
| `backend/controllers/commentController.js` | 新建 | 评论控制器 |
| `backend/routes/api.js` | 修改 | 添加评论路由 |

### 前端
| 文件 | 操作 | 说明 |
|------|------|------|
| `utils/api.js` | 修改 | 添加 commentsApi |
| `pages/todo-detail/todo-detail.wxml` | 修改 | 添加评论FAB和Popup |
| `pages/todo-detail/todo-detail.js` | 修改 | 添加评论相关逻辑 |
| `pages/todo-detail/todo-detail.wxss` | 修改 | 添加评论样式 |
| `pages/todo-detail/todo-detail.json` | 修改 | 确保引入 t-popup 组件 |

---

## 七、实现步骤

### Step 1: 数据库迁移
1. 在 `backend/init-db.js` 中添加 `shared_todo_comments` 表定义
2. 执行数据库迁移

### Step 2: 后端开发
1. 创建 `backend/controllers/commentController.js`
2. 在 `backend/routes/api.js` 中添加路由

### Step 3: 前端开发
1. 修改 `utils/api.js` 添加评论 API
2. 修改 `todo-detail.json` 确保组件引用
3. 修改 `todo-detail.wxml` 添加 UI
4. 修改 `todo-detail.js` 添加逻辑
5. 修改 `todo-detail.wxss` 添加样式

### Step 4: 测试验证
1. 测试评论列表加载
2. 测试发表评论
3. 测试回复评论
4. 测试删除评论
5. 测试权限控制

---

## 八、注意事项

1. **敏感词过滤**：评论内容需要过滤敏感词（可后续添加）
2. **内容长度限制**：评论内容限制 500 字
3. **频率限制**：建议每分钟最多发表 5 条评论（后端实现）
4. **登录检查**：发表评论需要检查登录状态
5. **成员验证**：后端需要验证用户是否为组合成员

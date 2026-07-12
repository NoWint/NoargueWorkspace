# 第一阶段：共享待办评论功能实施计划

## 一、任务概览

在 `todo-detail` 页面为**共享待办**添加评论功能，包含：

* 评论 FAB 按钮

* 评论弹窗（t-popup）

* 评论列表、发表评论、回复评论、删除评论

***

## 二、详细任务清单

### Phase 1: 数据库层（后端）

#### 1.1 创建数据库迁移文件

* [ ] 创建 `backend/migrations/009_add_shared_todo_comments.sql`

  * 定义 `shared_todo_comments` 表结构

  * 包含预留字段 `location_text` 和 `images`

  * 添加必要的索引

#### 1.2 更新 init-db.js

* [ ] 在 `backend/init-db.js` 中添加 `shared_todo_comments` 表定义

  * 确保新环境初始化时自动创建该表

#### 1.3 更新 database.sql

* [ ] 在 `backend/database.sql` 中添加 `shared_todo_comments` 表定义

  * 保持与 init-db.js 一致

***

### Phase 2: 后端 API 层

#### 2.1 创建评论控制器

* [ ] 创建 `backend/controllers/commentController.js`

  * [ ] 实现 `getComments` 方法 - 获取评论列表

    * 验证用户是否为组合成员

    * 查询评论列表（含用户信息）

    * 组装回复列表

    * 判断当前用户是否可删除评论

    * 支持分页

  * [ ] 实现 `createComment` 方法 - 发表评论

    * 验证用户是否为组合成员

    * 验证评论内容长度（最大500字）

    * 插入评论记录

    * 返回新评论ID和创建时间

  * [ ] 实现 `deleteComment` 方法 - 删除评论

    * 验证评论是否存在

    * 验证删除权限（评论作者或管理员）

    * 软删除评论

#### 2.2 创建评论路由

* [ ] 创建 `backend/routes/commentRoutes.js`

  * [ ] GET `/comments/:sharedTodoId` - 获取评论列表（需登录）

  * [ ] POST `/comments/:sharedTodoId` - 发表评论（需登录）

  * [ ] DELETE `/comments/:commentId` - 删除评论（需登录）

#### 2.3 注册路由

* [ ] 修改 `backend/app.js`

  * [ ] 引入 commentRoutes

  * [ ] 注册路由 `/comments`

***

### Phase 3: 前端 API 层

#### 3.1 添加评论 API

* [ ] 修改 `utils/api.js`

  * [ ] 添加 `commentsApi` 对象

    * `getList(sharedTodoId, page, size)` - 获取评论列表

    * `create(sharedTodoId, content, parentId, replyToUserId)` - 发表评论

    * `delete(commentId)` - 删除评论

  * [ ] 在 `module.exports` 中导出 `commentsApi`

***

### Phase 4: 前端 UI 层

#### 4.1 更新页面配置

* [ ] 修改 `pages/todo-detail/todo-detail.json`

  * [ ] 添加 `t-popup` 组件引用

  * [ ] 添加 `t-loading` 组件引用

#### 4.2 更新页面样式

* [ ] 修改 `pages/todo-detail/todo-detail.wxss`

  * [ ] 添加评论弹窗容器样式 `.comment-popup`

  * [ ] 添加评论头部样式 `.comment-header`

  * [ ] 添加评论列表样式 `.comment-list`

  * [ ] 添加空状态样式 `.comment-empty`

  * [ ] 添加评论项样式 `.comment-item`

  * [ ] 添加评论头像样式 `.comment-avatar`

  * [ ] 添加评论主体样式 `.comment-body`

  * [ ] 添加评论元信息样式 `.comment-meta`

  * [ ] 添加评论内容样式 `.comment-content`

  * [ ] 添加评论操作按钮样式 `.comment-actions`

  * [ ] 添加回复列表样式 `.reply-list`

  * [ ] 添加回复项样式 `.reply-item`

  * [ ] 添加评论输入框样式 `.comment-input-bar`

  * [ ] 添加回复目标提示样式 `.reply-target`

  * [ ] 添加发送按钮样式 `.send-btn`

  * [ ] 添加加载状态样式 `.comment-loading`

  * [ ] 添加列表底部样式 `.comment-end`

#### 4.3 更新页面结构

* [ ] 修改 `pages/todo-detail/todo-detail.wxml`

  * [ ] 在 FAB 按钮区域添加评论 FAB 按钮

    * 仅在共享待办时显示

    * 使用 `chat` 图标

    * 绑定 `openCommentPopup` 事件

  * [ ] 在页面底部添加评论弹窗 `t-popup`

    * 设置 `placement="bottom"`

    * 设置圆角样式

    * [ ] 添加弹窗头部

      * 显示评论数量

      * 添加关闭按钮

    * [ ] 添加评论列表 `scroll-view`

      * 支持下拉刷新

      * 支持滚动加载更多

      * [ ] 添加空状态显示

      * [ ] 添加评论项循环

        * 显示用户头像

        * 显示用户昵称

        * 显示用户身份（创建者、超管、管理、成员），状态可叠加

        * 显示评论时间

        * 显示评论内容

        * 显示回复按钮

        * 显示删除按钮（有权限时）

        * [ ] 添加回复列表

          * 显示回复用户头像

          * 显示回复用户昵称

          * 显示被回复用户

          * 显示回复内容

          * 显示回复/删除按钮

      * [ ] 添加加载状态

      * [ ] 添加列表底部提示

    * [ ] 添加评论输入区域

      * [ ] 添加回复目标提示（回复模式时显示）

      * [ ] 添加输入框和发送按钮

#### 4.4 更新页面逻辑

* [ ] 修改 `pages/todo-detail/todo-detail.js`

  * [ ] 在文件顶部引入 `commentsApi`

  * [ ] 在 `data` 中添加评论相关状态

    * `showCommentPopup` - 弹窗显示状态

    * `comments` - 评论列表

    * `commentTotal` - 评论总数

    * `commentInput` - 输入框内容

    * `commentLoading` - 加载状态

    * `commentRefreshing` - 刷新状态

    * `commentPage` - 当前页码

    * `commentHasMore` - 是否有更多

    * `replyTarget` - 回复目标

  * [ ] 实现 `openCommentPopup` 方法 - 打开评论弹窗

  * [ ] 实现 `closeCommentPopup` 方法 - 关闭评论弹窗

  * [ ] 实现 `onCommentPopupChange` 方法 - 弹窗状态变化

  * [ ] 实现 `loadComments` 方法 - 加载评论列表

  * [ ] 实现 `refreshComments` 方法 - 刷新评论

  * [ ] 实现 `loadMoreComments` 方法 - 加载更多评论

  * [ ] 实现 `formatCommentTime` 方法 - 格式化评论时间

  * [ ] 实现 `canDeleteComment` 方法 - 判断是否可删除评论

  * [ ] 实现 `onCommentInput` 方法 - 输入评论内容

  * [ ] 实现 `replyComment` 方法 - 回复评论

  * [ ] 实现 `cancelReply` 方法 - 取消回复

  * [ ] 实现 `submitComment` 方法 - 发表评论

  * [ ] 实现 `deleteComment` 方法 - 删除评论

***

### Phase 5: 测试验证

#### 5.1 后端测试

* [ ] 测试数据库迁移是否成功

* [ ] 测试获取评论列表 API

  * [ ] 测试非成员访问被拒绝

  * [ ] 测试成员正常获取列表

  * [ ] 测试分页功能

* [ ] 测试发表评论 API

  * [ ] 测试非成员发表被拒绝

  * [ ] 测试空内容被拒绝

  * [ ] 测试超长内容被拒绝

  * [ ] 测试正常发表评论

  * [ ] 测试回复评论

* [ ] 测试删除评论 API

  * [ ] 测试非作者非管理员删除被拒绝

  * [ ] 测试作者删除自己的评论

  * [ ] 测试管理员删除他人评论

#### 5.2 前端测试

* [ ] 测试评论 FAB 按钮显示条件

  * [ ] 私有待办不显示

  * [ ] 共享待办显示

* [ ] 测试评论弹窗

  * [ ] 打开/关闭正常

  * [ ] 下拉刷新正常

  * [ ] 滚动加载更多正常

* [ ] 测试评论列表显示

  * [ ] 空状态显示正常

  * [ ] 评论项显示正常

  * [ ] 回复列表显示正常

  * [ ] 时间格式化正常

* [ ] 测试发表评论

  * [ ] 正常发表成功

  * [ ] 空内容提示

  * [ ] 发送后清空输入框

* [ ] 测试回复评论

  * [ ] 点击回复显示回复目标

  * [ ] 取消回复正常

  * [ ] 回复发表成功

* [ ] 测试删除评论

  * [ ] 删除确认弹窗

  * [ ] 删除成功后列表更新

  * [ ] 权限控制正确

***

## 三、文件修改清单

| 序号 | 文件路径                                                  | 操作类型 | 说明       |
| -- | ----------------------------------------------------- | ---- | -------- |
| 1  | `backend/migrations/009_add_shared_todo_comments.sql` | 新建   | 数据库迁移文件  |
| 2  | `backend/init-db.js`                                  | 修改   | 添加评论表定义  |
| 3  | `backend/database.sql`                                | 修改   | 添加评论表定义  |
| 4  | `backend/controllers/commentController.js`            | 新建   | 评论控制器    |
| 5  | `backend/routes/commentRoutes.js`                     | 新建   | 评论路由     |
| 6  | `backend/app.js`                                      | 修改   | 注册评论路由   |
| 7  | `utils/api.js`                                        | 修改   | 添加评论 API |
| 8  | `pages/todo-detail/todo-detail.json`                  | 修改   | 添加组件引用   |
| 9  | `pages/todo-detail/todo-detail.wxss`                  | 修改   | 添加评论样式   |
| 10 | `pages/todo-detail/todo-detail.wxml`                  | 修改   | 添加评论 UI  |
| 11 | `pages/todo-detail/todo-detail.js`                    | 修改   | 添加评论逻辑   |

***

## 四、数据库表结构

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

***

## 五、API 接口设计

### 5.1 获取评论列表

```
GET /comments/:sharedTodoId?page=1&size=20

Headers:
  Authorization: Bearer <token>

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
      replies: [...]
    }],
    total: 5,
    hasMore: false
  }
}
```

### 5.2 发表评论

```
POST /comments/:sharedTodoId

Headers:
  Authorization: Bearer <token>

Request:
{
  content: '评论内容',
  parentId: 1,           // 可选
  replyToUserId: 456     // 可选
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

### 5.3 删除评论

```
DELETE /comments/:commentId

Headers:
  Authorization: Bearer <token>

Response:
{
  success: true,
  message: '删除成功'
}
```

***

## 六、权限控制

| 操作      | owner | admin | member | 说明        |
| ------- | :---: | :---: | :----: | --------- |
| 查看评论    |   ✅   |   ✅   |    ✅   | 所有组合成员可见  |
| 发表评论    |   ✅   |   ✅   |    ✅   | 所有组合成员可评论 |
| 删除自己的评论 |   ✅   |   ✅   |    ✅   | 仅可删除自己的   |
| 删除他人评论  |   ✅   |   ✅   |    ❌   | 管理员可管理评论  |

***

## 七、实施顺序

1. **数据库层** → 确保数据存储就绪
2. **后端 API 层** → 提供数据接口
3. **前端 API 层** → 封装接口调用
4. **前端 UI 层** → 实现用户界面
5. **测试验证** → 确保功能正常

***

## 八、注意事项

1. 评论内容最大 500 字
2. 需要验证用户是否为组合成员
3. 删除评论使用软删除
4. 时间显示使用友好格式（刚刚、X分钟前等）
5. 预留字段 `location_text` 和 `images` 暂不实现功能


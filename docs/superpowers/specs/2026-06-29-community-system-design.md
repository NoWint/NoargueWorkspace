# 社区系统设计文档

> 日期：2026-06-29
> 状态：终稿

## 1. 概述

为 TimeGreen Path Todo 小程序新增"社区"系统，定位为类 Twitter 的内容分享平台。用户可发布图文帖子、关联待办/共享组合邀请、互动评论与点赞。

## 2. Tabbar 与路由

### 2.1 Tabbar（5项）

| # | 路径 | 标签 |
|---|------|------|
| 1 | `pages/todo/todo` | 待办 |
| 2 | `pages/calendar/calendar` | 日历 |
| 3 | `pages/community-home/community-home` | 社区 |
| 4 | `pages/stats/stats` | 统计 |
| 5 | `pages/more/more` | 更多 |

### 2.2 路由结构

```
主包：
  pages/community-home/community-home     ← tabbar 页面，必须主包

分包 packageCommunity：
  packageCommunity/post-detail/post-detail   ← 帖子详情
  packageCommunity/post-edit/post-edit       ← 发布/编辑帖子

preloadRule：community-home → preload "packageCommunity"
```

### 2.3 管理员后台（复用现有）

```
packageAdmin 新增：
  admin/reports/reports          ← 举报管理列表
  admin/report-detail/report-detail  ← 举报详情/处理页
```

## 3. 数据库设计

### 3.1 posts（帖子主表）

```sql
CREATE TABLE posts (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    post_id VARCHAR(64) NOT NULL UNIQUE,      -- 客户端生成 post_{timestamp}_{random}
    user_id BIGINT NOT NULL,                   -- 发布者
    title VARCHAR(200) NOT NULL,               -- textarea 首行
    body TEXT,                                 -- 剩余正文
    images TEXT,                               -- JSON ["url1","url2"]
    todo_ids TEXT,                             -- JSON ["todo_id1","todo_id2"]
    share_code VARCHAR(10),                    -- 共享组合邀请码
    ip_address VARCHAR(45),                    -- 原始IP
    location TEXT,                             -- JSON {"text":"北京"}
    likes_count INT DEFAULT 0,                 -- 点赞数（冗余，由 post_likes 计数维护）
    comments_count INT DEFAULT 0,              -- 评论数（冗余）
    views_count INT DEFAULT 0,                 -- 浏览 PV
    viewer_ids TEXT,                           -- JSON [1,2,3] 浏览 UV（去重）
    is_edited TINYINT DEFAULT 0,               -- 是否已编辑
    is_deleted TINYINT DEFAULT 0,              -- 软删除
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
);
```

### 3.2 post_views（访客记录，仅发布者可见）

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

### 3.3 post_likes（点赞记录）

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

### 3.4 post_comments（评论表，多层盖楼 + 图片）

```sql
CREATE TABLE post_comments (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    post_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    content TEXT NOT NULL,                      -- 评论内容
    images TEXT,                                -- JSON ["url1"]
    parent_id BIGINT DEFAULT NULL,              -- 回复目标 comment id（多层盖楼）
    reply_to_user_id BIGINT DEFAULT NULL,       -- 被回复的用户
    reply_to_content TEXT,                      -- 被回复的内容摘要（前端展示"回复 @xxx"）
    likes_count INT DEFAULT 0,
    is_deleted TINYINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_post_id (post_id),
    INDEX idx_parent_id (parent_id)
);
```

### 3.5 reports（举报记录表）

```sql
CREATE TABLE reports (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,                   -- 举报者
    target_type VARCHAR(20) NOT NULL,           -- 'post' 或 'comment'
    target_id BIGINT NOT NULL,                  -- 被举报的 post_id / comment_id
    target_content TEXT,                        -- 被举报内容快照
    reason VARCHAR(50) NOT NULL,                -- 举报原因：垃圾广告/色情低俗/人身攻击/违法信息/其他
    detail TEXT,                                -- 补充说明
    status TINYINT DEFAULT 0,                   -- 0=待处理 1=已处理 2=驳回
    result_note TEXT,                           -- 处理备注
    processed_by BIGINT,                        -- 管理员 user_id
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_target (target_type, target_id)
);
```

## 4. 后端 API

### 4.1 帖子 API（routes: /posts）

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /posts/create | 发布帖子 | 需登录 |
| GET | /posts/list | 社区首页 Feed 流（游标分页） | 需登录 |
| GET | /posts/:postId | 帖子详情 | 需登录 |
| PUT | /posts/:postId | 编辑帖子（仅发布者） | 需登录 |
| DELETE | /posts/:postId | 删除帖子（仅发布者/管理员） | 需登录 |
| GET | /posts/:postId/visitors | 访客记录（仅发布者） | 需登录 |

### 4.2 点赞 API（routes: /likes）

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /likes/toggle | 点赞/取消点赞 | 需登录 |
| GET | /likes/:postId/users | 获取点赞用户列表 | 需登录 |

### 4.3 评论 API（routes: /post-comments）

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /post-comments/:postId | 获取评论列表（树形结构） | 需登录 |
| POST | /post-comments/:postId | 发表评论 | 需登录 |
| DELETE | /post-comments/:commentId | 删除评论（作者/管理员） | 需登录 |

### 4.4 举报 API（routes: /reports）

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /reports/create | 提交举报（含订阅模板） | 需登录 |
| GET | /reports/my | 我的举报记录 | 需登录 |
| GET | /reports/list | 举报管理列表（管理员） | 需登录+管理员 |
| GET | /reports/:id | 举报详情（管理员） | 需登录+管理员 |
| POST | /reports/:id/process | 处理举报（管理员） | 需登录+管理员 |

### 4.5 图片上传（复用 add-todo 图床）

直接复用 `https://img.scdn.io/api/v1.php` 的上传逻辑，社区帖子内部维护独立的上传方法。

## 5. 页面 UI 设计

### 5.1 社区主页 (community-home)

```
┌──────────────────────────────────────┐
│  ← 返回    社区           🔍        │  t-navbar
├──────────────────────────────────────┤
│                                       │
│  ┌─────────────────────────────┐     │
│  │ [头像] 昵称     3分钟前     │     │
│  │ **标题文字**                 │     │
│  │ 正文预览...                  │     │
│  │ ┌──┐ ┌──┐ ┌──┐            │     │
│  │ │  │ │  │ │  │            │     │
│  │ └──┘ └──┘ └──┘            │     │
│  │ 📍 北京                     │     │
│  │ IP属地 · 广东               │     │
│  │ 💬 12  ❤ 5  👁 234       │     │
│  └─────────────────────────────┘     │
│                                       │
│         ┌──────────┐                  │
│         │  ✏️ 发帖  │                 │  FAB
│         └──────────┘                  │
└──────────────────────────────────────┘
```

**关键交互：**
- 下拉刷新
- 触底游标分页加载
- 点击帖子 → post-detail
- 点击 ❤ 快捷点赞（不进入详情页）
- FAB 右下角 → post-edit
- 点击 💬 → post-detail 定位到评论区

**图片自适应布局：**
- 1张：大图宽图展示
- 2张：并排
- ≥3张：三列网格

### 5.2 发布/编辑页 (post-edit)

```
┌──────────────────────────────────────┐
│  ← 返回      发帖         发布      │  t-navbar
├──────────────────────────────────────┤
│                                       │
│  [圆形头像]                          │
│  textarea（autosize，自动增高）      │
│  首行 → title，剩余 → body         │
│                                       │
│  ┌────┐ ┌────┐ ┌────┐              │
│  │    │ │    │ │    │ ← 图片（t-upload）│
│  └────┘ └────┘ └────┘              │
│                                       │
├──────────────────────────────────────┤
│  📷  📋  👥  📍                    │  底部工具栏
│ 图片  待办  组合  位置              │
└──────────────────────────────────────┘
```

**关键交互：**
- textarea 自动增高，首行换行前为 title，其余为 body
- 图片上传：复用 add-todo 的 uploadImage 逻辑，t-upload 组件，支持从聊天记录选择
- 关联待办：弹出待办选择器（多选）
- 共享组合邀请：弹出已拥有的组合列表（仅可选有邀请权限的）
- 位置：复用 todo 的 location 选择逻辑
- 编辑模式：回填已有数据，发布按钮变为"保存"
- 带字数统计 + 发布按钮 disabled（无标题时）

### 5.3 帖子详情页 (post-detail)

```
┌──────────────────────────────────────┐
│  ← 返回         帖子            ···  │  ··· 菜单：举报/分享/删除
├──────────────────────────────────────┤
│                                       │
│  [头像] 昵称   发布时间              │
│  **标题（大字号）**                   │
│  正文全文...                          │
│                                       │
│  ┌──┐ ┌──┐ ┌──┐                    │
│  │  │ │  │ │  │  ← 大图预览         │
│  └──┘ └──┘ └──┘                    │
│                                       │
│  📍 北京    IP属地 · 广东            │
│  已编辑 · 2026-06-29 14:30          │  编辑标记
│                                       │
│  👁 234次浏览  ❤ 12人赞过          │  发布者可点击访客记录
│                                       │
│  ──── 评论区 ────                     │
│                                       │
│  ┌─ 用户A ─────────────────────┐    │
│  │ 内容...  [图]       ❤ 回复   │    │  一级评论
│  │  ┌─ 用户B 回复 @用户A ──┐   │    │
│  │  │ 回复内容       ❤ 回复  │   │    │  二级
│  │  │ ┌─ 用户A 回复... ─┐  │   │    │  三级
│  │  │ │ ...             │  │   │    │
│  │  │ └────────────────┘  │   │    │
│  │  └─────────────────────┘   │    │
│  └────────────────────────────┘    │
│                                       │
│  ┌──────────────────────────────┐   │
│  │ 输入评论...        [发送]    │   │  底部固定输入栏
│  └──────────────────────────────┘   │
└──────────────────────────────────────┘
```

**关键交互：**
- 进入页面 → views_count++，记录 post_views
- 发布者可见浏览数 → 点击弹出访客列表（user_id + viewed_at）
- 评论输入框：底部固定，支持 @回复目标
- 评论图片：缩略图展示，点击预览大图
- 多层盖楼：递归缩进，最多显示 3 层
- 已删除帖子/评论显示"该内容因违规已被删除"
- 菜单：按当前用户角色显示（发布者显删除/编辑，其他显举报）

## 6. 举报与通知流程

```
举报者                                          管理员                               微信

  1. 点击"举报"
  2. 选择原因
  3. wx.requestSubscribeMessage        →  注册 REPORT_TEMPLATE_ID
     (yXtj85psFqKHQsAbcjxFo5wYX8SdU4acoYiENIRpiAE)
  4. POST /reports/create
     └─ 记录 reports 表 status=0
  5.                                     →  进入 admin/reports 列表
  6.                                     →  审核举报
                                         →  选择：删除内容 / 驳回
                                         →  POST /reports/:id/process
                                            └─ 更新 status
                                            └─ 若删除 → 软删 posts/comments
  7.  sendReportResultMessage(openid)   ←  发送模板消息
     └─ thing1: 举报文章标题
        thing2: 举报类型
        thing5: 帖子/评论
        thing3: 处理结果（已处理/已驳回）
        time4: 处理时间
```

被举报者不另发通知，帖子/评论详情页显示"该内容因违规已被删除"。

**举报者查看记录：** more 页面新增"我的举报"入口，列表展示所有举报及状态。

## 7. 图片上传

复用现有图床 `https://img.scdn.io/api/v1.php` 与 add-todo 的 `uploadImage` 逻辑：
- `wx.compressImage`（>2MB 时压缩）
- 3 次自动重试
- 支持 `sourceType: ['album', 'camera']` + 聊天记录切换 (`messageFile`)
- 最大 9 张

## 8. 草稿与编辑

- 发布页输入内容暂存 wx storage，防止意外退出丢失
- 帖子发布后进入详情页可见"已编辑"标记
- 编辑时回填所有字段：title/body/images/todo_ids/share_code/location

## 9. IP 地址

- 后端在收到创建帖子请求时，从 `req.ip` / `x-forwarded-for` 获取原始 IP，存入 `ip_address`
- 前端请求时附带用户 IP，调用 IP 定位接口转为省份显示
- 前端一直显示 `IP属地 · 省份`（强制，不可隐藏）

## 10. 分页策略

- Feed 流：游标分页（`cursor` = 最后一条帖子的 `created_at` + `id`），每页 20 条
- 评论列表：游标分页，每页 20 条，后端组装树形结构返回
- 访客记录：常规分页（`page`/`pageSize`），每页 20 条

## 11. 错误处理

- 所有接口返回 `{ success: boolean, message?: string, ...data }`
- 网络错误：wx.showToast 提示
- 权限错误（非发布者编辑）：返回 403，前端提示
- 封面数据不存在（已删除）：显示占位"内容已删除"

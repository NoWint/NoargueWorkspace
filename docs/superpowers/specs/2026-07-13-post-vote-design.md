# 帖子投票系统设计文档

Date: 2026-07-13
Status: Draft

## 1. 概述

为社区帖子系统新增投票组件。每个帖子（post）支持注册一个投票体（poll），发帖人在 post-edit 编辑页构建投票，发布时先创建帖子，再注册投票体，两步完成。

## 2. 数据库设计

MySQL 5.5 兼容：无 JSON 列，仅一个 TIMESTAMP 带 CURRENT_TIMESTAMP。

### 2.1 post_polls — 投票体

```sql
CREATE TABLE post_polls (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    post_id     BIGINT NOT NULL,          -- posts.id
    title       VARCHAR(200) NOT NULL,    -- 投票标题
    type        TINYINT DEFAULT 0,        -- 0=单选 1=多选
    allow_other TINYINT DEFAULT 0,        -- 是否允许"其他"输入
    end_time    TIMESTAMP NULL DEFAULT NULL, -- 截止时间(null=一直开放)
    is_closed   TINYINT DEFAULT 0,        -- 已结束(手动关闭/超时截止均置1)
    total_votes INT DEFAULT 0,            -- 去重总投票人数(事务内维护)
    is_deleted  TINYINT DEFAULT 0,        -- 帖子删除时级联
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NULL DEFAULT NULL,
    UNIQUE KEY uk_post_id (post_id)
);
```

### 2.2 post_poll_options — 投票选项

```sql
CREATE TABLE post_poll_options (
    id         BIGINT PRIMARY KEY AUTO_INCREMENT,
    poll_id    BIGINT NOT NULL,
    text       VARCHAR(100) NOT NULL,     -- 选项文本
    is_other   TINYINT DEFAULT 0,         -- 是否为"其他"选项
    sort_order INT DEFAULT 0,             -- 插入顺序自动赋值
    vote_count INT DEFAULT 0,             -- 反范化得票数(事务内维护)
    INDEX idx_poll_id (poll_id)
);
```

### 2.3 post_poll_votes — 投票记录

```sql
CREATE TABLE post_poll_votes (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    poll_id     BIGINT NOT NULL,
    option_id   BIGINT NOT NULL,
    user_id     BIGINT NOT NULL,
    custom_text VARCHAR(200) NULL,        -- "其他"选项时输入的内容
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_poll_id (poll_id),
    INDEX idx_option_id (option_id),
    INDEX idx_user_id (user_id),
    UNIQUE KEY uk_user_option (poll_id, user_id, option_id)
);
```

## 3. API 设计

### 3.1 帖子数据中的 poll 字段

`formatPost()` 返回值新增 `poll` 字段，无投票时为 null：

```json
{
  "postId": "post_xxx",
  "poll": {
    "pollId": 1,
    "title": "周末去哪玩？",
    "type": 0,
    "allowOther": true,
    "totalVotes": 12,
    "endTime": "2026-07-20 23:59:59",
    "isEnded": false,
    "isVoted": false,
    "userVotedOptionIds": [1, 3],
    "options": [
      { "optionId": 1, "text": "爬山", "voteCount": 5, "isOther": false },
      { "optionId": 2, "text": "看电影", "voteCount": 4, "isOther": false },
      { "optionId": 3, "text": "其他", "voteCount": 3, "isOther": true }
    ]
  }
}
```

### 3.2 端点列表

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| POST | `/posts/:postId/poll` | 帖主 | 发布后注册投票体 |
| GET | `/posts/:postId/poll` | 任意登录用户 | 获取投票详情 |
| POST | `/posts/:postId/poll/vote` | 任意登录用户 | 投票/改票 |
| POST | `/posts/:postId/poll/close` | 帖主/管理员 | 手动结束投票 |
| PATCH | `/posts/:postId/poll` | 帖主 | 编辑投票（无投票记录时） |
| GET | `/posts/:postId/poll/other-details` | 投票者可看 | "其他"选项详情 |

### 3.3 端点详情

#### POST /posts/:postId/poll

发布时注册投票体。需帖子已成功创建。

**Body:**
```json
{
  "title": "周末去哪玩？",
  "type": 0,
  "allowOther": true,
  "endTime": "2026-07-20 23:59:59",
  "options": [
    { "text": "爬山" },
    { "text": "看电影" },
    { "text": "其他" }
  ]
}
```

**校验：** 请求者=帖子作者；选项数 2~20；标题≤200字；选项文本≤100字；endTime≥当前时间。

**响应：** `{ "success": true, "data": { "pollId": 1 } }`

#### GET /posts/:postId/poll

获取投票完整信息。

**响应：** 包含完整 poll 对象 + otherDetails。

#### POST /posts/:postId/poll/vote

投票/改票。事务内全量重建。

**Body:**
```json
{
  "optionIds": [1, 3],
  "otherTexts": { "3": "自定义内容" }
}
```

**otherTexts：** 键为 isOther=true 的 optionId，值为用户输入。选中"其他"时必填。

**规则：** 投票者≠帖子作者；isEnded 时返回 403；optionIds 每个 ID 须属于当前 poll；单选→长度=1。

**事务流程：**
1. DELETE FROM post_poll_votes WHERE poll_id=? AND user_id=?
2. INSERT INTO post_poll_votes (poll_id, option_id, user_id, custom_text) VALUES ...
3. 重建选项计数：`UPDATE post_poll_options SET vote_count = (SELECT COUNT(*) FROM post_poll_votes WHERE option_id = o.id) WHERE poll_id = ?`
4. 重建总人数：`UPDATE post_polls SET total_votes = (SELECT COUNT(DISTINCT user_id) FROM post_poll_votes WHERE poll_id = ?) WHERE id = ?`

#### POST /posts/:postId/poll/close

手动结束投票。帖主或管理员可调用。设置 is_closed=1。

#### PATCH /posts/:postId/poll

编辑投票（前提：无任何 vote 记录）。帖主可调用。

**Body：** 同 POST /poll 的 Body。实现上删除旧 options 后重新 INSERT。

#### GET /posts/:postId/poll/other-details

查看"其他"选项的自定义输入详情。

**响应：** `{ "items": [{ "userId", "nickname", "avatar", "customText", "createdAt" }] }`

## 4. 权限控制

| 端点 | 可访问用户 |
|------|-----------|
| POST /poll | 帖子作者 |
| GET /poll | 任意登录用户（组合帖子需组合权限） |
| POST /poll/vote | 任意登录用户，不能给自己帖子投 |
| POST /poll/close | 帖子作者或管理员 |
| PATCH /poll | 帖子作者，仅当无投票记录 |
| GET /poll/other-details | 帖子作者或已投票用户 |

## 5. 逻辑规则

- **单选(0)**：optionIds 仅传 1 个 ID
- **多选(1)**：optionIds 可传 1~N 个
- **改票**：不限次数，DELETE+INSERT 事务内完成
- **"其他"选项**：isOther=true 的选项被选中时，otherTexts 中对应 key 必填
- **isEnded 判定**：`is_closed=1 OR (end_time IS NOT NULL AND NOW() > end_time)`
- **截止/关闭后**：投票接口返回 403
- **不能编辑已投票选项**：已有投票记录后仅允许关闭或延长截止时间
- **删除帖子**：软删除帖子时级联设置 post_polls.is_deleted=1，不硬删投票记录
- **组合帖子**：组合内帖子同样支持投票，权限遵循组合可见性规则

## 6. 后端实现计划

### 6.1 文件结构

```
backend/
├── controllers/
│   └── pollController.js       # 新增：投票 CRUD 控制器
├── routes/
│   └── pollRoutes.js           # 新增：投票路由
└── migrations/
    └── 035_create_post_polls.sql  # 新增：建表迁移
```

### 6.2 app.js 修改

挂载 `pollRoutes`：`app.use('/posts', pollRoutes);`

### 6.3 postsController.js 修改

- `formatPost()` 中增加查询 poll 逻辑，嵌入 poll 字段
- `create()` 仅创建帖子，不创建投票
- `update()` 中不需要更新投票
- `deletePost()` 中级联设置 post_polls.is_deleted=1

### 6.4 前端 API（utils/api.js）

```javascript
const communityApi = {
  // 现有...
  createPoll: (postId, data) => request({ url: `/posts/${postId}/poll`, method: 'POST', data }),
  getPoll: (postId) => request({ url: `/posts/${postId}/poll`, method: 'GET' }),
  votePoll: (postId, data) => request({ url: `/posts/${postId}/poll/vote`, method: 'POST', data }),
  closePoll: (postId) => request({ url: `/posts/${postId}/poll/close`, method: 'POST' }),
  updatePoll: (postId, data) => request({ url: `/posts/${postId}/poll`, method: 'PATCH', data }),
  getPollOtherDetails: (postId) => request({ url: `/posts/${postId}/poll/other-details`, method: 'GET' }),
};
```

## 7. 小程序端（后续迭代）

- post-edit 页：投票编辑器组件（标题、选项增删、单选/多选切换、其他选项开关、截止时间选择）
- post-detail 页：投票交互组件（未投票→投票、已投票→统计结果、截止→只读统计）
- 社区首页：post-card 中展示投票摘要卡片

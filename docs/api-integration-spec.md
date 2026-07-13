# 时光绿径待办 — 前端 Web API 接入规范

> 适用对象：前端 React 开发者
> 基础 URL：`https://api.yzjtiantian.cn`

---

## 目录

1. [通用规范](#1-通用规范)
2. [认证模块](#2-认证模块)
3. [待办模块](#3-待办模块)
4. [标签模块](#4-标签模块)
5. [组合模块](#5-组合模块)
6. [协作模块](#6-协作模块)
7. [帖子模块](#7-帖子模块)
8. [点赞模块](#8-点赞模块)
9. [帖子评论模块](#9-帖子评论模块)
10. [评论模块（分享待办）](#10-评论模块分享待办)
11. [文件上传](#11-文件上传)
12. [签到模块](#12-签到模块)
13. [用户模块](#13-用户模块)
14. [配置模块](#14-配置模块)
15. [通知模块](#15-通知模块)
16. [工作报告模块](#16-工作报告模块)
17. [举报模块](#17-举报模块)
18. [分享模块](#18-分享模块)
19. [管理后台模块](#19-管理后台模块)
20. [日志上报](#20-日志上报)
21. [TypeScript 类型定义](#21-typescript-类型定义)

---

## 1. 通用规范

### 1.1 基础信息

| 项目 | 值 |
|------|-----|
| 基础 URL | `https://api.yzjtiantian.cn` |
| 数据格式 | JSON |
| 字符编码 | UTF-8 |
| 时间格式 | ISO 8601（`YYYY-MM-DD HH:mm:ss`） |

### 1.2 认证方式

使用 **JWT Bearer Token**。`/login` 接口获取 token 后，后续请求在 HTTP Header 中携带：

```
Authorization: Bearer <token>
```

Token 有效期：**7 天**。

### 1.3 通用响应格式

**成功响应：**

```json
{
  "success": true,
  "data": { ... },
  "message": "操作成功"
}
```

**错误响应：**

```json
{
  "success": false,
  "message": "错误描述信息"
}
```

### 1.4 HTTP 状态码约定

| 状态码 | 含义 | 说明 |
|--------|------|------|
| 200 | 成功 | 请求正常处理 |
| 400 | 参数错误 | 缺少必填参数或格式不正确 |
| 401 | 未认证 | Token 缺失或已过期 |
| 403 | 无权限 | 非管理员/非资源所有者 |
| 404 | 资源不存在 | 数据未找到 |
| 409 | 版本冲突 | 乐观锁冲突，需刷新后重试。响应体含 `currentVersion` 和 `serverData` |
| 500 | 服务端错误 | 服务器内部异常 |

### 1.5 分页模式

API 采用两种分页方式：

**a) 游标分页（帖子列表）：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `cursor` | string | 游标值，格式 `{createdAt}_{id}`，首次请求不传 |
| `limit` | number | 每页条数（默认 20，最大 50） |

```json
{
  "success": true,
  "data": {
    "list": [...],
    "nextCursor": "2026-07-12 10:00:00_42",
    "hasMore": true
  }
}
```

**b) 偏移分页（待办列表等）：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `page` | number | 页码（从 1 开始） |
| `pageSize` | number | 每页条数 |

```json
{
  "success": true,
  "todos": [...],
  "total": 100,
  "page": 1,
  "pageSize": 50
}
```

---

## 2. 认证模块

前缀：`/auth`

### 2.1 微信登录

```http
POST /auth/login
Content-Type: application/json

{ "code": "wx_login_code" }
```

**响应：**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "openid": "oXXXX",
      "nickname": "用户昵称",
      "avatarUrl": "https://api.yzjtiantian.cn/uploads/avatars/xxx.jpg",
      "todoLimit": 100,
      "comboLimit": 10,
      "collabLimit": 5,
      "isAdmin": false
    },
    "isNewUser": false
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `code` | string | 微信 wx.login() 获取的临时 code |

### 2.2 获取用户信息

```http
GET /auth/userInfo
Authorization: Bearer <token>
```

**响应：**

```json
{
  "success": true,
  "user": {
    "id": 1,
    "openid": "oXXXX",
    "nickname": "昵称",
    "avatarUrl": "https://...",
    "todoLimit": 100,
    "comboLimit": 10,
    "collabLimit": 5,
    "isAdmin": false,
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

### 2.3 更新用户信息

```http
POST /auth/updateUserInfo
Authorization: Bearer <token>
Content-Type: application/json

{
  "nickname": "新昵称",
  "avatarUrl": "https://xxxx"
}
```

### 2.4 增加待办上限

```http
POST /auth/increaseTodoLimit
Authorization: Bearer <token>
```

### 2.5 二维码登录

```http
POST /auth/qrcode/generate                    # 生成二维码
GET  /auth/qrcode/status?scene=<scene>        # 查询扫码状态
POST /auth/qrcode/scanned                     # 标记已扫码（optionalAuth）
POST /auth/qrcode/confirm                     # 确认登录（authMiddleware）
```

---

## 3. 待办模块

前缀：`/todos`

### 3.1 获取待办列表

```http
GET /todos/list?page=1&pageSize=50&date=2026-07-12&completed=0&search=关键词&tagIds=1,2&comboId=1&parent_id=null
Authorization: Bearer <token>
```

**查询参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `page` | number | 页码（默认 1） |
| `pageSize` | number | 每页数量（默认 50） |
| `date` | string | 按日期筛选：`YYYY-MM-DD` |
| `completed` | string | `0`=未完成，`1`=已完成 |
| `search` | string | 关键词搜索（空格分隔多关键词） |
| `tagIds` | string | 标签 ID，逗号分隔 |
| `comboId` | number | 所属组合 ID |
| `parent_id` | string | `null`=仅根待办，传入 ID=获取子待办 |
| `includeDeleted` | string | `true`=包含已删除 |

**响应：**

```json
{
  "success": true,
  "todos": [
    {
      "id": 1,
      "text": "待办内容",
      "completed": 0,
      "priority": "p1",
      "setDate": "2026-07-12",
      "comboId": null,
      "parentId": null,
      "tags": [{"id": 1, "name": "工作"}],
      "remarks": "备注",
      "createdAt": "2026-07-12T10:00:00.000Z",
      "updatedAt": "2026-07-12T10:00:00.000Z"
    }
  ],
  "total": 100,
  "page": 1,
  "pageSize": 50
}
```

### 3.2 创建待办

```http
POST /todos/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "text": "买年货",
  "priority": "p1",
  "setDate": "2026-07-12",
  "comboId": null,
  "parentId": null,
  "remarks": "备注",
  "tagIds": [1, 2],
  "subtasks": [
    {
      "text": "买零食",
      "subtasks": [
        { "text": "洽洽原味瓜子" },
        { "text": "焦糖味瓜子" }
      ]
    },
    {
      "text": "买春联"
    }
  ]
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `text` | string | 是 | 待办内容（最大 200 字） |
| `priority` | string | 否 | `p1`~`p4`，默认 `p3` |
| `setDate` | string | 否 | `YYYY-MM-DD` |
| `comboId` | number | 否 | 所属组合 ID |
| `parentId` | string | 否 | 父待办 ID（子任务） |
| `remarks` | string | 否 | 备注 |
| `tagIds` | number[] | 否 | 标签 ID 数组 |
| `subtasks` | SubtaskInput[] | 否 | 嵌套子待办（无限层级），不传或传 `[]` 时行为不变 |

> **子待办字段说明：** 子待办只需传 `text` 和可选 `subtasks`。`setDate`、`setTime`、`priority` 创建时自动从父待办继承，无需传入。

**响应（不传 subtasks 时）：**

```json
{
  "success": true,
  "id": 1,
  "todo": { ... }
}
```

**响应（含子待办时）：**

```json
{
  "success": true,
  "message": "待办创建成功",
  "todo": {
    "id": "todo_1720000000000_abc123",
    "text": "买年货",
    "parentId": null,
    "completed": 0,
    "...": "其他待办字段"
  },
  "subtasks": [
    {
      "id": "todo_1720000000000_def456",
      "text": "买零食",
      "parentId": "todo_1720000000000_abc123",
      "completed": 0,
      "priority": "p1",
      "version": 1
    },
    {
      "id": "todo_1720000000000_ghi789",
      "text": "买春联",
      "parentId": "todo_1720000000000_abc123",
      "completed": 0,
      "priority": "p1",
      "version": 1
    }
  ]
}
```

> `subtasks` 数组包含所有新创建的子待办（扁平列表，含嵌套的孙待办）。**前端应缓存返回的 `id`**，后续编辑时必须传入。

### 3.3 获取待办详情

```http
GET /todos/:id
Authorization: Bearer <token>
```

**响应中的子待办字段：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `parentId` | string \| null | 父待办 ID。`null` 表示根级待办 |
| `subtasks` | SubtodoItem[] | 直接子任务列表（仅一级，不递归），由 `GET /todos/list?parent_id={id}` 获取子树 |

### 3.4 更新待办

```http
PUT /todos/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "text": "新内容",
  "completed": true,
  "priority": "p1",
  "setDate": "2026-07-13",
  "remarks": "新备注",
  "tagIds": [1],
  "version": 3,
  "subtasks": [
    {
      "id": "todo_1720000000000_def456",
      "text": "编辑了旧子待办的文字"
    },
    {
      "id": "todo_1720000000000_ghi789",
      "text": "另一个旧子待办",
      "completed": true
    },
    {
      "text": "全新子待办（无 id）",
      "subtasks": [
        { "text": "新子待办的嵌套" }
      ]
    }
  ]
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `text` | string | 否 | 新内容 |
| `completed` | boolean | 否 | `true`=完成，`false`=取消完成 |
| `priority` | string | 否 | `p1`~`p4` |
| `setDate` | string | 否 | `YYYY-MM-DD` |
| `setTime` | string | 否 | `HH:mm` |
| `remarks` | string | 否 | 备注 |
| `tagIds` | number[] | 否 | 标签 ID 数组 |
| `comboId` | number | 否 | 所属组合 ID |
| `parentId` | string | 否 | 移动到新父待办 |
| `version` | number | 否 | **乐观锁版本号**，从 `todo.version` 获取。不传时不校验版本 |
| `subtasks` | SubtaskInput[] | 否 | **子待办全量替换**（见下方说明），不传时子待办不受影响 |

> **`subtasks` 更新语义（全量替换）：**
>
> `subtasks` 数组即当前父待办下所有子待办的**完整列表**。后端自动计算差异：
>
> - **有 `id` 的** — 更新已有子待办（`text` 必改，`completed` 可选）
> - **无 `id` 的** — 创建新子待办
> - **数据库中存在、但请求中未出现的 `id`** — 递归软删除（含所有后代）
>
> 编辑时必须把完整子树传回，否则不在列表中的子待办会被删除。
> 新增的子待办无需父待办 ID 或继承字段，后端自动从父待办继承。

**响应（不含子待办操作时）：**

```json
{
  "success": true,
  "message": "待办更新成功",
  "todo": { "所有待办字段" }
}
```

**响应（含子待办操作时）：**

```json
{
  "success": true,
  "message": "待办更新成功",
  "todo": { "所有待办字段" },
  "newSubtodos": [
    {
      "id": "todo_1720000000000_jkl012",
      "text": "全新子待办",
      "parentId": "todo_1720000000000_abc123",
      "completed": 0,
      "version": 1
    }
  ]
}
```

> `newSubtodos` 仅在本次请求确实创建了新的子待办时出现。前端应缓存返回的 `id`。

### 3.5 删除待办（软删除）

```http
DELETE /todos/:id
Authorization: Bearer <token>
```

删除待办时**递归软删除所有后代**（子待办、孙待办……），不会产生飘零数据。

### 3.6 批量移动待办

```http
POST /todos/batch-move
Authorization: Bearer <token>
Content-Type: application/json

{
  "todoIds": [1, 2, 3],
  "comboId": null
}
```

### 3.7 数据同步（离线优先）

```http
POST /todos/sync
Authorization: Bearer <token>
Content-Type: application/json

{
  "syncType": "incremental",
  "lastSyncTime": "2026-07-12T10:00:00.000Z",
  "localTodos": { "id": { "text": "...", "updatedAt": "..." } }
}
```

### 3.8 批量获取待办

```http
POST /todos/batch
Authorization: Bearer <token>
Content-Type: application/json

{ "ids": [1, 2, 3] }
```

### 3.9 全量同步

```http
GET /todos/full-sync?page=1&pageSize=500
Authorization: Bearer <token>
```

### 3.10 已删除列表 & 恢复 & 永久删除

```http
GET  /todos/deleted                       # 已删除列表
POST /todos/restore/:todoId               # 恢复
DELETE /todos/permanent/:todoId           # 永久删除
```

### 3.11 待办优先级说明

| 值 | 含义 | 颜色 |
|----|------|------|
| `p1` | 紧急重要 | `#e34d59` (红) |
| `p2` | 重要不紧急 | `#2196F3` (蓝) |
| `p3` | 一般 | `#ff9800` (橙) |
| `p4` | 低优先级 | `#999` (灰) |

---

## 4. 标签模块

前缀：`/tags`

### 4.1 获取标签列表

```http
GET /tags/list
Authorization: Bearer <token>
```

```json
{
  "success": true,
  "tags": [
    { "id": 1, "name": "工作", "color": "#00b26a" }
  ]
}
```

### 4.2 创建标签

```http
POST /tags/create
Authorization: Bearer <token>
Content-Type: application/json

{ "name": "新标签", "color": "#ff0000" }
```

### 4.3 更新 / 删除标签

```http
PUT    /tags/:id     # 更新
DELETE /tags/:id     # 删除
```

---

## 5. 组合模块

前缀：`/combos`

### 5.1 获取组合列表

```http
GET /combos/list
Authorization: Bearer <token>
```

### 5.2 获取组合详情

```http
GET /combos/:id
Authorization: Bearer <token>
```

```json
{
  "success": true,
  "combo": {
    "id": 1,
    "name": "项目 alpha",
    "icon": "star",
    "color": "#00b26a",
    "description": "描述",
    "isShared": true,
    "shareCode": "abc123",
    "memberLimit": 20,
    "todoCount": 15,
    "comboPostCount": 3,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "members": [
      { "id": 1, "nickname": "用户A", "role": "owner" }
    ]
  }
}
```

### 5.3 创建 / 更新 / 删除组合

```http
POST   /combos/create              # 创建
PUT    /combos/:id                  # 更新
DELETE /combos/:id                  # 删除
```

### 5.4 获取组合成员

```http
GET /combos/:id/members
Authorization: Bearer <token>
```

```json
{
  "success": true,
  "members": [
    { "userId": 1, "nickname": "用户A", "avatar": "...", "role": "owner" }
  ]
}
```

### 5.5 设置成员角色

```http
PUT /combos/:comboId/members/:userId/role
Authorization: Bearer <token>
Content-Type: application/json

{ "role": "admin" }
```

角色枚举：`owner` | `admin` | `member`

---

## 6. 协作模块

前缀：`/collab`

### 6.1 加入组合

```http
POST /collab/join
Authorization: Bearer <token>
Content-Type: application/json

{ "shareCode": "abc123" }
```

### 6.2 自动加入

```http
POST /collab/auto-join
Authorization: Bearer <token>
Content-Type: application/json

{ "shareCode": "abc123" }
```

### 6.3 发送加入请求

```http
POST /collab/request
Authorization: Bearer <token>
Content-Type: application/json

{ "comboId": 1 }
```

### 6.4 请求列表 & 审批

```http
GET  /collab/requests                                    # 获取请求列表
POST /collab/requests/:id/approve                        # 通过
POST /collab/requests/:id/reject                         # 拒绝
```

### 6.5 获取共享待办列表

```http
GET /collab/shared?comboId=1
Authorization: Bearer <token>
```

### 6.6 共享待办 CRUD

```http
POST   /collab/shared/:comboId/todos                     # 创建共享待办
PUT    /collab/shared/:comboId/todos/:todoId              # 更新
PUT    /collab/shared/:comboId/todos/:todoId/complete     # 完成
DELETE /collab/shared/:comboId/todos/:todoId              # 删除
```

### 6.7 成员管理

```http
DELETE /collab/member?comboId=1&userId=2    # 移除成员
POST   /collab/leave                        # 退出组合
```

### 6.8 获取二维码

```http
GET /collab/qrcode?shareCode=abc123
```

---

## 7. 帖子模块

前缀：`/posts`

### 7.1 获取全局帖子列表

```http
GET /posts/list?cursor=2026-07-12T10:00:00_42&limit=20
Authorization: Bearer <token>
```

### 7.2 获取用户帖子列表

```http
GET /posts/user/:userId?cursor=...&limit=20
Authorization: Bearer <token>
```

### 7.3 获取组合帖子列表

```http
GET /posts/combo/:comboId?cursor=...&limit=20
Authorization: Bearer <token>
```

### 7.4 创建帖子

```http
POST /posts/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "postId": "post_1749715200000_abc123",
  "title": "帖子标题",
  "body": "正文内容（支持 markdown）",
  "images": ["https://img.scdn.io/xxx.jpg"],
  "todoIds": [1, 2],
  "shareCode": null,
  "location": { "latitude": 23.1, "longitude": 113.3, "name": "广州塔" },
  "comboId": null,
  "files": [
    {
      "id": "FQxyz1234",
      "url": "https://storage.to/FQxyz1234",
      "raw_url": "https://storage.to/r/FQxyz1234",
      "filename": "report.pdf",
      "size": 2202009,
      "human_size": "2.1 MB",
      "content_type": "application/pdf",
      "expires_at": "2026-07-19T12:00:00Z",
      "owner_token": "owner_v1_..."
    }
  ]
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `postId` | string | 是 | 客户端生成的唯一 ID，格式 `post_{timestamp}_{random}` |
| `title` | string | 是 | 标题（最长 200 字） |
| `body` | string | 否 | Markdown 正文 |
| `images` | string[] | 否 | 图片 URL 数组（img.scdn.io） |
| `todoIds` | number[] | 否 | 关联待办 ID 数组 |
| `shareCode` | string | 否 | 关联组合分享码（comboId 存在时设为 null） |
| `location` | object | 否 | 地理位置 `{ latitude, longitude, name }` |
| `comboId` | number | 否 | 所属组合 ID（传此值则帖子仅组合成员可见） |
| `files` | array | 否 | 文件附件数组 |

**帖子响应格式（formatPost）：**

```json
{
  "postId": "post_xxx",
  "userId": 1,
  "title": "标题",
  "body": "正文",
  "images": ["https://..."],
  "todoIds": [1],
  "shareCode": "abc",
  "shareComboName": "组合名",
  "comboId": null,
  "files": [...],
  "ipProvince": "广东",
  "location": null,
  "likesCount": 5,
  "commentsCount": 3,
  "viewsCount": 100,
  "isLiked": false,
  "isEdited": false,
  "isDeleted": false,
  "createdAt": "2026-07-12T10:00:00.000Z",
  "updatedAt": "2026-07-12T10:00:00.000Z",
  "user": {
    "id": 1,
    "nickname": "用户",
    "avatar": "https://...",
    "badgeTitles": ["连续签到7天"],
    "badgeColors": ["#ff9500"]
  }
}
```

### 7.5 获取帖子详情

```http
GET /posts/:postId
Authorization: Bearer <token>
```

**组合帖子访问控制：** 如果帖子有 `comboId`，服务端会校验当前用户是否为组合成员。非成员返回 `403`。

### 7.6 更新帖子

```http
PUT /posts/:postId
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "新标题",
  "body": "新正文",
  "images": [...],
  "todoIds": [...],
  "shareCode": null,
  "location": null,
  "files": [...]
}
```

### 7.7 删除帖子

```http
DELETE /posts/:postId
Authorization: Bearer <token>
```

### 7.8 获取访客记录

```http
GET /posts/:postId/visitors?page=1&pageSize=20
Authorization: Bearer <token>
```

### 7.9 创建投票

```http
POST /posts/:postId/poll
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "最喜欢的编程语言？",
  "type": 0,
  "allowOther": true,
  "isAnonymous": false,
  "endTime": "2026-07-20 23:59:59",
  "options": [
    { "text": "JavaScript", "isOther": false },
    { "text": "Python", "isOther": false },
    { "text": "Rust", "isOther": false }
  ]
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `title` | string | 是 | 投票标题（最长 200 字） |
| `type` | number | 否 | `0`=单选，`1`=多选（默认 `0`） |
| `allowOther` | boolean | 否 | 是否包含"其他，请输入..."选项 |
| `isAnonymous` | boolean | 否 | 是否匿名投票（默认 `false`） |
| `endTime` | string | 否 | 截止时间 `YYYY-MM-DD HH:mm:ss`，不传表示无限制 |
| `options` | object[] | 是 | 选项列表（2~20 个） |
| `options[].text` | string | 是 | 选项文本（最长 100 字） |
| `options[].isOther` | boolean | 是 | 是否为"其他"输入选项 |

**权限：** 仅帖主可调用。一个帖子只能有一个投票。

**响应：**

```json
{
  "success": true,
  "data": { "pollId": 1 }
}
```

### 7.10 获取投票详情

```http
GET /posts/:postId/poll
Authorization: Bearer <token>
```

**响应：**

```json
{
  "success": true,
  "data": {
    "poll": {
      "pollId": 1,
      "title": "最喜欢的编程语言？",
      "type": 0,
      "isAnonymous": false,
      "allowOther": true,
      "totalVotes": 10,
      "endTime": "2026-07-20 23:59:59",
      "isEnded": false,
      "isVoted": false,
      "userVotedOptionIds": [],
      "options": [
        { "optionId": 1, "text": "JavaScript", "voteCount": 5, "isOther": false },
        { "optionId": 2, "text": "Python", "voteCount": 3, "isOther": false },
        { "optionId": 3, "text": "其他", "voteCount": 2, "isOther": true }
      ]
    },
    "otherDetails": [
      {
        "userId": 1,
        "nickname": "用户A",
        "avatar": "https://...",
        "customText": "Go 语言",
        "createdAt": "2026-07-13 10:00:00"
      }
    ]
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `poll.pollId` | number | 投票 ID |
| `poll.title` | string | 投票标题 |
| `poll.type` | number | `0`=单选，`1`=多选 |
| `poll.isAnonymous` | boolean | 是否匿名 |
| `poll.allowOther` | boolean | 是否允许"其他"输入 |
| `poll.totalVotes` | number | 参与投票总人数（去重） |
| `poll.endTime` | string\|null | 截止时间 |
| `poll.isEnded` | boolean | 是否已结束（超时或手动关闭） |
| `poll.isVoted` | boolean | 当前用户是否已投票 |
| `poll.userVotedOptionIds` | number[] | 当前用户投票的选项 ID 列表 |
| `poll.options[]` | object[] | 选项列表 |
| `otherDetails` | object[] | "其他"选项详情（见下方权限说明） |

> **匿名投票可见性：** `isAnonymous=true` 时，仅帖主和管理员能看到 `otherDetails`，普通用户收到空数组 `[]`。
>
> `otherDetails` 包含投票者的 `userId` / `nickname` / `avatar` / `customText` / `createdAt`，仅当帖子有"其他"选项且有人填写时非空。

帖子列表（`/posts/list`、`/posts/user/:userId`、`/posts/combo/:comboId`）和帖子详情（`/posts/:postId`）响应中的 `poll` 字段与之结构一致（不含 `otherDetails`），无投票时 `poll: null`。

### 7.11 投票 / 改票

```http
POST /posts/:postId/poll/vote
Authorization: Bearer <token>
Content-Type: application/json

{
  "optionIds": [1, 3],
  "otherTexts": { "3": "Go 语言" }
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `optionIds` | number[] | 是 | 选择的选项 ID 列表。单选传单个元素，多选传 1~全部 |
| `otherTexts` | object | 否 | `{ "optionId": "文本" }`。仅当选中 `isOther=true` 的选项时必填 |

**规则：**
- 不能给自己的帖子投票
- 单选投票 `type=0` 时，`optionIds` 只能传一个元素
- 已结束的投票不可投票
- 同一用户重复请求即为**改票**（旧票被替换）

**权限：** 所有已登录用户（帖主除外）。

**响应：**

```json
{
  "success": true,
  "data": {
    "poll": { "...投票详情(同 getPoll)" }
  }
}
```

### 7.12 关闭投票

```http
POST /posts/:postId/poll/close
Authorization: Bearer <token>
```

**权限：** 帖主或管理员。

**响应：**

```json
{
  "success": true,
  "data": {
    "poll": { "...投票详情，isEnded: true" }
  }
}
```

### 7.13 编辑投票

```http
PATCH /posts/:postId/poll
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "新标题",
  "type": 1,
  "allowOther": false,
  "isAnonymous": true,
  "endTime": "2026-07-25 23:59:59",
  "options": [
    { "text": "新选项A", "isOther": false },
    { "text": "新选项B", "isOther": false },
    { "text": "新选项C", "isOther": false }
  ]
}
```

**权限：** 仅帖主。

**编辑规则：**

| 当前状态 | 允许修改的字段 |
|----------|---------------|
| 无投票记录 | 全部字段（title, type, allowOther, isAnonymous, endTime, options） |
| 已有投票记录 | 仅 `endTime` 和 `isAnonymous` 开关，其余字段传入即拒绝 |

**响应：**

```json
{
  "success": true,
  "data": {
    "poll": { "...投票详情" }
  }
}
```

### 7.14 获取"其他"选项详情

```http
GET /posts/:postId/poll/other-details
Authorization: Bearer <token>
```

**权限：** 帖主、管理员、已投票用户可查看。

> 匿名投票（`isAnonymous=true`）下，仅帖主和管理员可查看，普通投票者返回 `403`。

**响应：**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "userId": 1,
        "nickname": "用户A",
        "avatar": "https://...",
        "customText": "Go 语言",
        "createdAt": "2026-07-13 10:00:00"
      }
    ]
  }
}
```

---

## 8. 点赞模块

前缀：`/likes`

### 8.1 切换点赞

```http
POST /likes/toggle
Authorization: Bearer <token>
Content-Type: application/json

{ "postId": "post_xxx" }
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `postId` | string | 帖子 ID |

**响应：**

```json
{
  "success": true,
  "isLiked": true,
  "likesCount": 6
}
```

### 8.2 获取点赞用户列表

```http
GET /likes/:postId/users
Authorization: Bearer <token>
```

---

## 9. 帖子评论模块

前缀：`/post-comments`

### 9.1 获取评论列表

```http
GET /post-comments/:postId?cursor=...&limit=20
Authorization: Bearer <token>
```

**响应（游标分页）：**

```json
{
  "success": true,
  "data": {
    "list": [
      {
        "id": 1,
        "postId": "post_xxx",
        "userId": 1,
        "content": "评论内容",
        "likesCount": 2,
        "isLiked": false,
        "user": { "nickname": "...", "avatar": "..." },
        "createdAt": "2026-07-12T10:00:00.000Z"
      }
    ],
    "nextCursor": "2026-07-12T10:00:00_1",
    "hasMore": false
  }
}
```

### 9.2 创建评论

```http
POST /post-comments/:postId
Authorization: Bearer <token>
Content-Type: application/json

{ "content": "评论内容" }
```

### 9.3 删除评论

```http
DELETE /post-comments/:commentId
Authorization: Bearer <token>
```

### 9.4 切换评论点赞

```http
POST /post-comments/:commentId/like
Authorization: Bearer <token>
```

---

## 10. 评论模块（分享待办）

前缀：`/comments`

### 10.1 获取评论

```http
GET /comments/:sharedTodoId
Authorization: Bearer <token>
```

### 10.2 创建评论

```http
POST /comments/:sharedTodoId
Authorization: Bearer <token>
Content-Type: application/json

{ "content": "评论内容" }
```

### 10.3 删除评论

```http
DELETE /comments/:commentId
Authorization: Bearer <token>
```

---

## 11. 文件上传

前缀：`/upload`

### 11.1 头像上传

```http
POST /upload/avatar
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: (binary image, max 2MB)
```

| 字段 | 限制 |
|------|------|
| 文件类型 | `image/jpeg`, `image/png`, `image/gif`, `image/webp` |
| 文件大小 | 2MB |

### 11.2 待办图片上传

```http
POST /upload/image
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: (binary image, max 10MB)
```

### 11.3 代理上传（storage.to 文件）

```http
POST /upload/proxy
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: (binary file)
uploadUrl: "https://xxxx.r2.cloudflarestorage.com/..."
```

此接口用于中转上传到 storage.to 的 R2 存储，绕过小程序域名白名单限制。Web 端可直接使用 storage.to API。

### 11.4 帖子图片上传

帖子图片使用 **img.scdn.io**（直传，不走后端），流程：

```
前端 → wx.uploadFile(url: https://img.scdn.io/upload) → 返回图片 URL → 存入帖子 images 字段
```

---

## 12. 签到模块

前缀：`/checkin`

### 12.1 签到

```http
POST /checkin
Authorization: Bearer <token>
```

```json
{
  "success": true,
  "data": {
    "points": 10,
    "streak": 5,
    "newBadges": ["连续签到7天"]
  }
}
```

### 12.2 签到状态

```http
GET /checkin/status
Authorization: Bearer <token>
```

```json
{
  "success": true,
  "data": {
    "checkedIn": true,
    "streak": 5,
    "totalDays": 30,
    "points": 150,
    "todayPoints": 10
  }
}
```

### 12.3 月签到记录

```http
GET /checkin/month?year=2026&month=7
Authorization: Bearer <token>
```

### 12.4 排行榜

```http
GET /checkin/leaderboard?type=streak&limit=20
Authorization: Bearer <token>
```

### 12.5 扣减积分

```http
POST /checkin/deduct-points
Authorization: Bearer <token>
Content-Type: application/json

{ "points": 5 }
```

---

## 13. 用户模块

前缀：`/users`

### 13.1 搜索用户

```http
GET /users/search?keyword=昵称
Authorization: Bearer <token>
```

### 13.2 批量获取用户

```http
GET /users/batch?ids=1,2,3
Authorization: Bearer <token>
```

### 13.3 获取用户主页

```http
GET /users/:userId/profile
Authorization: Bearer <token>
```

```json
{
  "success": true,
  "data": {
    "user": { "id": 1, "nickname": "...", "avatar": "...", "badgeTitles": [...] },
    "stats": { "postCount": 10, "todoCount": 50, "checkinStreak": 7, "totalPoints": 200 }
  }
}
```

---

## 14. 配置模块

前缀：`/config`（无需认证）

```http
GET /config/updates                     # 更新日志
GET /config/notices                     # 公告
GET /config/app                         # 应用配置
GET /config/guides                      # 引导页列表
GET /config/guides/:id                  # 引导页详情
GET /config/public-stats                # 公开统计
GET /config/public-tags                 # 公开标签
GET /config/public-users                # 公开用户
GET /config/public-stats/hourly         # 整点统计
```

---

## 15. 通知模块

前缀：`/notify`

### 15.1 订阅通知

```http
POST /notify/subscribe
Authorization: Bearer <token>
Content-Type: application/json

{ "templateId": "xxx", "targetMinutes": 30 }
```

### 15.2 计划通知

```http
POST /notify/schedule
Authorization: Bearer <token>
Content-Type: application/json

{
  "todoId": 1,
  "notifyAt": "2026-07-12 14:00:00"
}
```

### 15.3 通知列表 & 更新 & 取消

```http
GET    /notify/list?todoId=1              # 按待办查询
GET    /notify/by-todo?todoId=1           # 查通知
PUT    /notify/:id                        # 更新
DELETE /notify/:id                        # 取消
```

### 15.4 共享待办通知

```http
POST   /notify/shared/schedule            # 创建
GET    /notify/shared/by-todo             # 按待办查询
PUT    /notify/shared/:id                 # 更新
DELETE /notify/shared/:id                 # 取消
```

---

## 16. 工作报告模块

前缀：`/work-reports`

### 16.1 日报/周报 CRUD

```http
GET    /work-reports?page=1&pageSize=20    # 列表
GET    /work-reports/board                 # 看板视图
GET    /work-reports/:id                   # 详情
POST   /work-reports                       # 创建
PUT    /work-reports/:id                   # 更新
DELETE /work-reports/:id                   # 删除
```

### 16.2 报告模板

```http
GET  /work-reports/templates/list          # 模板列表
PUT  /work-reports/templates               # 创建/更新模板
POST /work-reports/templates/defaults      # 初始化默认模板
```

**创建报告请求体：**

```json
{
  "type": "daily",
  "reportDate": "2026-07-12",
  "content": {
    "completed": "完成了...",
    "plan": "计划...",
    "issues": "问题..."
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `type` | string | `daily` 日报 / `weekly` 周报 |
| `reportDate` | string | `YYYY-MM-DD` |

---

## 17. 举报模块

前缀：`/reports`

```http
POST  /reports/create                  # 提交举报
GET   /reports/my                      # 我的举报
```

---

## 18. 分享模块

前缀：`/share`

### 18.1 分享快照

```http
POST /share/snapshot                           # 创建快照
GET  /share/snapshot/:shareId                  # 获取快照（无需认证）
POST /share/snapshot/verify-password/:shareId  # 验证密码
POST /share/snapshot/record-add/:shareId       # 记录新增操作
GET  /share/snapshot/visitors/:shareId         # 访客列表
POST /share/snapshot/revoke/:shareId           # 撤销快照
GET  /share/snapshot/list-by-todo/:todoId      # 按待办查询快照
POST /share/snapshot/batch-metadata            # 批量获取元数据
```

---

## 19. 管理后台模块

前缀：`/admin`（需 `isAdmin` 权限）

### 19.1 统计

```http
GET /admin/stats                                              # 总览统计
GET /admin/stats/retention                                    # 留存统计
GET /admin/stats/tag-usage                                    # 标签使用
GET /admin/stats/notification-rate                            # 通知率
GET /admin/stats/user-todo-distribution                       # 待办分布
GET /admin/stats/todo-hourly                                  # 时段统计
GET /admin/stats/shared-todo-completion                       # 共享待办完成率
GET /admin/stats/member-roles                                 # 成员角色统计
GET /admin/stats/assign-types                                 # 分配类型
GET /admin/stats/request-rate                                 # 请求审批率
GET /admin/stats/sync-actions                                 # 同步行为
GET /admin/stats/cross/tag-completion                         # 标签完成交叉分析
GET /admin/stats/cross/notification-effect                    # 通知效果分析
GET /admin/stats/:type                                        # 通用明细查询
```

### 19.2 用户管理

```http
GET    /admin/users                                           # 用户列表
GET    /admin/users/:id                                       # 用户详情
PUT    /admin/users/:id/limits                                # 修改上限
PUT    /admin/users/:id/nickname                              # 修改昵称
PUT    /admin/users/:id/badges                                # 修改徽章
```

### 19.3 公告管理

```http
GET    /admin/notices
POST   /admin/notices
PUT    /admin/notices/:index
DELETE /admin/notices/:index
```

### 19.4 更新日志管理

```http
GET    /admin/updates
POST   /admin/updates
PUT    /admin/updates/:index
DELETE /admin/updates/:index
```

### 19.5 数据库管理

```http
GET /admin/tables                                # 表列表
GET /admin/tables/:tableName?page=1&pageSize=20  # 表数据
```

### 19.6 系统配置

```http
GET  /admin/config           # 获取配置
PUT  /admin/config           # 更新配置
```

### 19.7 评论管理

```http
GET    /admin/comments        # 评论列表
DELETE /admin/comments/:id    # 删除评论
```

### 19.8 待办详情

```http
GET /admin/todo/:todoId
```

---

## 20. 日志上报

前缀：`/log`

```http
POST /log/report
Authorization: Bearer <token>
Content-Type: application/json

{
  "level": "warn",
  "message": "描述",
  "data": { "key": "value" }
}
```

---

## 21. TypeScript 类型定义

```typescript
// ========== 通用 ==========

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}

interface CursorPage<T> {
  list: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

interface OffsetPage<T> {
  todos?: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ========== 认证 ==========

interface LoginRequest {
  code: string;
}

interface LoginResponse {
  token: string;
  user: User;
  isNewUser: boolean;
}

interface User {
  id: number;
  openid: string;
  nickname: string;
  avatarUrl: string | null;
  todoLimit: number;
  comboLimit: number;
  collabLimit: number;
  isAdmin: boolean;
  createdAt?: string;
  badgeTitles?: string[];
  badgeColors?: string[];
}

// ========== 待办 ==========

type Priority = 'p1' | 'p2' | 'p3' | 'p4';

interface Todo {
  id: number;
  text: string;
  completed: number;
  priority: Priority;
  setDate: string | null;
  comboId: number | null;
  parentId: number | null;
  tags: Tag[];
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TodoCreateRequest {
  text: string;
  priority?: Priority;
  setDate?: string;
  setTime?: string;
  comboId?: number | null;
  parentId?: string | null;
  remarks?: string;
  tagIds?: number[];
  subtasks?: SubtaskInput[];
}

interface TodoUpdateRequest {
  text?: string;
  completed?: boolean;
  priority?: Priority;
  setDate?: string;
  setTime?: string;
  comboId?: number | null;
  parentId?: string | null;
  remarks?: string;
  tagIds?: number[];
  version?: number;
  subtasks?: SubtaskInput[];
}

interface SubtaskInput {
  /** 更新已有子待办时必须传。新增时不传 */
  id?: string;
  /** 子待办内容 */
  text: string;
  /** 完成状态（仅在更新时使用） */
  completed?: boolean;
  /** 嵌套子待办，无限层级 */
  subtasks?: SubtaskInput[];
}

interface SubtodoItem {
  id: string;
  text: string;
  parentId: string;
  completed: number;
  priority: string;
  version: number;
}

// ========== 标签 ==========

interface Tag {
  id: number;
  name: string;
  color: string;
}

// ========== 组合 ==========

type ComboRole = 'owner' | 'admin' | 'member';

interface Combo {
  id: number;
  name: string;
  icon: string;
  color: string;
  description: string;
  isShared: boolean;
  shareCode: string | null;
  memberLimit: number;
  todoCount: number;
  comboPostCount: number;
  createdAt: string;
  members: ComboMember[];
}

interface ComboMember {
  userId: number;
  nickname: string;
  avatar: string | null;
  role: ComboRole;
  badgeTitles?: string[];
  badgeColors?: string[];
}

// ========== 帖子 ==========

interface PostFile {
  id: string;
  url: string;
  raw_url: string;
  filename: string;
  size: number;
  human_size: string;
  content_type: string;
  expires_at: string;
  owner_token: string;
}

interface Post {
  postId: string;
  userId: number;
  title: string;
  body: string | null;
  images: string[];
  todoIds: number[];
  shareCode: string | null;
  shareComboName: string | null;
  comboId: number | null;
  files: PostFile[];
  ipProvince: string | null;
  location: GeoLocation | null;
  likesCount: number;
  commentsCount: number;
  viewsCount: number;
  isLiked: boolean;
  isEdited: boolean;
  isDeleted: boolean;
  poll: PostPoll | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    nickname: string;
    avatar: string | null;
    badgeTitles: string[];
    badgeColors: string[];
  };
}

interface PostCreateRequest {
  postId: string;
  title: string;
  body?: string | null;
  images?: string[];
  todoIds?: number[];
  shareCode?: string | null;
  location?: GeoLocation | null;
  comboId?: number | null;
  files?: PostFile[];
}

// ========== 投票 (Poll) ==========

interface PostPoll {
  pollId: number;
  title: string;
  type: 0 | 1;             // 0=单选, 1=多选
  isAnonymous: boolean;
  allowOther: boolean;
  totalVotes: number;
  endTime: string | null;
  isEnded: boolean;
  isVoted: boolean;
  userVotedOptionIds: number[];
  options: PostPollOption[];
}

interface PostPollOption {
  optionId: number;
  text: string;
  voteCount: number;
  isOther: boolean;
}

interface PostPollOtherDetail {
  userId: number;
  nickname: string;
  avatar: string | null;
  customText: string;
  createdAt: string;
}

interface PostPollCreateRequest {
  title: string;
  type?: 0 | 1;
  allowOther?: boolean;
  isAnonymous?: boolean;
  endTime?: string | null;
  options: Array<{
    text: string;
    isOther: boolean;
  }>;
}

interface PostPollVoteRequest {
  optionIds: number[];
  otherTexts?: Record<string, string>;
}

interface PostPollUpdateRequest {
  title?: string;
  type?: 0 | 1;
  allowOther?: boolean;
  isAnonymous?: boolean;
  endTime?: string | null;
  options?: Array<{
    text: string;
    isOther: boolean;
  }>;
}

interface GeoLocation {
  latitude: number;
  longitude: number;
  name: string;
}

// ========== 帖子评论 ==========

interface PostComment {
  id: number;
  postId: string;
  userId: number;
  content: string;
  likesCount: number;
  isLiked: boolean;
  user: { nickname: string; avatar: string | null };
  createdAt: string;
}

// ========== 签到 ==========

interface CheckinStatus {
  checkedIn: boolean;
  streak: number;
  totalDays: number;
  points: number;
  todayPoints: number;
}

// ========== 文件上传 ==========

interface FileUploadResponse {
  success: boolean;
  url?: string;
  avatarUrl?: string;
  message?: string;
}
```

---

## 附录：API 快速索引

| 模块 | 前缀 | 认证 | 主要端点 |
|------|------|------|---------|
| 认证 | `/auth` | 部分 | login, userInfo, updateUserInfo, qrcode/* |
| 待办 | `/todos` | 全量 | list, create, sync, batch, **/:id** |
| 标签 | `/tags` | 全量 | list, create, **/:id** |
| 组合 | `/combos` | 全量 | list, create, **/:id**, members, role |
| 协作 | `/collab` | 全量 | join, request, shared/*, member, leave |
| 帖子 | `/posts` | 全量 | list, create, combo/:comboId, user/:userId, **/:postId**<br>**/:postId/poll**, **/:postId/poll/vote**, **/:postId/poll/close**, **/:postId/poll/other-details** |
| 点赞 | `/likes` | 全量 | toggle, **/:postId/users** |
| 帖子评论 | `/post-comments` | 全量 | **/:postId**, create, delete, like |
| 评论 | `/comments` | 全量 | **/:sharedTodoId**, create, delete |
| 上传 | `/upload` | 全量 | avatar, image, proxy |
| 签到 | `/checkin` | 全量 | create, status, month, leaderboard |
| 用户 | `/users` | 全量 | search, batch, **/:userId/profile** |
| 配置 | `/config` | 无需 | updates, notices, app, guides, public-stats |
| 通知 | `/notify` | 全量 | subscribe, schedule, list, shared/* |
| 工作报告 | `/work-reports` | 全量 | list, board, templates, **/:id** |
| 举报 | `/reports` | 全量 | create, my |
| 分享 | `/share` | 混合 | snapshot/* |
| 管理 | `/admin` | 管理员 | stats, users, notices, updates, tables, config |
| 日志 | `/log` | 全量 | report |

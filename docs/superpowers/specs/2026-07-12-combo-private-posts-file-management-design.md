# 组合私有帖子圈 & 文件管理 — 设计文档

## 概述

在现有帖子系统和组合系统基础上，扩展两个能力：
1. **组合内私有帖子圈** — 帖子可归属于某个组合，仅组合成员可见
2. **帖子文件管理** — 通过 storage.to API 实现文件上传，帖子支持附件

## 1. 数据库变更

### posts 表

```sql
-- 组合外键：标记帖子属于哪个组合
ALTER TABLE posts ADD COLUMN combo_id BIGINT DEFAULT NULL AFTER user_id;
CREATE INDEX idx_combo_id ON posts(combo_id);

-- 文件附件：JSON 数组，存储 storage.to 返回的文件元数据
ALTER TABLE posts ADD COLUMN files TEXT DEFAULT NULL AFTER images;
```

两个字段均为 `DEFAULT NULL`，完全向后兼容。

### files 字段格式

```json
[
  {
    "id": "FQxyz1234",
    "url": "https://storage.to/FQxyz1234",
    "raw_url": "https://storage.to/r/FQxyz1234",
    "filename": "report.pdf",
    "size": 2202009,
    "human_size": "2.1 MB",
    "content_type": "application/pdf",
    "expires_at": "2026-04-15T12:00:00Z",
    "owner_token": "owner_v1_..."
  }
]
```

字段名统一使用蛇形命名（snake_case），与 storage.to API 返回格式一致。
`owner_token` 必须存储，用于后续文件删除/管理。

## 2. 后端 API

### 新增接口

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/posts/combo/:comboId` | auth | 获取组合内帖子列表（游标分页），仅组合成员可访问 |

### 改动接口

| 方法 | 路径 | 改动 |
|------|------|------|
| POST | `/posts/create` | 新增 `comboId`、`files` 请求参数；若传了 comboId，验证用户是否是组合所有者/成员；写入 `combo_id` 和 `files` 字段 |
| PUT  | `/posts/:postId` | 新增 `files` 字段处理 |
| GET  | `/posts/list` | 排除 `combo_id IS NOT NULL` 的帖子（组合帖不出现在全局社区广场） |
| GET  | `/posts/:postId` | 若帖子有 `combo_id`，验证当前用户是否为该组合所有者/成员 |
| GET  | `/posts/user/:userId` | 排除 `combo_id IS NOT NULL` 的帖子（组合帖不出现在用户个人主页） |

### 后端改动文件

- **`backend/controllers/postsController.js`**:
  - `create()`: 增加 `comboId`、`files` 参数。若传 `comboId`:
    1. 先查询 `combos` 表验证组合存在
    2. 检查 `combos.user_id`（owner 直接通过）
    3. 非 owner 再查 `combo_members`
    4. 若同时传了 `shareCode` 则置为 null（组合帖不计入社区）
  - 新增 `getComboPosts()`: 按 `combo_id` 查询 + 组合成员权限校验
  - `update()`: 增加 `files` 字段处理，读旧 files 对比找出被删文件 → 调用 storage.to 清理
  - `formatPost()`: 增加 `comboId`、`files` 序列化输出（file JSON.parse 加 null 保护）
  - `getList()`: 增加 `AND p.combo_id IS NULL` 条件
  - `getUserPosts()`: 增加 `AND p.combo_id IS NULL` 条件
  - `getById()`: 若帖子 `combo_id IS NOT NULL`，校验组合成员身份
  - `deletePost()`: 解析 `files`，用 owner_token 调用 storage.to DELETE 清理文件

- **`backend/routes/postsRoutes.js`**:
  - 新增 `router.get('/combo/:comboId', ...)` — **必须在 `/:postId` 之前注册**，否则 `combo` 会被匹配为 postId

- **`backend/controllers/comboController.js`**:
  - `getById()`: 返回数据中增加 `comboPostsCount` 字段

### 组合成员权限校验逻辑

```javascript
// create() / getComboPosts() / getById() 中通用
async function checkComboAccess(comboId, userId) {
  const combos = await query('SELECT user_id FROM combos WHERE id = ?', [comboId]);
  if (combos.length === 0) return false; // 组合不存在

  // 组合所有者直接通过
  if (combos[0].user_id === userId) return true;

  // 非所有者查 combo_members（仅 is_shared=1 的组合有成员记录）
  const member = await query(
    'SELECT id FROM combo_members WHERE combo_id = ? AND user_id = ?',
    [comboId, userId]
  );
  return member.length > 0;
}
```

## 3. 前端改动

### 组合详情页 (`packageCombo/combo-detail/`)

- **wxml**: 在 `todos-section` 和 `combo-actions` 之间新增"帖子圈"区块：
  - 发帖入口按钮（仅在非 adminView 时展示）
  - 帖子列表（卡片式，显示标题、摘要去除 markdown、缩略图、时间、文件数、评论数）
  - 空状态提示 "暂无帖子"
  - `<scroll-view bindscrolltolower="loadMoreComboPosts">` 支持游标分页懒加载
- **js**:
  - 新增 `comboPosts`, `comboPostsCursor`, `comboPostsHasMore` 等 data 字段
  - 帖子加载与 `loadComboData()` **解耦**：`loadComboData()` 完成后通过 `setTimeout` 或 `setData` 回调异步触发 `loadComboPosts()`
  - 新增 `stripMarkdown(text)` 辅助函数用于摘要提取
  - 新增 `loadComboPosts()` / `loadMoreComboPosts()` / `navigateToCreatePost()` / `navigateToPostDetail()`

### 发帖页 (`packageCommunity/post-edit/`)

- **js**:
  - `onLoad` 增加 `comboId` 参数判断，生成 `visitorToken` 存入 data
  - `handleSubmit()` 中如果来自组合，传递 `comboId`；同时传递 `files` 数组
  - `createPost()` 增加 `comboId`、`files` 字段

- **文件上传（拆分为两个区域）**:
  - **图片区**：保留现有 `t-upload` 组件，`media-type="{{['image']}}"`，走现有 `img.scdn.io` 上传流程
  - **文件区**：新增自定义文件选择区域：
    - 按钮触发 `wx.chooseMessageFile({ type: 'all', count: remaining })` 选择任意类型文件
    - 自定义文件列表 UI（文件名、大小、图标、进度、删除按钮）
    - 上传流程走 storage.to 三步流程（init → uploadFile → confirm）
    - `owner_token` 保存到文件元数据中
  - `max="9"` 总数量限制（图片+文件合计）
  - 取消发帖时，通过 `onUnload()` 或 `goBack()` 收集已上传文件，调用 storage.to DELETE 清理
  - 编辑帖子时，前端发送完整新 `files` 列表，后端对比旧 files 找出被删文件并调用 storage.to 清理

- **文件列表字段结构**:
```javascript
data: {
  imageUrls: [],    // 仅图片 URL 数组（不变）
  attachedFiles: [], // 文件元数据数组（新字段）
  // ...
}
```

- **visitor_token 管理**:
  - 在 `onLoad()` 中生成一次：`'visitor_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8)`
  - 存入 `this.data.visitorToken`，整个编辑会话复用
  - 页面卸载即丢弃

### storage.to 上传流程（前端工具函数）

新建 `utils/fileUpload.js`：

```javascript
const STORAGE_TO_BASE = 'https://storage.to/api';

// 1. 初始化上传
async function initUpload({ filename, contentType, size, visitorToken }) {
  const res = await wx.request({
    url: `${STORAGE_TO_BASE}/upload/init`,
    method: 'POST',
    header: { 'X-Visitor-Token': visitorToken },
    data: { filename, content_type: contentType, size }
  });
  return res.data; // { type, upload_url, r2_key, headers, owner_token, ... }
}

// 2. 上传到 R2
async function uploadToR2(uploadUrl, filePath) {
  return new Promise((resolve, reject) => {
    wx.uploadFile({ url: uploadUrl, filePath, name: 'file',
      success: resolve, fail: reject
    });
  });
}

// 3. 确认上传
async function confirmUpload({ filename, size, contentType, r2Key, visitorToken }) {
  const res = await wx.request({
    url: `${STORAGE_TO_BASE}/upload/confirm`,
    method: 'POST',
    header: { 'X-Visitor-Token': visitorToken },
    data: { filename, size, content_type: contentType, r2_key: r2Key }
  });
  return res.data;
}

// 4. 删除文件（取消发帖 / 清理孤儿文件时使用）
async function deleteFile({ fileId, ownerToken }) {
  const res = await wx.request({
    url: `${STORAGE_TO_BASE}/file/${fileId}`,
    method: 'DELETE',
    header: { 'Authorization': `Owner ${ownerToken}` }
  });
  return res.data;
}
```

### 帖子详情页 (`packageCommunity/post-detail/`)

- 在 `post-card` 和 `post-stats` 之间插入文件列表区块：
  - 文件按行展示：文件类型图标（TDesign 图标库 `file-pdf`/`file-word`/`file-excel`/`file-unknown`）、文件名、大小、剩余天数
  - 已过期文件：灰色显示"文件已过期"，不可点击
  - 有效文件：点击触发 `wx.downloadFile` → `wx.openDocument` 打开
  - 剩余 1 天内显示"即将过期"标记

### content_type → 图标映射

```javascript
const FILE_ICONS = {
  'application/pdf': 'file-pdf',
  'application/msword': 'file-word',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'file-word',
  'application/vnd.ms-excel': 'file-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'file-excel',
  'application/zip': 'file-zip',
  'application/x-rar-compressed': 'file-zip',
  'text/plain': 'file-txt',
  'text/csv': 'file-csv',
  'image/': 'file-image',
};
function getFileIcon(contentType) {
  const key = Object.keys(FILE_ICONS).find(k => contentType?.startsWith(k));
  return FILE_ICONS[key] || 'file-unknown';
}
```

### 文件过期检测

```javascript
function isFileExpired(expiresAt) {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

function getFileRemainingDays(expiresAt) {
  if (!expiresAt) return null;
  const remaining = (new Date(expiresAt) - new Date()) / (1000 * 60 * 60 * 24);
  return Math.ceil(remaining);
}
```

## 4. 文件类型 & 大小限制

- 支持类型: 图片、PDF、文档、压缩包等常见格式（通过 `wx.chooseMessageFile({ type: 'all' })` 选择）
- 单文件上限: 25GB（>50MB 自动走分片上传）
- 保留时长: 7 天（storage.to 匿名上传最大值，从上传确认时算起）
- 文件数量上限: 每帖最多 9 个（图片+文件合计，共用配额）
- 图片区: `t-upload` 组件（走 `img.scdn.io`）
- 文件区: `wx.chooseMessageFile` + 自定义 UI（走 `storage.to`）

## 5. 迁移文件

创建 `backend/migrations/032_add_combo_id_and_files_to_posts.sql`:

```sql
-- 组合内私有帖子
ALTER TABLE posts ADD COLUMN combo_id BIGINT DEFAULT NULL AFTER user_id;
CREATE INDEX idx_combo_id ON posts(combo_id);

-- 帖子文件附件
ALTER TABLE posts ADD COLUMN files TEXT DEFAULT NULL AFTER images;

SELECT '组合ID和文件字段添加成功' as result;
```

## 6. 错误处理

- 非组合成员尝试发帖/查看 → 403
- storage.to 上传失败 → 前端弹 toast，不上传失败的文件
- 组合已删除 → 帖子正常显示，但组合名显示"已删除的组合"
- 文件已过期 → 前端展示灰色"文件已过期"，不可点击
- 取消发帖 → 自动清理已上传的 storage.to 文件
- 帖子删除 → 后端 `deletePost()` 自动清理关联的 storage.to 文件
- 编辑帖子删除文件 → 后端对比旧 files 列表，调用 DELETE 清理

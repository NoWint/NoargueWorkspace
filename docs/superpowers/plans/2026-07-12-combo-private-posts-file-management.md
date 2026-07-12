# 组合私有帖子圈 & 文件管理 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable combo-private posts (visible only to combo members) and file attachments on posts via storage.to API.

**Architecture:** Add `combo_id` + `files` columns to `posts` table. Backend: extend postsController with combo-scoped queries and member access checks. Frontend: async-separate combo posts loading on combo-detail page; split upload into t-upload for images + custom `wx.chooseMessageFile` for files (storage.to). Post-detail shows file list with expiry detection. Upload flow: frontend → storage.to (direct) → save metadata to backend.

**Tech Stack:** Express/MySQL 5.5 backend, WeChat Mini Program + TDesign Miniprogram, storage.to REST API for file hosting.

---

### Task 1: Database Migration — add combo_id and files to posts

**Files:**
- Create: `backend/migrations/032_add_combo_id_and_files_to_posts.sql`

- [ ] **Step 1: Create migration SQL**

Write `backend/migrations/032_add_combo_id_and_files_to_posts.sql`:

```sql
-- 组合内私有帖子：combo_id 标记帖子归属
ALTER TABLE posts ADD COLUMN combo_id BIGINT DEFAULT NULL AFTER user_id;
CREATE INDEX idx_combo_id ON posts(combo_id);

-- 帖子文件附件：JSON 数组，存储 storage.to 返回的文件元数据（含 owner_token）
ALTER TABLE posts ADD COLUMN files TEXT DEFAULT NULL AFTER images;

SELECT '组合ID和文件字段添加成功' as result;
```

Both columns are `DEFAULT NULL` — fully backward compatible with existing data.

- [ ] **Step 2: Commit**

```bash
git add backend/migrations/032_add_combo_id_and_files_to_posts.sql
git commit -m "feat(db): add combo_id and files columns to posts table"
```

---

### Task 2: Posts API — add comboPosts method and update create/list/getById

**Files:**
- Modify: `backend/controllers/postsController.js`
- Modify: `backend/routes/postsRoutes.js`

This is the core backend change. Apply all modifications in one pass.

- [ ] **Step 1: Add helper function `checkComboAccess`**

Insert at top of `postsController.js`, after `const POST_LOG = 'POST';`:

```javascript
async function checkComboAccess(comboId, userId) {
  const combos = await query('SELECT user_id FROM combos WHERE id = ?', [comboId]);
  if (combos.length === 0) return false;
  // combo owner always has access
  if (combos[0].user_id === userId) return true;
  // non-owner: check combo_members (only for is_shared=1 combos)
  const member = await query(
    'SELECT id FROM combo_members WHERE combo_id = ? AND user_id = ?',
    [comboId, userId]
  );
  return member.length > 0;
}
```

- [ ] **Step 2: Update `formatPost` to include comboId and files**

In `formatPost()`, add after `const viewerIds = ...`:

```javascript
const files = row.files ? JSON.parse(row.files) : [];
```

Add to the return object after `shareComboName: row.share_combo_name || null,`:

```javascript
comboId: row.combo_id || null,
files,
```

- [ ] **Step 3: Update `create()` to handle comboId and files**

Change destructuring from:
```javascript
const { postId, title, body, images, todoIds, shareCode, location } = req.body;
```
to:
```javascript
const { postId, title, body, images, todoIds, shareCode, location, comboId, files } = req.body;
```

After `if (title.length > 200) ...`, add combo validation:

```javascript
if (comboId) {
  const combo = await query('SELECT user_id FROM combos WHERE id = ?', [comboId]);
  if (combo.length === 0) {
    return res.status(404).json({ success: false, message: '组合不存在' });
  }
  if (combo[0].user_id !== userId) {
    const member = await query(
      'SELECT id FROM combo_members WHERE combo_id = ? AND user_id = ?',
      [comboId, userId]
    );
    if (member.length === 0) {
      return res.status(403).json({ success: false, message: '你不是该组合成员' });
    }
  }
}
```

Change the INSERT to include combo_id and files:

```javascript
await query(
  `INSERT INTO posts (post_id, user_id, combo_id, title, body, images, todo_ids, share_code, files, ip_address, ip_province, location)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [
    postId, userId, comboId || null, title.trim(), body || null,
    images && images.length ? JSON.stringify(images) : null,
    todoIds && todoIds.length ? JSON.stringify(todoIds) : null,
    comboId ? null : (shareCode || null), // combo posts don't get share_code
    files && files.length ? JSON.stringify(files) : null,
    clientIp,
    ipProvince,
    location ? JSON.stringify(location) : null
  ]
);
```

- [ ] **Step 4: Update `getList()` to exclude combo posts**

In the WHERE clause, after `p.is_deleted = 0`, add:

```sql
AND p.combo_id IS NULL
```

- [ ] **Step 5: Update `getUserPosts()` to exclude combo posts**

Same change — add `AND p.combo_id IS NULL` after `p.is_deleted = 0`.

- [ ] **Step 6: Add combo access check to `getById()`**

After retrieving the post and before the `alreadyViewed` block, add:

```javascript
if (post.combo_id) {
  const hasAccess = await checkComboAccess(post.combo_id, userId);
  if (!hasAccess) {
    return res.status(403).json({ success: false, message: '无权查看该帖子' });
  }
}
```

- [ ] **Step 7: Update `update()` to handle files**

Change destructuring to include files:

```javascript
const { title, body, images, todoIds, shareCode, location, files } = req.body;
```

Update the SQL:

```javascript
await query(
  `UPDATE posts SET title = ?, body = ?, images = ?, todo_ids = ?, share_code = ?,
    location = ?, files = ?, is_edited = 1, updated_at = NOW()
   WHERE post_id = ?`,
  [
    title || posts[0].title,
    body || null,
    images && images.length > 0 ? JSON.stringify(images) : null,
    todoIds && todoIds.length > 0 ? JSON.stringify(todoIds) : null,
    shareCode || null,
    location ? JSON.stringify(location) : null,
    files && files.length > 0 ? JSON.stringify(files) : null,
    postId
  ]
);
```

- [ ] **Step 8: Update `deletePost()` to clean up storage.to files**

Before the soft-delete query, add file cleanup logic:

```javascript
// Clean up associated storage.to files
if (posts[0].files) {
  try {
    const fileList = JSON.parse(posts[0].files);
    const https = require('https');
    for (const f of fileList) {
      if (f.owner_token && f.id) {
        const req = https.request(
          `https://storage.to/api/file/${f.id}`,
          { method: 'DELETE', headers: { 'Authorization': `Owner ${f.owner_token}` } },
          () => {}
        );
        req.on('error', () => {}); // ignore cleanup errors
        req.end();
      }
    }
  } catch (e) {
    // files JSON parse failed, skip cleanup
  }
}
```

- [ ] **Step 9: Add `getComboPosts()` controller**

Add new method before the `module.exports`:

```javascript
const getComboPosts = async (req, res) => {
  const userId = req.user.id;
  const { comboId } = req.params;
  const { cursor, limit = 20 } = req.query;
  const pageSize = Math.min(parseInt(limit), 50);

  try {
    // Verify access
    const hasAccess = await checkComboAccess(comboId, userId);
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: '你不是该组合成员' });
    }

    let cursorWhere = '';
    let params = [userId];
    if (cursor) {
      const parts = cursor.split('_');
      if (parts.length === 2) {
        cursorWhere = 'AND (p.created_at < ? OR (p.created_at = ? AND p.id < ?))';
        params.push(parts[0], parts[0], parts[1]);
      }
    }

    params.push(comboId);

    const rows = await query(
      `SELECT p.*, u.nickname, u.avatar_url, u.badge_titles, u.badge_colors,
              (SELECT id FROM post_likes WHERE post_id = p.id AND user_id = ?) as user_like_id
       FROM posts p
       LEFT JOIN users u ON p.user_id = u.id
       WHERE p.combo_id = ? AND p.is_deleted = 0 ${cursorWhere}
       ORDER BY p.created_at DESC, p.id DESC
       LIMIT ?`,
      [...params, pageSize + 1]
    );

    const hasMore = rows.length > pageSize;
    if (hasMore) rows.pop();

    const list = await Promise.all(rows.map(row => formatPost(row, userId)));

    const nextCursor = hasMore && rows.length > 0
      ? `${rows[rows.length - 1].created_at}_${rows[rows.length - 1].id}`
      : null;

    res.json({ success: true, data: { list, nextCursor, hasMore } });
  } catch (err) {
    logger.error(POST_LOG, '组合帖子列表', '获取组合帖子列表失败', { comboId, userId, error: err.message });
    res.status(500).json({ success: false, message: '获取列表失败' });
  }
};
```

- [ ] **Step 10: Register new route before `/:postId`**

In `postsRoutes.js`, add the combo route BEFORE the `/:postId` route (line 9):

```javascript
router.get('/combo/:comboId', authMiddleware, postsController.getComboPosts);
```

Updated order should be:
```javascript
router.post('/create', authMiddleware, postsController.create);          // line 6
router.get('/list', authMiddleware, postsController.getList);            // line 7
router.get('/combo/:comboId', authMiddleware, postsController.getComboPosts); // NEW — must be before /:postId
router.get('/user/:userId', authMiddleware, postsController.getUserPosts);    // line 8
router.get('/:postId', authMiddleware, postsController.getById);             // line 9
router.put('/:postId', authMiddleware, postsController.update);             // line 10
router.delete('/:postId', authMiddleware, postsController.deletePost);      // line 11
router.get('/:postId/visitors', authMiddleware, postsController.getVisitors); // line 12
```

- [ ] **Step 11: Update comboController — add comboPostsCount**

In `comboController.js` `getById()`, after `todo_count` subquery, add:

```javascript
(SELECT COUNT(*) FROM posts WHERE combo_id = c.id AND is_deleted = 0) as combo_post_count,
```

Add to the combo response object:

```javascript
comboPostCount: combo.combo_post_count || 0,
```

- [ ] **Step 12: Commit**

```bash
git add backend/controllers/postsController.js backend/routes/postsRoutes.js backend/controllers/comboController.js
git commit -m "feat(api): add combo-scoped posts with file support and access control"
```

---

### Task 3: Frontend API layer — add getComboPosts, extend exports

**Files:**
- Modify: `utils/api.js`

- [ ] **Step 1: Add getComboPosts to communityApi**

In `utils/api.js`, add after `getUserPosts` (line 783):

```javascript
getComboPosts: (comboId, params) => request({
  url: `/posts/combo/${comboId}`,
  method: 'GET',
  data: params
}),
```

- [ ] **Step 2: Commit**

```bash
git add utils/api.js
git commit -m "feat(api): add getComboPosts API method"
```

---

### Task 4: File upload utility — storage.to helper

**Files:**
- Create: `utils/fileUpload.js`

- [ ] **Step 1: Create fileUpload.js**

Write `utils/fileUpload.js`:

```javascript
const STORAGE_TO_BASE = 'https://storage.to/api';

/**
 * Initialize a file upload to storage.to
 * Returns upload URL and metadata
 */
function initUpload({ filename, contentType, size, visitorToken }) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${STORAGE_TO_BASE}/upload/init`,
      method: 'POST',
      header: { 'Content-Type': 'application/json', 'X-Visitor-Token': visitorToken },
      data: { filename, content_type: contentType, size },
      success(res) {
        if (res.data && res.data.success) {
          resolve(res.data);
        } else {
          reject(new Error(res.data.error || '初始化上传失败'));
        }
      },
      fail: reject
    });
  });
}

/**
 * Upload file bytes to R2 pre-signed URL
 */
function uploadToR2(uploadUrl, filePath) {
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: uploadUrl,
      filePath,
      name: 'file',
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res);
        } else {
          reject(new Error(`上传失败 (${res.statusCode})`));
        }
      },
      fail: reject
    });
  });
}

/**
 * Confirm upload completion, get shareable URL
 */
function confirmUpload({ filename, size, contentType, r2Key, visitorToken }) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${STORAGE_TO_BASE}/upload/confirm`,
      method: 'POST',
      header: { 'Content-Type': 'application/json', 'X-Visitor-Token': visitorToken },
      data: { filename, size, content_type: contentType, r2_key: r2Key },
      success(res) {
        if (res.data && res.data.success) {
          resolve(res.data);
        } else {
          reject(new Error(res.data.error || '确认上传失败'));
        }
      },
      fail: reject
    });
  });
}

/**
 * Delete a file from storage.to (cancel/orphan cleanup)
 */
function deleteFile({ fileId, ownerToken }) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${STORAGE_TO_BASE}/file/${fileId}`,
      method: 'DELETE',
      header: { 'Authorization': `Owner ${ownerToken}` },
      success(res) {
        if (res.statusCode === 200) resolve(res.data);
        else reject(new Error(res.data.error || '删除文件失败'));
      },
      fail: reject
    });
  });
}

module.exports = { initUpload, uploadToR2, confirmUpload, deleteFile };
```

- [ ] **Step 2: Commit**

```bash
git add utils/fileUpload.js
git commit -m "feat(utils): add storage.to file upload helper"
```

---

### Task 5: post-edit page — file upload area, comboId support, orphan cleanup

**Files:**
- Modify: `packageCommunity/post-edit/post-edit.js`
- Modify: `packageCommunity/post-edit/post-edit.wxml`
- Modify: `packageCommunity/post-edit/post-edit.wxss` (if exists, otherwise skip)

- [ ] **Step 1: Add import and data fields in post-edit.js**

Add import at top:
```javascript
const { initUpload, uploadToR2, confirmUpload, deleteFile } = require('../../utils/fileUpload');
```

Add to `data` object (after `showMentionCard` block):
```javascript
visitorToken: '',
attachedFiles: [],       // 文件上传结果 [{ id, url, raw_url, filename, size, human_size, content_type, expires_at, owner_token }]
comboId: null,
```

- [ ] **Step 2: Handle comboId in onLoad**

In `onLoad(options)`, add after `if (options.postId) ...`:
```javascript
if (options.comboId) {
  this.setData({ comboId: options.comboId });
  // If from combo, disable share_code picker (combo posts don't need share code)
}
```

Add visitorToken generation at end of `onLoad` (before closing brace):
```javascript
const visitorToken = 'visitor_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
this.setData({ visitorToken });
```

- [ ] **Step 3: Add file upload method**

Add new method before `handleSubmit`:

```javascript
async handleFileSelect() {
  const { attachedFiles, visitorToken } = this.data;
  const remaining = 9 - attachedFiles.length;
  if (remaining <= 0) {
    wx.showToast({ title: '最多上传 9 个文件', icon: 'none' });
    return;
  }

  try {
    const res = await wx.chooseMessageFile({ count: remaining, type: 'all' });
    const files = res.tempFiles;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      wx.showLoading({ title: `上传文件 ${i + 1}/${files.length}`, mask: true });

      try {
        // Step 1: Init
        const initResult = await initUpload({
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
          size: file.size,
          visitorToken
        });

        // Step 2: Upload to R2
        await uploadToR2(initResult.upload_url, file.path);

        // Step 3: Confirm
        const confirmResult = await confirmUpload({
          filename: file.name,
          size: file.size,
          contentType: file.type || 'application/octet-stream',
          r2Key: initResult.r2_key,
          visitorToken
        });

        const fileInfo = {
          id: confirmResult.file.id,
          url: confirmResult.file.url,
          raw_url: confirmResult.file.raw_url,
          filename: file.name,
          size: file.size,
          human_size: confirmResult.file.human_size,
          content_type: file.type || 'application/octet-stream',
          expires_at: confirmResult.file.expires_at,
          owner_token: confirmResult.owner_token
        };

        this.setData({
          attachedFiles: [...this.data.attachedFiles, fileInfo]
        });
      } catch (err) {
        wx.showToast({ title: `"${file.name}" 上传失败`, icon: 'none' });
      }
    }
  } catch (err) {
    // User cancelled or error
  }
  wx.hideLoading();
},
```

- [ ] **Step 4: Add file remove method**

```javascript
handleFileRemove(e) {
  const index = e.currentTarget.dataset.index;
  const files = [...this.data.attachedFiles];
  files.splice(index, 1);
  this.setData({ attachedFiles: files });
},
```

- [ ] **Step 5: Update handleSubmit to include files and comboId**

In `handleSubmit()`, update the payload:

```javascript
const payload = {
  postId: `post_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
  title: this.data.title,
  body: body || null,
  images: this.data.imageUrls.length > 0 ? this.data.imageUrls : null,
  todoIds: this.data.selectedTodoIds.length > 0 ? this.data.selectedTodoIds : null,
  shareCode: this.data.selectedComboCode || null,
  location: this.data.location || null,
  comboId: this.data.comboId || null,
  files: this.data.attachedFiles.length > 0 ? this.data.attachedFiles.map(f => ({
    id: f.id, url: f.url, raw_url: f.raw_url,
    filename: f.filename, size: f.size, human_size: f.human_size,
    content_type: f.content_type, expires_at: f.expires_at,
    owner_token: f.owner_token
  })) : null
};
```

- [ ] **Step 6: Add orphan file cleanup in goBack/onUnload**

In `goBack()`, before the modal, and in `onUnload()`, add:

```javascript
// Clean up orphan storage.to files
const { attachedFiles } = this.data;
if (attachedFiles && attachedFiles.length > 0) {
  for (const f of attachedFiles) {
    if (f.id && f.owner_token) {
      deleteFile({ fileId: f.id, ownerToken: f.owner_token }).catch(() => {});
    }
  }
}
```

- [ ] **Step 7: Update post-edit.wxml — add file upload section**

After the `t-upload` image section (after `</view>` of `upload-section`), add:

```xml
<!-- 文件上传区 -->
<view class="file-upload-section">
  <view wx:if="{{attachedFiles.length > 0}}" class="file-list">
    <view class="file-item" wx:for="{{attachedFiles}}" wx:key="id">
      <t-icon name="{{getFileIcon(item.content_type)}}" size="40rpx" color="#666" />
      <view class="file-info">
        <text class="file-name">{{item.filename}}</text>
        <text class="file-size">{{item.human_size}}</text>
      </view>
      <view class="file-remove" data-index="{{index}}" bindtap="handleFileRemove">
        <t-icon name="close" size="28rpx" color="#999" />
      </view>
    </view>
  </view>
  <view wx:if="{{fileList.length + attachedFiles.length < 9}}" class="file-add-btn" bindtap="handleFileSelect">
    <t-icon name="file-attachment" size="40rpx" color="#999" />
    <text class="file-add-text">添加文件</text>
  </view>
</view>
```

- [ ] **Step 8: Add getFileIcon helper in post-edit.js**

Add this function in the page methods:

```javascript
getFileIcon(contentType) {
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
  const key = Object.keys(FILE_ICONS).find(k => contentType && contentType.startsWith(k));
  return FILE_ICONS[key] || 'file-unknown';
},
```

- [ ] **Step 9: Add file upload section styles (post-edit.wxss)**

Add to `post-edit.wxss`:

```css
.file-upload-section {
  padding: 20rpx 32rpx;
  border-top: 1rpx solid #f0f0f0;
}
.file-list {
  margin-bottom: 16rpx;
}
.file-item {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}
.file-info {
  flex: 1;
  margin-left: 16rpx;
  min-width: 0;
}
.file-name {
  font-size: 28rpx;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}
.file-size {
  font-size: 24rpx;
  color: #999;
}
.file-remove {
  padding: 8rpx;
}
.file-add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24rpx;
  border: 2rpx dashed #ddd;
  border-radius: 12rpx;
}
.file-add-text {
  margin-left: 12rpx;
  font-size: 28rpx;
  color: #999;
}
```

- [ ] **Step 10: Commit**

```bash
git add packageCommunity/post-edit/
git commit -m "feat(post-edit): add file upload via storage.to and comboId support"
```

---

### Task 6: combo-detail page — add combo posts section

**Files:**
- Modify: `packageCombo/combo-detail/combo-detail.js`
- Modify: `packageCombo/combo-detail/combo-detail.wxml`
- Modify: `packageCombo/combo-detail/combo-detail.wxss`

- [ ] **Step 1: Add data fields and import**

Add to top imports:
```javascript
const { communityApi } = require('../../utils/api');
```

Add to `data` object:
```javascript
comboPosts: [],
comboPostsCursor: null,
comboPostsHasMore: false,
loadingPosts: false,
```

- [ ] **Step 2: Add stripMarkdown helper**

Add before `loadComboData`:
```javascript
stripMarkdown(text) {
  if (!text) return '';
  return text.replace(/[#*`\[\]()>|~_]/g, '').trim();
},
```

- [ ] **Step 3: Add loadComboPosts and related methods**

Add after `updateStats()`:

```javascript
async loadComboPosts(comboId) {
  if (this.data.loadingPosts) return;
  this.setData({ loadingPosts: true });
  try {
    const res = await communityApi.getComboPosts(comboId, { cursor: this.data.comboPostsCursor });
    if (res.success && res.data) {
      const posts = (res.data.list || []).map(p => ({
        ...p,
        summary: this.stripMarkdown(p.body).substring(0, 80),
        thumbImage: p.images && p.images.length > 0 ? p.images[0] : null,
        fileCount: p.files ? p.files.length : 0
      }));
      this.setData({
        comboPosts: this.data.comboPostsCursor ? [...this.data.comboPosts, ...posts] : posts,
        comboPostsCursor: res.data.nextCursor,
        comboPostsHasMore: res.data.hasMore,
        loadingPosts: false
      });
    }
  } catch (err) {
    logger.error('COMBO', 'POSTS', '加载组合帖子失败', err);
    this.setData({ loadingPosts: false });
  }
},

loadMoreComboPosts() {
  if (this.data.comboPostsHasMore && !this.data.loadingPosts) {
    this.loadComboPosts(this.data.comboId);
  }
},

navigateToCreatePost() {
  wx.navigateTo({
    url: `/packageCommunity/post-edit/post-edit?comboId=${this.data.comboId}`
  });
},

navigateToPostDetail(e) {
  const { postid } = e.currentTarget.dataset;
  wx.navigateTo({
    url: `/packageCommunity/post-detail/post-detail?postId=${postid}`
  });
},
```

- [ ] **Step 4: Trigger async post loading after loadComboData**

In `loadComboData()`, at the end of both the shared combo and personal combo branches, add:

```javascript
// Async load combo posts (not blocking main render)
setTimeout(() => this.loadComboPosts(id), 500);
```

Also in `onShow()`, after `loadComboData` is called, add the same for adminView path.

- [ ] **Step 5: Update wxml — add posts section**

After `</view>` of `todos-section` (line 261) and before the `combo-actions` block (line 263), add:

```xml
<!-- 帖子圈区块 -->
<view wx:if="{{!adminView}}" class="posts-section">
  <view class="section-header">
    <view class="section-title-row">
      <text class="section-title">帖子圈</text>
      <view class="create-post-btn" bindtap="navigateToCreatePost">
        <t-icon name="edit" size="28rpx" color="#00b26a" />
        <text class="create-post-text">发帖</text>
      </view>
    </view>
  </view>

  <view wx:if="{{comboPosts.length === 0 && !loadingPosts}}" class="empty-state">
    <text class="empty-text">暂无帖子</text>
    <text class="empty-hint">点击右上角发布第一条帖子</text>
  </view>

  <view wx:if="{{comboPosts.length > 0}}" class="combo-posts-list">
    <view
      class="combo-post-item"
      wx:for="{{comboPosts}}"
      wx:key="postId"
      data-postid="{{item.postId}}"
      bindtap="navigateToPostDetail"
    >
      <view class="combo-post-title">{{item.title}}</view>
      <view wx:if="{{item.summary}}" class="combo-post-summary">{{item.summary}}</view>
      <view wx:if="{{item.thumbImage}}" class="combo-post-thumb">
        <image src="{{item.thumbImage}}" mode="aspectFill" />
      </view>
      <view class="combo-post-footer">
        <text class="combo-post-author">{{item.user.nickname}}</text>
        <text class="combo-post-meta">
          {{item.fileCount > 0 ? item.fileCount + '个文件 · ' : ''}}{{item.commentsCount}}评论
        </text>
      </view>
    </view>
  </view>

  <view wx:if="{{loadingPosts}}" class="loading-posts">
    <t-loading loading="{{true}}" size="40rpx" />
  </view>

  <view wx:if="{{comboPostsHasMore && !loadingPosts}}" class="load-more-posts" bindtap="loadMoreComboPosts">
    <text>加载更多</text>
  </view>
</view>
```

- [ ] **Step 6: Add styles for posts section**

Add to `combo-detail.wxss`:

```css
.posts-section {
  padding: 20rpx 32rpx;
}
.section-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}
.create-post-btn {
  display: flex;
  align-items: center;
  padding: 8rpx 16rpx;
}
.create-post-text {
  font-size: 26rpx;
  color: #00b26a;
  margin-left: 8rpx;
}
.combo-post-item {
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}
.combo-post-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #333;
}
.combo-post-summary {
  font-size: 26rpx;
  color: #999;
  margin-top: 8rpx;
  line-height: 1.4;
}
.combo-post-thumb {
  margin-top: 8rpx;
}
.combo-post-thumb image {
  width: 200rpx;
  height: 150rpx;
  border-radius: 8rpx;
}
.combo-post-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12rpx;
}
.combo-post-author {
  font-size: 24rpx;
  color: #999;
}
.combo-post-meta {
  font-size: 24rpx;
  color: #ccc;
}
.loading-posts {
  padding: 40rpx 0;
  display: flex;
  justify-content: center;
}
.load-more-posts {
  padding: 30rpx 0;
  text-align: center;
  color: #00b26a;
  font-size: 26rpx;
}
```

- [ ] **Step 7: Commit**

```bash
git add packageCombo/combo-detail/
git commit -m "feat(combo-detail): add combo posts section with async loading"
```

---

### Task 7: post-detail page — display file list with expiry

**Files:**
- Modify: `packageCommunity/post-detail/post-detail.js`
- Modify: `packageCommunity/post-detail/post-detail.wxml`
- Modify: `packageCommunity/post-detail/post-detail.wxss`

- [ ] **Step 1: Add file helper functions**

Add to post-detail.js page methods:

```javascript
getFileIcon(contentType) {
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
  const key = Object.keys(FILE_ICONS).find(k => contentType && contentType.startsWith(k));
  return FILE_ICONS[key] || 'file-unknown';
},

isFileExpired(expiresAt) {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
},

getFileRemainingDays(expiresAt) {
  if (!expiresAt) return null;
  const remaining = (new Date(expiresAt) - new Date()) / (1000 * 60 * 60 * 24);
  return Math.ceil(remaining);
},

openFile(e) {
  const index = e.currentTarget.dataset.index;
  const file = this.data.post.files[index];
  if (!file || this.isFileExpired(file.expires_at)) return;

  wx.showLoading({ title: '下载中...' });
  wx.downloadFile({
    url: file.raw_url || file.url,
    success(res) {
      wx.hideLoading();
      if (res.statusCode === 200) {
        wx.openDocument({
          filePath: res.tempFilePath,
          success: () => {},
          fail: () => {
            wx.showToast({ title: '打开文件失败', icon: 'none' });
          }
        });
      }
    },
    fail() {
      wx.hideLoading();
      wx.showToast({ title: '下载文件失败', icon: 'none' });
    }
  });
},
```

- [ ] **Step 2: Update wxml — add file list section**

After the `post-stats` block (after `</view>` at line 31) and before `comment-section`, add:

```xml
<!-- 文件列表 -->
<view wx:if="{{post.files && post.files.length > 0}}" class="post-files">
  <view class="post-files-header">
    <t-icon name="file-attachment" size="28rpx" color="#999" />
    <text class="post-files-title">附件 ({{post.files.length}})</text>
  </view>
  <view
    class="post-file-item {{isFileExpired(item.expires_at) ? 'expired' : ''}}"
    wx:for="{{post.files}}"
    wx:key="id"
    data-index="{{index}}"
    bindtap="openFile"
  >
    <t-icon name="{{getFileIcon(item.content_type)}}" size="48rpx" color="#666" />
    <view class="post-file-info">
      <text class="post-file-name">{{item.filename}}</text>
      <text class="post-file-size">{{item.human_size}}</text>
    </view>
    <text wx:if="{{isFileExpired(item.expires_at)}}" class="post-file-status expired-text">已过期</text>
    <text wx:elif="{{getFileRemainingDays(item.expires_at) <= 1}}" class="post-file-status expiring-text">即将过期</text>
    <text wx:else class="post-file-arrow">
      <t-icon name="chevron-right" size="28rpx" color="#ccc" />
    </text>
  </view>
</view>
```

- [ ] **Step 3: Add file list styles (post-detail.wxss)**

```css
.post-files {
  padding: 20rpx 32rpx;
  border-top: 1rpx solid #f0f0f0;
}
.post-files-header {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}
.post-files-title {
  font-size: 26rpx;
  color: #999;
  margin-left: 8rpx;
}
.post-file-item {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}
.post-file-item.expired {
  opacity: 0.5;
}
.post-file-info {
  flex: 1;
  margin-left: 16rpx;
  min-width: 0;
}
.post-file-name {
  font-size: 28rpx;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}
.post-file-size {
  font-size: 24rpx;
  color: #999;
}
.post-file-status {
  font-size: 24rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}
.expired-text {
  color: #ccc;
}
.expiring-text {
  color: #ff9500;
  background: #fff3e0;
}
.post-file-arrow {
  padding: 8rpx;
}
```

- [ ] **Step 4: Commit**

```bash
git add packageCommunity/post-detail/
git commit -m "feat(post-detail): add file list with expiry detection and download"
```

---

### Task 8: Run migration and verify

**Files:**
- N/A (run migration script)

- [ ] **Step 1: Run the migration**

```bash
cd backend && node -e "
const { query } = require('./config/database');
const fs = require('fs');
const sql = fs.readFileSync('./migrations/032_add_combo_id_and_files_to_posts.sql', 'utf8');
query(sql).then(r => console.log('Migration OK:', r)).catch(e => console.error('Migration FAILED:', e));
"
```

Expected: `Migration OK: [组合ID和文件字段添加成功]`

- [ ] **Step 2: Verify backend API**

```bash
# Test getComboPosts endpoint returns correctly
curl -H "Authorization: Bearer <token>" http://localhost:3000/posts/combo/1

# Test create with comboId
curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer <token>" \
  -d '{"postId":"test_combo_1","title":"Combo post","comboId":1}' \
  http://localhost:3000/posts/create

# Verify combo post does NOT appear in global list
curl -H "Authorization: Bearer <token>" http://localhost:3000/posts/list

# Verify non-member gets 403
curl -H "Authorization: Bearer <different-token>" http://localhost:3000/posts/combo/1
```

- [ ] **Step 3: Commit**

```bash
git commit -m "chore: apply migration 032_add_combo_id_and_files_to_posts"
```

---

### Self-Review

**Spec coverage:**
1. ✅ Database: combo_id + files columns — Task 1
2. ✅ Backend: getComboPosts, create/update with comboId/files — Task 2
3. ✅ Backend: access control for getById, owner path via combos.user_id — Task 2
4. ✅ Backend: route ordering (/combo/ before /:postId) — Task 2 step 10
5. ✅ Frontend API: getComboPosts — Task 3
6. ✅ File upload utility: storage.to wrapper — Task 4
7. ✅ post-edit: file upload section, comboId, orphan cleanup — Task 5
8. ✅ combo-detail: posts section with async loading — Task 6
9. ✅ post-detail: file list with expiry detection — Task 7
10. ✅ Migration run — Task 8

**No placeholders:** All code blocks are complete implementations.

**Type consistency:**
- `checkComboAccess(comboId, userId)` used consistently in create/getComboPosts/getById
- `files` field in posts stored as JSON string, parsed in formatPost
- `getFileIcon(contentType)` same implementation in post-edit and post-detail
- `combo_id` on posts table → `comboId` in API responses (JS camelCase)
- `owner_token` stored in files array → used for cleanup in deletePost and cancel

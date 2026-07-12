# 管理后台 & adminView 重构会话总结

> **会话日期:** 2026-07-02
> **涉及 commit:** `da08035`, `75b5b01`, `e7a4008`
> **修改文件数:** 16 (+216/-25 行)
> **用途:** 交付其他 Agent 接续工作

---

## 一、后端改动 (4 个文件)

### 1. `backend/controllers/comboController.js`

**P0 — specific 分配待办管理员绕过**

- 新增 `getAdminIds` 引用（第 2 行）
- `getById` 中增加管理员检测 `isAdminUser`（第 85-88 行）
- specific 过滤条件增加 `&& !isAdminUser`，管理员不受分配限制（第 153 行）
- 使用 `parseInt(userId, 10)` 以与 auth.js 的 `isAdmin` 中间件保持一致

### 2. `backend/controllers/adminController.js`

**OpenID 最小化**（1 处）

- `getStatDetail('todayNewUsers')` SQL 移除 `openid` 列（统计弹窗不需要）

**日志变量名修正**（7 处）

| 方法 | 原变量名 | 修正 |
|------|---------|------|
| `getUserDetail` catch | `{ userId, ...}` | `{ id, ...}` |
| `updateUserLimits` catch | `{ userId, ...}` | `{ id, ...}` |
| `updateUserNickname` catch | `{ userId, ...}` | `{ id, ...}` |
| `updateNotice` catch | `{ id, ...}` | `{ index, ...}` |
| `deleteNotice` catch | `{ id, ...}` | `{ index, ...}` |
| `updateChangelog` catch | `{ id, ...}` | `{ index, ...}` |
| `deleteChangelog` catch | `{ id, ...}` | `{ index, ...}` |
| `deleteComment` catch | `{ commentId, ...}` | `{ id, ...}` |

### 3. `backend/controllers/postsController.js`

**组合名称数据拉取**

- `getList` SQL 增加 `c.name as share_combo_name`（第 122 行）
- `getById` SQL 增加 `c.name as share_combo_name`（第 155 行）
- `LEFT JOIN combos c` 本来就存在，之前未选 `c.name` 导致前端 `shareComboName` 一直为 null

---

## 二、packageAdmin 前端 (7 个文件)

### 4. `packageAdmin/user-detail/user-detail.js`

- `loadUserDetail` catch 增加 `wx.showToast({ title: '加载用户详情失败', icon: 'none' })`
- 新增 `copyShareCode(e)` 方法（复制组合邀请码到剪贴板）

### 5. `packageAdmin/user-detail/user-detail.wxml`

**待办列表区补齐**：
- priority 色彩圆点（p1=红, p2=橙, p3=绿, p4=灰）
- set_time 截止时间
- tags 标签列表徽章
- is_star 收藏星标标记
- images 图片数量指示器

**组合列表区补齐**：
- description 组合描述
- member_limit 成员上限
- created_at 创建时间
- share_code 邀请码（可复制）

**被分配待办区补齐**：
- priority 色彩圆点
- set_time 截止时间
- completed_at 完成时间
- assign_type/exclude_type 标签

### 6. `packageAdmin/user-detail/user-detail.wxss`

新增 16 个样式类，约 98 行：
- `.item-title-row` — 标题行弹性容器
- `.priority-mini-dot` / `.priority-p1` ~ `.priority-p4` — 优先级圆点
- `.mini-tags` / `.mini-tag` / `.mini-tag.assign-tag` / `.mini-tag.exclude-tag` — 标签
- `.img-indicator` — 图片指示器
- `.item-desc` — 描述文字
- `.item-sub-row` / `.share-code` — 次级信息行
- `.completed-at` — 完成时间
- `.item-meta-row` — 元信息行

### 7. `packageAdmin/users/users.js`

- `loadUsers` catch 增加 `wx.showToast`

### 8. `packageAdmin/index/index.js`

- `loadStats` catch 增加 `wx.showToast`
- `loadAnalysisStats` catch 增加 `wx.showToast`
- `deleteComment` 中 `key.includes('today')` 改为 `key.startsWith('today')`（防止子串误匹配）

### 9. `packageAdmin/index/index.wxml`

- 时柱图 height 表达式增加 `stats.peakHours[0]` 空值保护，防止 WXML 渲染崩溃

### 10. `packageAdmin/reports/reports.js`

- `console.error` 改为 `logger.error('ADMIN', 'REPORTS', ...)`
- 增加 `wx.showToast`

---

## 三、adminView 跨包 (4 个文件)

### 11. `packageCombo/combo-detail/combo-detail.js`

**adminView 参数持久化**
- `onLoad`: 将 `adminView` 参数 `wx.setStorageSync('_adminView_combo_' + id, {adminView, userId, timestamp})`
- `onShow`: 检查 storage 缓存（5 分钟内有效），恢复 adminView 模式
- `onUnload`: 清理 `_adminView_combo_${comboId}` storage 键

### 12. `packageCombo/collaboration/collaboration.js`

- `loadDataForAdmin` 中 `userRole: 'owner'` 改为 `userRole: 'admin'`，与 combo-detail 保持一致

### 13. `packageCombo/collaboration/collaboration.wxml`

- "解散协作组"按钮增加 `wx:if="{{!adminView}}"`，防止管理员误解散他人组合

### 14. `packagePages/todo-detail/todo-detail.js`

- `_loadAdminViewWithApi` 增加 `todoTags: this.getTagsByIds(todo.tags || [])`（之前未设置导致标签不显示）
- `_loadAdminViewWithApi` catch 增加 `wx.showToast`

---

## 四、社区前端 (2 个文件)

### 15. `pages/community-home/community-home.wxml`

- 组合标签文案 `{{item.shareComboName || '加入组合'}}` 改为：
  - 有组合名 → `分享了组合：{{item.shareComboName}}`
  - 无组合名 → `加入组合`

### 16. `packageCommunity/post-detail/post-detail.wxml`

- 同上改动

---

## 五、Pending 工作（未在当前会话中修复）

| 优先级 | 项 | 说明 | 预计工作量 |
|:------:|----|------|:---------:|
| P2 | notices/changelog 索引迁移 | 改为唯一 ID 定位（后端+前端） | 2d |
| P2 | `Promise.allSettled` | 12 路分析数据隔离，避免一损俱损 | 0.5d |
| P3 | reports 返回后列表刷新 | `onShow` 条件刷新 | 0.5d |
| P3 | combo-detail onShow/onLoad 双重请求 | 加 `_adminViewLoaded` 标记 | 0.5d |

---

## 六、涉及完整文件清单

```
backend/controllers/adminController.js       | 18 +++++------
backend/controllers/comboController.js       | 10 ++++++--
backend/controllers/postsController.js        |  2 ++
packageAdmin/index/index.js                   |  4 +++-
packageAdmin/index/index.wxml                 |  2 +-
packageAdmin/reports/reports.js               |  3 ++-
packageAdmin/user-detail/user-detail.js       | 13 +++++++++
packageAdmin/user-detail/user-detail.wxml     | 59 ++++++++++++++++++++++++----
packageAdmin/user-detail/user-detail.wxss     | 98 +++++++++++++++++++++++++++++++++++++
packageAdmin/users/users.js                   |  1 +
packageCombo/collaboration/collaboration.js   |  2 +-
packageCombo/collaboration/collaboration.wxml |  2 +-
packageCombo/combo-detail/combo-detail.js     | 19 ++++++++++++
packageCommunity/post-detail/post-detail.wxml |  3 ++-
packagePages/todo-detail/todo-detail.js       |  2 ++
pages/community-home/community-home.wxml      |  3 ++-
```

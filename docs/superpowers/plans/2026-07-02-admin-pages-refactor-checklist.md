# packageAdmin 页面与 adminView 模式改造清单

> **编制日期:** 2026-07-02
> **范围:** packageAdmin 所有 9 个页面 + adminView 跨分包兼容性
> **方法:** 3 路并行 subagent 分析（packageAdmin页面/后端API/adminView模式）

---

## 一、现状纵览

### 全项目 adminView 适配矩阵

| 页面 | 所属分包 | 是否适配 adminView | 说明 |
|------|----------|:---:|------|
| todo-detail | packagePages | ✅ | 支持最完善的 adminView（3 个子路径） |
| combo-detail | packageCombo | ✅ | 强制 `userRole=admin` 绕过成员检查 |
| collaboration | packageCombo | ✅ | 只读查看成员列表 |
| index | packageAdmin | ⚠️ | 作为入口跳转传参，自身不走 adminView |
| user-detail | packageAdmin | ⚠️ | 作为入口跳转传参 |
| users | packageAdmin | ❌ | 无 adminView |
| notices | packageAdmin | ❌ | 无 adminView |
| notice-edit | packageAdmin | ❌ | 无 adminView |
| changelog | packageAdmin | ❌ | 无 adminView |
| changelog-edit | packageAdmin | ❌ | 无 adminView |
| reports | packageAdmin | ❌ | 无 adminView |
| report-detail | packageAdmin | ❌ | 无 adminView |

### 核心问题分类

| 类别 | 数量 | 严重程度 |
|------|:---:|:--------:|
| 🚨 安全/数据完整性问题 | 2 | 高 |
| 🐛 功能性 Bug | 4 | 中高 |
| 🎨 前台状态管理缺失 | 7 | 中 |
| 🧱 架构/耦合问题 | 3 | 中低 |
| ✨ 体验细节 | 5 | 低 |

---

## 二、🚨 安全问题

### S1. `POST /todos/batch` 无 user_id 过滤

- **文件:** `backend/controllers/todoController.js:908-931`
- **问题:** 该端点不按 `user_id` 过滤，任何已认证用户可通过 id 批量查询任意用户的待办。`detail=true` 时还会暴露 `remarks`、`location`、`images` 等敏感字段。
- **影响:** 低（当前仅用于社区预览，社区帖子本身就是公开的），但架构上不干净。
- **建议:** 加 `is_admin` 跳过过滤能力，非管理员只能查自己的待办。社区预览需要另走专门路由。

### S2. adminView 下 combo-detail specific 分配待办被过滤

- **文件:** `backend/controllers/comboController.js:146-152`
- **问题:** 管理员查看共享组合时，后端 `getById` 用管理员自己的 `user_id` 检查 `assign_type === 'specific'` 分配，导致未被分配给管理员的待办被过滤掉。但管理员应该看到目标用户的全部待办。
- **建议:** 在 `getById` 中增加 `isAdmin` 检测，管理员可绕过 specific 分配过滤。

---

## 三、🐛 功能性 Bug

### B1. combo-detail adminView 刷新后"不是成员"提示

- **文件:** `packageCombo/combo-detail/combo-detail.js:1091-1199`
- **复现路径:** 从管理后台 → combo-detail（adminView）→ 刷新页面
- **根因:** 刷新后页面参数丢失，URL 中没有 `adminView=1`，走常规 `loadComboData()` 路径，检测 `userRole` 为 null 后弹出"不是成员"并返回。
- **修复:** 页面 `onLoad` 解析参数时应通过 `getCurrentPages().pop().options` 或 wx 的 `onLoad` 参数保留。或检测到 `userRole` 为 null 时加 toast 说明非成员，但保留查看权限。

### B2. todo-detail `_loadAdminViewWithApi` 静默失败

- **文件:** `packagePages/todo-detail/todo-detail.js:452-513`
- **问题:** API 调用失败或返回 `!res.success` 时只有 `logger.error`，无用户可见反馈。页面停留在空白/旧数据。
- **修复:** 增加 `wx.showToast` + 返回上一页的降级处理。

### B3. adminView 下 `onShow` 不刷新数据

- **文件:** `packagePages/todo-detail/todo-detail.js:1185-1234`
- **问题:** adminView 模式的 `onShow` 直接 `return`。如果管理员通过其他页面修改了数据后返回，看不到最新状态。
- **修复:** adminView 也应刷新数据，或至少添加一个"刷新"按钮。

### B4. notice-edit Markdown 工具栏是半成品

- **文件:** `packageAdmin/notice-edit/notice-edit.js`
- **问题:** `insertMd` 方法仅通过 `wx.showToast` 展示格式示例文本，并未真正插入到 `textarea`。
- **修复:** 实现真正的光标位置插入逻辑。

---

## 四、🎨 前端状态管理缺失

### S1. 统一缺失错误提示（6/9 页面）

受损页面：`index`（基础数据）、`users`、`user-detail`、`reports`、`changelog-edit`（保存失败有但加载无）

| 页面 | API 失败提示 | 建议修复方式 |
|------|:----------:|------------|
| index/index | ❌ (仅 logger) | 加 `wx.showToast` + 占位数据降级 |
| users/users | ❌ (仅 logger) | 加 `wx.showToast` |
| user-detail/user-detail | ❌ (仅 logger) | 加 `wx.showToast` |
| reports/reports | ❌ (仅 console.error) | 改用 `logger` + 加 `wx.showToast` |

### S2. Loading 状态缺失/不完整（4/9 页面）

| 页面 | 问题 | WXML 表现 |
|------|------|----------|
| index/index | `analysisLoading` 定义了但 WXML 未使用 | 分析区块无加载动画 |
| notices/notices | `loading` 有值但 WXML 无独立 loading 动效 | 空转一下直接显示列表或无数据 |
| changelog/changelog | 同上 | 同上 |
| user-detail/user-detail | 完全无 loading | 网络慢时看到空白页 |
| report-detail/report-detail | `data.processing` 定义了但 WXML 按钮未绑 `loading` | 按钮无禁用/加载态 |

### S3. adminView 页面 loading + 降级统一策略

- 所有 adminView 加载路径（`_loadAdminViewWithApi`、`loadComboDataForAdmin`、`loadDataForAdmin`）应统一：
  1. 加载中 → 显示 loading
  2. 加载成功 → 渲染数据
  3. 加载失败/404 → toast + 返回（或显示错误占位）
  4. 数据为空 → 显示空状态

---

## 五、🧱 架构/耦合问题

### A1. notices/changelog 使用索引定位

- **文件:** `packageAdmin/notices/`, `packageAdmin/changelog/`
- **风险:** 使用 `?index=N`（数组索引）定位编辑/删除目标。若后端数据顺序在操作间隔发生变化（如其他人先删了一条），会导致操作错误的对象。
- **建议:** 后端为每条 notice/changelog 增加唯一 `id` 字段，前端改用 id 定位。

### A2. `logger` 是隐式全局依赖

- **涉及:** 多个页面
- **问题:** 页面使用了 `logger.debug` / `logger.error` 但无 `require`/`import` 语句。
- **建议:** 从 `utils/api.js` 或独立模块导出 `logger`，各页面显式引入。

### A3. `API_BASE_URL` 重复定义

- **涉及:** `packageAdmin/index/index.js:5`、`users/users.js:3`、`user-detail/user-detail.js:3`
- **问题:** 三处各自硬编码 `https://api.yzjtiantian.cn`，与 `utils/api.js` 中的定义重复。
- **建议:** 统一从 `utils/api.js` 导入（`require('../../utils/api').API_BASE_URL`）。

---

## 六、✨ 体验与细节

### D1. index 删除评论后 stats 递减不完整

- **文件:** `packageAdmin/index/index.js:438-441`
- **问题:** 仅对 `key.includes('today')` 和 `commentCount` 做递减，`mainCommentCount`、`replyCount`、`todayNewMainComments`、`todayNewReplies` 未同步递减。
- **建议:** 根据被删评论是否有 `parentId` 来判断递减哪个字段。

### D2. collaboration adminView 无任何管理操作

- **文件:** `packageCombo/collaboration/collaboration.js:140-163`
- **问题:** adminView 下完全是只读页，移除成员和设管理按钮全部隐藏。管理员在后台用户详情页也没有直接管理协作组的入口（只能看不能操作）。
- **建议:** 为 adminView 增加"移除成员"和"设置管理"的后端 API 支持，前端在 adminView 下显示相应操作。

### D3. notice-edit 工具栏扩展性

- **文件:** `packageAdmin/notice-edit/notice-edit.js`
- **问题:** `insertMd` 是半成品（已归类为 B4），工具栏按钮点击后只弹 toast 示例。
- **建议:** 实现真正的 textarea 光标插入。

### D4. report-detail processing 状态未绑定 UI

- **文件:** `packageAdmin/report-detail/report-detail.js/wxml`
- **问题:** `data.processing` 存在，但 WXML 中两个 `t-button` 没有绑定 `loading` 或 `disabled` 属性。
- **建议:** 给 `t-button` 绑定 `loading="{{processing}}"` 或 `disabled="{{processing}}"`。

### D5. todo-detail adminView 的 `_loadAdminView` 与 `onShow` 防刷新策略

- 参见 B3。建议改为：保留 adminView 数据缓存，但在 `onShow` 检查数据时效性，超过 5 分钟自动刷新。

---

## 七、排序与建议实施顺序

### 第一阶段 — 高优先级（修复功能性错误）

| 优先级 | 编号 | 项 | 工作量 |
|:------:|:---:|----|:-----:|
| P0 | B1 | combo-detail adminView 刷新"不是成员" | 1d |
| P0 | B2 | todo-detail adminView 静默失败 | 0.5d |
| P0 | S2 | combo specific 分配在 adminView 下被过滤 | 0.5d |
| P1 | B3 | adminView onShow 不刷新 | 0.5d |
| P1 | B4 | notice-edit 工具栏半成品 | 1d |

### 第二阶段 — 中优先级（补齐状态管理）

| 优先级 | 编号 | 项 | 工作量 |
|:------:|:---:|----|:-----:|
| P2 | S1 | 6 页 API 失败提示 | 2d |
| P2 | S2 | 4 页 loading 状态 | 1.5d |
| P2 | S3 | adminView 加载降级统一 | 1d |
| P2 | D1 | stats 递减不完整 | 0.5d |

### 第三阶段 — 低优先级（架构梳理）

| 优先级 | 编号 | 项 | 工作量 |
|:------:|:---:|----|:-----:|
| P3 | A1 | notices/changelog 改用 id | 2d |
| P3 | A2 | logger 显式引入 | 1d |
| P3 | A3 | API_BASE_URL 统一 | 0.5d |
| P3 | D2 | adminView 协作管理操作 | 2d |
| P3 | D4 | processing 按钮绑定 | 0.5d |
| P3 | D5 | 数据时效检测 | 1d |

### 第四阶段 — 低优/长期

| 优先级 | 编号 | 项 | 工作量 |
|:------:|:---:|----|:-----:|
| P4 | S1 | POST /todos/batch 权限加固 | 1d |
| P4 | — | 其他分包 adminView 全覆盖 | 3d+ |

---

## 八、涉及文件汇总

### 后端（6 个文件）

| 文件 | 涉及问题 |
|------|---------|
| `backend/controllers/todoController.js` | S1 |
| `backend/controllers/comboController.js` | S2 |
| `backend/controllers/adminController.js` | - |
| `backend/routes/adminRoutes.js` | - |
| `backend/middleware/auth.js` | - |
| `backend/controllers/postsController.js` | - |

### 前端 packageAdmin（26 个文件，9 个页面）

| 文件 | 涉及问题 |
|------|---------|
| `packageAdmin/index/index.js` + wxml + wxss | S1, D1 |
| `packageAdmin/users/users.js` + wxml + wxss | S1, S2 |
| `packageAdmin/user-detail/user-detail.js` + wxml + wxss | S1, S2, A3 |
| `packageAdmin/notices/notices.js` + wxml + wxss | S2, A1 |
| `packageAdmin/notice-edit/notice-edit.js` + wxml + wxss | B4, D3 |
| `packageAdmin/changelog/changelog.js` + wxml + wxss | S2, A1 |
| `packageAdmin/changelog-edit/changelog-edit.js` + wxml + wxss | S1, A1 |
| `packageAdmin/reports/reports.js` + wxml + wxss | S1 |
| `packageAdmin/report-detail/report-detail.js` + wxml + wxss | D4 |

### 前端其他分包（5 个文件）

| 文件 | 涉及问题 |
|------|---------|
| `packagePages/todo-detail/todo-detail.js` | B2, B3, S3 |
| `packageCombo/combo-detail/combo-detail.js` | B1, S2, S3 |
| `packageCombo/collaboration/collaboration.js` | D2 |
| `utils/api.js` | A3 |
| `utils/sync.js` | - |

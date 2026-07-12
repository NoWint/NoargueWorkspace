# post-edit 待办选择 & 组合选择设计

## 概述

在社区帖子编辑页（post-edit）添加待办选择弹窗和组合选择弹窗，使用户发帖时可关联已有待办或邀请加入共享组合。

- 待办：多选，选择后将 todo 列表关联到帖子
- 组合：单选，将共享组合的 invite code 附加到帖子
- 待办选择和组合选择"暂时不开发"的状态已解除，本次完整实现

---

## 1. 底部工具栏

### 位置与布局

- 固定在页面底部，`position: fixed; bottom: 0`
- 高度 100rpx，背景白色，顶部 1px `#f0f0f0` 分割线
- 内容水平居中分布，两个按钮各占约 50%

### 按钮样式

```
┌──────────────────────────────────────────┐
│  ┌──────────────┐    ┌──────────────┐    │
│  │  📋 待办      │    │  📁 邀请组合  │    │
│  └──────────────┘    └──────────────┘    │
└──────────────────────────────────────────┘
```

- 每个按钮：flex row，图标 + 文字，居中
- 字体 28rpx，颜色 `#666`
- 选中后：
  - 待办：文字更新为 `待办 (n)`，颜色 `#00b26a`
  - 组合：文字更新为组合名称（截断到 6 字），颜色 `#00b26a`

---

## 2. 已选摘要展示

位置在图片上传区下方、位置选择区上方。存在选中项时显示：

```
[📋 关联 2 个待办]                 [✕]
[📁 邀请加入"学习计划"]          [✕]
```

- 每个摘要项：flex row，圆角标签样式，左对齐
- 右侧 ✕ 按钮 `catch:tap="clearSelectedTodos"` / `clearSelectedCombo`
- 点击 ✕ 清除对应选择，更新 data

---

## 3. 待办选择弹窗

### 打开入口

点击底部工具栏"待办"按钮。

### 弹窗结构

- `t-popup placement="bottom"` 从底部滑入
- `max-height: 75vh`，内容区 scroll-view
- 三层结构：header + search-bar + list

### Header

```
┌─────────────────────────────────────┐
│  选择待办                     ✕ 关闭  │
└─────────────────────────────────────┘
```

- 标题文字 32rpx，font-weight: 600
- 右侧关闭 icon（`t-icon name="close"`）

### Search bar

- 位于 header 下方，`<input>` 带搜索 icon
- placeholder: `搜索待办...`
- `bind:input="onTodoSearch"` 实时过滤
- 过滤逻辑：`todo.text.indexOf(keyword) > -1`

### Todo 列表（核心）

完全复用 todo 页面的卡片样式：

```
┌──────────────────────────────────────┐
│  🔴 去超市买菜                  ☑   │
│     ⏰ 06/30 12:00 📍永旺            │
├──────────────────────────────────────┤
│  🔵 写周报(完成态：绿底+删除线)  ☐   │
│     ⏰ 06/29 18:00                    │
└──────────────────────────────────────┘
```

**每项结构：**

使用 `t-swipe-cell` + `t-cell`，与 todo 页一致：
- `priority-bar`：左侧色条（p1=#e34d4d, p2=#2196F3, p3=#FF9800, p4=transparent）
- `star-badge`：星标角标（如果 `todo.isStar`）
- `title` = `todo.text`，单行超出 `...` 截断
- `description` = 地点 + 备注（格式同 todo 页：`📍name｜remarks` 或 `remarks`）
- `note` = `todo.friendlyDate || todo.setDate`
- 完成态样式：绿色渐变背景（`#ecfdf5 → #90e0b7`），title 删除线、绿色，description/note 变灰
- **右侧替换**：`t-radio` → 自定义 checkbox（`☐/☑` 或 t-icon check 样式）

**交互：**
- 点击卡片任意区域（除 checkbox 外）：切换选中状态
- 点击 checkbox：切换选中状态（不冒泡到 swipe-cell）
- 禁止 swipe-cell 的滑动操作（picker 中不需要编辑/删除）
- 禁止 longpress
- 数据源：`getLocalTodos()` 过滤 `isDeleted`

**选中状态：**
- 每一行的 data 维护 `selected` 字段
- data 中存储 `temporarySelectedIds: []`（确认前暂存，防止影响已选状态）
- 弹窗打开时，`temporarySelectedIds` 初始化为当前 `selectedTodoIds`

### Footer

```
┌─────────────────────────────────────┐
│  已选 2 项                  [确定]   │
└─────────────────────────────────────┘
```

- 左侧显示已选数量，字体 28rpx，颜色 `#999`
- 右侧确定按钮：背景 `#00b26a`，白色 28rpx
- 点击确定：将 `temporarySelectedIds` 写入 `selectedTodoIds`，关闭弹窗
- 点击遮罩层关闭弹窗：丢弃临时选择（不改动原有已选）

---

## 4. 组合选择弹窗

### 打开入口

点击底部工具栏"邀请组合"按钮。

### 弹窗结构

同 add-todo 的组合选择弹窗结构：

```
┌─────────────────────────────────────┐
│  邀请加入组合                 ✕ 关闭  │
├─────────────────────────────────────┤
│  🔍 搜索组合...                      │
├─────────────────────────────────────┤
│  私有组合                             │
│  📁 学习计划 · 8个待办          ✓    │
│  📁 工作项目 · 15个待办               │
│                                      │
│  共享组合（有邀请权限）               │
│  👥 团队周报 · 12个待办 · 3人       │
│  👥 读书会    · 5个待办  · 6人       │
├─────────────────────────────────────┤
│                               [确定]  │
└─────────────────────────────────────┘
```

**关键差异：只显示 `share_code` 非空的组合**

对于私有组合，除非它有 `share_code` 字段，否则不能作为"可邀请"组合出现在选择列表中。显示逻辑：
- 私有组合：仅显示 `combo.is_shared === 1` 且 `share_code` 非空的
- 共享组合：仅显示 `userRole === 'owner' | 'admin'` 的（有权限邀请他人）

**每项结构：**
- 左侧：组合 icon（带颜色背景的圆角方块），`t-icon`
- 中间：组合名称 + 统计信息（todo 数量 / 成员数）
- 右侧：选中标记 ✓

**交互：**
- 单选择：点击即选中，再次点击取消
- 搜索过滤：按 `combo.name` 匹配

---

## 5. Data 变更

post-edit.js 的 data 新增：

```javascript
// 已有字段
selectedTodoIds: [],
selectedComboCode: null,

// 新增
showTodoPicker: false,         // 待办弹窗可见性
showComboPicker: false,        // 组合弹窗可见性
temporarySelectedIds: [],      // 待办弹窗临时选择
temporarySelectedCombo: null,  // 组合弹窗临时选择
allTodos: [],                  // 加载的待办列表
filteredTodos: [],             // 搜索过滤后的待办列表
todoSearchKeyword: '',         // 待办搜索关键词
comboSearchKeyword: '',        // 组合搜索关键词
pickerCombos: [],              // 可选的私有组合（有 share_code）
pickerSharedCombos: [],        // 可选的共享组合（有邀请权限）
```

---

## 6. API / 数据依赖

### 待办数据

- 从本地存储获取：`getLocalTodos()`（`utils/sync.js`）
- 无需网络请求

### 组合数据

- 从 `app.globalData.combos` 和 `app.globalData.sharedCombos` 读取
- 在 `onLoad` 或弹窗打开时加载

### 提交逻辑

不变。`handleSubmit` 已携带 `todoIds` 和 `shareCode`：

```javascript
payload = {
  ...
  todoIds: this.data.selectedTodoIds,
  shareCode: this.data.selectedComboCode,
  ...
}
```

---

## 7. 文件变更清单

| 文件 | 变更 |
|------|------|
| `packageCommunity/post-edit/post-edit.wxml` | 添加底部 toolbar、已选摘要、待办弹窗、组合弹窗 |
| `packageCommunity/post-edit/post-edit.js` | 添加弹窗控制、搜索过滤、选择/取消逻辑 |
| `packageCommunity/post-edit/post-edit.wxss` | 添加 toolbar、弹窗、卡片 checkbox 样式 |

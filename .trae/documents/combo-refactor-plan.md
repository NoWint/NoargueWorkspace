# 组合功能重构计划

## 问题分析

### 问题1：待办从组合释放后无法再次被选入新组合
**原因**：在 `combo-detail.js` 的 `deleteCombo` 方法中，`action === 'keep_todos'` 时设置 `comboId: null`，但 `combo-edit.js` 的 `loadAvailableTodos` 过滤条件 `!t.comboId` 对于 `null` 值可能存在类型判断问题。

**解决方案**：确保释放待办时 `comboId` 设为空字符串或正确清除，并在 `loadAvailableTodos` 中使用更严格的判断。

### 问题2：若选择"一并删除"，待办实际上并没有被删除
**原因**：本地删除逻辑正确，但可能存在类型匹配问题（`comboId` 类型不一致），导致过滤条件 `t.comboId !== comboId` 无法正确匹配。

**解决方案**：使用 `String()` 统一类型比较。

### 问题3：多人待办的添加应跳转add-todo页
**当前状态**：`combo-detail.js` 的 `addTodoToCombo` 方法对共享组合使用弹窗创建待办。

**解决方案**：移除弹窗逻辑，统一跳转到 add-todo 页面，通过参数区分是否为共享组合。

### 问题4：add-todo页展示"组合"选项
**需求**：
- 显示组合选择器（t-popup）
- 从 todo 页面来时默认无组合
- 传值 comboId 时显示当前组合
- 选择共享组合后弹出成员选择等选项

**解决方案**：
1. add-todo.wxml 添加组合选择区域
2. add-todo.js 添加组合选择弹窗逻辑
3. 选择共享组合时显示成员选择选项

### 问题5：加入共享页8位邀请码输入框做成拆分的8小格
**解决方案**：创建类似验证码输入组件的8个小格输入框样式。

### 问题6：add-todo页要握手好后端
**解决方案**：
- 普通待办：调用 `todosApi.create`
- 共享组合待办：调用 `collabApi.createSharedTodo`
- 确保本地存储和云端同步

---

## 实施计划

### 任务1：修复待办释放后无法选入新组合
**文件**：`pages/combo-detail/combo-detail.js`
- 修改 `deleteCombo` 方法中 `keep_todos` 逻辑，确保 `comboId` 设为空字符串 `''`

**文件**：`pages/combo-edit/combo-edit.js`
- 修改 `loadAvailableTodos` 方法，使用 `!t.comboId || t.comboId === ''` 判断

### 任务2：修复"一并删除"待办未删除问题
**文件**：`pages/combo-detail/combo-detail.js`
- 修改 `deleteCombo` 方法，使用 `String(t.comboId) === String(comboId)` 进行类型统一比较

### 任务3：移除共享组合弹窗，统一跳转add-todo
**文件**：`pages/combo-detail/combo-detail.js`
- 修改 `addTodoToCombo` 方法，统一跳转到 add-todo 页面
- 移除 `showAddSharedTodo`、`createSharedTodo` 等弹窗相关方法

**文件**：`pages/combo-detail/combo-detail.wxml`
- 移除弹窗相关 UI（`showAddSharedTodo` 相关部分）

### 任务4：add-todo页添加组合选择功能
**文件**：`pages/add-todo/add-todo.js`
- 添加组合选择相关数据：`combos`, `selectedCombo`, `showComboPopup`, `isSharedCombo`, `members`, `assignType`, `selectedMembers`
- 添加方法：`loadCombos`, `showComboSelector`, `selectCombo`, `confirmComboSelection`
- 修改 `onLoad` 接收 `isShared` 参数
- 修改 `addTodo` 方法，区分普通待办和共享待办的创建逻辑

**文件**：`pages/add-todo/add-todo.wxml`
- 添加组合选择区域
- 添加组合选择弹窗（t-popup）
- 添加共享组合专属选项（成员选择等）

**文件**：`pages/add-todo/add-todo.wxss`
- 添加组合选择相关样式

**文件**：`pages/add-todo/add-todo.json`
- 添加 t-popup 组件引用

### 任务5：加入共享页邀请码输入框改为8小格
**文件**：`pages/join-collab/join-collab.wxml`
- 创建8个小格输入框布局
- 使用 hidden input 处理实际输入

**文件**：`pages/join-collab/join-collab.js`
- 添加输入处理逻辑：自动跳转下一格、退格处理

**文件**：`pages/join-collab/join-collab.wxss`
- 添加8格输入框样式

### 任务6：add-todo页与后端握手
**文件**：`pages/add-todo/add-todo.js`
- 引入 `todosApi`, `collabApi`
- 普通待办创建时调用 `todosApi.create`
- 共享待办创建时调用 `collabApi.createSharedTodo`
- 确保本地存储同步

---

## 文件修改清单

| 文件 | 修改内容 |
|------|----------|
| `pages/combo-detail/combo-detail.js` | 修复删除逻辑、移除弹窗方法、统一跳转 |
| `pages/combo-detail/combo-detail.wxml` | 移除弹窗UI |
| `pages/combo-detail/combo-detail.wxss` | 移除弹窗样式 |
| `pages/combo-edit/combo-edit.js` | 修复待办过滤逻辑 |
| `pages/add-todo/add-todo.js` | 添加组合选择、后端握手 |
| `pages/add-todo/add-todo.wxml` | 添加组合选择UI |
| `pages/add-todo/add-todo.wxss` | 添加组合选择样式 |
| `pages/add-todo/add-todo.json` | 添加组件引用 |
| `pages/join-collab/join-collab.wxml` | 8格输入框 |
| `pages/join-collab/join-collab.js` | 输入处理逻辑 |
| `pages/join-collab/join-collab.wxss` | 8格输入框样式 |

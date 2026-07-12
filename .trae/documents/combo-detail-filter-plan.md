# combo-detail 页面筛选功能实现计划

## 需求概述

在 combo-detail 页面的"待办·X项"标题右侧添加筛选按钮，支持按不同模式筛选共享待办列表。

## 功能详情

### 筛选模式

| 模式         | 显示条件     | 说明            |
| ---------- | -------- | ------------- |
| 显示所有待办     | 所有人可见    | 默认模式，显示所有待办   |
| 【个人】我需要完成的 | 仅超管/管理可见 | 显示当前用户需要完成的待办 |
| 【个人】我未完成的  | 仅超管/管理可见 | 显示当前用户未完成的待办  |
| 【全局】未完成的   | 仅超管/管理可见 | 显示全局未完成的待办    |
| 【全局】已完成的   | 仅超管/管理可见 | 显示全局已完成的待办    |

### 交互设计

1. 筛选按钮：t-icon，filter图标，位于"待办·X项"标题右侧
2. 点击弹出居中 t-popup
3. 使用 t-radio-group 单选
4. 选择后在筛选图标右侧显示简要选项文字
5. 本地存储选择，下次打开自动加载
6. 实时更新：完成待办后根据筛选模式自动更新列表

## 实现步骤

### 1. 更新 combo-detail.json

* 添加 `t-popup` 和 `t-radio-group` 组件引用

### 2. 更新 combo-detail.wxml

* 在"待办·X项"标题右侧添加筛选按钮（仅共享组合时显示）

* 添加筛选状态文字显示

* 添加 t-popup 弹窗，内含 t-radio-group 单选列表

* 根据筛选模式过滤显示的待办列表

### 3. 更新 combo-detail.wxss

* 添加筛选按钮样式

* 添加筛选状态文字样式

* 添加 popup 内容样式

### 4. 更新 combo-detail.js

* 添加 data 字段：

  * `showFilterPopup`: 控制弹窗显示

  * `filterMode`: 当前筛选模式

  * `filteredSharedTodos`: 过滤后的待办列表

* 添加方法：

  * `showFilterPopup()`: 显示筛选弹窗

  * `hideFilterPopup()`: 隐藏筛选弹窗

  * `onFilterChange()`: 处理筛选模式变更

  * `applyFilter()`: 应用筛选逻辑

  * `loadFilterPreference()`: 加载本地存储的筛选偏好

  * `saveFilterPreference()`: 保存筛选偏好到本地存储

* 修改 `loadComboData()`: 加载后应用筛选

* 修改 `toggleSharedTodo()`: 完成待办后重新应用筛选

## 筛选逻辑实现

### 获取当前用户ID

```javascript
let currentUserId = app.globalData.userInfo?.id;
if (!currentUserId) {
  const storedUser = wx.getStorageSync('user');
  currentUserId = storedUser?.id;
}
```

### 筛选条件判断

```javascript
// 判断用户是否需要完成该待办
function isUserAssigned(todo, userId) {
  if (todo.assignType === 'specific') {
    return todo.assignments.some(a => String(a.userId) === String(userId));
  }
  // 全员完成模式，检查是否被排除
  const excludeType = todo.excludeType || '';
  // ... 排除逻辑
  return true;
}

// 判断用户是否已完成该待办
function isUserCompleted(todo, userId) {
  return !!todo.myCompletedAt;
}

// 全局完成状态
function isGlobalCompleted(todo) {
  return !!todo.completedAt;
}
```

### 本地存储键名

`combo_detail_filter_mode_{comboId}` - 按组合ID存储筛选偏好

## 注意事项

1. 筛选功能仅对共享组合有效
2. 个人筛选模式仅对超管/管理可见（因为他们可以看到所有待办）
3. 完成待办后需要重新应用筛选，确保列表实时更新
4. 筛选状态文字需要简洁明了


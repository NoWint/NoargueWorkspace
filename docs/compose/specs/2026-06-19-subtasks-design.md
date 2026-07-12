# 子任务功能设计文档

## [S1] 需求概述

为待办事项增加多级子任务（树形结构）支持：
- 每个待办可作为父待办，拥有若干子任务
- 子任务可再拥有子任务，无限层级
- 子任务在 todo-detail 页递归展开显示
- 子任务完成后自动正向联动完成父待办

---

## [S2] 数据模型

### localStorage（客户端）

每个 todo 对象新增字段：
```javascript
parent_id: null,   // null=根级待办，string=父待办的 id
```

现有其他字段不变（id, text, setDate, setTime, completed, time, priority 等）。

### 数据库（服务端）

`todos` 表新增：
```sql
parent_id VARCHAR(64) DEFAULT NULL,
INDEX idx_parent (parent_id)
```

### API 变更

| 接口 | 变更 |
|------|------|
| `POST /todos/create` | body 新增可选参数 `parent_id` |
| `GET /todos/list` | 新增可选参数 `parent_id`，不传时只返回 `parent_id IS NULL` 的根级待办 |
| `GET /todos/:id` | 响应新增 `subtasks` 数组（直接子任务列表） |
| `PUT /todos/:id` | 支持更新 `parent_id`（移动节点） |
| `DELETE /todos/:id` | 级联删除所有子任务（与前端确认弹窗联动） |

### 同步

- `parent_id` 字段进入同步 payload
- `sync` 接口的 `localChanges` 数组包含 `parent_id`
- `mergeChanges` 合并时保留 `parent_id` 关系

---

## [S3] 前端：todo-detail 页（主要改动）

### 布局

在主待办详情卡片下方新增「子任务」区块：

```
┌─────────────────────────┐
│  主待办详情卡片           │
│  (现有内容)              │
├─────────────────────────┤
│  ▼ 子任务 (3)           │  ← 折叠/展开头部，显示未完成子任务数
│  ─────────────────────  │
│  ○ 子任务1 ............ │  ← 缩进 level 0
│  │ ○ 孙任务1.1 ......   │  ← 缩进 level 1
│  │ ○ 孙任务1.2 ......   │
│  ○ 子任务2 ............ │  ← 缩进 level 0
│  │ ○ 孙任务2.1 ......   │
│  │ │ ○ 曾孙任务2.1.1 .. │  ← 缩进 level 2
│  ─────────────────────  │
│  [输入框 + 发送按钮]     │  ← 快速添加子任务
└─────────────────────────┘
```

### 数据加载

```javascript
// 在 onLoad/onShow 中调用
loadSubtree(parentId) {
  const allTodos = wx.getStorageSync('todos') || [];
  // 递归查找所有子孙节点，返回扁平数组 + 每项的 depth
  return this.flattenSubtree(allTodos, parentId, 0);
}

flattenSubtree(allTodos, parentId, depth) {
  const children = allTodos.filter(t => t.parent_id === parentId);
  let result = [];
  for (const child of children) {
    result.push({ ...child, _depth: depth });
    result = result.concat(this.flattenSubtree(allTodos, child.id, depth + 1));
  }
  return result;
}
```

### 递归渲染（WXML）

使用 WeChat 小程序的 template 递归能力：

```xml
<template name="subtaskItem">
  <view class="subtask-item" style="padding-left: {{item._depth * 40 + 24}}rpx">
    <t-radio checked="{{item.completed}}" catch:change="toggleSubtask" data-id="{{item.id}}" />
    <text class="subtask-text {{item.completed ? 'completed' : ''}}">{{item.text}}</text>
  </view>
  <block wx:for="{{item._children}}" wx:key="id">
    <template is="subtaskItem" data="{{item}}" />
  </block>
</template>
```

但 WXML template 递归有限制，推荐改用**扁平列表 + depth 缩进**方式：

```xml
<view wx:for="{{subtaskList}}" wx:key="id">
  <view class="subtask-item" style="padding-left: {{item._depth * 40 + 24}}rpx">
    <view class="subtask-indent-line" wx:if="{{item._depth > 0}}"></view>
    <t-radio checked="{{item.completed}}" catch:change="toggleSubtask" data-id="{{item.id}}" />
    <text class="subtask-text {{item.completed ? 'completed' : ''}}">{{item.text}}</text>
  </view>
</view>
```

### 子任务操作（全部 inline）

**子任务没有独立的 todo-detail 页**，所有操作在当前父待办页面内完成。

| 操作 | 方式 |
|------|------|
| 勾选完成 | 点击 checkbox，递归联动上级 |
| 编辑文本 | 点击文本 → 原地变为 input → 失焦/回车保存 |
| 添加子任务 | 底部输入框：创建当前待办的直接子任务 |
| 添加下层级 | 每条子任务右侧有「+」按钮 → 展开输入框 → 创建该子任务的直接子任务 |
| 删除 | 子任务长按或左滑 → 删除确认 |

### 快捷创建

底部输入框 + 发送按钮，创建当前待办的直接子任务：

```javascript
createSubtask(text) {
  const now = Date.now();
  const newTodo = {
    id: generateTodoId(),
    text,
    setDate: this.data.todo.setDate,  // 继承父待办日期
    completed: false,
    time: now,
    parent_id: this.data.todo.id,
    priority: 'p2',
    version: 1,
    isDeleted: false,
    updatedAt: now
  };
  const todos = wx.getStorageSync('todos') || [];
  todos.unshift(newTodo);
  wx.setStorageSync('todos', todos);
  this.loadSubtasks();
}
```

### 子任务 UI 布局

```
 ▼ 子任务                              ← 折叠/展开
 ┌─────────────────────────────────────┐
 │ ○ 设计评审                         │ ← level 0, 带 + 按钮
 │ │ ○ 准备PPT          [编辑中] [+]  │ ← 点击文字进入 inline 编辑
 │ │ │ [输入子任务...] [确定]         │ ← 点了 + 后展开的输入框
 │ │ ○ 预约会议室                     │
 │ ○ 开发                             │
 │                                     │
 │ [输入新子任务...]        [发送]     │ ← 创建 level 0 子任务
 └─────────────────────────────────────┘
```

### 完成联动（正向）

`toggleSubtask(e)` 执行后：
1. 切换该子任务的 `completed` 状态
2. 获取该子任务的所有兄弟节点（相同 `parent_id`）
3. 如果所有兄弟都已 `completed` → 自动把父待办标记为 `completed`
4. 递归向上检查：父待办的父待办是否也满足条件

```javascript
async toggleSubtask(e) {
  const todoId = e.currentTarget.dataset.id;
  // 切换子任务完成状态
  // 递归检查父节点：checkAndCompleteParent(parentId)
}

checkAndCompleteParent(parentId) {
  if (!parentId) return;
  const todos = wx.getStorageSync('todos') || [];
  const siblings = todos.filter(t => t.parent_id === parentId && !t.isDeleted);
  const allDone = siblings.every(t => t.completed);
  if (!allDone) return;
  
  // 自动完成父待办
  const parent = todos.find(t => t.id === parentId);
  if (parent && !parent.completed) {
    parent.completed = Date.now();
    wx.setStorageSync('todos', todos);
    // 递归检查祖父节点
    this.checkAndCompleteParent(parent.parent_id);
  }
}
```

### 删除

删除父待办时弹窗提示：「该待办有 X 个子任务，是否全部删除？」
- 确认 → 软删除该待办及其所有子孙节点
- 取消 → 不删除

---

## [S4] 其他页面的删除入口

| 页面 | 文件 | 删除函数 | 改动 |
|------|------|----------|------|
| todo 列表 | `pages/todo/todo.js` | `deleteTodo(index)` | 删除前检查是否有子任务 |
| todo-detail | `pages/todo-detail/todo-detail.js` | `deleteTodo()` | 已涵盖 |
| calendar | `pages/calendar/calendar.js` | 搜索 `delete` 相关函数 | 同理 |
| combo-detail | `packageCombo/combo-detail/combo-detail.js` | 搜索 `delete` 相关函数 | 同理 |
| daily-stats | `pages/daily-stats/daily-stats.js` | 搜索 `delete` 相关函数 | 同理 |

每个删除入口增加：
```javascript
function countSubtasks(todos, parentId) {
  let count = 0;
  const children = todos.filter(t => t.parent_id === parentId);
  for (const child of children) {
    count += 1 + countSubtasks(todos, child.id);
  }
  return count;
}
```

删除前：
```javascript
const subCount = countSubtasks(allTodos, todo.id);
if (subCount > 0) {
  // 弹窗: "该待办有 X 个子任务，是否全部删除？"
  // 确认后递归软删除所有子孙 + 自身
} else {
  // 原删除逻辑
}
```

---

## [S5] 全局过滤规则

**所有列表/统计页只显示根级待办**（`parent_id = null`），子任务仅在所属 todo-detail 页加载显示。

| 页面 | 文件 | 过滤方式 |
|------|------|----------|
| 待办列表 | `pages/todo/todo.js` | `onShow` 读取 storage 后过滤 `parent_id != null` |
| 日历 | `pages/calendar/calendar.js` | 读取某日待办时过滤子任务 |
| 日统计 | `pages/daily-stats/daily-stats.js` | 过滤子任务 |
| 状态统计 | `pages/stats/stats.js` | 统计计数时排除子任务 |
| 搜索 | `pages/todo-search/todo-search.js` | 搜索时排除子任务 |

标题右侧可显示子任务计数徽章（如 `(3)`）。

---

## [S6] 不做的范围

- 不支持在 todo 列表页拖拽改变父子关系
- 不支持拖拽排序子任务
- 子任务不单独设置提醒
- add-todo 页不添加子任务创建入口（直接在 detail 页创建）

---

## [S7] 涉及文件

| 文件 | 改动量 |
|------|--------|
| `backend/controllers/todoController.js` | ~20 行 |
| `backend/routes/todoRoutes.js` | ~3 行 |
| `backend/database.sql`（migration） | ~10 行 |
| `pages/todo-detail/todo-detail.js` | ~150 行（核心逻辑） |
| `pages/todo-detail/todo-detail.wxml` | ~80 行（子任务 UI） |
| `pages/todo-detail/todo-detail.wxss` | ~60 行 |
| `pages/todo/todo.js` | ~20 行（删除弹窗 + 过滤） |
| `pages/calendar/calendar.js` | ~15 行 |
| `pages/daily-stats/daily-stats.js` | ~15 行 |
| `packageCombo/combo-detail/combo-detail.js` | ~15 行 |
| `utils/sync.js` | ~5 行 |

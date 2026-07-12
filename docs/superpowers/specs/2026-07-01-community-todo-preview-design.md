# 社区帖子待办预览功能设计

## 概述

在 Community Home 和 Post Detail 页面，点击帖子关联的待办项，从当前仅能展开显示标题列表，改为可导航到待办详情页（packagePages/todo-detail）进行完整预览，并可一键添加到用户自己的待办列表。

## 现状

- `getTodosBatch` API 仅返回 `{id, text, priority, completed}` 四个字段
- `getById` API 按 `user_id` 过滤，查看者无法获取发帖人的待办详情
- 帖子中的 `todoIds` 是发帖人的本地待办 ID，查看者的本地存储中不存在
- todo-detail 页已有 `isShare` 预览模式 + `addToMyTodos` 逻辑，可复用

## 改动范围

### 1. 后端 — 扩展 `POST /todos/batch`

**文件**: `backend/controllers/todoController.js`

在 `getTodosBatch` 中增加 `detail` 参数控制返回深度：

```js
// 请求参数新增: { ids: [...], detail: true }
// detail=false（默认）：返回现有字段（id, text, priority, completed）
// detail=true：额外返回 set_date, set_time, remarks, images, location, tags
//              + 递归查询该待办的子任务
```

**查询变更**:
- `detail=false`: `SELECT todo_id, id, text, priority, completed`（不变）
- `detail=true`: `SELECT todo_id, id, text, priority, completed, set_date, set_time, remarks, images, location, tags`
- 子任务: 以该 todo_id 为 parent_id 查询 `SELECT id, text, completed FROM todos WHERE parent_id = ?`

**注意**: 该端点当前不按 user_id 过滤（设计如此，用于社区预览），本次不改动这个行为。

### 2. 社区首页 — `pages/community-home/`

**文件**: `pages/community-home/community-home.js` + `community-home.wxml`

**WXML 改动**:
- 展开的 `todo-mini-item` 增加 `catch:tap="goToTodoDetail"` 和 `data-todo-id` / `data-creator-name` / `data-creator-avatar` 数据属性
- 加 `hover-class="tap-active"` 点击反馈

**JS 改动**:
- 新增 `goToTodoDetail(e)` 方法，导航到 todo-detail 页：
  ```js
  goToTodoDetail(e) {
    const { todoId, creatorName, creatorAvatar, postId } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/packagePages/todo-detail/todo-detail?communityTodoId=${todoId}&creatorName=${encodeURIComponent(creatorName)}&creatorAvatar=${encodeURIComponent(creatorAvatar)}&postId=${postId}`
    });
  }
  ```

**WXSS 改动**:
- 新增 `.tap-active` 样式
- `todo-mini-item` 增加 `cursor: pointer`/`active` 效果

### 3. 帖子详情 — `packageCommunity/post-detail/`

**文件**: `packageCommunity/post-detail/post-detail.js` + `post-detail.wxml` + `post-detail.wxss`

与社区首页相同的改动模式：
- `todo-mini-item` 添加 `catch:tap="goToTodoDetail"` 和数据属性
- 新增 `goToTodoDetail(e)` 方法，导航逻辑同社区首页

### 4. 待办详情页 — `packagePages/todo-detail/`

**文件**: `packagePages/todo-detail/todo-detail.js` + `todo-detail.wxml`

**新增加载路径** `_loadByCommunityTodo(options)`：

```
onLoad 新增分支:
  if (options.communityTodoId) {
    this._loadByCommunityTodo(options);
    return;
  }
```

`_loadByCommunityTodo` 逻辑：
1. 调用 `todosApi.getTodosBatch([communityTodoId], true)` 获取完整数据
2. 将返回的 todo 数据构建为本地格式（格式化日期、解析图片等）
3. 设置 `this.setData({ isShare: true, allowAdd: true, creator: { nickname, avatar } })`
4. 如果有子任务，调用 `loadSubtasksFromSnapshot()` 渲染只读子任务列表
5. 调用 `_computeFabActions()` 生成 FAB 按钮（"添加到我的待办" + "返回首页"）

**WXML 改动**（如有必要）：
- 当前 `creator` 卡片在 `isShare` 模式下不显示（仅在 `isSharedTodo || adminView` 时显示），需要改为 `isShare && creator` 时也显示创建人员卡片
- 添加 "添加到我的待办" 的 FAB 按钮（已通过 `_computeFabActions` 支持 `isShare` 模式）

### 5. 前端 API 层

**文件**: `utils/api.js`

更新 `todosApi.getTodosBatch` 签名，支持 `detail` 参数：

```js
getTodosBatch: (ids, detail = false) => request({
  url: '/todos/batch',
  method: 'POST',
  data: { ids, detail }
}),
```

## 页面状态矩阵

| 场景 | isShare | isSharedTodo | adminView | creator | 可添加 |
|------|---------|-------------|-----------|---------|--------|
| 个人待办详情 | false | false | false | null | 否（已拥有） |
| 共享待办详情 | false | true | false | ✓ | 否（本身就在共享中） |
| 分享快照预览 | true | false | false | null | ✓ |
| 社区待办预览 | true | false | false | ✓（帖子作者） | ✓ |
| 管理查看 | false | false | true | ✓ | 否 |

## 错误处理

- 待办已被删除 → `wx.showToast({ title: '该待办已被删除', icon: 'none' })` + 返回上一页
- 网络加载失败 → `wx.showToast({ title: '加载失败', icon: 'none' })` + 返回上一页
- 参数缺失 → 直接返回上一页

## 未涉及

- 不新增数据表
- 不改动帖子发布流程（发帖时选的 todoIds 保持现有存储方式）
- 不改动现有 todo-detail 的编辑/删除功能
- 不改动现有社区帖子列表的分页/加载逻辑

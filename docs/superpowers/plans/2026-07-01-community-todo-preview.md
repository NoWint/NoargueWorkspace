# 社区帖子待办预览功能 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在社区帖子中点击关联待办，可跳转到待办详情页进行完整预览，并一键添加到自己的待办列表

**Architecture:** 扩展后端 `POST /todos/batch` 支持 `detail=true` 返回完整待办数据（含子任务）；前端在社区首页和帖子详情页的展开待办列表上增加点击导航；todo-detail 页新增 `_loadByCommunityTodo` 加载路径，以 `isShare` 预览模式展示，显示帖子作者为创建者，FAB 提供"添加到我的待办"入口

**Tech Stack:** 微信小程序（原生）、Node.js/Express 后端、MySQL

---

### 任务 1: 后端 — 扩展 `POST /todos/batch` 支持 detail 参数

**文件:**
- 修改: `backend/controllers/todoController.js:908-931`
- 路由不变: `backend/routes/todoRoutes.js:15`

- [ ] **步骤 1: 改造 getTodosBatch 函数，增加 detail 参数分支**

```javascript
const getTodosBatch = async (req, res) => {
  const { ids, detail } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.json({ success: true, data: [] });
  }
  try {
    const placeholders = ids.map(() => '?').join(',');
    const numericIds = ids.map(id => { const n = Number(id); return isNaN(n) ? -1 : n; });

    // 根据 detail 参数选择字段
    const selectFields = detail === true
      ? 'todo_id, id, text, priority, completed, set_date, set_time, remarks, images, location, tags'
      : 'todo_id, id, text, priority, completed';

    const todos = await query(
      `SELECT ${selectFields} FROM todos
       WHERE (todo_id IN (${placeholders}) OR id IN (${placeholders})) AND is_deleted = 0`,
      [...ids, ...numericIds]
    );

    // detail 模式下：递归查询子任务
    let subtaskMap = {};
    if (detail === true && todos.length > 0) {
      const todoIds = todos.map(t => t.todo_id);
      const subPlaceholders = todoIds.map(() => '?').join(',');
      const subtasks = await query(
        `SELECT id, text, completed, parent_id FROM todos
         WHERE parent_id IN (${subPlaceholders}) AND is_deleted = 0`,
        todoIds
      );
      // 按 parent_id 分组
      for (const sub of subtasks) {
        const pid = sub.parent_id;
        if (!subtaskMap[pid]) subtaskMap[pid] = [];
        subtaskMap[pid].push({
          id: sub.id,
          text: sub.text,
          completed: !!sub.completed
        });
      }
    }

    res.json({
      success: true,
      data: todos.map(t => {
        const base = {
          id: t.todo_id || String(t.id),
          text: t.text,
          priority: t.priority,
          completed: !!t.completed
        };
        if (detail === true) {
          // 解析图片
          let images = [];
          if (t.images) {
            try { images = typeof t.images === 'string' ? JSON.parse(t.images) : t.images; } catch (e) { images = []; }
          }
          // 解析位置
          let location = null;
          if (t.location) {
            try { location = typeof t.location === 'string' ? JSON.parse(t.location) : t.location; } catch (e) { location = t.location; }
          }
          // 解析标签（存的是 tag id 数组）
          let tags = [];
          if (t.tags) {
            try { tags = typeof t.tags === 'string' ? JSON.parse(t.tags) : t.tags; } catch (e) { tags = []; }
          }
          Object.assign(base, {
            setDate: t.set_date || null,
            setTime: t.set_time || null,
            remarks: t.remarks || null,
            images,
            location,
            tags,
            subtasks: subtaskMap[t.todo_id] || []
          });
        }
        return base;
      })
    });
  } catch (err) {
    logger.todoError('批量获取', '批量获取待办失败', { error: err.message });
    res.status(500).json({ success: false, message: '获取失败' });
  }
};
```

- [ ] **步骤 2: 提交**

```bash
git add backend/controllers/todoController.js
git commit -m "feat: extend POST /todos/batch with detail param for full todo data"
```

---

### 任务 2: 前端 API 层 — 更新 getTodosBatch 签名

**文件:**
- 修改: `utils/api.js:197-201`

- [ ] **步骤 1: 修改 getTodosBatch 调用，传递 detail 参数**

```javascript
// utils/api.js — 找到 getTodosBatch 定义，改为：
getTodosBatch: (ids, detail = false) => request({
  url: '/todos/batch',
  method: 'POST',
  data: { ids, detail }
}),
```

- [ ] **步骤 2: 提交**

```bash
git add utils/api.js
git commit -m "feat: update getTodosBatch API to support detail param"
```

---

### 任务 3: 社区首页 — 待办项可点击跳转

**文件:**
- 修改: `pages/community-home/community-home.js` （新增方法）
- 修改: `pages/community-home/community-home.wxml` （添加 tap 事件和数据属性）
- 修改: `pages/community-home/community-home.wxss` （添加点击反馈样式）

- [ ] **步骤 1: community-home.js — 新增 goToTodoDetail 方法**

在 `handleComboTap` 方法后面添加：

```javascript
goToTodoDetail(e) {
  const { todoId, creatorName, creatorAvatar, postId } = e.currentTarget.dataset;
  if (!todoId) return;
  wx.navigateTo({
    url: `/packagePages/todo-detail/todo-detail?communityTodoId=${todoId}&creatorName=${encodeURIComponent(creatorName || '')}&creatorAvatar=${encodeURIComponent(creatorAvatar || '')}&postId=${postId || ''}`
  });
},
```

- [ ] **步骤 2: community-home.wxml — 给 todo-mini-item 添加 tap 事件**

在 `todo-mini-item` 上增加 `catch:tap="goToTodoDetail"` 和数据属性：

```xml
<!-- 原代码 -->
<view class="todo-mini-item">
  <view class="todo-mini-dot" data-priority="{{todoItem.priority}}"></view>
  <text class="todo-mini-text">{{todoItem.text}}</text>
</view>

<!-- 改为 -->
<view class="todo-mini-item" catch:tap="goToTodoDetail" data-todo-id="{{todoItem.id}}" data-creator-name="{{item.user.nickname}}" data-creator-avatar="{{item.user.avatar}}" data-post-id="{{item.postId}}">
  <view class="todo-mini-dot" data-priority="{{todoItem.priority}}"></view>
  <text class="todo-mini-text">{{todoItem.text}}</text>
</view>
```

- [ ] **步骤 3: community-home.wxss — 添加点击反馈样式**

在文件末尾添加：

```css
.todo-mini-item {
  cursor: pointer;
}

.tap-active {
  opacity: 0.6;
}
```

- [ ] **步骤 4: 提交**

```bash
git add pages/community-home/community-home.js pages/community-home/community-home.wxml pages/community-home/community-home.wxss
git commit -m "feat(community-home): add tap navigation to todo detail page"
```

---

### 任务 4: 帖子详情页 — 待办项可点击跳转

**文件:**
- 修改: `packageCommunity/post-detail/post-detail.js` （新增方法）
- 修改: `packageCommunity/post-detail/post-detail.wxml` （添加 tap 事件和数据属性）
- 修改: `packageCommunity/post-detail/post-detail.wxss` （添加点击反馈样式）

- [ ] **步骤 1: post-detail.js — 新增 goToTodoDetail 方法**

在 `handleComboTap` 方法后面添加：

```javascript
goToTodoDetail(e) {
  const { todoId, creatorName, creatorAvatar } = e.currentTarget.dataset;
  if (!todoId) return;
  wx.navigateTo({
    url: `/packagePages/todo-detail/todo-detail?communityTodoId=${todoId}&creatorName=${encodeURIComponent(creatorName || '')}&creatorAvatar=${encodeURIComponent(creatorAvatar || '')}&postId=${this.data.postId || ''}`
  });
},
```

- [ ] **步骤 2: post-detail.wxml — 给 todo-mini-item 添加 tap 事件**

将 `todo-mini-item` 改为可点击：

```xml
<!-- 原代码 -->
<view class="todo-mini-item">
  <view class="todo-mini-dot" data-priority="{{todoItem.priority}}"></view>
  <text class="todo-mini-text">{{todoItem.text}}</text>
</view>

<!-- 改为 -->
<view class="todo-mini-item" catch:tap="goToTodoDetail" data-todo-id="{{todoItem.id}}" data-creator-name="{{post.user.nickname}}" data-creator-avatar="{{post.user.avatar}}">
  <view class="todo-mini-dot" data-priority="{{todoItem.priority}}"></view>
  <text class="todo-mini-text">{{todoItem.text}}</text>
</view>
```

- [ ] **步骤 3: post-detail.wxss — 添加点击反馈样式**

在文件末尾添加：

```css
.todo-mini-item {
  cursor: pointer;
}

.tap-active {
  opacity: 0.6;
}
```

- [ ] **步骤 4: 提交**

```bash
git add packageCommunity/post-detail/post-detail.js packageCommunity/post-detail/post-detail.wxml packageCommunity/post-detail/post-detail.wxss
git commit -m "feat(post-detail): add tap navigation to todo detail page"
```

---

### 任务 5: 待办详情页 — 新增社区待办预览加载路径

**文件:**
- 修改: `packagePages/todo-detail/todo-detail.js` （新增加载路径）
- 修改: `packagePages/todo-detail/todo-detail.wxml` （修改 creator 显示条件）

- [ ] **步骤 1: todo-detail.js — onLoad 新增 communityTodoId 分支**

在 `onLoad` 方法中，`options.adminView` 判断之后，现有的 `options.sharedTodoId` 之前，添加：

```javascript
if (options.communityTodoId) {
  this._loadByCommunityTodo(options);
  return;
}
```

完整分支顺序：
```javascript
onLoad(options) {
  const pages = getCurrentPages();
  const isFromShare = pages.length === 1;
  this.setData({ isFromShare });

  if (options.adminView === '1') {
    this._loadAdminView(options);
    return;
  }

  // ★ 新增：社区待办预览
  if (options.communityTodoId) {
    this._loadByCommunityTodo(options);
    return;
  }

  if (options.sharedTodoId) {
    // ... 现有逻辑
```

- [ ] **步骤 2: todo-detail.js — 实现 _loadByCommunityTodo 方法**

在 `_loadAdminViewLegacy` 后面（或其他现有方法后面）添加：

```javascript
// 路径: 社区帖子中的待办预览
async _loadByCommunityTodo(options) {
  const { communityTodoId, creatorName, creatorAvatar, postId } = options;

  if (!communityTodoId) {
    wx.showToast({ title: '参数错误', icon: 'none' });
    setTimeout(() => wx.navigateBack(), 1500);
    return;
  }

  wx.showLoading({ title: '加载中...' });

  try {
    const res = await todosApi.getTodosBatch([communityTodoId], true);
    if (!res.success || !res.data || res.data.length === 0) {
      wx.hideLoading();
      wx.showToast({ title: '该待办已删除', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    const todoData = res.data[0];
    wx.hideLoading();

    // 构建显示用的 todo 对象
    let setDateObj = new Date();
    if (todoData.setDate) {
      const d = new Date(todoData.setDate);
      if (!isNaN(d.getTime())) setDateObj = d;
    }

    // 格式化时间
    const formatDate = (date) => {
      const y = date.getFullYear();
      const m = (date.getMonth() + 1).toString().padStart(2, '0');
      const d = date.getDate().toString().padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    const formatRichDate = (date, setTime) => {
      const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
      const weekDay = weekDays[date.getDay()];
      const time = setTime || todoData.setTime || '12:00';
      return `${formatDate(date)} ${time} 周${weekDay}`;
    };

    const parseImages = (images) => {
      if (!images) return [];
      if (typeof images === 'string') {
        try { const p = JSON.parse(images); return Array.isArray(p) ? p : []; } catch (e) { return []; }
      }
      return Array.isArray(images) ? images : [];
    };

    const calculateImagesLayout = (images) => {
      const len = images.length;
      if (len === 0) return 'grid-3';
      if (len === 1) return 'grid-1';
      if (len === 2) return 'grid-2';
      if (len === 3) return 'grid-3';
      if (len === 4) return 'grid-2x2';
      if (len <= 6) return 'grid-3x2';
      return 'grid-3x3';
    };

    const parsedImages = parseImages(todoData.images);

    this.setData({
      todo: {
        id: todoData.id,
        text: todoData.text,
        setDate: formatDate(setDateObj),
        setTime: todoData.setTime || '12:00',
        remarks: todoData.remarks || '',
        location: todoData.location || null,
        priority: todoData.priority || 'p2',
        images: parsedImages,
        completed: false,
        tags: todoData.tags || []
      },
      isShare: true,
      allowAdd: true,
      creator: {
        nickname: creatorName ? decodeURIComponent(creatorName) : '用户',
        avatar: creatorAvatar ? decodeURIComponent(creatorAvatar) : '/images/avatar.png'
      },
      formattedDate: formatRichDate(setDateObj, todoData.setTime),
      formatDateTime: this.formatDateTime(Date.now()),
      imagesLayout: calculateImagesLayout(parsedImages),
      todoTags: this.getTagsByIds(todoData.tags || []),
      subtaskList: (todoData.subtasks || []).map(s => ({ ...s, _depth: 0 })),
      todoId: todoData.id
    });

    this._computeFabActions();
  } catch (err) {
    wx.hideLoading();
    console.error('[loadByCommunityTodo] error:', err);
    wx.showToast({ title: '加载失败', icon: 'none' });
    setTimeout(() => wx.navigateBack(), 1500);
  }
},
```

- [ ] **步骤 3: todo-detail.wxml — 修改 creator 显示条件**

找到创建人员卡片的条件渲染：

```xml
<!-- 原代码 -->
<view wx:if="{{(isSharedTodo || adminView) && creator}}" class="date-info creator-info">

<!-- 改为 -->
<view wx:if="{{(isShare || isSharedTodo || adminView) && creator}}" class="date-info creator-info">
```

- [ ] **步骤 4: 提交**

```bash
git add packagePages/todo-detail/todo-detail.js packagePages/todo-detail/todo-detail.wxml
git commit -m "feat(todo-detail): add community todo preview loading path with creator info"
```

---

### 任务 6: 验证与集成测试

- [ ] **步骤 1: 检查所有调用 getTodosBatch 的地方，确保 detail 参数默认值兼容**

```bash
# 搜索所有调用了 getTodosBatch 的地方
grep -rn "getTodosBatch" --include="*.js" .
```

确认 `pages/community-home/community-home.js:96` 和 `packageCommunity/post-detail/post-detail.js:259` 的调用不需要修改（它们使用默认 detail=false，行为不变）。

- [ ] **步骤 2: 检查 todo-detail 页所有 FAB 按钮是否正常**

确认 `_computeFabActions` 在 `isShare=true && isSharedTodo=false` 时，正确显示"添加到我的待办"按钮，不显示编辑/删除/评论等按钮。

- [ ] **步骤 3: 最终提交**

```bash
git add -A
git commit -m "feat: implement community todo preview with add-to-my-todos"
```

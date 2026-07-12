# 实现计划：添加"已完成"和"未完成"筛选选项

## 需求分析

在 todo 页面的标签下拉菜单中添加"已完成"和"未完成"筛选选项，并实现以下功能：

1. 在"已完成"模式下取消完成，该项应从列表中移除
2. 在"未完成"模式下标记完成，该项应从列表中移除
3. 确保索引正确对应（`todos` 数组索引 vs `allTodos` 数组索引）

## 当前数据流

```
allTodos (全部数据) → applyTagFilter() → todos (显示数据)
```

* `currentTagFilter`: 当前筛选值（'all', 'none', 或标签ID）

* `allTodos`: 所有待办数据（存储）

* `todos`: 筛选后显示的数据

## 实现步骤

### 步骤 1：修改 todo.wxml - 添加筛选选项

在下拉菜单中添加"已完成"和"未完成"选项：

```html
<view wx:if="{{showTagDropdown}}" class="dropdown-menu" style="top: {{dropdownTop}}px;">
  <view class="dropdown-item {{currentTagFilter === 'all' ? 'selected' : ''}}" 
        data-filter="all" catchtap="selectTagFilter">全部待办</view>
  <view class="dropdown-item {{currentTagFilter === 'completed' ? 'selected' : ''}}" 
        data-filter="completed" catchtap="selectTagFilter">已完成</view>
  <view class="dropdown-item {{currentTagFilter === 'uncompleted' ? 'selected' : ''}}" 
        data-filter="uncompleted" catchtap="selectTagFilter">未完成</view>
  <view class="dropdown-item {{currentTagFilter === 'none' ? 'selected' : ''}}" 
        data-filter="none" catchtap="selectTagFilter">未分类</view>
  <view class="dropdown-divider"></view>
  <!-- 标签列表 -->
</view>
```

### 步骤 2：修改 todo.js - selectTagFilter 方法

添加对新筛选值的名称映射：

```javascript
selectTagFilter(e) {
  const filter = e.currentTarget.dataset.filter;
  const allTags = app.getAllTags();
  
  let tagName = '全部待办';
  if (filter === 'completed') {
    tagName = '已完成';
  } else if (filter === 'uncompleted') {
    tagName = '未完成';
  } else if (filter === 'none') {
    tagName = '未分类';
  } else if (filter !== 'all') {
    const tag = allTags.find(t => String(t.id) === String(filter));
    if (tag) tagName = tag.name;
  }
  
  this.setData({
    currentTagFilter: filter,
    currentTagName: tagName,
    showTagDropdown: false
  });
  
  this.applyTagFilter();
}
```

### 步骤 3：修改 todo.js - applyTagFilter 方法

支持完成状态筛选：

```javascript
applyTagFilter() {
  const { allTodos, currentTagFilter } = this.data;
  
  let filteredTodos = allTodos;
  
  // 先按完成状态筛选
  if (currentTagFilter === 'completed') {
    filteredTodos = allTodos.filter(todo => todo.completed);
  } else if (currentTagFilter === 'uncompleted') {
    filteredTodos = allTodos.filter(todo => !todo.completed);
  }
  
  // 再按标签筛选
  if (currentTagFilter === 'none') {
    filteredTodos = allTodos.filter(todo => !todo.tags || todo.tags.length === 0);
  } else if (currentTagFilter !== 'all' && 
             currentTagFilter !== 'completed' && 
             currentTagFilter !== 'uncompleted') {
    filteredTodos = allTodos.filter(todo => {
      if (!todo.tags || todo.tags.length === 0) return false;
      return todo.tags.some(t => String(t) === String(currentTagFilter));
    });
  }
  
  this.setData({ todos: filteredTodos });
}
```

### 步骤 4：修改 todo.js - toggleTodo 方法

在完成状态筛选模式下，实时更新列表：

```javascript
toggleTodo(e) {
  const index = e.currentTarget.dataset.index;
  const todo = this.data.todos[index];
  const isCompleting = !todo.completed;
  const now = Date.now();
  const { currentTagFilter } = this.data;

  // 更新 allTodos
  const allTodos = this.data.allTodos.map(item =>
    item.id === todo.id ? {
      ...item,
      completed: isCompleting ? now : false,
      version: (item.version || 1) + 1,
      updatedAt: now,
      _animate: isCompleting ? 'first-complete' : ''
    } : item
  );

  // 根据筛选模式决定是否从显示列表中移除
  let todos;
  const shouldRemove = 
    (currentTagFilter === 'completed' && !isCompleting) ||
    (currentTagFilter === 'uncompleted' && isCompleting);
  
  if (shouldRemove) {
    // 从显示列表移除，带动画
    todos = this.data.todos.map((item, i) =>
      i === index ? { ...item, _animate: 'remove-animation' } : item
    );
    this.setData({ todos, allTodos });
    
    setTimeout(() => {
      const newTodos = todos.filter((_, i) => i !== index);
      this.setData({ todos: newTodos });
    }, 300);
  } else {
    // 正常更新
    todos = this.data.todos.map((item, i) =>
      i === index ? {
        ...item,
        completed: isCompleting ? now : false,
        version: (item.version || 1) + 1,
        updatedAt: now,
        _animate: isCompleting ? 'first-complete' : ''
      } : item
    );
    this.setData({ todos, allTodos });
    
    if (isCompleting) {
      setTimeout(() => {
        const updatedTodos = [...todos];
        const todoIndex = updatedTodos.findIndex(t => t.id === todo.id);
        if (todoIndex > -1) updatedTodos[todoIndex]._animate = '';
        this.setData({ todos: updatedTodos });
      }, 600);
    }
  }

  wx.setStorageSync('todos', allTodos);
  
  if (isLoggedIn()) {
    this.autoSyncToCloud();
  }
}
```

## 涉及文件

1. `pages/todo/todo.wxml` - 添加筛选选项
2. `pages/todo/todo.js` - 修改筛选和切换逻辑

## 注意事项

1. `toggleTodo` 使用的是 `todos` 数组索引，需要确保在移除项后索引正确
2. 动画效果：移除项时使用 `remove-animation`，完成后使用 `first-complete`
3. 数据同步：确保 `allTodos` 和 `todos` 数据一致性


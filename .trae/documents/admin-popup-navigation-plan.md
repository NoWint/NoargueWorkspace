# 实现计划：admin/index 页面 popup 列表项点击跳转功能

## 需求分析

在 `admin/index` 页面的 popup 弹出层中，显示各类统计数据详情列表。需要为以下类型的列表项添加点击跳转功能：

| 数据类型             | 跳转目标页面                                 | 参数传递方式                                                    |
| ---------------- | -------------------------------------- | --------------------------------------------------------- |
| user（用户）         | `/pages/admin/user-detail/user-detail` | `id={{item.id}}`                                          |
| todo（待办）         | `/pages/todo-detail/todo-detail`       | `adminView=1&todoData=...&creator=...`                    |
| combo（组合）        | `/pages/combo-detail/combo-detail`     | `adminView=1&id={{item.id}}`                              |
| sharedTodo（共享待办） | `/pages/todo-detail/todo-detail`       | `sharedTodoId={{item.id}}&comboId={{item.combo_id}}`      |
| member（成员）       | `/pages/admin/user-detail/user-detail` | `id={{item.user_id}}`                                     |
| assignment（分配记录） | `/pages/todo-detail/todo-detail`       | `sharedTodoId={{item.todo_id}}&comboId={{item.combo_id}}` |

## 实现步骤

### 步骤 1：修改 index.wxml - 添加点击事件绑定

为各类型列表项添加 `bindtap` 事件：

1. **用户列表 (user-item)**：添加 `bindtap="navigateToUserDetail" data-id="{{item.id}}"`
2. **待办列表 (todo-item)**：添加 `bindtap="navigateToTodoDetail" data-item="{{item}}"`
3. **组合列表 (combo-item)**：添加 `bindtap="navigateToComboDetail" data-item="{{item}}"`
4. **共享待办列表 (shared-todo-item)**：添加 `bindtap="navigateToSharedTodoDetail" data-item="{{item}}"`
5. **成员列表 (member-item)**：添加 `bindtap="navigateToUserDetail" data-id="{{item.user_id}}"`
6. **分配记录列表 (assignment-item)**：添加 `bindtap="navigateToSharedTodoDetail" data-item="{{item}}"`

### 步骤 2：修改 index.js - 添加跳转处理方法

添加以下导航方法：

```javascript
navigateToUserDetail(e) {
  const userId = e.currentTarget.dataset.id;
  if (userId) {
    wx.navigateTo({
      url: `/pages/admin/user-detail/user-detail?id=${userId}`
    });
  }
}

navigateToTodoDetail(e) {
  const item = e.currentTarget.dataset.item;
  if (!item) return;
  
  const todoData = {
    id: item.id,
    text: item.text,
    set_date: item.set_date,
    set_time: item.set_time,
    remarks: item.remarks,
    completed: item.completed,
    is_star: item.is_star,
    location: item.location,
    images: item.images
  };
  
  const creatorInfo = {
    nickname: item.user_name || '未知用户',
    avatar: item.user_avatar || '/images/avatar.png'
  };
  
  const todoStr = encodeURIComponent(JSON.stringify(todoData));
  const creatorStr = encodeURIComponent(JSON.stringify(creatorInfo));
  
  wx.navigateTo({
    url: `/pages/todo-detail/todo-detail?adminView=1&todoData=${todoStr}&creator=${creatorStr}`
  });
}

navigateToComboDetail(e) {
  const item = e.currentTarget.dataset.item;
  if (item && item.id) {
    wx.navigateTo({
      url: `/pages/combo-detail/combo-detail?adminView=1&id=${item.id}`
    });
  }
}

navigateToSharedTodoDetail(e) {
  const item = e.currentTarget.dataset.item;
  if (!item) return;
  
  const todoId = item.todo_id || item.id;
  const comboId = item.combo_id || item.comboId;
  
  if (todoId && comboId) {
    wx.navigateTo({
      url: `/pages/todo-detail/todo-detail?sharedTodoId=${todoId}&comboId=${comboId}`
    });
  }
}
```

### 步骤 3：修改 index.wxss - 添加点击样式（可选）

为可点击的列表项添加视觉反馈样式，如 `cursor: pointer` 效果。

## 涉及文件

1. `pages/admin/index/index.wxml` - 添加点击事件绑定
2. `pages/admin/index/index.js` - 添加导航方法
3. `pages/admin/index/index.wxss` - 添加点击样式（可选）

## 注意事项

1. 确保数据项中包含必要的 ID 字段用于跳转
2. 对于待办详情，需要正确序列化数据对象
3. 保持与现有页面参数格式一致


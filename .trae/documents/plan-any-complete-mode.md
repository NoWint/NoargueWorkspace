# "任一完成"模式实现计划

## 当前进度

### ✅ 已完成
1. 数据库迁移文件 `backend/migrations/005_add_any_assign_type.sql`
2. `backend/database.sql` 和 `backend/init-db.js` 中的枚举修改
3. 后端 `createSharedTodo` 支持 `any` 类型
4. 后端 `completeSharedTodo` 支持 `any` 类型

### ❌ 待完成
1. 后端 `updateSharedTodo` 支持 `any` 类型
2. **前端 add-todo 页面修改**
3. **前端 combo-detail 页面修改**
4. **前端 todo-detail 页面修改**
5. 后端 `setMemberRole` 支持 `any` 类型

---

## 前端实现详细步骤

### 第一步：add-todo.wxml 修改

**文件**: `pages/add-todo/add-todo.wxml`

**修改位置**: 完成方式选择器（约第109-123行）

**修改内容**:
```html
<!-- 原来的两选项改为三选项 -->
<view class="assign-type-selector">
  <view class="type-option {{assignType === 'all' ? 'active' : ''}}" bindtap="onAssignTypeChange" data-type="all">
    全员完成
  </view>
  <view class="type-option {{assignType === 'any' ? 'active' : ''}}" bindtap="onAssignTypeChange" data-type="any">
    任一完成
  </view>
  <view class="type-option {{assignType === 'specific' ? 'active' : ''}}" bindtap="onAssignTypeChange" data-type="specific">
    指定成员
  </view>
</view>
```

**免完成设置显示条件修改**（约第125行）:
```html
<!-- 原来: assignType === 'all' -->
<!-- 改为: assignType === 'all' || assignType === 'any' -->
<view wx:if="{{isSharedCombo && (assignType === 'all' || assignType === 'any') && (userRole === 'owner' || userRole === 'admin')}}">
```

---

### 第二步：add-todo.js 修改

**文件**: `pages/add-todo/add-todo.js`

**修改位置1**: `onAssignTypeChange` 函数（确保支持 `any`）

**修改位置2**: `createSharedTodo` 函数（约第484-493行）
- 确保 `assignType: 'any'` 能正确传递给后端
- 确保 `excludeType` 对 `any` 类型也能生效

**修改位置3**: `updateSharedTodo` 函数
- 同上

---

### 第三步：combo-detail.js 修改

**文件**: `pages/combo-detail/combo-detail.js`

**修改位置**: `loadComboData` 函数中的待办处理逻辑（约第93-154行）

**修改内容**:
```javascript
const assignType = todo.assignType || todo.assign_type;
const excludeType = todo.excludeType || todo.exclude_type || '';
const creatorId = todo.creator?.id || todo.creator_id;

let shouldShowRadio = false;
let isExcluded = false;

if (assignType === 'specific') {
  // 指定成员：只有被分配的人能完成
  shouldShowRadio = isAssigned;
} else {
  // all 或 any：根据免完成设置判断
  const isOwner = combo.userRole === 'owner';
  const isAdmin = combo.userRole === 'admin';
  const isCreator = String(currentUserId) === String(creatorId);
  
  if (excludeType === 'owner' && isOwner) {
    isExcluded = true;
  } else if (excludeType === 'self' && isCreator) {
    isExcluded = true;
  } else if (excludeType === 'admins' && (isOwner || isAdmin)) {
    isExcluded = true;
  }
  
  shouldShowRadio = !isExcluded;
}
```

---

### 第四步：combo-detail.wxml 修改

**文件**: `pages/combo-detail/combo-detail.wxml`

**修改位置**: 待办描述显示区域

**修改内容**: 根据 `assignType` 显示不同标签
```html
<view class="assign-info">
  <text wx:if="{{item.assignType === 'all'}}">全员完成</text>
  <text wx:elif="{{item.assignType === 'any'}}">
    任一完成
    <text wx:if="{{item.completedAt}}"> - {{item.completedByName}}完成</text>
  </text>
  <text wx:else>指定{{item.assignCount}}人</text>
</view>
```

---

### 第五步：todo-detail 页面修改

**文件**: `pages/todo-detail/todo-detail.js` 和 `pages/todo-detail/todo-detail.wxml`

**修改内容**: 
- 显示"任一完成"标签
- 显示完成人信息（如果有）

---

### 第六步：后端 updateSharedTodo 修改

**文件**: `backend/controllers/collabController.js`

**修改位置**: `updateSharedTodo` 函数（约第768-823行）

**修改内容**:
```javascript
// 修改这行，让 any 类型也支持 excludeType
const effectiveExcludeType = (assignType === 'all' || assignType === 'any') ? (excludeType || '') : '';

// 添加 any 类型的分配逻辑
if (assignType === 'all' || assignType === 'any') {
  // 删除旧分配
  await query('DELETE FROM shared_todo_assignments WHERE shared_todo_id = ?', [todoId]);
  
  // 获取成员并过滤免完成的人
  let allMembers = await query(
    'SELECT user_id, role FROM combo_members WHERE combo_id = ?',
    [comboId]
  );
  
  if (excludeType) {
    allMembers = allMembers.filter(m => {
      if (excludeType === 'owner' && m.role === 'owner') return false;
      if (excludeType === 'self' && m.user_id === userId) return false;
      if (excludeType === 'admins' && (m.role === 'owner' || m.role === 'admin')) return false;
      return true;
    });
  }
  
  // 插入新分配
  const assignValues = allMembers.map(m => [todoId, m.user_id]);
  if (assignValues.length > 0) {
    await query(
      'INSERT INTO shared_todo_assignments (shared_todo_id, user_id) VALUES ?',
      [assignValues]
    );
  }
}
```

---

## 实现顺序

1. **后端 updateSharedTodo** - 确保编辑功能正常
2. **前端 add-todo.wxml** - 添加"任一完成"选项
3. **前端 add-todo.js** - 支持新类型
4. **前端 combo-detail.js** - 正确显示完成按钮
5. **前端 combo-detail.wxml** - 显示"任一完成"标签
6. **前端 todo-detail** - 详情页适配
7. **后端 setMemberRole** - 角色变更处理

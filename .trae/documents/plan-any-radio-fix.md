# "任一完成"模式 radio 显示修复计划

## 问题描述

"任一完成"模式下，当一个人完成后：
1. 整个待办已标记完成（`completedAt` 有值）
2. 但其他人的 radio 仍然显示并可操作
3. 导致出现第二个完成人

## 解决方案

在 `combo-detail.js` 的 `shouldShowRadio` 判断中，对 `any` 类型增加已完成检查：

- `any` 类型：如果 `completedAt` 有值（已有人完成），则不显示 radio
- `all` 类型：保持原有逻辑（所有人都要完成，radio 始终显示）

## 修改文件

### `pages/combo-detail/combo-detail.js`

修改 `loadComboData` 函数中的 `shouldShowRadio` 判断逻辑：

```javascript
if (assignType === 'specific') {
  isAssigned = assignments.some(a => String(a.userId) === String(currentUserId));
  shouldShowRadio = isAssigned;
} else {
  isAssigned = true;
  const isOwner = combo.userRole === 'owner';
  const isAdmin = combo.userRole === 'admin';
  const isCreator = String(currentUserId) === String(creatorId);
  
  // 任一完成模式：如果已有人完成，不显示 radio
  if (assignType === 'any' && (todo.completedAt || todo.completed_at)) {
    shouldShowRadio = false;
  } else if (excludeType === 'owner' && isOwner) {
    shouldShowRadio = false;
  } else if (excludeType === 'self' && isCreator) {
    shouldShowRadio = false;
  } else if (excludeType === 'admins' && (isOwner || isAdmin)) {
    shouldShowRadio = false;
  } else {
    shouldShowRadio = true;
  }
}
```

## 实现步骤

1. 修改 `combo-detail.js` 的 `shouldShowRadio` 判断逻辑

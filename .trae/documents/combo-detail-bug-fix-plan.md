# combo-detail 页面 BUG 修复计划

## 问题分析

### 1. 待办只能完成，无法取消完成

**问题原因**: `toggleTodo` 方法逻辑正确，但可能是 t-radio 组件的 `checked` 属性绑定问题或事件冒泡被阻止。

**解决方案**:

* 检查 t-radio 的 `checked` 绑定是否正确使用 `!!item.completed` 确保布尔值

* 确保 `catch:change` 事件能正确触发

### 2. 卡片左右外边距太大

**问题原因**:

* todo 页使用 `margin: 12rpx 20rpx`

* combo-detail 的 `.todos-section` 有 `padding: 24rpx`，导致双重边距

**解决方案**:

* 移除 `.todos-section` 的 padding，改为在卡片上设置 margin

* 参考 todo 页样式：`margin: 12rpx 20rpx`

### 3. 点击卡片要能查看详情

**问题原因**: `navigateToDetail` 方法已存在，但需要确保：

* todo-detail 页能正确接收 `index` 参数

* 从组合页跳转时能正确计算全局索引

**解决方案**:

* 确保 `navigateToDetail` 传递正确的全局索引

* todo-detail 页已有处理逻辑，无需修改

### 4. 从组合页添加待办应传入所在组合

**问题原因**: `addTodoToCombo` 已传入 `comboId` 和 `isShared`，但 add-todo 页面的 `loadCombos` 在设置 `selectedCombo` 时可能未正确匹配

**解决方案**:

* 确保 add-todo 页面在 `onLoad` 后正确设置 `selectedCombo`

* 检查 `loadCombos` 方法中的 ID 匹配逻辑

### 5. 待办卡片时间显示未格式化

**问题原因**: 目前直接显示 `setDate`（如 "2025-04-03"），未做格式化处理

**解决方案**:

* 在 `loadComboData` 中格式化日期显示

* 或在 wxml 中使用 WXS 进行格式化

***

## 修改文件清单

### 1. combo-detail.js

* 检查 `toggleTodo` 方法确保取消完成功能正常

* 在 `loadComboData` 中添加日期格式化

* 确保 `addTodoToCombo` 传递完整参数

### 2. combo-detail.wxml

* 确认 t-radio 的 checked 绑定正确

* 使用格式化后的日期字段显示

### 3. combo-detail.wxss

* 调整卡片外边距，参考 todo 页样式

### 4. add-todo.js

* 确保 `loadCombos` 正确设置 `selectedCombo`

***

## 实施步骤

1. 修复 combo-detail.wxss 卡片外边距问题
2. 修复 combo-detail.js 日期格式化
3. 检查并修复 toggleTodo 方法
4. 修复 add-todo.js 组合预选问题
5. 测试验证所有功能


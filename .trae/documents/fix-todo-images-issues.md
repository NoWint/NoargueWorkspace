# 待办图片功能问题修复计划

## 问题分析

### 问题1：add-todo添加完后，todo-detail页不显示图片卡片 ✅ 已修复

**根本原因**：

1. `pages/todo/todo.js` 的 `addTodoFromChild` 方法没有接收 `images` 参数
2. `pages/todo-detail/todo-detail.js` 中 images 处理逻辑有问题

**修复内容**：

* 修改 `todo.js` 第768行的方法签名，添加 `images` 参数

* 在 `newTodo` 对象中添加 `images: images || []`

* 修改 `todo-detail.js` 的 onLoad 和 onShow 方法，正确处理数组和字符串两种格式

### 问题2：combo创建时选择已有待办，是否会附带images字段 ✅ 无需修复

**结论**：选择已有待办只关联 comboId，images 字段会自动保留，无需额外处理

### 问题3：勾选多张图片时经常上传失败报错 ✅ 已修复

**根本原因**：

* 使用 `Promise.all` 并行上传，图床API可能有并发限制

* 没有错误重试机制

**修复内容**：

* 改为串行上传（逐个上传）

* 添加上传进度显示（上传中 1/3）

* 添加错误重试机制（最多重试2次）

* 失败时显示具体哪张图片失败

### 问题4：点击上传时没有弹出actionsheet ✅ 已修复

**根本原因**：

* TDesign Upload 组件默认不显示选择来源

**修复内容**：

* 添加 `source="media"` 属性，支持从聊天记录选择图片

## 文件修改清单

| 文件                                 | 修改内容                            | 状态 |
| ---------------------------------- | ------------------------------- | -- |
| `pages/todo/todo.js`               | addTodoFromChild 方法添加 images 参数 | ✅  |
| `pages/todo-detail/todo-detail.js` | 修复 images 解析逻辑                  | ✅  |
| `pages/add-todo/add-todo.js`       | 改进上传机制，添加重试                     | ✅  |
| `pages/add-todo/add-todo.wxml`     | 添加 source="media" 属性            | ✅  |


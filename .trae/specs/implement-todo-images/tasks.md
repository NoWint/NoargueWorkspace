# Tasks

- [x] Task 1: 数据库迁移 - 添加 images 字段
  - [x] SubTask 1.1: 创建数据库迁移文件 `backend/migrations/007_add_images_field.sql`
  - [x] SubTask 1.2: 更新 `backend/database.sql` 添加 images 字段定义

- [x] Task 2: 后端 API 支持 images 字段
  - [x] SubTask 2.1: 更新 `backend/controllers/todoController.js` - create/update/sync 方法支持 images
  - [x] SubTask 2.2: 更新 `backend/controllers/collabController.js` - createSharedTodo/updateSharedTodo 支持 images
  - [x] SubTask 2.3: 更新 formatTodo 函数处理 images 字段

- [x] Task 3: 前端 add-todo 页面图片上传功能
  - [x] SubTask 3.1: 在 `pages/add-todo/add-todo.json` 引入 t-upload 组件
  - [x] SubTask 3.2: 更新 `pages/add-todo/add-todo.wxml` 添加图片上传区域
  - [x] SubTask 3.3: 更新 `pages/add-todo/add-todo.js` 实现图片上传逻辑
  - [x] SubTask 3.4: 更新 `pages/add-todo/add-todo.wxss` 添加图片上传区域样式
  - [x] SubTask 3.5: 实现图片上传到第三方图床 `https://img.scdn.io/api/v1.php`
  - [x] SubTask 3.6: 添加图床提示文案"图片由第三方图床托管，单张图片连续60天未访问则自动清理"

- [x] Task 4: 前端 todo-detail 页面图片展示功能
  - [x] SubTask 4.1: 更新 `pages/todo-detail/todo-detail.wxml` 添加图片展示卡片
  - [x] SubTask 4.2: 更新 `pages/todo-detail/todo-detail.js` 实现图片预览逻辑
  - [x] SubTask 4.3: 更新 `pages/todo-detail/todo-detail.wxss` 添加图片网格布局样式
  - [x] SubTask 4.4: 实现自适应布局（1/2/3列，2x2，3x2，3x3）

- [x] Task 5: 数据导入导出支持 images 字段
  - [x] SubTask 5.1: 更新 `pages/datamanage/datamanage.js` generateExport 方法包含 images
  - [x] SubTask 5.2: 更新 handleImport 方法解析 images 字段

- [x] Task 6: 编辑待办时图片数据传递
  - [x] SubTask 6.1: 更新 todo-detail 页面 editTodo 方法传递 images 参数
  - [x] SubTask 6.2: 更新 add-todo 页面 onLoad 方法接收并处理 images 参数
  - [x] SubTask 6.3: 更新 updateTodo 和 updateSharedTodo 方法保存 images

- [x] Task 7: 共享待办图片功能
  - [x] SubTask 7.1: 更新 add-todo 页面 createSharedTodo 方法支持 images
  - [x] SubTask 7.2: 更新 todo-detail 页面 loadSharedTodo 方法加载 images

# Task Dependencies
- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 1]
- [Task 4] depends on [Task 1]
- [Task 6] depends on [Task 3, Task 4]
- [Task 7] depends on [Task 2, Task 3]

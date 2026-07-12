# Tasks

## Phase 1: 后端基础设施

- [x] Task 1: 创建后端数据文件目录和初始数据文件
  - [x] SubTask 1.1: 创建 `backend/data/` 目录
  - [x] SubTask 1.2: 创建 `backend/data/changelog.json`，将现有 changelogList 数据迁移过去
  - [x] SubTask 1.3: 创建 `backend/data/notices.json`，将现有 noticesRaw 数据迁移过去
  - [x] SubTask 1.4: 创建管理员ID配置文件 `backend/data/admins.json`

- [x] Task 2: 重构 configController.js
  - [x] SubTask 2.1: 修改 configController.js 从数据文件读取 changelog 和 notices
  - [x] SubTask 2.2: 保持原有接口响应格式不变

- [x] Task 3: 创建后台管理控制器和路由
  - [x] SubTask 3.1: 创建 `backend/controllers/adminController.js`
  - [x] SubTask 3.2: 创建 `backend/routes/adminRoutes.js`
  - [x] SubTask 3.3: 在 app.js 中注册路由
  - [x] SubTask 3.4: 实现管理员权限验证中间件

- [x] Task 4: 实现后台管理 API 接口
  - [x] SubTask 4.1: 实现获取统计数据接口 `GET /admin/stats`
  - [x] SubTask 4.2: 实现用户列表接口 `GET /admin/users`
  - [x] SubTask 4.3: 实现用户详情接口 `GET /admin/users/:id`
  - [x] SubTask 4.4: 实现修改用户上限接口 `PUT /admin/users/:id/limits`
  - [x] SubTask 4.5: 实现公告 CRUD 接口
  - [x] SubTask 4.6: 实现更新日志 CRUD 接口
  - [x] SubTask 4.7: 实现数据库表浏览接口 `GET /admin/tables`

## Phase 2: 前端页面开发

- [x] Task 5: 在 more 页添加后台管理入口
  - [x] SubTask 5.1: 修改 `more.wxml` 添加后台管理入口（条件显示）
  - [x] SubTask 5.2: 修改 `more.js` 添加管理员判断逻辑
  - [x] SubTask 5.3: 在 app.json 中注册后台管理页面

- [x] Task 6: 创建后台管理主页
  - [x] SubTask 6.1: 创建 `pages/admin/index/` 目录和文件
  - [x] SubTask 6.2: 实现统计概览展示
  - [x] SubTask 6.3: 实现快捷入口卡片

- [x] Task 7: 创建用户管理页面
  - [x] SubTask 7.1: 创建 `pages/admin/users/` 用户列表页面
  - [x] SubTask 7.2: 实现用户搜索功能
  - [x] SubTask 7.3: 实现分页加载

- [x] Task 8: 创建用户详情页面
  - [x] SubTask 8.1: 创建 `pages/admin/user-detail/` 用户详情页面
  - [x] SubTask 8.2: 实现基本信息展示
  - [x] SubTask 8.3: 实现上限修改功能
  - [x] SubTask 8.4: 实现待办列表展示（只读）
  - [x] SubTask 8.5: 实现组合列表展示

- [x] Task 9: 创建公告管理页面
  - [x] SubTask 9.1: 创建 `pages/admin/notices/` 公告列表页面
  - [x] SubTask 9.2: 创建 `pages/admin/notice-edit/` 公告编辑页面
  - [x] SubTask 9.3: 实现公告 CRUD 功能

- [x] Task 10: 创建更新日志管理页面
  - [x] SubTask 10.1: 创建 `pages/admin/changelog/` 更新日志列表页面
  - [x] SubTask 10.2: 创建 `pages/admin/changelog-edit/` 更新日志编辑页面
  - [x] SubTask 10.3: 实现更新日志 CRUD 功能（支持分点编辑）

## Phase 3: 整合与测试

- [x] Task 11: 前端 API 对接
  - [x] SubTask 11.1: 在 `utils/api.js` 中添加后台管理 API 方法
  - [x] SubTask 11.2: 各页面对接对应 API

- [x] Task 12: 测试与验证
  - [x] SubTask 12.1: 测试管理员权限判断
  - [x] SubTask 12.2: 测试用户管理功能
  - [x] SubTask 12.3: 测试公告管理功能
  - [x] SubTask 12.4: 测试更新日志管理功能

# Task Dependencies
- [Task 2] depends on [Task 1]
- [Task 4] depends on [Task 3]
- [Task 5] depends on [Task 4]
- [Task 6] depends on [Task 5]
- [Task 7] depends on [Task 6]
- [Task 8] depends on [Task 7]
- [Task 9] depends on [Task 6]
- [Task 10] depends on [Task 6]
- [Task 11] depends on [Task 6, Task 7, Task 8, Task 9, Task 10]
- [Task 12] depends on [Task 11]

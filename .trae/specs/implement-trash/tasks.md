# Tasks

- [x] Task 1: 创建回收站页面
  - [x] Task 1.1: 创建 pages/trash/trash.wxml 页面结构
  - [x] Task 1.2: 创建 pages/trash/trash.wxss 样式文件
  - [x] Task 1.3: 创建 pages/trash/trash.js 逻辑文件
  - [x] Task 1.4: 创建 pages/trash/trash.json 配置文件
  - [x] Task 1.5: 在 app.json 中注册回收站页面

- [x] Task 2: 实现回收站功能逻辑
  - [x] Task 2.1: 加载已删除待办列表（从 storage 读取 isDeleted=true）
  - [x] Task 2.2: 显示删除时间、剩余天数计算
  - [x] Task 2.3: 实现恢复待办功能
  - [x] Task 2.4: 实现永久删除功能（含二次确认弹窗）

- [x] Task 3: 修改删除弹窗提示
  - [x] Task 3.1: 修改 todo.js 删除弹窗文案
  - [x] Task 3.2: 修改 calendar.js 删除弹窗文案
  - [x] Task 3.3: 修改 combo-detail.js 删除弹窗文案

- [x] Task 4: 添加回收站入口
  - [x] Task 4.1: 在 more.wxml 添加回收站入口
  - [x] Task 4.2: 在 more.js 添加跳转逻辑

- [x] Task 5: 同步支持
  - [x] Task 5.1: 恢复待办时更新 updatedAt 并同步
  - [x] Task 5.2: 永久删除时从云端也删除

# Task Dependencies
- [Task 2] depends on [Task 1]
- [Task 5] depends on [Task 2]

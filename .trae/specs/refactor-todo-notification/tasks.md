# Tasks

* [x] Task 1: 移除 add-todo 页面通知相关代码

  * [x] SubTask 1.1: 移除 add-todo.js 中的通知数据字段（enableNotify, notifyTime）和方法（toggleNotify, onNotifyTimeChange）

  * [x] SubTask 1.2: 移除 add-todo.wxml 中的通知设置 UI（开关、时间选择器）

  * [x] SubTask 1.3: 移除 add-todo.wxss 中的通知相关样式（switch-row, switch-info, switch-hint, hint）

* [x] Task 2: 在 todo-detail 页面添加通知卡片

  * [x] SubTask 2.1: 在 todo-detail.wxml 添加通知卡片 UI（位于截止时间卡片下方）

  * [x] SubTask 2.2: 在 todo-detail.wxss 添加通知卡片样式

  * [x] SubTask 2.3: 在 todo-detail.js 添加通知相关数据字段和方法

* [x] Task 3: 实现通知设置弹窗

  * [x] SubTask 3.1: 添加 t-popup 弹窗组件和日期偏移选择器（当天/前一天/前X天）

  * [x] SubTask 3.2: 添加时间选择器（15分钟进位制，默认09:00）

  * [x] SubTask 3.3: 实现日期时间校验逻辑（不早于当前时间）

  * [x] SubTask 3.4: 实现保存通知逻辑

* [x] Task 4: 完善前端通知 API

  * [x] SubTask 4.1: 在 api.js 中添加获取待办通知接口

  * [x] SubTask 4.2: 在 api.js 中添加更新通知接口

  * [x] SubTask 4.3: 添加微信订阅消息授权调用

* [x] Task 5: 完善后端通知控制器

  * [x] SubTask 5.1: 完善 subscribe 接口保存用户订阅状态

  * [x] SubTask 5.2: 添加获取待办通知接口

  * [x] SubTask 5.3: 添加更新通知接口

  * [x] SubTask 5.4: 添加用户表订阅状态字段

* [x] Task 6: 实现微信订阅消息发送服务

  * [x] SubTask 6.1: 创建 wechatService.js，实现 access\_token 获取和缓存

  * [x] SubTask 6.2: 实现订阅消息发送函数

  * [x] SubTask 6.3: 添加定时任务检查并发送到期通知

# Task Dependencies

* \[Task 2] depends on \[Task 1]

* \[Task 3] depends on \[Task 2]

* \[Task 4] depends on \[Task 3]

* \[Task 5] depends on \[Task 4]

* \[Task 6] depends on \[Task 5]


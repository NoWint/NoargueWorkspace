# Checklist

## 前端修改
- [x] add-todo.js 已移除 enableNotify 和 notifyTime 数据字段
- [x] add-todo.js 已移除 toggleNotify 和 onNotifyTimeChange 方法
- [x] add-todo.wxml 已移除通知开关和时间选择器 UI
- [x] add-todo.wxss 已移除通知相关样式代码
- [x] todo-detail.wxml 已添加通知卡片（位于截止时间卡片下方）
- [x] todo-detail.wxml 已添加通知设置弹窗（t-popup）
- [x] todo-detail.wxss 已添加通知卡片样式
- [x] todo-detail.js 已添加通知相关数据和方法
- [x] 通知弹窗支持日期偏移选择（当天/前一天/前X天）
- [x] 通知弹窗支持时间选择（15分钟进位制，默认09:00）
- [x] 日期时间校验逻辑正确（不早于当前时间）
- [x] 通知保存后正确同步到云端并更新页面
- [x] 通知修改功能正常工作
- [x] 通知取消功能正常工作（含确认弹窗）

## 前端 API
- [x] api.js 已添加获取待办通知接口
- [x] api.js 已添加更新通知接口
- [x] 已添加微信订阅消息授权调用（wx.requestSubscribeMessage）

## 后端修改
- [x] notifyController.js subscribe 接口已完善（保存订阅状态）
- [x] notifyController.js 已添加获取待办通知接口
- [x] notifyController.js 已添加更新通知接口
- [x] 数据库用户表已添加订阅状态字段
- [x] wechatService.js 已创建并实现 access_token 管理
- [x] wechatService.js 已实现订阅消息发送函数
- [x] 定时任务已添加（检查并发送到期通知）

## 微信订阅消息
- [x] 使用正确的模板 ID: 1jvRWbLBNSasPzKtUnrQEiVrU6hj2IWwhKNq2u8jjWg
- [x] 模板内容正确映射（待办内容、提醒时间、截止日期、地点、备注）
- [x] access_token 正确获取和缓存
- [x] 订阅消息正确发送

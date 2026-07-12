# 共享待办通知推送功能完善计划

## 需求概述

完善共享待办的消息推送功能，使用新的模板发送通知。

## 模板信息

* **模板ID**: `1jvRWbLBNSasPzKtUnrQEviO7vwbWCChJJr0z24an-Y`

* **模板编号**: 15788

* **标题**: 待办事项提醒

### 模板字段

| 字段名     | 说明         | 示例值               |
| ------- | ---------- | ----------------- |
| thing1  | 待办内容       | 完成项目报告            |
| thing14 | 发起人        | 张三                |
| time2   | 截止日期       | 2025年03月15日 14:00 |
| thing28 | 待办来源（组合名称） | 工作计划              |
| thing13 | 备注         | 请按时完成             |

## 当前问题

1. `wechatService.js` 中没有共享待办通知的发送函数
2. 没有定时处理 `shared_todo_notifications` 表的逻辑
3. 缺少跳转页面路径

## 实现步骤

### 1. 修改 `backend/services/wechatService.js`

#### 1.1 添加共享待办模板ID

```javascript
const SHARED_TODO_TEMPLATE_ID = '1jvRWbLBNSasPzKtUnrQEviO7vwbWCChJJr0z24an-Y';
```

#### 1.2 添加发送共享待办通知函数

```javascript
async function sendSharedTodoMessage(openid, data) {
  const accessToken = await getAccessToken();
  
  let page = 'pages/todo/todo';
  if (data.sharedTodoId && data.comboId) {
    page = `pages/todo-detail/todo-detail?sharedTodoId=${data.sharedTodoId}&comboId=${data.comboId}`;
  }
  
  const messageData = {
    touser: openid,
    template_id: SHARED_TODO_TEMPLATE_ID,
    page: page,
    data: {
      thing1: { value: (data.todoText || '待办事项').substring(0, 20) },
      thing14: { value: (data.creator || '用户').substring(0, 10) },
      time2: { value: data.deadline || '' },
      thing28: { value: (data.comboName || '共享组合').substring(0, 20) },
      thing13: { value: (data.remarks || '无').substring(0, 20) }
    }
  };
  
  // 发送逻辑...
}
```

#### 1.3 添加处理共享待办通知的定时任务

```javascript
async function processPendingSharedNotifications() {
  const notifications = await query(
    `SELECT n.*, u.openid, st.text as todo_text, st.set_date, st.set_time, 
            st.remarks, st.creator_id, c.name as combo_name, c.id as combo_id,
            cr.nickname as creator_name
     FROM shared_todo_notifications n
     LEFT JOIN users u ON n.user_id = u.id
     LEFT JOIN shared_todos st ON n.shared_todo_id = st.id
     LEFT JOIN combos c ON st.combo_id = c.id
     LEFT JOIN users cr ON st.creator_id = cr.id
     WHERE n.is_sent = 0 
       AND n.notify_time <= DATE_ADD(NOW(), INTERVAL 5 MINUTE)
       AND u.openid IS NOT NULL
     ORDER BY n.notify_time ASC
     LIMIT 100`
  );
  
  for (const notification of notifications) {
    // 处理并发送通知...
  }
}
```

#### 1.4 在调度器中添加共享待办通知处理

```javascript
function startNotificationScheduler() {
  setInterval(async () => {
    await processPendingNotifications();
    await processPendingSharedNotifications();
  }, 60000);
}
```

#### 1.5 更新导出

```javascript
module.exports = {
  getAccessToken,
  sendSubscribeMessage,
  sendSharedTodoMessage,
  sendApprovalResultMessage,
  processPendingNotifications,
  processPendingSharedNotifications,
  startNotificationScheduler
};
```

### 2. 修改 `backend/controllers/notifyController.js`

确保 `scheduleShared` 等方法正确工作（已存在，无需修改）。

### 3. 前端已实现

前端 `todo-detail.js` 已正确调用 `notifyApi.scheduleShared`，无需修改。

## 跳转路径

| 场景     | 跳转页面                                                                |
| ------ | ------------------------------------------------------------------- |
| 共享待办提醒 | `pages/todo-detail/todo-detail?sharedTodoId={id}&comboId={comboId}` |

## 文件修改清单

| 文件                                  | 修改内容                  |
| ----------------------------------- | --------------------- |
| `backend/services/wechatService.js` | 添加模板ID、发送函数、处理函数、调度逻辑 |


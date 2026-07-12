# 审批结果通知功能实现计划

## 需求概述

1. 用户在 join-collab 页发送/重新发送申请后，询问是否需要接收审批结果提醒
2. 超管/管理员审批通过/拒绝时，向后端发送消息推送请求
3. 后端接收后立即推送消息至申请人

## 消息模板信息

* **模板ID**: `LenG38LPKm6kK4ymXx4Ftoc9LoN2f7xXh7qJ-U-myxA`

* **模板编号**: 8295

* **标题**: 审批结果通知

### 模板字段

| 字段名     | 说明   | 示例值               |
| ------- | ---- | ----------------- |
| thing28 | 审批事项 | 申请加入「工作计划」        |
| time52  | 申请时间 | 2025年03月14日 15:30 |
| time26  | 审批时间 | 2025年03月14日 16:00 |
| phrase1 | 审批结果 | 已通过 / 未通过         |
| name2   | 审批人  | 张三                |

## 实现步骤

### 1. 前端修改

#### 1.1 join-collab.js - 发送申请后询问订阅

修改 `sendRequest` 方法，在申请发送成功后询问用户是否订阅审批结果通知：

```javascript
async sendRequest() {
  // ... 现有代码 ...
  
  try {
    await collabApi.sendRequest(shareCode);
    wx.hideLoading();
    
    this.setData({
      'comboInfo.hasPendingRequest': true,
      'comboInfo.hasRejectedRequest': false
    });
    
    // 询问是否订阅审批结果通知
    this.askSubscribeApprovalResult();
    
  } catch (err) {
    // ... 错误处理 ...
  }
}

async askSubscribeApprovalResult() {
  const templateId = 'LenG38LPKm6kK4ymXx4Ftoc9LoN2f7xXh7qJ-U-myxA';
  
  wx.showModal({
    title: '订阅审批结果',
    content: '是否接收审批结果通知？审批通过或拒绝后，您将第一时间收到消息提醒。',
    confirmText: '订阅通知',
    cancelText: '暂不需要',
    success: async (res) => {
      if (res.confirm) {
        try {
          // 先请求订阅权限
          const subscribeRes = await wx.requestSubscribeMessage({
            tmplIds: [templateId]
          });
          
          if (subscribeRes[templateId] === 'accept') {
            // 用户同意订阅，调用后端记录订阅
            await notifyApi.subscribe([templateId]);
            wx.showToast({ title: '订阅成功', icon: 'success' });
          } else {
            wx.showToast({ title: '已取消订阅', icon: 'none' });
          }
        } catch (err) {
          console.error('订阅失败:', err);
        }
      }
    }
  });
}
```

#### 1.2 todo.js - 审批时发送通知

修改 `approveRequest` 和 `rejectRequest` 方法：

```javascript
async approveRequest(e) {
  const requestId = e.currentTarget.dataset.id;
  const comboId = e.currentTarget.dataset.comboId;
  const { approvalGroups } = this.data;
  
  // 获取请求信息
  const group = approvalGroups.find(g => String(g.combo.id) === String(comboId));
  const request = group?.requests.find(r => r.id === requestId);
  
  this.setData({ approvalLoading: true });
  
  try {
    await collabApi.approveRequest(requestId);
    wx.showToast({ title: '已通过', icon: 'success' });
    
    // 发送审批结果通知
    await this.sendApprovalNotification({
      comboName: group?.combo?.name,
      applicantId: request?.userId || request?.user_id,
      requestTime: request?.createdAt || request?.created_at,
      approved: true
    });
    
    // ... 更新列表 ...
  } catch (err) {
    // ...
  }
}

async sendApprovalNotification({ comboName, applicantId, requestTime, approved }) {
  try {
    const userInfo = app.globalData.userInfo || wx.getStorageSync('user') || {};
    const now = new Date();
    const formatTime = (date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      const h = String(date.getHours()).padStart(2, '0');
      const min = String(date.getMinutes()).padStart(2, '0');
      return `${y}年${m}月${d}日 ${h}:${min}`;
    };
    
    await notifyApi.sendApprovalResult({
      templateId: 'LenG38LPKm6kK4ymXx4Ftoc9LoN2f7xXh7qJ-U-myxA',
      toUserId: applicantId,
      data: {
        thing28: { value: `申请加入「${comboName || '协作组'}」` },
        time52: { value: formatTime(new Date(requestTime)) },
        time26: { value: formatTime(now) },
        phrase1: { value: approved ? '已通过' : '未通过' },
        name2: { value: userInfo.nickname || '管理员' }
      }
    });
  } catch (err) {
    console.error('发送审批通知失败:', err);
  }
}
```

#### 1.3 collaboration.js - 同样修改审批方法

与 todo.js 类似的修改。

#### 1.4 combo-detail.js - 同样修改审批方法

与 todo.js 类似的修改。

### 2. API 修改 (utils/api.js)

添加发送审批结果通知的 API：

```javascript
const notifyApi = {
  // ... 现有方法 ...
  
  sendApprovalResult: (data) => request({
    url: '/notify/approval-result',
    method: 'POST',
    data
  })
};
```

### 3. 后端修改 (需要后端配合)

#### 3.1 新增 API 接口

```
POST /notify/approval-result
```

请求体：

```json
{
  "templateId": "LenG38LPKm6kK4ymXx4Ftoc9LoN2f7xXh7qJ-U-myxA",
  "toUserId": 123,
  "data": {
    "thing28": { "value": "申请加入「工作计划」共享组合" },
    "time52": { "value": "2025年03月14日 15:30" },
    "time26": { "value": "2025年03月14日 16:00" },
    "phrase1": { "value": "已通过" },
    "name2": { "value": "张三" }
  }
}
```

#### 3.2 后端实现逻辑

1. 接收请求参数
2. 根据 `toUserId` 查找用户的 openid
3. 调用微信订阅消息发送接口
4. 记录发送日志

## 文件修改清单

| 文件                                     | 修改内容                                                                   |
| -------------------------------------- | ---------------------------------------------------------------------- |
| `pages/join-collab/join-collab.js`     | 添加 `askSubscribeApprovalResult` 方法，修改 `sendRequest`                    |
| `pages/todo/todo.js`                   | 添加 `sendApprovalNotification` 方法，修改 `approveRequest` 和 `rejectRequest` |
| `pages/collaboration/collaboration.js` | 同上                                                                     |
| `pages/combo-detail/combo-detail.js`   | 同上                                                                     |
| `utils/api.js`                         | 添加 `sendApprovalResult` API                                            |

## 注意事项

1. 订阅消息需要用户主动触发，不能自动订阅
2. 模板字段有字数限制，需要确保内容不超过限制
3. 审批结果 `phrase1` 只能是"已通过"或"未通过"等简短文字
4. 如果用户未订阅，后端应该跳过发送，不报错
5. 需要处理网络错误，审批操作本身不应因通知发送失败而中断


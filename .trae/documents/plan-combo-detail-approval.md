# combo-detail 页面添加审批功能计划

## 功能需求

在 combo-detail 页面的邀请码下方，对超管/管理员显示待审批申请列表，风格与该页一致。

## 参考

参考 `pages/collaboration/collaboration.js` 和 `pages/collaboration/collaboration.wxml` 的审批实现。

## 修改方案

### 1. combo-detail.js

**新增 data 字段**：
```javascript
data: {
  // ... 现有字段
  requests: [],  // 待审批申请列表
}
```

**修改 loadComboData 函数**：
在加载组合数据时，同时获取待审批申请：
```javascript
// 在 loadComboData 函数中添加
if (combo.userRole === 'owner' || combo.userRole === 'admin') {
  const requestsResult = await collabApi.getRequests(id);
  const requests = requestsResult.requests || requestsResult || [];
  this.setData({ requests });
}
```

**新增方法**：
```javascript
async approveRequest(e) {
  const requestId = e.currentTarget.dataset.id;
  try {
    await collabApi.approveRequest(requestId);
    wx.showToast({ title: '已通过', icon: 'success' });
    this.loadComboData(this.data.comboId);
  } catch (err) {
    wx.showToast({ title: err.message || '操作失败', icon: 'none' });
  }
},

async rejectRequest(e) {
  const requestId = e.currentTarget.dataset.id;
  try {
    await collabApi.rejectRequest(requestId);
    wx.showToast({ title: '已拒绝', icon: 'success' });
    this.loadComboData(this.data.comboId);
  } catch (err) {
    wx.showToast({ title: err.message || '操作失败', icon: 'none' });
  }
}
```

### 2. combo-detail.wxml

**在邀请码下方添加审批区域**（约第44行后）：
```html
<view wx:if="{{isShared && requests.length > 0 && (userRole === 'owner' || userRole === 'admin')}}" class="requests-section">
  <view class="section-header">
    <text class="section-title">待审批 · {{requests.length}}人</text>
  </view>
  <view class="request-list">
    <view class="request-item" wx:for="{{requests}}" wx:key="id">
      <image class="request-avatar" src="{{item.avatarUrl || '/images/avatar.png'}}" />
      <view class="request-info">
        <text class="request-name">{{item.nickname || '用户'}}</text>
        <text class="request-time">{{item.createdAt}}</text>
      </view>
      <view class="request-actions">
        <view class="action-btn approve" data-id="{{item.id}}" bindtap="approveRequest">通过</view>
        <view class="action-btn reject" data-id="{{item.id}}" bindtap="rejectRequest">拒绝</view>
      </view>
    </view>
  </view>
</view>
```

### 3. combo-detail.wxss

**新增样式**：
```css
.requests-section {
  margin-bottom: 20rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}

.request-list {
  margin-top: 16rpx;
}

.request-item {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.request-item:last-child {
  border-bottom: none;
}

.request-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  margin-right: 16rpx;
}

.request-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.request-name {
  font-size: 28rpx;
  color: #333;
}

.request-time {
  font-size: 22rpx;
  color: #999;
  margin-top: 4rpx;
}

.request-actions {
  display: flex;
  gap: 16rpx;
}

.action-btn {
  padding: 8rpx 24rpx;
  border-radius: 24rpx;
  font-size: 24rpx;
}

.action-btn.approve {
  background: #0d5e4a;
  color: #fff;
}

.action-btn.reject {
  background: #f5f5f5;
  color: #666;
}
```

## 实现步骤

1. 修改 combo-detail.js：新增 requests 字段、修改 loadComboData、新增 approveRequest/rejectRequest 方法
2. 修改 combo-detail.wxml：添加审批区域
3. 修改 combo-detail.wxss：添加审批样式

# 待审批弹窗改进计划：汇总显示所有待审批

## 需求概述

改进待审批弹窗功能，支持同时显示多个组合的待审批请求，按组合分组展示。

## 当前问题

* 只显示第一个有待审批的组合

* 用户不知道还有其他组合有待审批

* 需要逐个处理，体验不够直观

## 改进方案

### 1. 修改数据结构 (`todo.js`)

将 `approvalComboInfo` 和 `approvalRequests` 改为 `approvalGroups` 数组：

```javascript
data: {
  // ...
  showApprovalPopup: false,
  approvalGroups: [],  // 格式: [{ combo: {...}, requests: [...] }, ...]
  approvalLoading: false
}
```

### 2. 修改检测方法 (`checkPendingApprovals`)

```javascript
async checkPendingApprovals() {
  if (!isLoggedIn()) return;
  
  const sharedCombos = app.globalData.sharedCombos || [];
  if (sharedCombos.length === 0) return;
  
  const managedCombos = sharedCombos.filter(combo => 
    combo.role === 'owner' || combo.role === 'admin'
  );
  if (managedCombos.length === 0) return;
  
  const approvalGroups = [];
  
  for (const combo of managedCombos) {
    try {
      const result = await collabApi.getRequests(combo.id);
      const requests = result.requests || result || [];
      if (requests.length > 0) {
        approvalGroups.push({
          combo: combo,
          requests: requests
        });
      }
    } catch (err) {
      console.error('获取审批申请失败:', err);
    }
  }
  
  if (approvalGroups.length > 0) {
    this.setData({
      showApprovalPopup: true,
      approvalGroups: approvalGroups
    });
  }
}
```

### 3. 修改弹窗UI (`todo.wxml`)

按组合分组展示，使用 `t-collapse` 折叠面板：

```xml
<t-popup
  visible="{{showApprovalPopup}}"
  placement="center"
  usingCustomNavbar="{{true}}"
  bind:visible-change="hideApprovalPopup"
  custom-style="border-radius: 32rpx; overflow: hidden;"
>
  <view class="approval-popup">
    <view class="approval-popup-header">
      <text class="approval-popup-title">待审批申请</text>
      <text class="approval-popup-count">共{{totalApprovalCount}}人</text>
      <view class="approval-popup-close" bindtap="hideApprovalPopup">
        <t-icon name="close" size="32rpx" color="#999" />
      </view>
    </view>
    
    <scroll-view scroll-y class="approval-scroll">
      <block wx:for="{{approvalGroups}}" wx:key="combo.id">
        <view class="approval-group">
          <view class="approval-group-header">
            <view class="group-combo-icon" style="background: {{item.combo.color || '#00b26a'}}">
              <t-icon name="{{item.combo.icon || 'user-group'}}" size="32rpx" color="#fff" />
            </view>
            <view class="group-combo-info">
              <text class="group-combo-name">{{item.combo.name}}</text>
              <text class="group-combo-id">ID: {{item.combo.id}}</text>
            </view>
            <text class="group-request-count">{{item.requests.length}}人待审批</text>
          </view>
          
          <view class="approval-list">
            <view class="approval-item" wx:for="{{item.requests}}" wx:for-item="request" wx:key="id">
              <image class="approval-avatar" src="{{request.avatarUrl || request.avatar_url || '/images/avatar.png'}}" />
              <view class="approval-user-info">
                <text class="approval-user-name">{{request.nickname || '用户'}}</text>
                <text class="approval-time">{{request.createdAt || request.created_at}}</text>
              </view>
              <view class="approval-actions">
                <view class="action-btn approve" data-combo-id="{{item.combo.id}}" data-id="{{request.id}}" bindtap="approveRequest">通过</view>
                <view class="action-btn reject" data-combo-id="{{item.combo.id}}" data-id="{{request.id}}" bindtap="rejectRequest">拒绝</view>
              </view>
            </view>
          </view>
        </view>
      </block>
    </scroll-view>
  </view>
</t-popup>
```

### 4. 修改审批方法

需要传入 `comboId` 来定位是哪个组合的请求：

```javascript
async approveRequest(e) {
  const requestId = e.currentTarget.dataset.id;
  const comboId = e.currentTarget.dataset.comboId;
  const { approvalGroups } = this.data;
  
  this.setData({ approvalLoading: true });
  
  try {
    await collabApi.approveRequest(requestId);
    wx.showToast({ title: '已通过', icon: 'success' });
    
    // 更新对应组合的请求列表
    const newGroups = approvalGroups.map(group => {
      if (group.combo.id === comboId) {
        return {
          ...group,
          requests: group.requests.filter(r => r.id !== requestId)
        };
      }
      return group;
    }).filter(group => group.requests.length > 0);
    
    if (newGroups.length > 0) {
      this.setData({ 
        approvalGroups: newGroups,
        approvalLoading: false
      });
    } else {
      this.setData({ 
        showApprovalPopup: false,
        approvalGroups: [],
        approvalLoading: false
      });
    }
    
    this.loadCombosFromCloud();
  } catch (err) {
    this.setData({ approvalLoading: false });
    wx.showToast({ title: err.message || '操作失败', icon: 'none' });
  }
}
```

### 5. 添加计算属性

在 `showApprovalPopup` 方法中计算总人数：

```javascript
showApprovalPopup(groups) {
  const totalApprovalCount = groups.reduce((sum, group) => sum + group.requests.length, 0);
  this.setData({
    showApprovalPopup: true,
    approvalGroups: groups,
    totalApprovalCount: totalApprovalCount
  });
}
```

### 6. 修改样式 (`todo.wxss`)

添加分组样式：

```css
.approval-popup-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.approval-popup-count {
  font-size: 24rpx;
  color: #999;
  margin-left: 12rpx;
}

.approval-group {
  margin-bottom: 24rpx;
  background: #f8f9fa;
  border-radius: 24rpx;
  overflow: hidden;
}

.approval-group-header {
  display: flex;
  align-items: center;
  padding: 20rpx 24rpx;
  background: linear-gradient(135deg, #f0fdf9 0%, #ecfdf5 100%);
}

.group-combo-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16rpx;
}

.group-combo-info {
  flex: 1;
}

.group-combo-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
  display: block;
}

.group-combo-id {
  font-size: 22rpx;
  color: #999;
}

.group-request-count {
  font-size: 24rpx;
  color: #00b26a;
  background: rgba(0, 178, 106, 0.1);
  padding: 6rpx 16rpx;
  border-radius: 16rpx;
}

.approval-group .approval-list {
  padding: 0 16rpx 16rpx;
}

.approval-group .approval-item {
  background: #fff;
  border-radius: 16rpx;
  padding: 16rpx;
  margin-bottom: 12rpx;
}
```

## 实现步骤

1. 修改 `todo.js` 数据结构和方法
2. 修改 `todo.wxml` 弹窗UI
3. 修改 `todo.wxss` 添加分组样式
4. 测试多组合场景

## 预期效果

* 弹窗标题显示"待审批申请 · 共X人"

* 每个组合作为一个分组卡片展示

* 分组头部显示组合信息（logo、名称、ID）和待审批人数

* 分组内部列出该组合的所有待审批请求

* 处理完一个请求后自动从列表移除

* 当某组合的所有请求处理完后，该组合分组自动消失

* 所有请求处理完后弹窗自动关闭


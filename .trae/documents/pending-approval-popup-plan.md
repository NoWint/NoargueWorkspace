# 待审批成员弹窗功能实现计划

## 需求概述

在todo页面onShow时，检测是否有待审批的协作组新成员，使用popup弹出显示待审批列表。

## 实现步骤

### 1. 修改 `pages/todo/todo.js`

#### 1.1 添加数据字段

在 `data` 对象中添加：

* `showApprovalPopup`: 控制弹窗显示状态

* `approvalComboInfo`: 当前显示的组合信息

* `approvalRequests`: 待审批成员列表

* `approvalLoading`: 加载状态

#### 1.2 在 `onShow` 中添加检测逻辑

```javascript
async checkPendingApprovals() {
  // 1. 检查是否登录
  if (!isLoggedIn()) return;
  
  // 2. 检查共享组合数量是否为0
  const sharedCombos = app.globalData.sharedCombos || [];
  if (sharedCombos.length === 0) return;
  
  // 3. 筛选出用户是超管/管理的组合
  const managedCombos = sharedCombos.filter(combo => 
    combo.role === 'owner' || combo.role === 'admin'
  );
  if (managedCombos.length === 0) return;
  
  // 4. 遍历这些组合，检查是否有待审批请求
  for (const combo of managedCombos) {
    try {
      const result = await collabApi.getRequests(combo.id);
      const requests = result.requests || result || [];
      if (requests.length > 0) {
        // 找到有待审批的组合，显示弹窗
        this.showApprovalPopup(combo, requests);
        return; // 只显示第一个有待审批的组合
      }
    } catch (err) {
      console.error('获取审批申请失败:', err);
    }
  }
}
```

#### 1.3 添加弹窗控制方法

* `showApprovalPopup(combo, requests)`: 显示弹窗

* `hideApprovalPopup()`: 隐藏弹窗

* `approveRequest(e)`: 通过申请

* `rejectRequest(e)`: 拒绝申请

### 2. 修改 `pages/todo/todo.wxml`

添加待审批弹窗组件，参考 `invite-popup` 样式：

```xml
<t-popup
  visible="{{showApprovalPopup}}"
  placement="center"
  usingCustomNavbar="{{true}}"
  bind:visible-change="hideApprovalPopup"
  custom-style="border-radius: 32rpx; overflow: hidden;"
>
  <view class="approval-popup" wx:if="{{approvalComboInfo}}">
    <!-- 上栏：组合信息 -->
    <view class="approval-popup-header">
      <view class="approval-combo-icon" style="background: {{approvalComboInfo.color || '#00b26a'}}">
        <t-icon name="{{approvalComboInfo.icon || 'user-group'}}" size="64rpx" color="#fff" />
      </view>
      <view class="approval-combo-info">
        <text class="approval-combo-name">{{approvalComboInfo.name}}</text>
        <text class="approval-combo-id">ID: {{approvalComboInfo.id}}</text>
      </view>
    </view>
    
    <!-- 下栏：待审批列表 -->
    <view class="approval-list">
      <view class="approval-list-header">
        <text class="approval-list-title">待审批 · {{approvalRequests.length}}人</text>
      </view>
      <scroll-view scroll-y class="approval-scroll">
        <view class="approval-item" wx:for="{{approvalRequests}}" wx:key="id">
          <image class="approval-avatar" src="{{item.avatarUrl || '/images/avatar.png'}}" />
          <view class="approval-user-info">
            <text class="approval-user-name">{{item.nickname || '用户'}}</text>
            <text class="approval-time">{{item.createdAt}}</text>
          </view>
          <view class="approval-actions">
            <view class="action-btn approve" data-id="{{item.id}}" bindtap="approveRequest">通过</view>
            <view class="action-btn reject" data-id="{{item.id}}" bindtap="rejectRequest">拒绝</view>
          </view>
        </view>
      </scroll-view>
    </view>
    
    <!-- 关闭按钮 -->
    <view class="approval-popup-close" bindtap="hideApprovalPopup">
      <t-icon name="close" size="32rpx" color="#999" />
    </view>
  </view>
</t-popup>
```

### 3. 修改 `pages/todo/todo.wxss`

添加待审批弹窗样式：

```css
/* 待审批弹窗样式 */
.approval-popup {
  width: 620rpx;
  max-height: 80vh;
  background: #fff;
  border-radius: 32rpx;
  position: relative;
  overflow: hidden;
}

.approval-popup-header {
  display: flex;
  align-items: center;
  padding: 32rpx;
  background: linear-gradient(135deg, #f0fdf9 0%, #ecfdf5 100%);
  border-bottom: 1rpx solid #e8f8f0;
}

.approval-combo-icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
}

.approval-combo-info {
  flex: 1;
}

.approval-combo-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  display: block;
}

.approval-combo-id {
  font-size: 24rpx;
  color: #999;
  margin-top: 4rpx;
  display: block;
}

.approval-list {
  padding: 0 24rpx 24rpx;
}

.approval-list-header {
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.approval-list-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #0d5e4a;
}

.approval-scroll {
  max-height: 400rpx;
}

.approval-item {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.approval-item:last-child {
  border-bottom: none;
}

.approval-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  margin-right: 16rpx;
}

.approval-user-info {
  flex: 1;
}

.approval-user-name {
  font-size: 28rpx;
  color: #333;
  display: block;
}

.approval-time {
  font-size: 22rpx;
  color: #999;
  margin-top: 4rpx;
  display: block;
}

.approval-actions {
  display: flex;
  gap: 12rpx;
}

.approval-popup-close {
  position: absolute;
  top: 20rpx;
  right: 20rpx;
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #eee;
  border-radius: 50%;
}
```

## 执行流程

1. 用户进入todo页面（onShow触发）
2. 检查登录状态
3. 检查共享组合数量是否 > 0
4. 筛选出用户是超管/管理的组合
5. 遍历这些组合，调用API获取待审批请求
6. 如果找到待审批请求，显示弹窗
7. 用户可以点击"通过"或"拒绝"按钮处理请求
8. 处理完成后刷新列表，如果还有其他待审批则继续显示

## 注意事项

1. 为避免频繁请求API，只在满足条件时才发起请求
2. 弹窗一次只显示一个组合的待审批列表
3. 处理完一个请求后自动刷新列表
4. 如果当前组合的待审批全部处理完，检查是否还有其他组合有待审批


# "任一完成"模式显示优化计划

## 问题描述

"任一完成"模式在 todo-detail 页面的显示有问题：
1. 未完成时显示所有分配成员，应该显示"任一成员"占位
2. 进度统计显示 N/N，应该识别为 1/1（任一人完成即算完成）

## 修改方案

### 修改文件：`pages/todo-detail/todo-detail.js`

#### 1. `updateCompletionStats` 函数修改

针对 `any` 类型特殊处理：

```javascript
updateCompletionStats() {
  const { assignments, assignType } = this.data;
  
  if (assignType === 'any') {
    // 任一完成模式：进度为 1/1
    const hasCompleted = assignments.some(a => a.completedAt);
    this.setData({
      totalCount: 1,
      completedCount: hasCompleted ? 1 : 0,
      uncompletedCount: hasCompleted ? 0 : 1,
      completedPercent: hasCompleted ? 100 : 0,
      uncompletedPercent: hasCompleted ? 0 : 100
    });
  } else {
    // 全员完成/指定成员：原有逻辑
    const totalCount = assignments ? assignments.length : 0;
    const completedCount = assignments ? assignments.filter(a => a.completedAt).length : 0;
    const uncompletedCount = totalCount - completedCount;
    const completedPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    const uncompletedPercent = totalCount > 0 ? Math.round((uncompletedCount / totalCount) * 100) : 0;
    
    this.setData({
      totalCount,
      completedCount,
      uncompletedCount,
      completedPercent,
      uncompletedPercent
    });
  }
}
```

### 修改文件：`pages/todo-detail/todo-detail.wxml`

#### 2. 成员列表显示修改

针对 `any` 类型特殊显示：

```html
<!-- 任一完成模式：特殊显示 -->
<view wx:if="{{assignType === 'any'}}" class="stats-card member-list-card">
  <view class="member-section">
    <view class="member-section-header">
      <text class="section-title">完成情况</text>
    </view>
    <view class="member-list">
      <!-- 已完成：显示完成人 -->
      <block wx:if="{{completedCount > 0}}">
        <view class="member-item completed" wx:for="{{assignments}}" wx:key="userId" wx:if="{{item.completedAt}}">
          <image class="member-avatar" src="{{item.avatarUrl || '/images/avatar.png'}}" mode="aspectFill"></image>
          <text class="member-name">{{item.nickname || '用户'}}</text>
          <text class="member-complete-time">{{item.completedAt}}</text>
        </view>
      </block>
      <!-- 未完成：显示"任一成员"占位 -->
      <block wx:else>
        <view class="member-item any-placeholder">
          <image class="member-avatar" src="/images/avatar.png" mode="aspectFill"></image>
          <text class="member-name">任一成员</text>
        </view>
      </block>
    </view>
  </view>
</view>

<!-- 全员完成/指定成员模式：原有显示 -->
<view wx:else class="stats-card member-list-card">
  <!-- 原有的已完成/未完成列表 -->
</view>
```

## 实现步骤

1. 修改 `todo-detail.js` 的 `updateCompletionStats` 函数
2. 修改 `todo-detail.wxml` 的成员列表显示逻辑

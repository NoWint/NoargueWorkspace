# 个人 Combo 适配计划

## 一、需求分析

### 当前状态

* combo-detail 页面的成员+统计横列只在 `isShared` 时显示

* combo-stats 页面区分全局统计（管理员可见）和个人统计

### 目标

1. **combo-detail 页面**：个人 combo 也要显示统计横列（不显示成员区块）
2. **combo-stats 页面**：适配个人 combo，只显示个人统计

## 二、实施步骤

### 步骤 1: 修改 combo-detail.wxml

* 移除 `wx:if="{{isShared}}"` 条件

* 个人 combo 只显示统计区块，不显示成员区块

* 调整布局：个人 combo 时统计区块占满宽度

### 步骤 2: 修改 combo-detail.wxss

* 添加个人 combo 的统计区块样式（全宽）

### 步骤 3: 修改 combo-detail.js

* 确保 `updateStats` 方法对个人 combo 正确计算

* 修改 `navigateToStats` 方法，传递参数区分个人/共享 combo

### 步骤 4: 修改 combo-stats.wxml

* 个人 combo 只显示个人统计区块

* 共享 combo 保持现有逻辑（管理员看全局+个人，普通成员只看个人）

### 步骤 5: 修改 combo-stats.js

* 添加 `isShared` 状态

* 根据是否共享决定显示哪些统计卡片

* 个人 combo 时只计算个人统计数据

### 步骤 6: 修改 combo-stats.wxss

* 适配个人 combo 的样式

## 三、详细实现

### combo-detail.wxml 修改

```xml
<!-- 个人 combo 显示统计区块 -->
<view wx:if="{{!isShared}}" class="info-row single">
  <view class="info-block stats-block full" bindtap="navigateToStats">
    <view class="section-header">
      <text class="section-title">统计</text>
      <t-icon name="chevron-right" size="32rpx" color="#999" />
    </view>
    <view class="stats-preview">
      <view class="stat-item">
        <text class="stat-value">{{todos.length}}</text>
        <text class="stat-label">待办</text>
      </view>
      <view class="stat-item">
        <text class="stat-value">{{completedCount}}</text>
        <text class="stat-label">完成</text>
      </view>
      <view class="stat-item">
        <text class="stat-value">{{completionRate}}%</text>
        <text class="stat-label">完成率</text>
      </view>
    </view>
  </view>
</view>

<!-- 共享 combo 显示成员+统计 -->
<view wx:if="{{isShared}}" class="info-row">
  ...
</view>
```

### combo-stats.js 修改

```javascript
// 添加 isShared 状态
data: {
  isShared: false,
  ...
}

// loadStats 方法中设置 isShared
async loadStats(id) {
  const combo = result.combo || result;
  const isShared = combo.isShared || combo.is_shared;
  
  this.setData({
    isShared,
    ...
  });
  
  // 个人 combo 只计算个人统计
  if (!isShared) {
    this.calculatePersonalStatsForPersonalCombo(todos);
  } else {
    if (isAdmin) {
      this.calculateGlobalStats(todos, members);
    }
    this.calculatePersonalStats(todos);
  }
}
```

### combo-stats.wxml 修改

```xml
<!-- 个人 combo 只显示个人统计 -->
<view wx:if="{{!isShared}}" class="section personal-section">
  <view class="section-header">
    <text class="section-title">我的统计</text>
  </view>
  <!-- 个人统计卡片 -->
  ...
</view>

<!-- 共享 combo 保持现有逻辑 -->
<view wx:if="{{isShared && isAdmin}}" class="section global-section">
  ...
</view>
<view wx:if="{{isShared}}" class="section personal-section">
  ...
</view>
```

## 四、预期效果

### combo-detail 页面

| 场景       | 显示内容        |
| -------- | ----------- |
| 个人 combo | 统计区块（全宽）    |
| 共享 combo | 成员区块 + 统计区块 |

### combo-stats 页面

| 场景             | 显示内容        |
| -------------- | ----------- |
| 个人 combo       | 个人统计卡片      |
| 共享 combo（管理员）  | 全局统计 + 个人统计 |
| 共享 combo（普通成员） | 个人统计        |

## 五、文件修改清单

1. `pages/combo-detail/combo-detail.wxml`
2. `pages/combo-detail/combo-detail.wxss`
3. `pages/combo-detail/combo-detail.js`
4. `pages/combo-stats/combo-stats.wxml`
5. `pages/combo-stats/combo-stats.js`
6. `pages/combo-stats/combo-stats.wxss`


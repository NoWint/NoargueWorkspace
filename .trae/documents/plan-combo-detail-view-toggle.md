# combo-detail 页面"显示整体完成情况"功能计划

## 功能需求

在 combo-detail 页面的"待办·X项"标题右侧添加按钮"显示整体完成情况"：
1. 仅超管/管理员可见
2. 未勾选时：待办卡片背景色变绿逻辑 = 自己是否完成（当前逻辑）
3. 勾选后：待办卡片背景色变绿逻辑 = 整个待办是否完成

## 修改方案

### 1. combo-detail.wxml

**修改位置**：`section-header` 区域（约第56-59行）

```html
<view class="todos-section">
  <view class="section-header">
    <text class="section-title">待办 · {{isShared ? sharedTodos.length : todos.length}}项</text>
    <view wx:if="{{isShared && (userRole === 'owner' || userRole === 'admin')}}" class="view-toggle">
      <text class="toggle-label">显示整体完成情况</text>
      <t-switch 
        value="{{showOverallCompletion}}" 
        bind:change="toggleViewMode" 
        size="small"
      />
    </view>
  </view>
  ...
</view>
```

**修改位置**：共享待办卡片的 class 判断（约第114行）

```html
<t-swipe-cell class="todo-item {{showOverallCompletion ? (item.completedAt ? 'completed' : '') : (item.myCompletedAt ? 'completed' : '')}}">
```

### 2. combo-detail.js

**新增 data 字段**：
```javascript
data: {
  // ... 现有字段
  showOverallCompletion: false,  // 是否显示整体完成情况
}
```

**新增方法**：
```javascript
toggleViewMode(e) {
  this.setData({
    showOverallCompletion: e.detail.value
  });
}
```

### 3. combo-detail.wxss

**新增样式**：
```css
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.view-toggle {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.toggle-label {
  font-size: 24rpx;
  color: #666;
}
```

## 实现步骤

1. 修改 combo-detail.wxml：添加开关按钮，修改卡片 class 判断逻辑
2. 修改 combo-detail.js：新增 data 字段和方法
3. 修改 combo-detail.wxss：添加样式

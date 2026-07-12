# combo-edit 选择待办弹窗样式重构计划

## 目标

将 combo-edit 页面的选择待办弹窗中的待办卡片样式，改为复用 todo 页的卡片样式，使用 t-cell 和 t-radio 组件。

## 当前状态

* 弹窗使用简单的 `popup-todo-item` 样式

* 仅显示标题和日期

* 选中态通过 `selected` class 实现

## 目标状态

* 复用 todo 页的卡片样式（通过 `@import` 导入）

* 使用 `t-cell` 组件显示待办信息

* 使用 `t-radio` 做选中逻辑（非 toggle 完成）

* 已完成待办显示绿色卡片背景

* 显示收藏角标、备注等信息

## 修改内容

### 1. combo-edit.wxml

修改 popup 内的待办列表结构：

```xml
<view class="popup-todos">
  <view 
    wx:for="{{availableTodos}}" 
    wx:key="time"
    class="todo-item-wrapper"
  >
    <view class="todo-item {{item.completed ? 'completed' : ''}} {{selectedTodoIds.indexOf(item.time) > -1 ? 'selected' : ''}}">
      <view wx:if="{{item.isStar}}" class="star-badge">
        <t-icon name="star-filled" size="26rpx" color="#ffffff" />
      </view>
      <t-cell
        title="{{item.text}}"
        description="{{item.location ? (item.remarks ? '📍' + item.location.name + '｜' + item.remarks : '📍' + item.location.name) : item.remarks}}"
        note="{{item.setDate}}"
        bordered="{{false}}"
        custom-style="width:100%"
        data-id="{{item.time}}"
        bindtap="toggleTodoSelection"
      >
        <view wx:if="{{item.completed}}" class="completed-decorate"></view>
        <view
          slot="right-icon"
          style="position:relative;z-index:1000;background:inherit;padding-left:20rpx"
        >
          <t-radio
            checked="{{selectedTodoIds.indexOf(item.time) > -1}}"
            block="{{false}}"
            data-id="{{item.time}}"
            catch:change="toggleTodoSelection"
            custom-style="--td-radio-bg-color: transparent;"
          />
        </view>
      </t-cell>
    </view>
  </view>
</view>
```

### 2. combo-edit.wxss

* 导入 todo 页样式：`@import '../todo/todo.wxss';`

* 移除旧的 popup-todo-item 相关样式

* 添加弹窗内卡片适配样式

### 3. combo-edit.json

* 添加 `t-radio` 组件引用

* 添加 `t-cell` 组件引用（如果尚未添加）

### 4. combo-edit.js

* `loadAvailableTodos` 方法需要保留完整的待办信息（包括 completed、isStar、location、remarks 等）

* `toggleTodoSelection` 方法保持不变（选中/取消选中逻辑）

## 注意事项

1. t-radio 的 checked 绑定的是选中状态，而非完成状态
2. 已完成待办仍然可以选中加入组合
3. 保持 popup 的滚动和确认逻辑不变


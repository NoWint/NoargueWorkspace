# combo-detail 页面选项本地记忆功能计划

## 需求概述

为 combo-detail 页面的两个选项实现本地记忆功能，每个组合独立存储：

1. **筛选模式** - 已实现 ✓
2. **显示整体完成情况** - 需要新增

## 当前状态

* 筛选模式已使用 `combo_detail_filter_mode_${comboId}` 作为存储键

* "显示整体完成情况"开关尚未实现本地存储

## 存储方案

使用独立的存储键，每个组合单独存储：

* 筛选模式：`combo_detail_filter_mode_${comboId}`（已有）

* 整体完成情况：`combo_detail_show_overall_${comboId}`（新增）

## 实现步骤

### 1. 修改 combo-detail.js

#### 1.1 添加加载整体完成情况偏好的方法

```javascript
loadShowOverallPreference() {
  const { comboId } = this.data;
  const key = `combo_detail_show_overall_${comboId}`;
  const savedValue = wx.getStorageSync(key);
  if (savedValue !== '' && savedValue !== null) {
    this.setData({ showOverallCompletion: savedValue });
  }
}
```

#### 1.2 添加保存整体完成情况偏好的方法

```javascript
saveShowOverallPreference(value) {
  const { comboId } = this.data;
  const key = `combo_detail_show_overall_${comboId}`;
  wx.setStorageSync(key, value);
}
```

#### 1.3 修改 toggleViewMode 方法

在切换开关时保存偏好：

```javascript
toggleViewMode(e) {
  const value = e.detail.value;
  this.setData({ showOverallCompletion: value });
  this.saveShowOverallPreference(value);
}
```

#### 1.4 修改 loadComboData 方法

在加载共享组合数据后，调用加载偏好的方法：

* 已有 `this.loadFilterPreference()`

* 新增 `this.loadShowOverallPreference()`

## 注意事项

1. 两个选项独立存储，互不影响
2. 存储键都包含 comboId，确保不同组合的设置互不干扰
3. 加载顺序：先加载数据，再加载偏好设置


# todo-detail 页面长按复制修复计划

## 问题分析

### 现有复制功能

| 方法 | 绑定位置 | 复制内容 | 问题 |
|------|---------|---------|------|
| `copyTitle` | 标题 | `todo.text` | 正常 |
| `copyDate` | 创建时间/截止时间/完成时间 | `formatDate(setDate) + setTime` | 需要检查是否正确 |
| `copyRemarks` | 备注 | `todo.remarks` | 正常 |
| `copyLocation` | 位置 | `todo.location.name` | 正常 |

### 新增卡片（需要添加复制功能）

| 卡片 | 内容 | 复制格式 |
|------|------|---------|
| 创建人员 | `creator.nickname` | `创建者：xxx` |
| 完成模式 | `assignType` + `excludeType` | `全员完成（超管无需完成）` |
| 完成进度 | `completedCount/totalCount` | `完成进度：3/5 (60%)` |
| 已完成成员列表 | 成员昵称列表 | `已完成：张三、李四` |
| 未完成成员列表 | 成员昵称列表 | `未完成：王五、赵六` |

## 修改方案

### 1. 修复现有复制方法

**copyDate 方法**：确保复制格式化后的完整时间
```javascript
copyDate(e) {
  // 根据点击位置确定复制哪个时间
  const target = e.currentTarget.dataset.target || 'deadline';
  let text = '';
  
  if (target === 'created') {
    text = this.data.formatDateTime;
  } else if (target === 'completed') {
    text = this.data.formatCompletedTime;
  } else {
    // 截止时间
    text = `${this.data.todo.setDate} ${this.data.todo.setTime}`;
  }
  
  wx.setClipboardData({
    data: text,
    success: () => wx.showToast({ title: '时间已复制' })
  });
}
```

### 2. 新增复制方法

**copyCreator**：复制创建者信息
```javascript
copyCreator() {
  const creator = this.data.creator;
  if (creator) {
    wx.setClipboardData({
      data: `创建者：${creator.nickname || '未知用户'}`,
      success: () => wx.showToast({ title: '创建者已复制' })
    });
  }
}
```

**copyAssignType**：复制完成模式
```javascript
copyAssignType() {
  const { assignType, excludeType } = this.data;
  let text = assignType === 'all' ? '全员完成' : assignType === 'any' ? '任一完成' : '指定成员';
  if (excludeType) {
    text += `（${excludeType === 'owner' ? '超管无需完成' : excludeType === 'self' ? '创建者无需完成' : '管理组无需完成'}）`;
  }
  wx.setClipboardData({
    data: text,
    success: () => wx.showToast({ title: '完成模式已复制' })
  });
}
```

**copyProgress**：复制完成进度
```javascript
copyProgress() {
  const { completedCount, totalCount, completedPercent } = this.data;
  wx.setClipboardData({
    data: `完成进度：${completedCount}/${totalCount} (${completedPercent}%)`,
    success: () => wx.showToast({ title: '进度已复制' })
  });
}
```

**copyMemberList**：复制成员列表
```javascript
copyMemberList(e) {
  const type = e.currentTarget.dataset.type;
  const assignments = this.data.assignments || [];
  
  if (type === 'completed') {
    const completed = assignments.filter(a => a.completedAt);
    const names = completed.map(a => a.nickname || '用户').join('、');
    wx.setClipboardData({
      data: `已完成：${names || '无'}`,
      success: () => wx.showToast({ title: '成员列表已复制' })
    });
  } else {
    const uncompleted = assignments.filter(a => !a.completedAt);
    const names = uncompleted.map(a => a.nickname || '用户').join('、');
    wx.setClipboardData({
      data: `未完成：${names || '无'}`,
      success: () => wx.showToast({ title: '成员列表已复制' })
    });
  }
}
```

### 3. WXML 绑定修改

```html
<!-- 创建人员 -->
<view class="creator-content" bindlongpress="copyCreator">

<!-- 完成模式 -->
<text class="value" bindlongpress="copyAssignType">

<!-- 完成进度 -->
<view class="stats-card" bindlongpress="copyProgress">

<!-- 已完成成员 -->
<view class="member-section" bindlongpress="copyMemberList" data-type="completed">

<!-- 未完成成员 -->
<view class="member-section" bindlongpress="copyMemberList" data-type="uncompleted">

<!-- 创建时间 -->
<text class="value" bindlongpress="copyDate" data-target="created">

<!-- 截止时间 -->
<text class="value" bindlongpress="copyDate" data-target="deadline">

<!-- 完成时间 -->
<text class="value" bindlongpress="copyDate" data-target="completed">
```

## 实现步骤

1. 修复 `copyDate` 方法，根据 data-target 区分复制内容
2. 新增 `copyCreator`、`copyAssignType`、`copyProgress`、`copyMemberList` 方法
3. 修改 WXML 绑定，添加 data-target 属性区分不同时间
4. 为新增卡片添加长按复制绑定

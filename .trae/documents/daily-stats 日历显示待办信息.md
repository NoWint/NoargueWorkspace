## 修改 daily-stats 日历显示待办信息

参考 add-todo 页面的实现方式，给 daily-stats 的 t-calendar 添加 format 功能，在日历上显示每天的待办数量。

### 修改内容

1. **daily-stats.wxml**
   - 给 t-calendar 添加 `format="{{format}}"` 属性

2. **daily-stats.js**
   - 在 data 中添加 `format` 函数，复用 add-todo 页面的逻辑
   - 使用 `calendarCache` 获取每天的待办信息
   - 在日期格子上显示待办数量和简略内容
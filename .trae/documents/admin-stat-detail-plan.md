# 后台管理统计数据详情功能实现计划

## 需求分析

点击后台管理页面的统计数据后，需要显示详细数据列表，而不仅仅是数值。

## 统计数据详情映射

### 今日数据卡片

| 统计项  | 详情内容      |
| ---- | --------- |
| 新增用户 | 今日注册的用户列表 |
| 新增待办 | 今日创建的待办列表 |
| 同步次数 | 今日同步日志列表  |
| 7日活跃 | 7日内活跃用户列表 |

### 核心数据卡片

| 统计项  | 详情内容            |
| ---- | --------------- |
| 用户总数 | 所有用户列表（跳转用户管理页） |
| 待办总数 | 所有待办列表          |
| 组合总数 | 所有组合列表          |
| 共享组合 | 共享组合列表          |

### 待办分析卡片

| 统计项   | 详情内容       |
| ----- | ---------- |
| 已完成   | 已完成待办列表    |
| 完成率   | 无需详情（百分比）  |
| 已收藏   | 收藏待办列表     |
| 已删除   | 已删除待办列表    |
| 有地点   | 含位置待办列表    |
| 有图片   | 含图片待办列表    |
| 人均待办  | 无需详情（计算值）  |
| 30日活跃 | 30日内活跃用户列表 |

### 协作数据卡片

| 统计项  | 详情内容     |
| ---- | -------- |
| 成员总数 | 组合成员列表   |
| 共享待办 | 共享待办列表   |
| 分配记录 | 待办分配记录列表 |
| 待审批  | 待审批申请列表  |

### 系统数据卡片

| 统计项   | 详情内容      |
| ----- | --------- |
| 标签    | 所有标签列表    |
| 通知    | 通知列表      |
| 待发送   | 待发送通知列表   |
| 同步日志  | 同步日志列表    |
| 同步成功率 | 无需详情（百分比） |

## 实现步骤

### 第一步：后端API扩展

在 `adminController.js` 中添加详情查询API：

```javascript
// 获取统计详情
const getStatDetail = async (req, res) => {
  const { type } = req.params;
  // 根据type返回不同的详情数据
}
```

支持的type类型：

* `todayNewUsers` - 今日新用户

* `todayNewTodos` - 今日新待办

* `todaySyncLogs` - 今日同步日志

* `activeUsers7Days` - 7日活跃用户

* `activeUsers30Days` - 30日活跃用户

* `allUsers` - 所有用户

* `allTodos` - 所有待办

* `allCombos` - 所有组合

* `sharedCombos` - 共享组合

* `completedTodos` - 已完成待办

* `starredTodos` - 收藏待办

* `deletedTodos` - 已删除待办

* `todosWithLocation` - 有地点待办

* `todosWithImages` - 有图片待办

* `comboMembers` - 组合成员

* `sharedTodos` - 共享待办

* `assignments` - 分配记录

* `pendingRequests` - 待审批

* `tags` - 标签

* `notifications` - 通知

* `pendingNotifications` - 待发送通知

* `syncLogs` - 同步日志

### 第二步：前端弹窗改造

修改 `index.wxml` 中的弹窗内容，支持列表展示：

```xml
<t-popup visible="{{popupVisible}}" placement="bottom">
  <view class="popup-content">
    <view class="popup-header">...</view>
    <scroll-view scroll-y class="popup-list">
      <!-- 根据不同类型渲染不同列表项 -->
    </scroll-view>
  </view>
</t-popup>
```

### 第三步：前端JS逻辑

```javascript
async showStatDetail(e) {
  const { key, label, desc, hasDetail } = e.currentTarget.dataset;
  if (hasDetail) {
    const result = await adminApi.getStatDetail(key);
    this.setData({
      popupVisible: true,
      popupData: { key, label, desc, list: result.data }
    });
  }
}
```

### 第四步：路由配置

在 `adminRoutes.js` 添加新路由：

```javascript
router.get('/stats/:type', adminController.getStatDetail);
```

## 文件修改清单

1. `backend/controllers/adminController.js` - 添加 getStatDetail 方法
2. `backend/routes/adminRoutes.js` - 添加详情路由
3. `utils/api.js` - 添加 getStatDetail API调用
4. `pages/admin/index/index.wxml` - 改造弹窗支持列表
5. `pages/admin/index/index.wxss` - 添加列表样式
6. `pages/admin/index/index.js` - 添加详情加载逻辑

## 详情列表展示格式

### 用户类

* 头像 + 昵称 + ID + 注册时间

### 待办类

* 完成状态 + 标题 + 日期 + 所属用户

### 组合类

* 图标 + 名称 + 成员数 + 创建者

### 标签类

* 颜色 + 名称 + 使用次数

### 通知类

* 待办标题 + 通知时间 + 发送状态

### 同步日志类

* 用户 + 操作类型 + 时间 + 状态


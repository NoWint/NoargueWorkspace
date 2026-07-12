# 管理后台新增统计数据实现计划

## 一、任务概述

基于现有数据库结构和管理后台页面，新增统计数据和交叉分析功能，帮助管理员更好地了解用户行为和产品使用情况。

## 二、实现范围

### 第一阶段：高优先级统计项

| 统计项      | 分类 | 数据来源                |
| -------- | -- | ------------------- |
| 用户留存率    | 用户 | users + sync\_logs  |
| 标签使用排行   | 标签 | todo\_tags + tags   |
| 通知发送成功率  | 通知 | todo\_notifications |
| 用户待办数量分布 | 用户 | todos               |
| 待办创建时段分布 | 待办 | todos.created\_at   |

### 第二阶段：中优先级统计项

| 统计项      | 分类 | 数据来源                                      |
| -------- | -- | ----------------------------------------- |
| 共享待办完成率  | 协作 | shared\_todos + shared\_todo\_assignments |
| 成员角色分布   | 协作 | combo\_members                            |
| 分配类型分布   | 协作 | shared\_todos.assign\_type                |
| 协作申请通过率  | 协作 | collab\_requests                          |
| 同步操作类型分布 | 系统 | sync\_logs.action                         |

### 第三阶段：交叉分析

| 分析项     | 交叉维度        |
| ------- | ----------- |
| 标签完成率对比 | 标签 × 完成状态   |
| 通知效果分析  | 有通知 × 完成率   |
| 协作留存分析  | 协作参与 × 用户留存 |
| 时段效率分析  | 创建时段 × 完成率  |

## 三、实现步骤

### 步骤1：后端API扩展

**文件**: `backend/controllers/adminController.js`

新增统计接口：

* `GET /admin/stats/retention` - 用户留存率统计

* `GET /admin/stats/tag-usage` - 标签使用排行

* `GET /admin/stats/notification-rate` - 通知发送成功率

* `GET /admin/stats/user-todo-distribution` - 用户待办数量分布

* `GET /admin/stats/todo-hourly` - 待办创建时段分布

* `GET /admin/stats/shared-todo-completion` - 共享待办完成率

* `GET /admin/stats/member-roles` - 成员角色分布

* `GET /admin/stats/assign-types` - 分配类型分布

* `GET /admin/stats/request-rate` - 协作申请通过率

* `GET /admin/stats/sync-actions` - 同步操作类型分布

* `GET /admin/stats/cross/tag-completion` - 标签完成率交叉分析

* `GET /admin/stats/cross/notification-effect` - 通知效果分析

### 步骤2：前端数据展示扩展

**文件**: `packageAdmin/index/index.js`

1. 扩展 `data.stats` 对象，添加新统计字段
2. 新增统计卡片展示组件
3. 扩展 `STAT_TYPE_MAP` 映射关系

**文件**: `packageAdmin/index/index.wxml`

1. 新增"用户分析"卡片区域
2. 新增"标签分析"卡片区域
3. 新增"交叉分析"卡片区域
4. 扩展弹出层支持图表展示

**文件**: `packageAdmin/index/index.wxss`

1. 新增统计卡片样式
2. 新增图表容器样式
3. 新增交叉分析展示样式

### 步骤3：图表组件集成

**文件**: `packageAdmin/components/stats-chart/stats-chart.js`

创建通用图表组件，支持：

* 饼图（占比类统计）

* 柱状图（排行类统计）

* 折线图（趋势类统计）

* 热力图（时段分布）

### 步骤4：API工具函数扩展

**文件**: `utils/api.js`

扩展 `adminApi` 对象：

```javascript
adminApi.getRetentionStats()
adminApi.getTagUsageStats()
adminApi.getNotificationRateStats()
adminApi.getUserTodoDistribution()
adminApi.getTodoHourlyStats()
adminApi.getCrossAnalysis(type)
```

## 四、详细实现内容

### 4.1 后端SQL查询示例

#### 用户留存率

```sql
-- 次日留存
SELECT 
  COUNT(DISTINCT CASE WHEN DATEDIFF(s2.created_at, u.created_at) = 1 THEN u.id END) * 100.0 / 
  COUNT(DISTINCT u.id) as next_day_retention
FROM users u
LEFT JOIN sync_logs s2 ON u.id = s2.user_id
WHERE u.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
```

#### 标签使用排行

```sql
SELECT t.id, t.name, t.color, t.icon, COUNT(tt.todo_id) as usage_count
FROM tags t
LEFT JOIN todo_tags tt ON t.id = tt.tag_id
GROUP BY t.id
ORDER BY usage_count DESC
LIMIT 10
```

#### 用户待办数量分布

```sql
SELECT 
  CASE 
    WHEN todo_count = 0 THEN '0个'
    WHEN todo_count BETWEEN 1 AND 10 THEN '1-10个'
    WHEN todo_count BETWEEN 11 AND 50 THEN '11-50个'
    ELSE '50个以上'
  END as range_label,
  COUNT(*) as user_count
FROM (
  SELECT user_id, COUNT(*) as todo_count
  FROM todos WHERE is_deleted = 0
  GROUP BY user_id
) t
GROUP BY range_label
```

#### 待办创建时段分布

```sql
SELECT 
  HOUR(created_at) as hour,
  COUNT(*) as count
FROM todos
WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
GROUP BY HOUR(created_at)
ORDER BY hour
```

#### 标签完成率交叉分析

```sql
SELECT 
  t.name as tag_name,
  t.color,
  COUNT(*) as total,
  SUM(CASE WHEN todo.completed != 0 THEN 1 ELSE 0 END) as completed,
  ROUND(SUM(CASE WHEN todo.completed != 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as rate
FROM todo_tags tt
JOIN tags t ON tt.tag_id = t.id
JOIN todos todo ON tt.todo_id = todo.id
WHERE todo.is_deleted = 0
GROUP BY t.id
ORDER BY rate DESC
```

### 4.2 前端数据结构

```javascript
stats: {
  // 现有字段...
  
  // 新增用户分析
  userTodoDistribution: [
    { range: '0个', count: 0, percent: 0 },
    { range: '1-10个', count: 0, percent: 0 },
    { range: '11-50个', count: 0, percent: 0 },
    { range: '50个以上', count: 0, percent: 0 }
  ],
  nextDayRetention: 0,
  sevenDayRetention: 0,
  thirtyDayRetention: 0,
  
  // 新增标签分析
  tagUsageTop10: [],
  tagCompletionRate: [],
  
  // 新增通知分析
  notificationSuccessRate: 0,
  notificationEffectData: {
    withNotify: { total: 0, completed: 0, rate: 0 },
    withoutNotify: { total: 0, completed: 0, rate: 0 }
  },
  
  // 新增协作分析
  sharedTodoCompletionRate: 0,
  memberRoleDistribution: [
    { role: 'owner', count: 0 },
    { role: 'admin', count: 0 },
    { role: 'member', count: 0 }
  ],
  assignTypeDistribution: [],
  requestApprovalRate: 0,
  
  // 新增系统分析
  syncActionDistribution: [],
  
  // 时段分析
  todoHourlyDistribution: []
}
```

## 五、文件修改清单

| 文件路径                                     | 操作 | 说明         |
| ---------------------------------------- | -- | ---------- |
| `backend/controllers/adminController.js` | 修改 | 新增统计接口     |
| `backend/routes/admin.js`                | 修改 | 新增路由定义     |
| `utils/api.js`                           | 修改 | 扩展adminApi |
| `packageAdmin/index/index.js`            | 修改 | 扩展数据和方法    |
| `packageAdmin/index/index.wxml`          | 修改 | 新增UI展示     |
| `packageAdmin/index/index.wxss`          | 修改 | 新增样式       |
| `packageAdmin/components/stats-chart/*`  | 新建 | 图表组件       |

## 六、执行顺序

1. **后端实现** - 先完成所有统计接口
2. **API扩展** - 扩展前端API调用
3. **图表组件** - 创建通用图表组件
4. **页面展示** - 更新管理后台页面
5. **测试验证** - 验证各统计数据准确性

## 七、预期效果

完成后管理后台将展示：

* 用户留存率趋势（次日/7日/30日）

* 标签使用排行TOP10

* 用户待办数量分布饼图

* 待办创建时段热力图

* 标签完成率对比图

* 通知效果分析对比

* 协作数据详细统计


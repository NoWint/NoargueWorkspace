# combo-stats 页面重构规划

## 一、数据结构分析

### 现有待办数据字段

| 字段                              | 说明                                        |
| ------------------------------- | ----------------------------------------- |
| `id`                            | 待办ID                                      |
| `text`                          | 待办内容                                      |
| `setDate/set_date`              | 设置日期                                      |
| `setTime/set_time`              | 设置时间                                      |
| `completedAt/completed_at`      | 全局完成时间                                    |
| `myCompletedAt/my_completed_at` | 我的完成时间                                    |
| `assignments`                   | 分配人员数组 \[{userId, nickname, completedAt}] |
| `assignType/assign_type`        | 分配类型：specific/any                         |
| `excludeType/exclude_type`      | 排除类型：owner/self/admins                    |
| `completedCount`                | 已完成人数                                     |
| `assignCount`                   | 分配人数                                      |
| `creator/creator_id`            | 创建者                                       |
| `location`                      | 位置                                        |
| `remarks`                       | 备注                                        |

### 用户角色

* `owner` - 超管

* `admin` - 管理员

* `member` - 普通成员

## 二、统计卡片设计

### 卡片分类

#### 1. 全局统计卡片（仅超管/管理可见）

**卡片1: 总览概要**

* 总待办数

* 已完成数

* 完成率（环形进度条）

* 平均完成时长

* 逾期待办数

**卡片2: 成员贡献排行**

* 按完成数排序

* 显示：头像、昵称、创建数、完成数、完成率

* 进度条可视化

**卡片3: 待办状态分布**

* 未开始（assignCount=0）

* 进行中（0 < completedCount < assignCount）

* 已完成（completedCount = assignCount）

* 饼图/环形图

**卡片4: 分配类型分布**

* 指定人（specific）

* 任何人（any）

* 排除模式（有 excludeType）

* 柱状图

**卡片5: 时间分布**

* 创建时间分布（24小时）

* 完成时间分布（24小时）

* 横向柱状图

**卡片6: 近7天趋势**

* 每日创建数

* 每日完成数

* 折线图

#### 2. 个人统计卡片（所有人可见）

**卡片1: 我的待办概要**

* 分配给我的待办数

* 我已完成的待办数

* 我的完成率

* 我的逾期待办数

**卡片2: 我的创建统计**

* 我创建的待办数

* 已被完成的待办数

* 平均完成进度

**卡片3: 我的时间分布**

* 创建时间分布

* 完成时间分布

**卡片4: 我的近7天趋势**

* 每日完成数

## 三、实施步骤

### 步骤 1: 重构 JS 逻辑

* 区分全局统计和个人统计

* 根据用户角色显示不同数据

* 计算各项统计指标

### 步骤 2: 重构 WXML 结构

* 添加全局统计区域（条件渲染）

* 添加个人统计区域

* 使用卡片组件化设计

### 步骤 3: 重构 WXSS 样式

* 卡片样式优化

* 数据可视化样式

* 响应式布局

### 步骤 4: 添加图表组件

* 进度条

* 环形图

* 柱状图

## 四、数据计算逻辑

### 全局统计计算

```javascript
// 总览
const totalCount = todos.length;
const completedCount = todos.filter(t => t.completedAt).length;
const completionRate = Math.round((completedCount / totalCount) * 100);

// 平均完成时长
const completedTodos = todos.filter(t => t.completedAt && t.time);
const avgDuration = completedTodos.reduce((sum, t) => {
  return sum + (t.completedAt - new Date(t.time).getTime());
}, 0) / completedTodos.length / (1000 * 60 * 60); // 小时

// 逾期待办
const overdueCount = todos.filter(t => {
  if (t.completedAt) return false;
  const setTime = new Date(`${t.setDate} ${t.setTime}`).getTime();
  return setTime < Date.now();
}).length;

// 状态分布
const notStarted = todos.filter(t => t.assignCount === 0).length;
const inProgress = todos.filter(t => t.completedCount > 0 && t.completedCount < t.assignCount).length;
const completed = todos.filter(t => t.completedCount === t.assignCount && t.assignCount > 0).length;

// 分配类型分布
const specificAssign = todos.filter(t => t.assignType === 'specific').length;
const anyAssign = todos.filter(t => t.assignType === 'any').length;
const excludeAssign = todos.filter(t => t.excludeType).length;
```

### 个人统计计算

```javascript
// 分配给我的待办
const myAssignedTodos = todos.filter(t => 
  t.assignments.some(a => String(a.userId) === String(currentUserId))
);

// 我完成的待办
const myCompletedTodos = myAssignedTodos.filter(t => 
  t.assignments.find(a => String(a.userId) === String(currentUserId))?.completedAt
);

// 我创建的待办
const myCreatedTodos = todos.filter(t => 
  String(t.creator_id) === String(currentUserId)
);

// 我的逾期待办
const myOverdueTodos = myAssignedTodos.filter(t => {
  const assignment = t.assignments.find(a => String(a.userId) === String(currentUserId));
  if (assignment?.completedAt) return false;
  const setTime = new Date(`${t.setDate} ${t.setTime}`).getTime();
  return setTime < Date.now();
});
```

## 五、UI 设计要点

1. **卡片圆角**: 32rpx
2. **卡片阴影**: 0 4rpx 16rpx rgba(0,0,0,0.08)
3. **主色调**: #00B26A（绿色）
4. **辅助色**: #26c6da（青色）、#f5a623（橙色）、#ff4d4f（红色）
5. **背景色**: #f5f5f5
6. **数据可视化**: 使用 CSS + Canvas 绘制简单图表

<br />

## 六、页面下拉刷新逻辑

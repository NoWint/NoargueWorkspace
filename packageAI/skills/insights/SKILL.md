# 数据洞察 SKILL

## 业务流程
1. 用户意图「查看日历」→ getCalendar → 渲染 calendar-card
2. 用户意图「查看统计」→ getStats → 渲染 stats-card
3. 用户意图「查看收藏」→ getStarredTodos → 展示列表
4. 用户意图「查看回收站」→ getDeletedTodos → 渲染 trash-list
5. 用户意图「恢复待办」→ restoreTodo → 告知结果
6. 用户意图「每日激励」→ getMotivation → 展示励志语录
7. 用户意图「吃什么」→ getFoodSuggestion → 推荐美食

## 接口依赖关系
- restoreTodo 需要先从 getDeletedTodos 获取 todoId

# 待办管理 SKILL

## 业务流程（用户意图 → 原子接口）

```
用户表达「创建」「添加」「记一下」
  └─→ 有具体内容？→ createTodo → 用户确认 → 渲染 todo-form-card
  └─→ 没具体内容？→ 主动询问"您想记录什么？"

用户表达「查看」「我的待办」「今天有什么」
  └─→ 含筛选条件（日期/标签/完成状态）→ listTodos（带参数）
  └─→ 不含条件 → listTodos（无参数）

用户表达「完成」「标记完成」
  └─→ 知道哪个待办 → completeTodo
  └─→ 不确定哪个 → 先 listTodos → 用户选择 → completeTodo

用户表达「编辑」「修改」「改一下」
  └─→ 先 listTodos 获取 todoId → 用户选择 → updateTodo

用户表达「删除」「移除」
  └─→ 先 listTodos 获取 todoId → 用户确认 → deleteTodo

用户表达「搜索」「查找」
  └─→ 有关键词 → searchTodos
  └─→ 没关键词 → 主动询问"您想搜索什么？"
```

## 接口依赖关系

| 接口 | 前置条件 | 说明 |
|------|---------|------|
| completeTodo | 需要 todoId（来自 listTodos） | 不要重复调用，确认成功后再告知用户 |
| updateTodo | 需要 todoId（来自 listTodos） | 修改后 version 自动递增 |
| deleteTodo | 需要 todoId（来自 listTodos） | 软删除，30天后自动清理 |
| searchTodos | 无 | 独立接口 |

## 业务约束

- 删除操作为软删除，不可逆，30天后自动清理
- 修改时 version 自动递增
- 动作类接口（create/complete/delete）必须确认原子接口执行成功，未调用前不应向用户宣称"已为您完成"
- 并发注意：completeTodo 不应并发，须等上一笔结束后再发起
- 应展示卡片时，content 加引导："请展示 XXX 卡片"

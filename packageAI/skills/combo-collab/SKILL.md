# 组合协作 SKILL

## 业务流程（用户意图 → 原子接口）

```
用户表达「查看组合」「我的分组」「文件夹」
  └─→ listCombos（可选 type=private/shared）

用户表达「进入xx组合」「查看xx详情」
  └─→ 先 listCombos → 用户选择 → getComboDetail

用户表达「完成共享待办」
  └─→ 先 listCombos → getComboDetail → 用户选择 → completeSharedTodo

用户表达「查看成员」「谁在xx」
  └─→ 先 listCombos → listMembers
```

## 接口依赖关系

| 接口 | 前置条件 | 说明 |
|------|---------|------|
| getComboDetail | comboId（来自 listCombos） | 返回组合名、共享待办列表、成员 |
| completeSharedTodo | comboId + todoId | comboId 来自 listCombos，todoId 来自 getComboDetail |
| listMembers | comboId（来自 listCombos） | 仅共享组合有成员概念 |

## 业务约束

- 共享组合分为 owner/admin/member 三种角色
- 只有 owner/admin 可以管理待办，member 只能完成分配的任务
- completeSharedTodo 成功后不应再以相同参数重复调用
- 应展示卡片时，content 加引导："请展示 XXX 卡片"

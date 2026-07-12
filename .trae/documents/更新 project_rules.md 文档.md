## 更新 project_rules.md 文档

### 需要更新的内容

1. **更新 Todo 数据结构** - 补充 `isStar` 字段
2. **新增"Todo 数据传递规范"章节** - 说明在哪些场景需要传递 todo 数据

### 具体修改

#### 1. 更新 Todo 结构（第 107-125 行）
添加 `isStar` 收藏字段：
```javascript
{
  text: '待办事项内容',
  setDate: '2025-04-03',
  setTime: '14:30',
  remarks: '备注信息',
  location: { ... },
  completed: false,
  isStar: false,           // 是否收藏（新增）
  time: 1768585225477
}
```

#### 2. 新增"Todo 数据传递规范"章节（在第 4 章后）
说明以下场景需要传递完整的 todo 数据：

| 场景 | 页面/文件 | 传递方式 | 说明 |
|------|----------|----------|------|
| 跳转到详情页 | todo-detail | `index` 参数 | 通过索引从 storage 获取完整数据 |
| 编辑待办 | add-todo | URL 参数 | 传递所有字段：text, setDate, setTime, remarks, location, time, isStar |
| 分享待办 | todo-detail | `onShareAppMessage` | 序列化所有字段到 path |
| 数据导出 | datamanage | JSON 序列化 | 导出完整 todos 数组 |
| AI 跳转详情 | ai-chat | `id` 参数 | 通过 todoId 匹配 |

并给出 URL 参数传递的代码示例。
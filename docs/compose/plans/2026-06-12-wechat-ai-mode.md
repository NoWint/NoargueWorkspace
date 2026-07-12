# 微信 AI 开发模式接入 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为时光绿径待办小程序接入微信 AI 开发模式（beta），支持用户通过自然语言完成待办管理、组合协作、数据查询等操作

**Architecture:** 创建 1 个独立分包 `packageAI/`，内含 3 个 SKILL（todo-manager / combo-collab / insights），每个 SKILL 包含 mcp.json（原子接口声明）、SKILL.md（业务说明）、原子接口实现（apis/）、原子组件（components/）。通过中间件复用登录态。AGENTS.md 作为全局提示词。

**Tech Stack:** 微信小程序原生框架、TDesign MiniProgram、wx.request、wx.getStorageSync、wx.login

---

## 文件结构总览

```
AGENTS.md                              # 新增 - 全局提示词
app.json                               # 修改 - 增加 agent 字段 + packageAI 分包
packageAI/                             # 新增独立分包
├── skills/
│   ├── todo-manager/
│   │   ├── SKILL.md                   # 待办管理业务说明
│   │   ├── mcp.json                   # 原子接口声明（6 个 API）
│   │   ├── index.js                   # 注册原子接口 + 中间件
│   │   ├── apis/
│   │   │   ├── createTodo.js
│   │   │   ├── listTodos.js
│   │   │   ├── completeTodo.js
│   │   │   ├── updateTodo.js
│   │   │   ├── deleteTodo.js
│   │   │   └── searchTodos.js
│   │   └── components/
│   │       ├── todo-list-card/        # todo-list-card.wxml/js/json/wxss
│   │       ├── todo-card/             # todo-card.wxml/js/json/wxss
│   │       └── todo-form-card/        # todo-form-card.wxml/js/json/wxss
│   │
│   ├── combo-collab/
│   │   ├── SKILL.md
│   │   ├── mcp.json                   # 4 个 API
│   │   ├── index.js
│   │   ├── apis/
│   │   │   ├── listCombos.js
│   │   │   ├── getComboDetail.js
│   │   │   ├── completeSharedTodo.js
│   │   │   └── listMembers.js
│   │   └── components/
│   │       ├── combo-card/
│   │       └── shared-todo-card/
│   │
│   └── insights/
│       ├── SKILL.md
│       ├── mcp.json                   # 7 个 API
│       ├── index.js
│       ├── apis/
│       │   ├── getCalendar.js
│       │   ├── getStats.js
│       │   ├── getStarredTodos.js
│       │   ├── getDeletedTodos.js
│       │   ├── restoreTodo.js
│       │   ├── getMotivation.js
│       │   └── getFoodSuggestion.js
│       └── components/
│           ├── stats-card/
│           ├── calendar-card/
│           └── trash-list/
```

---

### Task 1: 环境准备与配置

**Files:**
- Modify: `app.json`
- Create: `packageAI/` 目录

- [ ] **Step 1: 修改 app.json，添加 packageAI 独立分包和 agent 字段**

读取并修改 `app.json`，在 `subPackages` 数组中添加独立分包：

```json
{
  "pages": [...],
  "subPackages": [
    { "root": "packageAdmin", "pages": [...] },
    { "root": "packageCombo", "pages": [...] },
    { "root": "packageTools", "pages": [...] },
    {
      "root": "packageAI",
      "independent": true,
      "pages": []
    }
  ],
  "preloadRule": {...},
  "lazyCodeLoading": "requiredComponents",
  "agent": {
    "skills": [
      {
        "name": "todo-manager",
        "description": "管理个人待办事项，支持创建、查看、完成、编辑、删除和搜索待办",
        "path": "packageAI/skills/todo-manager"
      },
      {
        "name": "combo-collab",
        "description": "管理组合与协作，支持查看组合、共享待办、成员信息和完成共享待办",
        "path": "packageAI/skills/combo-collab"
      },
      {
        "name": "insights",
        "description": "数据洞察与小工具，支持日历查询、统计、收藏、回收站、每日激励和美食推荐",
        "path": "packageAI/skills/insights"
      }
    ],
    "instruction": "AGENTS.md"
  }
}
```

- [ ] **Step 2: 创建 packageAI 基础目录**

```bash
mkdir -p packageAI/skills/todo-manager/apis packageAI/skills/todo-manager/components/todo-list-card packageAI/skills/todo-manager/components/todo-card packageAI/skills/todo-manager/components/todo-form-card
mkdir -p packageAI/skills/combo-collab/apis packageAI/skills/combo-collab/components/combo-card packageAI/skills/combo-collab/components/shared-todo-card
mkdir -p packageAI/skills/insights/apis packageAI/skills/insights/components/stats-card packageAI/skills/insights/components/calendar-card packageAI/skills/insights/components/trash-list
```

- [ ] **Step 3: 验证配置**

用开发者工具打开项目，确认无编译错误。

---

### Task 2: AGENTS.md 全局提示词

**Covers:** 全局提示词

**Files:**
- Create: `AGENTS.md`

- [ ] **Step 1: 创建 AGENTS.md**

```markdown
# 时光绿径待办 AI 助手

你是一个待办事项管理助手，帮助用户管理个人任务和团队协作。你运行在「时光绿径待办」微信小程序中。

## 通用规范

1. **日期格式**：统一使用 YYYY-MM-DD 格式（如 2026-06-12）
2. **时间格式**：统一使用 HH:MM 格式（如 14:30）
3. **默认日期**：用户未指定日期时，默认使用当天
4. **默认时间**：用户未指定时间时，默认使用 12:00
5. **待办上限**：普通用户最多 100 个待办，可通过观看广告增加
6. **软删除**：删除操作是软删除，已删除待办进入回收站，30 天后自动清理

## SKILL 说明

本小程序提供三个 SKILL：

1. **todo-manager**（待办管理）：创建、查看、完成、编辑、删除和搜索个人待办事项
2. **combo-collab**（组合协作）：管理组合（文件夹）、共享组合内的协作待办
3. **insights**（数据洞察）：日历查询、统计数据、收藏、回收站、小工具

## 回答风格

- 用简洁友好的中文回复
- 操作成功后，用一句话告知用户结果
- 信息查询时，结构清晰地展示关键数据
- 用户意图不明确时，主动询问澄清
- 不要编造不存在的功能
```

- [ ] **Step 2: 验证文件大小不超过 10000 字节**

---

### Task 3: 通用基础设施 — API 工具函数与中间件

**Files:**
- Create: `packageAI/skills/todo-manager/index.js` 中的中间件（先写再逐步添加 API）
- Create: `packageAI/skills/todo-manager/utils.js`（API 基础工具）

- [ ] **Step 1: 创建共享 API 工具函数**

```javascript
// packageAI/skills/todo-manager/utils.js
const API_BASE = 'https://api.yzjtiantian.cn'

function getToken() {
  return wx.getStorageSync('token') || ''
}

async function request(method, path, data) {
  const token = getToken()
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${API_BASE}${path}`,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      success: (res) => resolve(res.data),
      fail: (err) => reject(err)
    })
  })
}

module.exports = { request, getToken, API_BASE }
```

其他 SKILL 可复用此文件（相同路径模式）。

- [ ] **Step 2: 在 todo-manager/index.js 中创建中间件**

```javascript
// packageAI/skills/todo-manager/index.js
const createTodo = require('./apis/createTodo')
const listTodos = require('./apis/listTodos')
const completeTodo = require('./apis/completeTodo')
const updateTodo = require('./apis/updateTodo')
const deleteTodo = require('./apis/deleteTodo')
const searchTodos = require('./apis/searchTodos')

const skill = wx.modelContext.createSkill('/packageAI/skills/todo-manager')

// 登录态中间件
skill.use(async (ctx, next) => {
  const token = wx.getStorageSync('token')
  if (!token) {
    const { code } = await wx.login()
    const res = await wx.request({
      url: 'https://api.yzjtiantian.cn/auth/login',
      method: 'POST',
      data: { code }
    })
    if (res.data && res.data.token) {
      wx.setStorageSync('token', res.data.token)
    }
  }
  console.log(`[AI Skill] Executing: ${ctx.name}`)
  await next()
})

skill.registerAPI('createTodo', createTodo)
skill.registerAPI('listTodos', listTodos)
skill.registerAPI('completeTodo', completeTodo)
skill.registerAPI('updateTodo', updateTodo)
skill.registerAPI('deleteTodo', deleteTodo)
skill.registerAPI('searchTodos', searchTodos)

module.exports = { skill }
```

---

### Task 4: todo-manager SKILL — mcp.json

**Covers:** 原子接口 Schema 声明

**Files:**
- Create: `packageAI/skills/todo-manager/mcp.json`

- [ ] **Step 1: 创建 mcp.json**

```json
{
  "apis": [
    {
      "name": "createTodo",
      "description": "创建一条新的待办事项。用户表达『添加』『新建』『创建』『记一下』等意图时调用",
      "_meta": {
        "ui": { "componentPath": "components/todo-form-card" }
      },
      "inputSchema": {
        "type": "object",
        "properties": {
          "text": {
            "type": "string",
            "description": "待办内容，必填。例如『买牛奶』『提交周报』"
          },
          "setDate": {
            "type": "string",
            "description": "日期，YYYY-MM-DD 格式。未指定时留空"
          },
          "setTime": {
            "type": "string",
            "description": "时间，HH:MM 格式。未指定时留空"
          },
          "remarks": {
            "type": "string",
            "description": "备注说明，可留空"
          },
          "tags": {
            "type": "array",
            "items": { "type": "number" },
            "description": "标签ID数组，如 [1,2]。1=工作 2=学习 3=生活 4=健康 5=购物 6=其他。用户未指定时传空数组"
          }
        },
        "required": ["text"]
      },
      "outputSchema": {}
    },
    {
      "name": "listTodos",
      "description": "查询待办列表，支持按条件筛选。用户问『我的待办』『今天有什么』等时调用",
      "_meta": {
        "ui": { "componentPath": "components/todo-list-card" }
      },
      "inputSchema": {
        "type": "object",
        "properties": {
          "date": {
            "type": "string",
            "description": "筛选日期，YYYY-MM-DD 格式。不传则返回所有待办"
          },
          "completed": {
            "type": "boolean",
            "description": "筛选完成状态。不传返回全部"
          },
          "tagId": {
            "type": "number",
            "description": "按标签筛选。不传返回全部"
          },
          "isStar": {
            "type": "boolean",
            "description": "是否只显示收藏的待办。不传返回全部"
          },
          "keyword": {
            "type": "string",
            "description": "关键词搜索（text 和 remarks 字段）。不传返回全部"
          }
        }
      },
      "outputSchema": {}
    },
    {
      "name": "completeTodo",
      "description": "切换待办的完成/未完成状态。用户说『完成』『标记完成』『取消完成』时调用",
      "inputSchema": {
        "type": "object",
        "properties": {
          "todoId": {
            "type": "string",
            "description": "待办ID，取自 listTodos 返回的 id 字段"
          },
          "completed": {
            "type": "boolean",
            "description": "true=标记完成，false=取消完成"
          }
        },
        "required": ["todoId", "completed"]
      },
      "outputSchema": {}
    },
    {
      "name": "updateTodo",
      "description": "编辑已有的待办事项。用户说『修改』『编辑』『改一下』等意图时调用",
      "inputSchema": {
        "type": "object",
        "properties": {
          "todoId": {
            "type": "string",
            "description": "待办ID，取自 listTodos 返回的 id 字段"
          },
          "text": {
            "type": "string",
            "description": "新的待办内容"
          },
          "setDate": {
            "type": "string",
            "description": "新的日期，YYYY-MM-DD 格式"
          },
          "setTime": {
            "type": "string",
            "description": "新的时间，HH:MM 格式"
          },
          "remarks": {
            "type": "string",
            "description": "新的备注"
          }
        },
        "required": ["todoId"]
      },
      "outputSchema": {}
    },
    {
      "name": "deleteTodo",
      "description": "删除待办事项（软删除，进入回收站）。用户说『删除』『移除』时调用",
      "inputSchema": {
        "type": "object",
        "properties": {
          "todoId": {
            "type": "string",
            "description": "待办ID，取自 listTodos 返回的 id 字段"
          }
        },
        "required": ["todoId"]
      },
      "outputSchema": {}
    },
    {
      "name": "searchTodos",
      "description": "搜索待办事项。用户说『搜索』『查找』『找一下』时调用",
      "inputSchema": {
        "type": "object",
        "properties": {
          "keyword": {
            "type": "string",
            "description": "搜索关键词，匹配 text 和 remarks 字段"
          }
        },
        "required": ["keyword"]
      },
      "outputSchema": {}
    }
  ]
}
```

- [ ] **Step 2: 验证 mcp.json 大小（去除 outputSchema 和空格后不超过 24000 字节）**

---

### Task 5: todo-manager SKILL — 原子接口实现

**Files:**
- Create: `packageAI/skills/todo-manager/apis/createTodo.js`
- Create: `packageAI/skills/todo-manager/apis/listTodos.js`
- Create: `packageAI/skills/todo-manager/apis/completeTodo.js`
- Create: `packageAI/skills/todo-manager/apis/updateTodo.js`
- Create: `packageAI/skills/todo-manager/apis/deleteTodo.js`
- Create: `packageAI/skills/todo-manager/apis/searchTodos.js`

- [ ] **Step 1: 创建 createTodo.js**

```javascript
// packageAI/skills/todo-manager/apis/createTodo.js
const { request } = require('../utils')

async function createTodo({ text, setDate, setTime, remarks, tags }) {
  if (!text || text.trim() === '') {
    return {
      isError: true,
      content: [{ type: 'text', text: '待办内容不能为空，请提供待办的具体事项' }]
    }
  }
  try {
    const now = Date.now()
    const todoId = `todo_${now}_${Math.random().toString(36).slice(2, 8)}`
    const newTodo = {
      id: todoId,
      text: text.trim(),
      setDate: setDate || new Date().toISOString().slice(0, 10),
      setTime: setTime || '12:00',
      remarks: remarks || '',
      completed: false,
      isStar: false,
      time: now,
      tags: tags || [],
      version: 1,
      isDeleted: false,
      updatedAt: now
    }
    await request('POST', '/todos/create', newTodo)
    // 更新本地存储
    const todos = wx.getStorageSync('todos') || []
    todos.push(newTodo)
    wx.setStorageSync('todos', todos)
    return {
      isError: false,
      content: [{ type: 'text', text: `已创建待办：${text.trim()}` }],
      structuredContent: newTodo
    }
  } catch (err) {
    return {
      isError: true,
      content: [{ type: 'text', text: '创建待办失败，请稍后重试' }]
    }
  }
}

module.exports = createTodo
```

- [ ] **Step 2: 创建 listTodos.js**

```javascript
// packageAI/skills/todo-manager/apis/listTodos.js
async function listTodos({ date, completed, tagId, isStar, keyword }) {
  let todos = wx.getStorageSync('todos') || []
  // 过滤已删除
  todos = todos.filter(t => !t.isDeleted)
  if (date) todos = todos.filter(t => t.setDate === date)
  if (completed !== undefined) todos = todos.filter(t => t.completed === completed)
  if (tagId) todos = todos.filter(t => (t.tags || []).includes(tagId))
  if (isStar) todos = todos.filter(t => t.isStar)
  if (keyword) {
    const kw = keyword.toLowerCase()
    todos = todos.filter(t => t.text.toLowerCase().includes(kw) || (t.remarks || '').toLowerCase().includes(kw))
  }
  // 按创建时间降序
  todos.sort((a, b) => (b.time || 0) - (a.time || 0))
  const total = todos.length
  const completedCount = todos.filter(t => t.completed).length
  return {
    isError: false,
    content: [{ type: 'text', text: `找到 ${total} 条待办，已完成 ${completedCount} 条` }],
    structuredContent: { todos: todos.slice(0, 20), total, completedCount }
  }
}

module.exports = listTodos
```

- [ ] **Step 3: 创建 completeTodo.js**

```javascript
// packageAI/skills/todo-manager/apis/completeTodo.js
const { request } = require('../utils')

async function completeTodo({ todoId, completed }) {
  try {
    const now = Date.now()
    const todos = wx.getStorageSync('todos') || []
    const todo = todos.find(t => t.id === todoId)
    if (!todo) return { isError: true, content: [{ type: 'text', text: '未找到该待办' }] }
    todo.completed = completed ? now : false
    todo.version = (todo.version || 1) + 1
    todo.updatedAt = now
    await request('PUT', `/todos/${todoId}`, todo)
    wx.setStorageSync('todos', todos)
    const status = completed ? '已完成' : '标记为未完成'
    return {
      isError: false,
      content: [{ type: 'text', text: `已将「${todo.text}」${status}` }]
    }
  } catch (err) {
    return { isError: true, content: [{ type: 'text', text: '操作失败，请稍后重试' }] }
  }
}

module.exports = completeTodo
```

- [ ] **Step 4: 创建 updateTodo.js**

```javascript
// packageAI/skills/todo-manager/apis/updateTodo.js
const { request } = require('../utils')

async function updateTodo({ todoId, text, setDate, setTime, remarks }) {
  try {
    const todos = wx.getStorageSync('todos') || []
    const todo = todos.find(t => t.id === todoId)
    if (!todo) return { isError: true, content: [{ type: 'text', text: '未找到该待办' }] }
    if (text) todo.text = text
    if (setDate) todo.setDate = setDate
    if (setTime) todo.setTime = setTime
    if (remarks !== undefined) todo.remarks = remarks
    todo.version = (todo.version || 1) + 1
    todo.updatedAt = Date.now()
    await request('PUT', `/todos/${todoId}`, todo)
    wx.setStorageSync('todos', todos)
    return {
      isError: false,
      content: [{ type: 'text', text: `已更新待办「${todo.text}」` }]
    }
  } catch (err) {
    return { isError: true, content: [{ type: 'text', text: '编辑失败，请稍后重试' }] }
  }
}

module.exports = updateTodo
```

- [ ] **Step 5: 创建 deleteTodo.js**

```javascript
// packageAI/skills/todo-manager/apis/deleteTodo.js
const { request } = require('../utils')

async function deleteTodo({ todoId }) {
  try {
    const todos = wx.getStorageSync('todos') || []
    const todo = todos.find(t => t.id === todoId)
    if (!todo) return { isError: true, content: [{ type: 'text', text: '未找到该待办' }] }
    const now = Date.now()
    todo.isDeleted = true
    todo.deletedAt = now
    todo.version = (todo.version || 1) + 1
    todo.updatedAt = now
    await request('DELETE', `/todos/${todoId}`)
    wx.setStorageSync('todos', todos)
    return {
      isError: false,
      content: [{ type: 'text', text: `已删除「${todo.text}」，可在回收站中找回` }]
    }
  } catch (err) {
    return { isError: true, content: [{ type: 'text', text: '删除失败，请稍后重试' }] }
  }
}

module.exports = deleteTodo
```

- [ ] **Step 6: 创建 searchTodos.js**

```javascript
// packageAI/skills/todo-manager/apis/searchTodos.js
async function searchTodos({ keyword }) {
  if (!keyword || !keyword.trim()) {
    return { isError: true, content: [{ type: 'text', text: '请提供搜索关键词' }] }
  }
  const todos = wx.getStorageSync('todos') || []
  const kw = keyword.toLowerCase()
  const results = todos.filter(t =>
    !t.isDeleted && (
      t.text.toLowerCase().includes(kw) ||
      (t.remarks || '').toLowerCase().includes(kw)
    )
  )
  return {
    isError: false,
    content: [{ type: 'text', text: `搜索「${keyword}」找到 ${results.length} 条结果` }],
    structuredContent: { keyword, todos: results.slice(0, 20), total: results.length }
  }
}

module.exports = searchTodos
```

---

### Task 6: todo-manager SKILL — SKILL.md 与原子组件

**Files:**
- Create: `packageAI/skills/todo-manager/SKILL.md`
- Create: `packageAI/skills/todo-manager/components/todo-list-card/`（4文件）
- Create: `packageAI/skills/todo-manager/components/todo-card/`（4文件）
- Create: `packageAI/skills/todo-manager/components/todo-form-card/`（4文件）

- [ ] **Step 1: 创建 SKILL.md**

```markdown
# 待办管理 SKILL

## 业务流程
1. 用户意图「创建待办」→ createTodo → 用户确认 → 渲染 todo-form-card
2. 用户意图「查看待办」→ listTodos → 渲染 todo-list-card
3. 用户意图「完成/取消完成」→ completeTodo → 告知结果
4. 用户意图「编辑待办」→ 先 listTodos → 用户选择 → updateTodo → 告知结果
5. 用户意图「删除待办」→ 先 listTodos → 用户选择 → deleteTodo → 告知结果
6. 用户意图「搜索待办」→ searchTodos → 渲染搜索结果

## 接口依赖关系
- updateTodo 需要先从 listTodos 获取 todoId
- completeTodo 需要先从 listTodos 获取 todoId
- deleteTodo 需要先从 listTodos 获取 todoId

## 业务约束
- 删除操作为软删除，不可逆，30天后自动清理
- 修改时 version 自动递增
```

- [ ] **Step 2~4: 创建原子组件 todo-list-card**

创建标准微信自定义组件：

`todo-list-card.wxml`:
```xml
<view class="todo-list">
  <view class="summary">共 {{total}} 条，已完成 {{completedCount}} 条</view>
  <view wx:for="{{todos}}" wx:key="id" class="todo-item">
    <view class="todo-text {{item.completed ? 'completed' : ''}}">{{item.text}}</view>
    <view class="todo-meta">{{item.setDate}} {{item.setTime}}</view>
  </view>
</view>
```

`todo-list-card.wxss`:
```css
.todo-list { padding: 16rpx; }
.summary { font-size: 28rpx; color: #666; margin-bottom: 16rpx; }
.todo-item { padding: 20rpx 0; border-bottom: 1rpx solid #eee; }
.todo-text { font-size: 30rpx; color: #333; }
.todo-text.completed { text-decoration: line-through; color: #999; }
.todo-meta { font-size: 24rpx; color: #999; margin-top: 8rpx; }
```

`todo-list-card.json`:
```json
{ "component": true, "usingComponents": {} }
```

`todo-list-card.js`:
```javascript
Component({
  lifetimes: {
    created() {
      const modelCtx = wx.modelContext.getContext(this)
      modelCtx.on(wx.modelContext.NotificationType.Result, (data) => {
        this.setData(data.result.structuredContent || {})
      })
    }
  }
})
```

（todo-card 和 todo-form-card 同理，按原子组件规范实现）

---

### Task 7: combo-collab SKILL

**Covers:** 组合协作原子接口

**Files:**
- Create: `packageAI/skills/combo-collab/SKILL.md`
- Create: `packageAI/skills/combo-collab/mcp.json`
- Create: `packageAI/skills/combo-collab/index.js`
- Create: `packageAI/skills/combo-collab/apis/listCombos.js`
- Create: `packageAI/skills/combo-collab/apis/getComboDetail.js`
- Create: `packageAI/skills/combo-collab/apis/completeSharedTodo.js`
- Create: `packageAI/skills/combo-collab/apis/listMembers.js`
- Create: `packageAI/skills/combo-collab/utils.js`（复用 todo-manager/utils.js 模式）
- Create: `packageAI/skills/combo-collab/components/combo-card/`
- Create: `packageAI/skills/combo-collab/components/shared-todo-card/`

- [ ] **Step 1: 创建 utils.js**

同 todo-manager/utils.js，复制即可。

- [ ] **Step 2: 创建 mcp.json**

```json
{
  "apis": [
    {
      "name": "listCombos",
      "description": "获取用户的组合列表，支持筛选私有或共享。用户问『我的组合』『共享组合』时调用",
      "_meta": {
        "ui": { "componentPath": "components/combo-card" }
      },
      "inputSchema": {
        "type": "object",
        "properties": {
          "type": {
            "type": "string",
            "enum": ["private", "shared"],
            "description": "筛选类型：private=私有组合，shared=共享组合。不传返回全部"
          }
        }
      },
      "outputSchema": {}
    },
    {
      "name": "getComboDetail",
      "description": "查看指定组合的详情，包含组合内的共享待办列表",
      "_meta": {
        "ui": { "componentPath": "components/shared-todo-card" }
      },
      "inputSchema": {
        "type": "object",
        "properties": {
          "comboId": {
            "type": "number",
            "description": "组合ID，取自 listCombos 返回的 id"
          }
        },
        "required": ["comboId"]
      },
      "outputSchema": {}
    },
    {
      "name": "completeSharedTodo",
      "description": "完成或取消完成共享组合中的待办",
      "inputSchema": {
        "type": "object",
        "properties": {
          "comboId": {
            "type": "number",
            "description": "组合ID"
          },
          "todoId": {
            "type": "number",
            "description": "共享待办ID，取自 getComboDetail 返回的 id"
          },
          "completed": {
            "type": "boolean",
            "description": "true=完成，false=取消完成"
          }
        },
        "required": ["comboId", "todoId", "completed"]
      },
      "outputSchema": {}
    },
    {
      "name": "listMembers",
      "description": "查看共享组合的成员列表",
      "inputSchema": {
        "type": "object",
        "properties": {
          "comboId": {
            "type": "number",
            "description": "组合ID"
          }
        },
        "required": ["comboId"]
      },
      "outputSchema": {}
    }
  ]
}
```

- [ ] **Step 3: 创建 index.js（中间件 + 注册）**

```javascript
// packageAI/skills/combo-collab/index.js
const listCombos = require('./apis/listCombos')
const getComboDetail = require('./apis/getComboDetail')
const completeSharedTodo = require('./apis/completeSharedTodo')
const listMembers = require('./apis/listMembers')

const skill = wx.modelContext.createSkill('/packageAI/skills/combo-collab')

skill.use(async (ctx, next) => {
  const token = wx.getStorageSync('token')
  if (!token) {
    const { code } = await wx.login()
    const res = await wx.request({
      url: 'https://api.yzjtiantian.cn/auth/login',
      method: 'POST',
      data: { code }
    })
    if (res.data && res.data.token) {
      wx.setStorageSync('token', res.data.token)
    }
  }
  await next()
})

skill.registerAPI('listCombos', listCombos)
skill.registerAPI('getComboDetail', getComboDetail)
skill.registerAPI('completeSharedTodo', completeSharedTodo)
skill.registerAPI('listMembers', listMembers)

module.exports = { skill }
```

- [ ] **Step 4: 创建 4 个原子接口实现**

```javascript
// listCombos.js
const { request } = require('../utils')
async function listCombos({ type }) {
  try {
    const res = await request('GET', '/combos/list')
    let combos = res.data || []
    if (type === 'private') combos = combos.filter(c => !c.is_shared)
    if (type === 'shared') combos = combos.filter(c => c.is_shared)
    return {
      isError: false,
      content: [{ type: 'text', text: `共有 ${combos.length} 个组合` }],
      structuredContent: { combos }
    }
  } catch (err) {
    return { isError: true, content: [{ type: 'text', text: '获取组合列表失败' }] }
  }
}
module.exports = listCombos
```

```javascript
// getComboDetail.js
const { request } = require('../utils')
async function getComboDetail({ comboId }) {
  try {
    const res = await request('GET', `/combos/${comboId}`)
    return {
      isError: false,
      content: [{ type: 'text', text: `组合「${res.data.name}」有 ${res.data.shared_todos?.length || 0} 条共享待办` }],
      structuredContent: res.data
    }
  } catch (err) {
    return { isError: true, content: [{ type: 'text', text: '获取组合详情失败' }] }
  }
}
module.exports = getComboDetail
```

```javascript
// completeSharedTodo.js
const { request } = require('../utils')
async function completeSharedTodo({ comboId, todoId, completed }) {
  try {
    await request('PUT', `/collab/shared/${comboId}/todos/${todoId}/complete`, { completed })
    const status = completed ? '已完成' : '已取消完成'
    return { isError: false, content: [{ type: 'text', text: `共享待办${status}` }] }
  } catch (err) {
    return { isError: true, content: [{ type: 'text', text: '操作失败' }] }
  }
}
module.exports = completeSharedTodo
```

```javascript
// listMembers.js
const { request } = require('../utils')
async function listMembers({ comboId }) {
  try {
    const res = await request('GET', `/combos/${comboId}/members`)
    return {
      isError: false,
      content: [{ type: 'text', text: `该组合共有 ${res.data?.length || 0} 位成员` }],
      structuredContent: { members: res.data || [], comboId }
    }
  } catch (err) {
    return { isError: true, content: [{ type: 'text', text: '获取成员列表失败' }] }
  }
}
module.exports = listMembers
```

- [ ] **Step 5: 创建 SKILL.md**

```markdown
# 组合协作 SKILL

## 业务流程
1. 用户意图「查看组合」→ listCombos → 渲染 combo-card
2. 用户意图「查看组合内待办」→ getComboDetail → 渲染 shared-todo-card
3. 用户意图「完成共享待办」→ completeSharedTodo → 告知结果
4. 用户意图「查看成员」→ listMembers → 展示成员列表

## 业务约束
- 共享组合分为 owner/admin/member 三种角色
- 只有 owner/admin 可以管理待办，member 只能完成分配的任务
```

---

### Task 8: insights SKILL

**Covers:** 数据洞察与工具原子接口

**Files:**
- Create: `packageAI/skills/insights/SKILL.md`
- Create: `packageAI/skills/insights/mcp.json`
- Create: `packageAI/skills/insights/index.js`
- Create: `packageAI/skills/insights/apis/getCalendar.js`
- Create: `packageAI/skills/insights/apis/getStats.js`
- Create: `packageAI/skills/insights/apis/getStarredTodos.js`
- Create: `packageAI/skills/insights/apis/getDeletedTodos.js`
- Create: `packageAI/skills/insights/apis/restoreTodo.js`
- Create: `packageAI/skills/insights/apis/getMotivation.js`
- Create: `packageAI/skills/insights/apis/getFoodSuggestion.js`
- Create: `packageAI/skills/insights/utils.js`
- Create: `packageAI/skills/insights/components/stats-card/`
- Create: `packageAI/skills/insights/components/calendar-card/`
- Create: `packageAI/skills/insights/components/trash-list/`

- [ ] **Step 1: 创建 mcp.json**

```json
{
  "apis": [
    {
      "name": "getCalendar",
      "description": "查询某个月份的日历数据，展示每天有多少待办。用户问『日历』『这个月』时调用",
      "_meta": { "ui": { "componentPath": "components/calendar-card" } },
      "inputSchema": {
        "type": "object",
        "properties": {
          "year": { "type": "number", "description": "年份，如 2026。不传默认当年" },
          "month": { "type": "number", "description": "月份，1-12。不传默认当月" }
        }
      },
      "outputSchema": {}
    },
    {
      "name": "getStats",
      "description": "获取待办完成情况的统计数据。用户问『统计』『完成率』『进度』时调用",
      "_meta": { "ui": { "componentPath": "components/stats-card" } },
      "inputSchema": {
        "type": "object",
        "properties": {
          "days": {
            "type": "number",
            "description": "统计最近多少天的数据，默认7天"
          }
        }
      },
      "outputSchema": {}
    },
    {
      "name": "getStarredTodos",
      "description": "获取所有收藏的待办。用户问『收藏』『星标』时调用",
      "inputSchema": { "type": "object", "properties": {} },
      "outputSchema": {}
    },
    {
      "name": "getDeletedTodos",
      "description": "获取回收站中的已删除待办列表。用户问『回收站』『已删除』时调用",
      "_meta": { "ui": { "componentPath": "components/trash-list" } },
      "inputSchema": { "type": "object", "properties": {} },
      "outputSchema": {}
    },
    {
      "name": "restoreTodo",
      "description": "从回收站恢复已删除的待办。用户说『恢复』时调用",
      "inputSchema": {
        "type": "object",
        "properties": {
          "todoId": {
            "type": "string",
            "description": "待办ID，取自 getDeletedTodos 返回的 id"
          }
        },
        "required": ["todoId"]
      },
      "outputSchema": {}
    },
    {
      "name": "getMotivation",
      "description": "获取每日激励语录。用户说『激励』『鸡汤』『鼓励』时调用",
      "inputSchema": { "type": "object", "properties": {} },
      "outputSchema": {}
    },
    {
      "name": "getFoodSuggestion",
      "description": "随机推荐今天吃什么。用户说『吃什么』『美食推荐』时调用",
      "inputSchema": {
        "type": "object",
        "properties": {
          "mealType": {
            "type": "string",
            "enum": ["breakfast", "lunch", "dinner", "snack"],
            "description": "餐型：breakfast=早餐 lunch=午餐 dinner=晚餐 snack=宵夜。不传则随机"
          }
        }
      },
      "outputSchema": {}
    }
  ]
}
```

- [ ] **Step 2: 创建原子接口实现**

`getCalendar.js` — 从 app.globalData.calendarCache 读取：
```javascript
async function getCalendar({ year, month }) {
  const now = new Date()
  const y = year || now.getFullYear()
  const m = month || (now.getMonth() + 1)
  const app = getApp()
  const cache = app.globalData.calendarCache || {}
  // 筛选当月数据
  const prefix = `${y}-${String(m).padStart(2, '0')}`
  const days = {}
  for (const [date, info] of Object.entries(cache)) {
    if (date.startsWith(prefix)) {
      days[date] = info
    }
  }
  return {
    isError: false,
    content: [{ type: 'text', text: `已加载 ${y} 年 ${m} 月的日历数据` }],
    structuredContent: { year: y, month: m, days }
  }
}
module.exports = getCalendar
```

`getStats.js` — 本地计算：
```javascript
async function getStats({ days }) {
  const d = days || 7
  const todos = (wx.getStorageSync('todos') || []).filter(t => !t.isDeleted)
  const now = Date.now()
  const cutoff = now - d * 86400000
  const recent = todos.filter(t => (t.time || 0) >= cutoff)
  const completed = recent.filter(t => t.completed).length
  return {
    isError: false,
    content: [{ type: 'text', text: `最近 ${d} 天：共 ${recent.length} 条，完成 ${completed} 条，完成率 ${d > 0 ? Math.round(completed/recent.length*100) : 0}%` }],
    structuredContent: { total: recent.length, completed, rate: recent.length > 0 ? Math.round(completed/recent.length*100) : 0 }
  }
}
module.exports = getStats
```

`getStarredTodos.js`:
```javascript
async function getStarredTodos() {
  const todos = (wx.getStorageSync('todos') || []).filter(t => !t.isDeleted && t.isStar)
  return {
    isError: false,
    content: [{ type: 'text', text: `共有 ${todos.length} 条收藏待办` }],
    structuredContent: { todos: todos.slice(0, 20), total: todos.length }
  }
}
module.exports = getStarredTodos
```

`getDeletedTodos.js`:
```javascript
const { request } = require('../utils')
async function getDeletedTodos() {
  try {
    let todos = wx.getStorageSync('todos') || []
    todos = todos.filter(t => t.isDeleted)
    return {
      isError: false,
      content: [{ type: 'text', text: `回收站中有 ${todos.length} 条待办` }],
      structuredContent: { todos: todos.slice(0, 20), total: todos.length }
    }
  } catch (err) {
    return { isError: true, content: [{ type: 'text', text: '获取回收站数据失败' }] }
  }
}
module.exports = getDeletedTodos
```

`restoreTodo.js`:
```javascript
const { request } = require('../utils')
async function restoreTodo({ todoId }) {
  try {
    const todos = wx.getStorageSync('todos') || []
    const todo = todos.find(t => t.id === todoId)
    if (!todo) return { isError: true, content: [{ type: 'text', text: '未找到该待办' }] }
    todo.isDeleted = false
    todo.deletedAt = null
    todo.version = (todo.version || 1) + 1
    todo.updatedAt = Date.now()
    await request('POST', `/todos/restore/${todoId}`)
    wx.setStorageSync('todos', todos)
    return { isError: false, content: [{ type: 'text', text: `已恢复「${todo.text}」` }] }
  } catch (err) {
    return { isError: true, content: [{ type: 'text', text: '恢复失败' }] }
  }
}
module.exports = restoreTodo
```

`getMotivation.js`:
```javascript
const quotes = [
  '今天的努力是明天的基石。',
  '不要等待机会，而要创造机会。',
  '坚持就是胜利。',
  '行动是治愈恐惧的良药。',
  '千里之行，始于足下。'
]
async function getMotivation() {
  const quote = quotes[Math.floor(Math.random() * quotes.length)]
  return {
    isError: false,
    content: [{ type: 'text', text: `💪 ${quote}` }],
    structuredContent: { quote }
  }
}
module.exports = getMotivation
```

`getFoodSuggestion.js` — 从小程序现有数据集中随机推荐。

- [ ] **Step 3: 创建 index.js + SKILL.md**

与 todo-manager 模式相同。

- [ ] **Step 4: 创建原子组件**

stats-card、calendar-card、trash-list 按标准原子组件规范创建。

---

### Task 9: 整体调试与验证

**Covers:** 端到端验证

- [ ] **Step 1: 开发者工具预览**

用 Nightly 版开发者工具打开项目，切换到「小程序 AI 编译」模式，基础库选 3.16.1。

- [ ] **Step 2: 单 SKILL 调试**

在开发者工具中对每个 SKILL 进行单步调试，验证：
- todo-manager: 创建→查看→完成→编辑→删除→搜索 全流程
- combo-collab: 查看组合→查看详情→完成共享待办→查看成员
- insights: 日历→统计→收藏→回收站→恢复→激励→美食

- [ ] **Step 3: 真机预览（iOS 8.0.74+）**

通过开发者工具预览二维码，在 iOS 真机上测试对话流程。

- [ ] **Step 4: 使用 wxa-skills-validate 校验**

安装 wxa-skills-validate，自动验证生成的组件和接口。

- [ ] **Step 5: 使用 wxa-skills-eval 评测**

安装 wxa-skills-eval，配置模型，运行评测并查看报告。

- [ ] **Step 6: 提交代码**

```bash
git add AGENTS.md app.json packageAI/
git commit -m "feat: 接入微信AI开发模式，创建3个SKILL覆盖待办/组合/洞察"
```

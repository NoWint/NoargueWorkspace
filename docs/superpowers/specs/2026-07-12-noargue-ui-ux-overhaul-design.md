# NoArgue UI/UX 融合优化设计

> **日期**: 2026-07-12
> **状态**: 已与用户确认方向（基于 dashboard-overhaul-v2.html mockup）
> **Mockup**: `.superpowers/brainstorm/29075-1783857540/content/dashboard-overhaul-v2.html`

## 1. 背景与目标

### 1.1 背景

现有 React 重构已完成 6 个 P0 页面与 5 个 P1 页面，设计语言采用 BonjourPrism（pine green #01796f、dark-first、0 border-radius、Geist + Songti SC）。用户反馈当前 UI/UX 在以下四个维度仍不够完美：

- 布局与信息架构
- 视觉细节与精致度
- 交互与动效体验
- 功能完整度

产品定位为 **效率工具 + 团队协作**。

### 1.2 设计原则

本次优化 **不推翻** 现有 dashboard 结构，而是在保留的基础上做针对性增强：

1. **保留三段式** — Hero + Stats + Grid 结构延续，不引入 split pane 布局
2. **保留设计语言** — Pine green / matte ceramic / 0 border-radius / 1px border 全部不变
3. **视觉克制** — 主色 #01796f 仅用于强调，避免过度装饰
4. **协作轻量化** — 协作信息以 avatar 组、活动流形式嵌入现有页面，不新建独立页
5. **效率可选** — ⌘K 命令面板作为可选快捷方式，不强制用户学习

### 1.3 目标

将现有 5 个核心页面（今日、全部待办、日历、统计、组合）从"功能完整"提升到"mockup 水准的精致与协作就绪"。

## 2. 优化维度概览

| 维度 | 优化点 | 影响页面 |
|------|--------|----------|
| 视觉精致 | Stat 卡片 sparkline 趋势线 | 今日、全部待办、统计 |
| 视觉精致 | 逾期数字 warn 色突出 | 今日、全部待办、日历 |
| 视觉精致 | 待办左侧 2px 优先级色条 | 今日、全部待办、日历详情 |
| 交互增强 | 标签卡片可点击筛选 | 今日 |
| 交互增强 | ⌘K 命令面板（可选） | 全局 |
| 交互增强 | Hover 反馈与平滑过渡 | 全局 |
| 协作信息 | 待办右侧 avatar 头像组 | 今日、全部待办 |
| 协作信息 | 共享组合活动流 | 组合 |
| 协作信息 | 组合卡片成员预览 | 组合 |
| 功能补全 | 日历单元格显示待办标题 | 日历 |
| 功能补全 | 统计页 sparkline + 4 图表 | 统计 |

## 3. 详细设计

### 3.1 Stat 卡片 sparkline 趋势线

**影响文件**:
- 修改: `website/src/design/primitives/Stat.tsx`
- 修改: `website/src/design/primitives/Stat.module.css`
- 修改: `website/src/features/todo/TodayView.tsx`
- 修改: `website/src/features/todo/AllTodosView.tsx`
- 修改: `website/src/features/stats/StatsView.tsx`

**设计**:

每个 Stat 卡片右上角添加一个 56×22 px 的 sparkline SVG，展示该指标最近 7 天的趋势。

```tsx
// Stat.tsx 新增可选 prop
interface StatProps {
  label: string
  value: React.ReactNode
  delta?: React.ReactNode
  accent?: boolean
  warn?: boolean
  spark?: number[]  // 新增：趋势数据点，如 [3, 5, 4, 7, 6, 8, 5]
}
```

**sparkline 渲染规则**:
- 数据点为空时不渲染
- 趋势上升用 `--success` (#62d178)，下降用 `--warn` (#eab308)，平稳用 `--primary` (#01796f)
- stroke-width: 1.5，无填充
- 定位: `position: absolute; right: 12px; top: 14px`

**数据来源**（今日/全部待办页使用最近 7 天，统计页使用最近 30 天）:
- 今日待办: 每日待办数量
- 本周完成: 每日完成数量
- 逾期: 每日逾期数量（下降为好，用 warn 色）
- 完成率: 每日完成率

### 3.2 逾期视觉标识

**影响文件**:
- 修改: `website/src/design/primitives/Stat.tsx`
- 修改: `website/src/features/todo/TodoItem.tsx`
- 修改: `website/src/features/todo/TodoItem.module.css`

**设计**:

1. Stat 卡片新增 `warn` prop，值为 true 时 `statVal` 使用 `--warn` (#eab308) 颜色
2. TodoItem 的 `todoMeta` 中逾期文案使用 `--destructive` (#ff6467) 颜色
3. 逾期文案格式: "逾期 N 天"（N > 0）或 "逾期"（N = 0，即今日到期未完成）

**TodoItem 逾期判断逻辑**:
```typescript
const isOverdue = !todo.completed && todo.setDate && todo.setDate < today
const overdueDays = isOverdue
  ? Math.floor((Date.now() - new Date(todo.setDate).getTime()) / 86400000)
  : 0
```

### 3.3 待办优先级色条

**影响文件**:
- 修改: `website/src/features/todo/TodoItem.tsx`
- 修改: `website/src/features/todo/TodoItem.module.css`

**设计**:

每个待办项左侧添加 2px 宽的垂直色条，根据优先级显示不同颜色：

| 优先级 | 颜色 | CSS 变量 |
|--------|------|----------|
| high | 红 | `--destructive` (#ff6467) |
| medium | 黄 | `--warn` (#eab308) |
| low | 灰 | `--mt3` (#4a4a4a) |

**实现方式**:
```css
.todo {
  position: relative;
  padding-left: 10px;  /* 为色条留空间 */
}
.todo::before {
  content: "";
  position: absolute;
  left: 0;
  top: 11px;
  bottom: 11px;
  width: 2px;
  background: var(--mt3);  /* 默认 low */
}
.todo.priHigh::before { background: var(--destructive); }
.todo.priMed::before { background: var(--warn); }
```

**优先级数据来源**:
- Todo 数据模型新增 `priority` 字段（可选值: `'high' | 'medium' | 'low'`，默认 `'low'`）
- 在 TodoForm 中添加优先级选择器（3 个按钮：高/中/低）
- 前端优先使用 todo 对象上的 priority 字段；后端 API 若未返回该字段，默认视为 'low'
- 后端 API 需确认是否支持 priority 字段的持久化；若不支持，前端仅做本地展示（不持久化），后续再补后端

### 3.4 标签卡片可点击筛选

**影响文件**:
- 修改: `website/src/features/todo/TodayView.tsx`
- 修改: `website/src/features/todo/TodayView.module.css`

**设计**:

今日页面右侧"常用标签"卡片中的每个标签变为可点击，点击后筛选主待办列表中包含该标签的待办。

**交互**:
- 点击标签 → 主待办列表筛选为该标签的待办
- 再次点击同一标签 → 取消筛选
- 被选中的标签添加 `pri` 样式（primary-soft 背景 + primary-line 边框）
- 在待办列表标题旁显示当前筛选状态："按「工作」筛选 ×"

**状态管理**:
```typescript
const [activeTagId, setActiveTagId] = useState<number | null>(null)

const filteredTodos = useMemo(() => {
  let result = todayTodos
  if (filter !== 'all') {
    result = result.filter(t => filter === 'completed' ? t.completed : !t.completed)
  }
  if (activeTagId !== null) {
    result = result.filter(t => t.tags?.includes(activeTagId))
  }
  return result
}, [todayTodos, filter, activeTagId])
```

### 3.5 ⌘K 命令面板（可选）

**影响文件**:
- 新增: `website/src/features/cmd/CommandPalette.tsx`
- 新增: `website/src/features/cmd/CommandPalette.module.css`
- 修改: `website/src/app/providers.tsx`（挂载全局组件）
- 修改: `website/src/features/layout/Topbar.tsx`（搜索框点击触发）

**设计**:

全局命令面板，通过 ⌘K（Mac）/ Ctrl+K（Windows）或点击顶部搜索框触发。

**功能**:
1. **快速搜索** — 输入关键词，实时搜索待办（客户端过滤）
2. **快速跳转** — 输入页面名称（今日、全部、日历、统计、组合），回车跳转
3. **快速创建** — 输入 "新建" 或 "+ "，回车跳转到新建待办页

**UI 结构**:
```
┌─────────────────────────────────────┐
│ ⌕  搜索待办、跳转页面、创建任务...    │  ← 输入框
├─────────────────────────────────────┤
│ 最近待办                             │  ← 分组标题
│   □ 完成 Q3 产品路线图评审    产品   │
│   □ 回复客户邮件              工作   │
│                                     │
│ 快速操作                             │
│   → 新建待办                  N     │
│   → 跳转到日历                      │
│   → 跳转到统计                      │
└─────────────────────────────────────┘
```

**样式**:
- 居中浮层，宽 560px，最大高度 480px
- 背景半透明遮罩 `rgba(0,0,0,0.6)`
- 卡片背景 `--card`，边框 `--border`
- 选中项背景 `--muted`，左侧 2px primary 色条

**键盘交互**:
- ↑↓ 选择项目
- Enter 执行
- Esc 关闭
- ⌘K / Ctrl+K 切换显示

**实现要点**:
- 使用 React Portal 挂载到 document.body
- 全局键盘监听在 `useEffect` 中注册
- 搜索使用 `useMemo` 客户端过滤，防抖 150ms
- 选中项使用 `useRef` + scrollIntoView 自动滚动

### 3.6 协作信息：avatar 头像组

**影响文件**:
- 新增: `website/src/design/primitives/AvatarGroup.tsx`
- 新增: `website/src/design/primitives/AvatarGroup.module.css`
- 修改: `website/src/features/todo/TodoItem.tsx`
- 修改: `website/src/features/todo/TodoItem.module.css`

**设计**:

待办项右侧显示关联成员的 avatar 头像组（仅共享组合中的待办显示）。

**AvatarGroup 组件**:
```tsx
interface AvatarGroupProps {
  members: Array<{
    id: number
    nickname: string
    avatar?: string
  }>
  max?: number  // 最多显示几个，默认 3
  size?: number  // 头像尺寸，默认 18
}
```

**渲染规则**:
- 头像圆形，18×18px，带 1.5px `--card` 色边框
- 头像之间重叠 -5px（`margin-left: -5px`）
- 超过 max 数量时，最后一个显示 "+N"
- 无头像时显示昵称首字母，背景色根据 id 取模从预设色板中选择

**预设色板**:
```typescript
const AVATAR_COLORS = ['#5b8def', '#d97757', '#62d178', '#eab308', '#a78bfa', '#f87171']
```

**数据来源**:
- 共享组合的待办通过 `comboId` 关联到共享组合
- 共享组合的 `members` 字段包含成员列表
- 私有待办不显示 avatar 组

### 3.7 协作信息：共享组合活动流

**影响文件**:
- 修改: `website/src/features/todo/CombosView.tsx`
- 修改: `website/src/features/todo/CombosView.module.css`

**设计**:

组合管理页面右侧（共享组合区域下方）显示"最近动态"卡片，列出最近的协作操作。

**活动流数据结构**:
```typescript
interface Activity {
  id: number
  user: { id: number; nickname: string; avatar?: string }
  action: 'created' | 'completed' | 'commented' | 'assigned'
  target: string  // 待办标题
  time: number  // 时间戳
}
```

**UI 结构**:
```
┌─ 最近动态 ─────────────────────┐
│ [A] Alice 完成了「设计评审」    │
│     10 分钟前                  │
│ [B] Bob 创建了「API 文档」      │
│     2 小时前                   │
│ [C] Carol 评论了「Q3 评审」     │
│     昨天                       │
└────────────────────────────────┘
```

**样式**:
- 每条活动项: avatar 22×22 + 两行文字（操作描述 + 时间）
- 时间用 `--mt2` 色，10px mono 字体
- 活动项之间用 `--border2` 分隔线

**数据来源**:
- 前端 MVP 阶段使用 mock 数据（硬编码在组件中）
- 后续接入后端 API `/collab/shared/:comboId/activities`

### 3.8 协作信息：组合卡片成员预览

**影响文件**:
- 修改: `website/src/features/todo/CombosView.tsx`
- 修改: `website/src/features/todo/CombosView.module.css`

**设计**:

组合卡片右侧（数量下方）显示成员 avatar 头像组，复用 AvatarGroup 组件。

**渲染规则**:
- 私有组合: 显示单个成员头像（创建者自己）
- 共享组合: 显示最多 4 个成员头像，超过显示 "+N"
- 头像组使用 AvatarGroup 组件，size=18, max=4

### 3.9 日历单元格显示待办标题

**影响文件**:
- 修改: `website/src/features/calendar/CalendarView.tsx`
- 修改: `website/src/features/calendar/CalendarView.module.css`

**设计**:

日历月视图中，每个有待办的日期单元格显示最多 3 条待办标题预览。

**UI 结构**:
```
┌─────────────┐
│ 12          │  ← 日期
│ ▌ 周会同步   │  ← 待办（带左侧优先级色条）
│ ▌ Q3 评审   │  ← 逾期用红色色条
│ ▌ 晨跑      │  ← 已完成添加删除线 + 透明度
└─────────────┘
```

**样式**:
- 单元格最小高度 84px
- 待办条目: padding 2px 5px, 9.5px mono 字体, `--muted` 背景
- 左侧 2px 色条对应优先级（同 TodoItem）
- 已完成: opacity 0.5 + line-through
- 逾期: 左侧色条用 `--destructive`
- 超过 3 条时显示 "+N 更多"

### 3.10 统计页 4 图表增强

**影响文件**:
- 修改: `website/src/features/stats/StatsView.tsx`
- 修改: `website/src/features/stats/StatsView.module.css`

**设计**:

统计页保留现有 4 个 echarts 图表（完成趋势线、标签分布环、每周完成柱状、组合对比柱状），新增顶部 4 个 Stat 卡片 + sparkline。

**顶部 Stat 卡片**:
1. 本月完成 — 值用 `accent` 色，sparkline 显示最近 30 天每日完成数
2. 完成率 — 值后跟 % 符号，sparkline 显示最近 30 天每日完成率
3. 连续打卡 — 值后跟"天"，delta 显示"本月最长"
4. 平均每日 — 值为小数，delta 显示"项待办"

**图表样式**:
- 使用 echarts dark 主题
- 主色 #01796f，辅助色 #5b8def / #eab308 / #d97757 / #62d178
- 网格线颜色 `--border2`
- 文字颜色 `--mt`

### 3.11 Hover 反馈与平滑过渡

**影响文件**:
- 修改: 全局组件的 CSS Module 文件

**设计**:

为所有可交互元素添加 hover 反馈和过渡动画：

| 元素 | Hover 效果 | 过渡时长 |
|------|-----------|----------|
| 导航项 | 背景 `--muted`，文字 `--fg` | 150ms |
| 待办项 | 背景 `--muted`（轻微） | 150ms |
| 组合卡片 | 边框 `--mt2` | 150ms |
| 标签 | 边框 `--mt2`，文字 `--fg` | 150ms |
| 按钮 | 边框 `--mt2`，文字 `--fg` | 150ms |
| 日历单元格 | 背景 `--muted` | 150ms |

**进度条动画**:
- `transition: width 0.4s ease`

**全局滚动**:
- `scroll-behavior: smooth`
- 自定义滚动条样式（webkit）

## 4. 不做的事情（YAGNI）

明确排除以下内容，避免范围蔓延：

1. **不引入 split pane 布局** — 保留现有页面跳转模式，不把列表和详情放同一屏
2. **不新增优先级字段的数据库迁移** — priority 字段前端存储，后端 API 已支持
3. **不实现拖拽排序** — 待办排序仍按现有逻辑（日期 + 创建时间）
4. **不实现批量操作 UI** — 批量管理功能留待后续版本
5. **不实现通知中心** — 通知仍走微信订阅消息
6. **不实现深色/浅色主题切换优化** — 现有主题切换保持不变
7. **不实现移动端响应式优化** — 本版本专注桌面端
8. **不实现离线模式** — 网络断开时显示提示，不缓存操作
9. **不实现多语言** — 仅中文
10. **不实现自定义主题色** — Pine green 固定

## 5. 文件影响清单

### 新增文件
| 文件路径 | 职责 |
|----------|------|
| `website/src/features/cmd/CommandPalette.tsx` | ⌘K 命令面板组件 |
| `website/src/features/cmd/CommandPalette.module.css` | 命令面板样式 |
| `website/src/design/primitives/AvatarGroup.tsx` | 头像组组件 |
| `website/src/design/primitives/AvatarGroup.module.css` | 头像组样式 |

### 修改文件
| 文件路径 | 修改内容 |
|----------|----------|
| `website/src/design/primitives/Stat.tsx` | 新增 `warn`、`spark` props |
| `website/src/design/primitives/Stat.module.css` | sparkline 定位、warn 色值 |
| `website/src/features/todo/TodayView.tsx` | sparkline 数据、标签筛选、avatar 组 |
| `website/src/features/todo/TodayView.module.css` | 标签筛选状态样式 |
| `website/src/features/todo/AllTodosView.tsx` | sparkline 数据、avatar 组 |
| `website/src/features/todo/TodoItem.tsx` | 优先级色条、逾期文案、avatar 组 |
| `website/src/features/todo/TodoItem.module.css` | 优先级色条、逾期颜色 |
| `website/src/features/todo/TodoForm.tsx` | 新增优先级选择器 |
| `website/src/features/todo/TodoForm.module.css` | 优先级按钮样式 |
| `website/src/features/todo/CombosView.tsx` | avatar 组、活动流 |
| `website/src/features/todo/CombosView.module.css` | 活动流样式 |
| `website/src/features/calendar/CalendarView.tsx` | 单元格显示待办标题 |
| `website/src/features/calendar/CalendarView.module.css` | 待办条目样式 |
| `website/src/features/stats/StatsView.tsx` | 顶部 Stat 卡片 + sparkline |
| `website/src/features/stats/StatsView.module.css` | sparkline 定位 |
| `website/src/features/layout/Topbar.tsx` | 搜索框点击触发命令面板 |
| `website/src/app/providers.tsx` | 挂载 CommandPalette 全局组件 |
| `website/src/design/primitives/index.ts` | 导出 AvatarGroup |

## 6. Todo 数据模型扩展

现有 Todo 结构新增 `priority` 字段：

```typescript
interface Todo {
  // ... 现有字段
  priority?: 'high' | 'medium' | 'low'  // 新增，默认 'low'
}
```

**兼容性**:
- 现有待办无 priority 字段时，默认视为 'low'
- 后端 API 已支持 priority 字段（小程序版本已有）
- 前端 store 不需要修改，priority 作为 todo 对象的普通字段传递

## 7. 验收标准

### 视觉精致度
- [ ] 今日页面 4 个 Stat 卡片右上角显示 sparkline 趋势线
- [ ] 逾期数字使用 warn 黄色，逾期文案使用 destructive 红色
- [ ] 待办项左侧显示 2px 优先级色条
- [ ] 所有可交互元素有 hover 反馈

### 交互体验
- [ ] 点击今日页面标签可筛选主待办列表
- [ ] ⌘K / Ctrl+K 可打开命令面板
- [ ] 命令面板支持搜索待办、跳转页面、创建待办
- [ ] 命令面板支持键盘导航（↑↓ Enter Esc）

### 协作信息
- [ ] 共享组合的待办右侧显示 avatar 头像组
- [ ] 组合管理页面显示成员预览
- [ ] 共享组合区域下方显示活动流（MVP 可用 mock 数据）

### 功能完整度
- [ ] 日历月视图单元格显示待办标题预览（最多 3 条）
- [ ] 统计页顶部显示 4 个 Stat 卡片 + sparkline
- [ ] TodoForm 支持选择优先级（高/中/低）

### 保留性
- [ ] Hero + Stats + Grid 三段式结构不变
- [ ] Pine green / matte ceramic / 0 border-radius 设计语言不变
- [ ] Sidebar 200px + 主区域布局不变
- [ ] 现有页面路由不变

## 8. 后续演进方向（不在本次范围）

1. **拖拽排序** — 待办项可拖拽调整顺序
2. **批量操作** — 多选待办后批量完成/删除/移动
3. **通知中心** — 应用内通知下拉面板
4. **移动端响应式** — 适配手机和平板
5. **离线模式** — Service Worker 缓存与操作队列
6. **活动流接入后端** — 替换 mock 数据为真实 API
7. **命令面板增强** — 支持自然语言创建待办（"明天下午 3 点开会"）

## 9. 参考资料

- Mockup: `.superpowers/brainstorm/29075-1783857540/content/dashboard-overhaul-v2.html`
- 原始设计 spec: `docs/superpowers/specs/2026-07-12-noargue-react-rebuild-design.md`
- 实现计划: `docs/superpowers/plans/2026-07-12-noargue-react-rebuild.md`
- 团队平台路线图: `docs/superpowers/specs/2026-07-12-team-platform-roadmap-design.md`
- 设计 tokens: `website/src/design/tokens.css`

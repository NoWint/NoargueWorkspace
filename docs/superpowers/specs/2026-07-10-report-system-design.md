# 日报/周报系统设计规格说明书

## 概述

为"时光绿径待办"小程序新增日报/周报系统，与日历和共享组合深度集成。用户可编写私人或组合归属的日报/周报，组合 owner/admin 可通过看板查看全体成员报告，形成团队管理工作汇报闭环。

---

## 一、数据结构（MySQL 5.5 兼容）

### 1.1 work_reports — 报告主表

> **注意：** 表名使用 `work_reports` 而非 `reports`，因现有社区举报系统已占用 `reports` 表名（`migrations/017_create_community_tables.sql`）。

```sql
CREATE TABLE IF NOT EXISTS `work_reports` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL COMMENT '创建人',
  `type` VARCHAR(10) NOT NULL COMMENT 'daily|weekly',
  `period_date` DATE NOT NULL COMMENT '日报=当天日期; 周报=当周周一',
  `period_label` VARCHAR(32) DEFAULT NULL COMMENT '前端展示用，如"第28周""07.10"',
  `combo_id` BIGINT DEFAULT 0 COMMENT '0=私人; 非NULL=归属某组合',
  `content` MEDIUMTEXT COMMENT 'JSON串，见1.1.1 content结构',
  `is_deleted` TINYINT DEFAULT 0,
  `created_at` DATETIME,
  `updated_at` DATETIME,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_period` (`user_id`, `type`, `period_date`, `combo_id`),
  KEY `idx_combo` (`combo_id`),
  KEY `idx_period` (`period_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### 1.1.1 content 字段 JSON 结构

```json
{
  "sections": [
    {
      "key": "work_done",
      "title": "今日工作",
      "lines": [
        "完成了首页改版",
        "修复了登录页bug"
      ]
    },
    {
      "key": "tomorrow_plan",
      "title": "明日计划",
      "lines": [
        "上线新功能"
      ]
    }
  ]
}
```

`sections` 的 key 和 title 由模板决定。每行是自由文本，支持空行占位。

### 1.2 report_templates — 报告模板表

```sql
CREATE TABLE IF NOT EXISTS `report_templates` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `combo_id` BIGINT DEFAULT 0 COMMENT '0=私人默认; 非NULL=组合专属模板',
  `type` VARCHAR(10) NOT NULL COMMENT 'daily|weekly',
  `sections` MEDIUMTEXT COMMENT 'JSON串，见1.2.1',
  `created_at` DATETIME,
  `updated_at` DATETIME,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_combo_type` (`combo_id`, `type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

> **注意：** 一个组合或一个用户（私人）对每种类型（daily/weekly）只能持有**唯一一个**模板。`UNIQUE(combo_id, type)` 约束保证了这一点：不允许同一组合有多个日报模板或多个周报模板。
```

#### 1.2.1 sections 字段 JSON 结构

```json
[
  {"key": "work_done", "title": "今日工作", "sort_order": 1, "max_lines": 20},
  {"key": "tomorrow_plan", "title": "明日计划", "sort_order": 2, "max_lines": 10}
]
```

- `key`：唯一标识，前端用于 section 渲染和排序
- `title`：section 标题，用户可编辑
- `sort_order`：排序序号，从 1 开始
- `max_lines`：最大行数限制，0 表示不限制

### 1.3 模板初始化规则

- 创建组合时，自动为该组合创建 daily / weekly 各一套默认模板（极简模式：日报=今日工作/明日计划，周报=本周总结/下周计划），**一个组合对每种类型仅此一个模板**
- 私人日报/周报使用 `combo_id=0` 的默认模板，**每个用户对每种类型仅此一个私人模板**
- 用户个人可在设置（user-center）自定义私人模板
- 用户个人可在设置（user-center）自定义私人模板
- 组合 owner/admin 在 `packageCombo/report-templates/` 编辑组合模板，所有成员共享

### 1.4 数据迁移规则

- **成员退出组合**：该成员在该组合下的所有报告的 `combo_id` 设为 0，转为私人报告
- **组合解散**：该组合下所有报告的 `combo_id` 设为 0，转为私人报告
- 上述两种场景保留原有 `content` 和 `period_date` 不变

---

## 二、页面清单

### 2.0 app.json 注册

> **注意：** 以下仅列出需新增的页面路径，在现有 `subPackages` 的 pages 数组末尾追加即可，原有页面保留不变。

```json
{
  "pages": [
    "pages/calendar/calendar"
  ],
  "subPackages": [
    {
      "root": "packagePages/",
      "pages": [
        "report-edit/report-edit",
        "report-detail/report-detail"
      ]
    },
    {
      "root": "packageCombo/",
      "pages": [
        "report-board/report-board",
        "report-templates/report-templates"
      ]
    }
  ]
}
```

### 2.1 [改造] Calendar 页

**文件路径**：`pages/calendar/calendar.wxml/js/wxss/json`

**原有变化**：日历组件下方改为三 tab 分页。

**Tab 结构**：

> **广告位处理**：仅「待办」tab 保留现有 `<ad-custom>` 广告插槽，日报/周报 tab 不展示广告。

```
┌──────────────────────────────────┐
│        日历组件(wx-calendar)       │
├──────────────────────────────────┤
│  [待办]  [日报]  [周报]           │  ← Tab 分页
├──────────────────────────────────┤
│  列表内容区域                      │
│  t-swipe-cell + t-cell 统一样式    │
│  note: 日期/周数                  │
│  title: 内容摘要(首条lines首行)    │
│  description: 组合标签+条目统计    │
│  swipe 右滑：编辑 / 删除           │
├──────────────────────────────────┤
│  智能 FAB（根据当前tab切换行为）     │
└──────────────────────────────────┘
```

**实现方式**：FAB 始终绑定 `bind:click="onFabTap"` 一个事件处理器，处理器内部根据 `data.currentTab` 状态分发到不同的跳转 URL。

> **FAB 智能行为：**

| Tab | FAB 点击跳转 |
|-----|-------------|
| 待办 | `/packagePages/add-todo/add-todo` |
| 日报 | `/packagePages/report-edit/report-edit?type=daily&date={selectedDate}` |
| 周报 | `/packagePages/report-edit/report-edit?type=weekly&date={mondayOfWeek}` |

周报的 date 参数始终传入当周周一的日期（YYYY-MM-DD），编辑器端根据日期计算周数。

**待办 tab 原有逻辑与样式完全不变**。

**搜索/筛选**：日报/周报 tab 下无搜索栏，直接展示该日/该周的报告列表。

### 2.2 [新增] 报告编辑器

**文件路径**：`packagePages/report-edit/report-edit.wxml/js/wxss/json`

**页面参数**：

| 参数 | 必填 | 说明 |
|------|------|------|
| `type` | 是 | `daily` 或 `weekly` |
| `date` | 是 | YYYY-MM-DD 格式的日期 |
| `combo_id` | 否 | 如果从组合看板跳转则带此参数，编辑器自动选中 |
| `id` | 否 | 编辑已有报告时传入 |

**页面结构**（参考 add-todo 页面风格）：

```
┌──────────────────────────────────┐
│  ← 写日报 / 写周报    [保存]      │  → 导航栏，保存按钮
├──────────────────────────────────┤
│  ▸ 汇报到：私人                   │  → 点击弹出组合选择器
│                                   │
│  ┌ 今日工作 ────── badge:3条 ──┐  │  → section 卡片
│  │  [■] 完成了首页改版        × │  │  → 每行: color-tag + input + ×
│  │  [■] 修复了登录页bug       × │  │
│  │  [■] [输入内容...]         × │  │  → 空行默认聚焦
│  │         [📋 从待办导入]      │  │  → section 级别按钮
│  │         [+ 添加新条目]       │  │  → 点击新增空行
│  └────────────────────────────┘  │
│                                   │
│  ┌ 明日计划 ────── badge:0条 ──┐  │
│  │  [■] [输入内容...]         × │  │
│  │         [📋 添加到待办]      │  │  → 批量/单行转待办
│  │         [+ 添加新条目]       │  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│        [ 保存 ]                   │  → 底部 FAB
└──────────────────────────────────┘
```

**WeekFlow 式行编辑模式**（适配小程序）：
- 每个 section 是一个卡片，左侧有色条标识（不同 section 不同颜色）
- section 标题右侧显示 badge：「N 条」
- 每行是一个 `input-group`，包含：color-tag + textarea + 删除按钮 `<t-icon name="delete" />`
- **输入框**：使用小程序 `textarea`（auto-height），注意 `textarea` 为原生组件，层级最高，使用 popup 时需处理穿透问题（设置 `show-mask` 或在弹窗时隐藏 textarea）
- **新增行**：仅通过点击「+ 添加新条目」按钮新增，textarea 内换行不新增行
- **删除行**：点击 `×` 按钮删除（带淡出动画）
- **「+ 添加新条目」按钮**：每个 section 底部，点击新增一行，焦点自动移到新行
- 每行内容获取焦点时显示 `<t-icon name="add" />` 小图标（仅「明日计划/下周计划」类 section 显示）
- 空行保留一条作为占位，用户输入内容后自动出现下一条空行（参考 WeekFlow 的 `ensureSectionHasRow`）
- 删除最后一条内容行后自动补一条空行

**组合选择器 Popup**（参考 add-todo 样式）：

```
┌──────────────────────────────────┐
│  选择汇报组合                      │
├──────────────────────────────────┤
│  ○ 私人（仅自己可见）              │  → radio
├──────────────────────────────────┤
│  ○ 共享组合                       │  → radio
│                                   │
│  ┌ 卡片: 产品组  👤 成员 5人  ─┐  │  → combo卡片列表
│  │ icon + 名称  角色标识(超管)  │  │  ←点击选中/取消
│  └────────────────────────────┘  │
│                                   │
│  ┌ 卡片: 技术组  👤 成员 10人 ─┐  │
│  └────────────────────────────┘  │
│                                   │
│  ┌ 卡片: 市场组  👤 成员 3人  ─┐  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│            [ 确定 ]               │
└──────────────────────────────────┘
```

交互逻辑：
1. 先 radio 选择「私人」或「共享组合」
2. 选择「私人」→ 隐藏卡片列表，展示私人模板
3. 选择「共享组合」→ 显示该用户加入的所有共享组合卡片（含角色标识 badge）
4. 卡片可点击切换选中
5. 选中组合后 → 加载对应组合的模板 sections

**草稿机制**（参考 post-edit 实现，使用带唯一标识的 storage key）：
- 页面卸载 `onUnload()`：检测到有内容 → `wx.setStorageSync(\`reportDraft_${type}_${date}_${comboId || 'private'}\`, {...})`
- 页面加载 `onLoad()`：检测到对应草稿且不是编辑模式 → 弹窗「是否恢复上次编辑内容？」，确认则填充，否则 `wx.removeStorageSync(...)`
- 提交成功后清除对应草稿
- 不同日期/类型的草稿互不覆盖

**提交逻辑**：
- 保存按钮 → 调用 `POST /work-reports`（新建）或 `PUT /work-reports/:id`（编辑）
- 提交完成后 `wx.navigateBack()` 返回

### 2.2.1 从待办导入功能

位于每个日报 section（除「明日计划」外）的底部「从待办导入」按钮。

**交互流程**：
1. 点击「从待办导入」→ 弹出底部 popup
2. popup 展示**当前日期**（日报按 period_date）的所有待办列表
3. 待办列表优先展示**已完成**项（置顶），未完成项在下方
4. 每项一个 checkbox，可多选（若数据量大，需使用分页加载，每次 20 条）
5. 底部「确定导入 (已选 N 项)」按钮
6. 确认后 → 选中待办的 `text` 作为行内容插入到当前 section **末尾**
7. 导入的行与普通行完全一致（纯文本，无引用关系，可自由修改删除）
8. popup 关闭，section 更新行数和 badge

**设计决策**：导入即快照。原始待办后续修改不影响已导入的日报内容。报告是对当天工作的存档，应冻结。

### 2.2.2 添加到待办功能

位于「明日计划」(日报)和「下周计划」(周报)类 section 中，每行末尾展示一个小图标按钮。

**单行添加**：
1. 每行 input 右侧显示一个「📋」小图标（只有该行有内容时才显示）
2. 点击 → 调用 `wx.navigateTo` 跳转到 add-todo 页面
3. URL 参数：`text=该行内容&setDate=明天日期`（周报则为下周周一）

**如果跳转交互太打断**，也可以改成 API 直接创建待办（静默创建），创建后按钮变灰显示「已添加」。

**批量添加**（section 级别）：
- section 底部「全部添加到待办」按钮（仅在有内容时显示）
- 点击后弹窗确认：「将 N 条计划一键添加到待办？」
- 确认 → 逐条创建待办，setDate 统一为明天的日期

> **注：** 本版本优先实现单行添加模式（跳转 add-todo），批量添加作为后续迭代。

### 2.3 [新增] 报告详情页

**文件路径**：`packagePages/report-detail/report-detail.wxml/js/wxss/json`

**页面参数**：`?id=456`

**页面结构**：

```
┌──────────────────────────────────┐
│  ← 日报 / 周报     [编辑/更多]    │  → 导航栏
├──────────────────────────────────┤
│  日期: 2026年7月10日 第28周       │  → 元信息
│  归属: 产品组 · 张三              │  → 私人/组合标签
├──────────────────────────────────┤
│  ┌ 今日工作 ──────────────────┐  │
│  │ • 完成了首页改版            │  │  → 只读展示
│  │ • 修复了登录页bug           │  │
│  └────────────────────────────┘  │
│                                   │
│  ┌ 明日计划 ──────────────────┐  │
│  │ • 上线新功能                │  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│  创建于 2026-07-10 18:30         │
│  更新于 2026-07-10 19:00         │
└──────────────────────────────────┘
```

- 底部操作按钮：「编辑」（仅本人）、「删除」（仅本人，需弹窗 `wx.showModal` 二次确认）
- 从 calendar 页进入：私人/组合报告均可查看
- 从组合报告看板进入：共享报告，只读展示
- owner/admin 查看他人报告时，编辑/删除按钮隐藏

### 2.4 [新增] 组合报告看板

**文件路径**：`packageCombo/report-board/report-board.wxml/js/wxss/json`

**页面参数**：`?combo_id=123`

**入口**：combo-detail 页上方小卡片引导点击 → 跳转

**页面结构**：

```
┌──────────────────────────────────┐
│  ← 产品组 · 汇报看板    [成员▼]   │  → 导航栏，成员筛选
├──────────────────────────────────┤
│   日历(wx-calendar, 紧凑模式)     │  → 可缩小高度
├──────────────────────────────────┤
│  [日报]  [周报]                   │  → Tab
├──────────────────────────────────┤
│  ┌ 成员头像 张三 ──── 第28周 ─┐  │
│  │ 内容摘要: 本周完成迭代上线... │  │  → t-cell 统一样式
│  │ 👤 张三 · 5项内容          │  │
│  ├────────────────────────────┤  │
│  │ [编辑] [删除]               │  │  → swipe 按钮
│  └────────────────────────────┘  │
│                                   │
│  ┌ 成员头像 李四 ──── 第28周 ─┐  │
│  │ 内容摘要: 商谈新客户...     │  │
│  │ 👤 李四 · 3项内容          │  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│  智能 FAB（创建当前tab的报告）      │
└──────────────────────────────────┘
```

**主动/被动联动**：同 calendar 页，日报↔month视图，周报↔week视图。

**成员筛选器**：popup 方式，默认显示全部成员，可筛选查看指定成员的报告。

**权限**：
- owner/admin → 查看全组成员报告，列表摘要可见
- member → 进入时提示无权限，或仅展示自己的报告

**owner/admin 只读**：在 report-board 列表中，非本人的报告 swipe 不显示编辑/删除按钮；点击进入 report-detail 也只读展示，不显示编辑/删除按钮。

**FAB**：创建日报/周报时自动带上 `combo_id=xxx` 参数，跳转到 report-edit 页面并预选该组合。

### 2.5 [新增] 组合模板编辑器

**文件路径**：`packageCombo/report-templates/report-templates.wxml/js/wxss/json`

**页面参数**：`?combo_id=123`

**页面结构**：

```
┌──────────────────────────────────┐
│  ← 产品组 · 汇报模板  [保存]     │
├──────────────────────────────────┤
│  [日报模板]  [周报模板]           │  → Tab 切换
├──────────────────────────────────┤
│  日报 Sections:                   │
│                                   │
│  ┌ ─ 今日工作 ──── ☰ ── [✕] ┐  │
│  │  (section标题可点击编辑)   │  │  → ☰ 拖拽排序, ✕ 删除
│  └────────────────────────────┘  │
│                                   │
│  ┌ ─ 明日计划 ──── ☰ ── [✕] ┐  │
│  │                            │  │
│  └────────────────────────────┘  │
│                                   │
│  [+ 添加 Section]                 │
├──────────────────────────────────┤
│  owner/admin 可见，member 隐藏入口 │
└──────────────────────────────────┘
```

**权限**：只有组合的 owner 和 admin 可编辑模板，member 无此入口。每个组合对 daily/weekly 各只有一个模板，编辑即覆盖。

### 2.6 [新增模块] 私人模板设置

**位置**：`packagePages/user-center/user-center.js/wxml` 内新增一个模块

**功能**：用户自定义私人日报/周报模板（同组合模板编辑器的交互，但无权限控制，仅影响自己）。每个用户对 daily/weekly 各只有一个私人模板，编辑即覆盖。

---

## 三、主动/被动联动逻辑

| 用户操作 | Tab 联动 | 日历联动 |
|----------|----------|----------|
| 点击「日报」tab | — | 日历自动切到 month 视图 |
| 点击「周报」tab | — | 日历自动切到 week 视图 |
| 点击「待办」tab | — | 日历视图不变 |
| 在日报 tab 下滑到 week 视图 | 自动切到周报 tab | — |
| 在周报 tab 下滑到 month 视图 | 自动切到日报 tab | — |
| 在日报/周报下滑到 schedule 视图 | 不切换，列表按选中日期渲染 | — |
| 在待办 tab 下滑视图 | 不切换 | — |

### 实现要点

- 监听 wx-calendar 的 `bindviewchange` 事件获取当前视图
- 监听 tab 切换事件调用 `calendar.toggleView(view)` 方法
- 引入「上次主动操作」标志位防止循环触发

```
用户主动点了 tab
  → 设 activeTabActiveFlag = true
  → 调 calendar.toggleView(view)
  → bindviewchange 触发
  → 检测到 flag=true，不切换 tab
  → 重置 flag

用户手势滑动了日历
  → bindviewchange 触发
  → 检测到 flag=false
  → 根据当前视图自动切 tab
```

---

## 四、日历标记（Dot Marks）

wx-calendar 支持 `marks` 属性设置日期标记（dot）。

| Tab 激活时 | 标记策略 |
|------------|----------|
| 待办 | 现有逻辑不变（有待办的日期显示小点） |
| 日报 | 有日报的日期显示绿色小点 |
| 周报 | 有周报的当周周一显示蓝色小点 |

**实现方式**：本地计算。根据当前 tab 状态，从本地存储或缓存中查该月对应 type 的报告数据，生成 marks 数组。

---

## 五、后端 API

### 5.1 Routes

| 方法 | 路由 | 说明 | 权限 |
|------|------|------|------|
| GET | `/work-reports` | 列表查询 | 本人/组合成员 |
| GET | `/work-reports/:id` | 详情 | 本人/组合 owner/admin |
| POST | `/work-reports` | 创建 | 登录用户 |
| PUT | `/work-reports/:id` | 更新 | 仅本人 |
| DELETE | `/work-reports/:id` | 删除 | 仅本人 |
| GET | `/work-reports/board` | 组合看板列表 | 组合 owner/admin |
| GET | `/work-report-templates` | 查询模板 | 登录用户 |
| PUT | `/work-report-templates` | 更新模板 | owner/admin(组合) / 本人(私人) |
| POST | `/work-report-templates/defaults` | 创建组合默认模板 | 创建组合时自动调用 |

### 5.2 GET /work-reports 查询参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `user_id` | int | 筛选用户 |
| `type` | string | `daily` / `weekly` |
| `period_date` | date | 精确匹配 |
| `date_from` | date | 日期范围起始 |
| `date_to` | date | 日期范围截止 |
| `combo_id` | int | 筛选组合; 传 0 筛选私人 |
| `page` | int | 分页 |
| `page_size` | int | 分页 |

### 5.3 GET /work-reports/board 查询参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `combo_id` | int | 必填，所属组合 |
| `type` | string | `daily` / `weekly` |
| `period_date` | date | 精确匹配 |
| `date_from` | date | 日期范围起始 |
| `user_id` | int | 可选，筛选指定成员 |
| `page` | int | 分页 |

**返回结构**：每条 report 附带 `user.nickname`、`user.avatar_url`。

---

## 六、权限矩阵

| 操作 | 本人 | 组合 owner | 组合 admin | 组合 member |
|------|:---:|:----------:|:----------:|:-----------:|
| 创建本人的报告 | ✅ | ✅ | ✅ | ✅ |
| 创建组合的报告 | ✅ | ✅ | ✅ | ✅ |
| 编辑自己的报告 | ✅ | ✅ | ✅ | ✅ |
| 编辑他人报告 | ❌ | ❌ | ❌ | ❌ |
| 删除自己的报告 | ✅ | ✅ | ✅ | ✅ |
| 删除他人报告 | ❌ | ❌ | ❌ | ❌ |
| 查看看板(全成员) | ❌ | ✅ | ✅ | ❌ |
| 查看他人报告详情 | ❌ | ✅(只读) | ✅(只读) | ❌ |
| 编辑组合模板 | ❌ | ✅ | ✅ | ❌ |

---

## 七、智能 FAB 汇总

### Calendar 页

| Tab | FAB 跳转 | URL 参数 |
|-----|----------|----------|
| 待办 | add-todo | `setDate={selectedDate}` |
| 日报 | report-edit | `type=daily&date={selectedDate}` |
| 周报 | report-edit | `type=weekly&date={mondayOfWeek}` |

### 组合看板页

| Tab | FAB 跳转 | URL 参数 |
|-----|----------|----------|
| 日报 | report-edit | `type=daily&date={selectedDate}&combo_id={comboId}` |
| 周报 | report-edit | `type=weekly&date={mondayOfWeek}&combo_id={comboId}` |

---

## 八、报告列表 t-cell 字段分配

| t-cell 字段 | 内容 | 说明 |
|-------------|------|------|
| `note` | 日期/周数 | 日报：MM/DD；周报："第N周" |
| `title` | 内容摘要 | 取 sections[0].lines[0]，超长截断，空则灰色显示"暂无记录" |
| `description` | 归属标识 | 私人报告：`<t-icon name="lock-on" />` 私人 · N项内容；组合报告：`<t-icon name="user" />` 张三 · N项内容 |

组合看板中 description 展示成员昵称（不展示组合名）。

---

## 九、UI 规范

### 9.1 图标系统

所有图标统一使用 TDesign 的 `t-icon` 组件，禁止使用自定义 SVG、emoji 或图片替代图标（已有 TDesign 对应图标的场景）。

常用图标映射：

| 场景 | t-icon name |
|------|-------------|
| 导入待办 | `checklist` |
| 添加到待办 | `add` |
| 删除 | `delete` |
| 编辑 | `edit` |
| 组合 | `user-group` |
| 私人 | `lock-on` |
| 日报 | `calendar` |
| 周报 | `calendar` |
| 成员 | `user` |
| 保存 | `check` |
| 更多 | `more` |

---

## 十、待开放问题（后续迭代）

- 报告导出（.docx / .pdf）
- 报告提交提醒（到点提醒写日报/周报）
- 报告统计（个人/组合维度的提交率、提交趋势）

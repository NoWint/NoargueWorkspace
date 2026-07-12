# NoArgue 网页版前端重构设计文档

> **文档日期**：2026-07-12
> **项目代号**：NoArgue（原「时光绿径」网页版）
> **文档类型**：架构设计 spec
> **适用范围**：`website/` 目录全量重构
> **状态**：待评审

---

## 1. 背景与目标

### 1.1 背景

当前 `website/` 目录是基于 Vue 3 + Vite + Pinia + TDesign Vue Next 实现的网页版前端，与项目根目录的 `.trae/web_architecture_spec.md` 规范（React 18 + Ant Design 5 + Zustand）不一致。同时，用户希望采用 BonjourPrism 设计语言（Vercel-like 暗色陶瓷质感）替代现有的 TDesign 风格，提升视觉精度。

### 1.2 目标

- **技术对齐**：将网页版前端从 Vue 3 重构为 React 18，对齐 `web_architecture_spec.md` 规范
- **视觉升级**：采用 BonjourPrism 设计语言（松绿主色 + 暗色优先 + Geist 字体 + 极简边框）
- **品牌更名**：产品名由「时光绿径」改为「NoArgue」
- **后端契约不变**：保留现有 Node.js + Express + MySQL 后端，所有 API 路径与 JWT 结构不变

### 1.3 非目标

- 不重构后端代码
- 不修改微信小程序端
- 不在 P0/P1 阶段实现协作管理、AI 助手、小工具集等 P2 功能
- 不做 SSR/SSG，保持 SPA

---

## 2. 技术栈

| 类别 | 选型 | 说明 |
|------|------|------|
| 框架 | React 18 + TypeScript (strict) | 对齐规范 |
| 构建 | Vite 5 | 沿用现有构建工具 |
| 路由 | React Router v6 | `createBrowserRouter` 数据路由 |
| 状态 | Zustand | 替代 Pinia |
| 组件库 | Ant Design 5 | `ConfigProvider` + `theme.algorithm` |
| 样式 | CSS Modules + CSS 变量 | 设计 token 通过 CSS 变量传递 |
| 日期 | dayjs | 与小程序端一致 |
| 图表 | echarts-for-weixin → echarts | 统计页用 |
| HTTP | axios | 沿用现有 `api/request.ts` |

---

## 3. 项目结构

```
website/src/
├── app/                    # 应用入口、Provider 组合
│   ├── App.tsx
│   ├── providers.tsx       # ConfigProvider/Router/Theme
│   └── router.tsx          # createBrowserRouter
├── design/                 # 设计系统（BonjourPrism 皮肤）
│   ├── tokens.css          # CSS 变量（暗/亮双套）
│   ├── primitives/         # Button/Card/List/Toggle 等外壳
│   └── overrides/          # AntD 复杂组件的样式覆盖
├── features/               # 按业务域组织
│   ├── todo/               # 待办相关页面+组件
│   ├── combo/              # 组合
│   ├── calendar/
│   ├── stats/
│   ├── auth/
│   └── system/             # 回收站/通知/用户中心
├── stores/                 # Zustand stores
│   ├── auth.ts
│   ├── todos.ts
│   ├── combos.ts
│   ├── tags.ts
│   └── config.ts
├── api/                    # API 客户端（迁移现有 ts 文件）
│   ├── request.ts
│   ├── auth.ts
│   ├── todos.ts
│   ├── combos.ts
│   ├── collab.ts
│   ├── tags.ts
│   └── config.ts
├── lib/                    # 工具函数
└── types/                  # 共享类型
    └── index.ts
```

**迁移策略**：
- `api/*.ts` 文件直接迁移，仅调整 axios 拦截器到新 token key（沿用 `localStorage.authToken`）
- `types/index.ts` 直接迁移
- 删除所有 Vue 文件（`App.vue` / `main.ts` / `router/index.ts` / `views/*.vue` / `components/**/*.vue` / `stores/*.ts`）
- `package.json` 替换依赖：移除 `vue`/`pinia`/`vue-router`/`tdesign-vue-next`，加入 `react`/`react-dom`/`react-router-dom`/`zustand`/`antd`/`@ant-design/icons`

---

## 4. 设计系统

### 4.1 设计 token（CSS 变量）

**暗色主题（默认，`:root`）**：

```css
:root {
  /* 主色 - 松绿 */
  --primary: #01796f;
  --primary-hi: #0a8c80;
  --primary-fg: #ffffff;
  --primary-soft: rgba(1,121,111,0.16);
  --primary-line: rgba(1,121,111,0.38);

  /* 暗色陶瓷背景 */
  --bg: #0a0a0a;
  --bg2: #0e0e0e;
  --card: #141414;
  --muted: #1c1c1c;
  --pop: #1c1c1c;

  /* 文字层级 */
  --fg: #fafafa;
  --mt: #a1a1a1;
  --mt2: #6b6b6b;
  --mt3: #4a4a4a;

  /* 辅助 */
  --secondary: #1c1c1c;
  --secondary-fg: #fafafa;
  --accent: #262626;
  --accent-fg: #fafafa;
  --input: #1f1f1f;
  --border: #1a1a1a;
  --border2: #161616;
  --sb: #0a0a0a;
  --sb-border: #1a1a1a;

  /* 语义色 */
  --success: #62d178;
  --warn: #eab308;
  --destructive: #ff6467;
  --info: #4a9eff;

  /* 字体 */
  --font-sans: "Geist", -apple-system, "SF Pro Text", "PingFang SC", system-ui, sans-serif;
  --font-mono: "Geist Mono", "SF Mono", ui-monospace, monospace;
  --font-song: "Songti SC", "STSong", "SimSun", serif;
}
```

**亮色主题（`[data-theme="light"]`）**：

```css
[data-theme="light"] {
  --primary: #01796f;
  --primary-hi: #01665c;
  --primary-fg: #ffffff;
  --primary-soft: rgba(1,121,111,0.10);
  --primary-line: rgba(1,121,111,0.30);

  --bg: #ffffff;
  --bg2: #fafafa;
  --card: #ffffff;
  --muted: #f5f5f5;
  --pop: #f5f5f5;

  --fg: #1a1a1a;
  --mt: #666666;
  --mt2: #999999;
  --mt3: #cccccc;

  --secondary: #f5f5f5;
  --secondary-fg: #1a1a1a;
  --accent: #eeeeee;
  --accent-fg: #1a1a1a;
  --input: #f5f5f5;
  --border: #e5e5e5;
  --border2: #ededed;
  --sb: #fafafa;
  --sb-border: #e5e5e5;

  --success: #16a34a;
  --warn: #ca8a04;
  --destructive: #dc2626;
  --info: #2563eb;
}
```

### 4.2 字体策略

- **主体**：Geist（Google Fonts CDN）+ PingFang SC（系统中文回退）
- **数字/标签/eyebrow**：Geist Mono
- **标题中文字符强调**：Songti SC（宋体），用于 Hero 标题人名、卡片标题关键词（如「待办」「进度」「概览」），平衡现代与人文

### 4.3 间距/圆角/边框

- 间距阶：4 / 8 / 12 / 14 / 18 / 24 / 28 px
- 圆角：**0**（BonjourPrism 风格，全部直角）
  - 例外：头像、状态指示点用 `border-radius: 999px`（圆形）
- 边框：`1px solid var(--border)`
- 阴影：仅 dropdown/modal 用 `0 8px 24px rgba(0,0,0,0.4)`（暗色）/ `0 8px 24px rgba(0,0,0,0.08)`（亮色）

### 4.4 AntD 主题映射

通过 `ConfigProvider` 注入：

```tsx
<ConfigProvider
  theme={{
    token: {
      colorPrimary: '#01796f',
      borderRadius: 0,
      fontFamily: 'Geist, -apple-system, "PingFang SC", system-ui, sans-serif',
    },
    algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
  }}
>
```

---

## 5. 布局架构

### 5.1 整体结构

```
<AppLayout>
  <Sidebar width={220} />           // 固定左侧
  <Main>
    <Topbar />                      // 搜索 + 视图切换 + 通知 + 主题
    <Content>
      <Outlet />                    // 路由出口
    </Content>
  </Main>
</AppLayout>
```

### 5.2 侧栏分区（从上到下）

1. **品牌区**：NoArgue logo（松绿圆形 + 文字）
2. **主 CTA**：「新建待办」松绿按钮（快捷键 `N`）
3. **主导航**：今日 / 全部待办 / 日历 / 统计 / 收藏 / 搜索（带计数徽标）
4. **组合区**：可折叠，显示私有 + 共享组合（彩色方块 + 名称 + 计数）
5. **底部**：回收站 / 用户胶囊（头像 + 昵称 + 配额 `23/100`）

### 5.3 顶栏

- 搜索框（flex: 1，max-width 320px）+ `⌘K` 快捷键提示
- 视图切换 Segmented（列表 / 看板 / 时间线）
- 通知图标（带红点）
- 主题切换图标（月亮/太阳）

### 5.4 响应式

| 断点 | 侧栏 | 底部 |
|------|------|------|
| ≥1024px | 常驻 220px | 无 |
| 768-1023px | 折叠为图标条 56px | 无 |
| <768px | 抽屉化（汉堡触发） | Tab Bar（今日/日历/统计/我的） |

### 5.5 路由守卫

- `requiresAuth: true` 的路由检查 `authStore.token`，无则跳 `/login`
- `/login` 已登录则跳 `/`

---

## 6. 路由与页面分期

### 6.1 P0（首期必做，7 路由 / 6 页面组件）

| 路由 | 页面组件 | 说明 |
|------|----------|------|
| `/login` | LoginView | QR 扫码登录（复用现有后端 `/auth/qrcode/*`） |
| `/` | TodayView | 首页，Hero + 统计卡 + 待办列表 + 右侧周进度/日历/标签 |
| `/todos` | AllTodosView | 列表 + 筛选 + 排序，支持组合/标签过滤 |
| `/todos/new` | TodoForm（新建模式） | 日期/时间/标签/组合/位置/备注 |
| `/todos/:id/edit` | TodoForm（编辑模式） | 同上，预填数据，共用组件 |
| `/todos/:id` | TodoDetail | 只读详情 + 操作（完成/编辑/删除/收藏） |
| `/calendar` | CalendarView | 月历 + 每日待办点 + 点击日格展开 |

### 6.2 P1（次期扩展，5 页）

| 路由 | 页面 | 说明 |
|------|------|------|
| `/stats` | 统计 | 完成率/趋势图/标签分布（echarts） |
| `/combos/:id` | 组合详情 | 组合内待办列表 + 成员（若共享） |
| `/search` | 搜索结果 | 全文搜索 + 高亮 |
| `/trash` | 回收站 | 已删除待办 + 恢复/永久删除 |
| `/user-center` | 用户中心 | 信息 + 配额 + 主题偏好 + 登出 |

### 6.3 P2（后续，暂不做）

组合编辑、协作管理、加入协作、通知中心、changelog、社区、小工具集（密码生成器/今天吃什么/AI 助手）、每日激励、致谢名单。

---

## 7. 状态管理（Zustand）

### 7.1 Store 清单

| Store | 职责 | 关键 state | actions |
|-------|------|-----------|---------|
| `authStore` | 认证 | `token`, `user`, `isLoggedIn` | `login()`, `fetchUserInfo()`, `logout()` |
| `todoStore` | 待办 | `todos[]`, `filter`, `loading` | `fetch/create/update/delete/complete/star()` |
| `comboStore` | 组合 | `combos[]`, `sharedCombos[]` | `fetch/create/update/delete()` |
| `tagStore` | 标签 | `systemTags[]`, `userTags[]` | `fetch/create/update/delete()` |
| `configStore` | 全局配置 | `notices`, `changelogs`, `limits` | `fetchConfig()` |

### 7.2 持久化策略

- `token` 存 `localStorage`（key 沿用 `authToken`，兼容现有后端 JWT）
- `theme` 存 `localStorage`（key: `noargue-theme`，值：`dark`/`light`，默认 `dark`）
- 其他 store state 不持久化，每次进入应用重新拉取

### 7.3 约定

- store 间不互相引用，组件层组合调用
- 所有 API 调用返回 Promise，组件用 `useEffect` 触发
- selector 精确订阅，避免全量 re-render

---

## 8. API 层与认证

### 8.1 API 客户端

直接迁移 `website/src/api/*.ts`：
- `request.ts`：axios 实例 + 拦截器（注入 `Bearer ${token}` from `localStorage.authToken`）+ 错误统一处理
- `auth.ts` / `todos.ts` / `combos.ts` / `collab.ts` / `tags.ts` / `config.ts`：业务接口封装，**保持不变**

### 8.2 后端契约

- baseURL：`http://localhost:3000`（dev，`.env.development`）/ 配置（prod）
- JWT 结构：`{id, openid}`，secret `timegreenpath_jwt_secret_key_2024`，7d 过期
- 所有 API 路径、请求/响应结构沿用现有后端

### 8.3 登录流程（QR 扫码）

1. 前端 `GET /auth/qrcode/generate` → 获取 `qrcode_id` + ticket
2. 展示二维码（小程序扫码确认）
3. 前端轮询 `GET /auth/qrcode/check/:id` → 状态 `pending`/`scanned`/`confirmed`/`expired`
4. `confirmed` 时后端返回 JWT → 存 `localStorage.authToken` → 跳首页

### 8.4 开发环境兜底

- 保留 JWT 注入兜底（测试账号 `id=1, openid=dev_test_openid`）
- 文档记录注入方式（浏览器 console `localStorage.setItem('authToken', ...)`），不写入代码

---

## 9. 组件分层策略

### 9.1 三层架构

**第 1 层：Design Primitives（`src/design/primitives/`）**

自建外壳组件，BonjourPrism 风格，CSS Modules 实现，**不依赖 AntD**：

| 组件 | 变体 | 说明 |
|------|------|------|
| `Button` | pri/sec/gh/icon/sm | 主按钮松绿底，次按钮灰底，ghost 透明 |
| `Card` | - | 1px 边框 + card 背景 + 18px padding |
| `ListLine` | - | 网格布局，底边框分隔 |
| `Toggle` | - | 开关，松绿激活态 |
| `Tag` | default/pri/warn/err/info | 标签，mono 字体 |
| `StatusChip` | default/ok/warn/acc | 状态胶囊 |
| `Progress` | - | 4px 高度，松绿填充 |
| `Stat` | - | 统计卡片（label + num + delta） |
| `Eyebrow` | - | 小写大写字母标签 |
| `HeroTitle` | - | 24px 标题，中文人名用宋体 |

**第 2 层：AntD 复杂组件（直接用，套 token）**

通过 `ConfigProvider` 的 `theme.token` 统一注入松绿主色 + 暗色算法 + 0 圆角：

`DatePicker` / `TimePicker` / `Cascader` / `Modal` / `Drawer` / `Form` / `Table` / `message` / `notification` / `Popconfirm` / `Tooltip` / `Segmented` / `Input` / `Textarea` / `Select`

复杂组件的样式用 `theme.components` 精细覆盖（如 Modal 的 header padding、DatePicker 的 active 态）。

**第 3 层：Feature Components（`src/features/*/`）**

业务组件，组合第 1 层 primitives + 第 2 层 AntD：

- `TodoItem` = `Checkbox`(自建) + 文本 + `Tag`(自建) + `StatusChip`(自建) + `Star`(自建)
- `TodoForm` = `Input`(AntD) + `DatePicker`(AntD) + `Tag`选择(自建) + `Combo`选择(自建)
- `Sidebar` / `Topbar` / `ComboList` / `Calendar` / `StatsChart`

### 9.2 判定规则

| 场景 | 选择 | 理由 |
|------|------|------|
| 视觉强相关（按钮/卡片/列表/标签/状态） | 自建 primitives | 保证 BonjourPrism 风格统一 |
| 交互复杂（日期选择/级联/表格/弹窗） | AntD | 复用成熟交互逻辑 |
| 表单输入（Input/Textarea/Select） | AntD + CSS Modules 微调 | 边框/背景对齐暗色陶瓷 |

---

## 10. 主题切换机制

### 10.1 实现

- `document.documentElement.setAttribute('data-theme', theme)` 切换
- `theme` 来自 `localStorage.noargue-theme`，默认 `dark`
- `ConfigProvider` 的 `algorithm` 跟随 `theme` 切换 `darkAlgorithm`/`defaultAlgorithm`

### 10.2 切换入口

- 顶栏右上角图标按钮（月亮=暗，太阳=亮）
- 用户中心页有主题偏好设置项

### 10.3 初始化

- `app/providers.tsx` 在应用挂载时读取 `localStorage` 并设置 `data-theme`
- 避免闪烁（FOUC）：在 `index.html` 的 `<head>` 注入内联脚本，同步读取 localStorage 并设置 `data-theme`

---

## 11. 待办数据流（与小程序一致）

对齐 `AGENTS.md` 和 `project_rules.md` 的约定：

1. **更新字段**：每次修改设置 `updatedAt: Date.now()` 和 `version: (todo.version||1)+1`
2. **持久化**：通过 API 同步到后端（不使用 `wx.setStorageSync`，网页版无本地缓存层）
3. **软删除**：`isDeleted: true` + `deletedAt`，不直接从数组移除
4. **日历缓存**：网页版通过 `todoStore.todos` 直接派生日历数据，无需全局缓存方法

---

## 12. 测试策略

- **单元测试**：Vitest + React Testing Library，覆盖 stores / primitives / utils
- **组件测试**：关键 feature 组件（TodoItem / TodoForm / Sidebar）
- **E2E**：暂不做（P0 阶段手动验证）
- **覆盖率目标**：stores 80%+，primitives 70%+，features 50%+

---

## 13. 风险与缓解

| 风险 | 缓解 |
|------|------|
| AntD 默认审美与 BonjourPrism 冲突 | 第 1 层 primitives 全自建，AntD 仅用于复杂组件，套 token |
| 双样式系统（AntD token + CSS Modules）冲突 | 明确边界：AntD 组件内用 token，外壳用 CSS Modules，不交叉 |
| QR 扫码登录在开发环境受限 | 保留 JWT 注入兜底，文档记录 |
| echarts 暗色主题适配 | 使用 `echarts.init(null, 'dark')` 或自定义 theme |
| Songti SC 字体在非 macOS 系统缺失 | 回退链：`Songti SC, STSong, SimSun, serif`，最终回退 serif |

---

## 14. 验收标准

- P0 6 页全部可交互，视觉与 mockup v1 一致
- 暗色/亮色主题切换正常
- 待办 CRUD 全流程通过
- QR 登录流程通过（或 JWT 兜底可用）
- 响应式在 1440px / 1024px / 768px / 375px 断点正常
- TypeScript strict 模式无报错
- ESLint 无 error

---

## 15. 参考资料

- `.trae/web_architecture_spec.md`：网页版架构规范
- `/Users/xiatian/Desktop/UIs/bonjourprism-mockup.html`：BonjourPrism 设计系统参考
- `AGENTS.md`：AI 助手配置与 SKILL 说明
- `.trae/rules/project_rules.md`：项目开发规范
- 现有 Vue 代码：`website/src/`（迁移参考，重构后删除）

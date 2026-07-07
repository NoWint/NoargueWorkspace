# 时光绿径待办 Web 前端 — 项目规格说明书

> 日期：2026-07-07
> 状态：定稿
> 基于小程序版（微信原生）→ Web 版（Vue 3 + Vite + TypeScript）重构

---

## 1. 项目概述

时光绿径待办是一款待办事项管理工具，已有微信小程序版和 Node.js 后端。本文档定义 Web 前端的完整技术方案。

**核心目标：**
- 为桌面端用户提供完整的待办管理体验
- 复用现有后端 API（零后端改动）
- 通过微信扫码登录实现跨端认证
- 品牌一致但设计语言独立于小程序

**Logo：** 开发环境从 `public/logo.png` 引用；生产环境使用 `https://api.yzjtiantian.cn/uploads/logo/logo.png`

---

## 2. 技术选型

| 层面 | 选择 | 理由 |
|------|------|------|
| 框架 | Vue 3 (Composition API) | 易上手、生态成熟 |
| 构建 | Vite 5 | 极速 HMR、开箱即用 TS 支持 |
| 语言 | TypeScript | 类型安全，减少运行时错误 |
| UI 组件库 | TDesign Vue (Next) | 与小程序 icon 体系完全兼容 |
| 路由 | Vue Router 4 | SPA 标配 |
| 状态管理 | Pinia | Vue 3 官方推荐，TS 友好 |
| HTTP 客户端 | Axios | 拦截器机制成熟 |
| 登录 | 微信扫码登录 | 后端已完整实现，零改动 |
| 部署 | 纯静态 SPA（Nginx 托管，直连 API） | 2C2G ECS 无额外负担，后端已有 CORS |

### 2.1 为什么不选其他方案

- **React / Nuxt / Next.js：** 需要额外 Node 服务，2C2G ECS 吃紧，且 SEO 对此应用不重要
- **Vue 2：** 已停止维护，Composition API 更好组织逻辑
- **纯 JS (非 TS)：** 项目规模适中，TS 类型提示能有效减少数据接口对接错误

---

## 3. 架构图

```
┌─────────────────────────────────────────────────┐
│                  浏览器 (SPA)                     │
│                                                   │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Vue Router│  │  Pinia   │  │  Axios 实例    │  │
│  │ (路由表)  │  │ (状态)   │  │ (JWT拦截器)    │  │
│  └────┬─────┘  └────┬─────┘  └──────┬────────┘  │
│       │              │              │           │
│  ┌────┴──────────────┴──────────────┴────────┐  │
│  │         TDesign Vue 组件库                  │  │
│  └─────────────────────────────────────────────┘  │
└──────────────────────┬────────────────────────────┘
                       │ HTTPS (直连 API，CORS)
┌──────────────────────┴────────────────────────────┐
│              Nginx (静态托管)                       │
│  /* → /usr/share/nginx/html/dist/*                │
└──────────────────────┬────────────────────────────┘
                       │
┌──────────────────────┴────────────────────────────┐
│          阿里云 ECS (2C2G)                         │
│  ┌─────────────────────────────────────────────┐  │
│  │   Express.js API 服务 (端口 3000)            │  │
│  │   17 组路由 / 17 个控制器                     │  │
│  └─────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────┐  │
│  │        MySQL 5.5                             │  │
│  └─────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────-┘
```

---

## 4. 后端 API 完整清单

### 4.1 路由总览（17 组）

| # | 路由组 | 前缀 | 核心端点 |
|---|--------|------|---------|
| 1 | Auth | `/auth` | `POST /login`, `GET /userInfo`, `POST /updateUserInfo`, `POST /increaseTodoLimit`, `POST /qrcode/generate`, `GET /qrcode/status`, `POST /qrcode/scanned`, `POST /qrcode/confirm` |
| 2 | Todos | `/todos` | `GET /list`, `GET /:id`, `POST /create`, `PUT /:id`, `DELETE /:id`, `POST /sync`, `GET /full-sync` |
| 3 | Tags | `/tags` | `GET /list`, `POST /create`, `PUT /:id`, `DELETE /:id` |
| 4 | Combos | `/combos` | `GET /list`, `GET /:id`, `POST /create`, `PUT /:id`, `DELETE /:id`, `GET /:id/members`, `PUT /members/:userId/role` |
| 5 | Collab | `/collab` | `POST /join`, `POST /request`, `GET /requests`, `GET /shared`, `POST /shared/:comboId/todos`, `PUT .../complete` |
| 6 | Notify | `/notify` | `POST /subscribe`, `POST /schedule`, `GET /list` |
| 7 | Config | `/config` | `GET /app`, `GET /notices`, `GET /updates`, `GET /guides` |
| 8 | Upload | `/upload` | 文件上传（图片/头像） |
| 9 | Share | `/share` | `POST /snapshot`, `GET /snapshot/:id`, `POST /verify-password/:shareId` |
| 10 | Comments | `/comments` | `GET /:sharedTodoId`, `POST /:sharedTodoId`, `DELETE /:commentId` |
| 11 | Posts | `/posts` | `GET /list`, `POST /create`, `PUT /:postId`, `DELETE /:postId` |
| 12 | Likes | `/likes` | `POST /toggle`, `GET /:postId/users` |
| 13 | PostComments | `/post-comments` | `GET /:postId`, `POST /:postId`, `DELETE /:commentId` |
| 14 | Reports | `/reports` | `POST /create`, `GET /list`, `POST /:id/process` |
| 15 | Users | `/users` | `GET /:userId/profile`, `GET /search`, `GET /batch` |
| 16 | Admin | `/admin` | `GET /stats`, `GET /users`, 交叉分析等 |
| 17 | Log | `/log` | 客户端日志上报 |

### 4.2 V1 涉及 API（核心子集）

| 模块 | 方法 | 完整路径 | 说明 |
|------|------|---------|------|
| 登录 | POST | `/auth/qrcode/generate` | 生成二维码 |
| 登录 | GET | `/auth/qrcode/status?sceneId=` | 轮询扫码状态 |
| 登录 | POST | `/auth/qrcode/scanned` | 标记已扫码（Web 端不直接调用） |
| 登录 | POST | `/auth/qrcode/confirm` | 确认扫码登录（Web 端不直接调用） |
| 待办 | GET | `/todos/list` | 列表（`?page=&size=&comboId=&tagIds=&search=&showCompleted=&date=`） |
| 待办 | GET | `/todos/:id` | 获取待办详情 |
| 待办 | POST | `/todos/create` | 创建待办 |
| 待办 | PUT | `/todos/:id` | 更新待办 |
| 待办 | DELETE | `/todos/:id` | 删除待办 |
| 回收站 | GET | `/todos/deleted` | 获取已删除待办列表 |
| 回收站 | POST | `/todos/restore/:todoId` | 恢复已删除待办 |
| 回收站 | DELETE | `/todos/permanent/:todoId` | 永久删除待办 |
| 组合 | GET | `/combos/list` | 获取组合列表 |
| 组合 | POST | `/combos/create` | 创建组合 |
| 组合 | PUT | `/combos/:id` | 更新组合 |
| 组合 | DELETE | `/combos/:id` | 删除组合 |
| 标签 | GET | `/tags/list` | 获取标签列表 |
| 标签 | POST | `/tags/create` | 创建标签 |
| 标签 | PUT | `/tags/:id` | 更新标签 |
| 标签 | DELETE | `/tags/:id` | 删除标签 |
| 用户 | GET | `/auth/userInfo` | 获取用户信息 |
| 用户 | POST | `/auth/updateUserInfo` | 更新用户信息 |

### 4.3 API 响应格式

所有接口统一返回外层结构：

```typescript
// 成功（单对象）
{ "success": true, "data": { ... } }

// 成功（列表——后端统一用嵌套对象）
{ "success": true, "data": { "list": [...], "total": 42, "page": 1, "size": 20 } }

// 错误
{ "success": false, "message": "错误描述" }

// 认证失败
// HTTP 401 → token 过期/无效
// HTTP 403 → 无管理员权限
```

> ⚠️ **特殊格式——扫码状态查询：** `GET /auth/qrcode/status` 不遵循上述格式，返回值直接挂载在顶层：
> ```typescript
> { "success": true, "status": "waiting" | "scanned" | "confirmed" | "expired", "message": "...", "token"?: string, "user"?: User }
> ```

### 4.4 认证方式

所有需登录接口通过 `Authorization: Bearer <token>` 头部传递 JWT。
Token 有效期 7 天，存储在 `localStorage`。401 响应触发登出跳转。

---

## 5. 扫码登录流程

```
                        Web 端                               后端                       微信小程序
  ────────────────────────────────────────────────────────────────────────────────────────────
  用户进入 /login
       │
       ├─► POST /auth/qrcode/generate
       │    ◄── { sceneId, qrcodeUrl (base64), expiresAt }
       │
       │   显示二维码
       │   启动轮询 (setInterval 2s)
       │
       │   ┌─► GET /auth/qrcode/status?sceneId=xxx ──► status: "waiting"  ◄──┐
       │   │    ◄── { status: "waiting" }                                    │
       │   │                                                                  │
       │   │                               用户打开微信扫描二维码                │
       │   │                                     │                            │
       │   │                                     ├─► POST /auth/qrcode/scanned│
       │   │                                     │   ◄── { status: "scanned"} │
       │   │                                                                  │
       │   ├─► GET /auth/qrcode/status?sceneId=xxx ──► status: "scanned" ──┐  │
       │   │    ◄── { status: "scanned" }          显示"已扫描，请在手机确认" │  │
       │   │                                                                  │
       │   │                                    用户点击"确认登录"              │
       │   │                                     (已在微信登录)                │
       │   │                                     ├─► POST /auth/qrcode/confirm│
       │   │                                     │   ◄── { success: true }    │
       │   │                                                                  │
       │   └─► GET /auth/qrcode/status?sceneId=xxx ──► status: "confirmed" ─┐ │
       │        ◄── { status: "confirmed", token, user }  ◄─────────────────┘ │
       │                                                                       │
       │   登录成功
       │   存入 token → localStorage
       │   跳转首页 /
       │
       └─► 5分钟未扫码 → 显示"二维码已过期"
           点击"重新生成" → 重新 POST /auth/qrcode/generate
```

### 5.1 Web 端实现要点

```typescript
// QrCodeLogin.vue 核心逻辑
const POLL_INTERVAL = 2000;  // 2秒轮询
const QR_TTL = 5 * 60 * 1000; // 5分钟过期

async function generateQr() {
  const res = await authApi.generateQrCode();
  sceneId.value = res.data.sceneId;
  qrImage.value = res.data.qrcodeUrl;
  expireAt.value = res.data.expiresAt;
  startPolling();
}

async function pollStatus() {
  const res = await authApi.getQrCodeStatus(sceneId.value);
  switch (res.status) {
    case 'waiting':    break; // 继续轮询
    case 'scanned':    statusText = '已扫描，请在手机上确认'; break;
    case 'confirmed':  saveToken(res.token); router.push('/'); break;
    case 'expired':    stopPolling(); showExpired = true; break;
  }
}
```

---

## 6. 目录结构

```
website/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── package.json
├── .env.development              # VITE_API_BASE_URL=http://localhost:3000
├── .env.production               # VITE_API_BASE_URL=https://api.yzjtiantian.cn
├── public/
│   ├── favicon.svg
│   └── logo.png               # 应用 Logo（开发环境用）

└── src/
    ├── main.ts                    # 入口：创建 app、注册 router/pinia
    ├── App.vue                    # 根组件（响应式布局外壳）
    │
    ├── router/
    │   └── index.ts               # 路由表 + 导航守卫
    │
    ├── stores/
    │   ├── auth.ts                # 登录状态、token 管理、用户信息
    │   ├── todos.ts               # 待办列表、筛选、排序
    │   ├── combos.ts              # 组合列表
    │   ├── tags.ts                # 标签列表
    │   └── config.ts              # 公告、更新日志
    │
    ├── api/
    │   ├── request.ts             # Axios 实例（baseURL、JWT 拦截器、401 处理）
    │   ├── auth.ts                # 扫码登录 API
    │   ├── todos.ts               # 待办 CRUD
    │   ├── combos.ts              # 组合 CRUD
    │   ├── tags.ts                # 标签 CRUD
    │   └── config.ts              # 公告、更新日志 API
    │
    ├── types/
    │   └── index.ts               # TS 类型定义
    │
    ├── components/
    │   ├── layout/
    │   │   ├── AppSidebar.vue     # 桌面端侧边栏（毛玻璃效果）
    │   │   ├── AppHeader.vue      # 顶部导航栏（搜索框 + 用户头像）
    │   │   └── AppContent.vue     # 主内容区容器（路由视图）
    │   │
    │   ├── todo/
    │   │   ├── TodoItem.vue       # 单条待办（复选框、内容、标签、操作）
    │   │   ├── TodoForm.vue       # 新建/编辑待办表单
    │   │   ├── TodoDetail.vue     # 待办详情页
    │   │   └── TodoQuickAdd.vue   # 底部快速添加输入框
    │   │
    │   ├── combo/
    │   │   ├── ComboTree.vue      # 组合树（侧边栏第一栏）
    │   │   └── ComboForm.vue      # 新建/编辑组合弹窗
    │   │
    │   ├── tag/
    │   │   ├── TagFilter.vue      # 标签筛选面板（侧边栏第二栏）
    │   │   └── TagForm.vue        # 新建/编辑标签弹窗
    │   │
    │   ├── auth/
    │   │   └── QrCodeLogin.vue    # 扫码登录组件（二维码展示+轮询）
    │   │
    │   └── common/
    │       ├── GlassPanel.vue     # 毛玻璃容器（通用）
    │       └── EmptyState.vue     # 空状态占位
    │
    ├── views/
    │   ├── LoginView.vue          # 登录页（全屏居中二维码）
    │   ├── TodoView.vue           # 首页 - 三栏待办列表
    │   ├── CalendarView.vue       # (预留) 日历视图
    │   ├── CommunityView.vue      # (预留) 社区
    │   ├── StatsView.vue          # (预留) 统计
    │   ├── MoreView.vue           # (预留) 更多
    │   ├── UserCenterView.vue     # 用户中心
    │   └── NotFoundView.vue       # 404
    │
    └── styles/
        ├── variables.css          # CSS 自定义属性（配色/阴影/圆角）
        └── global.css             # 全局重置 + 基础样式
```

---

## 7. 路由表

### 7.1 V1 路由

| 路径 | 页面组件 | 权限 | 说明 |
|------|---------|------|------|
| `/login` | LoginView | 公开 | 扫码登录 |
| `/` | TodoView | 需登录 | 待办列表首页（三栏） |
| `/todos/add` | TodoForm | 需登录 | 新建待办 |
| `/todos/:id` | TodoDetail | 需登录 | 待办详情 |
| `/todos/:id/edit` | TodoForm | 需登录 | 编辑待办 |
| `/user-center` | UserCenterView | 需登录 | 用户中心 |
| `/not-found` | NotFoundView | 公开 | 404 页 |

### 7.2 预留路由（后续版本启用）

| 路径 | 页面组件 | 说明 |
|------|---------|------|
| `/calendar` | CalendarView | 日历视图 |
| `/community` | CommunityView | 社区 |
| `/stats` | StatsView | 统计 |
| `/more` | MoreView | 工具集 |

### 7.3 导航守卫

```typescript
router.beforeEach((to) => {
  const authStore = useAuthStore();
  if (to.meta.requiresAuth && !authStore.isLoggedIn) return '/login';
  if (to.path === '/login' && authStore.isLoggedIn) return '/';
});
```

---

## 8. 组件设计

### 8.1 页面 → 组件依赖映射

```
LoginView
  └── QrCodeLogin

TodoView (三栏布局)
  ├── ComboTree          ← 左侧第一栏
  ├── TagFilter          ← 左侧第二栏
  └── 主区域
      ├── AppHeader      (搜索 + 用户头像)
      ├── TodoQuickAdd   (快速添加)
      └── TodoItem[]     (待办列表)

TodoForm
  └── 表单字段：文本 / 日期 / 时间 / 位置 / 标签选择 / 组合选择

TodoDetail
  └── 详情卡片 + 操作按钮（编辑/删除/分享/星标）
```

### 8.2 关键组件状态覆盖

**TodoItem.vue：**
- `状态：未完成 / 已完成 / 加载中 / 错误`
- `交互：点击复选框切换完成 → loading → 更新成功/失败回滚`
- `操作：滑出/弹出菜单 → 编辑 / 删除（含确认弹窗）/ 星标`

**QrCodeLogin.vue：**
- `状态：生成中 / 等待扫码 / 已扫描 / 已确认 / 已过期 / 错误`
- `异常：生成二维码失败 → 重试按钮；轮询网络错误 → 自动重试 3 次后提示`

**ComboTree.vue：**
- `状态：加载中 / 空（无组合）/ 列表 / 错误`
- `交互：点击筛选 → 高亮选中项；右键/菜单 → 编辑/删除组合`

**TagFilter.vue：**
- `状态：加载中 / 空（无标签）/ 列表 / 错误`
- `交互：多选标签 → 组合筛选；标签管理 → 新增/编辑/删除`

### 8.3 TDesign 组件选型清单

| 组件 | TDesign 名 | 用途 |
|------|-----------|------|
| 按钮 | Button | 各处操作按钮 |
| 图标 | Icon | 全局图标（与小程序 icon 名完全兼容） |
| 标签 | Tag | 待办标签、筛选标签 |
| 头像 | Avatar | 用户头像 |
| 输入框 | Input | 待办文本、搜索框 |
| 多行输入 | Textarea | 备注 |
| 表单 | Form | 新建/编辑待办 |
| 日期选择 | DatePicker | 截止日期 |
| 时间选择 | TimePicker | 截止时间 |
| 开关 | Switch | 开关选项 |
| 下拉选择 | Select | 组合选择等 |
| 颜色选择 | ColorPicker | 组合/标签颜色 |
| 文件上传 | Upload | 图片上传 |
| 弹窗 | Dialog | 确认删除、详情 |
| 消息 | Message | 操作反馈提示 |
| 轻提示 | Toast | 短提示 |
| 气泡确认 | Popconfirm | 敏感操作确认 |
| 空状态 | Empty | 无数据占位 |
| 骨架屏 | Skeleton | 加载占位 |
| 分割线 | Divider | 内容分隔 |
| 加载 | Loading | 全局/局部加载 |

---

## 9. 数据结构定义

```typescript
// ====== 用户 ======
interface User {
  id: number;
  openid: string;
  nickname: string;
  avatarUrl: string;
  todoLimit: number;
  comboLimit: number;
  collabLimit: number;
  isAdmin: boolean;
  badgeTitles: string[];
  badgeColors: string[];
  createdAt?: string;
}

// ====== 待办 ======
interface Todo {
  id: number;
  todoId?: string;         // 客户端生成 ID
  userId: number;
  text: string;
  setDate?: string;        // "2026-07-07"
  setTime?: string;        // "14:30:00"
  remarks?: string;
  locationText?: string;
  completed: number;       // 0=未完成, 1=已完成
  isStar: number;          // 0/1
  tags?: string;           // JSON 序列化 "[1,2,3]"
  images?: string;         // JSON 串
  version: number;
  isDeleted: number;
  comboId?: number;
  createdAt: string;
  updatedAt?: string;
}

// ====== 组合 ======
interface Combo {
  id: number;
  userId: number;
  name: string;
  description?: string;
  icon: string;            // TDesign icon 名
  color: string;
  isShared: boolean;
  memberLimit: number;
  sortOrder: number;
}

// ====== 标签 ======
interface Tag {
  id: number;
  name: string;
  color: string;
  icon?: string;
  isSystem: number;        // 0=用户自建, 1=系统预设
  userId?: number;
  sortOrder: number;
}

// ====== API 通用响应 ======
interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  total?: number;
}

interface ApiError {
  success: false;
  message: string;
}

// ====== 公告 ======
interface Notice {
  id: number | string;
  title: string;
  content: string;
  createdAt: string;
}

// ====== 更新日志 ======
interface Changelog {
  id: number | string;
  version: string;
  title: string;
  content: string;
  createdAt: string;
}
```

---

## 10. 样式系统

### 10.1 CSS 变量

```css
:root {
  /* 品牌色 */
  --color-primary: #00b26a;
  --color-primary-hover: #009a5a;
  --color-primary-light: rgba(0, 178, 106, 0.08);
  --color-primary-bg: #e3f5eb;

  /* 语义色 */
  --color-success: #00b26a;
  --color-warning: #ff9800;
  --color-error: #f44336;
  --color-info: #2196f3;

  /* 背景 */
  --bg-page: #f7f8fa;
  --bg-card: #ffffff;
  --bg-glass: rgba(255, 255, 255, 0.7);
  --bg-sidebar: rgba(247, 248, 250, 0.85);
  --bg-hover: rgba(0, 0, 0, 0.04);

  /* 文字 */
  --text-primary: #1d2129;
  --text-secondary: #86909c;
  --text-disabled: #c9cdd4;
  --text-white: #ffffff;

  /* 边框 */
  --border-color: #e5e6e8;
  --border-radius: 8px;
  --border-radius-lg: 12px;

  /* 阴影 */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 4px 16px rgba(0, 0, 0, 0.08);

  /* 毛玻璃 */
  --glass-blur: blur(20px);
  --glass-saturate: saturate(180%);

  /* 字号 */
  --font-size-xs: 12px;
  --font-size-sm: 13px;
  --font-size-base: 14px;
  --font-size-lg: 16px;
  --font-size-xl: 20px;
  --font-size-2xl: 24px;

  /* 字体系列 */
  --font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI',
    'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;

  /* 间距 */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;

  /* 布局 */
  --sidebar-width: 240px;
  --sidebar-collapsed-width: 64px;
  --header-height: 56px;
  --tag-panel-width: 180px;
}
```

### 10.2 毛玻璃使用规则

| 位置 | 使用 | 样式 |
|------|------|------|
| 桌面侧边栏 | ✅ 毛玻璃 | `background: var(--bg-glass); backdrop-filter: var(--glass-blur);` |
| 卡片 | ❌ 纯白 | `background: var(--bg-card); box-shadow: var(--shadow-sm);` |
| 弹窗/浮层 | ✅ 毛玻璃 | 背板半透明+模糊，内容区纯白 |
| 输入区域 | ❌ 纯白 | 白底 + 浅色边框 |
| 空状态 | ❌ 纯色 | 居中对齐 + 柔和文字 |

### 10.3 响应式断点

| 断点 | 宽度 | 布局 |
|------|------|------|
| 桌面 | >= 1024px | 三栏 + 顶部栏 |
| 平板 | 768px ~ 1024px | 两栏（组合树折叠为图标） |
| 移动 | < 768px | 单栏全屏 + 底部 Tab 导航 |

CSS 媒体查询写法：
```css
/* 移动 (< 768px) */    @media (max-width: 767px) { ... }
/* 平板 (768~1024) */   @media (min-width: 768px) and (max-width: 1023px) { ... }
/* 桌面 (≥ 1024px) */   @media (min-width: 1024px) { ... }
```

---

## 11. 状态管理设计

### 11.1 authStore

```typescript
// stores/auth.ts
interface AuthState {
  token: string | null;
  user: User | null;
  isLoggedIn: boolean;
  loading: boolean;
}

// Actions:
// loginByQrCode() → 内部调用 generateQrCode + 轮询，拿到 token 后保存
// logout() → 清除 token + 用户信息 → 跳转 /login
// fetchUserInfo() → GET /auth/userInfo
// updateProfile(data) → POST /auth/updateUserInfo
```

### 11.2 todosStore

```typescript
// stores/todos.ts
interface TodosState {
  items: Todo[];
  loading: boolean;
  error: string | null;
  filter: {
    comboId: number | null;
    tagIds: number[];
    search: string;
    showCompleted: boolean;
  };
}

// Actions:
// fetchTodos() → GET /todos/list
// createTodo(data) → POST /todos/create
// updateTodo(id, data) → PUT /todos/:id
// deleteTodo(id) → DELETE /todos/:id
// toggleComplete(id) → 乐观更新（见 13.4 快照回滚机制）
// toggleStar(id) → 乐观更新（见 13.4 快照回滚机制）
// batchMove(todoIds, comboId) → POST /todos/batch-move （预留）
// fetchDeletedTodos() → GET /todos/deleted（回收站）
// restoreTodo(id) → POST /todos/restore/:todoId（回收站）
// permanentDeleteTodo(id) → DELETE /todos/permanent/:todoId（回收站）
```

### 11.3 combosStore

```typescript
// stores/combos.ts
interface CombosState {
  items: Combo[];
  loading: boolean;
  selectedId: number | null;  // 当前选中的组合
}

// Actions:
// fetchCombos() → GET /combos/list
// createCombo(data) → POST /combos/create
// updateCombo(id, data) → PUT /combos/:id
// deleteCombo(id) → DELETE /combos/:id
// selectCombo(id) → 设置 selectedId，触发待办筛选
```

### 11.4 tagsStore

```typescript
// stores/tags.ts
interface TagsState {
  items: Tag[];
  loading: boolean;
  selectedIds: number[];  // 当前选中的标签 IDs
}

// Actions:
// fetchTags() → GET /tags/list
// createTag(data) → POST /tags/create
// updateTag(id, data) → PUT /tags/:id
// deleteTag(id) → DELETE /tags/:id（操作前应使用 Popconfirm 确认）
// toggleTag(id) → 多选切换
```

### 11.5 configStore

```typescript
// stores/config.ts
interface ConfigState {
  notices: Notice[];
  changelog: Changelog[];
  loading: boolean;
}

// Actions:
// fetchNotices() → GET /config/notices
// fetchChangelog() → GET /config/updates
```

---

## 12. 小程序 API → Web 标准替换方案

| 小程序 API | Web 替代 | 备注 |
|-----------|---------|------|
| `wx.request` | Axios 实例 | 已封装 |
| `wx.setStorageSync` | `localStorage` | token 持久化 |
| `wx.showToast` | TDesign `Message`/`Toast` | 全局反馈 |
| `wx.showModal` | TDesign `Dialog` | 确认弹窗 |
| `wx.showLoading` / `hideLoading` | TDesign `Loading` | 加载状态 |
| `wx.chooseLocation` / `getLocation` | `navigator.geolocation` + 地图 JS API | V1 可暂缓 |
| `wx.uploadFile` | `<input type="file">` + `FormData` | 标准表单上传 |
| `wx.authorize` | 浏览器权限 API | 地理/通知等 |
| `navigateTo` / `switchTab` | `router.push` | Vue Router |
| WechatSI (语音) | Web Speech API | V1 不实现 |

### 12.1 Axios 实例配置

```typescript
// api/request.ts
import axios from 'axios';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 20000,               // 20 秒超时
  headers: { 'Content-Type': 'application/json' },
});

// 请求拦截器：注入 JWT
http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('authToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 响应拦截器：解包 + 401 处理
http.interceptors.response.use(
  (response: AxiosResponse) => {
    // 后端统一返回 { success, data/data[]/message }
    return response.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default http;
```

> ⚠️ **注意：** 响应拦截器中跳转 `/login` 使用 `window.location.href` 而非 `router.push`，以避免 Pinia store 与 Vue Router 初始化顺序的循环依赖问题。

---

## 13. 开发规范

### 13.1 命名规范

```typescript
// 组件：PascalCase，多词命名
// TodoItem.vue, ComboTree.vue, TagFilter.vue

// 变量/函数：camelCase
const todoList = ref<Todo[]>([]);
function fetchTodos() { ... }

// 类型/接口：PascalCase
interface TodoItem { ... }
type TodoStatus = 'active' | 'completed';

// CSS 类：kebab-case
.todo-item { ... }
.tag-filter-panel { ... }
```

### 13.2 文件组织

- 每个 `.vue` 文件不超过 400 行；超过时提取子组件
- 每个 store 文件对应一个 Pinia store
- 每个 api 文件导出同模块的所有请求函数

### 13.3 错误处理规范

```typescript
// API 请求统一 try-catch
async function fetchData() {
  try {
    loading.value = true;
    error.value = null;
    const res = await api.getList();
    data.value = res.data;
  } catch (e) {
    error.value = e instanceof Error ? e.message : '请求失败';
    // MessagePlugin.warning({ content: error.value });
  } finally {
    loading.value = false;
  }
}
```

### 13.4 乐观更新

对于高频操作（切换完成状态、星标），采用乐观更新。由于 Pinia 没有内建快照机制，需手动保存回滚快照：

```typescript
async function toggleComplete(id: number) {
  const index = this.items.findIndex((t) => t.id === id);
  if (index === -1) return;

  // 1. 保存快照（深拷贝）
  const snapshot = JSON.parse(JSON.stringify(this.items[index]));
  const originalCompleted = this.items[index].completed;

  // 2. 立即更新 UI
  this.items[index].completed = originalCompleted ? 0 : 1;

  try {
    // 3. 异步请求
    await todosApi.update(id, { completed: this.items[index].completed });
  } catch {
    // 4. 失败 → 回滚
    this.items[index].completed = originalCompleted;
    // MessagePlugin.warning('操作失败，请重试');
  }
}
```

---

## 14. V1 功能清单与开发计划

### Phase 1: 脚手架搭建（预计 1 天）

- [x] 初始化 Vite + Vue 3 + TS 项目
- [x] 配置依赖：TDesign Vue、Vue Router、Pinia、Axios
- [x] 配置 Vite 代理（开发环境跨域）
- [x] 编写 CSS 变量体系（variables.css + global.css）
- [x] 搭建响应式布局壳（AppSidebar + AppContent）
- [x] 配置路由表 + 导航守卫
- [x] 编写 Axios 实例（拦截器 + JWT 注入 + 401 处理）
- [x] 定义 TypeScript 类型
- [x] 初始化各 Pinia store 骨架

### Phase 2: 登录体系（预计 1 天）

- [x] QrCodeLogin 组件（二维码展示 + 2s 轮询 + 过期刷新）
- [x] LoginView 页面（全屏居中）
- [x] authStore（token 管理 + 自动登录检测）
- [x] 导航守卫集成
- [x] 退出登录

### Phase 3: 核心待办 CRUD（预计 2-3 天）

- [x] ComboTree 组件（组合树 + 新建/编辑/删除）
- [x] TagFilter 组件（标签筛选面板 + 管理）
- [x] TodoItem 组件（完成切换、星标、删除）
- [x] TodoQuickAdd 组件（快速新建）
- [x] TodoView 三栏布局整合
- [x] TodoForm 页面（完整新建/编辑表单）
- [x] TodoDetail 页面（详情展示）
- [x] tagsStore 对接 API
- [x] combosStore 对接 API
- [x] todosStore 对接 API

### Phase 4: 赋能功能（预计 1 天）

- [x] 回收站（已删除待办列表 + 恢复 + 永久删除）
- [x] UserCenterView（头像/昵称/限额展示）
- [x] 公告展示（对接 `/config` API）
- [x] 更新日志展示
- [x] 404 页面

---

## 15. V1 不包含（明确排除）

- 协作/共享待办（Collab 模块）
- 社区（Posts + Comments + Likes 模块）
- 统计图表（Stats 模块）
- 日历视图（Calendar 模块）
- 管理后台（Admin 模块）
- 语音输入
- 暗黑模式
- 离线同步（Web 端暂不实现小程序端的 Storage 同步机制，直连 API）
- 组合成员管理（V1 可以创建组合，但成员管理留到 Collab 阶段）

---

## 16. 扩展预留

### 16.1 路由扩展

V1 路由已预留 `/calendar`、`/community`、`/stats`、`/more` 的空页面和路由配置。新增模块只需：
1. 创建对应的 View 组件
2. 添加对应 store + api 模块
3. 在 `router/index.ts` 中取消路由注释
4. 侧边栏添加导航项

### 16.2 Store 扩展

Pinia store 按领域拆分，新模块只需：
1. 在 `stores/` 下新建文件
2. 在 `api/` 下新建对应请求模块
3. 在组件中 `useXxxStore()` 使用

### 16.3 移动端适配

布局壳已预留移动端断点：
- `< 768px`：侧边栏不再固定显示，改为底部 TabBar
- 当前阶段只做桌面响应式适配，移动端布局为预埋

---

## 17. 开发环境配置

### .env.development

```
VITE_API_BASE_URL=http://localhost:3000
```

### .env.production

```
VITE_API_BASE_URL=https://api.yzjtiantian.cn
```

### vite.config.ts

```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: {
    port: 5173,
    // 后端已有 CORS 中间件，开发环境直连 backend:3000 即可
  },
});
```

### Nginx 部署配置

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /usr/share/nginx/html/dist;
    index index.html;

    # SPA 路由（API 由前端直连 https://api.yzjtiantian.cn，后端已有 CORS）
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 18. 设计决策记录（ADR）

### ADR-1：选择 Vue 3 而非 React

- **背景：** 前端新手，需要快速上手
- **决策：** Vue 3 Composition API
- **理由：** 单文件组件（SFC）结构清晰，模板/脚本/样式在一起，降低认知负担；TDesign Vue 组件库完善

### ADR-2：扫码登录而非自建账号体系

- **背景：** 已有微信小程序用户基数和完整扫码登录后端
- **决策：** 复用后端 `/auth/qrcode/*` 接口
- **理由：** 后端零改动，用户无需额外注册，跨端体验一致

### ADR-3：毛玻璃仅用于侧边栏

- **背景：** 风格定位为极简 + 毛玻璃点缀
- **决策：** 侧边栏用 `backdrop-filter: blur(20px)`，内容区保持纯白卡片
- **理由：** 大面积毛玻璃影响可读性和性能，极简布局需要清晰的视觉层次

### ADR-4：静态 SPA 而非 SSR

- **背景：** 部署在 2C2G ECS，后端正跑 Node 服务
- **决策：** Vite 构建输出静态文件，Nginx 托管
- **理由：** 零运行时开销，部署简单，SEO 对此应用不重要

### ADR-5：TypeScript 而非 JavaScript

- **背景：** 对接多个后端 API 的数据结构
- **决策：** TypeScript with strict mode
- **理由：** 接口数据结构的类型定义能提前发现字段名/类型错误，减少联调成本

---

## 19. 参考资料

- [TDesign Vue Next 组件文档]（查看组件的 TDesign MCP）
- [Vite 官方文档](https://vitejs.dev/)
- [Vue Router 4](https://router.vuejs.org/)
- [Pinia 官方文档](https://pinia.vuejs.org/)
- 后端路由：`backend/routes/*.js`
- 小程序 icon 目录：`packageCombo/combo-edit/combo-edit.js` (`iconCategories`)
- 扫码登录后端实现：`backend/services/qrcodeSession.js`
- 小程序 API 调用示例：`utils/api.js`

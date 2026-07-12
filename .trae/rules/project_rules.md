欢迎来到时光绿径待办！这是一个使用原生微信小程序框架构建的待办事项管理工具。本指南旨在帮助AI代理快速理解项目结构、核心功能和开发约定。

## 1. 项目概述

时光绿径待办是一款功能丰富的待办事项管理工具，致力于为用户提供简洁高效的任务管理体验。应用采用清爽的绿意设计风格，缓解事务焦虑，同时提供多种实用功能帮助用户更好地规划和完成每日任务。

### 核心功能

- ✅ **待办事项管理**：支持添加、编辑、删除、完成/未完成切换等基础操作
- ✅ **云同步**：支持多设备实时同步，增量同步技术，智能冲突解决
- ✅ **回收站**：删除的待办保留30天，支持恢复或永久删除
- ✅ **语音识别**：集成微信同声传译插件，支持语音快速创建待办
- ✅ **日历视图**：可视化展示每日待办事项，支持日期导航和快速添加
- ✅ **数据分析**：提供待办完成情况统计和可视化图表
- ✅ **搜索功能**：支持关键词搜索待办事项
- ✅ **位置信息**：支持为待办添加位置信息和一键导航
- ✅ **数据管理**：支持待办数据的导入、导出和备份
- ✅ **天气显示**：集成心知天气API，展示实时天气信息
- ✅ **小工具集**：提供文本加密解密、密码生成器、今天吃什么等实用小工具
- ✅ **版本更新**：自动检测版本更新并提示用户
- ✅ **标签分类**：支持系统预设标签和用户自定义标签
- ✅ **组合归档**：支持将待办归类到组合中管理
- ✅ **协作功能**：支持创建共享组合，邀请他人协作管理待办
- ✅ **待办提醒**：支持设置待办通知，通过微信订阅消息提醒
- ✅ **AI助手**：集成AI聊天功能，提供智能建议
- ✅ **收藏功能**：支持收藏重要待办事项
- ✅ **每日激励**：提供每日励志语录
- ✅ **致谢名单**：展示项目贡献者

### 数据上限保护

| 资源类型 | 默认上限 | 说明 |
|---------|---------|------|
| 待办事项 | 100 个 | todo_limit 字段控制 |
| 组合 | 10 个 | combo_limit 字段控制 |
| 共享组合 | 5 个 | collab_limit 字段控制 |

## 2. 架构概览

- **框架**: 本项目使用**原生微信小程序**框架开发。所有代码遵循微信小程序的标准规范。
- **UI 组件库**: 项目深度集成 **TDesign Wechat Miniprogram (`tdesign-miniprogram`)**。所有新功能和页面都应优先使用此组件库中的组件，以保持 UI 风格统一。
- **数据存储**: 核心数据存储在用户本地，同时支持云端同步。通过 `wx.getStorageSync('todos')` 和 `wx.setStorageSync('todos', ...)` 进行读写。云端API地址为 `https://api.yzjtiantian.cn`。
- **全局状态管理**: 全局应用级别的状态和数据存储在 `app.js` 的 `globalData` 对象中。通过 `getApp()` 方法在任何页面中访问。
- **第三方库**: 项目使用了多种第三方库，包括 echarts-for-weixin（图表展示）、crypto-js（加密解密）、dayjs（日期处理）、@lspriv/wx-calendar（日历组件）等。

## 3. 核心开发模式与约定

### 待办事项 (Todo) 数据流

这是应用的核心。在对 `todos` 列表进行任何增、删、改操作后，**必须**执行以下步骤来确保数据一致性：

1.  **更新数据字段**: 设置 `updatedAt` 和 `version` 字段
    ```javascript
    const now = Date.now();
    const updatedTodo = {
      ...todo,
      updatedAt: now,
      version: (todo.version || 1) + 1
    };
    ```
2.  **持久化到本地存储**:
    ```javascript
    wx.setStorageSync('todos', updatedTodos);
    ```
3.  **更新日历视图缓存**: 为了让日历页面能正确显示待办标记，需要调用 `app.js` 中的全局方法。
    ```javascript
    getApp().updateCalendarCache(updatedTodos.filter(t => !t.isDeleted));
    ```

### 删除待办事项规范

删除待办时**不应直接从数组中移除**，而是标记为已删除状态：

```javascript
const now = Date.now();
const deletedTodo = {
  ...todo,
  isDeleted: true,
  deletedAt: now,
  updatedAt: now,
  version: (todo.version || 1) + 1
};

// 更新 storage
const allTodos = wx.getStorageSync('todos') || [];
const updatedTodos = allTodos.map(t => t.id === todo.id ? deletedTodo : t);
wx.setStorageSync('todos', updatedTodos);

// 更新日历缓存（过滤已删除）
getApp().updateCalendarCache(updatedTodos.filter(t => !t.isDeleted));
```

### 页面导航与参数传递

- 使用 `wx.navigateTo({ url: '...' })` 进行页面跳转。
- 页面路径在 `app.json` 的 `pages` 数组中定义。
- 向目标页面传递数据时，使用 URL 查询参数。如果传递复杂对象（如 `todo.location`），需要先用 `JSON.stringify` 序列化，再用 `encodeURIComponent` 编码。

### 权限处理

应用需要获取用户的一些系统权限，包括：

- **位置权限**: 用于获取天气信息和位置导航
- **麦克风权限**: 用于语音识别功能
- **相册权限**: 用于保存图片到相册

权限处理应遵循以下原则：

1.  先检查权限状态，再请求权限
2.  如果用户拒绝权限，提供清晰的引导说明
3.  对于核心功能依赖的权限，提供系统设置引导

## 4. 数据模型

### 待办事项 (Todo) 结构

```javascript
{
  id: 'todo_1234567890_abc123',  // 唯一标识符（todo_id）
  text: '待办事项内容',          // 待办事项的标题或核心内容
  setDate: '2025-04-03',         // 待办事项的日期（YYYY-MM-DD格式）
  setTime: '14:30',              // 待办事项的时间（HH:MM格式）
  remarks: '备注信息',            // 待办事项的详细说明或备注
  location: {                    // 待办事项的位置信息（可选）
    name: '位置名称',
    address: '详细地址',
    latitude: 39.9087,
    longitude: 116.3975
  },
  completed: false,              // 待办事项的完成状态（false 或完成时间戳）
  isStar: false,                 // 是否收藏/标记为重要
  time: 1768585225477,           // 待办事项的创建时间戳
  tags: [1, 2],                  // 标签ID数组
  comboId: 'combo_123',          // 所属组合ID（可选）
  
  // 同步相关字段
  version: 1,                    // 数据版本号，每次修改递增
  isDeleted: false,              // 是否已删除（软删除标记）
  deletedAt: null,               // 删除时间戳（isDeleted为true时设置）
  updatedAt: 1768585225477       // 最后更新时间戳
}
```

### 共享待办 (SharedTodo) 结构

```javascript
{
  id: 1,                         // 共享待办ID
  combo_id: 1,                   // 所属共享组合ID
  creator_id: 1,                 // 创建者用户ID
  text: '待办内容',              // 待办事项内容
  set_date: '2025-04-03',        // 日期
  set_time: '14:30',             // 时间
  remarks: '备注',               // 备注
  assign_type: 'all',            // 分配类型：all（全员）/ specific（指定成员）
  tags: '[1,2]',                 // 标签ID数组（JSON字符串）
  completed_at: 0,               // 全员完成时间戳
  is_deleted: false,             // 是否已删除
  created_at: '2025-04-03',      // 创建时间
  
  // 关联数据
  creator: {                     // 创建者信息
    id: 1,
    nickname: '用户名',
    avatar: '头像URL'
  },
  assignments: [                 // 分配记录
    {
      user_id: 1,
      nickname: '成员名',
      avatar_url: '头像URL',
      completed_at: 0            // 个人完成时间戳
    }
  ]
}
```

### 组合 (Combo) 结构

```javascript
{
  id: 1,                         // 组合ID
  user_id: 1,                    // 创建者用户ID
  name: '工作计划',              // 组合名称
  icon: 'folder',                // 组合图标（TDesign图标名）
  color: '#4CAF50',              // 组合颜色（HEX格式）
  is_shared: 0,                  // 是否共享组合（0/1）
  share_code: 'ABC12345',        // 共享邀请码（仅共享组合有，8位）
  member_limit: 50,              // 成员上限（仅共享组合有）
  todo_count: 5,                 // 待办数量
  created_at: '2025-04-03',      // 创建时间
  updated_at: null               // 更新时间
}
```

### 组合成员 (ComboMember) 结构

```javascript
{
  id: 1,
  combo_id: 1,                   // 组合ID
  user_id: 1,                    // 用户ID
  role: 'owner',                 // 角色：owner（超管）/ admin（管理）/ member（成员）
  nickname: '用户昵称',          // 用户昵称
  joined_at: '2025-04-03'        // 加入时间
}
```

### 全局数据结构

在 `app.js` 的 `globalData` 中存储了应用的全局状态：

```javascript
{
  changelogList: [],          // 版本更新日志列表
  notices: [],                // 公告列表
  configLoaded: false,        // 配置是否已加载
  weather: null,              // 天气数据
  navBarHeight: 0,            // 导航栏高度
  menuRight: 0,               // 胶囊按钮右间距
  menuTop: 0,                 // 胶囊按钮顶部间距
  menuHeight: 0,              // 胶囊按钮高度
  menuWidth: 0,               // 胶囊按钮宽度
  menuLeft: 0,                // 胶囊按钮左侧位置
  calendarCache: {},          // 日历视图缓存
  
  // 用户相关
  userInfo: null,             // 用户信息
  isLoggedIn: false,          // 登录状态
  syncStatus: 'idle',         // 同步状态：idle/syncing/success/error/offline
  
  // 标签和组合
  systemTags: [...],          // 系统预设标签
  userTags: [],               // 用户自定义标签
  combos: [],                 // 用户创建的组合（包含私有和共享）
  sharedCombos: []            // 用户加入的共享组合
}
```

### 标签 (Tag) 结构

```javascript
{
  id: 1,                      // 标签ID
  name: '工作',               // 标签名称
  color: '#2196F3',           // 标签颜色（HEX格式）
  icon: 'briefcase',          // 标签图标名称
  is_system: true             // 是否系统预设标签
}
```

## 5. 数据库表结构

### 核心表

| 表名 | 说明 |
|------|------|
| users | 用户信息表 |
| todos | 待办事项表 |
| tags | 标签表 |
| todo_tags | 待办-标签关联表 |
| combos | 组合表 |
| combo_members | 组合成员表 |
| shared_todos | 共享待办表 |
| shared_todo_assignments | 共享待办分配表 |
| collab_requests | 协作申请表 |
| todo_notifications | 待办通知表 |
| sync_logs | 同步日志表 |

## 6. 页面结构与功能

### 主要页面

| 页面路径 | 功能描述 |
|---------|---------|
| `/pages/todo/todo` | 首页，展示待办事项列表，支持Tab切换（全部待办/私有组合/共享组合） |
| `/pages/add-todo/add-todo` | 添加和编辑待办事项页面，支持标签选择、组合选择、通知设置 |
| `/pages/calendar/calendar` | 日历视图页面，展示每日待办事项 |
| `/pages/stats/stats` | 统计分析页面，展示待办完成情况 |
| `/pages/daily-stats/daily-stats` | 每日统计详情页面，展示单日数据 |
| `/pages/more/more` | 更多功能页面，提供数据管理、标签管理、回收站等入口 |
| `/pages/trash/trash` | 回收站页面，显示已删除待办，支持恢复和永久删除 |
| `/pages/user-center/user-center` | 用户中心，显示登录状态、数据统计、限制信息 |
| `/pages/todo-detail/todo-detail` | 待办事项详情页面，显示标签、所属组合、创建者等 |
| `/pages/todo-search/todo-search` | 待办搜索结果页面 |
| `/pages/combo-edit/combo-edit` | 组合编辑页面，创建/编辑组合，支持自定义颜色选择器 |
| `/pages/combo-detail/combo-detail` | 组合详情页面，显示组合内待办 |
| `/pages/collaboration/collaboration` | 协作管理页面，管理成员和权限，显示二维码邀请 |
| `/pages/join-collab/join-collab` | 加入协作页面，输入邀请码或扫描二维码 |
| `/pages/tag-manage/tag-manage` | 标签管理页面，管理自定义标签 |
| `/pages/login/login` | 登录页面 |

### 小工具页面

| 页面路径 | 功能描述 |
|---------|---------|
| `/pages/password-generator/password-generator` | 密码生成器 |
| `/pages/eating/eating` | 今天吃什么随机选择工具 |
| `/pages/datamanage/datamanage` | 数据导入导出管理 |
| `/pages/ai-chat/ai-chat` | AI助手聊天页面 |
| `/pages/star/star` | 收藏待办页面 |
| `/pages/motivation/motivation` | 每日激励语录页面 |
| `/pages/acknowledge/acknowledge` | 致谢名单页面 |

### 其他页面

| 页面路径 | 功能描述 |
|---------|---------|
| `/pages/changelog/changelog` | 版本更新日志页面 |
| `/pages/notice/notice` | 公告页面 |
| `/pages/day-todos/day-todos` | 单日待办列表页面 |

## 7. 后端 API 概览

### 认证相关 API

| 接口 | 方法 | 说明 |
|------|------|------|
| `/auth/login` | POST | 微信登录 |
| `/auth/userInfo` | GET | 获取用户信息（含上限配置） |
| `/auth/updateUserInfo` | POST | 更新用户信息 |
| `/auth/increaseTodoLimit` | POST | 增加待办上限 |
| `/upload/avatar` | POST | 上传头像 |

### 待办相关 API

| 接口 | 方法 | 说明 |
|------|------|------|
| `/todos/list` | GET | 获取待办列表 |
| `/todos/:id` | GET | 获取单个待办 |
| `/todos/create` | POST | 创建待办 |
| `/todos/:id` | PUT | 更新待办 |
| `/todos/:id` | DELETE | 删除待办 |
| `/todos/batch-move` | POST | 批量移动待办到组合 |
| `/todos/sync` | POST | 增量同步 |
| `/todos/full-sync` | GET | 全量同步 |
| `/todos/deleted` | GET | 获取已删除待办列表 |
| `/todos/restore/:todoId` | POST | 恢复已删除待办 |
| `/todos/permanent/:todoId` | DELETE | 永久删除待办 |

### 组合相关 API

| 接口 | 方法 | 说明 |
|------|------|------|
| `/combos/list` | GET | 获取组合列表 |
| `/combos/:id` | GET | 获取组合详情（含成员、共享待办） |
| `/combos/create` | POST | 创建组合 |
| `/combos/:id` | PUT | 更新组合 |
| `/combos/:id` | DELETE | 删除组合 |
| `/combos/:id/members` | GET | 获取组合成员 |
| `/combos/:comboId/members/:userId/role` | PUT | 设置成员角色 |

### 协作相关 API

| 接口 | 方法 | 说明 |
|------|------|------|
| `/collab/join` | POST | 加入共享组合（需审批） |
| `/collab/auto-join` | POST | 自动加入共享组合（无需审批） |
| `/collab/request` | POST | 发送加入申请 |
| `/collab/requests` | GET | 获取加入申请列表 |
| `/collab/requests/:requestId/approve` | POST | 批准申请 |
| `/collab/requests/:requestId/reject` | POST | 拒绝申请 |
| `/collab/shared` | GET | 获取共享组合列表 |
| `/collab/shared/:comboId/todos` | POST | 创建共享待办 |
| `/collab/shared/:comboId/todos/:todoId` | PUT | 更新共享待办 |
| `/collab/shared/:comboId/todos/:todoId` | DELETE | 删除共享待办 |
| `/collab/shared/:comboId/todos/:todoId/complete` | PUT | 完成/取消完成共享待办 |
| `/collab/member` | DELETE | 移除成员 |
| `/collab/leave` | POST | 退出组合 |

### 标签相关 API

| 接口 | 方法 | 说明 |
|------|------|------|
| `/tags/list` | GET | 获取标签列表 |
| `/tags/create` | POST | 创建标签 |
| `/tags/:id` | PUT | 更新标签 |
| `/tags/:id` | DELETE | 删除标签 |

### 通知相关 API

| 接口 | 方法 | 说明 |
|------|------|------|
| `/notify/subscribe` | POST | 订阅消息模板 |
| `/notify/schedule` | POST | 设置待办通知 |

## 8. 核心功能实现

### 共享组合功能

共享组合允许多用户协作管理待办：

1. **创建共享组合**：在 combo-edit 页面开启"共享组合"开关
2. **邀请成员**：通过邀请码或二维码邀请他人加入
3. **权限管理**：
   - owner（超管）：最高权限，可管理所有成员
   - admin（管理）：可创建待办、管理普通成员
   - member（成员）：只能查看和完成分配给自己的待办
4. **待办分配**：
   - 全员完成：所有成员都需要完成
   - 指定成员：只有指定成员需要完成
   - 免完成设置：超管/管理可设置某些人员无需完成

### 首页Tab切换逻辑

首页 `/pages/todo/todo` 支持三个Tab：
- **全部待办**：显示所有待办事项，点击Fab跳转添加待办
- **私有组合**：显示私有组合列表，点击Fab跳转新建组合
- **共享组合**：显示共享组合列表，点击Fab弹出选择（新建共享组合/加入共享组合）

### 组合选择逻辑

在 add-todo 页面选择组合时：
- **私有组合**：显示非共享的组合
- **共享组合**：显示用户有管理权限（owner/admin）的共享组合

### 二维码邀请功能

- collaboration 页面显示组合二维码（格式：`TIMEGREEN:邀请码`）
- join-collab 页面支持扫描二维码自动解析邀请码
- 二维码纠错等级为 H（最高级别）

## 9. 开发规范与约定

### 代码风格

- 遵循微信小程序代码规范
- 使用4个空格进行缩进
- 变量命名采用驼峰命名法
- 函数命名清晰，描述其功能
- 关键代码添加注释说明

### UI设计规范

- 优先使用TDesign组件库
- 保持清爽的绿意设计风格
- 确保界面简洁易用
- 考虑不同屏幕尺寸的适配

### 性能优化

- 减少不必要的setData调用
- 使用本地缓存减少网络请求
- 图片资源进行适当压缩
- 长列表使用分页或虚拟列表

### 错误处理

- 全局错误捕获在app.js的onError中实现
- 网络请求和API调用添加错误处理
- 对用户操作提供清晰的反馈

## 10. 后端控制器结构

| 控制器 | 说明 |
|--------|------|
| authController.js | 用户认证、登录、信息管理 |
| todoController.js | 待办事项CRUD、同步 |
| comboController.js | 组合管理、成员管理 |
| collabController.js | 协作功能、共享待办 |
| tagController.js | 标签管理 |
| notifyController.js | 消息通知 |
| uploadController.js | 文件上传 |
| configController.js | 系统配置、版本管理 |

## 11. 总结

时光绿径待办是一款功能丰富、设计精美的微信小程序，专注于为用户提供高效的待办事项管理体验。项目支持私有待办管理和多人协作功能，通过本指南，AI代理可以快速了解项目的核心架构、数据模型、功能实现和开发约定，从而更好地参与项目的开发和维护工作。

在开发过程中，请始终遵循项目的开发规范和约定，确保代码的质量和一致性。如果有任何疑问或需要进一步了解某个功能的实现细节，请参考相关页面的源代码或咨询项目负责人。

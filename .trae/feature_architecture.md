# 时光绿径待办 - 完整功能架构文档

> 版本：1.0.0  
> 更新日期：2026-04-05  
> 适用范围：网页版开发参考、功能迁移指南

---

## 目录

1. [系统概览](#1-系统概览)
2. [技术架构](#2-技术架构)
3. [功能模块总览](#3-功能模块总览)
4. [核心模块详解](#4-核心模块详解)
5. [页面路由与导航](#5-页面路由与导航)
6. [数据模型](#6-数据模型)
7. [API接口清单](#7-api接口清单)
8. [权限体系](#8-权限体系)
9. [第三方集成](#9-第三方集成)
10. [业务流程](#10-业务流程)
11. [网页版开发建议](#11-网页版开发建议)

---

## 1. 系统概览

### 1.1 产品定位

**时光绿径待办**是一款功能丰富的待办事项管理工具，采用清新绿色设计风格，支持个人任务管理和多人协作，致力于为用户提供高效的任务管理体验。

### 1.2 核心价值主张

- ✅ **个人效率提升**：完整的待办生命周期管理
- ✅ **团队协作**：共享组合与多角色权限
- ✅ **数据洞察**：多维度统计分析
- ✅ **智能辅助**：语音识别、AI助手（暂停服务）
- ✅ **跨端同步**：本地存储 + 云端同步

### 1.3 目标用户

| 用户类型 | 使用场景 | 核心需求 |
|---------|---------|---------|
| 个人用户 | 日常任务管理 | 快速记录、提醒、统计 |
| 学生党 | 学习计划管理 | 标签分类、日历视图 |
| 职场人 | 工作项目跟踪 | 组合归档、协作分配 |
| 团队/小组 | 共享任务管理 | 多人协作、进度追踪 |

---

## 2. 技术架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                      客户端层 (微信小程序)                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │  主包页面  │ │ Admin分包 │ │ Combo分包 │ │ Tools分包 │       │
│  │ (17页)    │ │ (6页)     │ │ (4页)     │ │ (9页)     │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                              │                                │
│                    TDesign组件库 + 第三方插件                   │
└──────────────────────────────┼───────────────────────────────┘
                               │ HTTPS
┌──────────────────────────────▼───────────────────────────────┐
│                       API网关层                                │
│              Express.js + CORS + BodyParser                  │
│         认证中间件 + 日志中间件 + 管理员权限中间件               │
└──────────────────────────────┬───────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────┐
│                     业务逻辑层 (Controllers)                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │   Todo   │ │  Combo   │ │  Collab  │ │   Auth   │        │
│  │ Controller│ │Controller│ │Controller│ │Controller│        │
│  ├──────────┤ ├──────────┤ ├──────────┤ ├──────────┤        │
│  │   Tag    │ │  Notify  │ │   Admin  │ │ Comment  │        │
│  │Controller│ │Controller│ │Controller│ │Controller│        │
│  ├──────────┤ ├──────────┤ └──────────┘ └──────────┘        │
│  │  Config  │ │  Upload  │                                      │
│  │Controller│ │Controller│                                      │
│  └──────────┘ └──────────┘                                      │
└──────────────────────────────┬───────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────┐
│                      数据持久层                                 │
│                 MySQL 数据库                                   │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐    │
│  │ users  │ │ todos  │ │ combos │ │ tags   │ │shared_ │    │
│  │        │ │        │ │        │ │        │ │ todos  │    │
│  ├────────┤ ├────────┤ ├────────┤ ├────────┤ ├────────┤    │
│  │todo_tags│ │combo_  │ │collab_ │ │todo_   │ │shared_ │    │
│  │        │ │members │ │requests│ │notifi- │ │todo_  │    │
│  │        │ │        │ │        │ │cations│ │assigns│    │
│  └────────┘ └────────┘ └────────┘ └────────┴────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 技术栈

#### 前端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| 微信小程序原生框架 | - | 基础框架 |
| TDesign MiniProgram | latest | UI组件库 |
| ECharts for Weixin | - | 图表可视化 |
| @lspriv/wx-calendar | - | 高级日历组件 |
| crypto-js | - | 加密解密 |
| dayjs | - | 日期处理 |
| WechatSI Plugin | 0.3.6 | 语音识别（同声传译）|

#### 后端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Node.js | - | 运行时环境 |
| Express.js | 4.x | Web框架 |
| MySQL | 8.x | 关系型数据库 |
| JWT (jsonwebtoken) | - | 身份认证 |
| cors | - | 跨域处理 |
| dotenv | - | 环境变量管理 |
| uuid | - | 唯一ID生成 |
| 微信小程序云开发 | - | 二维码生成 |

### 2.3 项目目录结构

```
TimeGreen Path Todo/
├── pages/                          # 主包页面（TabBar核心）
│   ├── todo/                       # 首页 - 待办列表
│   ├── calendar/                   # 日历视图
│   ├── stats/                      # 统计分析
│   ├── more/                       # 更多功能入口
│   ├── add-todo/                   # 添加/编辑待办
│   ├── todo-detail/                # 待办详情
│   ├── todo-search/                # 搜索结果
│   ├── daily-stats/                # 每日统计
│   ├── day-todos/                  # 单日待办
│   ├── user-center/                # 用户中心
│   ├── login/                      # 登录页
│   ├── notice/                     # 公告页
│   ├── changelog/                  # 更新日志
│   └── guide/                      # 引导页
│
├── packageAdmin/                   # 管理后台分包
│   ├── index/                      # 管理首页（数据面板）
│   ├── users/                      # 用户管理
│   ├── user-detail/                # 用户详情
│   ├── notices/                    # 公告管理
│   ├── notice-edit/                # 编辑公告
│   ├── changelog/                  # 更新日志管理
│   └── changelog-edit/             # 编辑更新日志
│
├── packageCombo/                   # 组合管理分包
│   ├── combo-edit/                 # 创建/编辑组合
│   ├── combo-detail/               # 组合详情（含待办列表）
│   ├── collaboration/              # 协作管理（成员+二维码）
│   └── combo-stats/                # 组合统计
│
├── packageTools/                   # 工具集分包
│   ├── eating/                     # 今天吃什么
│   ├── password-generator/         # 密码生成器
│   ├── motivation/                 # 每日激励
│   ├── star/                       # 收藏夹
│   ├── acknowledge/                # 致谢名单
│   ├── join-collab/                # 加入协作
│   ├── trash/                      # 回收站
│   ├── datamanage/                 # 数据导入导出
│   └── tag-manage/                 # 标签管理
│
├── utils/                          # 工具函数
│   ├── api.js                      # API请求封装
│   ├── sync.js                     # 云同步逻辑
│   └── util.js                     # 通用工具函数
│
├── backend/                        # 后端服务
│   ├── app.js                      # 入口文件
│   ├── config/
│   │   └── database.js             # 数据库配置
│   ├── routes/                     # 路由定义
│   ├── controllers/                # 业务控制器
│   ├── middleware/                  # 中间件
│   ├── services/                   # 服务层
│   └── utils/                      # 后端工具
│
├── app.js                          # 小程序入口
├── app.json                        # 配置文件
├── app.wxss                        # 全局样式
└── .trae/                          # 开发规范文档
```

---

## 3. 功能模块总览

### 3.1 一级功能模块

```
时光绿径待办
├── 🔐 用户系统
├── 📝 待办管理（核心）
├── 📂 组合管理
├── 👥 协作功能
├── 🏷️ 标签系统
├── 📅 日历视图
├── 📊 数据统计
├── 🔍 搜索功能
├── 📍 位置信息
├── 🎤 语音识别
├── 🔔 通知提醒
├── ☁️ 云端同步
├── 🗑️ 回收站
🜀 数据管理
├── 💬 评论功能
├── 🛠️ 工具集
├── ⭐ 收藏功能
├── 📢 公告系统
├── 🔄 版本更新
├── 🤖 AI助手（暂停）
└── 🎛️ 管理后台
```

### 3.2 功能优先级矩阵

| 模块 | 优先级 | 复杂度 | 网页版必做 | 说明 |
|------|--------|--------|-----------|------|
| 用户系统 | P0 | 中 | ✅ | 登录认证基础 |
| 待办管理 | P0 | 高 | ✅ | 核心功能 |
| 组合管理 | P0 | 中 | ✅ | 任务归类 |
| 标签系统 | P0 | 低 | ✅ | 分类筛选 |
| 日历视图 | P0 | 中 | ✅ | 时间维度展示 |
| 数据统计 | P1 | 高 | ⚠️ 可简化 | ECharts图表 |
| 云端同步 | P0 | 高 | ✅ | 多端数据一致 |
| 协作功能 | P1 | 很高 | ⚠️ 可分阶段 | 多人场景 |
| 评论功能 | P2 | 中 | ❌ 可选 | 协作增强 |
| 通知提醒 | P1 | 高 | ⚠️ 需改造 | 订阅消息→Web推送 |
| 工具集 | P2 | 低 | ❌ 可选 | 辅助功能 |
| 管理后台 | P2 | 高 | ❌ 内部使用 | 运营工具 |

---

## 4. 核心模块详解

### 4.1 📝 待办管理模块（核心）

#### 功能描述
待办事项的完整生命周期管理，是系统的最核心功能。

#### 功能清单

| 子功能 | 描述 | 页面位置 | API接口 |
|-------|------|---------|---------|
| **创建待办** | 新建待办事项 | add-todo | POST /todos/create |
| **编辑待办** | 修改待办内容 | add-todo (edit模式) | PUT /todos/:id |
| **删除待办** | 软删除到回收站 | todo (滑动操作) | DELETE /todos/:id |
| **完成待办** | 切换完成状态 | todo (点击复选框) | PUT /todos/:id |
| **查看详情** | 查看完整信息 | todo-detail | GET /todos/:id |
| **搜索待办** | 关键词搜索 | todo-search | 本地过滤 |
| **批量操作** | 批量移动到组合 | todo (长按多选) | POST /todos/batch-move |
| **清空已完成** | 一键清除所有已完成项 | todo (ActionSheet) | 本地+云端 |
| **清空全部** | 清空所有待办 | todo (ActionSheet) | 本地+云端 |
| **拖拽排序** | 手动调整顺序 | todo (长按拖拽) | 本地操作 |

#### 待办数据字段

```javascript
{
  id: 'todo_1234567890_abc123',      // 唯一ID
  text: '待办内容',                    // 标题/内容
  setDate: '2025-04-05',              // 日期 YYYY-MM-DD
  setTime: '14:30',                   // 时间 HH:MM
  remarks: '备注信息',                 // 详细说明
  location: {                         // 位置信息（可选）
    name: '位置名称',
    address: '详细地址',
    latitude: 39.9087,
    longitude: 116.3975
  },
  completed: false,                   // false 或 完成时间戳
  isStar: false,                      // 是否收藏
  time: 1768585225477,               // 创建时间戳
  tags: [1, 2],                       // 标签ID数组
  comboId: 'combo_123',              // 所属组合ID（可选）
  images: [],                         // 图片附件数组
  
  // 同步相关字段
  version: 1,                         // 数据版本号（每次修改递增）
  isDeleted: false,                   // 软删除标记
  deletedAt: null,                    // 删除时间戳
  updatedAt: 1768585225477           // 最后更新时间戳
}
```

#### 业务规则

1. **默认值规则**
   - 默认日期：当天日期
   - 默认时间：12:00
   - 默认状态：未完成
   - 默认收藏：否

2. **数据校验**
   - text 字段必填，不能为空
   - setDate 必须为有效日期格式
   - setTime 格式为 HH:MM

3. **操作约束**
   - 删除操作为软删除，不直接从数据库移除
   - 已删除待办保留30天后自动清理
   - 每次修改必须更新 version 和 updatedAt

4. **数据上限**
   - 默认待办上限：100个
   - 可通过观看广告增加上限（每次+10）
   - 管理员可手动调整用户上限

---

### 4.2 📂 组合管理模块

#### 功能描述
将待办事项归类到不同的组合中，便于分类管理。支持私有组合和共享组合两种模式。

#### 功能清单

| 子功能 | 描述 | 页面位置 | API接口 |
|-------|------|---------|---------|
| **创建组合** | 新建组合 | combo-edit | POST /combos/create |
| **编辑组合** | 修改组合信息 | combo-edit | PUT /combos/:id |
| **删除组合** | 删除组合 | combo-detail | DELETE /combos/:id |
| **查看详情** | 查看组合内待办列表 | combo-detail | GET /combos/:id |
| **选择图标** | 自定义组合图标 | combo-editor | - |
| **选择颜色** | 自定义组合颜色 | combo-editor | - |
| **开启共享** | 将私有组合转为共享 | combo-editor | PUT /combos/:id |
| **查看统计** | 组合内待办完成情况 | combo-stats | 本地计算 |

#### 组合数据字段

```javascript
{
  id: 1,                              // 组合ID
  user_id: 1,                         // 创建者用户ID
  name: '工作计划',                    // 组合名称
  icon: 'folder',                     // TDesign图标名
  color: '#4CAF50',                   // 组合颜色（HEX）
  description: '',                    // 组合描述
  is_shared: 0,                       // 是否共享（0/1）
  share_code: 'ABC12345',            // 共享邀请码（8位）
  member_limit: 50,                   // 成员上限
  created_at: '2025-04-05',          // 创建时间
  updated_at: null                    // 更新时间
}
```

#### 业务规则

1. **数量限制**
   - 私有组合上限：10个
   - 共享组合上限：5个
   - 总计组合上限：15个

2. **命名规范**
   - 名称长度：2-20字符
   - 不能包含特殊字符

3. **共享设置**
   - 私有组合可随时转为共享
   - 共享组合不可转回私有
   - 共享后自动生成8位邀请码

4. **删除规则**
   - 删除组合时需确认
   - 共享组合需先转移所有权或解散
   - 删除后组合内待办变为无归属状态

---

### 4.3 👥 协作功能模块

#### 功能描述
支持多人共同管理共享组合内的待办事项，包含成员管理、权限控制、待办分配等功能。

#### 功能清单

| 子功能 | 描述 | 页面位置 | API接口 |
|-------|------|---------|---------|
| **加入组合** | 通过邀请码加入 | join-collab | POST /collab/join |
| **自动加入** | 无需审批直接加入 | join-collab | POST /collab/auto-join |
| **申请加入** | 发送加入申请 | collab | POST /collab/request |
| **审批申请** | 管理员批准/拒绝 | collaboration | POST /collab/requests/:id/approve or reject |
| **成员列表** | 查看所有成员 | collaboration | GET /combos/:id/members |
| **邀请成员** | 通过二维码/邀请码 | collaboration | GET /collab/qrcode |
| **移除成员** | 踢出成员 | collaboration | DELETE /collab/member |
| **退出组合** | 主动离开 | collaboration | POST /collab/leave |
| **设置角色** | 修改成员权限 | collaboration | PUT /combos/:comboId/members/:userId/role |
| **创建共享待办** | 在共享组合中新建 | combo-detail | POST /collab/shared/:comboId/todos |
| **编辑共享待办** | 修改共享待办 | combo-detail | PUT /collab/shared/:comboId/todos/:todoId |
| **完成共享待办** | 标记完成/取消完成 | combo-detail | PUT /collab/shared/:comboId/todos/:todoId/complete |
| **删除共享待办** | 删除共享待办 | combo-detail | DELETE /collab/shared/:comboId/todos/:todoId |

#### 角色权限体系

| 角色 | 权限说明 | 可执行操作 |
|------|---------|-----------|
| **owner（超管）** | 最高权限 | 所有操作 + 转让所有权 + 解散组合 |
| **admin（管理）** | 管理权限 | 创建待办 + 管理普通成员 + 审批申请 |
| **member（成员）** | 基础权限 | 查看 + 完成被分配的待办 + 发表评论 |

#### 待办分配机制

| 分配类型 | 描述 | 适用场景 |
|---------|------|---------|
| **all（全员）** | 所有成员都需要完成 | 团队共同目标 |
| **specific（指定）** | 只有指定成员需要完成 | 个人任务分配 |

#### 业务规则

1. **成员限制**
   - 共享组合最大成员数：50人（可配置）
   - 单个用户最多加入：5个共享组合

2. **邀请码规则**
   - 格式：6位大写字母+数字（去除易混淆字符如O、0、I、1）
   - 有效期：永久有效
   - 加入方式：
     - 手动输入邀请码
     - 扫描二维码（格式：`TIMEGREEN:邀请码`）
     - 分享链接（scene参数携带）

3. **审批流程**
   - 可配置：需要审批 / 自动加入
   - 申请后管理员在"协作管理"页面看到待审批列表
   - 超管和管理员都有审批权限

4. **退出/移除规则**
   - 退出时待办分配记录保留
   - 超管退出前必须转让给其他成员
   - 最后一个超管无法退出，只能解散

---

### 4.4 🏷️ 标签系统模块

#### 功能描述
对待办事项进行分类标记，支持系统预设标签和用户自定义标签。

#### 功能清单

| 子功能 | 描述 | 页面位置 | API接口 |
|-------|------|---------|---------|
| **查看标签列表** | 显示所有可用标签 | tag-manage | GET /tags/list |
| **创建自定义标签** | 新建标签 | tag-manage | POST /tags/create |
| **编辑标签** | 修改标签名称和颜色 | tag-manage | PUT /tags/:id |
| **删除标签** | 删除自定义标签 | tag-manage | DELETE /tags/:id |
| **应用标签** | 为待办添加标签 | add-todo | - |
| **按标签筛选** | 过滤显示特定标签待办 | todo | 本地操作 |

#### 系统预设标签

| ID | 名称 | 颜色 | 图标 |
|----|------|------|------|
| 1 | 工作 | #2196F3 | briefcase |
| 2 | 学习 | #9C27B0 | book |
| 3 | 生活 | #4CAF50 | home |
| 4 | 健康 | #F44336 | heart |
| 5 | 购物 | #FF9800 | cart |
| 6 | 其他 | #607D8B | more |

#### 标签数据字段

```javascript
{
  id: 1,                    // 标签ID
  name: '工作',             // 标签名称
  color: '#2196F3',         // 标签颜色（HEX）
  icon: 'briefcase',        // TDesign图标名
  is_system: true           // 是否系统预设（true/false）
}
```

#### 业务规则

1. **标签限制**
   - 系统预设标签：6个（不可删除）
   - 用户自定义标签：无硬性上限（建议<20）
   - 单个待办最多关联：不限

2. **颜色规范**
   - 推荐颜色池：8种标准色
   - 支持任意HEX颜色值
   - 颜色用于标签显示和筛选高亮

3. **操作约束**
   - 系统标签不可编辑、不可删除
   - 删除用户标签时，已关联的待办保留标签引用（显示但不可选）
   - 标签名称唯一性检查

---

### 4.5 📅 日历视图模块

#### 功能描述
以日历形式可视化展示每日待办分布，支持快速导航和单日待办查看。

#### 功能清单

| 子功能 | 描述 | 页面位置 | API接口 |
|-------|------|---------|---------|
| **月历视图** | 显示整月待办分布 | calendar | 本地计算 |
| **日期标记** | 在日期上显示待办数量 | calendar | 全局缓存 |
| **点击日期** | 查看当日待办列表 | calendar → day-todos | 本地过滤 |
| **日期导航** | 切换月份/年份 | calendar | 组件内置 |
| **今日跳转** | 快速回到今天 | calendar | 组件内置 |
| **农历显示** | 显示农历日期 | calendar | LunarPlugin |

#### 技术实现

- 使用 `@lspriv/wx-calendar` 高级日历组件
- 启用 `LunarPlugin` 农历插件
- 日历标记数据来源：`globalData.calendarCache`
- 缓存更新时机：每次待办增删改时调用 `app.updateCalendarCache()`

#### 日历缓存结构

```javascript
calendarCache: {
  '2025-04-05': {
    count: 3,                    // 当天待办数量
    sampleText: '完成报告'       // 示例文本（用于显示预览）
  },
  '2025-04-06': {
    count: 1,
    sampleText: '开会'
  }
}
```

---

### 4.6 📊 数据统计模块

#### 功能描述
多维度分析待办完成情况，提供可视化图表和数据洞察。

#### 功能清单

| 子功能 | 描述 | 页面位置 | API接口 |
|-------|------|---------|---------|
| **总览卡片** | 总数/完成数/完成率/平均用时 | stats | 本地计算 |
| **环形图** | 完成率可视化 | stats | ECharts |
| **趋势图** | 近7日/30日完成趋势 | stats | ECharts |
| **时段分布** | 24小时创建时段热力图 | stats | ECharts |
| **完成时段** | 平均完成时间段分析 | stats | ECharts |
| **分类统计** | 按标签分类的完成情况 | stats | 本地计算 |
| **位置统计** | 待办地点分布地图 | stats | 地图组件 |
| **每日详情** | 单日详细统计数据 | daily-stats | 本地计算 |
| **组合统计** | 特定组合的完成情况 | combo-stats | 本地计算 |

#### 统计指标定义

| 指标 | 计算方式 | 说明 |
|------|---------|------|
| total | 未删除待办总数 | 含已完成和未完成 |
| completed | 已完成待办数 | completed字段有值且不为false |
| progress | 完成百分比 | (completed / total) × 100% |
| avgCompletionTime | 平均完成时长 | 从创建到完成的平均时间差 |
| categoryStats | 各标签完成数 | 按tags分组统计 |
| timeOfDayStats | 24小时分布 | 按setTime的小时部分分组 |

#### 图表技术栈

- **ECharts for Weixin**：所有图表使用ECharts渲染
- **图表类型**：
  - 环形图（Pie/Doughnut）：完成率
  - 折线图（Line）：趋势变化
  - 柱状图（Bar）：时段分布
  - 地图（Map）：位置分布（如有）

---

### 4.7 🔍 搜索功能模块

#### 功能描述
通过关键词快速查找待办事项。

#### 功能清单

| 子功能 | 描述 | 页面位置 | API接口 |
|-------|------|---------|---------|
| **关键词搜索** | 搜索待办标题和备注 | todo-search | 本地过滤 |
| **实时搜索** | 输入即搜索 | todo | 本地操作 |
| **搜索历史** | 记录最近搜索词 | todo-search | LocalStorage |
| **搜索结果高亮** | 匹配文字高亮显示 | todo-search | WXML处理 |

#### 搜索范围

- 待办标题（text字段）
- 备注内容（remarks字段）
- 大小写不敏感
- 支持模糊匹配

---

### 4.8 📍 位置信息模块

#### 功能描述
为待办添加地理位置信息，支持导航功能。

#### 功能清单

| 子功能 | 描述 | 页面位置 | API接口 |
|-------|------|---------|---------|
| **选择位置** | 调用微信选点API | add-todo | wx.chooseLocation |
| **获取当前位置** | GPS定位 | add-todo | wx.getLocation |
| **显示位置** | 展示位置名称和地址 | todo-detail | - |
| **一键导航** | 跳转到地图导航 | todo-detail | wx.openLocation |
| **位置统计** | 地图标记聚合 | stats | 本地计算 |

#### 位置数据结构

```javascript
location: {
  name: '北京大学',           // POI名称
  address: '北京市海淀区颐和园路5号',  // 详细地址
  latitude: 39.992806,        // 纬度
  longitude: 116.311676       // 经度
}
```

#### 权限要求

- `scope.userLocation`：获取用户位置
- `requiredPrivateInfos`：`chooseLocation`, `getLocation`

---

### 4.9 🎤 语音识别模块

#### 功能描述
集成微信同声传译插件，支持语音快速创建待办。

#### 功能清单

| 子功能 | 描述 | 页面位置 | API接口 |
|-------|------|---------|---------|
| **开始录音** | 按住录音按钮 | todo | plugin.start |
| **停止录音** | 松开结束录音 | todo | plugin.stop |
| **语音转文字** | 自动识别语音内容 | todo | plugin.onRecognize |
| **填充待办** | 识别结果填入输入框 | todo → add-todo | URL传参 |

#### 技术实现

- **插件**：WechatSI（微信同声传译）
- **版本**：0.3.6
- **Provider**：wx069ba97219f66d99
- **识别语言**：中文普通话

#### 权限要求

- `scope.record`：麦克风权限

---

### 4.10 🔔 通知提醒模块

#### 功能描述
通过微信订阅消息在设定时间提醒用户完成待办。

#### 功能清单

| 子功能 | 描述 | 页面位置 | API接口 |
|-------|------|---------|---------|
| **订阅消息模板** | 引导用户授权订阅 | todo-detail | wx.requestSubscribeMessage |
| **设置提醒时间** | 选择提前天数和时间 | todo-detail | POST /notify/schedule |
| **取消提醒** | 取消已设置的提醒 | todo-detail | DELETE /notify/:id |
| **修改提醒** | 更新提醒时间 | todo-detail | PUT /notify/:id |
| **提醒列表** | 查看所有提醒 | todo-detail | GET /notify/list |
| **共享待办提醒** | 为共享待办设置提醒 | todo-detail | POST /notify/shared/schedule |
| **测试发送** | 开发测试用 | - | POST /notify/test-send |

#### 消息模板ID

| 模板 | 用途 | TemplateID |
|------|------|-------------|
| 私有待办提醒 | 个人待办通知 | 1jvRWbLBNSasPzKtUnrQEiVrU6hj2lWwhKNq2u8jjWg |
| 共享待办提醒 | 共享待办通知 | 1jvRWbLBNSasPzKtUnrQEviO7vwbWCChJJr0z24an-Y |

#### 提醒参数

```javascript
{
  todoId: 'todo_xxx',           // 待办ID
  notifyDateOffset: '0',        // 提前几天（0=当天，-1=前一天）
  notifyTime: '09:00',          // 提醒时间
  customDays: 3                  // 自定义天数（可选）
}
```

#### 业务规则

1. **订阅限制**
   - 用户需主动授权订阅消息模板
   - 每次授权可发送有限次数（由微信限制）
   - 需引导用户保持订阅状态

2. **发送时机**
   - 服务端定时任务检查（cron job）
   - 到达提醒时间时调用微信API发送
   - 发送成功/失败记录日志

3. **共享待办提醒**
   - 仅分配给当前用户的待办会收到提醒
   - 全员完成的待办，所有成员都可收到

---

### 4.11 ☁️ 云端同步模块

#### 功能描述
实现本地数据与服务器的双向同步，支持增量同步和冲突解决。

#### 功能清单

| 子功能 | 描述 | 触发方式 | API接口 |
|-------|------|---------|---------|
| **自动同步** | 应用启动/切前台时自动同步 | onShow | POST /todos/sync |
| **手动同步** | 下拉刷新触发同步 | PullDownRefresh | POST /todos/sync |
| **全量同步** | 首次登录或数据不一致时 | 检测到差异 | GET /todos/full-sync |
| **增量同步** | 只同步变更的数据 | 定期触发 | POST /todos/sync |
| **冲突解决** | 版本号比较解决冲突 | 自动处理 | - |
| **离线支持** | 无网络时使用本地数据 | 自动降级 | LocalStorage |

#### 同步策略

```
同步流程：
1. 收集本地变更（新增/修改/删除）
2. 上报本地版本号（lastSyncAt）
3. 服务端对比返回差异
4. 合并远程变更到本地
5. 更新本地lastSyncAt
6. 更新日历缓存
```

#### 冲突解决规则

| 场景 | 解决策略 |
|------|---------|
| 本地和云端都修改了同一待办 | 以version更大的一方为准（Last Write Wins）|
| 本地删除了，云端修改了 | 询问用户或以删除为准 |
| 新增冲突（相同ID） | 保留双方，重命名本地副本 |

#### 同步状态枚举

```javascript
syncStatus: {
  'idle': '空闲',
  'syncing': '同步中',
  'success': '同步成功',
  'error': '同步失败',
  'offline': '离线模式'
}
```

---

### 4.12 🗑️ 回收站模块

#### 功能描述
临时存放已删除的待办，支持恢复或永久删除。

#### 功能清单

| 子功能 | 描述 | 页面位置 | API接口 |
|-------|------|---------|---------|
| **查看已删除** | 显示回收站内容 | trash | GET /todos/deleted |
| **恢复待办** | 从回收站恢复 | trash | POST /todos/restore/:todoId |
| **永久删除** | 彻底删除不可恢复 | trash | DELETE /todos/permanent/:todoId |
| **剩余天数** | 显示自动清理倒计时 | trash | 本地计算 |
| **批量恢复** | 恢复多个待办 | trash | 循环调用restore |
| **批量永久删除** | 彻底清除多个 | trash | 循环调用permanentDelete |

#### 业务规则

1. **保留期限**
   - 已删除待办保留：30天
   - 超过30天自动清理（下次同步时）
   - 倒计时显示精确到天

2. **恢复行为**
   - 恢复后待办回到原列表
   - 保持原有的标签、组合等属性
   - version号递增

3. **永久删除**
   - 需二次确认
   - 不可撤销
   - 同时清理云端数据（如果已登录）

---

### 4.13 💾 数据管理模块

#### 功能描述
支持待办数据的导入、导出和备份，方便数据迁移和多设备同步。

#### 功能清单

| 子功能 | 描述 | 页面位置 | API接口 |
|-------|------|---------|---------|
| **导出数据** | 导出为JSON字符串 | datamanage | 本地操作 |
| **复制数据** | 复制到剪贴板 | datamanage | wx.setClipboardData |
| **分享备份** | 生成分享链接/二维码 | datamanage | onShareAppMessage |
| **导入数据** | 从JSON导入 | datamanage | 本地操作 |
| **覆盖导入** | 清空后导入新数据 | datamanage | 本地操作 |
| **合并导入** | 与现有数据合并 | datamanage | 本地操作 |

#### 导出数据格式

```json
[
  [
    "todo_id",
    "待办内容",
    "2025-04-05",
    "14:30",
    false,
    "备注",
    {"name":"位置","address":"地址","lat":39.9,"lng":116.4},
    false,
    1768585225477,
    [1, 2],
    "combo_id",
    1,
    1768585225477,
    false,
    null,
    []
  ]
]
```

#### 数据字段映射（索引→字段名）

| 索引 | 字段名 | 类型 | 必填 |
|-----|--------|------|-----|
| 0 | id | string | 是 |
| 1 | text | string | 是 |
| 2 | setDate | string | 是 |
| 3 | setTime | string | 否（默认12:00）|
| 4 | completed | boolean/number | 是 |
| 5 | remarks | string | 否 |
| 6 | location | object/null | 否 |
| 7 | isStar | boolean | 否 |
| 8 | time | number | 是 |
| 9 | tags | array | 否 |
| 10 | comboId | string/null | 否 |
| 11 | version | number | 否 |
| 12 | updatedAt | number | 否 |
| 13 | isDeleted | boolean | 否 |
| 14 | deletedAt | number/null | 否 |
| 15 | images | array | 否 |

---

### 4.14 💬 评论功能模块

#### 功能描述
在共享待办下发表评论和回复，增强团队沟通。

#### 功能清单

| 子功能 | 描述 | 页面位置 | API接口 |
|-------|------|---------|---------|
| **发表评论** | 对共享待办评论 | todo-detail | POST /comments/:sharedTodoId |
| **回复评论** | 回复他人的评论 | todo-detail | POST /comments/:sharedTodoId |
| **查看评论** | 加载评论列表 | todo-detail | GET /comments/:sharedTodoId |
| **删除评论** | 删除自己的评论 | todo-detail | DELETE /comments/:commentId |
| **分页加载** | 滚动加载更多 | todo-detail | 分页参数 |
| **评论计数** | 显示评论总数 | todo-detail | 响应字段 |

#### 评论数据结构

```javascript
{
  id: 1,                          // 评论ID
  shared_todo_id: 1,              // 所属共享待办ID
  user_id: 1,                     // 评论者用户ID
  parent_id: null,                // 父评论ID（null=主评论）
  content: '这个待办很重要',       // 评论内容
  created_at: '2025-04-05 10:00',// 创建时间
  
  // 关联数据
  user: {
    id: 1,
    nickname: '用户名',
    avatar_url: '头像URL'
  },
  
  // 统计
  reply_count: 3                  // 回复数
}
```

#### 业务规则

1. **权限控制**
   - 只有组合成员可以评论
   - 只能删除自己的评论（管理员可删除任意评论）
   - 支持最多3层回复嵌套

2. **内容规范**
   - 内容长度限制：500字
   - 支持纯文本（暂不支持富文本/Markdown）
   - 敏感词过滤（服务端）

---

### 4.15 ⭐ 收藏功能模块

#### 功能描述
将重要待办标记为收藏，快速访问。

#### 功能清单

| 子功能 | 描述 | 页面位置 | API接口 |
|-------|------|---------|---------|
| **添加收藏** | 标记待办为收藏 | todo/todo-detail | PUT /todos/:id |
| **取消收藏** | 取消收藏标记 | todo/todo-detail | PUT /todos/:id |
| **查看收藏列表** | 显示所有收藏待办 | star | 本地过滤 |
| **收藏筛选** | 只看收藏的待办 | todo | 本地操作 |

#### 实现方式

- 使用待办的 `isStar` 字段（boolean）
- 收藏列表页面从全量数据中过滤 `isStar === true` 的项
- 收藏不影响其他排序和筛选

---

### 4.16 🛠️ 工具集模块

#### 功能描述
提供实用小工具，增强产品粘性和用户体验。

#### 4.16.1 🍽️ 今天吃什么

**页面**：eating

**功能**：
- 四种餐型选择：早餐/午餐/晚餐/宵夜
- 随机推荐菜品（每类25-38道菜）
- 动画效果展示结果
- 历史记录（最近5条）
- 餐型统计
- 分享功能

**菜品库规模**：总计140+道菜品

#### 4.16.2 🔐 密码生成器

**页面**：password-generator

**功能**：
- 可选字符类型：数字/小写/大写/符号/下划线
- 自定义密码长度（1-64位）
- 密码强度评估（弱/中/强）
- 安全提示（破解时间估算）
- 一键复制

**强度评估标准**：

| 级别 | 条件 | 破解时间 |
|------|------|---------|
| 弱 | 简单字符组合 | 数秒内 |
| 中 | 中等复杂度 | 数小时 |
| 强 | 多种字符+足够长度 | 数百年 |

#### 4.16.3 💪 每日激励

**页面**：motivation

**功能**：
- 每日励志语录展示
- 激励视频广告（观看可增加待办上限）
- 广告激励：每次+10个待办上限

#### 4.16.4 🙏 致谢名单

**页面**：acknowledge

**功能**：
- 展示项目贡献者
- 致谢内容展示
- 静态页面（无需API）

#### 4.16.5 📥 加入协作

**页面**：join-collab

**功能**：
- 输入邀请码加入共享组合
- 扫描二维码加入
- 自动检测分享链接中的邀请码
- 加入结果反馈

---

### 4.17 📢 公告系统模块

#### 功能描述
向用户发布通知公告，支持Markdown格式。

#### 功能清单

| 子功能 | 描述 | 页面位置 | API接口 |
|-------|------|---------|---------|
| **查看公告列表** | 显示所有公告 | notice | GET /config/notices |
| **查看公告详情** | Markdown渲染 | notice | - |
| **首页公告栏** | 显示最新公告 | todo（顶部） | 全局缓存 |
| **公告未读标记** | 区分已读未读 | - | LocalStorage |

#### 公告数据结构

```javascript
{
  title: '公告标题',
  content: '**Markdown格式的公告内容**',
  publishDate: '2025-04-05',
  isRead: false
}
```

---

### 4.18 🔄 版本更新模块

#### 功能描述
检测新版本并提示用户更新。

#### 功能清单

| 子功能 | 描述 | 触发方式 | API接口 |
|-------|------|---------|---------|
| **版本检测** | 启动时检查更新 | app.onLaunch | GET /config/updates |
| **更新提示** | 弹窗提示有新版本 | 检测到新版本 | - |
| **更新日志** | 查看版本更新内容 | changelog | GET /config/updates |
| **强制更新** | 必须更新才能使用 | 配置控制 | - |

#### 更新日志数据结构

```javascript
{
  version: '1.2.0',
  date: '2025-04-05',
  features: ['新功能1', '新功能2'],
  fixes: ['修复bug1'],
  improvements: ['优化体验']
}
```

---

### 4.19 🔐 用户系统模块

#### 功能描述
用户注册、登录、个人信息管理。

#### 功能清单

| 子功能 | 描述 | 页面位置 | API接口 |
|-------|------|---------|---------|
| **微信登录** | 微信授权一键登录 | login | POST /auth/login |
| **获取用户信息** | 获取当前登录用户信息 | user-center | GET /auth/userInfo |
| **修改昵称** | 修改用户昵称 | user-center | POST /auth/updateUserInfo |
| **上传头像** | 上传自定义头像 | user-center | POST /upload/avatar |
| **查看个人中心** | 显示用户信息和统计 | user-center | 本地+API |
| **增加待办上限** | 观看广告增加配额 | motivation | POST /auth/increaseTodoLimit |

#### 登录流程

```
1. 用户点击"微信登录"
2. 调用 wx.login() 获取 code
3. 发送 code 到后端 /auth/login
4. 后端用 code 换取 openid + session_key
5. 查找或创建用户记录
6. 生成 JWT token 返回前端
7. 前端存储 token，后续请求携带 Authorization header
```

#### 用户数据模型

```javascript
{
  id: 1,                          // 用户ID
  openid: 'oXXXX_xxxxxxxxxxxx',  // 微信OpenID
  nickname: '用户昵称',           // 昵称
  avatar_url: '头像URL',          // 头像
  todo_limit: 100,                // 待办上限
  combo_limit: 10,                // 组合上限
  collab_limit: 5,                // 共享组合上限
  is_admin: false,                // 是否管理员
  created_at: '2025-01-01',      // 注册时间
  last_login_at: '2025-04-05'    // 最后登录时间
}
```

#### 数据上限配置

| 资源类型 | 默认上限 | 最大值 | 增加方式 |
|---------|---------|--------|---------|
| 待办事项 | 100 | 500 | 观广告+10 |
| 私有组合 | 10 | 20 | - |
| 共享组合 | 5 | 10 | - |

---

### 4.20 🎛️ 管理后台模块（Admin Panel）

#### 功能描述
供管理员使用的运营管理工具，包含数据统计、用户管理、内容管理等。

#### 功能清单

##### 4.20.1 📊 数据仪表盘

**页面**：admin/index

**功能**：
- 核心指标卡片（今日新增用户/待办/同步次数等）
- 实时数据刷新
- 点击指标查看详细列表弹窗

**统计指标清单**（共40+项）：

| 分类 | 指标 | API |
|------|------|-----|
| **用户指标** | 今日新用户、7日活跃、30日活跃、总用户数 | GET /admin/stats |
| **待办指标** | 今日新增、总数、已完成、已删除、含位置、含图片 | GET /admin/stats |
| **组合指标** | 总数、共享组合数 | GET /admin/stats |
| **协作指标** | 成员数、共享待办数、分配数、待审批数 | GET /admin/stats |
| **留存指标** | 次日留存、7日留存、30日留存 | GET /admin/stats/retention |
| **标签指标** | TOP10使用频率、各标签完成率 | GET /admin/stats/tag-usage |
| **通知指标** | 发送成功率、通知效果分析 | GET /admin/stats/notification-rate |
| **时段指标** | 24小时创建分布（近7天）| GET /admin/stats/todo-hourly |
| **同步指标** | 同步操作类型分布 | GET /admin/stats/sync-actions |
| **评论指标** | 总评论数、主评论、回复、今日新增 | GET /admin/comments |

##### 4.20.2 👥 用户管理

**页面**：admin/users, admin/user-detail

**功能**：
- 用户列表（分页、搜索）
- 用户详情（基本信息、待办统计、组合列表）
- 修改用户上限
- 修改用户昵称
- 查看用户待办列表
- 查看用户组合列表

##### 4.20.3 📢 公告管理

**页面**：admin/notices, admin/notice-edit

**功能**：
- 公告列表（CRUD）
- 创建公告（标题+Markdown内容）
- 编辑公告
- 删除公告
- 排序调整

##### 4.20.4 📝 更新日志管理

**页面**：admin/changelog, admin/changelog-edit

**功能**：
- 更新日志列表（CRUD）
- 发布新版本更新内容
- 编辑已有日志
- 删除日志

##### 4.20.5 🗄️ 数据库管理

**功能**：
- 查看所有数据表
- 浏览表数据（分页）
- 直接SQL查询（仅超级管理员）

##### 4.20.6 💬 评论管理

**功能**：
- 查看所有评论
- 删除违规评论
- 按用户/待办筛选

##### 4.20.7 ⚙️ 系统配置

**功能**：
- 查看系统配置
- 修改系统参数
- 全局开关控制

---

## 5. 页面路由与导航

### 5.1 TabBar页面（底部导航）

| 序号 | 页面路径 | Tab名称 | 图标 | 功能描述 |
|-----|---------|---------|------|---------|
| 1 | `/pages/todo/todo` | 待办 | todo.png | 待办列表主页 |
| 2 | `/pages/calendar/calendar` | 日历 | calendar.png | 日历视图 |
| 3 | `/pages/stats/stats` | 统计 | stats.png | 数据统计 |
| 4 | `/pages/more/more` | 更多 | more.png | 功能入口 |

### 5.2 主包页面路由

| 页面路径 | 参数说明 | 跳转来源 | 功能描述 |
|---------|---------|---------|---------|
| `/pages/add-todo/add-todo` | ?comboId=&edit=1&setDate=&setTime=&location=&tags=&voiceText= | Fab按钮/编辑 | 添加/编辑待办 |
| `/pages/todo-detail/todo-detail` | ?id=&sharedTodoId=&comboId=&isShared=&adminView= | 点击待办 | 待办详情 |
| `/pages/todo-search/todo-search` | ?keyword= | 搜索框 | 搜索结果 |
| `/pages/daily-stats/daily-stats` | 无 | 统计页跳转 | 每日统计详情 |
| `/pages/day-todos/day-todos` | ?date= | 日历页点击 | 单日待办列表 |
| `/pages/user-center/user-center` | 无 | 更多页头像 | 用户中心 |
| `/pages/login/login` | 无 | 需要登录时 | 登录页 |
| `/pages/notice/notice` | 无 | 公告栏点击 | 公告列表 |
| `/pages/changelog/changelog` | 无 | 更新提示 | 版本更新日志 |
| `/pages/guide/guide` | 无 | 首次启动 | 新手引导 |

### 5.3 Admin分包路由

| 页面路径 | 参数说明 | 功能描述 |
|---------|---------|---------|
| `/packageAdmin/index/index` | 无 | 管理首页（数据面板）|
| `/packageAdmin/users/users` | 无 | 用户列表 |
| `/packageAdmin/user-detail/user-detail` | ?id=&userId= | 用户详情 |
| `/packageAdmin/notices/notices` | 无 | 公告管理 |
| `/packageAdmin/notice-edit/notice-edit` | ?index= | 编辑公告 |
| `/packageAdmin/changelog/changelog` | 无 | 更新日志管理 |
| `/packageAdmin/changelog-edit/changelog-edit` | ?index= | 编辑更新日志 |

### 5.4 Combo分包路由

| 页面路径 | 参数说明 | 功能描述 |
|---------|---------|---------|
| `/packageCombo/combo-edit/combo-edit` | ?id= | 创建/编辑组合 |
| `/packageCombo/combo-detail/combo-detail` | ?id=&shared=&adminView=&userId= | 组合详情 |
| `/packageCombo/collaboration/collaboration` | ?id=&share=&shareCode=&adminView= | 协作管理 |
| `/packageCombo/combo-stats/combo-stats` | ?id=&shared= | 组合统计 |

### 5.5 Tools分包路由

| 页面路径 | 参数说明 | 功能描述 |
|---------|---------|---------|
| `/packageTools/eating/eating` | 无 | 今天吃什么 |
| `/packageTools/password-generator/password-generator` | 无 | 密码生成器 |
| `/packageTools/motivation/motivation` | 无 | 每日激励 |
| `/packageTools/star/star` | 无 | 收藏夹 |
| `/packageTools/acknowledge/acknowledge` | 无 | 致谢名单 |
| `/packageTools/join-collab/join-collab` | 无 | 加入协作 |
| `/packageTools/trash/trash` | 无 | 回收站 |
| `/packageTools/datamanage/datamanage` | ?isShare=&data= | 数据管理 |
| `/packageTools/tag-manage/tag-manage` | 无 | 标签管理 |

### 5.6 导航模式说明

| 模式 | API | 使用场景 |
|------|-----|---------|
| `wx.navigateTo()` | 保留当前页，跳转到新页 | 大多数页面跳转 |
| `wx.redirectTo()` | 关闭当前页，跳转 | 替换当前页面 |
| `wx.switchTab()` | 跳转到TabBar页面 | 底部导航切换 |
| `wx.reLaunch()` | 关闭所有页面，打开新页 | 登录后跳转首页 |
| `wx.navigateBack()` | 返回上一页 | 返回操作 |

---

## 6. 数据模型

### 6.1 ER关系图（简化版）

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  users   │────<│  todos   │>────│   tags   │
└──────────┘     └────┬─────┘     └──────────┘
                      │
                      │ many-to-many
                      │
               ┌──────┴──────┐
               │ todo_tags   │
               └─────────────┘

┌──────────┐     ┌──────────┐     ┌──────────────┐
│  users   │────<│  combos  │>────│ combo_members│
└──────────┘     └──────────┘     └──────────────┘
                      │
                      │ one-to-many
                      │
               ┌──────┴──────────┐
               │ shared_todos    │
               └──────┬──────────┘
                      │
                      │ one-to-many
                      │
               ┌──────┴──────────────┐
               │ shared_todo_assignments│
               └─────────────────────┘

┌──────────┐     ┌────────────────┐
│  users   │────<│ collab_requests│
└──────────┘     └────────────────┘

┌──────────────┐     ┌──────────────┐
│ shared_todos │>────│   comments   │
└──────────────┘     └──────────────┘
```

### 6.2 核心表结构

#### users 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK | 用户ID |
| openid | VARCHAR(64) | 微信OpenID |
| nickname | VARCHAR(50) | 昵称 |
| avatar_url | VARCHAR(255) | 头像URL |
| todo_limit | INT DEFAULT 100 | 待办上限 |
| combo_limit | INT DEFAULT 10 | 组合上限 |
| collab_limit | INT DEFAULT 5 | 共享组合上限 |
| is_admin | TINYINT DEFAULT 0 | 是否管理员 |
| created_at | DATETIME | 注册时间 |
| last_login_at | DATETIME | 最后登录 |

#### todos 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | VARCHAR(50) PK | 待办ID |
| user_id | INT FK | 所属用户 |
| text | TEXT NOT NULL | 待办内容 |
| set_date | DATE | 日期 |
| set_time | TIME | 时间 |
| remarks | TEXT | 备注 |
| location | JSON | 位置信息 |
| completed | BIGINT DEFAULT 0 | 完成时间戳（0=未完成）|
| is_star | TINYINT DEFAULT 0 | 是否收藏 |
| combo_id | INT FK | 所属组合 |
| images | JSON | 图片附件 |
| version | INT DEFAULT 1 | 版本号 |
| is_deleted | TINYINT DEFAULT 0 | 是否删除 |
| deleted_at | DATETIME | 删除时间 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

#### combos 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK | 组合ID |
| user_id | INT FK | 创建者 |
| name | VARCHAR(50) | 名称 |
| icon | VARCHAR(50) | 图标 |
| color | VARCHAR(10) | 颜色 |
| description | TEXT | 描述 |
| is_shared | TINYINT DEFAULT 0 | 是否共享 |
| share_code | VARCHAR(10) | 邀请码 |
| member_limit | INT DEFAULT 50 | 成员上限 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

#### shared_todos 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK | ID |
| combo_id | INT FK | 所属组合 |
| creator_id | INT FK | 创建者 |
| text | TEXT | 内容 |
| set_date | DATE | 日期 |
| set_time | TIME | 时间 |
| remarks | TEXT | 备注 |
| assign_type | ENUM('all','specific') | 分配类型 |
| tags | JSON | 标签IDs |
| completed_at | BIGINT DEFAULT 0 | 全员完成时间 |
| is_deleted | TINYINT DEFAULT 0 | 是否删除 |
| created_at | DATETIME | 创建时间 |

#### 其他关键表

| 表名 | 用途 | 主要字段 |
|------|------|---------|
| tags | 标签定义 | id, name, color, icon, is_system |
| todo_tags | 待办-标签关联 | todo_id, tag_id |
| combo_members | 组合成员 | combo_id, user_id, role, nickname |
| shared_todo_assignments | 共享待办分配 | shared_todo_id, user_id, completed_at |
| collab_requests | 协作申请 | combo_id, user_id, status, message |
| comments | 评论 | shared_todo_id, user_id, parent_id, content |
| todo_notifications | 待办通知 | todo_id, user_id, notify_time, status |
| sync_logs | 同步日志 | user_id, action, count, result |

---

## 7. API接口清单

### 7.1 接口总览

| 模块 | 前缀 | 接口数量 | 认证要求 |
|------|------|---------|---------|
| 认证 | /auth | 5 | 部分 |
| 待办 | /todos | 11 | ✅ 全部 |
| 标签 | /tags | 4 | ✅ 全部 |
| 组合 | /combos | 7 | ✅ 全部 |
| 协作 | /collab | 14 | ✅ 全部（除qrcode）|
| 通知 | /notify | 13 | ✅ 全部 |
| 配置 | /config | 8 | ❌ 公开 |
| 上传 | /upload | 1 | ✅ 需要 |
| 管理 | /admin | 25+ | ✅ + 管理员 |
| 评论 | /comments | 3 | ✅ 全部 |

**总计**：约 **91个** API接口

### 7.2 核心API详解

#### 7.2.1 认证相关

| 方法 | 路径 | 说明 | 参数 |
|------|------|------|------|
| POST | /auth/login | 微信登录 | { code } |
| GET | /auth/userInfo | 获取用户信息 | - |
| POST | /auth/updateUserInfo | 更新用户信息 | { nickname, ... } |
| POST | /auth/increaseTodoLimit | 增加待办上限 | { amount } |
| POST | /upload/avatar | 上传头像 | multipart/form-data |

#### 7.2.2 待办CRUD

| 方法 | 路径 | 说明 | 参数 |
|------|------|------|------|
| GET | /todos/list | 获取待办列表 | ?page, pageSize, date, completed |
| GET | /todos/:id | 获取待办详情 | - |
| POST | /todos/create | 创建待办 | { text, setDate, setTime, ... } |
| PUT | /todos/:id | 更新待办 | { text, setDate, ... } |
| DELETE | /todos/:id | 删除待办 | - |
| POST | /todos/batch-move | 批量移动到组合 | { todoIds[], comboId } |
| POST | /todos/sync | 增量同步 | { localChanges, localDeletedIds, lastSyncAt } |
| GET | /todos/full-sync | 全量同步 | ?lastSyncAt |
| GET | /todos/deleted | 获取已删除列表 | - |
| POST | /todos/restore/:todoId | 恢复待办 | - |
| DELETE | /todos/permanent/:todoId | 永久删除 | - |

#### 7.2.3 组合管理

| 方法 | 路径 | 说明 | 参数 |
|------|------|------|------|
| GET | /combos/list | 获取组合列表 | - |
| GET | /combos/:id | 获取组合详情 | - |
| POST | /combos/create | 创建组合 | { name, icon, color, is_shared, ... } |
| PUT | /combos/:id | 更新组合 | { name, icon, color, ... } |
| DELETE | /combos/:id | 删除组合 | ?action |
| GET | /combos/:id/members | 获取成员列表 | - |
| PUT | /combos/:comboId/members/:userId/role | 设置成员角色 | { role } |

#### 7.2.4 协作功能

| 方法 | 路径 | 说明 | 参数 |
|------|------|------|------|
| POST | /collab/join | 加入组合（需审批）| { shareCode } |
| POST | /collab/auto-join | 自动加入 | { shareCode } |
| POST | /collab/request | 发送申请 | { shareCode, message } |
| GET | /collab/requests | 获取申请列表 | ?comboId |
| POST | /collab/requests/:id/approve | 批准申请 | - |
| POST | /collab/requests/:id/reject | 拒绝申请 | - |
| GET | /collab/shared | 获取共享组合列表 | - |
| POST | /collab/shared/:comboId/todos | 创建共享待办 | { text, assignType, ... } |
| PUT | /collab/shared/:comboId/todos/:todoId | 更新共享待办 | { text, ... } |
| PUT | /collab/shared/:comboId/todos/:todoId/complete | 完成共享待办 | { completed } |
| DELETE | /collab/shared/:comboId/todos/:todoId | 删除共享待办 | - |
| DELETE | /collab/member | 移除成员 | { comboId, userId } |
| POST | /collab/leave | 退出组合 | { comboId, transferToUserId } |
| GET | /collab/qrcode | 获取二维码 | ?shareCode, auto, token |

#### 7.2.5 公开接口（无需认证）

| 方法 | 路径 | 说明 | 返回数据 |
|------|------|------|---------|
| GET | /config/updates | 获取更新日志 | changelogList[] |
| GET | /config/notices | 获取公告列表 | notices[] |
| GET | /config/app | 获取应用配置 | { changelogList, notices } |
| GET | /config/guides | 获取引导页列表 | guides[] |
| GET | /config/public-stats | 公开统计数据 | { stats } |
| GET | /config/public-tags | 公开标签列表 | { tags[] } |
| GET | /config/public-users | 公开用户列表 | { users[], total } |
| GET | /config/public-stats/hourly | 时段分布统计 | { hourlyDistribution } |

---

## 8. 权限体系

### 8.1 认证机制

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   微信客户端  │────>│   后端服务器  │────>│   MySQL     │
│             │     │             │     │             │
│ wx.login()  │     │ code→openid │     │ 存储用户数据  │
│ 获取code    │     │ 生成JWT     │     │             │
│             │     │ 返回token   │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  前端存储token │
                    │  每次请求携带   │
                    │ Authorization │
                    └─────────────┘
```

### 8.2 角色权限矩阵

| 功能 | 游客 | 普通用户 | 组合成员 | 管理员 | 超管 |
|------|------|---------|---------|--------|------|
| 查看待办列表 | ✅（本地）| ✅ | ✅ | ✅ | ✅ |
| 创建待办 | ❌ | ✅（≤limit）| ✅ | ✅ | ✅ |
| 编辑待办 | ❌ | ✅（自己的）| ✅ | ✅ | ✅ |
| 删除待办 | ❌ | ✅（自己的）| ✅ | ✅ | ✅ |
| 创建组合 | ❌ | ✅（≤limit）| - | ✅ | ✅ |
| 共享组合 | ❌ | ✅ | - | ✅ | ✅ |
| 管理成员 | ❌ | ❌ | ❌ | ✅ | ✅ |
| 创建共享待办 | ❌ | ❌ | ✅ | ✅ | ✅ |
| 审批申请 | ❌ | ❌ | ❌ | ✅ | ✅ |
| 管理公告 | ❌ | ❌ | ❌ | ❌ | ✅ |
| 查看统计数据 | ❌ | ✅（自己的）| ✅ | ✅ | ✅ |
| 管理用户 | ❌ | ❌ | ❌ | ❌ | ✅ |

### 8.3 中间件链

```javascript
// 1. 请求日志中间件（所有路由）
requestLogger

// 2. 认证中间件（受保护路由）
authMiddleware → 验证JWT → 注入req.user

// 3. 管理员中间件（管理路由）
isAdmin → 检查user.is_admin === true
```

---

## 9. 第三方集成

### 9.1 微信服务

| 服务 | 用途 | 配置 |
|------|------|------|
| 微信登录 | 用户身份认证 | AppID, AppSecret |
| 同声传译 | 语音识别 | Plugin: wx069ba97219f66d99 |
| 订阅消息 | 待办提醒推送 | TemplateID x 2 |
| 二维码 | 协作邀请码 | getUnlimitedQRCode |
| 地理位置 | 位置选择/导航 | chooseLocation, openLocation |

### 9.2 天气服务

| 服务 | 提供商 | 用途 |
|------|--------|------|
| 天气API | 心知天气 | 首页天气卡片展示 |

**配置**：API Key = `SdnJZGqS_c7zVlCnj`

### 9.3 UI组件库

| 库名 | 版本 | 用途 |
|------|------|------|
| tdesign-miniprogram | latest | 全套UI组件 |
| @lspriv/wx-calendar | latest | 高级日历组件 |
| ec-canvas (echarts) | latest | 图表可视化 |
| weui | extended | 补充UI组件 |

---

## 10. 业务流程

### 10.1 待办完整生命周期

```
创建 → 编辑 → （设置提醒）→ 完成/未完成 → 删除 → 回收站 → 恢复/永久删除
  │                                                        │
  ├─► 分配标签                                            ├─► 超过30天自动清理
  ├─► 归入组合                                            │
  ├─► 添加位置                                            │
  ├─► 上传图片                                            │
  ├─► 收藏标记                                            │
  └─► 设置提醒（订阅消息）
```

### 10.2 协作完整流程

```
[超管] 创建共享组合
    ↓
生成邀请码/二维码
    ↓
[用户] 通过邀请码/扫码/链接加入
    ↓
    ├─► 自动加入（无需审批）
    │       ↓
    │   成为成员，可查看/完成待办
    │
    └─► 申请加入（需审批）
            ↓
    [管理员] 审批申请
            ↓
        ├─► 通过 → 成为成员
        └─→ 拒绝 → 结束
    
    ↓
[管理员/超管] 创建共享待办
    ↓
分配待办（全员/指定成员）
    ↓
[成员] 完成待办
    ↓
[全员完成后] 任务达成 ✓
```

### 10.3 数据同步流程

```
应用启动（onLaunch）
    ↓
检查本地是否有token（已登录？）
    ↓
是 → 调用 autoSyncToCloud()
        ↓
    收集本地变更（newTodos, updatedTodos, deletedIds）
        ↓
    POST /todos/sync { localChanges, localDeletedIds, lastSyncAt }
        ↓
    服务端返回 { remoteChanges, conflicts }
        ↓
    合并远程变更到本地（解决冲突）
        ↓
    更新 lastSyncAt
        ↓
    更新日历缓存 updateCalendarCache()
        ↓
    更新UI显示
```

### 10.4 用户首次使用流程

```
打开小程序
    ↓
显示引导页（guide）
    ↓
进入首页（todo）
    ↓
初始化示例待办（首次）
    ↓
显示天气卡片
    ↓
显示最新公告
    ↓
[可选] 提示登录
    ↓
[用户点击登录]
    ↓
微信授权 → 获取用户信息
    ↓
进入完整功能模式
```

---

## 11. 网页版开发建议

### 11.1 技术选型建议

| 维度 | 推荐方案 | 备选方案 |
|------|---------|---------|
| **前端框架** | React 18 + TypeScript | Vue 3 + TypeScript |
| **UI组件库** | Ant Design 5 | Element Plus |
| **状态管理** | Zustand / Jotai | Pinia (Vue) |
| **路由** | React Router v6 | Vue Router |
| **图表** | ECharts for Web | Chart.js / Recharts |
| **日历** | FullCalendar / react-big-calendar | Ant Design Calendar |
| **HTTP客户端** | Axios | ky / fetch封装 |
| **认证** | JWT + localStorage/cookie | OAuth2.0 |
| **实时通信** | WebSocket（协作功能）| Socket.io |
| **地图** | 高德地图JS API / 百度地图 | Leaflet (开源) |
| **部署** | Vercel / Netlify | 自建服务器 + Nginx |

### 11.2 功能实现优先级

#### Phase 1：MVP核心功能（必做）

- [ ] 用户系统（邮箱/手机号登录替代微信登录）
- [ ] 待办CRUD（增删改查）
- [ ] 标签系统
- [ ] 组合管理（私有组合）
- [ ] 日历视图
- [ ] 基础统计（完成率、趋势图）
- [ ] 云端同步
- [ ] 搜索功能
- [ ] 数据导入导出
- [ ] 回收站

#### Phase 2：增强功能（建议做）

- [ ] 位置信息（Web Geolocation API + 地图SDK）
- [ ] 通知提醒（Web Push Notification / Email）
- [ ] 协作功能（共享组合 + 成员管理）
- [ ] 评论功能
- [ ] 收藏功能
- [ ] 高级统计（更多图表）
- [ ] 公告系统
- [ ] 版本更新检测

#### Phase 3：锦上添花（可选）

- [ ] 工具集（密码生成器、今天吃什么等）
- [ ] AI助手（接入ChatGPT/Claude API）
- [ ] 语音识别（Web Speech API）
- [ ] 每日激励
- [ ] 管理后台
- [ ] PWA支持（离线使用）

### 11.3 关键适配要点

#### 11.3.1 认证系统改造

**小程序现状**：
- 微信登录（wx.login → code → JWT）

**网页版方案**：
```
方案A：传统账号密码
├── 手机号+验证码登录
├── 邮箱+密码登录
└── 第三方登录（GitHub/Google）

方案B：OAuth2.0
├── 授权码模式
├── 支持多种Identity Provider
└── 与小程序账号互通（通过unionID）
```

#### 11.3.2 通知系统改造

**小程序现状**：
- 微信订阅消息（用户主动订阅）

**网页版方案**：
```
┌─────────────────┬──────────────────┬─────────────────┐
│   Web Push API  │   Email通知      │   站内通知       │
│   浏览器推送     │   SMTP发送       │   实时WebSocket  │
│   需用户授权    │   需用户提供邮箱  │   在线即时送达   │
└─────────────────┴──────────────────┴─────────────────┘
```

#### 11.3.3 地图功能适配

**小程序现状**：
- 微信内置地图（chooseLocation/openLocation）

**网页版方案**：
```
推荐：高德地图 JS API（国内）
备选：
├── 百度地图 JS API
├── 腾讯地图 JS API
└── Leaflet + OpenStreetMap（开源免费）
```

#### 11.3.4 文件上传改造

**小程序现状**：
- wx.chooseImage → wx.uploadFile

**网页版方案**：
```
<input type="file" accept="image/*">
    ↓
FormData + Axios/Fetch
    ↓
后端 multer 接收（兼容）
```

#### 11.3.5 二维码功能适配

**小程序现状**：
- 微信小程序码（getUnlimitedQRCode）

**网页版方案**：
```
┌─────────────────┬──────────────────┐
│   qrcode.js     │   服务端生成      │
│   前端生成       │   返回图片URL     │
│   无需API调用    │   可缓存优化      │
└─────────────────┴──────────────────┘
```

### 11.4 数据库兼容性

现有MySQL数据库可直接复用，建议：

1. **新增用户表字段**：
   ```sql
   ALTER TABLE users ADD COLUMN email VARCHAR(128);
   ALTER TABLE users ADD COLUMN phone VARCHAR(20);
   ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);
   ALTER TABLE users ADD COLUMN login_type ENUM('wechat','email','phone');
   ```

2. **新增sessions表**（Web session管理）：
   ```sql
   CREATE TABLE sessions (
     id VARCHAR(128) PRIMARY KEY,
     user_id INT NOT NULL,
     expires_at DATETIME NOT NULL,
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (user_id) REFERENCES users(id)
   );
   ```

3. **新增notifications_log表**（Web推送记录）：
   ```sql
   CREATE TABLE web_push_notifications (
     id INT AUTO_INCREMENT PRIMARY KEY,
     user_id INT NOT NULL,
     title VARCHAR(100),
     body TEXT,
     payload JSON,
     sent_at DATETIME,
     status ENUM('pending','sent','failed'),
     FOREIGN KEY (user_id) REFERENCES users(id)
   );
   ```

### 11.5 API兼容层

建议在现有API基础上增加Web适配层：

```javascript
// 方案1：统一API（推荐）
// 前端根据平台自动选择认证方式

// api.ts
const authApi = {
  // 小程序
  wechatLogin: (code) => request({ url: '/auth/wechat-login', method: 'POST', data: { code }}),
  
  // Web
  emailLogin: (email, password) => request({ url: '/auth/email-login', method: 'POST', data: { email, password }}),
  phoneLogin: (phone, code) => request({ url: '/auth/phone-login', method: 'POST', data: { phone, code }}),
};
```

### 11.6 性能优化建议

| 优化点 | 小程序方案 | Web版方案 |
|-------|----------|----------|
| **列表虚拟化** | 无（原生性能好）| react-window / vue-virtual-scroller |
| **图片懒加载** | wxs懒加载 | Intersection Observer / loading="lazy" |
| **代码分割** | 小程序分包 | React.lazy / dynamic import |
| **缓存策略** | wx.setStorageSync | IndexedDB / localStorage |
| **离线支持** | 原生离线 | Service Worker + Cache API |
| **SSR/SSG** | 不适用 | Next.js / Nuxt.js（SEO需求时）|

### 11.7 安全加固建议

| 安全项 | 建议 |
|-------|------|
| **XSS防护** | DOMPurify + CSP头 |
| **CSRF防护** | SameSite Cookie + CSRF Token |
| **Rate Limiting** | express-rate-limit（API限流）|
| **输入验证** | Joi / Zod schema验证 |
| **SQL注入** | 已使用参数化查询（保持）|
| **HTTPS** | 强制HTTPS（Let's Encrypt）|
| **CORS** | 严格配置Allowed Origins |
| **Helmet.js** | 安全响应头设置 |

---

## 附录

### A. 环境变量清单

```env
# 数据库
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=timegreen_todo
DB_USER=root
DB_PASSWORD=your_password

# 服务器
PORT=3000
BASE_URL=https://api.yzjtiantian.cn

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# 微信小程序
WECHAT_APP_ID=your_app_id
WECHAT_APP_SECRET=your_app_secret

# 心知天气
WEATHER_API_KEY=SdnJZGqS_c7zVlCnj

# 其他
NODE_ENV=production
```

### B. 错误码规范

| HTTP状态码 | 业务含义 | 处理建议 |
|-----------|---------|---------|
| 200 | 成功 | 正常处理 |
| 400 | 请求参数错误 | 检查参数格式 |
| 401 | 未登录/Token过期 | 跳转登录页 |
| 403 | 无权限 | 提示权限不足 |
| 404 | 资源不存在 | 提示资源不存在 |
| 500 | 服务器错误 | 显示友好错误页 |

### C. 常用工具函数

```javascript
// utils/util.js
formatFriendlyDate(dateStr)    // 友好日期格式化（今天/昨天/明天）
formatDateTime(timestamp)     // 完整日期时间格式化
generateTodoId()              // 生成唯一待办ID

// utils/sync.js
syncOnAppStart()              // 应用启动时同步
loginWithCode(code)           // 微信登录
autoSyncToCloud()             // 自动同步到云端
incrementalSync()             // 增量同步
fullSyncFromCloud()           // 全量同步
checkSyncDiff()               // 检测同步差异
updateCalendarCache(todos)    // 更新日历缓存
```

---

## 文档维护信息

| 版本 | 日期 | 作者 | 更新内容 |
|------|------|------|---------|
| 1.0.0 | 2026-04-05 | AI Assistant | 初始版本，完整功能架构提取 |

---

> **文档用途**：本文档用于指导网页版开发，确保功能完整性。开发过程中如发现小程序有新增功能，请及时同步更新本文档。

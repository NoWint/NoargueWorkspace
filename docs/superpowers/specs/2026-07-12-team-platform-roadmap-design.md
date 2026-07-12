# P1 总体路线图
## 时光绿径待办 → 团队协作 Workspace 平台演进

> **文档类型**：高层路线图（High-level Roadmap）
> **创建日期**：2026-07-12
> **范围说明**：本文档仅描述高层架构策略、6 个子项目的顺序与依赖、里程碑规划与未决问题。各子项目的详细 spec 将在后续单独 brainstorm 中产出。
> **关联审查**：基于 2026-07-12 对现有代码库的全面审查（现状评估达成度约 30-35%）。

---

## 1. 执行摘要

将「时光绿径待办」从**个人待办应用 + 单层共享组合**演进为**以 Workspace 为核心的团队协作平台**。采用**新平台并行**策略：保留现有微信小程序作为"个人版"，新建独立的"团队版"平台，复用并扩展后端，前端重写。改造分 6 个子项目，按依赖顺序推进，预计 5 个里程碑节点交付。

---

## 2. 架构策略：新平台并行

### 2.1 决策

| 维度 | 个人版（现有） | 团队版（新建） |
|------|--------------|--------------|
| **产品定位** | 个人待办管理 | 团队协作 Workspace 平台 |
| **前端形态** | 微信小程序（保留） | 待定（见未决问题 Q1） |
| **后端** | 现有 Express 服务（保留） | 扩展现有后端，新增 Workspace/Project/RBAC 等模块 |
| **数据库** | 现有 schema（保留） | 同库新增表，与现有表通过 user_id 关联 |
| **用户体系** | 现有微信登录 | 复用现有用户体系（见未决问题 Q2） |
| **代码仓库** | 现有仓库 | 同仓库新目录 或 独立仓库（见未决问题 Q3） |

### 2.2 理由

- **零风险保个人版**：现有小程序已上线且有用户，新平台并行可避免改造期间影响线上稳定性
- **架构干净**：新平台从零设计 Workspace/Project/RBAC，无历史包袱，无需为兼容旧组合逻辑做妥协
- **复用后端投资**：现有后端已有 19 个路由模块、认证体系、同步机制，可扩展而非重写
- **产品定位清晰**：个人版聚焦轻量待办，团队版聚焦团队协作，避免功能堆砌导致定位模糊

### 2.3 后端扩展原则

- 现有 `/auth`、`/todos`、`/combos`、`/collab` 等 API **保持不变**，个人版继续使用
- 新增 `/workspaces`、`/projects`、`/rbac`、`/documents`、`/attachments`、`/milestones`、`/activity` 等 API 命名空间
- 共用 `users` 表与认证中间件，但权限校验独立
- 数据库迁移继续编号（从 032 起），不修改已有表结构

---

## 3. 子项目分解

### P1 — Workspace 基础架构（主干起点）

**目标**：建立 Workspace 作为团队协作的顶层容器。

**核心交付**：
- `workspaces` 表（id, name, slug, owner_id, plan, created_at）
- `workspace_members` 表（workspace_id, user_id, role, joined_at）
- Workspace CRUD API + 成员管理 API
- 前端 Workspace 切换器（用户可同时属于多个 Workspace）
- 现有用户首次进入团队版时，引导创建首个 Workspace

**依赖**：无（基础设施）

**关键决策点**（留待 P1 详细 spec）：
- Workspace 是否有 slug/自定义域名？
- 免费 vs 付费 Plan 字段是否预留？
- Workspace 级成员角色与后续 RBAC 的关系？

---

### P2 — RBAC 权限系统重构

**目标**：将硬编码角色判断重构为真正的 RBAC，支持细粒度权限扩展。

**核心交付**：
- `permissions` 表（code, name, module, description）— 权限点字典
- `roles` 表（workspace_id, code, name, is_system）— 角色（系统预设 + 自定义）
- `role_permissions` 关联表（role_id, permission_id）
- `user_roles` 关联表（workspace_id, user_id, role_id）
- 权限校验中间件：基于 permission code 而非 role name
- 预设角色：workspace_owner / workspace_admin / project_admin / member / viewer
- 预设权限点：约 30-50 个（覆盖 workspace/project/todo/document/member/invite 等操作）

**依赖**：P1

**关键决策点**：
- 是否支持项目级角色覆盖 Workspace 级角色？
- 权限粒度：操作级（create_todo）还是资源级（todo:write）？
- 是否支持自定义角色（用户创建角色并分配权限）？

---

### P3 — Project 项目管理

**目标**：在 Workspace 下引入 Project 实体，作为任务与资源的组织单元。

**核心交付**：
- `projects` 表（workspace_id, name, key, description, status, lead_id, created_at）
- `project_members` 表（project_id, user_id, role_id）
- Project CRUD API + 成员管理 API
- 项目空间前端页面（项目列表、项目详情、项目设置）
- **关键决策**：现有"组合（combo）"是否可迁移为 Project？（见未决问题 Q4）
- 任务（todo）关联到 Project（新增 `project_id` 字段或新表）

**依赖**：P1, P2

**关键决策点**：
- Project 与现有 combo 的关系：替代 / 并存 / 升级？
- 一个任务是否可属于多个 Project？
- Project key（如 PROJ-123）是否用于任务编号？

---

### P4 — 知识资源体系

**目标**：引入文档、附件、里程碑、日程等独立资源，建立资源间关联。

**核心交付**：
- `documents` 表（project_id, title, content, type, created_by, updated_at）— 富文本文档
- `attachments` 表（attached_to_type, attached_to_id, file_url, file_name, size）— 多态附件
- `milestones` 表（project_id, name, due_date, status）
- `schedules` 表（workspace_id/project_id, title, start_at, end_at, attendee_ids）
- `task_links` 表（source_type, source_id, target_type, target_id, link_type）— 通用资源关联
- 任务-文档、任务-附件、任务-里程碑、任务-日程关联
- 文档编辑器前端（富文本或 Markdown）

**依赖**：P3

**关键决策点**：
- 文档编辑器选型（富文本 vs Markdown vs 块编辑器）？
- 附件存储：对象存储 vs 数据库 vs 第三方？
- 资源关联是通用多态表还是每种关联独立表？

---

### P5 — 团队协作中枢

**目标**：补齐团队级协作模块，建立工作活动流。

**核心交付**：
- `announcements` 表（workspace_id/project_id, content, created_by, pinned）— 团队级公告
- `activity_logs` 表（workspace_id, user_id, action, resource_type, resource_id, metadata, created_at）— 工作活动流
- 活动流 feed API（支持按 workspace/project/user/时间范围过滤）
- 任务评论 @提及能力（扩展现有 commentController）
- 团队日程视图（基于 schedules 表，非个人日历）
- 统一通知中心（聚合现有通知 + 团队通知）

**依赖**：P1, P3（P4 可并行）

**关键决策点**：
- 活动流记录粒度（每次操作 vs 聚合）？
- @提及的解析与通知机制？
- 通知中心是否替换现有微信订阅消息？

---

### P6 — 统一视图与导航

**目标**：整合所有模块，提供一致的团队协作用户体验。

**核心交付**：
- 顶层导航：Workspace 切换器 + 全局搜索 + 通知中心 + 用户菜单
- 项目空间首页：项目概览（任务、文档、里程碑、活动聚合）
- 知识库浏览：文档树 + 搜索 + 标签
- 个人工作台：我的任务、我的日程、@我的、我参与的
- 跨项目视图：所有项目的任务看板、所有文档搜索
- 移动端适配（若前端非小程序）

**依赖**：P1-P5（收尾整合）

**关键决策点**：
- 信息架构：Workspace > Project > 资源 三级导航如何设计？
- 是否需要仪表盘可定制？
- 全局搜索的索引与性能？

---

## 4. 依赖关系与执行顺序

### 4.1 依赖图

```
                  ┌─────────────────────────────────────────────────┐
                  │                                                 │
                  ▼                                                 │
P1 (Workspace) ──┬──> P2 (RBAC) ──┐                                │
                 │                 ├──> P3 (Project) ──┬──> P4 (知识) ──┤
                 │                 │                   │              │
                 └─────────────────┴───────────────────┴──> P5 (协作) ─┤
                                                                     │
                                                                     ▼
                                                              P6 (统一视图)
                                                              [收尾整合]
```

### 4.2 关键路径（最长依赖链）

**P1 → P2 → P3 → P4 → P6**（5 个子项目串行）

### 4.3 并行机会

- P5 可在 P3 完成后启动，与 P4 并行
- P6 的子模块（如个人工作台）可在 P3 完成后启动原型，P4/P5 完成后整合

### 4.4 推荐执行批次

| 批次 | 子项目 | 说明 |
|------|--------|------|
| 第 1 批 | P1, P2 | 基础架构 + 权限，紧密耦合，建议连续做 |
| 第 2 批 | P3 | 项目管理是后续所有资源体系的容器 |
| 第 3 批 | P4, P5（并行） | 知识资源与协作中枢可并行推进 |
| 第 4 批 | P6 | 收尾整合，依赖前 5 个全部完成 |

---

## 5. 里程碑规划

> 时间为占位符，实际时长待各子项目 spec 产出后估算。此处仅表示相对顺序与依赖。

| 里程碑 | 完成标志 | 交付物 |
|--------|---------|--------|
| **M0: 架构就绪** | 新平台脚手架搭建完成，后端新增模块目录结构，CI/CD 流水线就绪 | 空壳可运行的新平台 + 后端模块骨架 |
| **M1: Workspace + RBAC 可用** | P1 + P2 完成，用户可创建 Workspace、邀请成员、分配角色、按权限访问 | 可内部 dogfood 的 Workspace 基础版 |
| **M2: 项目管理 MVP** | P3 完成，可创建项目、管理项目成员、任务关联项目 | 可用于真实项目管理的最小可用版 |
| **M3: 知识体系** | P4 完成，可创建文档、上传附件、设置里程碑、关联资源 | 项目知识库可用 |
| **M4: 协作中枢** | P5 完成，团队公告、活动流、@提及、团队日程可用 | 团队协作闭环 |
| **M5: 统一视图与发布** | P6 完成，整体 UX 打磨，对外发布 | 团队版正式上线 |

---

## 6. 风险与未决问题

### 6.1 关键风险

| 风险 | 影响 | 缓解 |
|------|------|------|
| **范围蔓延** | 6 个子项目每个都可能膨胀 | 严格执行"每个子项目单独 brainstorm + spec"，YAGNI |
| **双平台维护成本** | 个人版 + 团队版两套代码 | 共用后端、共用组件库、明确产品边界 |
| **RBAC 设计过度** | 权限点过多导致配置复杂 | 初期仅预设角色，自定义角色延后 |
| **数据迁移** | 现有共享组合数据是否迁移到新平台 | 待 Q4 决策 |
| **新平台前端选型** | 选错技术栈导致重写 | Q1 必须在 M0 前定夺 |

### 6.2 待后续 spec 解决的未决问题

| # | 问题 | 影响范围 | 何时决策 |
|---|------|---------|---------|
| **Q1** | 新平台前端形态：Web (React/Next)？新微信小程序？Tauri 桌面端？多端？ | M0 启动前 | 立即 |
| **Q2** | 用户体系：个人版与团队版是否共用同一用户账号？微信扫码登录是否复用？ | P1 spec | M0 前 |
| **Q3** | 代码仓库：同仓库新目录（如 `/team-app`）还是独立仓库？ | M0 启动前 | 立即 |
| **Q4** | 现有"组合"数据是否迁移为 Project？还是新平台从空开始？ | P3 spec | M2 前 |
| **Q5** | 文档编辑器选型：富文本（TipTap/Lexical）vs Markdown vs 块编辑器（Notion-like）？ | P4 spec | M3 前 |
| **Q6** | 附件存储方案：自建对象存储 vs 阿里云 OSS vs 腾讯云 COS？ | P4 spec | M3 前 |
| **Q7** | 活动流存储与查询：关系数据库 vs 时序库 vs ES？ | P5 spec | M4 前 |
| **Q8** | 团队版商业模式：免费 vs 订阅 vs 按席位？影响 Plan 字段设计 | P1 spec | M1 前 |

---

## 7. 后续步骤

1. **立即**：解决 Q1（前端形态）与 Q3（仓库策略）——这两个决策阻塞 M0 启动
2. **M0 前**：解决 Q2（用户体系）、Q8（商业模式）——影响 P1 spec
3. **进入 P1 详细 brainstorm**：对 Workspace 基础架构做完整 spec（含数据模型、API 设计、前端关键页面）
4. **P1 spec 通过后**：调用 writing-plans 技能生成 P1 实现计划
5. **按批次推进**：P1+P2 → P3 → P4‖P5 → P6

---

## 8. 文档元信息

- **本文件性质**：高层路线图，非实现 spec
- **下一步**：针对每个子项目（推荐从 P1 起）单独进入 brainstorm 流程，产出详细 spec
- **审查基础**：2026-07-12 对 /Users/xiatian/Desktop/NoArgue 代码库的全面审查
- **约束遵守**：本路线图制定过程未修改任何现有代码或文件，仅新增本 spec 文档

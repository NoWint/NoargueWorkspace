# Tasks

## Phase 1: 数据模型升级

- [x] Task 1: 更新数据库表结构
  - [x] SubTask 1.1: 添加 `version`, `is_deleted`, `updated_at`, `deleted_at` 字段到 todos 表
  - [x] SubTask 1.2: 编写数据迁移脚本，初始化现有数据的新字段
  - [x] SubTask 1.3: 更新后端 todoController.js 中的 CRUD 操作，自动维护 version 和 updated_at

- [x] Task 2: 更新前端数据模型
  - [x] SubTask 2.1: 修改待办创建逻辑，生成唯一 ID 和初始化 version
  - [x] SubTask 2.2: 修改待办更新逻辑，自动递增 version 和更新 updatedAt
  - [x] SubTask 2.3: 修改待办删除逻辑，改为软删除（设置 isDeleted = true）

## Phase 2: 增量同步 API

- [x] Task 3: 实现后端增量同步 API
  - [x] SubTask 3.1: 创建 POST /todos/sync 接口，接收 localChanges 和 localDeletedIds
  - [x] SubTask 3.2: 实现冲突检测逻辑（比较 updatedAt 和 version）
  - [x] SubTask 3.3: 实现冲突解决逻辑（最后修改优先策略）
  - [x] SubTask 3.4: 返回 cloudChanges 和 cloudDeletedIds

- [x] Task 4: 实现前端增量同步逻辑
  - [x] SubTask 4.1: 重构 sync.js，实现 getLocalChanges() 获取本地变更
  - [x] SubTask 4.2: 实现 incrementalSync() 调用新 API
  - [x] SubTask 4.3: 实现 mergeChanges() 合并云端变更到本地
  - [x] SubTask 4.4: 处理删除同步，同步云端删除到本地

## Phase 3: 删除同步机制

- [x] Task 5: 实现软删除同步
  - [x] SubTask 5.1: 前端删除操作改为设置 isDeleted = true
  - [x] SubTask 5.2: 同步时传递已删除的待办 ID 列表
  - [x] SubTask 5.3: 接收方根据 deletedAt 决定是否同步删除
  - [x] SubTask 5.4: 列表展示时过滤 isDeleted = true 的待办

- [ ] Task 6: 实现定期清理
  - [ ] SubTask 6.1: 后端添加定时任务，清理 30 天前的已删除数据
  - [ ] SubTask 6.2: 前端添加清理逻辑，同步后删除本地已同步的删除记录

## Phase 4: 同步状态 UI

- [x] Task 7: 添加同步状态展示
  - [x] SubTask 7.1: 在 todo 页面顶部添加同步状态指示器
  - [x] SubTask 7.2: 实现同步中/成功/失败/离线等状态展示
  - [x] SubTask 7.3: 添加手动同步按钮（下拉刷新或点击状态栏）
  - [x] SubTask 7.4: 同步失败时提供重试入口

## Phase 5: 首次同步与全量同步

- [x] Task 8: 完善首次同步逻辑
  - [x] SubTask 8.1: 检测首次登录场景（本地无数据 + 云端有数据）
  - [x] SubTask 8.2: 实现全量下载逻辑
  - [x] SubTask 8.3: 实现全量上传逻辑
  - [x] SubTask 8.4: 实现双向合并逻辑

## Phase 6: 测试与优化

- [ ] Task 9: 编写测试用例
  - [ ] SubTask 9.1: 测试首次同步场景
  - [ ] SubTask 9.2: 测试增量同步场景
  - [ ] SubTask 9.3: 测试冲突解决场景
  - [ ] SubTask 9.4: 测试删除同步场景
  - [ ] SubTask 9.5: 测试离线后同步场景

- [ ] Task 10: 性能优化
  - [ ] SubTask 10.1: 添加同步锁，防止并发同步
  - [ ] SubTask 10.2: 实现分批同步，大数据量时优化性能
  - [ ] SubTask 10.3: 添加同步节流，避免频繁同步

# Task Dependencies

- [Task 3] depends on [Task 1]
- [Task 4] depends on [Task 2, Task 3]
- [Task 5] depends on [Task 2]
- [Task 7] depends on [Task 4]
- [Task 8] depends on [Task 4]
- [Task 9] depends on [Task 1-8]
- [Task 10] depends on [Task 9]

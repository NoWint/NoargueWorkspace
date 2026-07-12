# 个人待办云端同步规划书

## Why

当前同步机制存在以下问题：
1. **冲突处理缺失**：同一待办在多设备修改时，后上传的会覆盖先上传的，无合并策略
2. **删除不同步**：本地删除的待办无法同步到云端，云端删除的待办无法同步到本地
3. **增量同步不完善**：`lastSyncAt` 字段未真正用于增量同步，每次都是全量对比
4. **数据一致性风险**：仅用 `time` 字段判断唯一性，可能产生重复或遗漏

## What Changes

- 新增待办版本号机制（`version` 字段）
- 新增软删除标记（`isDeleted` 字段）
- 新增最后修改时间（`updatedAt` 字段）
- 实现增量同步 API
- 实现冲突检测与合并策略
- 实现删除同步机制
- 前端同步状态 UI 展示

## Impact

- Affected code: `utils/sync.js`, `backend/controllers/todoController.js`, `backend/database.sql`
- Affected pages: `pages/todo/todo.js`, `pages/more/more.js`

---

## 数据模型变更

### 新增字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `version` | Integer | 版本号，每次修改 +1，用于冲突检测 |
| `isDeleted` | Boolean | 软删除标记，true 表示已删除 |
| `updatedAt` | Timestamp | 最后修改时间，用于增量同步 |
| `deletedAt` | Timestamp | 删除时间，用于同步删除操作 |

### 完整待办数据结构

```javascript
{
  id: 'uuid',              // 全局唯一标识（新增）
  text: '待办内容',
  setDate: '2025-04-03',
  setTime: '14:30',
  remarks: '备注',
  location: { name, address, latitude, longitude },
  completed: false,        // false 或完成时间戳
  isStar: false,
  time: 1768585225477,     // 创建时间戳
  tags: [1, 2],
  comboId: 'combo_123',
  version: 1,              // 版本号（新增）
  isDeleted: false,        // 软删除标记（新增）
  updatedAt: 1768585225477,// 最后修改时间（新增）
  deletedAt: null          // 删除时间（新增）
}
```

---

## 同步场景分析

### 场景一：首次同步（新设备登录）

**条件**：本地无数据，云端有数据；或本地有数据，云端无数据

**策略**：
- 本地无数据 → 从云端全量下载
- 云端无数据 → 将本地数据全量上传
- 两边都有数据 → 执行合并同步

**流程**：
```
1. 检查本地数据量
2. 检查云端数据量
3. 根据条件选择策略：
   - 本地空：downloadAll()
   - 云端空：uploadAll()
   - 都有数据：mergeSync()
```

### 场景二：增量同步（正常使用）

**条件**：上次同步后，本地或云端有新增/修改/删除

**策略**：基于 `lastSyncAt` 时间戳，只同步变更的数据

**流程**：
```
1. 获取 lastSyncAt
2. 上传本地变更（updatedAt > lastSyncAt）
3. 下载云端变更（updatedAt > lastSyncAt）
4. 合并变更
5. 更新 lastSyncAt
```

### 场景三：冲突处理（同一待办多端修改）

**条件**：同一待办在两个设备上都被修改，且都未同步

**策略**：基于版本号的三种策略

#### 策略 A：最后修改优先（推荐）
- 比较 `updatedAt`，保留最新的修改
- 简单高效，适合大多数场景

#### 策略 B：版本号优先
- 比较 `version`，版本号大的覆盖小的
- 需要严格的版本控制

#### 策略 C：用户选择
- 检测到冲突时提示用户选择
- 体验好但实现复杂

**推荐采用策略 A**，并在检测到潜在冲突时记录日志。

### 场景四：删除同步

**条件**：本地或云端删除了待办

**策略**：软删除 + 墓碑机制

**流程**：
```
1. 删除操作不真正删除，而是标记 isDeleted = true
2. 同步时传递已删除的待办 ID 列表
3. 接收方根据 deletedAt 时间戳决定是否同步删除
4. 定期清理超过 30 天的已删除数据
```

### 场景五：离线操作后同步

**条件**：设备离线期间有操作，恢复网络后同步

**策略**：
- 本地记录所有操作的日志
- 恢复网络后按顺序重放操作
- 遇到冲突时按场景三处理

---

## 冲突解决方案详细设计

### 冲突类型

| 冲突类型 | 描述 | 解决方案 |
|---------|------|---------|
| 更新-更新 | 两端都修改了同一待办 | 保留 updatedAt 更大的 |
| 更新-删除 | 一端修改，另一端删除 | 保留删除操作（删除优先） |
| 删除-删除 | 两端都删除 | 无冲突，保持删除 |
| 新增-新增 | 两端新增了相同 time 的待办 | 合并为一条，取 updatedAt 更大的 |

### 冲突检测算法

```javascript
function detectConflict(localTodo, cloudTodo) {
  // 两边都修改过
  if (localTodo.updatedAt > lastSyncAt && cloudTodo.updatedAt > lastSyncAt) {
    if (localTodo.isDeleted || cloudTodo.isDeleted) {
      return 'update-delete';
    }
    return 'update-update';
  }
  return null;
}

function resolveConflict(localTodo, cloudTodo, conflictType) {
  switch (conflictType) {
    case 'update-update':
      // 保留 updatedAt 更大的
      return localTodo.updatedAt > cloudTodo.updatedAt ? localTodo : cloudTodo;
    case 'update-delete':
      // 删除优先
      return localTodo.isDeleted ? localTodo : cloudTodo;
    default:
      return cloudTodo; // 默认云端优先
  }
}
```

---

## API 设计

### 1. 增量同步 API

**POST /todos/sync**

请求：
```json
{
  "lastSyncAt": "2025-04-01T10:00:00Z",
  "localChanges": [
    { "id": "xxx", "text": "...", "version": 2, "updatedAt": 1768585225477, ... }
  ],
  "localDeletedIds": ["id1", "id2"]
}
```

响应：
```json
{
  "success": true,
  "cloudChanges": [...],
  "cloudDeletedIds": [...],
  "syncedAt": "2025-04-03T10:00:00Z"
}
```

### 2. 全量同步 API

**GET /todos/full-sync**

响应：
```json
{
  "success": true,
  "todos": [...],
  "deletedIds": [...],
  "syncedAt": "2025-04-03T10:00:00Z"
}
```

---

## 前端同步流程

### 自动同步触发时机

1. **应用启动时**：`app.onLaunch` → `syncOnAppStart()`
2. **应用切前台时**：`app.onShow` → 检查是否需要同步
3. **数据变更后**：增删改操作后延迟 3 秒触发同步
4. **手动触发**：用户下拉刷新或点击同步按钮

### 同步状态展示

| 状态 | 图标 | 提示文案 |
|------|------|---------|
| idle | - | - |
| syncing | 旋转图标 | 正在同步... |
| success | ✓ | 同步成功 |
| conflict | ⚠ | 数据已合并 |
| error | ✗ | 同步失败，点击重试 |
| offline | ○ | 离线模式 |

---

## 数据迁移方案

### 现有数据兼容

1. 为现有待办生成 `id`（使用 `time` 作为初始 ID）
2. 初始化 `version = 1`
3. 初始化 `isDeleted = false`
4. 初始化 `updatedAt = time`

### 迁移脚本

```sql
-- 添加新字段
ALTER TABLE todos ADD COLUMN version INT DEFAULT 1;
ALTER TABLE todos ADD COLUMN is_deleted TINYINT(1) DEFAULT 0;
ALTER TABLE todos ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE todos ADD COLUMN deleted_at TIMESTAMP NULL;

-- 初始化现有数据
UPDATE todos SET version = 1, is_deleted = 0, updated_at = created_at WHERE version IS NULL;
```

---

## 风险与缓解措施

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 网络中断导致同步失败 | 数据不一致 | 本地保存操作日志，恢复后重试 |
| 大量数据同步耗时 | 用户体验差 | 分批同步 + 后台同步 |
| 冲突解决策略不符合用户预期 | 数据丢失 | 提供数据恢复入口 |
| 并发同步请求 | 数据错乱 | 添加同步锁，同一时间只允许一个同步任务 |

---

## 实现优先级

1. **P0 - 基础同步**：增量同步 API + 冲突检测
2. **P0 - 删除同步**：软删除机制
3. **P1 - 状态展示**：同步状态 UI
4. **P2 - 离线支持**：操作日志 + 重试机制
5. **P3 - 数据恢复**：回收站功能

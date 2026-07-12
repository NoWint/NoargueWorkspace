# 批次1：核心待办功能补齐 — 设计文档

## 目标

补齐网站版与小程序之间的核心待办功能差距，涵盖 5 个功能模块：数据同步、上传服务、批量操作、子任务、图片附件。所有改动仅限于 `website/` 目录，不修改后端代码。

## 范围

### 包含
1. **数据同步**：手动触发增量/全量同步 + Topbar 同步状态图标
2. **上传服务**：头像上传（后端 `/upload/avatar`）+ 待办图片附件上传（第三方图床 `img.scdn.io`）
3. **批量操作**：多选模式下批量移动待办到组合（后端 `/todos/batch-move`）
4. **子任务**：TodoForm 添加子任务 + TodoDetail 展示/管理子任务（通过 `parent_id` 字段）
5. **图片附件**：TodoForm 上传图片 + TodoDetail 图片画廊展示

### 不包含
- 通知系统（微信订阅消息特有，无法在网站版实现）
- 位置信息（需要地图组件替代方案，用户选择不包含）
- 自动同步/后台轮询（采用手动同步方案）
- 图片压缩（后端/图床处理）
- 图片拖拽排序（YAGNI）
- 批量完成/批量删除（小程序只有批量移动，保持一致）

## 架构

### API 层扩展（`website/src/api/`）

#### 新增 `api/upload.ts`

```typescript
import { request } from './request'

export const uploadApi = {
  /** 上传头像到后端 /upload/avatar */
  uploadAvatar: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request.post<{ url: string }>('/upload/avatar', form)
  },
  /** 上传待办图片到第三方图床 img.scdn.io */
  uploadTodoImage: async (file: File): Promise<string> => {
    const form = new FormData()
    form.append('image', file)
    const res = await fetch('https://img.scdn.io/api/v1.php', {
      method: 'POST',
      body: form,
    })
    const data = await res.json()
    if (!data.url) throw new Error(data.error || '图片上传失败')
    return data.url as string
  },
}
```

#### 新增 `api/sync.ts`

```typescript
import { request } from './request'
import type { Todo } from '@/types'

export interface SyncResponse {
  cloudChanges: Todo[]
  cloudDeletedIds: string[]
  syncedAt: number
}

export const syncApi = {
  /** 增量同步 */
  incremental: (data: {
    localChanges: Todo[]
    localDeletedIds: string[]
    lastSyncAt: number | null
  }) => request.post<SyncResponse>('/todos/sync', data),
  /** 全量同步 */
  full: () => request.get<{ todos: Todo[]; syncedAt: number }>('/todos/full-sync'),
}
```

#### 扩展 `api/todos.ts`

增加 `batchMove` 方法：

```typescript
batchMove: (todoIds: string[], comboId: number | null) =>
  request.post('/todos/batch-move', { todoIds, comboId }),
```

#### 扩展 `api/todos.ts` — `getList` 支持 `parentId` 参数

```typescript
getList: (params?: {
  page?: number
  pageSize?: number
  comboId?: number
  tagIds?: string
  search?: string
  showCompleted?: boolean
  date?: string
  parentId?: string  // 新增：传入 'null' 查询顶层待办，传入具体 id 查询子任务
}) => request.get('/todos/list', { params }),
```

### Store 层扩展

#### 新增 `stores/sync.ts` — `useSyncStore`

```typescript
interface SyncState {
  status: 'idle' | 'syncing' | 'success' | 'error'
  lastSyncAt: number | null
  pendingChanges: boolean
  errorMsg: string | null
}

interface SyncActions {
  syncNow: () => Promise<void>      // 增量同步
  fullSync: () => Promise<void>     // 全量同步
  markPending: () => void           // 标记有未同步变更
  clearPending: () => void
  resetStatus: () => void           // success/error 2秒后回到 idle
}
```

**同步逻辑**：
1. `syncNow()` 调用 `syncApi.incremental()`，payload 为 `{ localChanges: todos.filter(t => t.updatedAt > lastSyncAt), localDeletedIds: [], lastSyncAt }`
2. 同步成功后用 `cloudChanges` 合并到 `useTodoStore.todos`（按 version 取较新者），更新 `lastSyncAt`，清除 `pendingChanges`
3. `lastSyncAt === null` 时自动走 `fullSync()`
4. `useTodoStore` 的 `createTodo/updateTodo/deleteTodo` 成功后调用 `useSyncStore.getState().markPending()`

**注意**：`localDeletedIds` 暂传空数组——因为 `useTodoStore.deleteTodo` 是软删除（标记 `isDeleted: true`），不是从数组移除，后端同步时会通过 `updatedAt` 检测到变更。这简化了实现。

#### 修改 `stores/todos.ts`

- `createTodo`、`updateTodo`、`deleteTodo` 成功后调用 `useSyncStore.getState().markPending()`
- 新增 `fetchSubtodos(parentId: string)` — 调用 `todosApi.getList({ parentId })` 获取子任务
- 新增 `batchMove(todoIds: string[], comboId: number | null)` — 调用 `todosApi.batchMove`

### 类型层修改（`types/index.ts`）

```typescript
export interface Todo {
  // ...现有字段
  parentId?: string  // 修改：从 number 改为 string，与后端 parent_id (BIGINT) 在 JS 中的表示一致
}
```

## 功能详细设计

### 1. 数据同步 UI

#### Topbar 同步状态图标

在 Topbar 搜索框右侧增加 `SyncIcon` 按钮：

| 状态 | 图标表现 | 点击行为 |
|------|---------|---------|
| idle (无 pending) | 灰色静态图标 | 触发 `syncNow()` |
| idle (有 pending) | 灰色 + 橙色小圆点 | 触发 `syncNow()` |
| syncing | 旋转动画 | 无（禁用） |
| success | 绿色，2 秒后回 idle | 无 |
| error | 红色，hover 显示错误 | 触发 `syncNow()` 重试 |

#### 同步状态 CSS

```css
.syncBtn {
  width: 32px; height: 32px;
  display: grid; place-items: center;
  color: var(--mt2);
  cursor: pointer;
  position: relative;
}
.syncBtn:hover { color: var(--fg); }
.syncSpinning { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.syncDot {
  position: absolute; top: 6px; right: 6px;
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--warn);
}
.syncOk { color: var(--success); }
.syncErr { color: var(--destructive); }
```

### 2. 上传服务

#### 头像上传

在用户中心页面（批次2创建，此处定义 API 和组件）：
- `<input type="file" accept="image/*">` 选择文件
- 调用 `uploadApi.uploadAvatar(file)` → 返回 `{ url }`
- 调用 `authApi.updateUserInfo({ avatarUrl: url })`
- 预览圆形头像

#### 待办图片附件上传（TodoForm）

在 TodoForm 表单中增加图片上传区：
- `<input type="file" accept="image/*" multiple>` 支持多选
- 最多 9 张（与小程序一致）
- 每张上传调用 `uploadApi.uploadTodoImage(file)` → 返回 URL
- 上传中显示 spinner 覆盖层
- 缩略图网格 4 列，每张 80×80px
- 删除按钮在缩略图右上角
- 上传成功的 URL 存入 `images: string[]`
- 提交时随 `todo.images` 一起保存

### 3. 批量操作

#### AllTodosView 和 ComboDetailView 多选模式

**触发**：
- 顶部增加"批量管理"按钮，点击进入多选模式
- 多选模式下"批量管理"按钮变为"完成"按钮

**多选模式 UI**：
- 每个 TodoItem 左侧出现复选框（16×16px）
- 点击 TodoItem 切换选中（不进入详情）
- 顶部操作栏：`已选 N 项 | 移动到组合 | 取消`
- 选中态：TodoItem 边框高亮 + 复选框打勾
- 0 选中时"移动到组合"按钮 disabled

**批量移动流程**：
1. 点击"移动到组合"→ 弹出组合选择器 Modal
2. 组合选择器展示：私有组合 + 有权限的共享组合 + "移出组合"选项（comboId = null）
3. 确认后调用 `useTodoStore.batchMove(selectedIds, comboId)`
4. 成功后刷新列表，退出多选模式，显示 toast"已移动 N 项"

### 4. 子任务

#### 数据模型

- 子任务是完整的 `Todo` 对象，有自己的 `id`、`text`、`completed` 等字段
- `parent_id` 指向父待办的 `id`（string 类型）
- 后端 `GET /todos/list` 支持 `parent_id` 查询参数：传 `'null'` 查询顶层待办，传具体 id 查询该待办的子任务
- 网站版 `useTodoStore.todos` 只存储顶层待办（调用 `getList({ parentId: 'null' })`），子任务按需加载

#### TodoForm 中的子任务

- TodoForm 底部增加"子任务"区
- 输入框 + 回车添加到临时列表
- 临时列表展示已添加的子任务文本（可删除）
- 编辑模式下，通过 `fetchSubtodos(parentId)` 拉取已有子任务回填
- 提交逻辑：
  1. 先创建/更新主待办
  2. 对新增的子任务：调用 `createTodo({ text, parentId: mainTodoId, ... })`
  3. 对删除的子任务：调用 `deleteTodo(subtaskId)`
  4. 对修改的子任务：调用 `updateTodo(subtaskId, { text })`

#### TodoDetail 中的子任务

- 独立区块"子任务"展示在备注下方
- 子任务列表：每行一个复选框 + 文本 + 删除按钮
- 点击复选框切换子任务完成状态（调用 `updateTodo`）
- 底部输入框 + 回车添加新子任务
- 顶部显示进度："3/5 已完成"
- **父任务联动**：当所有子任务完成时，小程序有自动完成父任务的逻辑（`checkAndCompleteParent`），网站版**不实现**此联动（YAGNI，避免复杂递归逻辑）

#### TodoItem 中的子任务提示

- TodoItem 标题下方如果该待办有子任务，显示小字"3/5 子任务"
- 这需要在 `useTodoStore` 中为每个 todo 计算 `subtaskCount` 和 `subtaskCompletedCount`
- 实现方式：TodoDetail 打开时 fetch 子任务并缓存到 store 的 `subtaskMap: Record<string, Todo[]>`
- TodoItem 从 `subtaskMap` 读取并显示——**仅当 `subtaskMap` 中有该 todo 的数据时才显示**，避免列表页为每个 todo 都 fetch 子任务（性能考量）。首次打开 TodoDetail 后，对应 todo 在列表页才会显示子任务提示

### 5. 图片附件展示（TodoDetail）

- TodoDetail 中增加图片画廊区块
- 网格布局 3 列，每张图片等比缩放
- 使用 Ant Design `Image.PreviewGroup` + `Image` 组件实现点击放大
- 空图片不显示该区块

## 文件变更清单

### 新建文件
| 文件路径 | 职责 |
|---------|------|
| `website/src/api/upload.ts` | 头像上传 + 待办图片上传 |
| `website/src/api/sync.ts` | 增量/全量同步 API |
| `website/src/stores/sync.ts` | 同步状态管理 Zustand store |
| `website/src/features/todo/SubtaskList.tsx` | TodoDetail 中的子任务列表组件 |
| `website/src/features/todo/SubtaskList.module.css` | 子任务列表样式 |
| `website/src/features/todo/ImageUploader.tsx` | TodoForm 中的图片上传组件 |
| `website/src/features/todo/ImageUploader.module.css` | 图片上传样式 |
| `website/src/features/todo/BatchMode.tsx` | 多选模式批量操作组件 |
| `website/src/features/todo/BatchMode.module.css` | 批量操作样式 |

### 修改文件
| 文件路径 | 修改内容 |
|---------|---------|
| `website/src/types/index.ts` | `parentId` 从 `number` 改为 `string` |
| `website/src/api/todos.ts` | 增加 `batchMove`、`getList` 支持 `parentId` 参数 |
| `website/src/stores/todos.ts` | 增加 `fetchSubtodos`、`batchMove`、操作后 `markPending` |
| `website/src/features/layout/Topbar.tsx` | 增加同步状态图标按钮 |
| `website/src/features/layout/Topbar.module.css` | 同步图标样式 |
| `website/src/features/todo/TodoForm.tsx` | 增加子任务输入区 + 图片上传区 |
| `website/src/features/todo/TodoForm.module.css` | 子任务和图片上传样式 |
| `website/src/features/todo/TodoDetail.tsx` | 增加子任务区块 + 图片画廊 |
| `website/src/features/todo/TodoDetail.module.css` | 子任务和图片画廊样式 |
| `website/src/features/todo/TodoItem.tsx` | 增加子任务计数提示 |
| `website/src/features/todo/TodoItem.module.css` | 子任务提示样式 |
| `website/src/features/todo/AllTodosView.tsx` | 增加多选模式入口 |
| `website/src/features/todo/AllTodosView.module.css` | 多选模式样式 |
| `website/src/features/todo/CombosView.tsx` | 增加 ComboDetailView 多选模式（复用 BatchMode） |

## 验收标准

1. **数据同步**：Topbar 同步图标可点击，点击后执行增量同步，成功后图标变绿 2 秒，创建/编辑/删除待办后图标出现橙色圆点
2. **头像上传**：用户中心可选择图片上传，上传成功后头像更新（验收时若无用户中心页，在 TodoDetail 或其他有头像的地方测试）
3. **待办图片上传**：TodoForm 可选择最多 9 张图片上传，上传中显示 loading，上传成功显示缩略图，可删除，保存后 TodoDetail 可查看
4. **批量操作**：AllTodosView 进入多选模式，选中多个待办后可批量移动到组合，移动成功后列表刷新
5. **子任务**：TodoForm 可添加子任务，TodoDetail 可查看/完成/删除子任务，TodoItem 显示子任务进度
6. **图片附件**：TodoDetail 图片画廊正常展示，点击可放大预览
7. **TypeScript 编译零错误**
8. **所有页面无运行时错误**

## 技术约束

- 仅修改 `website/` 目录，不修改后端代码
- 遵循现有的 BonjourPrism 设计语言（pine green、0 border-radius、1px borders）
- 遵循现有的 CSS Modules + CSS Variables 模式
- 遵循现有的 Zustand store 模式
- TypeScript strict 模式（`noUnusedLocals: true`）
- 图片上传走第三方图床 `img.scdn.io`（与小程序一致），头像上传走后端 `/upload/avatar`

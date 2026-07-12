const { todosApi, authApi, setToken, getToken } = require('./api.js');

const SYNC_STORAGE_KEY = 'lastSyncAt';
const LOCAL_TODOS_KEY = 'todos';
const DELETED_TODOS_KEY = 'deletedTodos';
const TODO_PREFIX = 'todo_';
const INDEX_KEY = 'todos_index';

let syncLock = false;
let syncQueue = [];
let _migrated = false;

// ========== 增量读写 API ==========

function migrateFromLegacyStorage() {
  if (_migrated) return;
  const legacy = wx.getStorageSync(LOCAL_TODOS_KEY);
  if (legacy && Array.isArray(legacy) && legacy.length > 0) {
    const ids = [];
    for (const todo of legacy) {
      if (!todo.isDeleted) ids.push(todo.id);
      wx.setStorageSync(TODO_PREFIX + todo.id, todo);
    }
    wx.setStorageSync(INDEX_KEY, ids);
    wx.removeStorageSync(LOCAL_TODOS_KEY);
  }
  _migrated = true;
}

let _reindexed = false;

function reindexTodos() {
  if (_reindexed) return getTodoIds();
  _reindexed = true;
  const info = wx.getStorageInfoSync();
  const allKeys = (info.keys || []).filter(k => k.startsWith(TODO_PREFIX));
  if (allKeys.length === 0) return [];
  const ids = allKeys.map(k => k.slice(TODO_PREFIX.length)).filter(id => {
    const t = getTodoById(id);
    return t && !t.isDeleted;
  });
  ids.sort((a, b) => (getTodoById(b)?.time || 0) - (getTodoById(a)?.time || 0));
  wx.setStorageSync(INDEX_KEY, ids);
  return ids;
}

function getTodoIds() {
  migrateFromLegacyStorage();
  const ids = wx.getStorageSync(INDEX_KEY) || [];
  if (ids.length === 0) return reindexTodos();
  return ids;
}

function getTodoById(id) {
  return wx.getStorageSync(TODO_PREFIX + id) || null;
}

function saveTodo(todo, { updateIndex = true } = {}) {
  migrateFromLegacyStorage();
  wx.setStorageSync(TODO_PREFIX + todo.id, todo);
  if (updateIndex) {
    const ids = getTodoIds();
    if (!ids.includes(todo.id)) {
      ids.unshift(todo.id);
      wx.setStorageSync(INDEX_KEY, ids);
    }
  }
}

function deleteTodoById(id, deletedAt) {
  migrateFromLegacyStorage();
  const todo = getTodoById(id);
  if (todo) {
    todo.isDeleted = true;
    todo.deletedAt = deletedAt || Date.now();
    wx.setStorageSync(TODO_PREFIX + id, todo);
  }
  const ids = getTodoIds();
  const idx = ids.indexOf(id);
  if (idx > -1) {
    ids.splice(idx, 1);
    wx.setStorageSync(INDEX_KEY, ids);
  }
  // 注册到已删除列表，确保云端同步能感知此删除
  if (todo) {
    addDeletedTodo({
      id: todo.id,
      deletedAt: todo.deletedAt,
      updatedAt: todo.updatedAt || todo.time || Date.now()
    });
  }
}

function getDeletedTodoList() {
  migrateFromLegacyStorage();
  const info = wx.getStorageInfoSync();
  const allKeys = (info.keys || []).filter(k => k.startsWith(TODO_PREFIX));
  const deleted = [];
  for (const key of allKeys) {
    const todo = wx.getStorageSync(key);
    if (todo && todo.isDeleted && todo.deletedAt) {
      deleted.push(todo);
    }
  }
  return deleted.sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));
}

function permanentDeleteTodoById(id) {
  wx.removeStorageSync(TODO_PREFIX + id);
}

// ========== 批量读写（兼容 sync 流程） ==========

function getLocalTodos() {
  migrateFromLegacyStorage();
  const ids = wx.getStorageSync(INDEX_KEY);
  if (ids && Array.isArray(ids)) {
    return ids.map(id => getTodoById(id)).filter(Boolean);
  }
  // 兜底：旧格式
  return wx.getStorageSync(LOCAL_TODOS_KEY) || [];
}

function setLocalTodos(todos) {
  migrateFromLegacyStorage();
  const activeTodos = todos.filter(t => !t.isDeleted);
  activeTodos.sort((a, b) => (b.time || 0) - (a.time || 0));

  // 增量写入每个 todo
  const newIds = [];
  for (const todo of activeTodos) {
    newIds.push(todo.id);
    wx.setStorageSync(TODO_PREFIX + todo.id, todo);
  }

  // 更新 index（注：不清除 stale key，避免同步数据不完整时永久丢失）
  wx.setStorageSync(INDEX_KEY, newIds);

  const app = getApp();
  if (app && app.updateCalendarCache) {
    app.updateCalendarCache(activeTodos);
  }
}

function formatDate(dateValue) {
  if (!dateValue) return dateValue;
  const dateObj = new Date(dateValue);
  if (isNaN(dateObj.getTime())) return dateValue;
  const year = dateObj.getFullYear();
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const day = dateObj.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTime(timeValue) {
  if (!timeValue) return timeValue;
  if (typeof timeValue === 'string' && timeValue.length <= 5) {
    const parts = timeValue.split(':');
    if (parts.length === 2) {
      const hours = parts[0].padStart(2, '0');
      const minutes = parts[1].padStart(2, '0');
      return `${hours}:${minutes}`;
    }
  }
  const timeMatch = String(timeValue).match(/(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    const hours = timeMatch[1].padStart(2, '0');
    const minutes = timeMatch[2].padStart(2, '0');
    return `${hours}:${minutes}`;
  }
  return timeValue;
}

function formatTodoDates(todo) {
  if (!todo) return todo;
  return {
    ...todo,
    setDate: formatDate(todo.setDate),
    setTime: formatTime(todo.setTime),
    parent_id: todo.parentId || todo.parent_id || null
  };
}

function getLastSyncTime() {
  return wx.getStorageSync(SYNC_STORAGE_KEY) || null;
}

function setLastSyncTime(time) {
  wx.setStorageSync(SYNC_STORAGE_KEY, time);
}

function getDeletedTodos() {
  return wx.getStorageSync(DELETED_TODOS_KEY) || [];
}

function addDeletedTodo(todo) {
  const deletedTodos = getDeletedTodos();
  const existingIndex = deletedTodos.findIndex(t => t.id === todo.id);
  if (existingIndex > -1) {
    deletedTodos[existingIndex] = {
      id: todo.id,
      deletedAt: todo.deletedAt,
      updatedAt: todo.updatedAt
    };
  } else {
    deletedTodos.push({
      id: todo.id,
      deletedAt: todo.deletedAt,
      updatedAt: todo.updatedAt
    });
  }
  wx.setStorageSync(DELETED_TODOS_KEY, deletedTodos);
}

function clearDeletedTodos(ids) {
  if (!ids || ids.length === 0) return;
  const deletedTodos = getDeletedTodos().filter(t => !ids.includes(t.id));
  wx.setStorageSync(DELETED_TODOS_KEY, deletedTodos);
}

function getLocalChanges(lastSyncAt) {
  const allTodos = getLocalTodos();
  const deletedTodos = getDeletedTodos();
  const lastSyncTimestamp = lastSyncAt ? new Date(lastSyncAt).getTime() : 0;
  
  const localChanges = allTodos.filter(todo => {
    const updatedAt = todo.updatedAt || todo.time || 0;
    return updatedAt > lastSyncTimestamp;
  });
  
  const localDeletedIds = deletedTodos
    .filter(todo => todo.deletedAt && todo.deletedAt > lastSyncTimestamp)
    .map(todo => todo.id);
  
  return { localChanges, localDeletedIds };
}

function mergeChanges(cloudChanges, cloudDeletedIds, localWins = false) {
  const localTodos = getLocalTodos();
  const localDeletedTodos = getDeletedTodos();
  const localTodoMap = new Map();

  localTodos.forEach(todo => {
    if (todo.id) localTodoMap.set(todo.id, todo);
  });

  const localDeletedMap = new Map();
  localDeletedTodos.forEach(todo => {
    localDeletedMap.set(todo.id, todo);
  });

  const cloudDeletedSet = new Set(cloudDeletedIds);

  /** 取时间戳，优先 used-defined 字段，兜底到 time */
  const ts = todo => Math.max(todo.updatedAt || 0, todo.time || 0);
  const deletedTs = todo => Math.max(todo.deletedAt || 0, todo.updatedAt || 0);

  /** 判断 cloud 版本是否比 local 新（严格大于，等值时保留本地） */
  const cloudIsNewer = (cloud, local) => {
    return (cloud.updatedAt || cloud.time || 0) > (local.updatedAt || local.time || 0);
  };

  cloudChanges.forEach(cloudTodo => {
    const c = formatTodoDates(cloudTodo);
    const local = localTodoMap.get(c.id);
    const localDeleted = localDeletedMap.get(c.id);

    // 本地已删除：保留删除，除非 cloud 后有更新
    if (localDeleted && deletedTs(localDeleted) >= ts(c)) return;

    if (!local) {
      // 云端新增：跳过已删除和云端标记删除的
      if (!c.isDeleted && !cloudDeletedSet.has(c.id) && !localDeletedMap.has(c.id)) {
        localTodoMap.set(c.id, c);
      }
      return;
    }

    // 冲突处理：至少一方标记删除
    if (c.isDeleted || local.isDeleted) {
      const cloudDel = deletedTs(c);
      const localDel = deletedTs(local);
      if (c.isDeleted && local.isDeleted) {
        if (cloudDel >= localDel) localTodoMap.delete(c.id);
      } else if (c.isDeleted) {
        if (cloudDel >= ts(local)) localTodoMap.delete(c.id);
      } else {
        if (localDel >= ts(c)) localTodoMap.delete(c.id);
      }
      return;
    }

    // 正常合并：取较新版本
    if (cloudIsNewer(c, local)) {
      localTodoMap.set(c.id, c);
    }
  });

  cloudDeletedIds.forEach(id => {
    const local = localTodoMap.get(id);
    if (local) {
      const localUpdatedAt = local.updatedAt || local.time || 0;
      const cloudDeletedAt = local.deletedAt || 0;
      if (cloudDeletedAt >= localUpdatedAt) {
        localTodoMap.delete(id);
      }
    }
  });

  const mergedTodos = Array.from(localTodoMap.values());
  mergedTodos.sort((a, b) => (b.time || 0) - (a.time || 0));
  return mergedTodos;
}

async function loginWithCode() {
  return new Promise((resolve, reject) => {
    wx.login({
      success: async (res) => {
        try {
          const result = await authApi.login(res.code);
          if (result.token) {
            setToken(result.token);
          }
          resolve(result);
        } catch (err) {
          reject(err);
        }
      },
      fail: (err) => {
        reject(new Error('微信登录失败'));
      }
    });
  });
}

async function checkSyncDiff() {
  const lastSyncAt = getLastSyncTime();
  const { localChanges, localDeletedIds } = getLocalChanges(lastSyncAt);
  
  try {
    const result = await todosApi.sync({
      localChanges: [],
      localDeletedIds: [],
      lastSyncAt
    });
    
    if (!result) {
      throw new Error('同步返回数据为空');
    }
    
    const cloudChanges = result.cloudChanges || [];
    const cloudDeletedIds = result.cloudDeletedIds || [];
    
    const cloudActiveChanges = cloudChanges.filter(t => !t.isDeleted);
    const cloudDeletedFromChanges = cloudChanges.filter(t => t.isDeleted);
    
    const hasLocalChanges = localChanges.length > 0 || localDeletedIds.length > 0;
    const hasCloudChanges = cloudActiveChanges.length > 0 || cloudDeletedIds.length > 0 || cloudDeletedFromChanges.length > 0;
    
    if (!hasLocalChanges && !hasCloudChanges) {
      return {
        hasDiff: false,
        status: 'synced'
      };
    }
    
    const localTodoIds = new Set(getTodoIds());
    const cloudTodoIds = new Set(cloudChanges.map(t => t.id));
    
    const newFromCloud = cloudActiveChanges.filter(t => !localTodoIds.has(t.id));
    const newFromLocal = localChanges.filter(t => !cloudTodoIds.has(t.id));
    const updatedInCloud = cloudActiveChanges.filter(t => {
      const local = localChanges.find(l => l.id === t.id);
      if (!local) return false;
      const cloudVersion = t.version || 1;
      const localVersion = local.version || 1;
      return cloudVersion > localVersion;
    });
    
    return {
      hasDiff: true,
      status: 'diff',
      localChangesCount: localChanges.length,
      localDeletedCount: localDeletedIds.length,
      cloudChangesCount: cloudActiveChanges.length,
      cloudDeletedCount: cloudDeletedIds.length + cloudDeletedFromChanges.length,
      newFromCloudCount: newFromCloud.length,
      newFromLocalCount: newFromLocal.length,
      updatedInCloudCount: updatedInCloud.length,
      localChanges,
      localDeletedIds,
      cloudChanges,
      cloudDeletedIds,
      syncedAt: result.syncedAt
    };
  } catch (err) {
    logger.error('SYNC', 'DIFF', '检查同步差异失败', err);
    throw err;
  }
}

async function syncWithCloud(resolveStrategy = 'merge') {
  return new Promise((resolve, reject) => {
    syncQueue.push({ resolveStrategy, resolve, reject });
    processSyncQueue();
  });
}

async function processSyncQueue() {
  if (syncLock || syncQueue.length === 0) {
    return;
  }
  
  syncLock = true;
  const { resolveStrategy, resolve, reject } = syncQueue.shift();
  
  try {
    const result = await _syncWithCloudInternal(resolveStrategy);
    resolve(result);
  } catch (err) {
    reject(err);
  } finally {
    syncLock = false;
    if (syncQueue.length > 0) {
      processSyncQueue();
    }
  }
}

async function _syncWithCloudInternal(resolveStrategy = 'merge') {
  const lastSyncAt = getLastSyncTime();
  const { localChanges, localDeletedIds } = getLocalChanges(lastSyncAt);
  
  try {
    if (resolveStrategy === 'local') {
      const result = await todosApi.sync({
        localChanges,
        localDeletedIds,
        lastSyncAt: null
      });
      setLastSyncTime(result.syncedAt || new Date().toISOString());
      clearDeletedTodos(localDeletedIds);
      return {
        status: 'local_wins',
        message: '已将本地数据同步到云端'
      };
    }
    
    const result = await todosApi.sync({
      localChanges: [],
      localDeletedIds: [],
      lastSyncAt
    });
    
    if (!result) {
      throw new Error('同步返回数据为空');
    }
    
    const cloudChanges = result.cloudChanges || [];
    const cloudDeletedIds = result.cloudDeletedIds || [];
    
    if (resolveStrategy === 'cloud') {
      const cloudTodos = cloudChanges.filter(t => !t.isDeleted);
      setLocalTodos(cloudTodos.map(t => formatTodoDates(t)));
      clearDeletedTodos([]);
      setLastSyncTime(result.syncedAt || new Date().toISOString());
      return {
        status: 'cloud_wins',
        message: '已使用云端数据覆盖本地'
      };
    }
    
    const mergedTodos = mergeChanges(cloudChanges, cloudDeletedIds, false);
    setLocalTodos(mergedTodos);
    
    const cloudTodoIds = new Set(cloudChanges.map(t => t.id));
    const localOnlyChanges = localChanges.filter(t => !cloudTodoIds.has(t.id));
    const localOnlyDeletedIds = localDeletedIds.filter(id => !cloudDeletedIds.includes(id));
    
    if (localOnlyChanges.length > 0 || localOnlyDeletedIds.length > 0) {
      logger.debug('SYNC', 'MERGE', 'merge上传本地独有变更', { localChanges: localOnlyChanges.length, deleted: localOnlyDeletedIds.length });
      await todosApi.sync({
        localChanges: localOnlyChanges,
        localDeletedIds: localOnlyDeletedIds,
        lastSyncAt: result.syncedAt
      });
    }
    
    clearDeletedTodos(localDeletedIds);
    setLastSyncTime(new Date().toISOString());
    
    return {
      status: 'merged',
      message: '已合并本地和云端数据',
      uploadedCount: localOnlyChanges.length,
      downloadedCount: cloudChanges.length
    };
  } catch (err) {
    logger.error('SYNC', 'SYNC', '云端同步失败', err);
    throw err;
  }
}

async function incrementalSync() {
  const lastSyncAt = getLastSyncTime();
  const { localChanges, localDeletedIds } = getLocalChanges(lastSyncAt);
  
  try {
    const result = await todosApi.sync({
      localChanges,
      localDeletedIds,
      lastSyncAt
    });
    
    if (!result) {
      throw new Error('同步返回数据为空');
    }
    
    if (result.cloudChanges || result.cloudDeletedIds) {
      const mergedTodos = mergeChanges(
        result.cloudChanges || [],
        result.cloudDeletedIds || []
      );
      setLocalTodos(mergedTodos);
    }
    
    clearDeletedTodos(localDeletedIds);
    setLastSyncTime(result.syncedAt || new Date().toISOString());
    
    return {
      status: 'synced',
      uploadedCount: localChanges.length,
      deletedCount: localDeletedIds.length,
      downloadedCount: (result.cloudChanges || []).length
    };
  } catch (err) {
    logger.error('SYNC', 'INCREMENTAL', '增量同步失败', err);
    throw err;
  }
}

async function fullSync() {
  const localTodos = getLocalTodos();
  const hasLocalData = localTodos && localTodos.length > 0;
  
  try {
    const cloudResult = await todosApi.fullSync(getLastSyncTime());
    const cloudTodos = (cloudResult.todos || []).map(todo => formatTodoDates(todo));
    const cloudDeletedIds = cloudResult.deletedIds || [];
    const hasCloudData = cloudTodos.length > 0;
    
    if (!hasLocalData && !hasCloudData) {
      return { status: 'empty', todos: [] };
    }
    
    if (!hasLocalData && hasCloudData) {
      const filteredTodos = cloudTodos.filter(t => !t.isDeleted);
      setLocalTodos(filteredTodos);
      setLastSyncTime(new Date().toISOString());
      return { status: 'downloaded', todos: filteredTodos };
    }
    
    if (hasLocalData && !hasCloudData) {
      const { localChanges, localDeletedIds } = getLocalChanges(null);
      await todosApi.sync({
        localChanges,
        localDeletedIds,
        lastSyncAt: null
      });
      setLastSyncTime(new Date().toISOString());
      return { status: 'uploaded', todos: localTodos };
    }
    
    const mergedTodos = mergeChanges(cloudTodos, cloudDeletedIds);
    const activeTodos = mergedTodos.filter(t => !t.isDeleted);
    
    const { localChanges, localDeletedIds } = getLocalChanges(getLastSyncTime());
    if (localChanges.length > 0 || localDeletedIds.length > 0) {
      await todosApi.sync({
        localChanges,
        localDeletedIds,
        lastSyncAt: getLastSyncTime()
      });
    }
    
    setLocalTodos(activeTodos);
    setLastSyncTime(new Date().toISOString());
    
    return {
      status: 'merged',
      todos: activeTodos,
      uploadedCount: localChanges.length
    };
  } catch (err) {
    logger.error('SYNC', 'FULL', '全量同步失败', err);
    throw err;
  }
}

async function ensureLogin() {
  const token = getToken();
  return !!token;
}

async function syncOnAppStart() {
  const isLoggedIn = await ensureLogin();
  if (!isLoggedIn) {
    logger.info('SYNC', 'START', '未登录，跳过同步');
    return { status: 'not_logged_in' };
  }
  
  try {
    return await incrementalSync();
  } catch (err) {
    logger.error('SYNC', 'START', '启动同步失败', err);
    return { status: 'error', error: err.message };
  }
}

// 获取待办对应的最新分享ID（数组最后一条），不传时取全部
function getActiveShareId(todoId) {
  if (!todoId) return null;
  try {
    const storedIds = wx.getStorageSync('_sharedSnapshotIds') || {};
    const ids = storedIds[todoId];
    return Array.isArray(ids) && ids.length > 0 ? ids[ids.length - 1] : (ids || null);
  } catch (e) {
    return null;
  }
}

// 清理待办的分享记录
function clearShareId(todoId) {
  if (!todoId) return;
  try {
    const storedIds = wx.getStorageSync('_sharedSnapshotIds') || {};
    if (storedIds[todoId]) {
      delete storedIds[todoId];
      wx.setStorageSync('_sharedSnapshotIds', storedIds);
    }
  } catch (e) {}
}

module.exports = {
  getLastSyncTime,
  setLastSyncTime,
  getLocalTodos,
  setLocalTodos,
  getLocalChanges,
  mergeChanges,
  loginWithCode,
  incrementalSync,
  fullSync,
  ensureLogin,
  syncOnAppStart,
  addDeletedTodo,
  clearDeletedTodos,
  checkSyncDiff,
  syncWithCloud,
  // 增量 API
  getTodoIds,
  getTodoById,
  saveTodo,
  deleteTodoById,
  migrateFromLegacyStorage,
  reindexTodos,
  getDeletedTodoList,
  permanentDeleteTodoById,
  getActiveShareId,
  clearShareId
};

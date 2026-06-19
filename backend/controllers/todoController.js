const { query, transaction } = require('../config/database');
const logger = require('../utils/logger');

const getList = async (req, res) => {
  const userId = req.user.id;
  const { page = 1, pageSize = 50, date, completed, includeDeleted } = req.query;
  const offset = (page - 1) * pageSize;
  
  try {
    let sql = 'SELECT * FROM todos WHERE user_id = ?';
    const params = [userId];
    
    if (includeDeleted !== 'true') {
      sql += ' AND is_deleted = 0';
    }
    
    if (date) {
      sql += ' AND set_date = ?';
      params.push(date);
    }
    
    if (completed !== undefined) {
      if (completed === '0' || completed === 'false') {
        sql += ' AND completed = 0';
      } else {
        sql += ' AND completed > 0';
      }
    }
    
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize), parseInt(offset));
    
    const todos = await query(sql, params);
    
    const countSql = 'SELECT COUNT(*) as total FROM todos WHERE user_id = ? AND is_deleted = 0';
    const countResult = await query(countSql, [userId]);
    
    res.json({
      success: true,
      todos: todos.map(todo => formatTodo(todo)),
      total: countResult[0].total,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });
  } catch (err) {
    logger.todoError('获取列表', '获取待办列表失败', { userId, error: err.message });
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

const getById = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const todos = await query(
      'SELECT * FROM todos WHERE todo_id = ? AND user_id = ? AND is_deleted = 0',
      [id, userId]
    );
    
    if (todos.length === 0) {
      return res.status(404).json({
        success: false,
        message: '待办不存在'
      });
    }
    
    const todo = todos[0];
    
    const tags = await query(
      'SELECT t.* FROM tags t JOIN todo_tags tt ON t.id = tt.tag_id WHERE tt.todo_id = ?',
      [todo.id]
    );
    
    res.json({
      success: true,
      todo: {
        ...formatTodo(todo),
        tags: tags.map(t => t.id)
      }
    });
  } catch (err) {
    logger.todoError('获取详情', '获取待办详情失败', { userId, id, error: err.message });
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

const create = async (req, res) => {
  const userId = req.user.id;
  const { text, setDate, setTime, remarks, location, isStar, comboId, tagIds, todoId, images } = req.body;
  
  if (!text || !text.trim()) {
    return res.status(400).json({
      success: false,
      message: '待办内容不能为空'
    });
  }
  
  try {
    const countResult = await query(
      'SELECT COUNT(*) as count FROM todos WHERE user_id = ? AND is_deleted = 0',
      [userId]
    );
    
    const users = await query('SELECT todo_limit FROM users WHERE id = ?', [userId]);
    const todoLimit = users[0]?.todo_limit || 100;
    
    if (countResult[0].count >= todoLimit) {
      return res.status(400).json({
        success: false,
        message: `已达到待办上限(${todoLimit}个)，可在 更多-右下角 联系客服`
      });
    }
    
    const finalTodoId = todoId || generateTodoId();
    const imagesJson = images && images.length > 0 ? JSON.stringify(images) : null;
    
    const result = await query(
      `INSERT INTO todos 
       (user_id, todo_id, text, set_date, set_time, remarks, location_text, is_star, combo_id, images, version, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
      [
        userId,
        finalTodoId,
        text.trim(),
        setDate || null,
        setTime || null,
        remarks || null,
        location ? JSON.stringify(location) : null,
        isStar ? 1 : 0,
        comboId || null,
        imagesJson
      ]
    );
    
    if (tagIds && tagIds.length > 0) {
      const tagValues = tagIds.map(tagId => [result.insertId, tagId]);
      await query(
        'INSERT INTO todo_tags (todo_id, tag_id) VALUES ?',
        [tagValues]
      );
    }
    
    logger.todoInfo('创建', '待办创建成功', { userId, todoId: finalTodoId, text: text.substring(0, 50) });

    const newTodo = await query('SELECT * FROM todos WHERE id = ?', [result.insertId]);

    res.json({
      success: true,
      message: '待办创建成功',
      todo: formatTodo(newTodo[0])
    });
  } catch (err) {
    logger.todoError('创建', '创建待办失败', { userId, error: err.message });
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

const update = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { text, setDate, setTime, remarks, location, isStar, completed, comboId, tagIds, version, images } = req.body;
  
  try {
    const todos = await query(
      'SELECT * FROM todos WHERE todo_id = ? AND user_id = ? AND is_deleted = 0',
      [id, userId]
    );
    
    if (todos.length === 0) {
      return res.status(404).json({
        success: false,
        message: '待办不存在'
      });
    }
    
    const existingTodo = todos[0];
    
    if (version !== undefined && existingTodo.version > version) {
      return res.status(409).json({
        success: false,
        message: '数据版本冲突，请刷新后重试',
        currentVersion: existingTodo.version,
        serverData: formatTodo(existingTodo)
      });
    }
    
    const updateFields = ['version = version + 1'];
    const updateValues = [];
    
    if (text !== undefined) {
      updateFields.push('text = ?');
      updateValues.push(text.trim());
    }
    if (setDate !== undefined) {
      updateFields.push('set_date = ?');
      updateValues.push(setDate);
    }
    if (setTime !== undefined) {
      updateFields.push('set_time = ?');
      updateValues.push(setTime);
    }
    if (remarks !== undefined) {
      updateFields.push('remarks = ?');
      updateValues.push(remarks);
    }
    if (location !== undefined) {
      updateFields.push('location_text = ?');
      updateValues.push(location ? JSON.stringify(location) : null);
    }
    if (isStar !== undefined) {
      updateFields.push('is_star = ?');
      updateValues.push(isStar ? 1 : 0);
    }
    if (completed !== undefined) {
      updateFields.push('completed = ?');
      updateValues.push(completed ? Date.now() : 0);
    }
    if (comboId !== undefined) {
      updateFields.push('combo_id = ?');
      updateValues.push(comboId);
    }
    if (images !== undefined) {
      updateFields.push('images = ?');
      updateValues.push(images && images.length > 0 ? JSON.stringify(images) : null);
    }
    
    updateFields.push('updated_at = NOW()');
    updateValues.push(id, userId);
    
    await query(
      `UPDATE todos SET ${updateFields.join(', ')} WHERE todo_id = ? AND user_id = ?`,
      updateValues
    );
    
    if (tagIds !== undefined) {
      await query('DELETE FROM todo_tags WHERE todo_id = ?', [id]);
      
      if (tagIds.length > 0) {
        const tagValues = tagIds.map(tagId => [id, tagId]);
        await query(
          'INSERT INTO todo_tags (todo_id, tag_id) VALUES ?',
          [tagValues]
        );
      }
    }
    
    const updatedTodo = await query('SELECT * FROM todos WHERE todo_id = ?', [id]);
    
    res.json({
      success: true,
      message: '待办更新成功',
      todo: formatTodo(updatedTodo[0])
    });
  } catch (err) {
    logger.todoError('更新', '更新待办失败', { userId, id, error: err.message });
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

const deleteTodo = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  
  try {
    const result = await query(
      'UPDATE todos SET is_deleted = 1, deleted_at = NOW(), updated_at = NOW(), version = version + 1 WHERE todo_id = ? AND user_id = ?',
      [id, userId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: '待办不存在'
      });
    }
    
    logger.todoInfo('删除', '待办删除成功', { userId, id });
    
    res.json({
      success: true,
      message: '待办删除成功'
    });
  } catch (err) {
    logger.todoError('删除', '删除待办失败', { userId, id, error: err.message });
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

const batchMove = async (req, res) => {
  const userId = req.user.id;
  const { todoIds, comboId } = req.body;
  
  if (!todoIds || !Array.isArray(todoIds) || todoIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: '请选择要移动的待办'
    });
  }
  
  try {
    const placeholders = todoIds.map(() => '?').join(',');
    await query(
      `UPDATE todos SET combo_id = ?, updated_at = NOW(), version = version + 1 WHERE id IN (${placeholders}) AND user_id = ?`,
      [comboId, ...todoIds, userId]
    );
    
    logger.todoInfo('批量移动', '待办批量移动成功', { userId, count: todoIds.length, comboId });
    
    res.json({
      success: true,
      message: '待办移动成功'
    });
  } catch (err) {
    logger.todoError('批量移动', '批量移动待办失败', { userId, error: err.message });
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

const sync = async (req, res) => {
  const userId = req.user.id;
  const { localChanges, localDeletedIds, lastSyncAt } = req.body;
  
  logger.todoSync('开始同步', { userId, localChangesCount: localChanges?.length, localDeletedIdsCount: localDeletedIds?.length });
  
  try {
    const syncedAt = new Date().toISOString();
    const cloudChanges = [];
    const cloudDeletedIds = [];
    const conflicts = [];
    
    if (localChanges && Array.isArray(localChanges) && localChanges.length > 0) {
      for (const localTodo of localChanges) {
        try {
          const todoId = localTodo.id || generateTodoId();
          
          let existing = [];
          try {
            existing = await query(
              'SELECT * FROM todos WHERE user_id = ? AND todo_id = ?',
              [userId, todoId]
            );
          } catch (queryErr) {
            logger.dbDebug('todo_id查询', '尝试使用id查询', { userId, dbId: localTodo.dbId });
            existing = await query(
              'SELECT * FROM todos WHERE user_id = ? AND id = ?',
              [userId, localTodo.dbId]
            );
          }
          
          if (existing.length === 0) {
            const createdAt = localTodo.time ? new Date(localTodo.time) : new Date();
            const updatedAt = localTodo.updatedAt ? new Date(localTodo.updatedAt) : createdAt;
            const tagsJson = localTodo.tags && localTodo.tags.length > 0 ? JSON.stringify(localTodo.tags) : null;
            const imagesJson = localTodo.images && localTodo.images.length > 0 ? JSON.stringify(localTodo.images) : null;
            
            try {
              await query(
                `INSERT INTO todos 
                 (user_id, todo_id, text, set_date, set_time, remarks, location_text, completed, is_star, tags, images, combo_id, version, is_deleted, deleted_at, created_at, updated_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  userId,
                  todoId,
                  localTodo.text || '',
                  localTodo.setDate || null,
                  localTodo.setTime || null,
                  localTodo.remarks || null,
                  localTodo.location ? JSON.stringify(localTodo.location) : null,
                  localTodo.completed || 0,
                  localTodo.isStar ? 1 : 0,
                  tagsJson,
                  imagesJson,
                  localTodo.comboId || null,
                  localTodo.version || 1,
                  localTodo.isDeleted ? 1 : 0,
                  localTodo.deletedAt ? new Date(localTodo.deletedAt) : null,
                  createdAt,
                  updatedAt
                ]
              );
            } catch (insertErr) {
              logger.todoError('插入', '插入待办失败，尝试简化插入', { userId, error: insertErr.message });
              await query(
                `INSERT INTO todos (user_id, text, set_date, set_time, remarks, completed, is_star, tags, images, created_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                [
                  userId,
                  localTodo.text || '',
                  localTodo.setDate || null,
                  localTodo.setTime || null,
                  localTodo.remarks || null,
                  localTodo.completed || 0,
                  localTodo.isStar ? 1 : 0,
                  tagsJson,
                  imagesJson
                ]
              );
            }
          } else {
            const serverTodo = existing[0];
            const resolved = resolveConflict(localTodo, formatTodo(serverTodo));
            const resolvedTagsJson = resolved.tags && resolved.tags.length > 0 ? JSON.stringify(resolved.tags) : null;
            const resolvedImagesJson = resolved.images && resolved.images.length > 0 ? JSON.stringify(resolved.images) : null;
            
            try {
              await query(
                `UPDATE todos SET 
                 text = ?, set_date = ?, set_time = ?, remarks = ?, location_text = ?, 
                 completed = ?, is_star = ?, tags = ?, images = ?, combo_id = ?, version = ?, updated_at = NOW()
                 WHERE id = ? AND user_id = ?`,
                [
                  resolved.text,
                  resolved.setDate || null,
                  resolved.setTime || null,
                  resolved.remarks || null,
                  resolved.location ? JSON.stringify(resolved.location) : null,
                  resolved.completed || 0,
                  resolved.isStar ? 1 : 0,
                  resolvedTagsJson,
                  resolvedImagesJson,
                  resolved.comboId || null,
                  resolved.version || 1,
                  serverTodo.id,
                  userId
                ]
              );
            } catch (updateErr) {
              logger.todoError('更新', '更新待办失败', { userId, todoId, error: updateErr.message });
            }
          }
        } catch (todoErr) {
          logger.todoError('同步', '处理单个待办错误', { userId, error: todoErr.message, todo: localTodo?.id });
        }
      }
    }
    
    if (localDeletedIds && Array.isArray(localDeletedIds) && localDeletedIds.length > 0) {
      try {
        const placeholders = localDeletedIds.map(() => '?').join(',');
        await query(
          `UPDATE todos SET is_deleted = 1, deleted_at = NOW(), updated_at = NOW() 
           WHERE todo_id IN (${placeholders}) AND user_id = ?`,
          [...localDeletedIds, userId]
        );
      } catch (deleteErr) {
        logger.todoError('标记删除', '标记删除失败', { userId, error: deleteErr.message });
      }
    }
    
    let cloudTodos = [];
    try {
      cloudTodos = await query(
        'SELECT * FROM todos WHERE user_id = ? AND (is_deleted = 0 OR is_deleted IS NULL)',
        [userId]
      );
    } catch (queryErr) {
      logger.dbError('查询', '查询云端待办失败', { userId, error: queryErr.message });
      cloudTodos = [];
    }
    
    for (const todo of cloudTodos) {
      cloudChanges.push(formatTodo(todo));
    }
    
    try {
      const deletedTodos = await query(
        'SELECT todo_id, id FROM todos WHERE user_id = ? AND is_deleted = 1',
        [userId]
      );
      
      for (const todo of deletedTodos) {
        cloudDeletedIds.push(todo.todo_id || String(todo.id));
      }
    } catch (err) {
      logger.dbError('查询', '查询已删除待办失败', { userId, error: err.message });
    }
    
    try {
      await query(
        'UPDATE users SET last_sync_at = NOW() WHERE id = ?',
        [userId]
      );
    } catch (err) {
      logger.dbError('更新', '更新同步时间失败', { userId, error: err.message });
    }
    
    cleanupDeletedTodos(userId);
    
    const todoCount = (localChanges && localChanges.length) || 0;
    try {
      await query(
        'INSERT INTO sync_logs (user_id, action, todo_count, status) VALUES (?, ?, ?, ?)',
        [userId, 'sync', todoCount, 'success']
      );
    } catch (logErr) {
      logger.dbError('日志', '记录同步日志失败', { userId, error: logErr.message });
    }
    
    logger.todoSync('同步完成', { userId, cloudChangesCount: cloudChanges.length, cloudDeletedIdsCount: cloudDeletedIds.length });
    
    res.json({
      success: true,
      cloudChanges,
      cloudDeletedIds,
      conflicts,
      syncedAt
    });
  } catch (err) {
    logger.todoError('同步', '同步待办失败', { userId, error: err.message });
    try {
      await query(
        'INSERT INTO sync_logs (user_id, action, todo_count, status) VALUES (?, ?, ?, ?)',
        [userId, 'sync', 0, 'failed']
      );
    } catch (logErr) {
      logger.dbError('日志', '记录同步日志失败', { userId, error: logErr.message });
    }
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

const fullSync = async (req, res) => {
  const userId = req.user.id;
  
  try {
    let cloudTodos = [];
    let deletedTodos = [];
    
    try {
      cloudTodos = await query(
        'SELECT * FROM todos WHERE user_id = ? AND (is_deleted = 0 OR is_deleted IS NULL) ORDER BY created_at DESC',
        [userId]
      );
    } catch (err) {
      logger.dbError('查询', '查询云端待办失败', { userId, error: err.message });
    }
    
    try {
      deletedTodos = await query(
        'SELECT todo_id, id FROM todos WHERE user_id = ? AND is_deleted = 1',
        [userId]
      );
    } catch (err) {
      logger.dbError('查询', '查询已删除待办失败', { userId, error: err.message });
    }
    
    const syncedAt = new Date().toISOString();
    
    try {
      await query(
        'UPDATE users SET last_sync_at = NOW() WHERE id = ?',
        [userId]
      );
    } catch (err) {
      logger.dbError('更新', '更新同步时间失败', { userId, error: err.message });
    }
    
    cleanupDeletedTodos(userId);
    
    const totalCount = cloudTodos.length + deletedTodos.length;
    try {
      await query(
        'INSERT INTO sync_logs (user_id, action, todo_count, status) VALUES (?, ?, ?, ?)',
        [userId, 'full_sync', totalCount, 'success']
      );
    } catch (logErr) {
      logger.dbError('日志', '记录同步日志失败', { userId, error: logErr.message });
    }
    
    logger.todoSync('全量同步完成', { userId, totalCount });
    
    res.json({
      success: true,
      todos: cloudTodos.map(todo => formatTodo(todo)),
      deletedIds: deletedTodos.map(t => t.todo_id || String(t.id)),
      syncedAt
    });
  } catch (err) {
    logger.todoError('全量同步', '全量同步失败', { userId, error: err.message });
    try {
      await query(
        'INSERT INTO sync_logs (user_id, action, todo_count, status) VALUES (?, ?, ?, ?)',
        [userId, 'full_sync', 0, 'failed']
      );
    } catch (logErr) {
      logger.dbError('日志', '记录同步日志失败', { userId, error: logErr.message });
    }
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

function formatTodo(todo) {
  let location = null;
  try {
    location = todo.location_text ? JSON.parse(todo.location_text) : null;
  } catch (e) {
    location = null;
  }
  
  let setDate = todo.set_date;
  if (setDate) {
    const dateObj = new Date(setDate);
    if (!isNaN(dateObj.getTime())) {
      const year = dateObj.getFullYear();
      const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
      const day = dateObj.getDate().toString().padStart(2, '0');
      setDate = `${year}-${month}-${day}`;
    }
  }
  
  let setTime = todo.set_time;
  if (setTime && typeof setTime === 'string' && setTime.length > 5) {
    const timeMatch = setTime.match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      const hours = timeMatch[1].padStart(2, '0');
      const minutes = timeMatch[2].padStart(2, '0');
      setTime = `${hours}:${minutes}`;
    }
  }
  
  let tags = [];
  if (todo.tags) {
    try {
      tags = JSON.parse(todo.tags);
    } catch (e) {
      tags = [];
    }
  }
  
  let images = [];
  if (todo.images) {
    try {
      images = JSON.parse(todo.images);
      if (!Array.isArray(images)) images = [];
    } catch (e) {
      images = [];
    }
  }
  
  return {
    id: todo.todo_id || String(todo.id),
    dbId: todo.id,
    text: todo.text || '',
    setDate: setDate,
    setTime: setTime,
    remarks: todo.remarks,
    location: location,
    completed: todo.completed || 0,
    isStar: todo.is_star === 1,
    time: todo.created_at ? new Date(todo.created_at).getTime() : Date.now(),
    tags: tags,
    images: images,
    comboId: todo.combo_id,
    version: todo.version || 1,
    isDeleted: todo.is_deleted === 1,
    deletedAt: todo.deleted_at ? new Date(todo.deleted_at).getTime() : null,
    updatedAt: todo.updated_at ? new Date(todo.updated_at).getTime() : null
  };
}

function generateTodoId() {
  return 'todo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

async function cleanupDeletedTodos(userId) {
  try {
    const result = await query(
      'DELETE FROM todos WHERE user_id = ? AND is_deleted = 1 AND deleted_at < DATE_SUB(NOW(), INTERVAL 30 DAY)',
      [userId]
    );
    if (result.affectedRows > 0) {
      logger.todoInfo('清理', '清理已删除待办', { userId, count: result.affectedRows });
    }
    return result.affectedRows;
  } catch (err) {
    logger.todoError('清理', '清理已删除待办失败', { userId, error: err.message });
    return 0;
  }
}

function resolveConflict(localTodo, serverTodo) {
  if (localTodo.isDeleted || serverTodo.isDeleted) {
    return localTodo.isDeleted ? localTodo : serverTodo;
  }
  
  const localUpdatedAt = localTodo.updatedAt || localTodo.time || 0;
  const serverUpdatedAt = serverTodo.updatedAt || serverTodo.time || 0;
  
  return localUpdatedAt > serverUpdatedAt ? localTodo : serverTodo;
}

const getDeletedList = async (req, res) => {
  const userId = req.user.id;
  
  try {
    const todos = await query(
      `SELECT * FROM todos 
       WHERE user_id = ? AND is_deleted = 1 AND deleted_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
       ORDER BY deleted_at DESC`,
      [userId]
    );
    
    res.json({
      success: true,
      todos: todos.map(todo => formatTodo(todo))
    });
  } catch (err) {
    logger.todoError('获取已删除', '获取已删除待办列表失败', { userId, error: err.message });
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

const permanentDelete = async (req, res) => {
  const userId = req.user.id;
  const { todoId } = req.params;
  
  try {
    const result = await query(
      'DELETE FROM todos WHERE todo_id = ? AND user_id = ?',
      [todoId, userId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: '待办不存在'
      });
    }
    
    logger.todoInfo('永久删除', '待办永久删除', { userId, todoId });
    
    res.json({
      success: true,
      message: '已永久删除'
    });
  } catch (err) {
    logger.todoError('永久删除', '永久删除待办失败', { userId, todoId, error: err.message });
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

const restoreTodo = async (req, res) => {
  const userId = req.user.id;
  const { todoId } = req.params;
  
  try {
    const result = await query(
      `UPDATE todos 
       SET is_deleted = 0, deleted_at = NULL, updated_at = NOW(), version = version + 1
       WHERE todo_id = ? AND user_id = ?`,
      [todoId, userId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: '待办不存在'
      });
    }
    
    const [restoredTodo] = await query(
      'SELECT * FROM todos WHERE todo_id = ? AND user_id = ?',
      [todoId, userId]
    );
    
    logger.todoInfo('恢复', '待办恢复成功', { userId, todoId });
    
    res.json({
      success: true,
      todo: formatTodo(restoredTodo)
    });
  } catch (err) {
    logger.todoError('恢复', '恢复待办失败', { userId, todoId, error: err.message });
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

module.exports = {
  getList,
  getById,
  create,
  update,
  deleteTodo,
  batchMove,
  sync,
  fullSync,
  cleanupDeletedTodos,
  getDeletedList,
  permanentDelete,
  restoreTodo
};

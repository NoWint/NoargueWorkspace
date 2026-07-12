const { query } = require('../config/database');
const { sendSubscribeMessage, sendApprovalResultMessage, getAccessToken } = require('../services/wechatService');
const logger = require('../utils/logger');

const subscribe = async (req, res) => {
  const userId = req.user.id;
  const { templateIds } = req.body;
  
  res.json({
    success: true,
    message: '订阅成功'
  });
};

const schedule = async (req, res) => {
  const userId = req.user.id;
  const { todoId, notifyTime } = req.body;
  
  logger.notifySchedule('schedule', '请求参数', { userId, todoId, notifyTime });
  
  if (!todoId || !notifyTime) {
    return res.status(400).json({
      success: false,
      message: '缺少必要参数'
    });
  }
  
  try {
    let todoQuery;
    let queryParams;
    
    if (typeof todoId === 'string' && todoId.startsWith('todo_')) {
      todoQuery = 'SELECT * FROM todos WHERE todo_id = ? AND user_id = ? AND is_deleted = 0';
      queryParams = [todoId, userId];
    } else if (!isNaN(Number(todoId))) {
      todoQuery = 'SELECT * FROM todos WHERE id = ? AND user_id = ? AND is_deleted = 0';
      queryParams = [Number(todoId), userId];
    } else {
      todoQuery = 'SELECT * FROM todos WHERE todo_id = ? AND user_id = ? AND is_deleted = 0';
      queryParams = [String(todoId), userId];
    }
    
    const todos = await query(todoQuery, queryParams);
    logger.dbDebug('查询待办', '查询结果', { count: todos.length });
    
    if (todos.length === 0) {
      return res.status(404).json({
        success: false,
        message: '待办不存在'
      });
    }
    
    const todo = todos[0];
    const todoDbId = todo.id;
    
    const existingNotifications = await query(
      'SELECT * FROM todo_notifications WHERE todo_id = ? AND user_id = ? AND is_sent = 0',
      [todoDbId, userId]
    );
    
    // 将时间戳转换为MySQL datetime格式（使用本地时间）
    const notifyDate = new Date(Number(notifyTime));
    const notifyTimeStr = notifyDate.getFullYear() + '-' + 
      String(notifyDate.getMonth() + 1).padStart(2, '0') + '-' + 
      String(notifyDate.getDate()).padStart(2, '0') + ' ' + 
      String(notifyDate.getHours()).padStart(2, '0') + ':' + 
      String(notifyDate.getMinutes()).padStart(2, '0') + ':' + 
      String(notifyDate.getSeconds()).padStart(2, '0');
    
    logger.notifySchedule('转换时间', '通知时间', { notifyTimeStr });
    
    let result;
    if (existingNotifications.length > 0) {
      result = await query(
        'UPDATE todo_notifications SET notify_time = ?, updated_at = NOW() WHERE id = ?',
        [notifyTimeStr, existingNotifications[0].id]
      );
      result.insertId = existingNotifications[0].id;
    } else {
      result = await query(
        'INSERT INTO todo_notifications (todo_id, user_id, notify_time, created_at) VALUES (?, ?, ?, NOW())',
        [todoDbId, userId, notifyTimeStr]
      );
    }
    
    logger.notifySchedule('保存成功', '通知保存成功', { id: result.insertId });
    
    res.json({
      success: true,
      message: '通知设置成功',
      notificationId: result.insertId
    });
  } catch (err) {
    logger.notifyError('设置通知', '设置通知失败', { userId, error: err.message });
    res.status(500).json({
      success: false,
      message: '服务器错误: ' + err.message
    });
  }
};

const getByTodoId = async (req, res) => {
  const userId = req.user.id;
  const { todoId } = req.query;
  
  if (!todoId) {
    return res.status(400).json({
      success: false,
      message: '缺少待办ID'
    });
  }
  
  try {
    const todos = await query(
      'SELECT id FROM todos WHERE (id = ? OR todo_id = ?) AND user_id = ? AND is_deleted = 0',
      [todoId, todoId, userId]
    );
    
    if (todos.length === 0) {
      return res.json({
        success: true,
        notification: null
      });
    }
    
    const todoDbId = todos[0].id;
    
    const notifications = await query(
      `SELECT n.*, t.text as todo_text, t.set_date, t.set_time, t.remarks, t.location_text
       FROM todo_notifications n
       LEFT JOIN todos t ON n.todo_id = t.id
       WHERE n.todo_id = ? AND n.user_id = ? AND n.is_sent = 0
       ORDER BY n.notify_time DESC
       LIMIT 1`,
      [todoDbId, userId]
    );
    
    if (notifications.length === 0) {
      return res.json({
        success: true,
        notification: null
      });
    }
    
    const n = notifications[0];
    res.json({
      success: true,
      notification: {
        id: n.id,
        todoId: n.todo_id,
        todoText: n.todo_text,
        setDate: n.set_date,
        setTime: n.set_time,
        remarks: n.remarks,
        location: n.location_text,
        notifyTime: n.notify_time,
        isSent: n.is_sent === 1
      }
    });
  } catch (err) {
    logger.notifyError('获取通知', '获取通知失败', { userId, error: err.message });
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

const update = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { notifyTime } = req.body;
  
  if (!notifyTime) {
    return res.status(400).json({
      success: false,
      message: '缺少通知时间'
    });
  }
  
  try {
    const result = await query(
      'UPDATE todo_notifications SET notify_time = ?, updated_at = NOW() WHERE id = ? AND user_id = ?',
      [new Date(notifyTime), id, userId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: '通知不存在'
      });
    }
    
    res.json({
      success: true,
      message: '通知已更新'
    });
  } catch (err) {
    logger.notifyError('更新通知', '更新通知失败', { userId, error: err.message });
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

const cancel = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  
  try {
    const result = await query(
      'DELETE FROM todo_notifications WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: '通知不存在'
      });
    }
    
    res.json({
      success: true,
      message: '通知已取消'
    });
  } catch (err) {
    logger.notifyError('取消通知', '取消通知失败', { userId, error: err.message });
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

const getList = async (req, res) => {
  const userId = req.user.id;
  
  try {
    const notifications = await query(
      `SELECT n.*, t.text as todo_text, t.set_date, t.set_time
       FROM todo_notifications n
       LEFT JOIN todos t ON n.todo_id = t.id
       WHERE n.user_id = ? AND n.is_sent = 0
       ORDER BY n.notify_time ASC`,
      [userId]
    );
    
    res.json({
      success: true,
      notifications: notifications.map(n => ({
        id: n.id,
        todoId: n.todo_id,
        todoText: n.todo_text,
        setDate: n.set_date,
        setTime: n.set_time,
        notifyTime: n.notify_time,
        isSent: n.is_sent === 1
      }))
    });
  } catch (err) {
    logger.notifyError('获取列表', '获取通知列表失败', { userId, error: err.message });
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

const testSend = async (req, res) => {
  const userId = req.user.id;
  const { notificationId } = req.body;
  
  try {
    const notifications = await query(
      `SELECT n.*, u.openid, t.text as todo_text, t.set_date, t.set_time, t.remarks, t.location_text
       FROM todo_notifications n
       LEFT JOIN users u ON n.user_id = u.id
       LEFT JOIN todos t ON n.todo_id = t.id
       WHERE n.id = ? AND n.user_id = ?`,
      [notificationId, userId]
    );
    
    if (notifications.length === 0) {
      return res.status(404).json({
        success: false,
        message: '通知不存在'
      });
    }
    
    const notification = notifications[0];
    
    if (!notification.openid) {
      return res.status(400).json({
        success: false,
        message: '用户openid不存在，请重新登录'
      });
    }
    
    const notifyDate = new Date(notification.notify_time);
    const notifyTimeStr = `${notifyDate.getFullYear()}-${(notifyDate.getMonth() + 1).toString().padStart(2, '0')}-${notifyDate.getDate().toString().padStart(2, '0')} ${notifyDate.getHours().toString().padStart(2, '0')}:${notifyDate.getMinutes().toString().padStart(2, '0')}`;
    
    const deadlineDate = new Date(notification.set_date);
    const deadlineStr = `${deadlineDate.getFullYear()}-${(deadlineDate.getMonth() + 1).toString().padStart(2, '0')}-${deadlineDate.getDate().toString().padStart(2, '0')} ${notification.set_time || '12:00'}`;
    
    logger.notifySend('测试发送', '测试发送通知', {
      openid: notification.openid,
      todoText: notification.todo_text,
      notifyTime: notifyTimeStr,
      deadline: deadlineStr
    });
    
    const result = await sendSubscribeMessage(notification.openid, {
      todoText: notification.todo_text || '待办事项',
      notifyTime: notifyTimeStr,
      deadline: deadlineStr,
      location: notification.location_text,
      remarks: notification.remarks
    });
    
    if (result.success) {
      await query(
        'UPDATE todo_notifications SET is_sent = 1, sent_at = NOW(), template_msg_id = ? WHERE id = ?',
        [result.msgid, notification.id]
      );
      
      res.json({
        success: true,
        message: '通知发送成功',
        msgid: result.msgid
      });
    } else {
      res.status(500).json({
        success: false,
        message: '发送失败: ' + (result.errmsg || result.error)
      });
    }
  } catch (err) {
    logger.notifyError('测试发送', '测试发送失败', { userId, error: err.message });
    res.status(500).json({
      success: false,
      message: '服务器错误: ' + err.message
    });
  }
};

const scheduleShared = async (req, res) => {
  const userId = req.user.id;
  const { sharedTodoId, notifyTime } = req.body;
  
  logger.notifySchedule('scheduleShared', '请求参数', { userId, sharedTodoId, notifyTime });
  
  if (!sharedTodoId || !notifyTime) {
    return res.status(400).json({
      success: false,
      message: '缺少必要参数'
    });
  }
  
  try {
    const members = await query(
      `SELECT cm.role FROM combo_members cm
       JOIN shared_todos st ON st.combo_id = cm.combo_id
       WHERE st.id = ? AND cm.user_id = ?`,
      [sharedTodoId, userId]
    );
    
    if (members.length === 0) {
      return res.status(403).json({
        success: false,
        message: '无权设置此待办的通知'
      });
    }
    
    const sharedTodos = await query(
      'SELECT * FROM shared_todos WHERE id = ? AND is_deleted = 0',
      [sharedTodoId]
    );
    
    if (sharedTodos.length === 0) {
      return res.status(404).json({
        success: false,
        message: '共享待办不存在'
      });
    }
    
    const notifyDate = new Date(Number(notifyTime));
    const notifyTimeStr = notifyDate.getFullYear() + '-' + 
      String(notifyDate.getMonth() + 1).padStart(2, '0') + '-' + 
      String(notifyDate.getDate()).padStart(2, '0') + ' ' + 
      String(notifyDate.getHours()).padStart(2, '0') + ':' + 
      String(notifyDate.getMinutes()).padStart(2, '0') + ':' + 
      String(notifyDate.getSeconds()).padStart(2, '0');
    
    const existing = await query(
      'SELECT * FROM shared_todo_notifications WHERE shared_todo_id = ? AND user_id = ? AND is_sent = 0',
      [sharedTodoId, userId]
    );
    
    let result;
    if (existing.length > 0) {
      result = await query(
        'UPDATE shared_todo_notifications SET notify_time = ?, updated_at = NOW() WHERE id = ?',
        [notifyTimeStr, existing[0].id]
      );
      result.insertId = existing[0].id;
    } else {
      result = await query(
        'INSERT INTO shared_todo_notifications (shared_todo_id, user_id, notify_time, created_at) VALUES (?, ?, ?, NOW())',
        [sharedTodoId, userId, notifyTimeStr]
      );
    }
    
    logger.notifySchedule('保存成功', '共享待办通知保存成功', { id: result.insertId });
    
    res.json({
      success: true,
      message: '通知设置成功',
      notificationId: result.insertId
    });
  } catch (err) {
    logger.notifyError('设置共享通知', '设置共享待办通知失败', { userId, sharedTodoId, error: err.message });
    res.status(500).json({
      success: false,
      message: '服务器错误: ' + err.message
    });
  }
};

const getSharedByTodoId = async (req, res) => {
  const userId = req.user.id;
  const { sharedTodoId } = req.query;
  
  if (!sharedTodoId) {
    return res.status(400).json({
      success: false,
      message: '缺少共享待办ID'
    });
  }
  
  try {
    const notifications = await query(
      `SELECT n.*, st.text as todo_text, st.set_date, st.set_time, st.remarks
       FROM shared_todo_notifications n
       LEFT JOIN shared_todos st ON n.shared_todo_id = st.id
       WHERE n.shared_todo_id = ? AND n.user_id = ? AND n.is_sent = 0
       ORDER BY n.notify_time DESC
       LIMIT 1`,
      [sharedTodoId, userId]
    );
    
    if (notifications.length === 0) {
      return res.json({
        success: true,
        notification: null
      });
    }
    
    const n = notifications[0];
    res.json({
      success: true,
      notification: {
        id: n.id,
        sharedTodoId: n.shared_todo_id,
        todoText: n.todo_text,
        setDate: n.set_date,
        setTime: n.set_time,
        remarks: n.remarks,
        notifyTime: n.notify_time,
        isSent: n.is_sent === 1
      }
    });
  } catch (err) {
    logger.notifyError('获取共享通知', '获取共享待办通知失败', { userId, sharedTodoId, error: err.message });
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

const updateShared = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { notifyTime } = req.body;
  
  if (!notifyTime) {
    return res.status(400).json({
      success: false,
      message: '缺少通知时间'
    });
  }
  
  try {
    const notifyDate = new Date(Number(notifyTime));
    const notifyTimeStr = notifyDate.getFullYear() + '-' + 
      String(notifyDate.getMonth() + 1).padStart(2, '0') + '-' + 
      String(notifyDate.getDate()).padStart(2, '0') + ' ' + 
      String(notifyDate.getHours()).padStart(2, '0') + ':' + 
      String(notifyDate.getMinutes()).padStart(2, '0') + ':' + 
      String(notifyDate.getSeconds()).padStart(2, '0');
    
    const result = await query(
      'UPDATE shared_todo_notifications SET notify_time = ?, updated_at = NOW() WHERE id = ? AND user_id = ?',
      [notifyTimeStr, id, userId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: '通知不存在'
      });
    }
    
    res.json({
      success: true,
      message: '通知已更新'
    });
  } catch (err) {
    logger.notifyError('更新共享通知', '更新共享待办通知失败', { userId, error: err.message });
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

const cancelShared = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  
  try {
    const result = await query(
      'DELETE FROM shared_todo_notifications WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: '通知不存在'
      });
    }
    
    res.json({
      success: true,
      message: '通知已取消'
    });
  } catch (err) {
    logger.notifyError('取消共享通知', '取消共享待办通知失败', { userId, error: err.message });
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

const sendApprovalResult = async (req, res) => {
  const userId = req.user.id;
  const { templateId, toUserId, comboId, shareCode, approved, data } = req.body;
  
  if (!toUserId || !data) {
    return res.status(400).json({
      success: false,
      message: '缺少必要参数'
    });
  }
  
  try {
    const users = await query(
      'SELECT id, openid FROM users WHERE id = ?',
      [toUserId]
    );
    
    if (users.length === 0) {
      return res.json({
        success: true,
        message: '用户不存在，跳过发送'
      });
    }
    
    const targetUser = users[0];
    
    if (!targetUser.openid) {
      return res.json({
        success: true,
        message: '用户openid不存在，跳过发送'
      });
    }
    
    const result = await sendApprovalResultMessage(targetUser.openid, {
      comboId: comboId,
      shareCode: shareCode,
      approved: approved,
      thing28: data.thing28?.value || '申请加入协作组',
      time52: data.time52?.value || '',
      time26: data.time26?.value || '',
      phrase1: data.phrase1?.value || '已通过',
      name2: data.name2?.value || '管理员'
    });
    
    if (result.success) {
      logger.notifySend('审批结果', '审批结果通知发送成功', { msgid: result.msgid });
      res.json({
        success: true,
        message: '通知发送成功',
        msgid: result.msgid
      });
    } else {
      logger.notifyError('审批结果', '审批结果通知发送失败', { result });
      res.json({
        success: true,
        message: '通知发送失败，但不影响审批操作'
      });
    }
  } catch (err) {
    logger.notifyError('发送审批结果', '发送审批结果通知失败', { error: err.message });
    res.json({
      success: true,
      message: '发送通知时发生错误，但不影响审批操作'
    });
  }
};

module.exports = {
  subscribe,
  schedule,
  getByTodoId,
  update,
  cancel,
  getList,
  testSend,
  scheduleShared,
  getSharedByTodoId,
  updateShared,
  cancelShared,
  sendApprovalResult
};

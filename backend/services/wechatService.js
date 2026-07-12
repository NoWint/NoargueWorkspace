const axios = require('axios');
const { query } = require('../config/database');
const logger = require('../utils/logger');

const APPID = process.env.WECHAT_APPID;
const SECRET = process.env.WECHAT_SECRET;

const TEMPLATE_ID = '1jvRWbLBNSasPzKtUnrQEiVrU6hj2lWwhKNq2u8jjWg';
const SHARED_TODO_TEMPLATE_ID = '1jvRWbLBNSasPzKtUnrQEviO7vwbWCChJJr0z24an-Y';
const APPROVAL_RESULT_TEMPLATE_ID = 'LenG38LPKm6kK4ymXx4Ftoc9LoN2f7xXh7qJ-U-myxA';
const REPORT_TEMPLATE_ID = 'yXtj85psFqKHQsAbcjxFo5wYX8SdU4acoYiENIRpiAE';

let accessTokenCache = {
  token: null,
  expiresAt: 0
};

let accessTokenPromise = null;

async function getAccessToken() {
  const now = Date.now();

  if (accessTokenCache.token && accessTokenCache.expiresAt > now + 60000) {
    accessTokenPromise = null;
    return accessTokenCache.token;
  }

  if (accessTokenPromise) {
    return accessTokenPromise;
  }

  accessTokenPromise = (async () => {
    try {
      const response = await axios.get('https://api.weixin.qq.com/cgi-bin/token', {
        params: {
          grant_type: 'client_credential',
          appid: APPID,
          secret: SECRET
        }
      });

      const { access_token, expires_in, errcode, errmsg } = response.data;

      if (errcode) {
        logger.wechatError('access_token', '获取access_token失败', { errcode, errmsg });
        throw new Error(errmsg);
      }

      accessTokenCache.token = access_token;
      accessTokenCache.expiresAt = Date.now() + expires_in * 1000;

      logger.wechatApi('access_token', 'access_token已更新', { expiresIn: expires_in });
      return access_token;
    } catch (err) {
      logger.wechatError('access_token', '获取access_token错误', { error: err.message });
      throw err;
    }
  })();

  try {
    return await accessTokenPromise;
  } finally {
    accessTokenPromise = null;
  }
}

async function sendSubscribeMessage(openid, data) {
  const accessToken = await getAccessToken();
  
  let locationText = '无';
  if (data.location) {
    try {
      const locObj = typeof data.location === 'string' ? JSON.parse(data.location) : data.location;
      locationText = locObj.name || data.location;
    } catch (e) {
      locationText = String(data.location).substring(0, 20);
    }
  }
  
  let page = 'pages/todo/todo';
  if (data.todoId) {
    page = `pages/todo-detail/todo-detail?id=${data.todoId}`;
  }
  
  const messageData = {
    touser: openid,
    template_id: TEMPLATE_ID,
    page: page,
    data: {
      thing1: { value: (data.todoText || '待办事项').substring(0, 20) },
      time11: { value: data.notifyTime || '' },
      time2: { value: data.deadline || '' },
      thing3: { value: locationText.substring(0, 20) },
      thing13: { value: (data.remarks || '无').substring(0, 20) }
    }
  };
  
  logger.wechatApi('发送订阅消息', '请求参数', { openid, templateId: TEMPLATE_ID, messageData });
  
  try {
    const response = await axios.post(
      `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${accessToken}`,
      messageData
    );
    
    logger.wechatApi('微信API响应', '订阅消息响应', { response: response.data });
    
    const { errcode, errmsg, msgid } = response.data;
    
    if (errcode) {
      logger.wechatError('订阅消息', '发送订阅消息失败', { errcode, errmsg });
      return { success: false, errcode, errmsg };
    }
    
    logger.wechatApi('订阅消息', '发送成功', { msgid });
    return { success: true, msgid };
  } catch (err) {
    logger.wechatError('订阅消息', '发送订阅消息错误', { error: err.message });
    return { success: false, error: err.message };
  }
}

async function sendApprovalResultMessage(openid, data) {
  const accessToken = await getAccessToken();
  
  let page = 'pages/todo/todo';
  if (data.approved === false && data.shareCode) {
    page = `pages/todo/todo?type=combo_invite&code=${data.shareCode}`;
  } else if (data.comboId) {
    page = `pages/combo-detail/combo-detail?id=${data.comboId}`;
  }
  
  const messageData = {
    touser: openid,
    template_id: APPROVAL_RESULT_TEMPLATE_ID,
    page: page,
    data: {
      thing28: { value: data.thing28 || '申请加入协作组' },
      time52: { value: data.time52 || '' },
      time26: { value: data.time26 || '' },
      phrase1: { value: data.phrase1 || '已通过' },
      name2: { value: data.name2 || '管理员' }
    }
  };
  
  logger.wechatApi('发送审批结果通知', '请求参数', { openid, templateId: APPROVAL_RESULT_TEMPLATE_ID, messageData });
  
  try {
    const response = await axios.post(
      `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${accessToken}`,
      messageData
    );
    
    logger.wechatApi('微信API响应', '审批结果通知响应', { response: response.data });
    
    const { errcode, errmsg, msgid } = response.data;
    
    if (errcode) {
      logger.wechatError('审批结果通知', '发送失败', { errcode, errmsg });
      return { success: false, errcode, errmsg };
    }
    
    logger.wechatApi('审批结果通知', '发送成功', { msgid });
    return { success: true, msgid };
  } catch (err) {
    logger.wechatError('审批结果通知', '发送错误', { error: err.message });
    return { success: false, error: err.message };
  }
}

async function sendSharedTodoMessage(openid, data) {
  const accessToken = await getAccessToken();
  
  let page = 'pages/todo/todo';
  if (data.sharedTodoId && data.comboId) {
    page = `pages/todo-detail/todo-detail?sharedTodoId=${data.sharedTodoId}&comboId=${data.comboId}`;
  }
  
  const messageData = {
    touser: openid,
    template_id: SHARED_TODO_TEMPLATE_ID,
    page: page,
    data: {
      thing1: { value: (data.todoText || '待办事项').substring(0, 20) },
      thing14: { value: (data.creator || '用户').substring(0, 10) },
      time2: { value: data.deadline || '' },
      thing28: { value: (data.comboName || '共享组合').substring(0, 20) },
      thing13: { value: (data.remarks || '无').substring(0, 20) }
    }
  };
  
  logger.wechatApi('发送共享待办通知', '请求参数', { openid, templateId: SHARED_TODO_TEMPLATE_ID, messageData });
  
  try {
    const response = await axios.post(
      `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${accessToken}`,
      messageData
    );
    
    logger.wechatApi('微信API响应', '共享待办通知响应', { response: response.data });
    
    const { errcode, errmsg, msgid } = response.data;
    
    if (errcode) {
      logger.wechatError('共享待办通知', '发送失败', { errcode, errmsg });
      return { success: false, errcode, errmsg };
    }
    
    logger.wechatApi('共享待办通知', '发送成功', { msgid });
    return { success: true, msgid };
  } catch (err) {
    logger.wechatError('共享待办通知', '发送错误', { error: err.message });
    return { success: false, error: err.message };
  }
}

async function processPendingNotifications() {
  try {
    const now = new Date();
    const fiveMinutesLater = new Date(now.getTime() + 5 * 60 * 1000);
    
    logger.notifySchedule('调度器检查', '当前时间', { now: now.toLocaleString('zh-CN'), deadline: fiveMinutesLater.toLocaleString('zh-CN') });
    
    // 使用MySQL的NOW()函数进行比较，避免时区问题
    const notifications = await query(
      `SELECT n.*, u.openid, t.id as todo_db_id, t.todo_id, t.text as todo_text, t.set_date, t.set_time, t.remarks, t.location_text
       FROM todo_notifications n
       LEFT JOIN users u ON n.user_id = u.id
       LEFT JOIN todos t ON n.todo_id = t.id
       WHERE n.is_sent = 0 
         AND n.notify_time <= DATE_ADD(NOW(), INTERVAL 5 MINUTE)
         AND u.openid IS NOT NULL
       ORDER BY n.notify_time ASC
       LIMIT 100`
    );
    
    logger.notifySchedule('发现通知', `发现 ${notifications.length} 条待发送通知`);
    
    for (const notification of notifications) {
      logger.notifySchedule('处理通知', '开始处理', { 
        id: notification.id, 
        notifyTime: notification.notify_time,
        setDate: notification.set_date,
        setTime: notification.set_time,
        todoText: notification.todo_text,
        hasOpenid: !!notification.openid
      });
      
      // 处理时间 - 数据库存的是本地时间字符串，需要正确解析
      let notifyTimeStr = '';
      if (notification.notify_time) {
        if (typeof notification.notify_time === 'string') {
          const parts = notification.notify_time.substring(0, 16).split(' ');
          const dateParts = parts[0].split('-');
          notifyTimeStr = `${dateParts[0]}年${dateParts[1]}月${dateParts[2]}日 ${parts[1]}`;
        } else {
          const notifyDate = new Date(notification.notify_time);
          notifyTimeStr = `${notifyDate.getFullYear()}年${(notifyDate.getMonth() + 1).toString().padStart(2, '0')}月${notifyDate.getDate().toString().padStart(2, '0')}日 ${notifyDate.getHours().toString().padStart(2, '0')}:${notifyDate.getMinutes().toString().padStart(2, '0')}`;
        }
      }
      
      let deadlineStr = '';
      if (notification.set_date) {
        if (typeof notification.set_date === 'string') {
          const dateParts = notification.set_date.split('-');
          deadlineStr = `${dateParts[0]}年${dateParts[1]}月${dateParts[2]}日 ${notification.set_time || '12:00'}`;
        } else {
          const deadlineDate = new Date(notification.set_date);
          deadlineStr = `${deadlineDate.getFullYear()}年${(deadlineDate.getMonth() + 1).toString().padStart(2, '0')}月${deadlineDate.getDate().toString().padStart(2, '0')}日 ${notification.set_time || '12:00'}`;
        }
      }
      
      logger.notifySchedule('处理时间', '时间处理完成', { notifyTimeStr, deadlineStr });
      
      const result = await sendSubscribeMessage(notification.openid, {
        todoId: notification.todo_id || notification.todo_db_id,
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
        logger.notifySend('发送成功', `通知 ${notification.id} 发送成功`);
      } else {
        logger.notifyError('发送失败', `通知 ${notification.id} 发送失败`, { result });
      }
    }
    
    return { processed: notifications.length };
  } catch (err) {
    logger.notifyError('处理通知', '处理待发送通知错误', { error: err.message });
    return { error: err.message };
  }
}

async function processPendingSharedNotifications() {
  try {
    const now = new Date();
    logger.notifySchedule('共享待办调度器', '当前时间', { now: now.toLocaleString('zh-CN') });
    
    const notifications = await query(
      `SELECT n.*, u.openid, st.text as todo_text, st.set_date, st.set_time, 
              st.remarks, st.id as shared_todo_id, st.creator_id,
              c.name as combo_name, c.id as combo_id,
              cr.nickname as creator_name
       FROM shared_todo_notifications n
       LEFT JOIN users u ON n.user_id = u.id
       LEFT JOIN shared_todos st ON n.shared_todo_id = st.id
       LEFT JOIN combos c ON st.combo_id = c.id
       LEFT JOIN users cr ON st.creator_id = cr.id
       WHERE n.is_sent = 0 
         AND n.notify_time <= DATE_ADD(NOW(), INTERVAL 5 MINUTE)
         AND u.openid IS NOT NULL
         AND st.is_deleted = 0
       ORDER BY n.notify_time ASC
       LIMIT 100`
    );
    
    logger.notifySchedule('发现共享通知', `发现 ${notifications.length} 条待发送共享待办通知`);
    
    for (const notification of notifications) {
      logger.notifySchedule('处理共享通知', '开始处理', { 
        id: notification.id, 
        todoText: notification.todo_text,
        hasOpenid: !!notification.openid
      });
      
      let deadlineStr = '';
      if (notification.set_date) {
        const dateStr = typeof notification.set_date === 'string'
          ? notification.set_date
          : formatLocalDate(notification.set_date);
        const timeStr = notification.set_time || '12:00';

        const dateParts = dateStr.split('-');
        deadlineStr = `${dateParts[0]}年${dateParts[1]}月${dateParts[2]}日 ${timeStr}`;
      }
      
      const result = await sendSharedTodoMessage(notification.openid, {
        sharedTodoId: notification.shared_todo_id,
        comboId: notification.combo_id,
        todoText: notification.todo_text || '待办事项',
        creator: notification.creator_name || '用户',
        deadline: deadlineStr,
        comboName: notification.combo_name || '共享组合',
        remarks: notification.remarks || '无'
      });
      
      if (result.success) {
        await query(
          'UPDATE shared_todo_notifications SET is_sent = 1, sent_at = NOW(), template_msg_id = ? WHERE id = ?',
          [result.msgid, notification.id]
        );
        logger.notifySend('发送成功', `共享待办通知 ${notification.id} 发送成功`);
      } else {
        logger.notifyError('发送失败', `共享待办通知 ${notification.id} 发送失败`, { result });
      }
    }
    
    return { processed: notifications.length };
  } catch (err) {
    logger.notifyError('处理共享通知', '处理共享待办通知错误', { error: err.message });
    return { error: err.message };
  }
}

function startNotificationScheduler() {
  logger.systemInfo('启动调度器', '启动通知调度器');
  
  setInterval(async () => {
    try {
      await processPendingNotifications();
      await processPendingSharedNotifications();
    } catch (err) {
      logger.systemError('定时任务', '定时任务执行错误', { error: err.message });
    }
  }, 60000);
  
  processPendingNotifications().catch(err => {
    logger.systemError('初始通知', '初始通知处理错误', { error: err.message });
  });
  
  processPendingSharedNotifications().catch(err => {
    logger.systemError('初始共享通知', '初始共享待办通知处理错误', { error: err.message });
  });
}

async function getUnlimitedQRCode(scene, page = 'pages/login/login', options = {}) {
  const accessToken = await getAccessToken();

  const requestData = {
    scene: scene,
    page: page,
    width: 430,
    auto_color: false,
    line_color: { r: 0, g: 178, b: 106 },
    check_path: options.check_path !== undefined ? options.check_path : false,
    env_version: options.env_version || process.env.QR_CODE_ENV_VERSION || 'release'
  };

  logger.wechatApi('生成小程序码', '请求参数', { scene, page, env_version: requestData.env_version, check_path: requestData.check_path });
  
  try {
    const response = await axios.post(
      `https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${accessToken}`,
      requestData,
      { responseType: 'arraybuffer' }
    );
    
    const contentType = response.headers['content-type'];
    
    if (contentType && contentType.includes('application/json')) {
      const errorData = JSON.parse(response.data.toString());
      logger.wechatError('小程序码', '生成小程序码失败', { error: errorData });
      throw new Error(errorData.errmsg || '生成小程序码失败');
    }
    
    logger.wechatApi('小程序码', '生成成功', { size: response.data.length });
    return response.data;
  } catch (err) {
    logger.wechatError('小程序码', '生成小程序码错误', { error: err.message });
    throw err;
  }
}

async function sendReportResultMessage(openid, data) {
  try {
    const accessToken = await getAccessToken();
    const url = `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${accessToken}`;

    const body = {
      touser: openid,
      template_id: REPORT_TEMPLATE_ID,
      data: {
        thing1: { value: (data.title || '').substring(0, 20) },
        thing2: { value: (data.reason || '').substring(0, 20) },
        thing5: { value: (data.targetType || '帖子').substring(0, 20) },
        thing3: { value: (data.result || '').substring(0, 20) },
        time4: { value: data.processedAt ? new Date(data.processedAt).toLocaleString('zh-CN') : '' }
      }
    };

    const response = await axios.post(url, body);
    if (response.data.errcode && response.data.errcode !== 0) {
      logger.warn('WECHAT', '发送举报结果通知失败', { errcode: response.data.errcode, errmsg: response.data.errmsg });
    } else {
      logger.info('WECHAT', '举报结果通知发送成功', { openid });
    }
  } catch (err) {
    logger.wechatError('发送举报结果通知', err.message, { openid });
  }
}

// 格式化 Date 对象为本地日期字符串（避免 toISOString 时区偏移）
function formatLocalDate(date) {
  if (!date) return '';
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

module.exports = {
  getAccessToken,
  sendSubscribeMessage,
  sendSharedTodoMessage,
  sendApprovalResultMessage,
  sendReportResultMessage,
  processPendingNotifications,
  processPendingSharedNotifications,
  startNotificationScheduler,
  getUnlimitedQRCode
};

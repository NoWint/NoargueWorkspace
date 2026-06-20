const { query } = require('../config/database');
const logger = require('../utils/logger');
const { getUnlimitedQRCode } = require('../services/wechatService');

const getFullAvatarUrl = (avatarUrl) => {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    return avatarUrl;
  }
  if (avatarUrl.startsWith('/uploads/')) {
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    return `${baseUrl}${avatarUrl}`;
  }
  return null;
};

const join = async (req, res) => {
  const userId = req.user.id;
  const { shareCode } = req.body;
  
  if (!shareCode || shareCode.length !== 6) {
    return res.status(400).json({
      success: false,
      message: '邀请码格式不正确'
    });
  }
  
  try {
    const combos = await query(
      `SELECT c.*, u.nickname as owner_name, u.avatar_url as owner_avatar,
        (SELECT COUNT(*) FROM combo_members WHERE combo_id = c.id) as member_count,
        (SELECT COUNT(*) FROM todos WHERE combo_id = c.id AND is_deleted = 0) as todo_count,
        (SELECT COUNT(*) FROM shared_todos WHERE combo_id = c.id AND is_deleted = 0) as shared_todo_count
       FROM combos c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.share_code = ? AND c.is_shared = 1`,
      [shareCode]
    );
    
    if (combos.length === 0) {
      return res.status(404).json({
        success: false,
        message: '未找到该组合'
      });
    }
    
    const combo = combos[0];
    
    const existingMembers = await query(
      'SELECT * FROM combo_members WHERE combo_id = ? AND user_id = ?',
      [combo.id, userId]
    );
    
    if (existingMembers.length > 0) {
      return res.json({
        success: true,
        isMember: true,
        combo: {
          id: combo.id,
          name: combo.name,
          icon: combo.icon,
          color: combo.color,
          memberCount: combo.member_count,
          memberLimit: combo.member_limit,
          todoCount: combo.is_shared === 1 ? combo.shared_todo_count : combo.todo_count,
          ownerName: combo.owner_name,
          ownerAvatar: getFullAvatarUrl(combo.owner_avatar)
        }
      });
    }
    
    const memberFull = combo.member_count >= combo.member_limit;
    
    const existingRequests = await query(
      'SELECT * FROM collab_requests WHERE combo_id = ? AND user_id = ? AND status = "pending"',
      [combo.id, userId]
    );
    
    if (existingRequests.length > 0) {
      return res.json({
        success: true,
        isMember: false,
        hasPendingRequest: true,
        memberFull,
        combo: {
          id: combo.id,
          name: combo.name,
          icon: combo.icon,
          color: combo.color,
          memberCount: combo.member_count,
          memberLimit: combo.member_limit,
          todoCount: combo.is_shared === 1 ? combo.shared_todo_count : combo.todo_count,
          ownerName: combo.owner_name,
          ownerAvatar: getFullAvatarUrl(combo.owner_avatar)
        }
      });
    }
    
    const rejectedRequests = await query(
      'SELECT * FROM collab_requests WHERE combo_id = ? AND user_id = ? AND status = "rejected" ORDER BY created_at DESC LIMIT 1',
      [combo.id, userId]
    );
    
    if (rejectedRequests.length > 0) {
      return res.json({
        success: true,
        isMember: false,
        hasPendingRequest: false,
        hasRejectedRequest: true,
        memberFull,
        rejectedRequest: {
          id: rejectedRequests[0].id,
          message: rejectedRequests[0].message,
          createdAt: rejectedRequests[0].created_at,
          processedAt: rejectedRequests[0].processed_at
        },
        combo: {
          id: combo.id,
          name: combo.name,
          icon: combo.icon,
          color: combo.color,
          memberCount: combo.member_count,
          memberLimit: combo.member_limit,
          todoCount: combo.is_shared === 1 ? combo.shared_todo_count : combo.todo_count,
          ownerName: combo.owner_name,
          ownerAvatar: getFullAvatarUrl(combo.owner_avatar)
        }
      });
    }
    
    res.json({
      success: true,
      isMember: false,
      hasPendingRequest: false,
      memberFull,
      combo: {
        id: combo.id,
        name: combo.name,
        icon: combo.icon,
        color: combo.color,
        memberCount: combo.member_count,
        memberLimit: combo.member_limit,
        todoCount: combo.is_shared === 1 ? combo.shared_todo_count : combo.todo_count,
        ownerName: combo.owner_name,
        ownerAvatar: getFullAvatarUrl(combo.owner_avatar)
      }
    });
  } catch (err) {
    logger.collabError('查询组合', '查询组合失败', { userId, error: err.message });
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

const sendRequest = async (req, res) => {
  const userId = req.user.id;
  const { shareCode, message } = req.body;
  
  try {
    const combos = await query(
      'SELECT * FROM combos WHERE share_code = ? AND is_shared = 1',
      [shareCode]
    );
    
    if (combos.length === 0) {
      return res.status(404).json({
        success: false,
        message: '未找到该组合'
      });
    }
    
    const combo = combos[0];
    
    const existingMembers = await query(
      'SELECT * FROM combo_members WHERE combo_id = ? AND user_id = ?',
      [combo.id, userId]
    );
    
    if (existingMembers.length > 0) {
      return res.status(400).json({
        success: false,
        message: '您已是该组成员'
      });
    }
    
    const pendingRequests = await query(
      'SELECT * FROM collab_requests WHERE combo_id = ? AND user_id = ? AND status = "pending"',
      [combo.id, userId]
    );
    
    if (pendingRequests.length > 0) {
      return res.status(400).json({
        success: false,
        message: '您已有待审批的申请，请等待处理'
      });
    }
    
    const memberCount = await query(
      'SELECT COUNT(*) as count FROM combo_members WHERE combo_id = ?',
      [combo.id]
    );
    
    if (memberCount[0].count >= combo.member_limit) {
      return res.status(400).json({
        success: false,
        message: '该组合成员已满'
      });
    }
    
    await query(
      'INSERT INTO collab_requests (combo_id, user_id, message, status, created_at) VALUES (?, ?, ?, "pending", NOW())',
      [combo.id, userId, message || null]
    );
    
    res.json({
      success: true,
      message: '申请已发送，请等待审批'
    });
  } catch (err) {
    logger.collabError('发送申请', '发送申请失败', { userId, error: err.message });
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

const getRequests = async (req, res) => {
  const userId = req.user.id;
  const { comboId } = req.query;
  
  try {
    let sql = `
      SELECT cr.*, u.nickname, u.avatar_url, c.name as combo_name
      FROM collab_requests cr
      LEFT JOIN users u ON cr.user_id = u.id
      LEFT JOIN combos c ON cr.combo_id = c.id
      WHERE cr.status = "pending"
    `;
    const params = [];
    
    if (comboId) {
      sql += ' AND cr.combo_id = ?';
      params.push(comboId);
    }
    
    sql += ' ORDER BY cr.created_at DESC';
    
    const requests = await query(sql, params);
    
    const filteredRequests = [];
    for (const request of requests) {
      const members = await query(
        'SELECT role FROM combo_members WHERE combo_id = ? AND user_id = ?',
        [request.combo_id, userId]
      );
      
      if (members.length > 0 && (members[0].role === 'owner' || members[0].role === 'admin')) {
        filteredRequests.push({
          id: request.id,
          comboId: request.combo_id,
          comboName: request.combo_name,
          userId: request.user_id,
          nickname: request.nickname,
          avatarUrl: getFullAvatarUrl(request.avatar_url),
          message: request.message,
          status: request.status,
          createdAt: request.created_at
        });
      }
    }
    
    res.json({
      success: true,
      requests: filteredRequests
    });
  } catch (err) {
    logger.collabError('获取申请', '获取申请列表失败', { userId, error: err.message });
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

const approveRequest = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  
  try {
    const requests = await query(
      'SELECT * FROM collab_requests WHERE id = ? AND status = "pending"',
      [id]
    );
    
    if (requests.length === 0) {
      return res.status(404).json({
        success: false,
        message: '申请不存在或已处理'
      });
    }
    
    const request = requests[0];
    
    const members = await query(
      'SELECT role FROM combo_members WHERE combo_id = ? AND user_id = ?',
      [request.combo_id, userId]
    );
    
    if (members.length === 0 || (members[0].role !== 'owner' && members[0].role !== 'admin')) {
      return res.status(403).json({
        success: false,
        message: '无权审批此申请'
      });
    }
    
    const user = await query('SELECT nickname FROM users WHERE id = ?', [request.user_id]);
    
    await query(
      'INSERT INTO combo_members (combo_id, user_id, role, nickname, joined_at) VALUES (?, ?, "member", ?, NOW())',
      [request.combo_id, request.user_id, user[0]?.nickname || '']
    );
    
    const allAssignTodos = await query(
      `SELECT id, exclude_type, creator_id FROM shared_todos WHERE combo_id = ? AND assign_type IN ('all', 'any') AND is_deleted = 0`,
      [request.combo_id]
    );
    
    for (const todo of allAssignTodos) {
      let shouldAssign = true;
      
      if (todo.exclude_type) {
        if (todo.exclude_type === 'owner') {
          shouldAssign = true;
        } else if (todo.exclude_type === 'self') {
          shouldAssign = request.user_id !== todo.creator_id;
        } else if (todo.exclude_type === 'admins') {
          shouldAssign = true;
        }
      }
      
      if (shouldAssign) {
        await query(
          'INSERT INTO shared_todo_assignments (shared_todo_id, user_id) VALUES (?, ?)',
          [todo.id, request.user_id]
        );
      }
    }
    
    await query(
      'UPDATE collab_requests SET status = "approved", processed_at = NOW(), processed_by = ? WHERE id = ?',
      [userId, id]
    );
    
    res.json({
      success: true,
      message: '申请已通过'
    });
  } catch (err) {
    logger.collabError('审批', '审批申请失败', { userId, requestId, error: err.message });
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

const rejectRequest = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  
  try {
    const requests = await query(
      'SELECT * FROM collab_requests WHERE id = ? AND status = "pending"',
      [id]
    );
    
    if (requests.length === 0) {
      return res.status(404).json({
        success: false,
        message: '申请不存在或已处理'
      });
    }
    
    const request = requests[0];
    
    const members = await query(
      'SELECT role FROM combo_members WHERE combo_id = ? AND user_id = ?',
      [request.combo_id, userId]
    );
    
    if (members.length === 0 || (members[0].role !== 'owner' && members[0].role !== 'admin')) {
      return res.status(403).json({
        success: false,
        message: '无权审批此申请'
      });
    }
    
    await query(
      'UPDATE collab_requests SET status = "rejected", processed_at = NOW(), processed_by = ? WHERE id = ?',
      [userId, id]
    );
    
    res.json({
      success: true,
      message: '申请已拒绝'
    });
  } catch (err) {
    logger.collabError('拒绝', '拒绝申请失败', { userId, requestId, error: err.message });
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

const getSharedList = async (req, res) => {
  const userId = req.user.id;
  
  try {
    const sharedCombos = await query(
      `SELECT c.*, cm.role,
        (SELECT COUNT(*) FROM shared_todos WHERE combo_id = c.id AND is_deleted = 0) as todo_count,
        (SELECT COUNT(*) FROM combo_members WHERE combo_id = c.id) as member_count
       FROM combo_members cm
       JOIN combos c ON cm.combo_id = c.id
       WHERE cm.user_id = ? AND c.is_shared = 1
       ORDER BY cm.joined_at DESC`,
      [userId]
    );
    
    res.json({
      success: true,
      sharedCombos: sharedCombos.map(combo => ({
        id: combo.id,
        name: combo.name,
        icon: combo.icon,
        color: combo.color,
        role: combo.role,
        shareCode: combo.share_code,
        todoCount: combo.todo_count,
        memberCount: combo.member_count
      }))
    });
  } catch (err) {
    logger.collabError('获取共享', '获取共享组合列表失败', { userId, error: err.message });
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

const createSharedTodo = async (req, res) => {
  const userId = req.user.id;
  const { comboId } = req.params;
  const { text, parent_id, setDate, setTime, remarks, location, assignType, assigneeIds, tags, excludeType, images, priority } = req.body;
  
  if (!text || !text.trim()) {
    return res.status(400).json({
      success: false,
      message: '待办内容不能为空'
    });
  }
  
  try {
    const members = await query(
      'SELECT role FROM combo_members WHERE combo_id = ? AND user_id = ?',
      [comboId, userId]
    );
    
    if (members.length === 0 || (members[0].role !== 'owner' && members[0].role !== 'admin')) {
      return res.status(403).json({
        success: false,
        message: '无权创建共享待办'
      });
    }
    
    const tagsJson = tags && tags.length > 0 ? JSON.stringify(tags) : null;
    const imagesJson = images && images.length > 0 ? JSON.stringify(images) : null;
    const locationJson = location ? JSON.stringify(location) : null;
    const effectiveExcludeType = (assignType === 'all' || assignType === 'any') ? (excludeType || '') : '';
    
    const result = await query(
      `INSERT INTO shared_todos
       (combo_id, creator_id, text, parent_id, set_date, set_time, remarks, location_text, assign_type, exclude_type, tags, images, priority, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [comboId, userId, text.trim(), parent_id || null, setDate || null, setTime || null, remarks || null, locationJson, assignType || 'all', effectiveExcludeType, tagsJson, imagesJson, priority || 'p2']
    );
    
    const sharedTodoId = result.insertId;
    
    if (assignType === 'all' || assignType === 'any') {
      let allMembers = await query(
        'SELECT user_id, role FROM combo_members WHERE combo_id = ?',
        [comboId]
      );
      
      if (excludeType) {
        allMembers = allMembers.filter(m => {
          if (excludeType === 'owner' && m.role === 'owner') return false;
          if (excludeType === 'self' && m.user_id === userId) return false;
          if (excludeType === 'admins' && (m.role === 'owner' || m.role === 'admin')) return false;
          return true;
        });
      }
      
      const assignValues = allMembers.map(m => [sharedTodoId, m.user_id]);
      if (assignValues.length > 0) {
        await query(
          'INSERT INTO shared_todo_assignments (shared_todo_id, user_id) VALUES ?',
          [assignValues]
        );
      }
    } else if (assignType === 'specific' && assigneeIds && assigneeIds.length > 0) {
      const assignValues = assigneeIds.map(assigneeId => [sharedTodoId, assigneeId]);
      await query(
        'INSERT INTO shared_todo_assignments (shared_todo_id, user_id) VALUES ?',
        [assignValues]
      );
    }
    
    res.json({
      success: true,
      message: '共享待办创建成功',
      todoId: sharedTodoId
    });
  } catch (err) {
    logger.collabError('创建待办', '创建共享待办失败', { userId, comboId, error: err.message });
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

const completeSharedTodo = async (req, res) => {
  const userId = req.user.id;
  const { comboId, todoId } = req.params;
  const { completed } = req.body;
  
  try {
    const members = await query(
      'SELECT * FROM combo_members WHERE combo_id = ? AND user_id = ?',
      [comboId, userId]
    );
    
    if (members.length === 0) {
      return res.status(403).json({
        success: false,
        message: '您不是该组成员'
      });
    }
    
    const todos = await query(
      'SELECT * FROM shared_todos WHERE id = ? AND combo_id = ?',
      [todoId, comboId]
    );
    
    if (todos.length === 0) {
      return res.status(404).json({
        success: false,
        message: '待办不存在'
      });
    }
    
    const todo = todos[0];
    const completedAt = completed ? Date.now() : null;
    
    if (todo.assign_type === 'all') {
      await query(
        'INSERT INTO shared_todo_assignments (shared_todo_id, user_id, completed_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE completed_at = ?',
        [todoId, userId, completedAt, completedAt]
      );
      
      if (!completed) {
        await query(
          'UPDATE shared_todos SET completed_at = NULL WHERE id = ?',
          [todoId]
        );
      } else {
        const assignments = await query(
          'SELECT COUNT(*) as total, SUM(CASE WHEN completed_at > 0 THEN 1 ELSE 0 END) as completed FROM shared_todo_assignments WHERE shared_todo_id = ?',
          [todoId]
        );
        
        const memberCount = await query(
          'SELECT COUNT(*) as count FROM combo_members WHERE combo_id = ?',
          [comboId]
        );
        
        if (assignments[0].completed >= memberCount[0].count) {
          await query(
            'UPDATE shared_todos SET completed_at = ? WHERE id = ?',
            [Date.now(), todoId]
          );
        }
      }
    } else if (todo.assign_type === 'any') {
      const existingAssignment = await query(
        'SELECT completed_at FROM shared_todo_assignments WHERE shared_todo_id = ? AND user_id = ?',
        [todoId, userId]
      );
      const isMyCompleted = existingAssignment.length > 0 && existingAssignment[0].completed_at;
      
      if (completed && todo.completed_at && !isMyCompleted) {
        return res.status(400).json({
          success: false,
          message: '该待办已被其他人完成'
        });
      }
      
      await query(
        'INSERT INTO shared_todo_assignments (shared_todo_id, user_id, completed_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE completed_at = ?',
        [todoId, userId, completedAt, completedAt]
      );
      
      if (!completed) {
        const assignments = await query(
          'SELECT COUNT(*) as completed FROM shared_todo_assignments WHERE shared_todo_id = ? AND completed_at > 0',
          [todoId]
        );
        
        if (assignments[0].completed === 0) {
          await query(
            'UPDATE shared_todos SET completed_at = NULL WHERE id = ?',
            [todoId]
          );
        }
      } else {
        await query(
          'UPDATE shared_todos SET completed_at = ? WHERE id = ?',
          [Date.now(), todoId]
        );
      }
    } else {
      await query(
        'UPDATE shared_todo_assignments SET completed_at = ? WHERE shared_todo_id = ? AND user_id = ?',
        [completedAt, todoId, userId]
      );
      
      if (!completed) {
        await query(
          'UPDATE shared_todos SET completed_at = NULL WHERE id = ?',
          [todoId]
        );
      } else {
        const assignments = await query(
          'SELECT COUNT(*) as total, SUM(CASE WHEN completed_at > 0 THEN 1 ELSE 0 END) as completed FROM shared_todo_assignments WHERE shared_todo_id = ?',
          [todoId]
        );
        
        if (assignments[0].completed >= assignments[0].total) {
          await query(
            'UPDATE shared_todos SET completed_at = ? WHERE id = ?',
            [Date.now(), todoId]
          );
        }
      }
    }
    
    res.json({
      success: true,
      message: completed ? '待办完成成功' : '已取消完成'
    });
  } catch (err) {
    logger.collabError('完成待办', '完成共享待办失败', { userId, todoId, error: err.message });
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

const removeMember = async (req, res) => {
  const userId = req.user.id;
  const { comboId, userId: targetUserId } = req.body;
  
  if (!comboId || !targetUserId) {
    return res.status(400).json({
      success: false,
      message: '缺少必要参数'
    });
  }
  
  try {
    const requesters = await query(
      'SELECT role FROM combo_members WHERE combo_id = ? AND user_id = ?',
      [comboId, userId]
    );
    
    if (requesters.length === 0 || (requesters[0].role !== 'owner' && requesters[0].role !== 'admin')) {
      return res.status(403).json({
        success: false,
        message: '无权移除成员'
      });
    }
    
    const targetMember = await query(
      'SELECT role FROM combo_members WHERE combo_id = ? AND user_id = ?',
      [comboId, targetUserId]
    );
    
    if (targetMember.length === 0) {
      return res.status(404).json({
        success: false,
        message: '该成员不存在'
      });
    }
    
    if (targetMember[0].role === 'owner') {
      return res.status(400).json({
        success: false,
        message: '不能移除超管'
      });
    }
    
    await query(
      'DELETE FROM combo_members WHERE combo_id = ? AND user_id = ?',
      [comboId, targetUserId]
    );
    
    await query(
      `DELETE FROM shared_todo_assignments 
       WHERE user_id = ? AND shared_todo_id IN (
         SELECT id FROM shared_todos WHERE combo_id = ?
       )`,
      [targetUserId, comboId]
    );
    
    res.json({
      success: true,
      message: '成员已移除'
    });
  } catch (err) {
    logger.collabError('移除成员', '移除成员失败', { userId, comboId, memberId, error: err.message });
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

const deleteSharedTodo = async (req, res) => {
  const userId = req.user.id;
  const { comboId, todoId } = req.params;
  
  try {
    const members = await query(
      'SELECT role FROM combo_members WHERE combo_id = ? AND user_id = ?',
      [comboId, userId]
    );
    
    if (members.length === 0 || (members[0].role !== 'owner' && members[0].role !== 'admin')) {
      return res.status(403).json({
        success: false,
        message: '无权删除共享待办'
      });
    }
    
    await query(
      'DELETE FROM shared_todo_comments WHERE shared_todo_id = ?',
      [todoId]
    );
    
    await query(
      'DELETE FROM shared_todo_assignments WHERE shared_todo_id = ?',
      [todoId]
    );
    
    await query(
      'DELETE FROM shared_todos WHERE id = ? AND combo_id = ?',
      [todoId, comboId]
    );
    
    res.json({
      success: true,
      message: '待办已删除'
    });
  } catch (err) {
    logger.collabError('删除待办', '删除共享待办失败', { userId, todoId, error: err.message });
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

const updateSharedTodo = async (req, res) => {
  const userId = req.user.id;
  const { comboId, todoId } = req.params;
  const { text, setDate, setTime, remarks, location, tags, assignType, assigneeIds, excludeType, images, priority } = req.body;
  
  if (!text || !text.trim()) {
    return res.status(400).json({
      success: false,
      message: '待办内容不能为空'
    });
  }
  
  try {
    const members = await query(
      'SELECT role FROM combo_members WHERE combo_id = ? AND user_id = ?',
      [comboId, userId]
    );
    
    if (members.length === 0 || (members[0].role !== 'owner' && members[0].role !== 'admin')) {
      return res.status(403).json({
        success: false,
        message: '无权编辑共享待办，仅管理员可编辑'
      });
    }
    
    const tagsJson = tags && tags.length > 0 ? JSON.stringify(tags) : null;
    const imagesJson = images && images.length > 0 ? JSON.stringify(images) : null;
    const locationJson = location ? JSON.stringify(location) : null;
    const effectiveExcludeType = (assignType === 'all' || assignType === 'any') ? (excludeType || '') : '';
    
    await query(
      `UPDATE shared_todos SET text = ?, set_date = ?, set_time = ?, remarks = ?, location_text = ?, assign_type = ?, exclude_type = ?, tags = ?, images = ?, priority = ?, updated_at = NOW() WHERE id = ? AND combo_id = ?`,
      [text.trim(), setDate || null, setTime || '12:00', remarks || null, locationJson, assignType || 'all', effectiveExcludeType, tagsJson, imagesJson, priority || 'p2', todoId, comboId]
    );
    
    if (assignType === 'specific' && assigneeIds && assigneeIds.length > 0) {
      const existingAssignments = await query(
        'SELECT user_id FROM shared_todo_assignments WHERE shared_todo_id = ?',
        [todoId]
      );
      const existingUserIds = existingAssignments.map(a => a.user_id);
      
      const newUserIds = assigneeIds.filter(id => !existingUserIds.includes(id));
      const removedUserIds = existingUserIds.filter(id => !assigneeIds.includes(id));
      
      if (removedUserIds.length > 0) {
        await query(
          'DELETE FROM shared_todo_assignments WHERE shared_todo_id = ? AND user_id IN (?)',
          [todoId, removedUserIds]
        );
      }
      
      if (newUserIds.length > 0) {
        const assignValues = newUserIds.map(assigneeId => [todoId, assigneeId]);
        await query(
          'INSERT INTO shared_todo_assignments (shared_todo_id, user_id) VALUES ?',
          [assignValues]
        );
      }
    } else if (assignType === 'all' || assignType === 'any') {
      let allMembers = await query(
        'SELECT user_id, role FROM combo_members WHERE combo_id = ?',
        [comboId]
      );
      
      if (excludeType) {
        allMembers = allMembers.filter(m => {
          if (excludeType === 'owner' && m.role === 'owner') return false;
          if (excludeType === 'self' && m.user_id === userId) return false;
          if (excludeType === 'admins' && (m.role === 'owner' || m.role === 'admin')) return false;
          return true;
        });
      }
      
      const existingAssignments = await query(
        'SELECT user_id FROM shared_todo_assignments WHERE shared_todo_id = ?',
        [todoId]
      );
      const existingUserIds = existingAssignments.map(a => a.user_id);
      
      const newUserIds = allMembers
        .map(m => m.user_id)
        .filter(id => !existingUserIds.includes(id));
      
      if (newUserIds.length > 0) {
        const assignValues = newUserIds.map(uid => [todoId, uid]);
        await query(
          'INSERT INTO shared_todo_assignments (shared_todo_id, user_id) VALUES ?',
          [assignValues]
        );
      }
    }
    
    res.json({
      success: true,
      message: '待办更新成功'
    });
  } catch (err) {
    logger.collabError('更新待办', '更新共享待办失败', { userId, todoId, error: err.message });
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

const leaveCombo = async (req, res) => {
  const userId = req.user.id;
  const { comboId, transferToUserId } = req.body;
  
  if (!comboId) {
    return res.status(400).json({
      success: false,
      message: '缺少组合ID'
    });
  }
  
  try {
    const members = await query(
      'SELECT role FROM combo_members WHERE combo_id = ? AND user_id = ?',
      [comboId, userId]
    );
    
    if (members.length === 0) {
      return res.status(404).json({
        success: false,
        message: '您不是该组合的成员'
      });
    }
    
    const userRole = members[0].role;
    
    if (userRole === 'owner') {
      if (transferToUserId) {
        const targetMember = await query(
          'SELECT role FROM combo_members WHERE combo_id = ? AND user_id = ?',
          [comboId, transferToUserId]
        );
        
        if (targetMember.length === 0) {
          return res.status(404).json({
            success: false,
            message: '目标成员不存在'
          });
        }
        
        await query(
          'UPDATE combo_members SET role = ? WHERE combo_id = ? AND user_id = ?',
          ['admin', comboId, userId]
        );
        
        await query(
          'UPDATE combo_members SET role = ? WHERE combo_id = ? AND user_id = ?',
          ['owner', comboId, transferToUserId]
        );
        
        await query(
          'UPDATE combos SET user_id = ?, updated_at = NOW() WHERE id = ?',
          [transferToUserId, comboId]
        );
      } else {
        const otherMembers = await query(
          'SELECT user_id, role FROM combo_members WHERE combo_id = ? AND user_id != ? ORDER BY role',
          [comboId, userId]
        );
        
        if (otherMembers.length === 0) {
          await query('DELETE FROM shared_todo_comments WHERE shared_todo_id IN (SELECT id FROM shared_todos WHERE combo_id = ?)', [comboId]);
          await query('DELETE FROM shared_todo_assignments WHERE shared_todo_id IN (SELECT id FROM shared_todos WHERE combo_id = ?)', [comboId]);
          await query('DELETE FROM shared_todos WHERE combo_id = ?', [comboId]);
          await query('DELETE FROM combo_members WHERE combo_id = ?', [comboId]);
          await query('DELETE FROM collab_requests WHERE combo_id = ?', [comboId]);
          await query('DELETE FROM combos WHERE id = ?', [comboId]);
          
          return res.json({
            success: true,
            message: '组合已解散'
          });
        }
        
        const newOwner = otherMembers[0];
        await query(
          'UPDATE combo_members SET role = ? WHERE combo_id = ? AND user_id = ?',
          ['admin', comboId, userId]
        );
        
        await query(
          'UPDATE combo_members SET role = ? WHERE combo_id = ? AND user_id = ?',
          ['owner', comboId, newOwner.user_id]
        );
        
        await query(
          'UPDATE combos SET user_id = ?, updated_at = NOW() WHERE id = ?',
          [newOwner.user_id, comboId]
        );
      }
    }
    
    await query(
      'DELETE FROM shared_todo_assignments WHERE user_id = ? AND shared_todo_id IN (SELECT id FROM shared_todos WHERE combo_id = ?)',
      [userId, comboId]
    );
    
    await query(
      'DELETE FROM combo_members WHERE combo_id = ? AND user_id = ?',
      [comboId, userId]
    );
    
    res.json({
      success: true,
      message: userRole === 'owner' ? '已退出并转让超管权限' : '已退出组合'
    });
  } catch (err) {
    logger.collabError('退出', '退出组合失败', { userId, comboId, error: err.message });
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

const autoJoin = async (req, res) => {
  const userId = req.user.id;
  const { shareCode } = req.body;
  
  if (!shareCode || shareCode.length !== 6) {
    return res.status(400).json({
      success: false,
      message: '邀请码格式不正确'
    });
  }
  
  try {
    const combos = await query(
      'SELECT * FROM combos WHERE share_code = ? AND is_shared = 1',
      [shareCode]
    );
    
    if (combos.length === 0) {
      return res.status(404).json({
        success: false,
        message: '未找到该组合'
      });
    }
    
    const combo = combos[0];
    
    const existingMembers = await query(
      'SELECT * FROM combo_members WHERE combo_id = ? AND user_id = ?',
      [combo.id, userId]
    );
    
    if (existingMembers.length > 0) {
      return res.json({
        success: true,
        isMember: true,
        combo: {
          id: combo.id,
          name: combo.name
        }
      });
    }
    
    const memberCount = await query(
      'SELECT COUNT(*) as count FROM combo_members WHERE combo_id = ?',
      [combo.id]
    );
    
    if (memberCount[0].count >= combo.member_limit) {
      return res.status(400).json({
        success: false,
        message: '该组合成员已满'
      });
    }
    
    const user = await query('SELECT nickname FROM users WHERE id = ?', [userId]);
    
    await query(
      'INSERT INTO combo_members (combo_id, user_id, role, nickname, joined_at) VALUES (?, ?, "member", ?, NOW())',
      [combo.id, userId, user[0]?.nickname || '']
    );
    
    const allAssignTodos = await query(
      `SELECT id, exclude_type, creator_id FROM shared_todos WHERE combo_id = ? AND assign_type IN ('all', 'any') AND is_deleted = 0`,
      [combo.id]
    );
    
    for (const todo of allAssignTodos) {
      let shouldAssign = true;
      
      if (todo.exclude_type) {
        if (todo.exclude_type === 'owner') {
          shouldAssign = true;
        } else if (todo.exclude_type === 'self') {
          shouldAssign = userId !== todo.creator_id;
        } else if (todo.exclude_type === 'admins') {
          shouldAssign = true;
        }
      }
      
      if (shouldAssign) {
        await query(
          'INSERT INTO shared_todo_assignments (shared_todo_id, user_id) VALUES (?, ?)',
          [todo.id, userId]
        );
      }
    }
    
    res.json({
      success: true,
      isMember: true,
      combo: {
        id: combo.id,
        name: combo.name,
        icon: combo.icon,
        color: combo.color
      }
    });
  } catch (err) {
    logger.collabError('自动加入', '自动加入失败', { userId, error: err.message });
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

const getQrCode = async (req, res) => {
  const { shareCode, auto, token } = req.query;
  
  if (!shareCode || shareCode.length !== 6) {
    return res.status(400).json({
      success: false,
      message: '邀请码格式不正确'
    });
  }
  
  try {
    const combos = await query(
      'SELECT id FROM combos WHERE share_code = ? AND is_shared = 1',
      [shareCode]
    );
    
    if (combos.length === 0) {
      return res.status(404).json({
        success: false,
        message: '未找到该组合'
      });
    }
    
    const scene = `code=${shareCode}&auto=${auto === '1' ? '1' : '0'}`;
    
    const imageBuffer = await getUnlimitedQRCode(scene);
    
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(imageBuffer);
  } catch (err) {
    logger.collabError('小程序码', '生成小程序码失败', { shareCode, error: err.message });
    res.status(500).json({
      success: false,
      message: '生成小程序码失败'
    });
  }
};

module.exports = {
  join,
  sendRequest,
  getRequests,
  approveRequest,
  rejectRequest,
  getSharedList,
  createSharedTodo,
  updateSharedTodo,
  completeSharedTodo,
  removeMember,
  deleteSharedTodo,
  leaveCombo,
  autoJoin,
  getQrCode
};

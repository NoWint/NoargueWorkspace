const { query, transaction } = require('../config/database');
const { getAdminIds } = require('./adminController');
const logger = require('../utils/logger');

const generateShareCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

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

const getList = async (req, res) => {
  const userId = req.user.id;
  
  try {
    const combos = await query(
      `SELECT c.*, 
        (SELECT COUNT(*) FROM todos WHERE combo_id = c.id AND is_deleted = 0) as todo_count,
        (SELECT COUNT(*) FROM shared_todos WHERE combo_id = c.id AND is_deleted = 0) as shared_todo_count,
        (SELECT COUNT(*) FROM combo_members WHERE combo_id = c.id) as member_count
       FROM combos c 
       WHERE c.user_id = ? 
       ORDER BY c.created_at DESC`,
      [userId]
    );
    
    const combosWithRole = await Promise.all(combos.map(async (combo) => {
      let userRole = 'owner';
      if (combo.is_shared === 1) {
        const members = await query(
          'SELECT role FROM combo_members WHERE combo_id = ? AND user_id = ?',
          [combo.id, userId]
        );
        if (members.length > 0) {
          userRole = members[0].role;
        }
      }
      
      return {
        id: combo.id,
        name: combo.name,
        icon: combo.icon,
        color: combo.color,
        description: combo.description || '',
        isShared: combo.is_shared === 1,
        shareCode: combo.share_code,
        memberLimit: combo.member_limit,
        todoCount: combo.is_shared === 1 ? combo.shared_todo_count : combo.todo_count,
        memberCount: combo.member_count,
        userRole,
        createdAt: combo.created_at
      };
    }));
    
    res.json({
      success: true,
      combos: combosWithRole
    });
  } catch (err) {
    logger.comboError('获取列表', '获取组合列表失败', { userId, error: err.message });
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

const getById = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  // 检测当前用户是否为管理员
  const adminIds = getAdminIds();
  const isAdminUser = adminIds.includes(parseInt(userId, 10));

  try {
    const combos = await query(
      `SELECT c.*,
        (SELECT COUNT(*) FROM todos WHERE combo_id = c.id AND is_deleted = 0) as todo_count,
        (SELECT COUNT(*) FROM posts WHERE combo_id = c.id AND is_deleted = 0) as combo_post_count
       FROM combos c WHERE c.id = ?`,
      [id]
    );
    
    if (combos.length === 0) {
      return res.status(404).json({
        success: false,
        message: '组合不存在'
      });
    }
    
    const combo = combos[0];
    
    let userRole = null;
    if (combo.is_shared === 1) {
      const members = await query(
        'SELECT * FROM combo_members WHERE combo_id = ? AND user_id = ?',
        [id, userId]
      );
      userRole = members.length > 0 ? members[0].role : null;
    } else if (combo.user_id === userId) {
      userRole = 'owner';
    }
    
    const members = await query(
      `SELECT cm.*, u.nickname, u.avatar_url 
       FROM combo_members cm 
       LEFT JOIN users u ON cm.user_id = u.id 
       WHERE cm.combo_id = ?`,
      [id]
    );
    
    let sharedTodos = [];
    if (combo.is_shared === 1) {
      sharedTodos = await query(
        `SELECT st.*, 
          (SELECT COUNT(*) FROM shared_todo_assignments WHERE shared_todo_id = st.id) as assign_count,
          (SELECT COUNT(*) FROM shared_todo_assignments WHERE shared_todo_id = st.id AND completed_at > 0) as completed_count,
          u.nickname as creator_nickname,
          u.avatar_url as creator_avatar
         FROM shared_todos st 
         LEFT JOIN users u ON st.creator_id = u.id
         WHERE st.combo_id = ? AND st.is_deleted = 0
         ORDER BY st.created_at DESC`,
        [id]
      );
      
      for (let i = sharedTodos.length - 1; i >= 0; i--) {
        const todo = sharedTodos[i];
        const assignments = await query(
          `SELECT sta.*, u.nickname, u.avatar_url 
           FROM shared_todo_assignments sta 
           LEFT JOIN users u ON sta.user_id = u.id 
           WHERE sta.shared_todo_id = ?`,
          [todo.id]
        );
        
        if (todo.assign_type === 'specific') {
          const isAssigned = assignments.some(a => a.user_id === userId);
          // 管理员可以查看所有待办（包括未分配给自己的 specific 待办）
          if (!isAssigned && userRole !== 'owner' && userRole !== 'admin' && !isAdminUser) {
            sharedTodos.splice(i, 1);
            continue;
          }
        }
        
        todo.assignments = assignments;
        todo.creator = {
          id: todo.creator_id,
          nickname: todo.creator_nickname,
          avatar: getFullAvatarUrl(todo.creator_avatar)
        };
      }
    }
    
    res.json({
      success: true,
      combo: {
        id: combo.id,
        name: combo.name,
        icon: combo.icon,
        color: combo.color,
        description: combo.description || '',
        isShared: combo.is_shared === 1,
        shareCode: combo.share_code,
        memberLimit: combo.member_limit,
        todoCount: combo.todo_count,
        comboPostCount: combo.combo_post_count || 0,
        userRole,
        members: members.map(m => ({
          id: m.user_id,
          nickname: m.nickname,
          avatarUrl: getFullAvatarUrl(m.avatar_url),
          role: m.role,
          joinedAt: m.joined_at
        })),
        sharedTodos: sharedTodos.map(todo => {
          const userAssignment = (todo.assignments || []).find(a => a.user_id === userId);
          const myCompletedAt = userAssignment ? userAssignment.completed_at : null;
          
          let images = [];
          if (todo.images) {
            try {
              images = typeof todo.images === 'string' ? JSON.parse(todo.images) : todo.images;
              if (!Array.isArray(images)) images = [];
            } catch (e) {
              images = [];
            }
          }
          
          // 格式化 setDate 防止 Date 对象序列化为 UTC ISO 字符串导致日期偏移
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

          return {
            id: todo.id,
            text: todo.text,
            parentId: todo.parent_id,
            priority: todo.priority || 'p2',
            setDate,
            setTime: todo.set_time,
            remarks: todo.remarks,
            location: todo.location_text ? JSON.parse(todo.location_text) : null,
            assignType: todo.assign_type,
            excludeType: todo.exclude_type || '',
            tags: todo.tags ? JSON.parse(todo.tags) : [],
            images: images,
            completedAt: todo.completed_at,
            myCompletedAt: myCompletedAt,
            createdAt: todo.created_at,
            assignCount: todo.assign_count,
            completedCount: todo.completed_count,
            creator: todo.creator,
            assignments: todo.assignments ? todo.assignments.map(a => ({
              userId: a.user_id,
              nickname: a.nickname,
              avatarUrl: getFullAvatarUrl(a.avatar_url),
              completedAt: a.completed_at
            })) : []
          };
        }),
        createdAt: combo.created_at
      }
    });
  } catch (err) {
    logger.comboError('获取详情', '获取组合详情失败', { userId, id, error: err.message });
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

const create = async (req, res) => {
  const userId = req.user.id;
  const { name, icon, color, description, isShared, memberLimit, todoIds } = req.body;
  
  if (!name || !name.trim()) {
    return res.status(400).json({
      success: false,
      message: '组合名称不能为空'
    });
  }
  
  try {
    const countResult = await query(
      'SELECT COUNT(*) as count FROM combos WHERE user_id = ?',
      [userId]
    );
    
    const users = await query('SELECT combo_limit, collab_limit FROM users WHERE id = ?', [userId]);
    const comboLimit = users[0]?.combo_limit || 10;
    const collabLimit = users[0]?.collab_limit || 5;
    
    if (countResult[0].count >= comboLimit) {
      return res.status(400).json({
        success: false,
        message: `已达到组合上限(${comboLimit}个)，可在 更多-右下角 联系客服`
      });
    }
    
    if (isShared) {
      const sharedCountResult = await query(
        'SELECT COUNT(*) as count FROM combos WHERE user_id = ? AND is_shared = 1',
        [userId]
      );
      
      if (sharedCountResult[0].count >= collabLimit) {
        return res.status(400).json({
          success: false,
          message: `已达到共享组合上限(${collabLimit}个)，可在 更多-右下角 联系客服`
        });
      }
    }
    
    let shareCode = null;
    if (isShared) {
      let codeExists = true;
      while (codeExists) {
        shareCode = generateShareCode();
        const existing = await query(
          'SELECT id FROM combos WHERE share_code = ?',
          [shareCode]
        );
        codeExists = existing.length > 0;
      }
    }
    
    const result = await query(
      `INSERT INTO combos 
       (user_id, name, icon, color, description, is_shared, share_code, member_limit, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        userId,
        name.trim(),
        icon || 'folder',
        color || '#4CAF50',
        description || null,
        isShared ? 1 : 0,
        shareCode,
        isShared ? (memberLimit || 50) : 0
      ]
    );
    
    const comboId = result.insertId;
    
    if (isShared) {
      const userInfo = await query(
        'SELECT nickname FROM users WHERE id = ?',
        [userId]
      );
      const nickname = userInfo.length > 0 ? userInfo[0].nickname : '';
      await query(
        `INSERT INTO combo_members (combo_id, user_id, role, nickname, joined_at)
         VALUES (?, ?, 'owner', ?, NOW())`,
        [comboId, userId, nickname]
      );

      // Auto-create default report templates for shared combos
      const dailySections = JSON.stringify([
        { key: 'work_done', title: '今日工作', sort_order: 1, max_lines: 20 },
        { key: 'tomorrow_plan', title: '明日计划', sort_order: 2, max_lines: 10 }
      ]);
      const weeklySections = JSON.stringify([
        { key: 'weekly_summary', title: '本周总结', sort_order: 1, max_lines: 20 },
        { key: 'next_plan', title: '下周计划', sort_order: 2, max_lines: 10 }
      ]);
      await query(
        'INSERT INTO report_templates (combo_id, type, sections, created_at, updated_at) VALUES (?, "daily", ?, NOW(), NOW()), (?, "weekly", ?, NOW(), NOW())',
        [comboId, dailySections, comboId, weeklySections]
      );
    }

    if (todoIds && Array.isArray(todoIds) && todoIds.length > 0) {
      if (isShared) {
        const members = await query(
          'SELECT user_id FROM combo_members WHERE combo_id = ?',
          [comboId]
        );
        for (const todoId of todoIds) {
          await copyTodoTree(todoId, userId, comboId, members);
        }
      } else {
        for (const todoId of todoIds) {
          await query(
            `UPDATE todos SET combo_id = ?, updated_at = NOW()
             WHERE (todo_id = ? OR id = ? OR created_at = FROM_UNIXTIME(? / 1000)) AND user_id = ?`,
            [comboId, todoId, todoId, todoId, userId]
          );
        }
      }
    }

    const todoCount = todoIds ? todoIds.length : 0;
    
    res.json({
      success: true,
      message: '组合创建成功',
      combo: {
        id: comboId,
        name: name.trim(),
        icon: icon || 'folder',
        color: color || '#4CAF50',
        description: description || '',
        isShared: !!isShared,
        shareCode,
        memberLimit: isShared ? (memberLimit || 50) : 0,
        todoCount
      },
      id: comboId,
      shareCode
    });
  } catch (err) {
    logger.comboError('创建', '创建组合失败', { userId, error: err.message });
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

const update = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { name, icon, color, description, memberLimit } = req.body;
  
  try {
    const combos = await query(
      'SELECT * FROM combos WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    
    if (combos.length === 0) {
      return res.status(404).json({
        success: false,
        message: '组合不存在或无权修改'
      });
    }
    
    const existingCombo = combos[0];
    const updateName = name !== undefined ? name.trim() : existingCombo.name;
    const updateIcon = icon !== undefined ? icon : existingCombo.icon;
    const updateColor = color !== undefined ? color : existingCombo.color;
    const updateDescription = description !== undefined ? description : existingCombo.description;
    const updateMemberLimit = memberLimit !== undefined ? memberLimit : existingCombo.member_limit;
    
    await query(
      'UPDATE combos SET name = ?, icon = ?, color = ?, description = ?, member_limit = ?, updated_at = NOW() WHERE id = ?',
      [updateName, updateIcon, updateColor, updateDescription, updateMemberLimit, id]
    );
    
    res.json({
      success: true,
      message: '组合更新成功',
      combo: {
        id: parseInt(id),
        name: updateName,
        icon: updateIcon,
        color: updateColor,
        description: updateDescription || '',
        memberLimit: updateMemberLimit
      }
    });
  } catch (err) {
    logger.comboError('更新', '更新组合失败', { userId, id, error: err.message });
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

const deleteCombo = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { action } = req.query;
  
  try {
    const combos = await query(
      'SELECT * FROM combos WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    
    if (combos.length === 0) {
      return res.status(404).json({
        success: false,
        message: '组合不存在或无权删除'
      });
    }
    
    const combo = combos[0];

    await transaction(async (conn) => {
      if (combo.is_shared === 1) {
        // Two-step: SELECT IDs first for MySQL 5.5/5.6 compatibility
        const sharedTodos = await conn.query(
          'SELECT id FROM shared_todos WHERE combo_id = ?',
          [id]
        );
        const sharedIds = sharedTodos.map(t => t.id);

        if (sharedIds.length > 0) {
          await conn.query(
            `DELETE FROM shared_todo_comments WHERE shared_todo_id IN (${sharedIds.map(() => '?').join(',')})`,
            sharedIds
          );
          await conn.query(
            `DELETE FROM shared_todo_assignments WHERE shared_todo_id IN (${sharedIds.map(() => '?').join(',')})`,
            sharedIds
          );
        }
        await conn.query('DELETE FROM shared_todos WHERE combo_id = ?', [id]);
        await conn.query('DELETE FROM combo_members WHERE combo_id = ?', [id]);
        await conn.query('DELETE FROM collab_requests WHERE combo_id = ?', [id]);
      } else {
        if (action === 'delete_todos') {
          await conn.query(
            'UPDATE todos SET is_deleted = 1, deleted_at = NOW() WHERE combo_id = ?',
            [id]
          );
        } else {
          await conn.query(
            'UPDATE todos SET combo_id = NULL, updated_at = NOW() WHERE combo_id = ?',
            [id]
          );
        }
      }

      await conn.query(
        'UPDATE work_reports SET combo_id = 0, updated_at = NOW() WHERE combo_id = ?',
        [id]
      );
      await conn.query('DELETE FROM report_templates WHERE combo_id = ?', [id]);
      await conn.query('DELETE FROM combos WHERE id = ?', [id]);
    });
    
    res.json({
      success: true,
      message: '组合删除成功'
    });
  } catch (err) {
    logger.comboError('删除', '删除组合失败', { userId, id, error: err.message });
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

const getMembers = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  
  try {
    const members = await query(
      `SELECT cm.*, u.nickname, u.avatar_url 
       FROM combo_members cm 
       LEFT JOIN users u ON cm.user_id = u.id 
       WHERE cm.combo_id = ?
       ORDER BY 
         CASE cm.role 
           WHEN 'owner' THEN 1 
           WHEN 'admin' THEN 2 
           ELSE 3 
         END`,
      [id]
    );
    
    res.json({
      success: true,
      members: members.map(m => ({
        id: m.user_id,
        nickname: m.nickname,
        avatarUrl: getFullAvatarUrl(m.avatar_url),
        role: m.role,
        joinedAt: m.joined_at
      }))
    });
  } catch (err) {
    logger.comboError('获取成员', '获取成员列表失败', { userId, comboId, error: err.message });
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

const setMemberRole = async (req, res) => {
  const userId = req.user.id;
  const { comboId, userId: targetUserId } = req.params;
  const { role } = req.body;
  
  try {
    const requesters = await query(
      'SELECT role FROM combo_members WHERE combo_id = ? AND user_id = ?',
      [comboId, userId]
    );
    
    if (requesters.length === 0 || requesters[0].role !== 'owner') {
      return res.status(403).json({
        success: false,
        message: '只有超管可以设置成员角色'
      });
    }
    
    const targetMember = await query(
      'SELECT role FROM combo_members WHERE combo_id = ? AND user_id = ?',
      [comboId, targetUserId]
    );
    
    if (targetMember.length === 0) {
      return res.status(404).json({
        success: false,
        message: '成员不存在'
      });
    }
    
    const oldRole = targetMember[0].role;
    const isOwnerTransfer = role === 'owner';
    
    if (isOwnerTransfer) {
      await query(
        'UPDATE combo_members SET role = ? WHERE combo_id = ? AND user_id = ?',
        ['admin', comboId, userId]
      );
      
      await query(
        'UPDATE combo_members SET role = ? WHERE combo_id = ? AND user_id = ?',
        ['owner', comboId, targetUserId]
      );
      
      await query(
        'UPDATE combos SET user_id = ?, updated_at = NOW() WHERE id = ?',
        [targetUserId, comboId]
      );
    } else {
      await query(
        'UPDATE combo_members SET role = ? WHERE combo_id = ? AND user_id = ?',
        [role, comboId, targetUserId]
      );
    }
    
    const allAssignTodos = await query(
      `SELECT id, exclude_type, creator_id FROM shared_todos WHERE combo_id = ? AND assign_type IN ('all', 'any') AND is_deleted = 0`,
      [comboId]
    );
    
    const updateUserAssignments = async (affectedUserId, fromRole, toRole) => {
      for (const todo of allAssignTodos) {
        const shouldExclude = (userRole, excludeType, creatorId, currentUserId) => {
          if (!excludeType) return false;
          if (excludeType === 'owner' && userRole === 'owner') return true;
          if (excludeType === 'self' && currentUserId === creatorId) return true;
          if (excludeType === 'admins' && (userRole === 'owner' || userRole === 'admin')) return true;
          return false;
        };
        
        const wasExcluded = shouldExclude(fromRole, todo.exclude_type, todo.creator_id, affectedUserId);
        const nowExcluded = shouldExclude(toRole, todo.exclude_type, todo.creator_id, affectedUserId);
        
        if (!wasExcluded && nowExcluded) {
          await query(
            'DELETE FROM shared_todo_assignments WHERE shared_todo_id = ? AND user_id = ?',
            [todo.id, affectedUserId]
          );
        } else if (wasExcluded && !nowExcluded) {
          const existing = await query(
            'SELECT id FROM shared_todo_assignments WHERE shared_todo_id = ? AND user_id = ?',
            [todo.id, affectedUserId]
          );
          
          if (existing.length === 0) {
            await query(
              'INSERT INTO shared_todo_assignments (shared_todo_id, user_id) VALUES (?, ?)',
              [todo.id, affectedUserId]
            );
          }
        }
      }
    };
    
    if (isOwnerTransfer) {
      await updateUserAssignments(userId, 'owner', 'admin');
      await updateUserAssignments(targetUserId, oldRole, 'owner');
    } else if (oldRole !== role) {
      await updateUserAssignments(targetUserId, oldRole, role);
    }
    
    res.json({
      success: true,
      message: '角色设置成功'
    });
  } catch (err) {
    logger.comboError('设置角色', '设置成员角色失败', { userId, comboId, memberId, error: err.message });
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

async function copyTodoTree(todoId, userId, comboId, members) {
  const todos = await query(
    `SELECT * FROM todos WHERE (todo_id = ? OR id = ? OR created_at = FROM_UNIXTIME(? / 1000)) AND user_id = ?`,
    [todoId, todoId, todoId, userId]
  );

  if (todos.length === 0) return null;
  const todo = todos[0];

  const result = await query(
    `INSERT INTO shared_todos
     (combo_id, creator_id, text, parent_id, set_date, set_time, remarks, assign_type, priority, created_at)
     VALUES (?, ?, ?, NULL, ?, ?, ?, 'all', ?, NOW())`,
    [comboId, userId, todo.text, todo.set_date, todo.set_time, todo.remarks, todo.priority || 'p2']
  );

  const newSharedId = result.insertId;

  if (todo.todo_id) {
    await copySubtaskTree(todo.todo_id, userId, comboId, newSharedId);
  }

  if (members && members.length > 0) {
    const assignValues = members.map(m => [newSharedId, m.user_id]);
    await query(
      'INSERT INTO shared_todo_assignments (shared_todo_id, user_id) VALUES ?',
      [assignValues]
    );
  }

  await query(
    'UPDATE todos SET is_deleted = 1, deleted_at = NOW(), combo_id = NULL WHERE id = ?',
    [todo.id]
  );

  return newSharedId;
}

async function copySubtaskTree(parentTodoId, userId, comboId, parentSharedId) {
  const children = await query(
    `SELECT * FROM todos WHERE parent_id = ? AND user_id = ? AND is_deleted = 0`,
    [parentTodoId, userId]
  );

  for (const child of children) {
    const result = await query(
      `INSERT INTO shared_todos
       (combo_id, creator_id, text, parent_id, set_date, set_time, remarks, assign_type, priority, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'all', ?, NOW())`,
      [comboId, userId, child.text, parentSharedId, child.set_date, child.set_time, child.remarks, child.priority || 'p2']
    );

    const newChildId = result.insertId;

    if (child.todo_id) {
      await copySubtaskTree(child.todo_id, userId, comboId, newChildId);
    }
  }
}

module.exports = {
  getList,
  getById,
  create,
  update,
  deleteCombo,
  getMembers,
  setMemberRole
};

const { query, transaction } = require('../config/database');
const logger = require('../utils/logger');

/**
 * 获取用户在某 combo 中的角色
 * @param {number} comboId
 * @param {number} userId
 * @returns {Promise<string|null>} 'owner' | 'admin' | 'member' | null
 */
const getComboRole = async (comboId, userId) => {
  if (!comboId || comboId <= 0) return null;
  const rows = await query(
    'SELECT role FROM combo_members WHERE combo_id = ? AND user_id = ?',
    [comboId, userId]
  );
  return rows.length > 0 ? rows[0].role : null;
};

/**
 * 检查用户是否为 combo 成员（owner/admin/member 均可）
 */
const isComboMember = async (comboId, userId) => {
  if (!comboId || comboId <= 0) return false;
  const rows = await query(
    'SELECT id FROM combo_members WHERE combo_id = ? AND user_id = ?',
    [comboId, userId]
  );
  return rows.length > 0;
};

/**
 * GET /api/work-reports
 * 查询工作报告列表（支持分页与多条件筛选）
 *
 * 权限规则：
 * - 只能查询自己的报告
 * - 若查询他人的报告，需是该 combo 的成员且拥有 owner/admin 角色
 */
const getList = async (req, res) => {
  const userId = req.user.id;
  const {
    user_id: queryUserId,
    type,
    period_date,
    date_from,
    date_to,
    combo_id,
    page = 1,
    page_size = 20,
  } = req.query;

  try {
    const targetUserId = queryUserId ? parseInt(queryUserId, 10) : userId;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(page_size, 10) || 20));

    // 如果是查询他人的报告，校验权限
    if (targetUserId !== userId) {
      const comboId = parseInt(combo_id, 10);
      if (!comboId) {
        return res.status(403).json({
          success: false,
          message: '查询他人的报告需要指定组合'
        });
      }
      const role = await getComboRole(comboId, userId);
      if (!role || (role !== 'owner' && role !== 'admin')) {
        return res.status(403).json({
          success: false,
          message: '无权查看该成员的报告'
        });
      }
    }

    // 构造查询条件
    const conditions = ['wr.is_deleted = 0'];
    const params = [];

    conditions.push('wr.user_id = ?');
    params.push(targetUserId);

    if (type) {
      conditions.push('wr.type = ?');
      params.push(type);
    }

    if (period_date) {
      conditions.push('wr.period_date = ?');
      params.push(period_date);
    }

    if (date_from) {
      conditions.push('wr.period_date >= ?');
      params.push(date_from);
    }

    if (date_to) {
      conditions.push('wr.period_date <= ?');
      params.push(date_to);
    }

    if (combo_id) {
      conditions.push('wr.combo_id = ?');
      params.push(parseInt(combo_id, 10));
    }

    const whereClause = conditions.join(' AND ');

    // 查询总数
    const countRows = await query(
      `SELECT COUNT(*) as total FROM work_reports wr WHERE ${whereClause}`,
      params
    );
    const total = countRows[0]?.total || 0;

    // 查询分页数据
    const offset = (pageNum - 1) * pageSize;
    const rows = await query(
      `SELECT wr.*, u.nickname, u.avatar_url
       FROM work_reports wr
       LEFT JOIN users u ON wr.user_id = u.id
       WHERE ${whereClause}
       ORDER BY wr.period_date DESC, wr.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    const list = rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      type: row.type,
      periodDate: row.period_date,
      periodLabel: row.period_label,
      comboId: row.combo_id,
      content: row.content ? JSON.parse(row.content) : null,
      nickname: row.nickname,
      avatarUrl: row.avatar_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    res.json({
      success: true,
      data: {
        list,
        total,
        page: pageNum,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (err) {
    logger.error('REPORT', 'getList', '查询工作报告列表失败', { userId, error: err.message });
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

/**
 * GET /api/work-reports/:id
 * 获取单条报告详情
 *
 * 权限规则：
 * - 本人的报告可直接查看
 * - 他人的报告，如果是 combo 报告，需要 combo 的 owner/admin 角色
 */
const getById = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const rows = await query(
      `SELECT wr.*, u.nickname, u.avatar_url
       FROM work_reports wr
       LEFT JOIN users u ON wr.user_id = u.id
       WHERE wr.id = ? AND wr.is_deleted = 0`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '报告不存在'
      });
    }

    const report = rows[0];

    // 权限校验：本人可查看；非本人需是 combo owner/admin
    if (report.user_id !== userId) {
      if (report.combo_id && report.combo_id > 0) {
        const role = await getComboRole(report.combo_id, userId);
        if (!role || (role !== 'owner' && role !== 'admin')) {
          return res.status(403).json({
            success: false,
            message: '无权查看该报告'
          });
        }
      } else {
        return res.status(403).json({
          success: false,
          message: '无权查看该报告'
        });
      }
    }

    res.json({
      success: true,
      data: {
        id: report.id,
        userId: report.user_id,
        type: report.type,
        periodDate: report.period_date,
        periodLabel: report.period_label,
        comboId: report.combo_id,
        content: report.content ? JSON.parse(report.content) : null,
        nickname: report.nickname,
        avatarUrl: report.avatar_url,
        createdAt: report.created_at,
        updatedAt: report.updated_at,
      },
    });
  } catch (err) {
    logger.error('REPORT', 'getById', '查询报告详情失败', { userId, id, error: err.message });
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

/**
 * POST /api/work-reports
 * 创建工作报告
 *
 * 权限规则：
 * - 如果 combo_id > 0，用户必须是该 combo 的成员
 * - 处理 ER_DUP_ENTRY（同一用户+同一 period 的同一 combo 重复）
 */
const create = async (req, res) => {
  const userId = req.user.id;
  const { type, period_date, period_label, combo_id = 0, content } = req.body;

  // 参数校验
  if (!type || !['daily', 'weekly'].includes(type)) {
    return res.status(400).json({
      success: false,
      message: '报告类型无效（需为 daily 或 weekly）'
    });
  }

  if (!period_date) {
    return res.status(400).json({
      success: false,
      message: '报告日期不能为空'
    });
  }

  if (content === undefined || content === null) {
    return res.status(400).json({
      success: false,
      message: '报告内容不能为空'
    });
  }

  try {
    const comboId = parseInt(combo_id, 10) || 0;

    // 如果是 combo 报告，校验成员身份
    if (comboId > 0) {
      const isMember = await isComboMember(comboId, userId);
      if (!isMember) {
        return res.status(403).json({
          success: false,
          message: '不是该组合成员，无法创建组合报告'
        });
      }
    }

    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);

    const result = await query(
      `INSERT INTO work_reports (user_id, type, period_date, period_label, combo_id, content, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [userId, type, period_date, period_label || null, comboId, contentStr]
    );

    res.json({
      success: true,
      message: '报告创建成功',
      data: {
        id: result.insertId,
      },
    });
  } catch (err) {
    // 处理唯一键冲突
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: '该时段的工作报告已存在，请勿重复创建'
      });
    }

    logger.error('REPORT', 'create', '创建工作报告失败', { userId, error: err.message });
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

/**
 * PUT /api/work-reports/:id
 * 更新工作报告（仅可修改 content 和 period_label）
 *
 * 权限规则：
 * - 仅可修改自己的报告
 */
const update = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { content, period_label } = req.body;

  try {
    const rows = await query(
      'SELECT * FROM work_reports WHERE id = ? AND is_deleted = 0',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '报告不存在'
      });
    }

    if (rows[0].user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: '无权修改他人的报告'
      });
    }

    const updates = [];
    const params = [];

    if (content !== undefined) {
      updates.push('content = ?');
      params.push(typeof content === 'string' ? content : JSON.stringify(content));
    }

    if (period_label !== undefined) {
      updates.push('period_label = ?');
      params.push(period_label);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有需要更新的字段'
      });
    }

    updates.push('updated_at = NOW()');
    params.push(id);

    await query(
      `UPDATE work_reports SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    res.json({
      success: true,
      message: '报告更新成功',
    });
  } catch (err) {
    logger.error('REPORT', 'update', '更新工作报告失败', { userId, id, error: err.message });
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

/**
 * DELETE /api/work-reports/:id
 * 软删除工作报告
 *
 * 权限规则：
 * - 仅可删除自己的报告
 */
const deleteReport = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const rows = await query(
      'SELECT * FROM work_reports WHERE id = ? AND is_deleted = 0',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '报告不存在'
      });
    }

    if (rows[0].user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: '无权删除他人的报告'
      });
    }

    await query(
      'UPDATE work_reports SET is_deleted = 1, updated_at = NOW() WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: '报告已删除',
    });
  } catch (err) {
    logger.error('REPORT', 'delete', '删除工作报告失败', { userId, id, error: err.message });
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

/**
 * GET /api/work-reports/board
 * 组合看板：列出 combo 内所有成员的周期报告
 *
 * 权限规则：
 * - owner/admin 可查看所有成员报告
 * - 普通 member 只能查看自己的报告
 */
const getBoard = async (req, res) => {
  const userId = req.user.id;
  const { combo_id, period_date, type } = req.query;

  if (!combo_id) {
    return res.status(400).json({
      success: false,
      message: '缺少组合 ID'
    });
  }

  try {
    const comboId = parseInt(combo_id, 10);
    const role = await getComboRole(comboId, userId);

    if (!role) {
      return res.status(403).json({
        success: false,
        message: '不是该组合成员'
      });
    }

    // 获取所有 combo 成员
    const members = await query(
      `SELECT cm.user_id, cm.role, u.nickname, u.avatar_url
       FROM combo_members cm
       LEFT JOIN users u ON cm.user_id = u.id
       WHERE cm.combo_id = ?
       ORDER BY
         CASE cm.role
           WHEN 'owner' THEN 1
           WHEN 'admin' THEN 2
           ELSE 3
         END`,
      [comboId]
    );

    const conditions = ['wr.combo_id = ?', 'wr.is_deleted = 0'];
    const params = [comboId];

    // owner/admin 可看所有成员；普通 member 只看自己
    const canSeeAll = role === 'owner' || role === 'admin';
    if (!canSeeAll) {
      conditions.push('wr.user_id = ?');
      params.push(userId);
    }

    if (period_date) {
      conditions.push('wr.period_date = ?');
      params.push(period_date);
    }

    if (type) {
      conditions.push('wr.type = ?');
      params.push(type);
    }

    const reports = await query(
      `SELECT wr.*, u.nickname, u.avatar_url
       FROM work_reports wr
       LEFT JOIN users u ON wr.user_id = u.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY wr.period_date DESC, wr.created_at DESC`,
      params
    );

    // 按成员分组
    const memberMap = {};
    members.forEach(m => {
      memberMap[m.user_id] = {
        userId: m.user_id,
        nickname: m.nickname,
        avatarUrl: m.avatar_url,
        role: m.role,
        reports: [],
      };
    });

    reports.forEach(row => {
      if (memberMap[row.user_id]) {
        memberMap[row.user_id].reports.push({
          id: row.id,
          type: row.type,
          periodDate: row.period_date,
          periodLabel: row.period_label,
          comboId: row.combo_id,
          content: row.content ? JSON.parse(row.content) : null,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        });
      }
    });

    const board = Object.values(memberMap);

    res.json({
      success: true,
      data: {
        comboId,
        members: board,
        totalMembers: members.length,
      },
    });
  } catch (err) {
    logger.error('REPORT', 'getBoard', '查询组合看板失败', { userId, comboId: combo_id, error: err.message });
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
  deleteReport,
  getBoard,
};

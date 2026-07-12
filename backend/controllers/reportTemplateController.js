const { query } = require('../config/database');
const logger = require('../utils/logger');

const MODULE = 'REPORT';

const parseSections = (sections) => {
  if (!sections) return null;
  if (typeof sections === 'object') return sections;
  try {
    return JSON.parse(sections);
  } catch {
    return null;
  }
};

/**
 * GET /work-reports/templates/list
 * Query param: combo_id
 * combo_id=0 → return current user's private template
 * combo_id>0  → verify membership, return combo template
 */
const getTemplates = async (req, res) => {
  const userId = req.user.id;
  const comboId = parseInt(req.query.combo_id, 10) || 0;
  const type = req.query.type;

  try {
    if (comboId > 0) {
      const members = await query(
        'SELECT id FROM combo_members WHERE combo_id = ? AND user_id = ?',
        [comboId, userId]
      );
      if (members.length === 0) {
        return res.status(403).json({
          success: false,
          message: '你不是该组合的成员'
        });
      }
    }

    const queryUserId = comboId > 0 ? 0 : userId;
    const queryParams = [comboId, queryUserId];
    let queryStr = 'SELECT * FROM report_templates WHERE combo_id = ? AND user_id = ?';
    if (type && ['daily', 'weekly'].includes(type)) {
      queryStr += ' AND type = ?';
      queryParams.push(type);
    }
    const templates = await query(queryStr, queryParams);

    const data = templates.map((t) => ({
      ...t,
      sections: parseSections(t.sections)
    }));

    res.json({ success: true, data });
  } catch (err) {
    logger.error(MODULE, 'GET_TEMPLATES', '获取汇报模板失败', { userId, comboId, error: err.message });
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

/**
 * PUT /work-reports/templates
 * Body: { combo_id, type, sections }
 * combo_id=0 → upsert current user's private template
 * combo_id>0 → verify admin, upsert combo template (user_id=0)
 */
const upsertTemplate = async (req, res) => {
  const userId = req.user.id;
  const { combo_id, type, sections } = req.body;
  const comboId = parseInt(combo_id, 10) || 0;

  if (!type || !['daily', 'weekly'].includes(type)) {
    return res.status(400).json({
      success: false,
      message: 'type 必须为 daily 或 weekly'
    });
  }

  if (!sections) {
    return res.status(400).json({
      success: false,
      message: 'sections 不能为空'
    });
  }

  try {
    if (comboId > 0) {
      const members = await query(
        "SELECT role FROM combo_members WHERE combo_id = ? AND user_id = ? AND role IN ('owner', 'admin')",
        [comboId, userId]
      );
      if (members.length === 0) {
        return res.status(403).json({
          success: false,
          message: '只有组合管理员或创建者才能编辑汇报模板'
        });
      }
    }

    const sectionsJson = typeof sections === 'object' ? JSON.stringify(sections) : sections;
    const entityUserId = comboId > 0 ? 0 : userId;

    const existing = await query(
      'SELECT id FROM report_templates WHERE combo_id = ? AND user_id = ? AND type = ?',
      [comboId, entityUserId, type]
    );

    if (existing.length > 0) {
      await query(
        'UPDATE report_templates SET sections = ?, updated_at = NOW() WHERE id = ?',
        [sectionsJson, existing[0].id]
      );

      const updated = await query('SELECT * FROM report_templates WHERE id = ?', [existing[0].id]);

      res.json({
        success: true,
        message: '汇报模板更新成功',
        data: { ...updated[0], sections: parseSections(updated[0].sections) }
      });
    } else {
      const result = await query(
        'INSERT INTO report_templates (combo_id, user_id, type, sections, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
        [comboId, entityUserId, type, sectionsJson]
      );

      const inserted = await query('SELECT * FROM report_templates WHERE id = ?', [result.insertId]);

      res.json({
        success: true,
        message: '汇报模板创建成功',
        data: { ...inserted[0], sections: parseSections(inserted[0].sections) }
      });
    }
  } catch (err) {
    logger.error(MODULE, 'UPSERT_TEMPLATE', '更新汇报模板失败', { userId, comboId, type, error: err.message });
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

/**
 * POST /work-reports/templates/defaults
 * Body: { combo_id }
 * Creates default daily and weekly templates if they don't exist.
 * combo_id=0 → per-user; combo_id>0 → per-combo (user_id=0)
 */
const createDefaults = async (req, res) => {
  const userId = req.user.id;
  const comboId = parseInt(req.body.combo_id, 10) || 0;

  try {
    const defaults = [
      {
        type: 'daily',
        sections: JSON.stringify(['work_done', 'tomorrow_plan'])
      },
      {
        type: 'weekly',
        sections: JSON.stringify(['weekly_summary', 'next_plan'])
      }
    ];

    const entityUserId = comboId > 0 ? 0 : userId;
    const created = [];

    for (const tmpl of defaults) {
      const existing = await query(
        'SELECT id FROM report_templates WHERE combo_id = ? AND user_id = ? AND type = ?',
        [comboId, entityUserId, tmpl.type]
      );

      if (existing.length === 0) {
        const result = await query(
          'INSERT INTO report_templates (combo_id, user_id, type, sections, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
          [comboId, entityUserId, tmpl.type, tmpl.sections]
        );
        created.push({ id: result.insertId, combo_id: comboId, type: tmpl.type, sections: parseSections(tmpl.sections) });
      } else {
        const row = await query('SELECT * FROM report_templates WHERE id = ?', [existing[0].id]);
        created.push({ ...row[0], sections: parseSections(row[0].sections) });
      }
    }

    res.json({
      success: true,
      message: '默认汇报模板已就绪',
      data: created
    });
  } catch (err) {
    logger.error(MODULE, 'CREATE_DEFAULTS', '创建默认汇报模板失败', { userId, comboId, error: err.message });
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

module.exports = {
  getTemplates,
  upsertTemplate,
  createDefaults
};

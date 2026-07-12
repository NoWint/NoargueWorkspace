const { query } = require('../config/database');
const logger = require('../utils/logger');

const getList = async (req, res) => {
  const userId = req.user.id;
  
  try {
    const systemTags = await query(
      'SELECT * FROM tags WHERE is_system = 1 ORDER BY sort_order'
    );
    
    const userTags = await query(
      'SELECT * FROM tags WHERE is_system = 0 AND user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    
    res.json({
      success: true,
      tags: [...systemTags, ...userTags].map(tag => ({
        id: tag.id,
        name: tag.name,
        color: tag.color,
        icon: tag.icon,
        isSystem: tag.is_system === 1
      }))
    });
  } catch (err) {
    logger.error('TAG', '获取列表', '获取标签列表失败', { userId, error: err.message });
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

const create = async (req, res) => {
  const userId = req.user.id;
  const { name, color, icon } = req.body;
  
  if (!name || !name.trim()) {
    return res.status(400).json({
      success: false,
      message: '标签名称不能为空'
    });
  }
  
  try {
    const existing = await query(
      'SELECT id FROM tags WHERE user_id = ? AND name = ? AND is_system = 0',
      [userId, name.trim()]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: '标签名称已存在'
      });
    }
    
    const result = await query(
      'INSERT INTO tags (name, color, icon, is_system, user_id, created_at) VALUES (?, ?, ?, 0, ?, NOW())',
      [name.trim(), color || '#4CAF50', icon || null, userId]
    );
    
    res.json({
      success: true,
      message: '标签创建成功',
      tag: {
        id: result.insertId,
        name: name.trim(),
        color: color || '#4CAF50',
        icon: icon || null,
        isSystem: false
      }
    });
  } catch (err) {
    logger.error('TAG', '创建', '创建标签失败', { userId, error: err.message });
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

const update = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { name, color, icon } = req.body;
  
  try {
    const tags = await query(
      'SELECT * FROM tags WHERE id = ? AND user_id = ? AND is_system = 0',
      [id, userId]
    );
    
    if (tags.length === 0) {
      return res.status(404).json({
        success: false,
        message: '标签不存在或无权修改'
      });
    }
    
    await query(
      'UPDATE tags SET name = ?, color = ?, icon = ?, updated_at = NOW() WHERE id = ?',
      [name?.trim(), color, icon, id]
    );
    
    res.json({
      success: true,
      message: '标签更新成功'
    });
  } catch (err) {
    logger.error('TAG', '更新', '更新标签失败', { userId, id, error: err.message });
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

const deleteTag = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  
  try {
    const tags = await query(
      'SELECT * FROM tags WHERE id = ? AND user_id = ? AND is_system = 0',
      [id, userId]
    );
    
    if (tags.length === 0) {
      return res.status(404).json({
        success: false,
        message: '标签不存在或无权删除'
      });
    }
    
    await query('DELETE FROM todo_tags WHERE tag_id = ?', [id]);
    await query('DELETE FROM tags WHERE id = ?', [id]);
    
    res.json({
      success: true,
      message: '标签删除成功'
    });
  } catch (err) {
    logger.error('TAG', '删除', '删除标签失败', { userId, id, error: err.message });
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

module.exports = {
  getList,
  create,
  update,
  deleteTag
};

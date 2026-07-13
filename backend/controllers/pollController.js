const { query, transaction } = require('../config/database');
const logger = require('../utils/logger');

const POLL_LOG = 'POLL';

/**
 * 格式化投票数据为 API 输出格式
 */
async function formatPoll(poll, userId) {
  if (!poll) return null;

  const options = await query(
    'SELECT id, text, is_other, sort_order, vote_count FROM post_poll_options WHERE poll_id = ? ORDER BY sort_order',
    [poll.id]
  );

  // 判断是否已结束
  const now = new Date();
  const endTime = poll.end_time ? new Date(poll.end_time) : null;
  const isEnded = !!poll.is_closed || (endTime && now > endTime);

  // 当前用户的投票情况
  const userVotes = await query(
    'SELECT option_id FROM post_poll_votes WHERE poll_id = ? AND user_id = ?',
    [poll.id, userId]
  );
  const userVotedOptionIds = userVotes.map(v => v.option_id);

  return {
    pollId: poll.id,
    title: poll.title,
    type: poll.type,
    isAnonymous: !!poll.is_anonymous,
    allowOther: !!poll.allow_other,
    totalVotes: poll.total_votes,
    endTime: poll.end_time || null,
    isEnded,
    isVoted: userVotedOptionIds.length > 0,
    userVotedOptionIds,
    options: options.map(o => ({
      optionId: o.id,
      text: o.text,
      voteCount: o.vote_count,
      isOther: !!o.is_other
    }))
  };
}

/**
 * POST /posts/:postId/poll — 注册投票体（发布后调用，仅帖主）
 */
const createPoll = async (req, res) => {
  const { postId } = req.params;
  const userId = req.user.id;
  const { title, type, allowOther, endTime, options, isAnonymous } = req.body;

  try {
    // 验证帖主身份
    const posts = await query('SELECT * FROM posts WHERE post_id = ?', [postId]);
    if (posts.length === 0) {
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }
    if (posts[0].user_id !== userId) {
      return res.status(403).json({ success: false, message: '无权操作该投票' });
    }

    // 校验输入
    if (!title || title.trim().length === 0) {
      return res.status(400).json({ success: false, message: '投票标题不能为空' });
    }
    if (title.length > 200) {
      return res.status(400).json({ success: false, message: '投票标题不能超过200字' });
    }
    if (!options || options.length < 2 || options.length > 20) {
      return res.status(400).json({ success: false, message: '选项数量需在2~20之间' });
    }
    for (const opt of options) {
      if (!opt || typeof opt !== 'object' || !opt.text || opt.text.trim().length === 0) {
        return res.status(400).json({ success: false, message: '选项文本不能为空' });
      }
      if (opt.text.length > 100) {
        return res.status(400).json({ success: false, message: '选项文本不能超过100字' });
      }
    }
    if (endTime) {
      const end = new Date(endTime);
      if (isNaN(end.getTime())) {
        return res.status(400).json({ success: false, message: '截止时间格式错误' });
      }
      if (end <= new Date()) {
        return res.status(400).json({ success: false, message: '截止时间必须在未来' });
      }
    }

    // 检查是否已有投票
    const existing = await query('SELECT id FROM post_polls WHERE post_id = ?', [posts[0].id]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: '该帖子已有投票' });
    }

    // 创建投票
    try {
      const pollResult = await query(
        `INSERT INTO post_polls (post_id, title, type, allow_other, end_time, is_anonymous)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [posts[0].id, title.trim(), type || 0, allowOther ? 1 : 0, endTime || null, isAnonymous ? 1 : 0]
      );
      const pollId = pollResult.insertId;

      // 创建选项
      for (let i = 0; i < options.length; i++) {
        await query(
          'INSERT INTO post_poll_options (poll_id, text, is_other, sort_order) VALUES (?, ?, ?, ?)',
          [pollId, options[i].text.trim(), options[i].isOther ? 1 : 0, i]
        );
      }

      res.json({ success: true, data: { pollId } });
    } catch (err) {
      logger.error(POLL_LOG, '创建', '创建投票体失败', { postId, userId, error: err.message });
      res.status(500).json({ success: false, message: '创建投票失败' });
    }
  } catch (err) {
    logger.error(POLL_LOG, '创建', '创建投票体失败', { postId, userId, error: err.message });
    res.status(500).json({ success: false, message: '创建投票失败' });
  }
};

/**
 * GET /posts/:postId/poll — 获取投票详情
 */
const getPoll = async (req, res) => {
  const { postId } = req.params;
  const userId = req.user.id;

  try {
    const posts = await query('SELECT * FROM posts WHERE post_id = ?', [postId]);
    if (posts.length === 0) {
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }

    const polls = await query(
      'SELECT * FROM post_polls WHERE post_id = ? AND is_deleted = 0',
      [posts[0].id]
    );
    if (polls.length === 0) {
      return res.json({ success: true, data: null });
    }

    const poll = await formatPoll(polls[0], userId);

    // 获取"其他"选项详情
    const otherOptions = poll.options.filter(o => o.isOther);
    let otherDetails = [];
    let otherVotes = [];
    if (otherOptions.length > 0) {
      const otherOptionIds = otherOptions.map(o => o.optionId);
      const placeholders = otherOptionIds.map(() => '?').join(',');
      otherVotes = await query(
        `SELECT v.user_id, v.custom_text, v.created_at, u.nickname, u.avatar_url
         FROM post_poll_votes v
         LEFT JOIN users u ON v.user_id = u.id
         WHERE v.option_id IN (${placeholders}) AND v.custom_text IS NOT NULL AND v.custom_text != ''
         ORDER BY v.created_at DESC`,
        otherOptionIds
      );
    }

    // 匿名投票下，仅帖主和管理员可查看其他选项详情
    const { getAdminIds } = require('./adminController');
    const admins = getAdminIds();
    const isAdmin = admins.includes(userId);
    const isOwner = posts[0].user_id === userId;
    if (polls[0].is_anonymous && !isOwner && !isAdmin) {
      // 其他人看不到详情
    } else {
      otherDetails = otherVotes.map(v => ({
        userId: v.user_id,
        nickname: v.nickname || '用户',
        avatar: v.avatar_url || null,
        customText: v.custom_text,
        createdAt: v.created_at
      }));
    }

    res.json({ success: true, data: { poll, otherDetails } });
  } catch (err) {
    logger.error(POLL_LOG, '详情', '获取投票详情失败', { postId, userId, error: err.message });
    res.status(500).json({ success: false, message: '获取投票详情失败' });
  }
};

/**
 * POST /posts/:postId/poll/vote — 投票/改票
 */
const vote = async (req, res) => {
  const { postId } = req.params;
  const userId = req.user.id;
  const { optionIds, otherTexts } = req.body;

  try {
    const posts = await query('SELECT * FROM posts WHERE post_id = ?', [postId]);
    if (posts.length === 0) {
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }

    // 不能给自己投票
    if (posts[0].user_id === userId) {
      return res.status(403).json({ success: false, message: '不能给自己的帖子投票' });
    }

    const polls = await query(
      'SELECT * FROM post_polls WHERE post_id = ? AND is_deleted = 0',
      [posts[0].id]
    );
    if (polls.length === 0) {
      return res.status(404).json({ success: false, message: '投票不存在' });
    }

    const poll = polls[0];

    // 检查是否已结束
    const now = new Date();
    const endTime = poll.end_time ? new Date(poll.end_time) : null;
    if (poll.is_closed || (endTime && now > endTime)) {
      return res.status(403).json({ success: false, message: '投票已结束' });
    }

    if (!optionIds || !Array.isArray(optionIds) || optionIds.length === 0) {
      return res.status(400).json({ success: false, message: '请选择选项' });
    }

    // 单选校验
    if (poll.type === 0 && optionIds.length > 1) {
      return res.status(400).json({ success: false, message: '此为单选投票，只能选择一个选项' });
    }

    // 获取有效选项列表
    const options = await query(
      'SELECT id, is_other FROM post_poll_options WHERE poll_id = ?',
      [poll.id]
    );
    const validOptionIds = new Set(options.map(o => o.id));
    const otherOptionIds = new Set(
      options.filter(o => o.is_other).map(o => o.id)
    );

    // 验证所有 optionIds 均属于该 poll
    for (const oid of optionIds) {
      if (!validOptionIds.has(oid)) {
        return res.status(400).json({ success: false, message: `选项 ${oid} 不属于该投票` });
      }
    }

    // 验证其他输入
    const selectedOtherIds = optionIds.filter(oid => otherOptionIds.has(oid));
    for (const oid of selectedOtherIds) {
      const customText = otherTexts && otherTexts[String(oid)];
      if (!customText || customText.trim().length === 0) {
        return res.status(400).json({ success: false, message: '请填写其他选项的内容' });
      }
      if (customText.length > 200) {
        return res.status(400).json({ success: false, message: '其他内容不能超过200字' });
      }
    }

    // 事务内执行投票：DELETE old + INSERT new + 重建计数
    try {
      await transaction(async (conn) => {
        // 1. 清空该用户在该 poll 下的所有旧投票
        await new Promise((resolve, reject) => {
          conn.query('DELETE FROM post_poll_votes WHERE poll_id = ? AND user_id = ?', [poll.id, userId], (err) => {
            if (err) reject(err); else resolve();
          });
        });

        // 2. 插入新投票
        for (const oid of optionIds) {
          const customText = selectedOtherIds.includes(oid) && otherTexts
            ? otherTexts[String(oid)].trim()
            : null;
          await new Promise((resolve, reject) => {
            conn.query(
              'INSERT INTO post_poll_votes (poll_id, option_id, user_id, custom_text) VALUES (?, ?, ?, ?)',
              [poll.id, oid, userId, customText],
              (err) => { if (err) reject(err); else resolve(); }
            );
          });
        }

        // 3. 重建每个 option 的 vote_count
        await new Promise((resolve, reject) => {
          conn.query(
            `UPDATE post_poll_options o
             SET vote_count = (
               SELECT COUNT(*) FROM post_poll_votes v WHERE v.option_id = o.id
             )
             WHERE o.poll_id = ?`,
            [poll.id],
            (err) => { if (err) reject(err); else resolve(); }
          );
        });

        // 4. 重建 poll 的 total_votes
        await new Promise((resolve, reject) => {
          conn.query(
            `UPDATE post_polls
             SET total_votes = (
               SELECT COUNT(DISTINCT user_id) FROM post_poll_votes WHERE poll_id = ?
             )
             WHERE id = ?`,
            [poll.id, poll.id],
            (err) => { if (err) reject(err); else resolve(); }
          );
        });
      });

      // 重新获取 poll 数据返回
      const updatedPoll = await query('SELECT * FROM post_polls WHERE id = ?', [poll.id]);
      const formattedPoll = await formatPoll(updatedPoll[0], userId);

      res.json({ success: true, data: { poll: formattedPoll } });
    } catch (err) {
      logger.error(POLL_LOG, '投票', '事务失败', { pollId: poll.id, userId, error: err.message });
      res.status(500).json({ success: false, message: '投票失败，请重试' });
    }
  } catch (err) {
    logger.error(POLL_LOG, '投票', '投票失败', { postId, userId, error: err.message });
    res.status(500).json({ success: false, message: '投票失败' });
  }
};

/**
 * POST /posts/:postId/poll/close — 手动结束投票
 */
const closePoll = async (req, res) => {
  const { postId } = req.params;
  const userId = req.user.id;

  try {
    const posts = await query('SELECT * FROM posts WHERE post_id = ?', [postId]);
    if (posts.length === 0) {
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }

    // 帖主或管理员
    const { getAdminIds } = require('./adminController');
    const admins = getAdminIds();
    const isAdmin = admins.includes(userId);
    if (posts[0].user_id !== userId && !isAdmin) {
      return res.status(403).json({ success: false, message: '无权操作该投票' });
    }

    const polls = await query(
      'SELECT * FROM post_polls WHERE post_id = ? AND is_deleted = 0',
      [posts[0].id]
    );
    if (polls.length === 0) {
      return res.status(404).json({ success: false, message: '投票不存在' });
    }

    if (polls[0].is_closed) {
      return res.status(400).json({ success: false, message: '投票已结束' });
    }

    await query('UPDATE post_polls SET is_closed = 1, updated_at = NOW() WHERE id = ?', [polls[0].id]);

    const updatedPoll = await query('SELECT * FROM post_polls WHERE id = ?', [polls[0].id]);
    const formattedPoll = await formatPoll(updatedPoll[0], userId);

    res.json({ success: true, data: { poll: formattedPoll } });
  } catch (err) {
    logger.error(POLL_LOG, '关闭', '关闭投票失败', { postId, userId, error: err.message });
    res.status(500).json({ success: false, message: '关闭投票失败' });
  }
};

/**
 * PATCH /posts/:postId/poll — 编辑投票（无投票记录时）
 */
const updatePoll = async (req, res) => {
  const { postId } = req.params;
  const userId = req.user.id;
  const { title, type, allowOther, endTime, options, isAnonymous } = req.body;

  try {
    const posts = await query('SELECT * FROM posts WHERE post_id = ?', [postId]);
    if (posts.length === 0) {
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }
    if (posts[0].user_id !== userId) {
      return res.status(403).json({ success: false, message: '无权操作该投票' });
    }

    const polls = await query(
      'SELECT * FROM post_polls WHERE post_id = ? AND is_deleted = 0',
      [posts[0].id]
    );
    if (polls.length === 0) {
      return res.status(404).json({ success: false, message: '投票不存在' });
    }

    const poll = polls[0];

    // 检查是否有投票记录 —— 有则限制编辑范围
    const voteCount = await query(
      'SELECT COUNT(DISTINCT user_id) as cnt FROM post_poll_votes WHERE poll_id = ?',
      [poll.id]
    );
    const hasVotes = voteCount[0].cnt > 0;

    if (hasVotes) {
      // 有投票记录时：仅允许修改截止时间和匿名开关
      const changedType = type !== undefined && type !== poll.type;
      const changedAllowOther = allowOther !== undefined && (allowOther ? 1 : 0) !== poll.allow_other;
      if (title || changedType || changedAllowOther || options) {
        return res.status(400).json({ success: false, message: '已有投票记录，仅允许修改截止时间' });
      }
      const updateFields = [];
      const updateValues = [];
      if (endTime) {
        const end = new Date(endTime);
        if (isNaN(end.getTime())) {
          return res.status(400).json({ success: false, message: '截止时间格式错误' });
        }
        updateFields.push('end_time = ?');
        updateValues.push(endTime);
      }
      const newAnonVal = isAnonymous !== undefined ? (isAnonymous ? 1 : 0) : null;
      if (newAnonVal !== null && newAnonVal !== Number(poll.is_anonymous)) {
        updateFields.push('is_anonymous = ?');
        updateValues.push(newAnonVal);
      }
      if (updateFields.length > 0) {
        updateFields.push('updated_at = NOW()');
        await query(`UPDATE post_polls SET ${updateFields.join(', ')} WHERE id = ?`, [...updateValues, poll.id]);
      }
    } else {
      // 无投票记录：允许编辑全部
      if (!title || title.trim().length === 0) {
        return res.status(400).json({ success: false, message: '投票标题不能为空' });
      }
      if (title.length > 200) {
        return res.status(400).json({ success: false, message: '投票标题不能超过200字' });
      }
      if (options && (options.length < 2 || options.length > 20)) {
        return res.status(400).json({ success: false, message: '选项数量需在2~20之间' });
      }
      if (options) {
        for (const opt of options) {
          if (!opt.text || opt.text.trim().length === 0) {
            return res.status(400).json({ success: false, message: '选项文本不能为空' });
          }
          if (opt.text.length > 100) {
            return res.status(400).json({ success: false, message: '选项文本不能超过100字' });
          }
        }
      }

      // 更新投票主体
      await query(
        `UPDATE post_polls SET title = ?, type = ?, allow_other = ?, is_anonymous = ?, end_time = ?, updated_at = NOW() WHERE id = ?`,
        [title.trim(), type || 0, allowOther ? 1 : 0, isAnonymous !== undefined ? (isAnonymous ? 1 : 0) : poll.is_anonymous, endTime || null, poll.id]
      );

      if (options) {
        // 删除旧选项
        await query('DELETE FROM post_poll_options WHERE poll_id = ?', [poll.id]);
        // 插入新选项
        for (let i = 0; i < options.length; i++) {
          await query(
            'INSERT INTO post_poll_options (poll_id, text, is_other, sort_order) VALUES (?, ?, ?, ?)',
            [poll.id, options[i].text.trim(), options[i].isOther ? 1 : 0, i]
          );
        }
      }
    }

    const updatedPoll = await query('SELECT * FROM post_polls WHERE id = ?', [poll.id]);
    const formattedPoll = await formatPoll(updatedPoll[0], userId);

    res.json({ success: true, data: { poll: formattedPoll } });
  } catch (err) {
    logger.error(POLL_LOG, '编辑', '编辑投票失败', { postId, userId, error: err.message });
    res.status(500).json({ success: false, message: '编辑投票失败' });
  }
};

/**
 * GET /posts/:postId/poll/other-details — "其他"选项详情
 */
const getOtherDetails = async (req, res) => {
  const { postId } = req.params;
  const userId = req.user.id;

  try {
    const posts = await query('SELECT * FROM posts WHERE post_id = ?', [postId]);
    if (posts.length === 0) {
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }

    const polls = await query(
      'SELECT * FROM post_polls WHERE post_id = ? AND is_deleted = 0',
      [posts[0].id]
    );
    if (polls.length === 0) {
      return res.status(404).json({ success: false, message: '投票不存在' });
    }

    const poll = polls[0];

    // 权限：帖主、管理员、已投票用户可查看
    const isOwner = posts[0].user_id === userId;
    const { getAdminIds } = require('./adminController');
    const admins = getAdminIds();
    const isAdmin = admins.includes(userId);
    let canView = isOwner || isAdmin;
    if (!canView) {
      const userVote = await query(
        'SELECT id FROM post_poll_votes WHERE poll_id = ? AND user_id = ? LIMIT 1',
        [poll.id, userId]
      );
      canView = userVote.length > 0;
    }
    if (!canView) {
      return res.status(403).json({ success: false, message: '无权查看' });
    }

    // 匿名投票：仅帖主和管理员可查看其他选项详情（普通投票者无权查看他人身份）
    if (poll.is_anonymous && !isOwner && !isAdmin) {
      return res.json({ success: true, data: { items: [] } });
    }

    const otherOptions = await query(
      'SELECT id FROM post_poll_options WHERE poll_id = ? AND is_other = 1',
      [poll.id]
    );

    if (otherOptions.length === 0) {
      return res.json({ success: true, data: { items: [] } });
    }

    const otherOptionIds = otherOptions.map(o => o.id);
    const placeholders = otherOptionIds.map(() => '?').join(',');
    const votes = await query(
      `SELECT v.user_id, v.custom_text, v.created_at, u.nickname, u.avatar_url
       FROM post_poll_votes v
       LEFT JOIN users u ON v.user_id = u.id
       WHERE v.option_id IN (${placeholders}) AND v.custom_text IS NOT NULL AND v.custom_text != ''
       ORDER BY v.created_at DESC`,
      otherOptionIds
    );

    const items = votes.map(v => ({
      userId: v.user_id,
      nickname: v.nickname || '用户',
      avatar: v.avatar_url || null,
      customText: v.custom_text,
      createdAt: v.created_at
    }));

    res.json({ success: true, data: { items } });
  } catch (err) {
    logger.error(POLL_LOG, '其他详情', '获取其他选项详情失败', { postId, userId, error: err.message });
    res.status(500).json({ success: false, message: '获取详情失败' });
  }
};

module.exports = { createPoll, getPoll, vote, closePoll, updatePoll, getOtherDetails };

const { query, transaction } = require('../config/database');
const {
  computeStreakFromRows,
  calcStreakDays,
  calcRegisteredDays,
  getTitleByStreak,
  clearStreakCache,
  todayBeijingStr,
  toBeijingDateStr,
} = require('../utils/checkinBadgeHelper');

const MILESTONE_POINTS = { 7: 20, 15: 50, 30: 100, 60: 200 };
const MILESTONE_DAYS = [7, 15, 30, 60];

/**
 * POST /checkin — 今日签到
 * 全程在 transaction 内执行，INSERT IGNORE 防重复
 */
exports.checkin = async (req, res) => {
  const userId = req.user.id;
  const basePoints = 5;

  try {
    const result = await transaction(async (conn) => {
      // 1. INSERT IGNORE — 尝试插入签到记录
      const insertResult = await new Promise((resolve, reject) => {
        conn.query(
          'INSERT IGNORE INTO check_ins (user_id, check_in_date, points) VALUES (?, CURDATE(), ?)',
          [userId, basePoints],
          (err, result) => (err ? reject(err) : resolve(result))
        );
      });

      const isNew = insertResult.affectedRows === 1;

      if (isNew) {
        // 2. 计算当日附加分（有待办完成 +3）
        const todoRows = await new Promise((resolve, reject) => {
          conn.query(
            `SELECT COUNT(*) as cnt FROM todos
             WHERE user_id = ?
               AND completed >= UNIX_TIMESTAMP(CURDATE()) * 1000
               AND completed < UNIX_TIMESTAMP(CURDATE() + INTERVAL 1 DAY) * 1000`,
            [userId],
            (err, rows) => (err ? reject(err) : resolve(rows))
          );
        });
        const todoBonus = todoRows[0].cnt > 0 ? 3 : 0;
        const todayPoints = basePoints + todoBonus;

        // 3. 更新用户积分
        await new Promise((resolve, reject) => {
          conn.query(
            'UPDATE users SET total_points = total_points + ? WHERE id = ?',
            [todayPoints, userId],
            (err) => (err ? reject(err) : resolve())
          );
        });

        // 4. 计算当前连签天数（在事务内查询已包含新签到记录）
        const rows = await new Promise((resolve, reject) => {
          conn.query(
            'SELECT check_in_date FROM check_ins WHERE user_id = ? ORDER BY check_in_date DESC',
            [userId],
            (err, rows) => (err ? reject(err) : resolve(rows))
          );
        });
        let streak = computeStreakFromRows(rows);

        // 更新 current_streak
        await new Promise((resolve, reject) => {
          conn.query(
            'UPDATE users SET current_streak = ? WHERE id = ?',
            [streak, userId],
            (err) => (err ? reject(err) : resolve())
          );
        });

        // 5. 里程碑奖励
        let milestonePoints = 0;
        for (const day of MILESTONE_DAYS) {
          if (streak >= day) {
            const pts = MILESTONE_POINTS[day];
            const msResult = await new Promise((resolve, reject) => {
              conn.query(
                'INSERT IGNORE INTO checkin_milestones (user_id, milestone_day, points) VALUES (?, ?, ?)',
                [userId, day, pts],
                (err, r) => (err ? reject(err) : resolve(r))
              );
            });
            if (msResult.affectedRows === 1) {
              milestonePoints += pts;
              await new Promise((resolve, reject) => {
                conn.query(
                  'INSERT INTO points_log (user_id, type, points, note) VALUES (?, ?, ?, ?)',
                  [userId, 'earn', pts, `里程碑${day}天`],
                  (err) => (err ? reject(err) : resolve())
                );
              });
            }
          }
        }

        if (milestonePoints > 0) {
          await new Promise((resolve, reject) => {
            conn.query(
              'UPDATE users SET total_points = total_points + ? WHERE id = ?',
              [milestonePoints, userId],
              (err) => (err ? reject(err) : resolve())
            );
          });
        }

        // 6. 写入签到 points_log
        await new Promise((resolve, reject) => {
          conn.query(
            'INSERT INTO points_log (user_id, type, points, note) VALUES (?, ?, ?, ?)',
            [userId, 'earn', todayPoints, '签到'],
            (err) => (err ? reject(err) : resolve())
          );
        });

        // 清除缓存
        clearStreakCache(userId);

        // 查询最终积分
        const userRows = await new Promise((resolve, reject) => {
          conn.query(
            'SELECT total_points, current_streak FROM users WHERE id = ?',
            [userId],
            (err, rows) => (err ? reject(err) : resolve(rows))
          );
        });

        return {
          checkedIn: true,
          streakDays: userRows[0].current_streak,
          totalPoints: userRows[0].total_points,
          todayPoints,
          title: getTitleByStreak(userRows[0].current_streak),
        };
      } else {
        // 已签到 — 重新计算连签天数并更新 current_streak（修复历史数据）
        const rows = await new Promise((resolve, reject) => {
          conn.query(
            'SELECT check_in_date FROM check_ins WHERE user_id = ? ORDER BY check_in_date DESC',
            [userId],
            (err, rows) => (err ? reject(err) : resolve(rows))
          );
        });
        const recalcStreak = computeStreakFromRows(rows);
        await new Promise((resolve, reject) => {
          conn.query(
            'UPDATE users SET current_streak = ? WHERE id = ?',
            [recalcStreak, userId],
            (err) => (err ? reject(err) : resolve())
          );
        });

        const userRows = await new Promise((resolve, reject) => {
          conn.query(
            'SELECT total_points FROM users WHERE id = ?',
            [userId],
            (err, rows) => (err ? reject(err) : resolve(rows))
          );
        });
        return {
          checkedIn: true,
          streakDays: recalcStreak,
          totalPoints: userRows[0].total_points,
          todayPoints: 0,
          title: getTitleByStreak(recalcStreak),
        };
      }
    });

    const [registeredDays, totalRows] = await Promise.all([
      calcRegisteredDays(userId),
      query('SELECT COUNT(*) as total FROM check_ins WHERE user_id = ?', [userId]),
    ]);

    res.json({
      success: true,
      data: {
        ...result,
        registeredDays,
        totalCheckins: totalRows[0]?.total || 0,
      },
    });
  } catch (err) {
    console.error('Checkin error:', err);
    res.status(500).json({ success: false, message: '签到失败' });
  }
};

/**
 * GET /checkin/status — 查询签到状态
 */
exports.getStatus = async (req, res) => {
  const userId = req.user.id;
  const dateStr = req.query.date || todayBeijingStr();

  const todayStr = todayBeijingStr();
  if (dateStr > todayStr) {
    return res.status(400).json({ success: false, message: '不能查询未来日期' });
  }

  try {
    const [checkinRows, userRows, totalRows] = await Promise.all([
      query('SELECT id FROM check_ins WHERE user_id = ? AND check_in_date = ?', [userId, dateStr]),
      query('SELECT total_points FROM users WHERE id = ?', [userId]),
      query('SELECT COUNT(*) as total FROM check_ins WHERE user_id = ?', [userId]),
    ]);

    const checkedIn = checkinRows.length > 0;
    const streakDays = await calcStreakDays(userId);
    const totalPoints = userRows[0]?.total_points || 0;
    const totalCheckins = totalRows?.[0]?.total || 0;
    const registeredDays = await calcRegisteredDays(userId);

    res.json({
      success: true,
      data: {
        checkedIn,
        streakDays,
        totalPoints,
        todayPoints: checkedIn ? 0 : 5,
        title: streakDays >= 1 ? getTitleByStreak(streakDays) : '',
        registeredDays,
        totalCheckins,
      },
    });
  } catch (err) {
    console.error('Get checkin status error:', err);
    res.status(500).json({ success: false, message: '查询失败' });
  }
};

/**
 * GET /checkin/month — 月度签到日期列表
 */
exports.getMonth = async (req, res) => {
  const userId = req.user.id;
  const year = parseInt(req.query.year) || new Date().getFullYear();
  const month = parseInt(req.query.month) || (new Date().getMonth() + 1);

  try {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
    const rows = await query(
      'SELECT check_in_date FROM check_ins WHERE user_id = ? AND check_in_date >= ? AND check_in_date < ?',
      [userId, startDate, endDate]
    );

    res.json({
      success: true,
      data: {
        year,
        month,
        dates: rows.map(r => {
          const d = r.check_in_date;
          return typeof d === 'string' ? d : toBeijingDateStr(d);
        }),
        count: rows.length,
      },
    });
  } catch (err) {
    console.error('Get checkin month error:', err);
    res.status(500).json({ success: false, message: '查询失败' });
  }
};

/**
 * GET /checkin/leaderboard — 签到排行榜
 */
exports.getLeaderboard = async (req, res) => {
  const userId = req.user.id;
  const type = req.query.type || 'streak';

  try {
    let list, myRank, totalUsers;

    if (type === 'total') {
      list = await query(
        `SELECT id, nickname, avatar_url, total_points as value
         FROM users WHERE total_points > 0
         ORDER BY total_points DESC LIMIT 100`
      );
      myRank = await query(
        `SELECT COUNT(*) + 1 as rank, total_points as value
         FROM users WHERE total_points > (SELECT total_points FROM users WHERE id = ?)`,
        [userId]
      );
      const countRows = await query(
        'SELECT COUNT(*) as total FROM users WHERE total_points > 0'
      );
      totalUsers = countRows[0]?.total || 0;
    } else {
      // 实时从 check_ins 表计算连签天数（不依赖 current_streak 列）
      const rawList = await query(
        'SELECT id, nickname, avatar_url FROM users'
      );
      const userStreaks = await Promise.all(rawList.map(async (u) => {
        const rows = await query(
          'SELECT check_in_date FROM check_ins WHERE user_id = ? ORDER BY check_in_date DESC',
          [u.id]
        );
        return { ...u, value: computeStreakFromRows(rows) };
      }));
      const sorted = userStreaks.filter(u => u.value > 0).sort((a, b) => b.value - a.value);
      list = sorted.slice(0, 100);
      const myRow = userStreaks.find(u => u.id === userId);
      myRank = [{ rank: (userStreaks.filter(u => u.value > (myRow?.value || 0)).length) + 1, value: myRow?.value || 0 }];
      totalUsers = userStreaks.filter(u => u.value > 0).length;
    }

    const enrichedList = list.map((u, i) => ({
      rank: i + 1,
      userId: u.id,
      nickname: u.nickname || '用户',
      avatarUrl: u.avatar_url || '',
      value: u.value,
      title: type === 'streak' ? getTitleByStreak(u.value) : '',
    }));

    res.json({
      success: true,
      data: {
        type,
        list: enrichedList,
        myRank: {
          rank: myRank[0]?.rank || null,
          value: myRank[0]?.value || 0,
          title: type === 'streak' && (myRank[0]?.value || 0) >= 1 ? getTitleByStreak(myRank[0].value) : '',
        },
        totalUsers,
      },
    });
  } catch (err) {
    console.error('Get leaderboard error:', err);
    res.status(500).json({ success: false, message: '查询失败' });
  }
};

/**
 * POST /checkin/deduct-points — 消耗积分
 */
exports.deductPoints = async (req, res) => {
  const userId = req.user.id;
  const points = parseInt(req.body.points) || 0;

  if (points <= 0) {
    return res.status(400).json({ success: false, message: '积分参数错误' });
  }

  try {
    await transaction(async (conn) => {
      const userRows = await new Promise((resolve, reject) => {
        conn.query(
          'SELECT total_points FROM users WHERE id = ? FOR UPDATE',
          [userId],
          (err, rows) => (err ? reject(err) : resolve(rows))
        );
      });

      if (!userRows.length || userRows[0].total_points < points) {
        throw { status: 400, message: '积分不足' };
      }

      await new Promise((resolve, reject) => {
        conn.query(
          'UPDATE users SET total_points = total_points - ? WHERE id = ?',
          [points, userId],
          (err) => (err ? reject(err) : resolve())
        );
      });

      await new Promise((resolve, reject) => {
        conn.query(
          'INSERT INTO points_log (user_id, type, points, note) VALUES (?, ?, ?, ?)',
          [userId, 'deduct', points, '分享配置'],
          (err) => (err ? reject(err) : resolve())
        );
      });

      const remaining = userRows[0].total_points - points;
      return { remaining };
    }).then((data) => {
      res.json({ success: true, data });
    }).catch((err) => {
      if (err.status) {
        res.status(err.status).json({ success: false, message: err.message });
      } else {
        throw err;
      }
    });
  } catch (err) {
    console.error('Deduct points error:', err);
    res.status(500).json({ success: false, message: '扣分失败' });
  }
};

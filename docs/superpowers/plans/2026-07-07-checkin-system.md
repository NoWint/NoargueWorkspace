# 签到系统 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full check-in system with streak tracking, badge integration, points system, milestones, leaderboard, and share-config points spending.

**Architecture:** Backend adds check-in routes/controller + shared badge helper + modifies 7 existing controllers to append dynamic badges. Frontend adds 2 new subpackage pages (checkin detail + leaderboard), a check-in card on community-home, a menu entry on more page, and share-config points integration.

**Tech Stack:** Node.js/Express, MySQL (+08:00 timezone), WeChat Mini Program, TDesign Miniprogram

---

### Task 1: Backend DB Migration — Create check-in tables + users columns

**Files:**
- Create: `backend/migrations/025_add_checkin_tables.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- 025_add_checkin_tables.sql
-- TimeGreen Path Todo — check-in system schema

-- 签到记录表
CREATE TABLE IF NOT EXISTS check_ins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  check_in_date DATE NOT NULL,
  points INT DEFAULT 5 COMMENT '本次签到获得积分',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_date (user_id, check_in_date),
  INDEX idx_user_date (user_id, check_in_date DESC),
  INDEX idx_date (check_in_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 里程碑奖励记录表
CREATE TABLE IF NOT EXISTS checkin_milestones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  milestone_day INT NOT NULL COMMENT '里程碑连续天数（7/15/30/60）',
  points INT NOT NULL COMMENT '本次奖励积分',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_milestone (user_id, milestone_day),
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 积分变动审计表
CREATE TABLE IF NOT EXISTS points_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type VARCHAR(20) NOT NULL COMMENT 'earn/deduct',
  points INT NOT NULL COMMENT '正数',
  note VARCHAR(255) DEFAULT '' COMMENT '备注，如"签到" "分享配置" "里程碑7天"',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_created (user_id, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 用户表追加字段
ALTER TABLE users
  ADD COLUMN total_points INT DEFAULT 0 COMMENT '总积分' AFTER badge_colors;

ALTER TABLE users
  ADD COLUMN current_streak INT DEFAULT 0 COMMENT '当前连签天数' AFTER total_points;
```

- [ ] **Step 2: Run the migration**

Run: `mysql -u root timegreenpath < backend/migrations/025_add_checkin_tables.sql`
Expected: Tables created, users table altered.

- [ ] **Step 3: Commit**

```bash
git add backend/migrations/025_add_checkin_tables.sql
git commit -m "feat: add check-in tables and users columns"
```

---

### Task 2: Backend Utility — checkinBadgeHelper.js

**Files:**
- Create: `backend/utils/checkinBadgeHelper.js`

- [ ] **Step 1: Create the shared helper**

```js
// backend/utils/checkinBadgeHelper.js
const { query } = require('../config/database');

const TITLE_TABLE = {
  1: { title: '初来乍到', color: '#00b26a' },
  3: { title: '渐入佳境', color: '#00b26a' },
  7: { title: '坚持不懈', color: '#f59e0b' },
  15: { title: '热情如火', color: '#f59e0b' },
  30: { title: '持之以恒', color: '#f97316' },
  60: { title: '绿径守护者', color: '#f97316' },
  100: { title: '时光旅人', color: '#ec4899' },
  365: { title: '传奇永恒', color: '#8b5cf6' },
};

function getTitleByStreak(days) {
  const thresholds = Object.keys(TITLE_TABLE).map(Number).sort((a, b) => b - a);
  for (const t of thresholds) {
    if (days >= t) return TITLE_TABLE[t].title;
  }
  return '';
}

function getTitleColor(days) {
  const thresholds = Object.keys(TITLE_TABLE).map(Number).sort((a, b) => b - a);
  for (const t of thresholds) {
    if (days >= t) return TITLE_TABLE[t].color;
  }
  return '#00b26a';
}

/**
 * 计算连签天数 — 索引覆盖扫描，无 LIMIT，但断签即 break
 */
async function calcStreakDays(userId) {
  const rows = await query(
    'SELECT check_in_date FROM check_ins WHERE user_id = ? ORDER BY check_in_date DESC',
    [userId]
  );
  let streak = 0;
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
  for (let i = 0; i < rows.length; i++) {
    const expectedDate = new Date(todayStr);
    expectedDate.setDate(expectedDate.getDate() - streak);
    const expectedStr = expectedDate.toISOString().slice(0, 10);
    if (rows[i].check_in_date === expectedStr) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/**
 * 获取已注册天数（最小 1 天）
 */
async function calcRegisteredDays(userId) {
  const rows = await query(
    'SELECT DATEDIFF(NOW(), created_at) as days FROM users WHERE id = ?',
    [userId]
  );
  return rows.length > 0 ? Math.max(1, rows[0].days) : 1;
}

/**
 * 拼接签到 badge 与自定义 badge（请求级缓存版本）
 */
const streakCache = new Map();

async function appendCheckinBadges(userId, customTitles, customColors) {
  if (!streakCache.has(userId)) {
    const [streak, registered] = await Promise.all([
      calcStreakDays(userId),
      calcRegisteredDays(userId),
    ]);
    streakCache.set(userId, { streak, registered });
  }
  const { streak, registered } = streakCache.get(userId);

  const MAX_BADGES = 6;
  const safeTitles = Array.isArray(customTitles) ? customTitles : [];
  const safeColors = Array.isArray(customColors) ? customColors : [];
  const maxCustom = MAX_BADGES - 3;
  const trimmedTitles = safeTitles.slice(0, maxCustom);
  const trimmedColors = safeColors.slice(0, maxCustom);

  const checkinBadges = [];
  const checkinColors = [];
  if (streak >= 1) {
    checkinBadges.push(getTitleByStreak(streak));
    checkinColors.push(getTitleColor(streak));
    checkinBadges.push(`连签${streak}天`);
    checkinColors.push('#00b26a');
  }

  checkinBadges.push(`已注册${registered}天`);
  checkinColors.push('#999999');

  return {
    badgeTitles: [...trimmedTitles, ...checkinBadges],
    badgeColors: [...trimmedColors, ...checkinColors],
  };
}

function clearStreakCache() {
  streakCache.clear();
}

module.exports = {
  appendCheckinBadges,
  calcStreakDays,
  calcRegisteredDays,
  getTitleByStreak,
  getTitleColor,
  clearStreakCache,
  TITLE_TABLE,
};
```

- [ ] **Step 2: Commit**

```bash
git add backend/utils/checkinBadgeHelper.js
git commit -m "feat: add checkinBadgeHelper shared utility"
```

---

### Task 3: Backend — Check-in Controller

**Files:**
- Create: `backend/controllers/checkinController.js`

- [ ] **Step 1: Create the controller**

```js
// backend/controllers/checkinController.js
const { query, transaction } = require('../config/database');
const {
  calcStreakDays,
  calcRegisteredDays,
  getTitleByStreak,
  clearStreakCache,
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

        // 3. 更新用户积分（先只加基础分 + 待办附加分）
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
        let streak = 0;
        const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
        for (let i = 0; i < rows.length; i++) {
          const expectedDate = new Date(todayStr);
          expectedDate.setDate(expectedDate.getDate() - streak);
          const expectedStr = expectedDate.toISOString().slice(0, 10);
          if (rows[i].check_in_date === expectedStr) {
            streak++;
          } else {
            break;
          }
        }

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
              // 写入 points_log
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
        clearStreakCache();

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
        // 已签到 — 查询当前状态
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
          todayPoints: 0,
          title: getTitleByStreak(userRows[0].current_streak),
        };
      }
    });

    // 查询注册天数（单独，不需要事务）
    const registeredDays = await calcRegisteredDays(userId);

    res.json({
      success: true,
      data: {
        ...result,
        registeredDays,
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
  const dateStr = req.query.date || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });

  // 校验未来日期
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
  if (dateStr > todayStr) {
    return res.status(400).json({ success: false, message: '不能查询未来日期' });
  }

  try {
    const [checkinRows, userRows] = await Promise.all([
      query('SELECT id FROM check_ins WHERE user_id = ? AND check_in_date = ?', [userId, dateStr]),
      query('SELECT total_points, current_streak FROM users WHERE id = ?', [userId]),
    ]);

    const checkedIn = checkinRows.length > 0;
    const streakDays = userRows[0]?.current_streak || 0;
    const totalPoints = userRows[0]?.total_points || 0;
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
    const rows = await query(
      'SELECT check_in_date FROM check_ins WHERE user_id = ? AND YEAR(check_in_date) = ? AND MONTH(check_in_date) = ?',
      [userId, year, month]
    );

    res.json({
      success: true,
      data: {
        year,
        month,
        dates: rows.map(r => {
          const d = r.check_in_date;
          return typeof d === 'string' ? d : d.toISOString().slice(0, 10);
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
    let list, myRank;

    if (type === 'total') {
      // 积分排行
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
    } else {
      // 连签排行
      list = await query(
        `SELECT id, nickname, avatar_url, current_streak as value
         FROM users WHERE current_streak > 0
         ORDER BY current_streak DESC LIMIT 100`
      );
      myRank = await query(
        `SELECT COUNT(*) + 1 as rank, current_streak as value
         FROM users WHERE current_streak > (SELECT current_streak FROM users WHERE id = ?)`,
        [userId]
      );
    }

    // 给每个用户添加称号
    const enrichedList = list.map((u, i) => ({
      rank: i + 1,
      userId: u.id,
      nickname: u.nickname || '用户',
      avatarUrl: u.avatar_url || '',
      value: u.value,
      title: type === 'streak' ? getTitleByStreak(u.value) : '',
    }));

    const totalUsers = list.length;

    res.json({
      success: true,
      data: {
        type,
        list: enrichedList,
        myRank: {
          rank: myRank[0]?.rank || null,
          value: myRank[0]?.value || 0,
          title: type === 'streak' && myRank[0]?.value >= 1 ? getTitleByStreak(myRank[0].value) : '',
        },
        totalUsers: totalUsers > 0 ? Math.max(totalUsers, myRank[0]?.rank || 0) : 0,
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
      // SELECT FOR UPDATE 加锁检查余额
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

      // 扣除积分
      await new Promise((resolve, reject) => {
        conn.query(
          'UPDATE users SET total_points = total_points - ? WHERE id = ?',
          [points, userId],
          (err) => (err ? reject(err) : resolve())
        );
      });

      // 写入审计
      await new Promise((resolve, reject) => {
        conn.query(
          'INSERT INTO points_log (user_id, type, points, note) VALUES (?, ?, ?, ?)',
          [userId, 'deduct', points, '分享配置'],
          (err) => (err ? reject(err) : resolve())
        );
      });

      // 查询剩余积分
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
```

- [ ] **Step 2: Commit**

```bash
git add backend/controllers/checkinController.js
git commit -m "feat: add checkin controller"
```

---

### Task 4: Backend — Check-in Routes + Register in app.js

**Files:**
- Create: `backend/routes/checkinRoutes.js`
- Modify: `backend/app.js` (add route import + mount)

- [ ] **Step 1: Create route file**

```js
// backend/routes/checkinRoutes.js
const express = require('express');
const router = express.Router();
const checkinController = require('../controllers/checkinController');
const { authMiddleware } = require('../middleware/auth');

router.post('/', authMiddleware, checkinController.checkin);
router.get('/status', authMiddleware, checkinController.getStatus);
router.get('/month', authMiddleware, checkinController.getMonth);
router.get('/leaderboard', authMiddleware, checkinController.getLeaderboard);
router.post('/deduct-points', authMiddleware, checkinController.deductPoints);

module.exports = router;
```

- [ ] **Step 2: Register in app.js (around line 26, after userRoutes)**

```js
// Add after: const userRoutes = require('./routes/userRoutes');
const checkinRoutes = require('./routes/checkinRoutes');

// Add after: app.use('/users', userRoutes);
app.use('/checkin', checkinRoutes);
```

- [ ] **Step 3: Commit**

```bash
git add backend/routes/checkinRoutes.js backend/app.js
git commit -m "feat: add checkin routes and register in app.js"
```

---

### Task 5: Backend — Inject Badges into authController

**Files:**
- Modify: `backend/controllers/authController.js`

The login and getUserInfo functions need to append check-in badges to the returned `badgeTitles` and `badgeColors`.

- [ ] **Step 1: Add the require at top of file**

```js
// Add with other requires:
const { appendCheckinBadges, clearStreakCache } = require('../utils/checkinBadgeHelper');
```

- [ ] **Step 2: In the login response (where badgeTitles/badgeColors are set), replace the raw values with appended values**

Find where the response object sets `badgeTitles: row.badge_titles` or similar. Replace with:

```js
const badgeData = appendCheckinBadges(
  row.id,
  row.badge_titles ? JSON.parse(row.badge_titles) : [],
  row.badge_colors ? JSON.parse(row.badge_colors) : []
);
```

Then in the response, use `badgeData.badgeTitles` and `badgeData.badgeColors` instead.

- [ ] **Step 3: Same for getUserInfo** — find the badge return and apply same pattern.

- [ ] **Step 4: Add a response middleware or call `clearStreakCache()` at the end of each request to clear the request-level streak cache** — or rely on it being per-request (the cache is module-level, so each HTTP request to the same process shares it; add clear in the response):

```js
// After the response is sent
clearStreakCache();
```

- [ ] **Step 5: Commit**

```bash
git add backend/controllers/authController.js
git commit -m "feat: inject checkin badges in authController"
```

---

### Task 6: Backend — Inject Badges into userController

**Files:**
- Modify: `backend/controllers/userController.js`

- [ ] **Step 1: Add require**

```js
const { appendCheckinBadges } = require('../utils/checkinBadgeHelper');
```

- [ ] **Step 2: In getProfile, find where badgeTitles/badgeColors are returned and replace with appended values**

```js
const badgeData = appendCheckinBadges(
  user.id,
  user.badge_titles ? JSON.parse(user.badge_titles) : [],
  user.badge_colors ? JSON.parse(user.badge_colors) : []
);
```

- [ ] **Step 3: Commit**

```bash
git add backend/controllers/userController.js
git commit -m "feat: inject checkin badges in userController"
```

---

### Task 7: Backend — Inject Badges into postsController, commentController, postCommentsController, likesController

**Files:**
- Modify: `backend/controllers/postsController.js`
- Modify: `backend/controllers/commentController.js`
- Modify: `backend/controllers/postCommentsController.js`
- Modify: `backend/controllers/likesController.js`

These 4 controllers each have a local `parseBadges` or `getBadges` function that reads `badge_titles`/`badge_colors` from DB row objects. Each needs to:

1. Add `const { appendCheckinBadges } = require('../utils/checkinBadgeHelper');`
2. Modify the parse function to accept `userId` and call `appendCheckinBadges(userId, titles, colors)`.
3. Callers of `parseBadges(row)` need `row.user_id` passed.

**postsController.js pattern:**

```js
// Replace the local parseBadges function:
function parseBadges(row) {
  const titles = row.badge_titles ? JSON.parse(row.badge_titles) : [];
  const colors = row.badge_colors ? JSON.parse(row.badge_colors) : [];
  const result = appendCheckinBadges(row.user_id, titles, colors);
  return {
    badgeTitles: result.badgeTitles,
    badgeColors: result.badgeColors,
  };
}
```

Same pattern for all 4 controllers.

- [ ] **Step 1: Modify postsController.js**

- [ ] **Step 2: Modify commentController.js**

- [ ] **Step 3: Modify postCommentsController.js**

- [ ] **Step 4: Modify likesController.js**

- [ ] **Step 5: Commit**

```bash
git add backend/controllers/postsController.js backend/controllers/commentController.js backend/controllers/postCommentsController.js backend/controllers/likesController.js
git commit -m "feat: inject checkin badges in post/comment/like controllers"
```

---

### Task 8: Frontend — Register new pages in app.json + update preloadRule

**Files:**
- Modify: `app.json`

- [ ] **Step 1: Add checkin pages to packagePages subpackage**

In `app.json`, find the `packagePages` subpackage definition (line 52-66) and add two new entries:

```json
{
  "root": "packagePages",
  "name": "pages",
  "pages": [
    "add-todo/add-todo",
    "changelog/changelog",
    "daily-stats/daily-stats",
    "day-todos/day-todos",
    "guide/guide",
    "login/login",
    "notice/notice",
    "todo-detail/todo-detail",
    "share-config/share-config",
    "todo-search/todo-search",
    "user-center/user-center",
    "checkin/checkin",
    "checkinLeaderboard/checkinLeaderboard"
  ]
}
```

- [ ] **Step 2: Update preloadRule for community-home**

Find the community-home preload rule and add "pages" package:

```json
"pages/community-home/community-home": {
  "network": "all",
  "packages": ["community", "pages"]
}
```

- [ ] **Step 3: Commit**

```bash
git add app.json
git commit -m "feat: register checkin pages in app.json"
```

---

### Task 9: Frontend — Check-in Detail Page

**Files:**
- Create: `packagePages/checkin/checkin.wxml`
- Create: `packagePages/checkin/checkin.wxss`
- Create: `packagePages/checkin/checkin.js`
- Create: `packagePages/checkin/checkin.json`

- [ ] **Step 1: Create checkin.json**

```json
{
  "navigationStyle": "custom",
  "enablePullDownRefresh": true,
  "usingComponents": {
    "t-icon": "tdesign-miniprogram/icon/icon",
    "t-button": "tdesign-miniprogram/button/button",
    "t-cell": "tdesign-miniprogram/cell/cell",
    "t-popup": "tdesign-miniprogram/popup/popup"
  }
}
```

- [ ] **Step 2: Create checkin.wxml**

```xml
<view class="page">
  <!-- Navigation Bar -->
  <view class="nav-bar" style="padding-top:{{navBarHeight}}px;">
    <view class="nav-inner">
      <t-icon name="chevron-left" size="48rpx" color="#333" bindtap="onBack" />
      <text class="nav-title">签到打卡</text>
      <t-icon name="rank" size="40rpx" color="#00b26a" bindtap="goToLeaderboard" />
    </view>
  </view>

  <scroll-view scroll-y class="scroll-view" bind:scrolltolower="onLoadMore">
    <!-- 上半区：签到操作 + 月历 -->
    <view class="upper-section">
      <!-- 签到头部 -->
      <view class="checkin-header">
        <view class="checkin-left">
          <view class="streak-row">
            <t-icon name="check-circle-filled" size="36rpx" color="#00b26a" />
            <text class="streak-num" animation="{{streakAnim}}">{{streakDays}}</text>
            <text class="streak-label">天连签</text>
          </view>
          <view class="week-badge">{{yearWeek}}</view>
          <view class="badge-row" wx:if="{{badgeList.length > 0}}">
            <view
              wx:for="{{badgeList}}"
              wx:key="index"
              class="badge-item"
              style="border-color: {{item.color}}; color: {{item.color}}; {{item.flash ? 'animation: flash 0.6s;' : ''}}"
            >{{item.text}}</view>
          </view>
        </view>
        <view class="checkin-right">
          <view class="checkin-btn {{checkedIn ? 'checked' : ''}}" bindtap="onCheckin">
            <t-icon wx:if="{{checkedIn}}" name="check" size="40rpx" color="white" />
            <text wx:else class="btn-text">签</text>
          </view>
          <text class="btn-sub-text">{{checkedIn ? '已签到' : '签到'}}</text>
        </view>
      </view>

      <!-- 月历 -->
      <view class="calendar-section">
        <view class="calendar-header">
          <t-icon name="chevron-left" size="32rpx" color="#999" bindtap="prevMonth" />
          <text class="calendar-title">{{calendarTitle}}</text>
          <t-icon name="chevron-right" size="32rpx" color="#999" bindtap="nextMonth" />
        </view>
        <view class="calendar-grid">
          <view class="cal-weekday" wx:for="{{['日','一','二','三','四','五','六']}}" wx:key="*this">{{item}}</view>
          <view
            wx:for="{{calendarDays}}"
            wx:key="index"
            class="cal-day"
            style="{{item.isToday ? 'border: 2rpx solid #00b26a; background: #e8f8f0;' : ''}} {{item.isChecked ? 'background: #00b26a; color: white; border-radius: 50%;' : ''}} {{!item.isCurrentMonth ? 'color: #ddd;' : ''}}"
          >
            {{item.day}}
          </view>
        </view>
      </view>
    </view>

    <!-- 下半区：统计 + 里程碑 -->
    <view class="lower-section">
      <!-- 统计卡片 -->
      <view class="stats-row">
        <view class="stat-card">
          <text class="stat-num">{{totalPoints}}</text>
          <text class="stat-label">总积分</text>
        </view>
        <view class="stat-card">
          <text class="stat-num">{{monthCount}}</text>
          <text class="stat-label">本月签到</text>
        </view>
        <view class="stat-card">
          <text class="stat-num">{{totalCheckins}}</text>
          <text class="stat-label">累计签到</text>
        </view>
      </view>

      <!-- 里程碑 -->
      <view class="milestone-section">
        <text class="section-title">签到奖励里程碑</text>
        <view class="milestone-row">
          <view
            wx:for="{{milestones}}"
            wx:key="day"
            class="milestone-card {{item.achieved ? 'achieved' : ''}}"
          >
            <t-icon wx:if="{{item.achieved}}" name="check" size="28rpx" color="#00b26a" />
            <text class="ms-day">{{item.day}}天</text>
            <text class="ms-title">{{item.title}}</text>
            <text class="ms-points">{{item.achieved ? '✓ 已达成' : '+' + item.points + '分'}}</text>
          </view>
        </view>
      </view>

      <!-- 积分规则 -->
      <view class="rules-section">
        <text class="section-title">积分获取规则</text>
        <view class="rule-item">• 每日签到 +5 分</view>
        <view class="rule-item">• 签到当日完成待办额外 +3 分</view>
        <view class="rule-item">• 连签7天里程碑 +20 分</view>
        <view class="rule-item">• 连签15天里程碑 +50 分</view>
        <view class="rule-item">• 连签30天里程碑 +100 分</view>
        <view class="rule-item">• 连签60天里程碑 +200 分</view>
        <view class="rule-item">• 分享配置自定义消耗 2 积分</view>
      </view>
    </view>
  </scroll-view>
</view>
```

- [ ] **Step 3: Create checkin.wxss**

```css
.page { min-height: 100vh; background: #f5f5f5; }
.nav-bar { position: sticky; top: 0; z-index: 10; background: rgba(255,255,255,0.9); backdrop-filter: blur(10px); }
.nav-inner { display: flex; align-items: center; justify-content: space-between; padding: 10rpx 30rpx; }
.nav-title { font-size: 32rpx; font-weight: 600; }
.scroll-view { height: calc(100vh - 88px); }

.upper-section { background: #fff; margin: 20rpx; border-radius: 32rpx; padding: 30rpx; box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.04); }
.checkin-header { display: flex; justify-content: space-between; align-items: flex-start; }
.streak-row { display: flex; align-items: center; gap: 8rpx; }
.streak-num { font-size: 48rpx; font-weight: 700; color: #00b26a; }
.streak-label { font-size: 26rpx; color: #666; }
.week-badge { font-size: 20rpx; color: #999; background: #f5f5f5; padding: 4rpx 16rpx; border-radius: 20rpx; display: inline-block; margin: 8rpx 0; }
.badge-row { display: flex; gap: 8rpx; flex-wrap: wrap; margin-top: 8rpx; }
.badge-item { font-size: 20rpx; padding: 2rpx 14rpx; border-radius: 20rpx; border: 2rpx solid; }
.checkin-right { text-align: center; }
.checkin-btn { width: 100rpx; height: 100rpx; border-radius: 50%; background: linear-gradient(135deg, #00b26a, #3ddaa0); display: flex; align-items: center; justify-content: center; box-shadow: 0 4rpx 20rpx rgba(0,178,106,0.3); }
.checkin-btn.checked { background: #ccc; box-shadow: none; }
.btn-text { font-size: 36rpx; color: white; font-weight: 700; }
.btn-sub-text { font-size: 22rpx; color: #00b26a; margin-top: 8rpx; }

.calendar-section { margin-top: 30rpx; }
.calendar-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20rpx; }
.calendar-title { font-size: 28rpx; font-weight: 600; }
.calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; gap: 8rpx; }
.cal-weekday { font-size: 24rpx; color: #999; padding: 8rpx 0; }
.cal-day { font-size: 26rpx; padding: 12rpx 0; }

.lower-section { margin: 0 20rpx 20rpx; }
.stats-row { display: flex; gap: 16rpx; margin-bottom: 20rpx; }
.stat-card { flex: 1; background: #f0fdf4; border-radius: 24rpx; padding: 20rpx; text-align: center; }
.stat-num { font-size: 40rpx; font-weight: 700; color: #00b26a; display: block; }
.stat-label { font-size: 22rpx; color: #666; margin-top: 4rpx; }

.milestone-section { background: #fff; border-radius: 32rpx; padding: 30rpx; margin-bottom: 20rpx; box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.04); }
.section-title { font-size: 28rpx; font-weight: 600; display: block; margin-bottom: 20rpx; }
.milestone-row { display: flex; gap: 12rpx; }
.milestone-card { flex: 1; text-align: center; background: #f5f5f5; border-radius: 20rpx; padding: 16rpx 8rpx; }
.milestone-card.achieved { background: #f0fdf4; border: 2rpx solid #00b26a; }
.ms-day { font-size: 28rpx; font-weight: 700; color: #333; display: block; }
.milestone-card.achieved .ms-day { color: #00b26a; }
.ms-title { font-size: 20rpx; color: #999; display: block; margin: 4rpx 0; }
.ms-points { font-size: 20rpx; color: #ccc; display: block; }

.rules-section { background: #fff; border-radius: 32rpx; padding: 30rpx; box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.04); }
.rule-item { font-size: 24rpx; color: #666; padding: 8rpx 0; }

@keyframes flash {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

- [ ] **Step 4: Create checkin.js**

```js
const app = getApp();
const { checkinApi } = require('../../utils/api');

Page({
  data: {
    navBarHeight: app.globalData.navBarHeight || 44,
    checkedIn: false,
    streakDays: 0,
    totalPoints: 0,
    monthCount: 0,
    totalCheckins: 0,
    yearWeek: '',
    badgeList: [],
    calendarTitle: '',
    calendarDays: [],
    milestones: [
      { day: 7, title: '坚持不懈', points: 20, achieved: false },
      { day: 15, title: '热情如火', points: 50, achieved: false },
      { day: 30, title: '持之以恒', points: 100, achieved: false },
      { day: 60, title: '绿径守护者', points: 200, achieved: false },
    ],
    currentYear: 0,
    currentMonth: 0,
    streakAnim: {},
  },

  onLoad() {
    const now = new Date();
    this.setData({
      currentYear: now.getFullYear(),
      currentMonth: now.getMonth() + 1,
    });
    this._computeYearWeek();
    this.loadAllData();
  },

  onPullDownRefresh() {
    this.loadAllData().then(() => wx.stopPullDownRefresh());
  },

  async loadAllData() {
    try {
      const [statusRes, monthRes] = await Promise.all([
        checkinApi.getStatus(),
        checkinApi.getMonth(this.data.currentYear, this.data.currentMonth),
      ]);

      if (statusRes.success) {
        const d = statusRes.data;
        this.setData({
          checkedIn: d.checkedIn,
          streakDays: d.streakDays,
          totalPoints: d.totalPoints,
          badgeList: this._buildBadgeList(d.streakDays, d.registeredDays),
        });
      }

      if (monthRes.success) {
        const d = monthRes.data;
        this.setData({
          monthCount: d.count,
          totalCheckins: d.count,
        });
        this._buildCalendar(d.dates);
      }

      // 加载里程碑完成状态
      await this._loadMilestones();
    } catch (err) {
      console.error('加载签到数据失败', err);
    }
  },

  _computeYearWeek() {
    const now = new Date();
    const year = now.getFullYear();
    const start = new Date(year, 0, 1);
    const diff = (now - start) / 86400000;
    const week = Math.ceil((diff + start.getDay() + 1) / 7);
    this.setData({ yearWeek: `${year} · 第${week}周` });
  },

  _buildBadgeList(streakDays, registeredDays) {
    const list = [];
    if (streakDays >= 1) {
      const title = this._getTitle(streakDays);
      const color = this._getTitleColor(streakDays);
      list.push({ text: title, color });
      list.push({ text: `连签${streakDays}天`, color: '#00b26a' });
    }
    list.push({ text: `已注册${registeredDays}天`, color: '#999999' });
    return list;
  },

  _getTitle(days) {
    const table = { 1: '初来乍到', 3: '渐入佳境', 7: '坚持不懈', 15: '热情如火', 30: '持之以恒', 60: '绿径守护者', 100: '时光旅人', 365: '传奇永恒' };
    const keys = Object.keys(table).map(Number).sort((a, b) => b - a);
    for (const k of keys) { if (days >= k) return table[k]; }
    return '';
  },

  _getTitleColor(days) {
    const table = { 1: '#00b26a', 3: '#00b26a', 7: '#f59e0b', 15: '#f59e0b', 30: '#f97316', 60: '#f97316', 100: '#ec4899', 365: '#8b5cf6' };
    const keys = Object.keys(table).map(Number).sort((a, b) => b - a);
    for (const k of keys) { if (days >= k) return table[k]; }
    return '#00b26a';
  },

  _buildCalendar(checkedDates) {
    const { currentYear: year, currentMonth: month } = this.data;
    this.setData({ calendarTitle: `${year}年${month}月` });

    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const calendarDays = [];
    // 上月补齐
    for (let i = 0; i < firstDay; i++) {
      calendarDays.push({ day: '', isCurrentMonth: false, isChecked: false, isToday: false });
    }
    // 本月
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      calendarDays.push({
        day: d,
        isCurrentMonth: true,
        isChecked: checkedDates.includes(dateStr),
        isToday: dateStr === todayStr,
      });
    }

    this.setData({ calendarDays });
  },

  async _loadMilestones() {
    // 从 API 获取已达成里程碑（需要额外端点或从签到结果判断）
    // 简单方案：如果 streakDays >= milestone.day 则标记为 achieved
    const { streakDays } = this.data;
    const milestones = this.data.milestones.map(m => ({
      ...m,
      achieved: streakDays >= m.day,
    }));
    this.setData({ milestones });
  },

  async onCheckin() {
    if (this.data.checkedIn) return;
    try {
      const res = await checkinApi.checkin();
      if (res.success) {
        const d = res.data;
        this.setData({
          checkedIn: true,
          streakDays: d.streakDays,
          totalPoints: d.totalPoints,
          badgeList: this._buildBadgeList(d.streakDays, d.registeredDays),
        });
        this._loadMilestones();
        wx.showToast({ title: `签到成功 +${d.todayPoints}分`, icon: 'success' });
      }
    } catch (err) {
      wx.showToast({ title: '签到失败', icon: 'none' });
    }
  },

  prevMonth() {
    let { currentYear, currentMonth } = this.data;
    currentMonth--;
    if (currentMonth < 1) { currentMonth = 12; currentYear--; }
    this.setData({ currentYear, currentMonth });
    this._loadMonthData();
  },

  nextMonth() {
    let { currentYear, currentMonth } = this.data;
    currentMonth++;
    if (currentMonth > 12) { currentMonth = 1; currentYear++; }
    this.setData({ currentYear, currentMonth });
    this._loadMonthData();
  },

  async _loadMonthData() {
    try {
      const res = await checkinApi.getMonth(this.data.currentYear, this.data.currentMonth);
      if (res.success) {
        this._buildCalendar(res.data.dates);
      }
    } catch (err) {
      console.error('加载月历数据失败', err);
    }
  },

  goToLeaderboard() {
    wx.navigateTo({ url: '/packagePages/checkinLeaderboard/checkinLeaderboard' });
  },

  onBack() {
    wx.navigateBack();
  },
});
```

- [ ] **Step 5: Add checkinApi methods to utils/api.js**

Find the `api` exports and add:

```js
const checkinApi = {
  checkin: () => request('/checkin', { method: 'POST' }),
  getStatus: (date) => request(`/checkin/status${date ? '?date=' + date : ''}`),
  getMonth: (year, month) => request(`/checkin/month?year=${year}&month=${month}`),
  getLeaderboard: (type) => request(`/checkin/leaderboard?type=${type || 'streak'}`),
  deductPoints: (points) => request('/checkin/deduct-points', { method: 'POST', data: { points } }),
};
```

- [ ] **Step 6: Commit**

```bash
git add packagePages/checkin/ utils/api.js
git commit -m "feat: add checkin detail page"
```

---

### Task 10: Frontend — Check-in Leaderboard Page

**Files:**
- Create: `packagePages/checkinLeaderboard/checkinLeaderboard.wxml`
- Create: `packagePages/checkinLeaderboard/checkinLeaderboard.wxss`
- Create: `packagePages/checkinLeaderboard/checkinLeaderboard.js`
- Create: `packagePages/checkinLeaderboard/checkinLeaderboard.json`

- [ ] **Step 1: Create checkinLeaderboard.json**

```json
{
  "navigationBarTitleText": "签到排行榜",
  "enablePullDownRefresh": true,
  "usingComponents": {
    "t-icon": "tdesign-miniprogram/icon/icon",
    "t-tabs": "tdesign-miniprogram/tabs/tabs",
    "t-tab-panel": "tdesign-miniprogram/tab-panel/tab-panel"
  }
}
```

- [ ] **Step 2: Create checkinLeaderboard.wxml**

```xml
<view class="page">
  <!-- 自己的排名卡片 -->
  <view class="my-rank-card" wx:if="{{myRank.rank}}">
    <view class="rank-left">
      <text class="my-label">我的排名</text>
      <text class="my-rank-num">#{{myRank.rank}}</text>
    </view>
    <view class="rank-right">
      <text class="my-value">{{myRank.value}}{{tabType === 'streak' ? '天' : '分'}}</text>
      <text class="my-title" wx:if="{{myRank.title}}">{{myRank.title}}</text>
    </view>
  </view>

  <t-tabs value="{{tabType}}" bind:change="onTabChange">
    <t-tab-panel label="连签排行" value="streak">
      <view wx:for="{{leaderList}}" wx:key="rank" class="rank-item {{item.isMe ? 'me' : ''}}">
        <text class="rank-num {{item.rank <= 3 ? 'top' : ''}}">{{item.rank}}</text>
        <image class="rank-avatar" src="{{item.avatarUrl || '../../images/avatar.png'}}" />
        <view class="rank-info">
          <text class="rank-name">{{item.nickname}}</text>
          <text class="rank-title" wx:if="{{item.title}}">{{item.title}}</text>
        </view>
        <text class="rank-value">{{item.value}} 天</text>
      </view>
      <view wx:if="{{leaderList.length === 0}}" class="empty">暂无数据</view>
    </t-tab-panel>

    <t-tab-panel label="积分排行" value="total">
      <view wx:for="{{leaderList}}" wx:key="rank" class="rank-item {{item.isMe ? 'me' : ''}}">
        <text class="rank-num {{item.rank <= 3 ? 'top' : ''}}">{{item.rank}}</text>
        <image class="rank-avatar" src="{{item.avatarUrl || '../../images/avatar.png'}}" />
        <view class="rank-info">
          <text class="rank-name">{{item.nickname}}</text>
        </view>
        <text class="rank-value">{{item.value}} 分</text>
      </view>
      <view wx:if="{{leaderList.length === 0}}" class="empty">暂无数据</view>
    </t-tab-panel>
  </t-tabs>
</view>
```

- [ ] **Step 3: Create checkinLeaderboard.wxss**

```css
.page { min-height: 100vh; background: #f5f5f5; }
.my-rank-card { display: flex; justify-content: space-between; align-items: center; background: linear-gradient(135deg, #00b26a, #3ddaa0); margin: 20rpx; padding: 24rpx 32rpx; border-radius: 24rpx; color: white; }
.my-label { font-size: 24rpx; opacity: 0.9; }
.my-rank-num { font-size: 48rpx; font-weight: 700; }
.rank-right { text-align: right; }
.my-value { font-size: 36rpx; font-weight: 600; }
.my-title { font-size: 22rpx; opacity: 0.9; }

.rank-item { display: flex; align-items: center; background: #fff; margin: 0 20rpx 12rpx; padding: 20rpx; border-radius: 20rpx; }
.rank-item.me { background: #f0fdf4; border: 2rpx solid #00b26a; }
.rank-num { width: 48rpx; font-size: 28rpx; font-weight: 600; color: #999; text-align: center; }
.rank-num.top { color: #00b26a; }
.rank-avatar { width: 64rpx; height: 64rpx; border-radius: 50%; margin: 0 16rpx; }
.rank-info { flex: 1; }
.rank-name { font-size: 28rpx; font-weight: 500; }
.rank-title { font-size: 20rpx; color: #999; }
.rank-value { font-size: 32rpx; font-weight: 700; color: #00b26a; }
.empty { text-align: center; color: #999; padding: 60rpx 0; font-size: 28rpx; }
```

- [ ] **Step 4: Create checkinLeaderboard.js**

```js
const app = getApp();
const { checkinApi } = require('../../utils/api');

Page({
  data: {
    tabType: 'streak',
    leaderList: [],
    myRank: {},
    totalUsers: 0,
  },

  onLoad() {
    this.loadData();
  },

  onPullDownRefresh() {
    this.loadData().then(() => wx.stopPullDownRefresh());
  },

  async loadData() {
    try {
      const res = await checkinApi.getLeaderboard(this.data.tabType);
      if (res.success) {
        const list = (res.data.list || []).map(item => ({
          ...item,
          isMe: item.userId === (app.globalData.userId || 0),
        }));
        this.setData({
          leaderList: list,
          myRank: res.data.myRank || {},
          totalUsers: res.data.totalUsers || 0,
        });
      }
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  onTabChange(e) {
    const tabType = e.detail.value;
    this.setData({ tabType, leaderList: [] }, () => this.loadData());
  },
});
```

- [ ] **Step 5: Commit**

```bash
git add packagePages/checkinLeaderboard/
git commit -m "feat: add checkin leaderboard page"
```

---

### Task 11: Frontend — Community-Home Check-in Card

**Files:**
- Modify: `pages/community-home/community-home.wxml`
- Modify: `pages/community-home/community-home.js`
- Modify: `pages/community-home/community-home.wxss`

- [ ] **Step 1: Add check-in card template to community-home.wxml**

Inside the `<scroll-view>`, at the very top (before the post list loop), insert:

```xml
<!-- 签到卡片 -->
<view class="checkin-card" wx:if="{{isLoggedIn}}" bindtap="goToCheckin">
  <view class="card-header">
    <view class="card-left">
      <t-icon name="check-circle-filled" size="36rpx" color="#00b26a" />
      <text class="card-streak-num" wx:if="{{checkinData.streakDays > 0}}">{{checkinData.streakDays}}</text>
      <text class="card-streak-label" wx:if="{{checkinData.streakDays > 0}}">天连签</text>
    </view>
    <view class="card-right">
      <text class="card-week">{{yearWeek}}</text>
    </view>
  </view>

  <!-- Badge 行 -->
  <view class="card-badges" wx:if="{{checkinData.streakDays > 0}}">
    <text class="badge-tag" wx:for="{{badgeList}}" wx:key="index" style="border-color:{{item.color}};color:{{item.color}}">{{item.text}}</text>
  </view>

  <!-- 签到按钮区域 -->
  <view class="card-action">
    <view class="card-week-row">
      <view class="weekday" wx:for="{{weekDays}}" wx:key="index">
        <text class="weekday-label">{{item.label}}</text>
        <view class="weekday-dot {{item.status}}">{{item.display}}</view>
      </view>
    </view>
    <view class="card-checkin-btn {{checkinData.checkedIn ? 'checked' : ''}}" catch:tap="onCardCheckin" data-stop="1">
      <t-icon wx:if="{{checkinData.checkedIn}}" name="check" size="28rpx" color="white" />
      <text wx:else class="checkin-btn-text">签</text>
    </view>
  </view>

  <!-- 排行榜入口 -->
  <view class="card-footer" catch:tap="goToLeaderboard">
    <text class="leaderboard-link">排行榜 ></text>
  </view>
</view>

<!-- 加载失败占位 -->
<view class="checkin-card" wx:elif="{{isLoggedIn && checkinError}}" catch:tap="loadCheckinData">
  <text class="error-hint">签到数据加载失败，点击重试</text>
</view>
```

Now find the `wx:for="{{postList}}"` loop — it should be right after this card.

- [ ] **Step 2: Add TDesign component usage to community-home.json**

```json
{
  "usingComponents": {
    "t-icon": "tdesign-miniprogram/icon/icon",
    // ... existing components
  }
}
```

- [ ] **Step 3: Update community-home.js**

```js
Page({
  data: {
    // ... existing data
    isLoggedIn: false,
    checkinData: {
      checkedIn: false,
      streakDays: 0,
      totalPoints: 0,
    },
    badgeList: [],
    yearWeek: '',
    weekDays: [],
    checkinError: false,
  },

  onShow() {
    this._checkLogin();
    this.loadPosts(true);
    this.loadCheckinData();
  },

  onPullDownRefresh() {
    Promise.all([
      this.loadPosts(true),
      this.loadCheckinData(),
    ]).then(() => wx.stopPullDownRefresh());
  },

  _checkLogin() {
    const token = wx.getStorageSync('authToken');
    this.setData({ isLoggedIn: !!token });
  },

  async loadCheckinData() {
    if (!this.data.isLoggedIn) return;
    try {
      const { checkinApi } = require('../../utils/api');
      const res = await checkinApi.getStatus();
      if (res.success) {
        const d = res.data;
        this.setData({
          checkinData: d,
          badgeList: this._buildBadgeList(d.streakDays, d.registeredDays),
          yearWeek: this._computeYearWeek(),
          weekDays: this._buildWeekDays(d.checkedIn),
          checkinError: false,
        });
      }
    } catch (err) {
      this.setData({ checkinError: true });
    }
  },

  _computeYearWeek() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = (now - start) / 86400000;
    const week = Math.ceil((diff + start.getDay() + 1) / 7);
    return `${now.getFullYear()} · 第${week}周`;
  },

  _buildBadgeList(streakDays, registeredDays) {
    const list = [];
    if (streakDays >= 1) {
      const title = this._getTitle(streakDays);
      const color = this._getTitleColor(streakDays);
      list.push({ text: title, color });
      list.push({ text: `连签${streakDays}天`, color: '#00b26a' });
    }
    list.push({ text: `已注册${Math.max(1, registeredDays)}天`, color: '#999999' });
    return list;
  },

  _getTitle(days) {
    const t = { 1:'初来乍到', 3:'渐入佳境', 7:'坚持不懈', 15:'热情如火', 30:'持之以恒', 60:'绿径守护者', 100:'时光旅人', 365:'传奇永恒' };
    const keys = Object.keys(t).map(Number).sort((a,b) => b-a);
    for (const k of keys) { if (days >= k) return t[k]; }
    return '';
  },

  _getTitleColor(days) {
    const c = { 1:'#00b26a', 3:'#00b26a', 7:'#f59e0b', 15:'#f59e0b', 30:'#f97316', 60:'#f97316', 100:'#ec4899', 365:'#8b5cf6' };
    const keys = Object.keys(c).map(Number).sort((a,b) => b-a);
    for (const k of keys) { if (days >= k) return c[k]; }
    return '#00b26a';
  },

  _buildWeekDays(isCheckedIn) {
    const days = ['一', '二', '三', '四', '五', '六', '日'];
    const today = new Date();
    const todayBeijing = today.toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
    const todayDate = new Date(todayBeijing);

    return days.map((label, i) => {
      // 计算本周第 i 天的日期
      const dayOfWeek = todayDate.getDay() || 7; // 1=Mon...7=Sun
      const diff = i + 1 - dayOfWeek;
      const date = new Date(todayDate);
      date.setDate(date.getDate() + diff);
      const dateStr = date.toISOString().slice(0, 10);
      const isToday = dateStr === todayBeijing;

      if (isToday && isCheckedIn) return { label, status: 'checked', display: '✓' };
      if (isToday) return { label, status: 'today', display: '今' };
      // 简化为：已签到的日期显示 ✓（需要 checkin month 数据）
      return { label, status: 'future', display: '-' };
    });
  },

  async onCardCheckin(e) {
    if (e.target.dataset.stop) return; // 防止冒泡到 card tap
    if (this.data.checkinData.checkedIn) return;
    try {
      const { checkinApi } = require('../../utils/api');
      const res = await checkinApi.checkin();
      if (res.success) {
        const d = res.data;
        this.setData({
          checkinData: d,
          badgeList: this._buildBadgeList(d.streakDays, d.registeredDays),
          weekDays: this._buildWeekDays(true),
        });
        wx.showToast({ title: `签到成功 +${d.todayPoints}分`, icon: 'success' });
      }
    } catch (err) {
      wx.showToast({ title: '签到失败', icon: 'none' });
    }
  },

  goToCheckin() {
    wx.navigateTo({ url: '/packagePages/checkin/checkin' });
  },

  goToLeaderboard() {
    wx.navigateTo({ url: '/packagePages/checkinLeaderboard/checkinLeaderboard' });
  },
});
```

- [ ] **Step 4: Add card styles to community-home.wxss**

```css
.checkin-card { background: #fff; border-radius: 32rpx; padding: 24rpx; margin: 0 0 16rpx; box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.04); }
.card-header { display: flex; justify-content: space-between; align-items: flex-start; }
.card-left { display: flex; align-items: center; gap: 8rpx; }
.card-streak-num { font-size: 40rpx; font-weight: 700; color: #00b26a; }
.card-streak-label { font-size: 24rpx; color: #666; }
.card-week { font-size: 20rpx; color: #999; background: #f5f5f5; padding: 4rpx 16rpx; border-radius: 20rpx; }
.card-badges { display: flex; gap: 6rpx; flex-wrap: wrap; margin-top: 8rpx; }
.badge-tag { font-size: 20rpx; padding: 2rpx 14rpx; border-radius: 20rpx; border: 2rpx solid; }
.card-action { display: flex; justify-content: space-between; align-items: center; margin-top: 16rpx; border-top: 1rpx solid #f0f0f0; padding-top: 16rpx; }
.card-week-row { display: flex; gap: 12rpx; }
.weekday { text-align: center; }
.weekday-label { font-size: 20rpx; color: #999; }
.weekday-dot { width: 36rpx; height: 36rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20rpx; margin-top: 4rpx; }
.weekday-dot.checked { background: #00b26a; color: white; }
.weekday-dot.today { background: #e8f8f0; border: 2rpx solid #00b26a; color: #00b26a; }
.weekday-dot.future { background: #f5f5f5; color: #ddd; }
.card-checkin-btn { width: 72rpx; height: 72rpx; border-radius: 50%; background: linear-gradient(135deg, #00b26a, #3ddaa0); display: flex; align-items: center; justify-content: center; box-shadow: 0 4rpx 16rpx rgba(0,178,106,0.3); flex-shrink: 0; }
.card-checkin-btn.checked { background: #ccc; box-shadow: none; }
.checkin-btn-text { font-size: 28rpx; color: white; font-weight: 700; }
.card-footer { text-align: right; margin-top: 8rpx; }
.leaderboard-link { font-size: 22rpx; color: #00b26a; }
.error-hint { font-size: 24rpx; color: #999; text-align: center; padding: 20rpx; }
```

- [ ] **Step 5: Commit**

```bash
git add pages/community-home/
git commit -m "feat: add checkin card to community-home page"
```

---

### Task 12: Frontend — More Page Menu Entry

**Files:**
- Modify: `pages/more/more.wxml`

- [ ] **Step 1: Add "签到打卡" cell before the tools card**

In `pages/more/more.wxml`, find the card section that has "加入协作", "标签管理", etc. (around line 37-67). Add a check-in cell in that group:

```xml
<t-cell
  title="签到打卡"
  url="/packagePages/checkin/checkin"
  leftIcon="check-circle-filled" hover arrow
/>
```

Place it right after the admin panel section and before "加入协作".

- [ ] **Step 2: Commit**

```bash
git add pages/more/more.wxml
git commit -m "feat: add checkin menu entry in more page"
```

---

### Task 13: Frontend — Share-Config Points Integration

**Files:**
- Modify: `packagePages/share-config/share-config.js`
- Modify: `packagePages/share-config/share-config.wxml`

- [ ] **Step 1: Update share-config.js — add points state tracking + dirty check + deduct flow**

Add to data:

```js
settingsDirty: false,
pointsCostDisplay: '',
pointsInsufficient: false,
userPoints: 0,
_deductedForShare: false,
```

Add methods:

```js
onLoad(options) {
  // ...existing code...
  this._snapshotDefaults();
  this._loadUserPoints();
},

_snapshotDefaults() {
  this._defaultSettings = JSON.parse(JSON.stringify(this.data.settings));
  this._defaultFieldPicker = [...this.data.fieldPickerValue].sort();
},  

async _loadUserPoints() {
  try {
    const { checkinApi } = require('../../utils/api');
    const res = await checkinApi.getStatus();
    if (res.success) {
      this.setData({ userPoints: res.data.totalPoints });
      this._checkDirty();
    }
  } catch (err) {
    // silently fail
  }
},

_checkDirty() {
  const defaults = this._defaultSettings;
  const cur = this.data.settings;
  const settingsDiff = Object.keys(defaults).some(k => defaults[k] !== cur[k]);
  const curSorted = [...this.data.fieldPickerValue].sort();
  const pickerDiff = JSON.stringify(this._defaultFieldPicker) !== JSON.stringify(curSorted);
  const dirty = settingsDiff || pickerDiff;
  this.setData({
    settingsDirty: dirty,
    pointsCostDisplay: dirty ? '（消耗2积分）' : '',
    pointsInsufficient: dirty && (this.data.userPoints < 2),
  });
},
```

Each settings change handler (onExpiryConfirm, onPasswordChange, etc.) should call `this._checkDirty()` at the end.

For `onFieldVisibilityChange`, also call `this._checkDirty()` after the setData.

Modify `onGenerateShareCard`:

```js
async onGenerateShareCard() {
  if (this.data.settingsDirty && this.data.pointsInsufficient) return;
  
  const todo = this.data.todo;
  if (!todo || !todo.id) return;

  const { shareApi, checkinApi } = require('../../utils/api');
  const { getLocalTodos } = require('../../utils/sync');
  // ...existing login check...

  // Deduct points first if dirty
  if (this.data.settingsDirty && !this._deductedForShare) {
    wx.showLoading({ title: '处理中...' });
    try {
      const deductRes = await checkinApi.deductPoints(2);
      if (!deductRes.success) {
        wx.hideLoading();
        wx.showToast({ title: deductRes.message || '积分扣除失败', icon: 'none' });
        return;
      }
      this._deductedForShare = true;
      this.setData({ userPoints: deductRes.data.remaining });
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '积分扣除失败', icon: 'none' });
      return;
    }
  }

  // Generate card
  wx.showLoading({ title: '生成分享卡片...' });
  // ...rest of existing generate logic...

  if (result.success) {
    wx.hideLoading();
    // Show points toast if deducted
    if (this._deductedForShare) {
      wx.showToast({ title: `消耗2积分，剩余${this.data.userPoints}积分`, icon: 'none' });
    }
    this.setData({ shareGenerated: true, shareId });
  } else {
    wx.hideLoading();
    wx.showToast({ title: '生成失败', icon: 'none' });
  }
},
```

- [ ] **Step 2: Update share-config.wxml — dynamic button text + disabled state**

Replace the generate button (line 175):

```xml
<view
  class="btn-generate {{pointsInsufficient ? 'disabled' : ''}}"
  bindtap="onGenerateShareCard"
>{{pointsCostDisplay ? '生成分享卡片' + pointsCostDisplay : '生成分享卡片'}}</view>
```

Replace the share button (line 186):

```xml
<t-button
  block
  size="large"
  theme="primary"
  open-type="share"
  data-channel="share"
>{{settingsDirty ? '分享给朋友（消耗2积分）' : '分享给朋友'}}</t-button>
```

- [ ] **Step 3: Add disabled button style to share-config.wxss**

```css
.btn-generate.disabled {
  opacity: 0.5;
  pointer-events: none;
}
```

- [ ] **Step 4: Commit**

```bash
git add packagePages/share-config/
git commit -m "feat: integrate checkin points deduction in share-config"
```

---

### Task 14: Integration Test — Backend

- [ ] **Step 1: Restart the backend**

```bash
cd backend && npm run dev
```

- [ ] **Step 2: Test checkin API**

```bash
# Get auth token first, then:
curl -X POST http://localhost:3000/checkin -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{}'
# Expected: { success: true, data: { checkedIn: true, streakDays: 1, ... } }

# Test double-checkin (idempotent)
curl -X POST http://localhost:3000/checkin -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{}'
# Expected: same response, checkedIn: true

# Test status
curl "http://localhost:3000/checkin/status" -H "Authorization: Bearer $TOKEN"
# Expected: { success: true, data: { checkedIn: true, ... } }

# Test leaderboard
curl "http://localhost:3000/checkin/leaderboard?type=streak" -H "Authorization: Bearer $TOKEN"
# Expected: { success: true, data: { type: "streak", list: [...], myRank: {...} } }
```

- [ ] **Step 3: Verify DB records**

```bash
mysql -u root timegreenpath -e "SELECT * FROM check_ins WHERE user_id = 1;"
mysql -u root timegreenpath -e "SELECT total_points, current_streak FROM users WHERE id = 1;"
```

- [ ] **Step 4: Commit any minor fixes**

```bash
git add -A && git commit -m "fix: post-checkin integration fixes"
```

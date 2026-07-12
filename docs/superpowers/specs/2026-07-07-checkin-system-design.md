# 签到系统设计规格说明书

## 概述

为"时光绿径待办"小程序增加签到功能，提升用户粘性和日活跃度。签到系统与社区称号 badge 联动，形成持续激励闭环。

## 核心概念

### 入口

- **社区页（community-home）**：帖子列表顶部置顶签到卡片，展示连签天数、称号、本周签到情况
- **更多页（more）**：新增"签到打卡"菜单项入口，点击进入签到详情页（也可点击社区页卡片进入）
- **签到详情页**：放入 `packagePages` 子包，包含完整签到操作、月历、积分、里程碑
- **排行榜页**：放入 `packagePages` 子包，展示全服连签排行

> **注意：** 社区页现有 preload 规则未包含 `packagePages`。建议在 `app.json` 中将社区页的 preload 规则追加 `"pages"` 包，以优化签到详情页和排行榜页的跳转加载速度。

### 三个实时计算的 Badge

签到系统在用户信息中追加三个 badge，展示在所有昵称旁（帖子卡片、评论、用户主页等）：

| 序号 | Badge | 内容 | 颜色 | 位置 |
|------|-------|------|------|------|
| 1 | 称号 | 根据连签天数动态匹配（如"坚持不懈"） | 按等级分色（绿→金→橙→粉→紫） | 第2组（自定义之后） |
| 2 | 连签天数 | "连签X天" | `#00b26a` 绿色 | 第3组 |
| 3 | 已注册天数 | "已注册X天"（最少显示1天，新注册用户不显示"已注册0天"） | `#999999` 灰色 | 第4组 |

### Badge 合并逻辑（后端实时拼接）

```
最终 badgeTitles = [
  ...管理员设置的自定义 badge,     // 优先展示
  动态称号,                         // 如"坚持不懈"
  "连签7天",                       // 实时计算
  "已注册365天"                    // DATEDIFF 实时计算
]

最终 badgeColors = [
  ...管理员设置的颜色,
  称号对应颜色,
  "#00b26a",
  "#999999"
]
```

管理员设置的自定义 **始终排在前面**。签到系统的三个 badge 由后端在每次返回用户信息时实时追加，**不存入 DB**，不干扰已有配置。

**Badge 数量保护：** 签到三个 badge 固定追加，但自定义 badge 数量不受控。为保证前端布局不被撑破，后端在拼接时对总 badge 数量做上限处理（建议上限 6 个，超出时从自定义 badge 尾部截断），并在设计文档中记录此约束。

### 称号等级表（无 Emoji）

| 称号 | 连签天数 | Badge 颜色 |
|------|---------|-----------|
| 初来乍到 | 1 天 | `#00b26a` |
| 渐入佳境 | 3 天 | `#00b26a` |
| 坚持不懈 | 7 天 | `#f59e0b` |
| 热情如火 | 15 天 | `#f59e0b` |
| 持之以恒 | 30 天 | `#f97316` |
| 绿径守护者 | 60 天 | `#f97316` |
| 时光旅人 | 100 天 | `#ec4899` |
| 传奇永恒 | 365 天 | `#8b5cf6` |

### 积分规则

| 行为 | 积分 |
|------|------|
| 每日签到 | +5 分 |
| 签到当日完成待办（附加，签到接口内一并计算） | +3 分 |
| 连签 7 天里程碑奖励 | +20 分 |
| 连签 15 天里程碑奖励 | +50 分 |
| 连签 30 天里程碑奖励 | +100 分 |
| 连签 60 天里程碑奖励 | +200 分 |

积分用途：
- **分享配置自定义**：调整分享设置后生成卡片需消耗 2 积分（详见"积分消费场景：分享配置"章节）
- 后续可扩展更多消费场景

## 页面布局

### 社区页顶部签到卡片

```
┌─────────────────────────────────┐
│  ✓ 7 天连签       2026 · 第28周  │  ← 右上角显示年·周
│  [自定义] [称号] [连签7天] [已注册365天] │
│                                  │
│  一  二  三  四  五  六  日       │
│  ✓   ✓   ✓   ✓   ✓  今  -       │  ← 本周7天圆点
│                      [排行榜 >]  │  ← 卡片右下角排行榜入口
└─────────────────────────────────┘
```

- 右上角展示当前年份和 ISO 周数，如 `2026 · 第28周`
- 周数由前端根据当天日期实时计算（JavaScript 的 ISO week 算法），无需后端接口

- 背景：白色卡片，32rpx 圆角，标准 card-compact 阴影
- 左侧：`<t-icon name="check-circle-filled" />` + 连签天数 + "天连签"
- 右侧：绿色渐变签到圆形按钮（已签到状态显示 check 图标 + "已签到 +5"）
- 底部：本周7天圆点行（已签绿色✓、今天绿色边框"今"、未签灰色"-"）
- 点击卡片空白处进入签到详情页
- 点击签到按钮直接完成今日签到（行内操作）
- 卡片右下角"排行榜 >"入口，点击跳转排行榜页
- 只有签到状态变化时才需要刷新整个卡片（实时更新连签天数、称号 badge）

### 社区页签到卡片（底部排行榜入口示意）

```
┌─────────────────────────────────┐
│  ...签到卡片...                     │
│  ─────────────── [排行榜 >]      │
└─────────────────────────────────┘
```

### 签到详情页

页面结构（上下分区）：

**上半区**
- 左侧：连签天数 + 右上角 `2026 · 第28周` + 三个 badge 展示（称号、连签天数、已注册天数）
- 右侧：签到按钮（大圆形，已签到状态显示 check）
- 下方：月度签到日历（同 wx-calendar 风格，绿色圆点标注已签日期）

**下半区**
- 三个统计卡片：总积分 / 本月签到 / 累计签到
- 签到奖励里程碑：4个卡片（7天、15天、30天、60天），已达成绿色边框+✓
- 积分获取规则说明

## 数据库设计

### 新建表 `check_ins`

```sql
CREATE TABLE check_ins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  check_in_date DATE NOT NULL,
  points INT DEFAULT 5 COMMENT '本次签到获得积分',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_date (user_id, check_in_date),
  INDEX idx_user_date (user_id, check_in_date DESC),
  INDEX idx_date (check_in_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 新建表 `checkin_milestones`

里程碑奖励采用独立表记录，确保每个里程碑只发放一次：

```sql
CREATE TABLE checkin_milestones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  milestone_day INT NOT NULL COMMENT '里程碑连续天数（7/15/30/60）',
  points INT NOT NULL COMMENT '本次奖励积分',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_milestone (user_id, milestone_day),
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

```js
// 签到成功后，检查是否需要发放里程碑奖励
const MILESTONES = [7, 15, 30, 60];
for (const day of MILESTONES) {
  if (newStreak >= day) {
    // INSERT IGNORE：如果已发放过则静默跳过
    await query(
      'INSERT IGNORE INTO checkin_milestones (user_id, milestone_day, points) VALUES (?, ?, ?)',
      [userId, day, getMilestonePoints(day)]
    );
  }
}
```

### 用户表追加 `total_points` 和 `current_streak`

```sql
ALTER TABLE users
  ADD COLUMN total_points INT DEFAULT 0 COMMENT '总积分';

ALTER TABLE users
  ADD COLUMN current_streak INT DEFAULT 0 COMMENT '当前连签天数';
```

### 审计表 `points_log`

```sql
CREATE TABLE points_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type VARCHAR(20) NOT NULL COMMENT 'earn/deduct',
  points INT NOT NULL COMMENT '正数',
  note VARCHAR(255) DEFAULT '' COMMENT '备注，如"签到" "分享配置" "里程碑7天"',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_created (user_id, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

签到、里程碑奖励、积分消费**均需写入**此表作为审计记录。

## API 设计

### `POST /checkin` — 今日签到

- 请求：`{}`（空，从 JWT 获取用户）
- 鉴权：`authMiddleware`
- 时区说明：所有日期计算基于北京时间（+08:00），与 DB 配置一致。服务端使用 `Asia/Shanghai` 时区确定"今天"的日期，避免 JS `new Date()` 获取服务器本地时间与 DB 时区不一致导致跨天判断错误。
- 逻辑（全程在 `transaction()` 回调内执行）：
  1. `INSERT IGNORE INTO check_ins (user_id, check_in_date, points) VALUES (?, CURDATE(), ?)` — 检查 `affectedRows`
  2. 若 `affectedRows === 0` → 已签到，跳过积分累加（但仍返回完整数据）
  3. 若 `affectedRows === 1` → 新签到：
     a. 计算当日附加分（今天有待办完成则 +3）
     b. `UPDATE users SET total_points = total_points + ?, current_streak = ? WHERE id = ?`
     c. 检查里程碑奖励（INSERT IGNORE INTO checkin_milestones）
     d. 写入 `points_log` 审计记录
  4. 查询最新连签天数（从 `check_ins` 按日期 DESC，无 LIMIT，见下方算法）
- 返回：`{ success, data: { checkedIn: true/false, streakDays: 7, totalPoints: 128, todayPoints: 5, title: "坚持不懈", registeredDays: 365 } }`
- 注意：已签到状态再次调用此接口（INSERT IGNORE affectedRows === 0），同样返回上述完整数据，前端可安全重复调用。由于 INSERT 和 UPDATE 在同一事务中，双重提交不会导致积分重复累加。

### `GET /checkin/status` — 签到状态

- 请求：`?date=2026-07-07`（可选，默认今天）
- 鉴权：`authMiddleware`
- 约束：`date` 超过今天视为参数错误，返回 400 `{ success: false, message: "不能查询未来日期" }`
- 返回：`{ success, data: { checkedIn: false, streakDays: 0, totalPoints: 128, todayPoints: 0, title: "", registeredDays: 365 } }`
- 说明：`title` 为 `""` 表示无称号（streakDays=0 时），前端不渲染称号 badge；`streakDays >= 1` 时才有实际称号

### `GET /checkin/month` — 月度签到数据

- 请求：`?year=2026&month=7`
- 鉴权：`authMiddleware`
- 返回：`{ success, data: { year, month, dates: ["2026-07-01", "2026-07-02", ...], count: 12 } }`

### 用户信息接口修改

#### 共享工具函数

创建 `backend/utils/checkinBadgeHelper.js`，统一 badge 拼接逻辑，避免在多个 controller 中重复代码：

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

/**
 * 获取连签天数对应的称号
 */
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
 * 计算连签天数（查询所有签到记录，应用层断签检测）
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
 * 获取已注册天数
 */
async function calcRegisteredDays(userId) {
  const rows = await query('SELECT DATEDIFF(NOW(), created_at) as days FROM users WHERE id = ?', [userId]);
  return rows.length > 0 ? Math.max(1, rows[0].days) : 1;
}

/**
 * 拼接签到 badge 与自定义 badge
 * @param {number} streakDays - 连签天数（0 表示无签到）
 * @param {number} registeredDays - 已注册天数
 * @param {string[]} customTitles - 管理员设置的自定义 badge 标题
 * @param {string[]} customColors - 管理员设置的自定义 badge 颜色
 */
function appendCheckinBadges(streakDays, registeredDays, customTitles = [], customColors = []) {
  const MAX_BADGES = 6;

  const safeTitles = Array.isArray(customTitles) ? customTitles : [];
  const safeColors = Array.isArray(customColors) ? customColors : [];
  const maxCustom = MAX_BADGES - 3; // 留出 3 个签到 badge 位置
  const trimmedTitles = safeTitles.slice(0, maxCustom);
  const trimmedColors = safeColors.slice(0, maxCustom);

  const checkinBadges = [];
  const checkinColors = [];
  if (streakDays >= 1) {
    checkinBadges.push(getTitleByStreak(streakDays));
    checkinColors.push(getTitleColor(streakDays));
    checkinBadges.push(`连签${streakDays}天`);
    checkinColors.push('#00b26a');
  }

  checkinBadges.push(`已注册${registeredDays}天`);
  checkinColors.push('#999999');

  return {
    badgeTitles: [...trimmedTitles, ...checkinBadges],
    badgeColors: [...trimmedColors, ...checkinColors],
  };
}

module.exports = { appendCheckinBadges, calcStreakDays, calcRegisteredDays, getTitleByStreak, getTitleColor };
```

#### 需要修改的 7 个文件

签到 badge 需在所有返回用户信息的接口中追加。以下文件各有独立的 `parseBadges` 或 `getBadges` 函数，需统一接入 `appendCheckinBadges`：

| # | 文件 | 函数 | 接入方式 |
|---|------|------|---------|
| 1 | `controllers/authController.js` | login、getUserInfo | 返回前调用 `appendCheckinBadges`，将结果合并到 response |
| 2 | `controllers/userController.js` | getProfile | 同上 |
| 3 | `controllers/postsController.js` | parseBadges（行 17-26） | 改为调用 `appendCheckinBadges`，需传入 streakDays 和 registeredDays |
| 4 | `controllers/commentController.js` | getBadges（行 14-23） | 同上 |
| 5 | `controllers/postCommentsController.js` | getBadges（行 14-22） | 同上 |
| 6 | `controllers/likesController.js` | getBadges（行 14-23） | 同上 |
| 7 | `routes/checkin.js` | 新增 | 新建签到路由文件 |

由于 `postsController`/`commentController`/`postCommentsController`/`likesController` 中的 `getBadges`/`parseBadges` 仅在列表查询中调用，每次查询都查 `check_ins` 计算连签天数会影响性能。优化方案：**在 `appendCheckinBadges` 内部缓存查询结果**（同一请求周期内，相同 userId 只查一次），或者**在列表查询的 SQL 中 JOIN `check_ins` 子查询获取最新连续签到天数**。

推荐方案：在 `appendCheckinBadges` 中使用简单的请求级缓存：

```js
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
  // ... 拼接逻辑
}
// 每次请求后清理缓存（在中间件或路由中调用）
function clearStreakCache() { streakCache.clear(); }
```

简单起见，列表查询场景也可选择在 SQL 中直接获取 streakDays：
```sql
SELECT u.*,
  (SELECT COUNT(*) FROM check_ins c1
   WHERE c1.user_id = u.id
     AND c1.check_in_date >= CURDATE() - INTERVAL (
       SELECT COALESCE(MAX(c2.check_in_date), CURDATE()) IS NULL
     ) DAY -- 简化版，实际需应用层处理
  ) as streak_days
FROM users u WHERE u.id = ?
```
实际推荐使用应用层方案（第一段代码），配合 `clearStreakCache()` 在请求末尾调用。更优的做法：在用户签到时同步更新 `users.current_streak` 字段，排行榜查询直接从该字段读取，避免每次列表查询都实时计算。

#### 总结

无论采用哪种方案，上述 7 个文件的修改原则一致：原有的 `parseBadges`/`getBadges` 逻辑保留（读取 `badge_titles`/`badge_colors` JSON 字段），但在其返回值上追加 `appendCheckinBadges()` 的结果。当查询用户不涉及签到数据（如管理员查看用户列表等场景）时，可跳过检查，仅对已登录用户或公开用户信息时追加。

### 连签天数计算算法

应用层实现（推荐，避免复杂 SQL）：

```js
// 查出签到日期，无需 LIMIT。因为遇到断签立即 break，不会全表扫描。
// 真正需要扫很多行的情况只发生在长连续签到——此时就要扫全部行来确认连续天数。
// (user_id, check_in_date DESC) 复合索引覆盖此查询，性能无忧。
const rows = await query(
  'SELECT check_in_date FROM check_ins WHERE user_id = ? ORDER BY check_in_date DESC',
  [userId]
);

// 注意：必须使用 +08:00 北京时间，与 DB 时区一致
// Node.js 环境可能不是 +08:00，用 toLocaleDateString 显式指定
function getBeijingToday() {
  const d = new Date();
  // 转成 YYYY-MM-DD 字符串，基于 Asia/Shanghai 时区
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
}

// 按 YYYY-MM-DD 字符串比较（避免 Date 对象时区陷阱）
let streak = 0;
const todayStr = getBeijingToday();

for (let i = 0; i < rows.length; i++) {
  const dateStr = rows[i].check_in_date;      // 来自 DB 的 DATE，已经是 +08:00
  const expectedDate = new Date(todayStr);
  expectedDate.setDate(expectedDate.getDate() - streak);
  const expectedStr = expectedDate.toISOString().slice(0, 10);

  if (dateStr === expectedStr) {
    streak++;
  } else {
    break; // 遇到不连续则停止
  }
}
```

### 完成待办附加分机制

"当日完成任意待办 +3 分"与签到解耦，独立计算：
- 用户在签到页可以看到"完成待办额外 +3"的提示
- 加分时机：用户签到接口中顺便检查今日是否有完成的待办
- 注意：`todos` 表的 `completed` 字段为 `BIGINT`（Unix 毫秒时间戳），SQL 查询需要转换：
  ```sql
  SELECT COUNT(*) FROM todos
  WHERE user_id = ?
    AND completed > 0
    AND completed >= UNIX_TIMESTAMP(CURDATE()) * 1000
    AND completed < UNIX_TIMESTAMP(CURDATE() + INTERVAL 1 DAY) * 1000
  ```
- 待办完成发生在签到之后的情况：当前设计不做实时追算。用户次日签到时会自然包含前一天的"完成待办"检查（但已属于新的一天）。如需精准，可后续在 `todoController` 完成待办接口中触发积分追算。
- 不需要额外的 API 调用，签到接口内一次完成

### `GET /checkin/leaderboard` — 签到排行榜

- 请求：`?type=streak`（连签天数排行）或 `?type=total`（总积分排行），默认 `streak`
- 鉴权：`authMiddleware`
- 返回：
```json
{
  "success": true,
  "data": {
    "type": "streak",
    "list": [
      { "rank": 1, "userId": 1, "nickname": "用户A", "avatarUrl": "...", "value": 365, "title": "传奇永恒" },
      { "rank": 2, "userId": 2, "nickname": "用户B", "avatarUrl": "...", "value": 100, "title": "时光旅人" }
    ],
    "myRank": { "rank": 42, "value": 7, "title": "坚持不懈" },
    "totalUsers": 1000
  }
}
```
- 说明：`value` 在 `streak` 类型为连签天数、`total` 类型为总积分；`myRank` 为当前登录用户自己的排行（`rank: null` 表示不在前 100）
- `current_streak` 字段在签到时同步更新（见 POST /checkin），无需定时任务；若需要批量历史数据可通过迁移脚本从 `check_ins` 表回刷

#### 排行榜查询 SQL

连签排行：
```sql
SELECT id, nickname, avatar_url, current_streak
FROM users
WHERE current_streak > 0
ORDER BY current_streak DESC
LIMIT 100;
```

积分排行：
```sql
SELECT id, nickname, avatar_url, total_points
FROM users
WHERE total_points > 0
ORDER BY total_points DESC
LIMIT 100;
```

当前用户排名（以连签为例）：
```sql
SELECT COUNT(*) + 1 as rank
FROM users
WHERE current_streak > (SELECT current_streak FROM users WHERE id = ?);
```

## 前端实现要点

### 使用的 TDesign 图标

| 图标名 | 用途 |
|--------|------|
| `check-circle-filled` | 签到状态、已完成圆点 |
| `calendar-1` | 签到月历区域 |
| `star-filled` | 积分/星级展示 |
| `gift-filled` | 里程碑奖励 |
| `flag` | 里程碑目标标识 |
| `pin-filled` | 置顶签到卡片（可选） |

### 社区页签到卡片

- 在 `community-home.wxml` 的 `<scroll-view>` 内，帖子列表上方插入签到卡片
- 登录用户才显示，未登录不展示（`wx.getStorageSync('authToken')` 判断）
- 卡片通过 `onShow` 时调用 `GET /checkin/status` 刷新状态
- **下拉刷新**：community-home 已有的 `onPullDownRefresh` 中，在 `loadPosts(true)` 之后同步调用 `GET /checkin/status` 刷新签到卡片数据（注意 `loading` 状态保护，避免两个请求冲突）
- 首次加载：使用骨架屏或简单占位
- 加载失败（网络/401等）：卡片保持展示区域但显示简单提示"签到数据加载失败"，不弹 Toast 不干扰帖子列表
- 签到按钮行内操作（无需跳页），成功后动画更新卡片数据

### 签到详情页

- 放入 `packagePages/checkin/` 目录
- `navigationStyle: "custom"`，保持与全局一致的毛玻璃导航栏
- 右上角增加排行榜图标入口（`<t-icon name="rank" />` 或 `trend`），点击跳转排行榜页
- 月历数据来源于 `GET /checkin/month`
- 里程碑"已达成"用绿色边框 + check 图标标记
- **下拉刷新**：页面配置 `"enablePullDownRefresh": true`，下拉时刷新签到状态、月度数据、积分统计数据

### 签到排行榜页

- 放入 `packagePages/checkinLeaderboard/` 目录
- `<t-tabs>` 切换"连签排行" / "积分排行"
- 列表项：排名序号 + 头像 + 昵称 + badge称号 + 连签天数/总积分
- 当前用户自己的行高亮或加前导标记
- 顶部展示自己的排名卡片（快速定位）
- 数据来源于 `GET /checkin/leaderboard`
- **下拉刷新**：页面配置 `"enablePullDownRefresh": true`，下拉时重新拉取排行榜数据

## 交互细节

- 签到按钮点击后：绿色圆形按钮播放 `bounceIn` 动画，按钮内图标从空白变为 check
- 签到成功后：连签天数数字跳动更新，称号 badge 如果升级则闪烁提示
- 社区页下拉刷新时：重新加载签到卡片数据

## 积分消费场景：分享配置

### 规则

- **免费场景**：用户进入 share-config 页后，不对任何设置项做调整（包括字段选择、有效期、密码、最大次数、备注、允许复制、访客记录），直接点击"生成卡片"→ 免费，不消耗积分
- **付费场景**：用户调整了任意设置项（字段选择变动、改了有效期、填了密码、输入了最大次数、加了备注、改了开关状态）→ 生成卡片消耗 **2 积分**
- 积分不足（`total_points < 2`）且设置了自定义 → 生成按钮 **禁用**，并显示提示"积分不足"

### 扣分时机说明

微信小程序 `open-type="share"` 的系统分享菜单**没有分享成功回调**，无法可靠地在"分享成功后"扣分。因此采用 **生成卡片时即刻扣分** 方案：

1. 用户调整设置 → 点击"生成卡片"
2. 生成前检查 `settingsDirty`，若 dirty 则先调 `POST /checkin/deduct-points` 扣分
3. 扣分成功后再调 `shareApi.createSnapshot` 生成卡片
4. 生成成功 → `wx.showToast({ title: '消耗2积分，剩余' + remaining + '积分' })`
5. 用户再点击"分享给朋友"时不再扣分（卡片已生成）

### 前端实现

#### 状态追踪

```js
Page({
  data: {
    settings: { ... },
    fieldPickerValue: [...],
    settingsDirty: false,       // 是否有任何调整
    pointsCostDisplay: '',      // "（消耗2积分）" 或 ""
    pointsInsufficient: false,  // 积分不足无法生成
    userPoints: 0,
  },

  onLoad() {
    this._snapshotDefaults();
    this._loadUserPoints();
  },

  _snapshotDefaults() {
    this._defaultSettings = JSON.parse(JSON.stringify(this.data.settings));
    this._defaultFieldPicker = [...this.data.fieldPickerValue].sort();
  },

  _checkDirty() {
    const defaults = this._defaultSettings;
    const cur = this.data.settings;
    // settings 逐个字段比较
    const settingsDiff = Object.keys(defaults).some(k => defaults[k] !== cur[k]);
    // fieldPickerValue 按集合比较（忽略顺序）
    const curSorted = [...this.data.fieldPickerValue].sort();
    const pickerDiff = JSON.stringify(this._defaultFieldPicker) !== JSON.stringify(curSorted);
    const dirty = settingsDiff || pickerDiff;
    this.setData({
      settingsDirty: dirty,
      pointsCostDisplay: dirty ? '（消耗2积分）' : '',
      pointsInsufficient: dirty && (this.data.userPoints < 2),
    });
  },
});
```

每个 settings 或 fieldPicker 变更事件末尾调用 `this._checkDirty()`。

#### 按钮文字变化

- 生成按钮（生成前）：
  - 默认：`"生成分享卡片"`
  - 有调整且积分充足：`"生成分享卡片（消耗2积分）"`
  - 有调整但积分不足：`"生成分享卡片（积分不足）"` + `disabled` 状态
- 分享按钮（生成后）：
  - 默认（无调整）：`"分享给朋友"`
  - 有调整：`"分享给朋友"`（卡片已生成，不再重复提示消耗）

#### 生成扣分流程图

```
用户点击"生成卡片"
  │
  ├─ settingsDirty === false → 免费生成（不调扣分接口）
  │
  └─ settingsDirty === true
       ├─ userPoints < 2 → 按钮已 disabled，不执行
       └─ userPoints >= 2
            ├─ 调 POST /checkin/deduct-points
            ├─ 扣分成功 → 更新 userPoints → 调 shareApi.createSnapshot
            ├─ 卡片生成成功 → wx.showToast 显示剩余积分
            └─ 扣分失败 → wx.showToast 提示错误
```

#### 防重复

- 前端设 `_deductedForShare = false` 标记，生成成功后置为 `true`
- 页面 unload 时重置（重新进入时 snapshot 重新计算 dirty）

### 后端接口

```http
POST /checkin/deduct-points
Authorization: Bearer <token>
Content-Type: application/json

{ "points": 2 }
```

- 鉴权：`authMiddleware`
- 逻辑（使用 `transaction()` 包装）：
  1. `SELECT total_points FROM users WHERE id = ? FOR UPDATE` 检查余额
  2. 余额不足 → 回滚，返回 `{ success: false, message: "积分不足" }`
  3. 扣除：`UPDATE users SET total_points = total_points - ? WHERE id = ?`
  4. 写入审计日志：`INSERT INTO points_log (user_id, type, points, note) VALUES (?, 'deduct', ?, ?)`
- 返回：`{ success: true, data: { remaining: 126 } }`

数据库设计章节的 `points_log` 表用于审计所有积分变动（签到获得、里程碑奖励、积分消费），签到和里程碑奖励作为 `type: 'earn'` 记录。

### 注意

- 微信 `onShareAppMessage` 无分享结果回调，故不采用"分享后扣分"方案
- 禁用状态的按钮上覆盖一层透明 view 来捕获 tap 事件，弹出 Toast "积分不足，完成签到获取积分"
- 用户将设置调回默认值时，dirty 标记自动清除，不扣分

## 未纳入范围（未来可扩展）

- 积分商城/更多积分消费场景
- 签到提醒（每日推送）
- 补签卡功能
- 更多成就/挑战任务

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
 * 将 Date 对象转换为 +08:00 时区的 YYYY-MM-DD 字符串
 * 纯 UTC 数学运算，不依赖 Intl API，任何 Node 版本/ICU 配置均可用
 */
function toBeijingDateStr(d) {
  if (typeof d === 'string') return d;
  const ms = d.getTime() + 8 * 3600000;
  const date = new Date(ms);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

/**
 * 获取当前 Beijing 时间的 YYYY-MM-DD 字符串
 */
function todayBeijingStr() {
  const ms = Date.now() + 8 * 3600000;
  const date = new Date(ms);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

/**
 * 计算 streak 天后对应的 Beijing 日期字符串（streak = 0 表示今天）
 */
function expectedBeijingDateStr(streak) {
  const ms = Date.now() + 8 * 3600000;
  const date = new Date(ms);
  date.setUTCDate(date.getUTCDate() - streak);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

/**
 * 计算连签天数 — 索引覆盖扫描，断签即 break
 */
async function calcStreakDays(userId) {
  const rows = await query(
    'SELECT check_in_date FROM check_ins WHERE user_id = ? ORDER BY check_in_date DESC',
    [userId]
  );
  return computeStreakFromRows(rows);
}

/**
 * 从签到行数组计算连签天数（兼容 Date 对象和字符串，不依赖 Intl API）
 */
function computeStreakFromRows(rows) {
  let streak = 0;
  for (let i = 0; i < rows.length; i++) {
    const dateStr = toBeijingDateStr(rows[i].check_in_date);
    if (dateStr === expectedBeijingDateStr(streak)) {
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
 * 请求级缓存
 */
const streakCache = new Map();

/**
 * 拼接签到 badge 与自定义 badge（缓存版本，接受 userId）
 */
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

  checkinBadges.push(`注册${registered}天`);
  checkinColors.push('#999999');

  return {
    badgeTitles: [...trimmedTitles, ...checkinBadges],
    badgeColors: [...trimmedColors, ...checkinColors],
  };
}

function clearStreakCache(userId) {
  if (userId) {
    streakCache.delete(userId);
  } else {
    streakCache.clear();
  }
}

module.exports = {
  appendCheckinBadges,
  calcStreakDays,
  computeStreakFromRows,
  toBeijingDateStr,
  todayBeijingStr,
  expectedBeijingDateStr,
  calcRegisteredDays,
  getTitleByStreak,
  getTitleColor,
  clearStreakCache,
  TITLE_TABLE,
};

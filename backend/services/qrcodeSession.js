const crypto = require('crypto');
const logger = require('../utils/logger');

const sessions = new Map();
const SESSION_TTL = 5 * 60 * 1000;
const CLEANUP_INTERVAL = 60 * 1000;

function generateId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '');
  }
  const bytes = crypto.randomBytes(16);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function createSession() {
  const sceneId = `weblogin_${generateId().substring(0, 20)}`;
  const now = Date.now();

  const session = {
    sceneId,
    status: 'waiting',
    createdAt: now,
    expiresAt: now + SESSION_TTL,
    token: null,
    user: null,
    scannedAt: null,
    confirmedAt: null
  };

  sessions.set(sceneId, session);
  logger.authInfo('扫码登录', '创建扫码会话', { sceneId, expiresAt: new Date(session.expiresAt).toISOString() });

  return session;
}

function getSession(sceneId) {
  const session = sessions.get(sceneId);
  if (!session) return null;

  if (Date.now() > session.expiresAt) {
    sessions.delete(sceneId);
    logger.authInfo('扫码登录', '会话已过期', { sceneId });
    return null;
  }

  return session;
}

function updateSession(sceneId, updates) {
  const session = getSession(sceneId);
  if (!session) return null;

  Object.assign(session, updates);
  return session;
}

function deleteSession(sceneId) {
  sessions.delete(sceneId);
}

function markScanned(sceneId) {
  return updateSession(sceneId, { status: 'scanned', scannedAt: Date.now() });
}

function confirmAuth(sceneId, token, user) {
  return updateSession(sceneId, {
    status: 'confirmed',
    token,
    user: {
      id: user.id,
      openid: user.openid,
      nickname: user.nickname,
      avatarUrl: user.avatar_url || user.avatarUrl
    },
    confirmedAt: Date.now()
  });
}

function getActiveSessionsCount() {
  let count = 0;
  const now = Date.now();
  for (const [key, session] of sessions) {
    if (session.expiresAt > now) count++;
  }
  return count;
}

setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [key, session] of sessions) {
    if (now > session.expiresAt) {
      sessions.delete(key);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    logger.authInfo('扫码登录', '清理过期会话', { cleaned, remaining: sessions.size });
  }
}, CLEANUP_INTERVAL);

module.exports = {
  createSession,
  getSession,
  updateSession,
  deleteSession,
  markScanned,
  confirmAuth,
  getActiveSessionsCount
};

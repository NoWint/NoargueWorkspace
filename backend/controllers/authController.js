const axios = require('axios');
const { query } = require('../config/database');
const { generateToken } = require('../middleware/auth');
const logger = require('../utils/logger');
const { getAdminIds } = require('./adminController');
const { getUnlimitedQRCode } = require('../services/wechatService');
const qrcodeSession = require('../services/qrcodeSession');
const { appendCheckinBadges, clearStreakCache } = require('../utils/checkinBadgeHelper');

const APPID = process.env.WECHAT_APPID;
const SECRET = process.env.WECHAT_SECRET;

const login = async (req, res) => {
  const { code } = req.body;
  
  if (!code) {
    return res.status(400).json({
      success: false,
      message: '缺少code参数'
    });
  }
  
  try {
    const wxRes = await axios.get('https://api.weixin.qq.com/sns/jscode2session', {
      params: {
        appid: APPID,
        secret: SECRET,
        js_code: code,
        grant_type: 'authorization_code'
      }
    });
    
    const { openid, session_key, errcode, errmsg } = wxRes.data;
    
    if (errcode) {
      logger.authError('登录', '微信登录失败', { errcode, errmsg, openid });
      return res.status(400).json({
        success: false,
        message: errmsg || '微信登录失败'
      });
    }
    
    let users = await query('SELECT * FROM users WHERE openid = ?', [openid]);
    let user;
    
    if (users.length === 0) {
      const defaultNickname = '时光绿径用户';
      const result = await query(
        'INSERT INTO users (openid, nickname, created_at) VALUES (?, ?, NOW())',
        [openid, defaultNickname]
      );
      user = {
        id: result.insertId,
        openid,
        nickname: defaultNickname,
        todo_limit: 100,
        combo_limit: 10,
        collab_limit: 5
      };
      logger.authInfo('注册', '新用户注册成功', { userId: result.insertId, openid });
    } else {
      user = users[0];
    }
    
    const token = generateToken({
      id: user.id,
      openid: user.openid
    });
    
    logger.authInfo('登录', '用户登录成功', { userId: user.id, openid });
    
    let avatarUrl = user.avatar_url;
    if (avatarUrl && avatarUrl.startsWith('/uploads/')) {
      const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
      avatarUrl = `${baseUrl}${avatarUrl}`;
    }
    
    const adminIds = getAdminIds();
    const isAdmin = adminIds.includes(user.id);
    
    const badgeData = await appendCheckinBadges(
      user.id,
      user.badge_titles ? JSON.parse(user.badge_titles) : [],
      user.badge_colors ? JSON.parse(user.badge_colors) : []
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        openid: user.openid,
        nickname: user.nickname,
        avatarUrl: avatarUrl,
        todoLimit: user.todo_limit,
        comboLimit: user.combo_limit,
        collabLimit: user.collab_limit,
        isAdmin: isAdmin,
        badgeTitles: badgeData.badgeTitles,
        badgeColors: badgeData.badgeColors
      }
    });

    clearStreakCache(user.id);
  } catch (err) {
    logger.authError('登录', '登录失败', { error: err.message, stack: err.stack });
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

const updateUserInfo = async (req, res) => {
  const userId = req.user.id;
  const { nickname, avatarUrl } = req.body;
  
  try {
    await query(
      'UPDATE users SET nickname = ?, avatar_url = ?, updated_at = NOW() WHERE id = ?',
      [nickname, avatarUrl, userId]
    );
    
    logger.authInfo('更新信息', '用户信息更新成功', { userId, nickname });
    
    res.json({
      success: true,
      message: '用户信息更新成功'
    });
  } catch (err) {
    logger.authError('更新信息', '更新用户信息失败', { userId, error: err.message });
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

const getUserInfo = async (req, res) => {
  const userId = req.user.id;
  
  try {
    const users = await query('SELECT * FROM users WHERE id = ?', [userId]);
    
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    const user = users[0];
    let avatarUrl = user.avatar_url;
    
    if (avatarUrl && avatarUrl.startsWith('/uploads/')) {
      const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
      avatarUrl = `${baseUrl}${avatarUrl}`;
    }
    
    const adminIds = getAdminIds();
    const isAdmin = adminIds.includes(user.id);
    
    const badgeData = await appendCheckinBadges(
      user.id,
      user.badge_titles ? JSON.parse(user.badge_titles) : [],
      user.badge_colors ? JSON.parse(user.badge_colors) : []
    );

    res.json({
      success: true,
      user: {
        id: user.id,
        openid: user.openid,
        nickname: user.nickname,
        avatarUrl: avatarUrl,
        todoLimit: user.todo_limit,
        comboLimit: user.combo_limit,
        collabLimit: user.collab_limit,
        createdAt: user.created_at,
        isAdmin: isAdmin,
        badgeTitles: badgeData.badgeTitles,
        badgeColors: badgeData.badgeColors
      }
    });

    clearStreakCache(user.id);
  } catch (err) {
    logger.authError('获取信息', '获取用户信息失败', { userId, error: err.message });
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

const increaseTodoLimit = async (req, res) => {
  const userId = req.user.id;
  const { amount = 10 } = req.body;
  
  try {
    const users = await query('SELECT todo_limit FROM users WHERE id = ?', [userId]);
    
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    const currentLimit = users[0].todo_limit || 500;
    const newLimit = currentLimit + amount;
    
    await query(
      'UPDATE users SET todo_limit = ?, updated_at = NOW() WHERE id = ?',
      [newLimit, userId]
    );
    
    logger.authInfo('增加上限', '待办上限增加成功', { userId, oldLimit: currentLimit, newLimit, amount });
    
    res.json({
      success: true,
      todoLimit: newLimit,
      message: `待办上限增加 ${amount}`
    });
  } catch (err) {
    logger.authError('增加上限', '增加待办上限失败', { userId, error: err.message });
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

const generateQrCode = async (req, res) => {
  try {
    const session = qrcodeSession.createSession();
    const sceneId = session.sceneId;

    const qrBuffer = await getUnlimitedQRCode(sceneId, 'packagePages/login/login');

    const base64Image = Buffer.from(qrBuffer).toString('base64');
    const dataUrl = `data:image/png;base64,${base64Image}`;

    logger.authInfo('扫码登录', '生成登录二维码成功', { sceneId });

    res.json({
      success: true,
      data: {
        sceneId,
        qrcodeUrl: dataUrl,
        expiresAt: session.expiresAt
      }
    });
  } catch (err) {
    logger.authError('扫码登录', '生成二维码失败', { error: err.message });
    res.status(500).json({
      success: false,
      message: '生成二维码失败'
    });
  }
};

const getQrCodeStatus = async (req, res) => {
  const { sceneId } = req.query;

  if (!sceneId) {
    return res.status(400).json({
      success: false,
      message: '缺少sceneId参数'
    });
  }

  try {
    const session = qrcodeSession.getSession(sceneId);

    if (!session) {
      return res.json({
        success: true,
        status: 'expired',
        message: '二维码已过期，请刷新'
      });
    }

    let responseData = {
      success: true,
      status: session.status,
      message: ''
    };

    switch (session.status) {
      case 'waiting':
        responseData.message = '等待扫码...';
        break;
      case 'scanned':
        responseData.message = '已扫描，请在手机上确认';
        break;
      case 'confirmed':
        responseData.message = '登录成功';
        responseData.token = session.token;
        responseData.user = session.user;
        break;
    }

    res.json(responseData);
  } catch (err) {
    logger.authError('扫码登录', '查询状态失败', { error: err.message, sceneId });
    res.status(500).json({
      success: false,
      message: '查询状态失败'
    });
  }
};

const confirmQrCodeLogin = async (req, res) => {
  const { sceneId } = req.body;

  if (!sceneId) {
    return res.status(400).json({
      success: false,
      message: '缺少sceneId参数'
    });
  }

  try {
    const session = qrcodeSession.getSession(sceneId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: '会话不存在或已过期'
      });
    }

    if (session.status === 'confirmed') {
      return res.json({
        success: true,
        message: '该会话已经确认过'
      });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: '请先登录后再确认授权'
      });
    }

    const userId = req.user.id;
    const users = await query('SELECT * FROM users WHERE id = ?', [userId]);

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    const user = users[0];
    const token = generateToken({ id: user.id, openid: user.openid });

    let avatarUrl = user.avatar_url;
    if (avatarUrl && avatarUrl.startsWith('/uploads/')) {
      const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
      avatarUrl = `${baseUrl}${avatarUrl}`;
    }

    qrcodeSession.confirmAuth(sceneId, token, user);

    logger.authInfo('扫码登录', '用户确认网页端授权成功', { sceneId, userId, nickname: user.nickname });

    res.json({
      success: true,
      message: '授权成功'
    });
  } catch (err) {
    logger.authError('扫码登录', '确认授权失败', { error: err.message, sceneId });
    res.status(500).json({
      success: false,
      message: '确认授权失败'
    });
  }
};

const markQrCodeScanned = async (req, res) => {
  const { sceneId } = req.body;

  if (!sceneId) {
    return res.status(400).json({
      success: false,
      message: '缺少sceneId参数'
    });
  }

  try {
    const session = qrcodeSession.getSession(sceneId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: '会话不存在或已过期'
      });
    }

    if (session.status !== 'waiting') {
      return res.json({
        success: true,
        status: session.status,
        message: `当前状态：${session.status}`
      });
    }

    qrcodeSession.markScanned(sceneId);

    logger.authInfo('扫码登录', '小程序端已扫描二维码', { sceneId });

    res.json({
      success: true,
      status: 'scanned',
      message: '扫描成功，等待确认'
    });
  } catch (err) {
    logger.authError('扫码登录', '标记扫描失败', { error: err.message, sceneId });
    res.status(500).json({
      success: false,
      message: '操作失败'
    });
  }
};

module.exports = {
  login,
  updateUserInfo,
  getUserInfo,
  increaseTodoLimit,
  generateQrCode,
  getQrCodeStatus,
  confirmQrCodeLogin,
  markQrCodeScanned
};

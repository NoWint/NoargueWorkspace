const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const JWT_SECRET = process.env.JWT_SECRET || 'timegreenpath_jwt_secret_key_2024';

const generateToken = (payload, expiresIn = '7d') => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
};

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: '未提供认证令牌'
    });
  }
  
  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json({
      success: false,
      message: '令牌无效或已过期'
    });
  }
  
  req.user = decoded;
  next();
};

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    if (decoded) {
      req.user = decoded;
    }
  }
  next();
};

const isAdmin = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: '未登录'
      });
    }

    const { getAdminIds } = require('../controllers/adminController');
    const adminIds = getAdminIds();
    const userId = parseInt(req.user.id);

    if (!adminIds.includes(userId)) {
      return res.status(403).json({
        success: false,
        message: '无管理员权限'
      });
    }

    next();
  } catch (err) {
    logger.error('AUTH', '权限验证', '管理员权限验证失败', { error: err.message });
    return res.status(500).json({
      success: false,
      message: '权限验证失败'
    });
  }
};

module.exports = {
  generateToken,
  verifyToken,
  authMiddleware,
  optionalAuth,
  isAdmin
};

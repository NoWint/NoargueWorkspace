const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { query } = require('../config/database');
const logger = require('../utils/logger');

const uploadDir = path.join(__dirname, '../uploads/avatars');
const imagesDir = path.join(__dirname, '../uploads/images');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const userId = req.user.id;
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `avatar_${userId}_${Date.now()}${ext}`);
  }
});

const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, imagesDir);
  },
  filename: (req, file, cb) => {
    const userId = req.user.id;
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `todoimg_${userId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型'), false);
    }
  }
});

const imageUpload = multer({
  storage: imageStorage,
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型'), false);
    }
  }
});

const uploadAvatar = async (req, res) => {
  const userId = req.user.id;

  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: '请选择要上传的图片'
    });
  }

  try {
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    const oldAvatars = await query(
      'SELECT avatar_url FROM users WHERE id = ? AND avatar_url LIKE ?',
      [userId, '/uploads/avatars/%']
    );

    if (oldAvatars.length > 0 && oldAvatars[0].avatar_url) {
      const oldPath = path.join(__dirname, '..', oldAvatars[0].avatar_url);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    await query(
      'UPDATE users SET avatar_url = ?, updated_at = NOW() WHERE id = ?',
      [avatarUrl, userId]
    );

    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const fullUrl = `${baseUrl}${avatarUrl}`;

    res.json({
      success: true,
      message: '头像上传成功',
      avatarUrl: fullUrl
    });
  } catch (err) {
    logger.uploadError('上传头像', '上传头像失败', { userId, error: err.message });
    res.status(500).json({
      success: false,
      message: '上传失败'
    });
  }
};

const uploadTodoImage = async (req, res) => {
  const userId = req.user.id;

  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: '请选择要上传的图片'
    });
  }

  try {
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const imageUrl = `${baseUrl}/uploads/images/${req.file.filename}`;

    res.json({
      success: true,
      message: '上传成功',
      url: imageUrl
    });
  } catch (err) {
    logger.uploadError('上传待办图片', '上传失败', { userId, error: err.message });
    res.status(500).json({
      success: false,
      message: '上传失败'
    });
  }
};

// 通用文件代理上传（中转至 storage.to R2）
const proxyStorage = multer.memoryStorage();
const proxyUploader = multer({
  storage: proxyStorage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

const proxyUpload = async (req, res) => {
  const { uploadUrl } = req.body;
  if (!req.file || !uploadUrl) {
    return res.status(400).json({ success: false, message: '缺少文件或上传地址' });
  }

  try {
    await axios.put(uploadUrl, req.file.buffer, {
      headers: { 'Content-Type': req.file.mimetype || 'application/octet-stream' }
    });
    res.json({ success: true });
  } catch (err) {
    logger.uploadError('代理上传', '转发到R2失败', { error: err.message });
    res.status(502).json({ success: false, message: '代理上传失败' });
  }
};

module.exports = {
  upload,
  imageUpload,
  uploadAvatar,
  uploadTodoImage,
  proxyUploader,
  proxyUpload,
};

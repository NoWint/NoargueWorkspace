const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware, optionalAuth } = require('../middleware/auth');

router.post('/login', authController.login);
router.post('/updateUserInfo', authMiddleware, authController.updateUserInfo);
router.get('/userInfo', authMiddleware, authController.getUserInfo);
router.post('/increaseTodoLimit', authMiddleware, authController.increaseTodoLimit);

router.post('/qrcode/generate', authController.generateQrCode);
router.get('/qrcode/status', authController.getQrCodeStatus);
router.post('/qrcode/confirm', authMiddleware, authController.confirmQrCodeLogin);
router.post('/qrcode/scanned', optionalAuth, authController.markQrCodeScanned);

module.exports = router;

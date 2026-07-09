const express = require('express');
const router = express.Router();
const { upload, imageUpload, uploadAvatar, uploadTodoImage } = require('../controllers/uploadController');
const { authMiddleware } = require('../middleware/auth');

router.post('/avatar', authMiddleware, upload.single('avatar'), uploadAvatar);
router.post('/image', authMiddleware, imageUpload.single('image'), uploadTodoImage);

module.exports = router;

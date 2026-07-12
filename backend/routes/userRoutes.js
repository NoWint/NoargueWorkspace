const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware } = require('../middleware/auth');

router.get('/search', authMiddleware, userController.search);
router.get('/batch', authMiddleware, userController.getBatch);
router.get('/:userId/profile', authMiddleware, userController.getProfile);

module.exports = router;

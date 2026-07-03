const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware } = require('../middleware/auth');

router.get('/:userId/profile', authMiddleware, userController.getProfile);

module.exports = router;

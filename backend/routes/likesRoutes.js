const express = require('express');
const router = express.Router();
const likesController = require('../controllers/likesController');
const { authMiddleware } = require('../middleware/auth');

router.post('/toggle', authMiddleware, likesController.toggle);
router.get('/:postId/users', authMiddleware, likesController.getUsers);

module.exports = router;

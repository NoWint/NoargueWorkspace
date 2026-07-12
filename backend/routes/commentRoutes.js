const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const { authMiddleware } = require('../middleware/auth');

router.get('/:sharedTodoId', authMiddleware, commentController.getComments);
router.post('/:sharedTodoId', authMiddleware, commentController.createComment);
router.delete('/:commentId', authMiddleware, commentController.deleteComment);

module.exports = router;

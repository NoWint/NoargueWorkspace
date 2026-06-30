const express = require('express');
const router = express.Router();
const postCommentsController = require('../controllers/postCommentsController');
const { authMiddleware } = require('../middleware/auth');

router.get('/:postId', authMiddleware, postCommentsController.getList);
router.post('/:postId', authMiddleware, postCommentsController.create);
router.delete('/:commentId', authMiddleware, postCommentsController.deleteComment);
router.post('/:commentId/like', authMiddleware, postCommentsController.toggleLike);

module.exports = router;

const express = require('express');
const router = express.Router();
const postsController = require('../controllers/postsController');
const { authMiddleware } = require('../middleware/auth');

router.post('/create', authMiddleware, postsController.create);
router.get('/list', authMiddleware, postsController.getList);
router.get('/user/:userId', authMiddleware, postsController.getUserPosts);
router.get('/combo/:comboId', authMiddleware, postsController.getComboPosts);
router.get('/:postId', authMiddleware, postsController.getById);
router.put('/:postId', authMiddleware, postsController.update);
router.delete('/:postId', authMiddleware, postsController.deletePost);
router.get('/:postId/visitors', authMiddleware, postsController.getVisitors);

module.exports = router;

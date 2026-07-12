const express = require('express');
const router = express.Router();
const shareController = require('../controllers/shareController');
const { authMiddleware } = require('../middleware/auth');

router.post('/snapshot', authMiddleware, shareController.createSnapshot);
router.get('/snapshot/:shareId', shareController.getSnapshot);
router.post('/snapshot/revoke/:shareId', authMiddleware, shareController.revokeSnapshot);
router.get('/snapshot/list-by-todo/:todoId', authMiddleware, shareController.listByTodo);
router.post('/snapshot/batch-metadata', authMiddleware, shareController.batchMetadata);

module.exports = router;

const express = require('express');
const router = express.Router();
const todoController = require('../controllers/todoController');
const { authMiddleware } = require('../middleware/auth');

router.get('/list', authMiddleware, todoController.getList);
router.get('/deleted', authMiddleware, todoController.getDeletedList);
router.get('/full-sync', authMiddleware, todoController.fullSync);
router.get('/:id', authMiddleware, todoController.getById);
router.post('/create', authMiddleware, todoController.create);
router.put('/:id', authMiddleware, todoController.update);
router.delete('/:id', authMiddleware, todoController.deleteTodo);
router.post('/batch-move', authMiddleware, todoController.batchMove);
router.post('/sync', authMiddleware, todoController.sync);
router.post('/batch', authMiddleware, todoController.getTodosBatch);
router.post('/restore/:todoId', authMiddleware, todoController.restoreTodo);
router.delete('/permanent/:todoId', authMiddleware, todoController.permanentDelete);

module.exports = router;

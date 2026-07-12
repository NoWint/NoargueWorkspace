const express = require('express');
const router = express.Router();
const notifyController = require('../controllers/notifyController');
const { authMiddleware } = require('../middleware/auth');

router.post('/subscribe', authMiddleware, notifyController.subscribe);
router.post('/schedule', authMiddleware, notifyController.schedule);
router.post('/test-send', authMiddleware, notifyController.testSend);
router.get('/by-todo', authMiddleware, notifyController.getByTodoId);
router.get('/list', authMiddleware, notifyController.getList);
router.put('/:id', authMiddleware, notifyController.update);
router.delete('/:id', authMiddleware, notifyController.cancel);

router.post('/shared/schedule', authMiddleware, notifyController.scheduleShared);
router.get('/shared/by-todo', authMiddleware, notifyController.getSharedByTodoId);
router.put('/shared/:id', authMiddleware, notifyController.updateShared);
router.delete('/shared/:id', authMiddleware, notifyController.cancelShared);

router.post('/approval-result', authMiddleware, notifyController.sendApprovalResult);

module.exports = router;

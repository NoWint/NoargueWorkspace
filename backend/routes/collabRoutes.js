const express = require('express');
const router = express.Router();
const collabController = require('../controllers/collabController');
const { authMiddleware } = require('../middleware/auth');

router.post('/join', authMiddleware, collabController.join);
router.post('/auto-join', authMiddleware, collabController.autoJoin);
router.post('/request', authMiddleware, collabController.sendRequest);
router.get('/requests', authMiddleware, collabController.getRequests);
router.post('/requests/:id/approve', authMiddleware, collabController.approveRequest);
router.post('/requests/:id/reject', authMiddleware, collabController.rejectRequest);
router.get('/shared', authMiddleware, collabController.getSharedList);
router.post('/shared/:comboId/todos', authMiddleware, collabController.createSharedTodo);
router.put('/shared/:comboId/todos/:todoId', authMiddleware, collabController.updateSharedTodo);
router.put('/shared/:comboId/todos/:todoId/complete', authMiddleware, collabController.completeSharedTodo);
router.delete('/shared/:comboId/todos/:todoId', authMiddleware, collabController.deleteSharedTodo);
router.delete('/member', authMiddleware, collabController.removeMember);
router.post('/leave', authMiddleware, collabController.leaveCombo);
router.get('/qrcode', collabController.getQrCode);

module.exports = router;

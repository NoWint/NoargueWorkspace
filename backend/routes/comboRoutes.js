const express = require('express');
const router = express.Router();
const comboController = require('../controllers/comboController');
const { authMiddleware } = require('../middleware/auth');

router.get('/list', authMiddleware, comboController.getList);
router.get('/:id', authMiddleware, comboController.getById);
router.post('/create', authMiddleware, comboController.create);
router.put('/:id', authMiddleware, comboController.update);
router.delete('/:id', authMiddleware, comboController.deleteCombo);
router.get('/:id/members', authMiddleware, comboController.getMembers);
router.put('/:comboId/members/:userId/role', authMiddleware, comboController.setMemberRole);

module.exports = router;

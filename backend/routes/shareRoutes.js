const express = require('express');
const router = express.Router();
const shareController = require('../controllers/shareController');
const { authMiddleware } = require('../middleware/auth');

router.post('/snapshot', authMiddleware, shareController.createSnapshot);
router.get('/snapshot/:shareId', shareController.getSnapshot);
router.post('/snapshot/revoke/:shareId', authMiddleware, shareController.revokeSnapshot);

module.exports = router;

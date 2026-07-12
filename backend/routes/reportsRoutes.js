const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reportsController');
const { authMiddleware, isAdmin } = require('../middleware/auth');

router.post('/create', authMiddleware, reportsController.create);
router.get('/my', authMiddleware, reportsController.getMyReports);
router.get('/list', authMiddleware, isAdmin, reportsController.getList);
router.get('/:id', authMiddleware, isAdmin, reportsController.getDetail);
router.post('/:id/process', authMiddleware, isAdmin, reportsController.processReport);

module.exports = router;

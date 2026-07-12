const express = require('express');
const router = express.Router();
const workReportController = require('../controllers/workReportController');
const reportTemplateController = require('../controllers/reportTemplateController');
const { authMiddleware } = require('../middleware/auth');

// Template endpoints (must be before /:id to avoid route capture)
router.get('/templates/list', authMiddleware, reportTemplateController.getTemplates);
router.put('/templates', authMiddleware, reportTemplateController.upsertTemplate);
router.post('/templates/defaults', authMiddleware, reportTemplateController.createDefaults);

// Work report endpoints
router.get('/', authMiddleware, workReportController.getList);
router.get('/board', authMiddleware, workReportController.getBoard);
router.get('/:id', authMiddleware, workReportController.getById);
router.post('/', authMiddleware, workReportController.create);
router.put('/:id', authMiddleware, workReportController.update);
router.delete('/:id', authMiddleware, workReportController.deleteReport);

module.exports = router;

const express = require('express');
const router = express.Router();
const tagController = require('../controllers/tagController');
const { authMiddleware } = require('../middleware/auth');

router.get('/list', authMiddleware, tagController.getList);
router.post('/create', authMiddleware, tagController.create);
router.put('/:id', authMiddleware, tagController.update);
router.delete('/:id', authMiddleware, tagController.deleteTag);

module.exports = router;

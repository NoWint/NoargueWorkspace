const express = require('express');
const router = express.Router();
const checkinController = require('../controllers/checkinController');
const { authMiddleware } = require('../middleware/auth');

router.post('/', authMiddleware, checkinController.checkin);
router.get('/status', authMiddleware, checkinController.getStatus);
router.get('/month', authMiddleware, checkinController.getMonth);
router.get('/leaderboard', authMiddleware, checkinController.getLeaderboard);
router.post('/deduct-points', authMiddleware, checkinController.deductPoints);

module.exports = router;

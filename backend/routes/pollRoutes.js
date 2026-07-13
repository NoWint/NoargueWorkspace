const express = require('express');
const router = express.Router();
const pollController = require('../controllers/pollController');
const { authMiddleware } = require('../middleware/auth');

// 投票 CRUD
router.post('/:postId/poll', authMiddleware, pollController.createPoll);
router.get('/:postId/poll', authMiddleware, pollController.getPoll);
router.post('/:postId/poll/vote', authMiddleware, pollController.vote);
router.post('/:postId/poll/close', authMiddleware, pollController.closePoll);
router.patch('/:postId/poll', authMiddleware, pollController.updatePoll);
router.get('/:postId/poll/other-details', authMiddleware, pollController.getOtherDetails);

module.exports = router;

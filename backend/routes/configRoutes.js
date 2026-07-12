const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');

router.get('/updates', configController.getChangelog);
router.get('/notices', configController.getNotices);
router.get('/app', configController.getAppConfig);
router.get('/guides', configController.getGuides);
router.get('/guides/:id', configController.getGuideById);
router.get('/public-stats', configController.getPublicStats);
router.get('/public-tags', configController.getPublicTags);
router.get('/public-users', configController.getPublicUsers);
router.get('/public-stats/hourly', configController.getPublicHourlyStats);

module.exports = router;

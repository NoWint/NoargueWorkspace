const express = require('express');
const router = express.Router();
const logController = require('../controllers/logController');

router.post('/report', logController.report);

module.exports = router;

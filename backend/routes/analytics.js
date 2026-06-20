const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const { getAnalytics } = require('../controllers/analyticsController');

router.get('/', protect, adminOnly, getAnalytics);

module.exports = router;

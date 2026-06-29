// routes/analytics.js — URL definitions for analytics endpoints.
// Restricted to admins only — regular users have no access to platform-wide statistics.

const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const { getAnalytics } = require('../controllers/analyticsController');

// GET /api/analytics — return aggregated statistics for the admin dashboard
router.get('/', protect, adminOnly, getAnalytics);

module.exports = router;

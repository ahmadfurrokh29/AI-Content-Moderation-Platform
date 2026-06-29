// routes/policies.js — URL definitions for policy endpoints.
// Any logged-in user can read policies (needed to display rules to users).
// Only admins can update policies.

const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const { getPolicies, updatePolicy } = require('../controllers/policyController');

// GET /api/policies — return all 6 category policies (seeds defaults if none exist yet)
router.get('/', protect, getPolicies);

// PATCH /api/policies/:id — update one category policy (enabled, threshold, or action)
router.patch('/:id', protect, adminOnly, updatePolicy);

module.exports = router;

// routes/appeals.js — URL definitions for appeal endpoints.
// Users can create and view their own appeals.
// Admins can view all appeals and accept or reject them.

const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
  createAppeal,
  getMyAppeals,
  getAllAppeals,
  reviewAppeal,
} = require('../controllers/appealController');

// --- User Routes ---

// POST /api/appeals — submit a new appeal for a Flagged or Blocked submission
router.post('/', protect, createAppeal);

// GET /api/appeals/my — get the current user's submitted appeals and their statuses
// IMPORTANT: defined before /:id so 'my' is not treated as an ID parameter
router.get('/my', protect, getMyAppeals);

// --- Admin Routes ---

// GET /api/appeals — get all appeals across all users (supports ?status= filter)
router.get('/', protect, adminOnly, getAllAppeals);

// PATCH /api/appeals/:id/review — accept or reject a pending appeal
// Accepting also overrides the linked submission's verdict to Approved
router.patch('/:id/review', protect, adminOnly, reviewAppeal);

module.exports = router;

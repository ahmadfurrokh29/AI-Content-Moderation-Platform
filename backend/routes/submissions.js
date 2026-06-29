// routes/submissions.js — URL definitions for submission endpoints.
// Some routes are user-level (any logged-in user), some are admin-only.
// The `upload.array('images', 10)` middleware runs before createSubmissions
// and saves uploaded files to disk, populating req.files.

const express = require('express');
const router = express.Router();
const upload = require('../config/multer');
const { protect, adminOnly } = require('../middleware/auth');
const {
  createSubmissions,
  getMySubmissions,
  getAllSubmissions,
  getSubmission,
  overrideVerdict,
  deleteSubmission,
} = require('../controllers/submissionController');

// --- User Routes (any logged-in user) ---

// POST /api/submissions — upload one or more images and receive AI moderation results
// upload.array('images', 10) processes multipart form data, max 10 files per request
router.post('/', protect, upload.array('images', 10), createSubmissions);

// GET /api/submissions/my — get the current user's submission history (supports filter query params)
// IMPORTANT: this route must be defined BEFORE /:id to prevent 'my' being treated as an ID
router.get('/my', protect, getMySubmissions);

// GET /api/submissions/:id — get full detail of a single submission (owner or admin only)
router.get('/:id', protect, getSubmission);

// DELETE /api/submissions/:id — delete a submission, its image file, and any linked appeal
router.delete('/:id', protect, deleteSubmission);

// --- Admin Routes ---

// GET /api/submissions — get ALL users' submissions with optional verdict filter and pagination
router.get('/', protect, adminOnly, getAllSubmissions);

// PATCH /api/submissions/:id/override — manually change a submission's verdict
router.patch('/:id/override', protect, adminOnly, overrideVerdict);

module.exports = router;

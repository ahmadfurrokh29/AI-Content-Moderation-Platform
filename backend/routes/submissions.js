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

// User routes
router.post('/', protect, upload.array('images', 10), createSubmissions);
router.get('/my', protect, getMySubmissions);
router.get('/:id', protect, getSubmission);
router.delete('/:id', protect, deleteSubmission);

// Admin routes
router.get('/', protect, adminOnly, getAllSubmissions);
router.patch('/:id/override', protect, adminOnly, overrideVerdict);

module.exports = router;

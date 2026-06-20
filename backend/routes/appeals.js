const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
  createAppeal,
  getMyAppeals,
  getAllAppeals,
  reviewAppeal,
} = require('../controllers/appealController');

router.post('/', protect, createAppeal);
router.get('/my', protect, getMyAppeals);
router.get('/', protect, adminOnly, getAllAppeals);
router.patch('/:id/review', protect, adminOnly, reviewAppeal);

module.exports = router;

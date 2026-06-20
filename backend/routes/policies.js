const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const { getPolicies, updatePolicy } = require('../controllers/policyController');

router.get('/', protect, getPolicies);
router.patch('/:id', protect, adminOnly, updatePolicy);

module.exports = router;

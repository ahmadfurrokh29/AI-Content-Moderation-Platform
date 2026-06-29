// routes/auth.js — URL definitions for authentication endpoints.
// Maps HTTP methods + paths to their controller functions.
// The `protect` middleware on /me ensures only logged-in users can call it.

const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// POST /api/auth/register — create a new user account
router.post('/register', register);

// POST /api/auth/login — authenticate and receive a JWT token
router.post('/login', login);

// GET /api/auth/me — return the currently logged-in user's info (requires token)
router.get('/me', protect, getMe);

module.exports = router;

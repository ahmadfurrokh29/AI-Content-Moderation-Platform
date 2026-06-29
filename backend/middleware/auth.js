// auth.js — Authentication and authorization middleware.
// These functions are used in routes to protect endpoints from unauthorized access.

const jwt = require('jsonwebtoken');
const User = require('../models/User');

// protect — verifies the JWT token sent in the Authorization header.
// If valid, attaches the full user object to req.user so controllers can use it.
// If invalid or missing, responds with 401 Unauthorized.
//
// Usage in routes: router.get('/me', protect, getMe)
const protect = async (req, res, next) => {
  let token;

  // JWT is expected in the format: "Bearer <token>"
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1]; // extract just the token part
  }

  if (!token) {
    const err = new Error('Not authorized, no token');
    err.statusCode = 401;
    return next(err);
  }

  // jwt.verify decodes the token and checks the signature using JWT_SECRET.
  // If the token is expired or tampered with, it throws an error.
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  // Fetch the user from DB using the ID stored inside the token payload
  req.user = await User.findById(decoded.id);

  if (!req.user) {
    // Token was valid but the user account was deleted since it was issued
    const err = new Error('User no longer exists');
    err.statusCode = 401;
    return next(err);
  }

  next(); // token is valid — continue to the next middleware or controller
};

// adminOnly — checks that the already-authenticated user has the admin role.
// Must always be used AFTER protect (which sets req.user).
//
// Usage in routes: router.get('/', protect, adminOnly, getAllSubmissions)
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    const err = new Error('Access denied: Admins only');
    err.statusCode = 403; // 403 Forbidden (different from 401 Unauthorized)
    return next(err);
  }
  next();
};

module.exports = { protect, adminOnly };

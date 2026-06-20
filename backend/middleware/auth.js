const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT token — attach user to req.user
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    const err = new Error('Not authorized, no token');
    err.statusCode = 401;
    return next(err);
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  req.user = await User.findById(decoded.id);

  if (!req.user) {
    const err = new Error('User no longer exists');
    err.statusCode = 401;
    return next(err);
  }

  next();
};

// Allow only admin role
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    const err = new Error('Access denied: Admins only');
    err.statusCode = 403;
    return next(err);
  }
  next();
};

module.exports = { protect, adminOnly };

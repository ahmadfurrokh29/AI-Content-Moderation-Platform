// authController.js — Handles user registration, login, and profile retrieval.
// All functions here are async and errors are automatically caught by express-async-errors.

const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Helper: creates and signs a JWT token containing the user's ID.
// The token expires after the duration set in JWT_EXPIRES_IN (e.g. "7d").
// This token is sent to the frontend and stored in localStorage.
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

// POST /api/auth/register — creates a new user account.
// Steps:
//   1. Check if email is already taken.
//   2. Create the user (password is hashed by the pre-save hook in User.js).
//   3. Generate a JWT token.
//   4. Return the token and user info to the frontend.
const register = async (req, res) => {
  const { name, email, password, role } = req.body;

  // Prevent duplicate accounts
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    const err = new Error('Email already registered');
    err.statusCode = 400;
    throw err;
  }

  // Only allow role: 'admin' if explicitly provided; default everyone else to 'user'
  const newUser = await User.create({
    name,
    email,
    password,
    role: role === 'admin' ? 'admin' : 'user',
  });

  const token = signToken(newUser._id);

  res.status(201).json({
    success: true,
    token,
    user: {
      id:    newUser._id,
      name:  newUser.name,
      email: newUser.email,
      role:  newUser.role,
    },
  });
};

// POST /api/auth/login — authenticates an existing user.
// Steps:
//   1. Validate that email and password were provided.
//   2. Find the user by email — use .select('+password') because password is hidden by default.
//   3. Compare the entered password to the stored bcrypt hash.
//   4. If valid, generate and return a JWT token.
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    const err = new Error('Please provide email and password');
    err.statusCode = 400;
    throw err;
  }

  // .select('+password') is required because the password field has select: false in the schema
  const user = await User.findOne({ email }).select('+password');

  // comparePassword() uses bcrypt.compare() to check the entered password against the hash
  if (!user || !(await user.comparePassword(password))) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  const token = signToken(user._id);

  res.json({
    success: true,
    token,
    user: {
      id:    user._id,
      name:  user.name,
      email: user.email,
      role:  user.role,
    },
  });
};

// GET /api/auth/me — returns the currently authenticated user's info.
// The `protect` middleware already looked up the user and attached it to req.user,
// so this function simply returns that data without another DB query.
const getMe = async (req, res) => {
  res.json({
    success: true,
    user: {
      id:    req.user._id,
      name:  req.user.name,
      email: req.user.email,
      role:  req.user.role,
    },
  });
};

module.exports = { register, login, getMe };

// index.js — Entry point of the backend server.
// Loads environment variables, connects to MongoDB, registers middleware and routes, then starts listening.

require('dotenv').config();          // Load .env file into process.env before anything else
require('express-async-errors');     // Patches Express so thrown errors in async functions are
                                     // automatically forwarded to the error handler middleware

const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

const authRoutes       = require('./routes/auth');
const submissionRoutes = require('./routes/submissions');
const appealRoutes     = require('./routes/appeals');
const policyRoutes     = require('./routes/policies');
const analyticsRoutes  = require('./routes/analytics');

const errorHandler = require('./middleware/errorHandler');

const app = express();

// Connect to MongoDB Atlas before handling any requests
connectDB();

// --- Global Middleware ---

// Allow cross-origin requests from the frontend (React dev server on port 3000)
app.use(cors());

// Parse incoming JSON request bodies into req.body
app.use(express.json());

// Serve image files stored in /uploads as static assets.
// A file saved at backend/uploads/abc.jpg becomes accessible at GET /uploads/abc.jpg
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- API Routes ---
// Each router handles a specific prefix. Requests are forwarded to the matching router.
app.use('/api/auth',        authRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/appeals',     appealRoutes);
app.use('/api/policies',    policyRoutes);
app.use('/api/analytics',   analyticsRoutes);

// Simple health check endpoint — useful for Docker and monitoring tools
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Content Moderation API running' });
});

// Global error handler — must be registered LAST so it catches errors from all routes above.
// Any error thrown or passed to next(err) in any route will end up here.
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

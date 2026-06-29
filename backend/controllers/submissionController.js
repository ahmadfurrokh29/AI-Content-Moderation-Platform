// submissionController.js — Handles all image submission operations.
// Covers uploading + AI analysis, fetching history, admin overrides, and deletion.

const path = require('path');
const fs   = require('fs');
const Submission = require('../models/Submission');
const Appeal     = require('../models/Appeal');
const Policy     = require('../models/Policy');
const { analyzeImage, determineVerdict } = require('../services/moderationService');

// POST /api/submissions — uploads one or more images and runs AI moderation on each.
// Steps for each uploaded file:
//   1. Run AI analysis to get per-category results (analyzeImage).
//   2. Determine the overall verdict based on active policies (determineVerdict).
//   3. Save a policy snapshot so future policy changes don't affect this verdict.
//   4. Save the submission document to MongoDB.
// req.files is populated by Multer middleware defined in the route.
const createSubmissions = async (req, res) => {
  if (!req.files || req.files.length === 0) {
    const err = new Error('Please upload at least one image');
    err.statusCode = 400;
    throw err;
  }

  // Load all policies once for the entire batch (more efficient than per-image queries)
  const policies = await Policy.find({});

  const results = [];

  for (const file of req.files) {
    const imagePath = file.path;                      // absolute path on disk (for AI reading)
    const imageUrl  = `/uploads/${file.filename}`;    // relative URL (for frontend displaying)

    // Send image to AI for analysis — returns 6 category results
    const categoryResults = await analyzeImage(imagePath);

    // Apply policy rules to determine Approved / Flagged for Review / Blocked
    const verdict = determineVerdict(categoryResults, policies);

    // Snapshot the current policy settings so this verdict is always explainable,
    // even if an admin later changes the threshold or disables a category
    const policySnapshot = policies.map((p) => ({
      category:  p.category,
      enabled:   p.enabled,
      threshold: p.threshold,
      action:    p.action,
    }));

    const submission = await Submission.create({
      user:             req.user._id,
      imageUrl,
      originalFilename: file.originalname,
      verdict,
      categoryResults,
      policySnapshot,
    });

    results.push(submission);
  }

  res.status(201).json({ success: true, count: results.length, submissions: results });
};

// GET /api/submissions/my — returns the logged-in user's own submissions.
// Supports optional query filters: ?verdict=Blocked&category=Hate+Symbols&startDate=...&endDate=...
// Results are sorted newest first.
const getMySubmissions = async (req, res) => {
  const { verdict, category, startDate, endDate } = req.query;

  // Always filter by the current user — users can only see their own submissions
  const filter = { user: req.user._id };

  // Add optional filters only when they are provided in the query string
  if (verdict) filter.verdict = verdict;

  if (category) {
    // $elemMatch: find submissions where the categoryResults array contains
    // an element with this specific category AND detected = true
    filter['categoryResults'] = {
      $elemMatch: { category, detected: true },
    };
  }

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate); // $gte = greater than or equal
    if (endDate)   filter.createdAt.$lte = new Date(endDate);   // $lte = less than or equal
  }

  const submissions = await Submission.find(filter)
    .sort({ createdAt: -1 })          // -1 = descending (newest first)
    .populate('user', 'name email');  // replace user ObjectId with name and email fields

  res.json({ success: true, count: submissions.length, submissions });
};

// GET /api/submissions — admin only. Returns ALL users' submissions.
// Supports ?verdict= filter and pagination via ?page= and ?limit= query params.
const getAllSubmissions = async (req, res) => {
  const { verdict, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (verdict) filter.verdict = verdict;

  const submissions = await Submission.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit) // skip documents from previous pages
    .limit(Number(limit))
    .populate('user', 'name email');

  const total = await Submission.countDocuments(filter);

  res.json({ success: true, total, page: Number(page), submissions });
};

// GET /api/submissions/:id — returns a single submission by its MongoDB ID.
// Regular users can only access their own submissions.
// Admins can access any submission.
const getSubmission = async (req, res) => {
  const submission = await Submission.findById(req.params.id).populate('user', 'name email');

  if (!submission) {
    const err = new Error('Submission not found');
    err.statusCode = 404;
    throw err;
  }

  // Ownership check: compare user IDs as strings (ObjectId comparison requires String())
  if (req.user.role !== 'admin' && String(submission.user._id) !== String(req.user._id)) {
    const err = new Error('Not authorized');
    err.statusCode = 403;
    throw err;
  }

  res.json({ success: true, submission });
};

// PATCH /api/submissions/:id/override — admin manually changes a submission's verdict.
// Sets overridden: true so the frontend can show an "Overridden" badge.
const overrideVerdict = async (req, res) => {
  const { verdict } = req.body;
  const allowed = ['Approved', 'Flagged for Review', 'Blocked'];

  if (!allowed.includes(verdict)) {
    const err = new Error('Invalid verdict value');
    err.statusCode = 400;
    throw err;
  }

  // findByIdAndUpdate with { new: true } returns the updated document, not the old one
  const submission = await Submission.findByIdAndUpdate(
    req.params.id,
    { verdict, overridden: true },
    { new: true }
  );

  if (!submission) {
    const err = new Error('Submission not found');
    err.statusCode = 404;
    throw err;
  }

  res.json({ success: true, submission });
};

// DELETE /api/submissions/:id — permanently deletes a submission.
// Also removes the image file from disk and deletes any linked appeal.
// Regular users can only delete their own submissions; admins can delete any.
const deleteSubmission = async (req, res) => {
  const submission = await Submission.findById(req.params.id);

  if (!submission) {
    const err = new Error('Submission not found');
    err.statusCode = 404;
    throw err;
  }

  // Authorization check before any deletion happens
  if (req.user.role !== 'admin' && String(submission.user) !== String(req.user._id)) {
    const err = new Error('Not authorized');
    err.statusCode = 403;
    throw err;
  }

  // Step 1: delete the physical image file from the uploads folder on disk
  const filePath = path.join(__dirname, '../uploads', path.basename(submission.imageUrl));
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath); // synchronous delete — simpler here since it's a one-off operation
  }

  // Step 2: delete the associated appeal document if one exists
  // (keeps the appeals collection clean — no orphaned appeals)
  await Appeal.deleteOne({ submission: submission._id });

  // Step 3: delete the submission document from MongoDB
  await submission.deleteOne();

  res.json({ success: true, message: 'Submission deleted' });
};

module.exports = {
  createSubmissions,
  getMySubmissions,
  getAllSubmissions,
  getSubmission,
  overrideVerdict,
  deleteSubmission,
};

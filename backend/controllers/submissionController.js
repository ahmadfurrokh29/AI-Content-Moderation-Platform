const path = require('path');
const fs = require('fs');
const Submission = require('../models/Submission');
const Appeal = require('../models/Appeal');
const Policy = require('../models/Policy');
const { analyzeImage, determineVerdict } = require('../services/moderationService');

// POST /api/submissions  — upload one or more images
const createSubmissions = async (req, res) => {
  if (!req.files || req.files.length === 0) {
    const err = new Error('Please upload at least one image');
    err.statusCode = 400;
    throw err;
  }

  // Load all active policies once for this batch
  const policies = await Policy.find({});

  const results = [];

  for (const file of req.files) {
    const imagePath = file.path;
    const imageUrl = `/uploads/${file.filename}`;

    // Run AI analysis
    const categoryResults = await analyzeImage(imagePath);

    // Determine overall verdict using policies
    const verdict = determineVerdict(categoryResults, policies);

    // Save policy snapshot (what rules were active at this moment)
    const policySnapshot = policies.map((p) => ({
      category: p.category,
      enabled: p.enabled,
      threshold: p.threshold,
      action: p.action,
    }));

    const submission = await Submission.create({
      user: req.user._id,
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

// GET /api/submissions  — user's own submissions with optional filters
const getMySubmissions = async (req, res) => {
  const { verdict, category, startDate, endDate } = req.query;

  const filter = { user: req.user._id };

  if (verdict) filter.verdict = verdict;

  if (category) {
    filter['categoryResults'] = {
      $elemMatch: { category, detected: true },
    };
  }

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  const submissions = await Submission.find(filter)
    .sort({ createdAt: -1 })
    .populate('user', 'name email');

  res.json({ success: true, count: submissions.length, submissions });
};

// GET /api/submissions/all  — admin: see all submissions
const getAllSubmissions = async (req, res) => {
  const { verdict, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (verdict) filter.verdict = verdict;

  const submissions = await Submission.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .populate('user', 'name email');

  const total = await Submission.countDocuments(filter);

  res.json({ success: true, total, page: Number(page), submissions });
};

// GET /api/submissions/:id
const getSubmission = async (req, res) => {
  const submission = await Submission.findById(req.params.id).populate('user', 'name email');

  if (!submission) {
    const err = new Error('Submission not found');
    err.statusCode = 404;
    throw err;
  }

  // Users can only see their own submissions
  if (req.user.role !== 'admin' && String(submission.user._id) !== String(req.user._id)) {
    const err = new Error('Not authorized');
    err.statusCode = 403;
    throw err;
  }

  res.json({ success: true, submission });
};

// PATCH /api/submissions/:id/override  — admin manual verdict override
const overrideVerdict = async (req, res) => {
  const { verdict } = req.body;
  const allowed = ['Approved', 'Flagged for Review', 'Blocked'];
  if (!allowed.includes(verdict)) {
    const err = new Error('Invalid verdict value');
    err.statusCode = 400;
    throw err;
  }

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

// DELETE /api/submissions/:id — user deletes own, admin deletes any
const deleteSubmission = async (req, res) => {
  const submission = await Submission.findById(req.params.id);

  if (!submission) {
    const err = new Error('Submission not found');
    err.statusCode = 404;
    throw err;
  }

  // Only owner or admin can delete
  if (req.user.role !== 'admin' && String(submission.user) !== String(req.user._id)) {
    const err = new Error('Not authorized');
    err.statusCode = 403;
    throw err;
  }

  // Delete the image file from disk
  const filePath = path.join(__dirname, '../uploads', path.basename(submission.imageUrl));
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  // Delete associated appeal if any
  await Appeal.deleteOne({ submission: submission._id });

  // Delete the submission document
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

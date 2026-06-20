const Appeal = require('../models/Appeal');
const Submission = require('../models/Submission');

// POST /api/appeals  — user files an appeal
const createAppeal = async (req, res) => {
  const { submissionId, reason } = req.body;

  if (!submissionId || !reason) {
    const err = new Error('submissionId and reason are required');
    err.statusCode = 400;
    throw err;
  }

  const submission = await Submission.findById(submissionId);
  if (!submission) {
    const err = new Error('Submission not found');
    err.statusCode = 404;
    throw err;
  }

  // Only the submission owner can appeal
  if (String(submission.user) !== String(req.user._id)) {
    const err = new Error('Not authorized to appeal this submission');
    err.statusCode = 403;
    throw err;
  }

  // Only Flagged or Blocked submissions can be appealed
  if (submission.verdict === 'Approved') {
    const err = new Error('Only Flagged or Blocked submissions can be appealed');
    err.statusCode = 400;
    throw err;
  }

  // Check if appeal already exists for this submission
  const existingAppeal = await Appeal.findOne({ submission: submissionId });
  if (existingAppeal) {
    const err = new Error('An appeal already exists for this submission');
    err.statusCode = 400;
    throw err;
  }

  const appeal = await Appeal.create({
    submission: submissionId,
    user: req.user._id,
    reason,
  });

  res.status(201).json({ success: true, appeal });
};

// GET /api/appeals/my  — user sees their own appeals
const getMyAppeals = async (req, res) => {
  const appeals = await Appeal.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .populate('submission', 'imageUrl verdict createdAt');

  res.json({ success: true, count: appeals.length, appeals });
};

// GET /api/appeals  — admin sees all pending appeals
const getAllAppeals = async (req, res) => {
  const { status } = req.query;
  const filter = {};
  if (status) filter.status = status;

  const appeals = await Appeal.find(filter)
    .sort({ createdAt: -1 })
    .populate('user', 'name email')
    .populate('submission', 'imageUrl verdict categoryResults createdAt');

  res.json({ success: true, count: appeals.length, appeals });
};

// PATCH /api/appeals/:id/review  — admin accepts or rejects
const reviewAppeal = async (req, res) => {
  const { status, adminResponse } = req.body;

  if (!['Accepted', 'Rejected'].includes(status)) {
    const err = new Error('Status must be Accepted or Rejected');
    err.statusCode = 400;
    throw err;
  }

  const appeal = await Appeal.findById(req.params.id);
  if (!appeal) {
    const err = new Error('Appeal not found');
    err.statusCode = 404;
    throw err;
  }

  if (appeal.status !== 'Pending') {
    const err = new Error('Appeal has already been reviewed');
    err.statusCode = 400;
    throw err;
  }

  appeal.status = status;
  appeal.adminResponse = adminResponse || '';
  appeal.reviewedBy = req.user._id;
  appeal.reviewedAt = new Date();
  await appeal.save();

  // If accepted, override the submission verdict to Approved
  if (status === 'Accepted') {
    await Submission.findByIdAndUpdate(appeal.submission, {
      verdict: 'Approved',
      overridden: true,
    });
  }

  res.json({ success: true, appeal });
};

module.exports = { createAppeal, getMyAppeals, getAllAppeals, reviewAppeal };

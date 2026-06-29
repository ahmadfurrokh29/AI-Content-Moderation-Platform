// appealController.js — Handles appeal creation and admin review.
// Users submit appeals for Flagged/Blocked submissions.
// Admins accept or reject them, and accepting also overrides the submission verdict.

const Appeal    = require('../models/Appeal');
const Submission = require('../models/Submission');

// POST /api/appeals — user files an appeal against a Flagged or Blocked verdict.
// Validation steps:
//   1. submissionId and reason must be present.
//   2. The submission must exist.
//   3. Only the submission's owner can appeal it.
//   4. Only Flagged or Blocked verdicts can be appealed (not Approved).
//   5. An appeal must not already exist for this submission (unique constraint).
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

  // Only the user who uploaded the image can appeal it
  if (String(submission.user) !== String(req.user._id)) {
    const err = new Error('Not authorized to appeal this submission');
    err.statusCode = 403;
    throw err;
  }

  // Approved images have no reason to be appealed
  if (submission.verdict === 'Approved') {
    const err = new Error('Only Flagged or Blocked submissions can be appealed');
    err.statusCode = 400;
    throw err;
  }

  // Check for an existing appeal — the DB also enforces this via unique: true on `submission`
  const existingAppeal = await Appeal.findOne({ submission: submissionId });
  if (existingAppeal) {
    const err = new Error('An appeal already exists for this submission');
    err.statusCode = 400;
    throw err;
  }

  const appeal = await Appeal.create({
    submission: submissionId,
    user:       req.user._id,
    reason,
  });

  res.status(201).json({ success: true, appeal });
};

// GET /api/appeals/my — returns all appeals submitted by the currently logged-in user.
// Populates the linked submission so the frontend can show the image and verdict.
const getMyAppeals = async (req, res) => {
  const appeals = await Appeal.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    // populate: replace the submission ObjectId with actual submission fields
    .populate('submission', 'imageUrl verdict categoryResults createdAt');

  res.json({ success: true, count: appeals.length, appeals });
};

// GET /api/appeals — admin only. Returns all appeals across all users.
// Supports optional ?status= filter (e.g. ?status=Pending).
// Populates both the user and the submission for each appeal card.
const getAllAppeals = async (req, res) => {
  const { status } = req.query;
  const filter = {};
  if (status) filter.status = status; // only add the filter if a status was specified

  const appeals = await Appeal.find(filter)
    .sort({ createdAt: -1 })
    .populate('user',       'name email')
    .populate('submission', 'imageUrl verdict categoryResults createdAt');

  res.json({ success: true, count: appeals.length, appeals });
};

// PATCH /api/appeals/:id/review — admin accepts or rejects a pending appeal.
// Steps:
//   1. Validate that status is Accepted or Rejected.
//   2. Find the appeal and confirm it is still Pending (can't review twice).
//   3. Update the appeal with the decision and optional admin response.
//   4. If Accepted, also override the linked submission's verdict to Approved.
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

  // Prevent reviewing an appeal that has already been decided
  if (appeal.status !== 'Pending') {
    const err = new Error('Appeal has already been reviewed');
    err.statusCode = 400;
    throw err;
  }

  // Record the admin's decision
  appeal.status        = status;
  appeal.adminResponse = adminResponse || '';
  appeal.reviewedBy    = req.user._id;
  appeal.reviewedAt    = new Date();
  await appeal.save();

  // If accepted, override the submission verdict to Approved so the user sees the change
  if (status === 'Accepted') {
    await Submission.findByIdAndUpdate(appeal.submission, {
      verdict:    'Approved',
      overridden: true,
    });
  }

  res.json({ success: true, appeal });
};

module.exports = { createAppeal, getMyAppeals, getAllAppeals, reviewAppeal };

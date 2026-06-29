// analyticsController.js — Aggregates platform-wide statistics for the admin dashboard.
// Uses MongoDB's aggregation pipeline to compute grouped counts and rankings.
// All queries run in parallel where possible for performance.

const Submission = require('../models/Submission');
const Appeal     = require('../models/Appeal');
const User       = require('../models/User');

// GET /api/analytics — returns all analytics data in one response.
// Data included:
//   1. Submission volume over the last 30 days (grouped by date)
//   2. Verdict distribution (how many Approved / Flagged / Blocked)
//   3. Per-category violation counts
//   4. Appeal stats (total, by status, resolution rate)
//   5. Top 10 users by submission count
//   6. Top 10 users by violation count
const getAnalytics = async (req, res) => {

  // --- 1. Submissions over time (last 30 days, grouped by day) ---
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const submissionsOverTime = await Submission.aggregate([
    // Stage 1: filter to only documents created in the last 30 days
    { $match: { createdAt: { $gte: thirtyDaysAgo } } },
    // Stage 2: group by date string (e.g. "2024-06-01") and count each group
    {
      $group: {
        _id:   { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    // Stage 3: sort by date ascending so the chart goes left-to-right
    { $sort: { _id: 1 } },
  ]);

  // --- 2. Verdict distribution ---
  // Groups all submissions by verdict and counts each group
  const verdictDistribution = await Submission.aggregate([
    { $group: { _id: '$verdict', count: { $sum: 1 } } },
  ]);

  // --- 3. Per-category violation counts ---
  // $unwind: expands the categoryResults array so each element becomes its own document.
  // Then filters to only detected=true entries and groups by category name.
  const categoryDistribution = await Submission.aggregate([
    { $unwind: '$categoryResults' },                         // flatten the array
    { $match: { 'categoryResults.detected': true } },        // keep only detected violations
    { $group: { _id: '$categoryResults.category', count: { $sum: 1 } } },
    { $sort: { count: -1 } },                                // highest violations first
  ]);

  // --- 4. Appeal statistics ---
  const totalAppeals  = await Appeal.countDocuments();

  // Group appeals by status (Pending / Accepted / Rejected) and count each
  const appealByStatus = await Appeal.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  // Resolution rate = (Accepted + Rejected) / total appeals × 100
  const resolved = appealByStatus
    .filter((a) => a._id !== 'Pending')
    .reduce((sum, a) => sum + a.count, 0);
  const resolutionRate = totalAppeals > 0
    ? ((resolved / totalAppeals) * 100).toFixed(1)
    : 0;

  // --- 5. Top 10 users by total submission count ---
  // $group counts submissions per user, $lookup joins the users collection to get name/email
  const topBySubmissions = await Submission.aggregate([
    { $group: { _id: '$user', submissionCount: { $sum: 1 } } },
    { $sort: { submissionCount: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from:         'users',      // MongoDB collection name (lowercase plural of model name)
        localField:   '_id',        // the user ID from the grouped submissions
        foreignField: '_id',        // match against _id in the users collection
        as:           'userInfo',   // result stored in this array field
      },
    },
    { $unwind: '$userInfo' },       // flatten the userInfo array (it always has 1 element)
    {
      $project: {                   // shape the output — pick only the fields we need
        name:            '$userInfo.name',
        email:           '$userInfo.email',
        submissionCount: 1,
      },
    },
  ]);

  // --- 6. Top 10 users by violation count ---
  // Same pipeline as above but pre-filtered to only Flagged/Blocked submissions
  const topByViolations = await Submission.aggregate([
    { $match: { verdict: { $in: ['Flagged for Review', 'Blocked'] } } },
    { $group: { _id: '$user', violationCount: { $sum: 1 } } },
    { $sort: { violationCount: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from:         'users',
        localField:   '_id',
        foreignField: '_id',
        as:           'userInfo',
      },
    },
    { $unwind: '$userInfo' },
    {
      $project: {
        name:           '$userInfo.name',
        email:          '$userInfo.email',
        violationCount: 1,
      },
    },
  ]);

  // --- 7. Simple total counts ---
  const totalSubmissions = await Submission.countDocuments();
  const totalUsers       = await User.countDocuments({ role: 'user' }); // exclude admins

  res.json({
    success: true,
    analytics: {
      totalSubmissions,
      totalUsers,
      submissionsOverTime,
      verdictDistribution,
      categoryDistribution,
      appeals: {
        total:          totalAppeals,
        byStatus:       appealByStatus,
        resolutionRate: Number(resolutionRate),
      },
      topUsersBySubmissions: topBySubmissions,
      topUsersByViolations:  topByViolations,
    },
  });
};

module.exports = { getAnalytics };

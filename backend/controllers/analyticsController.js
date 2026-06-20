const Submission = require('../models/Submission');
const Appeal = require('../models/Appeal');
const User = require('../models/User');

// GET /api/analytics
const getAnalytics = async (req, res) => {
  // 1. Total submission volume over time (grouped by day for last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const submissionsOverTime = await Submission.aggregate([
    { $match: { createdAt: { $gte: thirtyDaysAgo } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // 2. Verdict distribution
  const verdictDistribution = await Submission.aggregate([
    { $group: { _id: '$verdict', count: { $sum: 1 } } },
  ]);

  // 3. Per-category violation counts
  const categoryDistribution = await Submission.aggregate([
    { $unwind: '$categoryResults' },
    { $match: { 'categoryResults.detected': true } },
    { $group: { _id: '$categoryResults.category', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  // 4. Appeal stats
  const totalAppeals = await Appeal.countDocuments();
  const appealByStatus = await Appeal.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const resolved = appealByStatus
    .filter((a) => a._id !== 'Pending')
    .reduce((sum, a) => sum + a.count, 0);
  const resolutionRate = totalAppeals > 0 ? ((resolved / totalAppeals) * 100).toFixed(1) : 0;

  // 5. Top users by submission count
  const topBySubmissions = await Submission.aggregate([
    { $group: { _id: '$user', submissionCount: { $sum: 1 } } },
    { $sort: { submissionCount: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'userInfo',
      },
    },
    { $unwind: '$userInfo' },
    {
      $project: {
        name: '$userInfo.name',
        email: '$userInfo.email',
        submissionCount: 1,
      },
    },
  ]);

  // 6. Top users by violation count (submissions that were Flagged or Blocked)
  const topByViolations = await Submission.aggregate([
    { $match: { verdict: { $in: ['Flagged for Review', 'Blocked'] } } },
    { $group: { _id: '$user', violationCount: { $sum: 1 } } },
    { $sort: { violationCount: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'userInfo',
      },
    },
    { $unwind: '$userInfo' },
    {
      $project: {
        name: '$userInfo.name',
        email: '$userInfo.email',
        violationCount: 1,
      },
    },
  ]);

  // 7. Summary counts
  const totalSubmissions = await Submission.countDocuments();
  const totalUsers = await User.countDocuments({ role: 'user' });

  res.json({
    success: true,
    analytics: {
      totalSubmissions,
      totalUsers,
      submissionsOverTime,
      verdictDistribution,
      categoryDistribution,
      appeals: {
        total: totalAppeals,
        byStatus: appealByStatus,
        resolutionRate: Number(resolutionRate),
      },
      topUsersBySubmissions: topBySubmissions,
      topUsersByViolations: topByViolations,
    },
  });
};

module.exports = { getAnalytics };

const Policy = require('../models/Policy');
const { CATEGORIES } = require('../services/moderationService');

// Seeds default policies if none exist yet
const seedPolicies = async () => {
  const count = await Policy.countDocuments();
  if (count === 0) {
    const defaults = CATEGORIES.map((category) => ({
      category,
      enabled: true,
      threshold: 70,
      action: 'Flag for Review',
    }));
    await Policy.insertMany(defaults);
  }
};

// GET /api/policies  — get all category policies
const getPolicies = async (req, res) => {
  await seedPolicies();
  const policies = await Policy.find({}).sort({ category: 1 });
  res.json({ success: true, policies });
};

// PATCH /api/policies/:id  — update a single category policy
const updatePolicy = async (req, res) => {
  const { enabled, threshold, action } = req.body;

  const policy = await Policy.findById(req.params.id);
  if (!policy) {
    const err = new Error('Policy not found');
    err.statusCode = 404;
    throw err;
  }

  if (enabled !== undefined) policy.enabled = enabled;
  if (threshold !== undefined) policy.threshold = threshold;
  if (action !== undefined) policy.action = action;

  await policy.save();

  res.json({ success: true, policy });
};

module.exports = { getPolicies, updatePolicy };

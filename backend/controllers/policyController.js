// policyController.js — Handles reading and updating moderation policies.
// Policies control how the AI results are converted into verdicts.

const Policy = require('../models/Policy');
const { CATEGORIES } = require('../services/moderationService');

// seedPolicies — creates default policy documents if none exist in the database yet.
// Called every time GET /api/policies is requested, so the first admin visit
// automatically initializes all 6 categories without requiring a manual setup step.
const seedPolicies = async () => {
  const count = await Policy.countDocuments();
  if (count === 0) {
    // Create one policy per category with sensible defaults
    const defaults = CATEGORIES.map((category) => ({
      category,
      enabled:   true,
      threshold: 70,              // 70% confidence required to trigger a flag
      action:    'Flag for Review',
    }));
    await Policy.insertMany(defaults);
  }
};

// GET /api/policies — returns all 6 category policies sorted alphabetically.
// Seeds default policies first if the collection is empty (e.g. on a fresh deployment).
const getPolicies = async (req, res) => {
  await seedPolicies();
  const policies = await Policy.find({}).sort({ category: 1 });
  res.json({ success: true, policies });
};

// PATCH /api/policies/:id — updates a single category's policy settings.
// Only the fields that are included in the request body are updated;
// missing fields are left unchanged (partial update pattern).
const updatePolicy = async (req, res) => {
  const { enabled, threshold, action } = req.body;

  const policy = await Policy.findById(req.params.id);
  if (!policy) {
    const err = new Error('Policy not found');
    err.statusCode = 404;
    throw err;
  }

  // Only update a field if it was sent in the request body
  // (undefined check avoids overwriting with null/undefined)
  if (enabled   !== undefined) policy.enabled   = enabled;
  if (threshold !== undefined) policy.threshold = threshold;
  if (action    !== undefined) policy.action    = action;

  await policy.save(); // triggers Mongoose validation before saving

  res.json({ success: true, policy });
};

module.exports = { getPolicies, updatePolicy };

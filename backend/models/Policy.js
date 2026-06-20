const mongoose = require('mongoose');

// The 6 moderation categories defined in the spec
const CATEGORIES = [
  'Graphic Violence',
  'Hate Symbols',
  'Self-Harm',
  'Extremist Propaganda',
  'Weapons & Contraband',
  'Harassment & Humiliation',
];

const policySchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: CATEGORIES,
      required: true,
      unique: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    // confidence percentage (0-100) below which detection is ignored
    threshold: {
      type: Number,
      default: 70,
      min: 0,
      max: 100,
    },
    // what to do when threshold is met
    action: {
      type: String,
      enum: ['Auto-Block', 'Flag for Review'],
      default: 'Flag for Review',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Policy', policySchema);
module.exports.CATEGORIES = CATEGORIES;

// Policy.js — Mongoose model for the policies collection.
// Stores the moderation rules for each of the 6 content categories.
// Admins can change these settings via the Policies page.
// Changes apply to NEW submissions only — old verdicts are never retroactively changed.

const mongoose = require('mongoose');

// The 6 fixed moderation categories used throughout the system.
// Exported so other files (controllers, services) can import the same list
// instead of duplicating it.
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
    // The category this policy controls (must be one of the 6 above)
    category: {
      type: String,
      enum: CATEGORIES,
      required: true,
      unique: true, // one policy document per category
    },

    // Whether this category is actively being checked.
    // If false, detections in this category are completely ignored when calculating the verdict.
    enabled: {
      type: Boolean,
      default: true,
    },

    // Minimum confidence percentage (0–100) required to count a detection.
    // If the AI returns 65% confidence but the threshold is 70%, the detection is ignored.
    threshold: {
      type: Number,
      default: 70,
      min: 0,
      max: 100,
    },

    // What action to take when a detection exceeds the threshold:
    // "Flag for Review" → verdict becomes "Flagged for Review"
    // "Auto-Block"      → verdict becomes "Blocked" immediately (highest severity)
    action: {
      type: String,
      enum: ['Auto-Block', 'Flag for Review'],
      default: 'Flag for Review',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Policy', policySchema);
module.exports.CATEGORIES = CATEGORIES; // exported separately so other files can import it

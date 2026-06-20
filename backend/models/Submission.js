const mongoose = require('mongoose');

// Per-category result produced by the AI
const categoryResultSchema = new mongoose.Schema(
  {
    category: { type: String, required: true },
    detected: { type: Boolean, required: true },
    confidence: { type: Number, required: true }, // 0-100
    reason: { type: String, required: true },
  },
  { _id: false }
);

// Snapshot of the policy that was active when this submission was processed
const policySnapshotSchema = new mongoose.Schema(
  {
    category: String,
    enabled: Boolean,
    threshold: Number,
    action: String,
  },
  { _id: false }
);

const submissionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    originalFilename: {
      type: String,
    },
    // Overall verdict for this image
    verdict: {
      type: String,
      enum: ['Approved', 'Flagged for Review', 'Blocked'],
      required: true,
    },
    // Per-category AI results
    categoryResults: [categoryResultSchema],
    // Snapshot of policies at time of submission
    policySnapshot: [policySnapshotSchema],
    // Whether admin has manually overridden the verdict
    overridden: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Submission', submissionSchema);

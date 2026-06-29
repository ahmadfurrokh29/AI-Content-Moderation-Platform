// Submission.js — Mongoose model for the submissions collection.
// Each document represents one uploaded image and its AI moderation result.

const mongoose = require('mongoose');

// Sub-schema for the AI result of a single moderation category.
// { _id: false } prevents Mongoose from adding an _id to each array element.
const categoryResultSchema = new mongoose.Schema(
  {
    category:   { type: String,  required: true },
    detected:   { type: Boolean, required: true }, // true = violation found
    confidence: { type: Number,  required: true }, // 0–100 percentage
    reason:     { type: String,  required: true }, // one-line explanation from the AI
  },
  { _id: false }
);

// Sub-schema that records a snapshot of the active moderation policy at submission time.
// This is saved so that future policy changes do NOT retroactively alter old verdicts.
const policySnapshotSchema = new mongoose.Schema(
  {
    category:  String,
    enabled:   Boolean,
    threshold: Number,
    action:    String,
  },
  { _id: false }
);

const submissionSchema = new mongoose.Schema(
  {
    // Reference to the user who uploaded this image
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Relative URL path to the saved image file (e.g. /uploads/1234-5678.jpg)
    imageUrl: {
      type: String,
      required: true,
    },

    // Original filename as uploaded by the user (e.g. "my-photo.jpg")
    originalFilename: {
      type: String,
    },

    // Overall moderation decision determined by the verdict logic in moderationService.js
    verdict: {
      type: String,
      enum: ['Approved', 'Flagged for Review', 'Blocked'],
      required: true,
    },

    // Array of 6 results — one per moderation category (from categoryResultSchema above)
    categoryResults: [categoryResultSchema],

    // Snapshot of the 6 policies that were active when this image was analyzed.
    // Stored so the verdict reasoning is always traceable even after policy changes.
    policySnapshot: [policySnapshotSchema],

    // Set to true when an admin manually changes the verdict via the override endpoint.
    // The UI shows an "Overridden" badge when this is true.
    overridden: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true } // adds createdAt and updatedAt automatically
);

module.exports = mongoose.model('Submission', submissionSchema);

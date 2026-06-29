// Appeal.js — Mongoose model for the appeals collection.
// Each document represents one appeal submitted by a user against a Flagged or Blocked verdict.
// The unique constraint on `submission` ensures only one appeal per submission is allowed.

const mongoose = require('mongoose');

const appealSchema = new mongoose.Schema(
  {
    // The submission being appealed — one-to-one relationship (unique: true)
    submission: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Submission',
      required: true,
      unique: true, // prevents a user from submitting multiple appeals for the same image
    },

    // The user who filed the appeal
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // The written justification the user provided when submitting the appeal
    reason: {
      type: String,
      required: [true, 'Appeal reason is required'],
      trim: true,
    },

    // Current state of the appeal in the review workflow
    status: {
      type: String,
      enum: ['Pending', 'Accepted', 'Rejected'],
      default: 'Pending', // all new appeals start as Pending
    },

    // Optional written response from the admin when accepting or rejecting the appeal
    adminResponse: {
      type: String,
      default: '',
    },

    // Which admin reviewed the appeal (stored for audit purposes)
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // Timestamp of when the admin made the decision
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true } // adds createdAt and updatedAt automatically
);

module.exports = mongoose.model('Appeal', appealSchema);

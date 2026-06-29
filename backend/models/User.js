// User.js — Mongoose model for the users collection.
// Stores account credentials and role. Password is hashed before saving.

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,      // MongoDB creates a unique index on this field
      lowercase: true,   // store emails in lowercase to avoid duplicate case issues
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false,     // NEVER include password in query results by default
                         // must explicitly use .select('+password') to get it
    },
    role: {
      type: String,
      enum: ['user', 'admin'], // only these two values are allowed
      default: 'user',
    },
  },
  { timestamps: true } // automatically adds createdAt and updatedAt fields
);

// PRE-SAVE HOOK — runs automatically before every document.save() call.
// Hashes the password with bcrypt so the raw password is never stored in the database.
// `isModified('password')` check prevents re-hashing an already-hashed password
// when other fields (like name) are updated.
// Note: Mongoose v9 async hooks do not receive a `next` parameter — just return/await.
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12); // 12 = salt rounds (higher = slower but safer)
});

// comparePassword — used at login to check if the entered password matches the stored hash.
// Returns true if they match, false otherwise.
// `this.password` is the hashed password stored in the DB.
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);

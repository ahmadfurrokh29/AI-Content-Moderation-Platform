// db.js — MongoDB connection setup.
// Called once at server startup. If the connection fails, the process exits
// because the app cannot function without a database.

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // MONGO_URI comes from .env — it points to the MongoDB Atlas cluster
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    // Exit with code 1 (failure) so Docker / PM2 can detect and restart the process
    process.exit(1);
  }
};

module.exports = connectDB;

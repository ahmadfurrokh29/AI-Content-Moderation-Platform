// multer.js — File upload configuration.
// Multer is a middleware that handles multipart/form-data requests (i.e. file uploads).
// This file defines WHERE files are saved, HOW they are named, and WHICH file types are allowed.

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure the uploads directory exists before any file is saved.
// recursive: true means it won't throw an error if the folder already exists.
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// DISK STORAGE — tells Multer to save files to disk (as opposed to keeping them in memory)
const storage = multer.diskStorage({
  // destination: which folder to save the file in
  destination: (req, file, cb) => cb(null, uploadDir),

  // filename: generate a unique filename for each upload to prevent collisions
  // Format: <timestamp>-<random number><original extension>
  // Example: 1719500000000-823456789.jpg
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

// FILE FILTER — reject any file that is not an image
// Both the file extension AND the MIME type are checked to prevent spoofing
const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  const isValid =
    allowed.test(path.extname(file.originalname).toLowerCase()) &&
    allowed.test(file.mimetype);

  if (isValid) {
    cb(null, true);  // accept the file
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
};

// Create the Multer instance with all settings combined.
// `upload` is exported and used in routes as upload.array('images', 10)
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB maximum per file
});

module.exports = upload;

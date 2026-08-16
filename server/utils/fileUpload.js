const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ========== FILE UPLOAD CONFIGURATION ==========

// Allowed MIME types
const ALLOWED_MIMES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'audio/webm': '.webm',
  'audio/mpeg': '.mp3',
  'audio/wav': '.wav',
};

// File size limits (in bytes)
const FILE_SIZE_LIMITS = {
  image: 5 * 1024 * 1024,      // 5MB for images
  audio: 10 * 1024 * 1024,     // 10MB for audio
  default: 10 * 1024 * 1024    // 10MB default
};

// ========== MULTER STORAGE CONFIGURATION ==========

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Save files in uploads directory
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate secure filename: timestamp + random hash + extension
    const ext = path.extname(file.originalname).toLowerCase();
    const randomHash = crypto.randomBytes(8).toString('hex');
    const timestamp = Date.now();
    const filename = `${timestamp}-${randomHash}${ext}`;
    cb(null, filename);
  }
});

// ========== FILE FILTER ==========

const fileFilter = (req, file, cb) => {
  const mimetype = file.mimetype.toLowerCase();
  
  // Check if MIME type is allowed
  if (!ALLOWED_MIMES[mimetype]) {
    return cb(new Error('Invalid file type. Only images (JPEG, PNG, WebP) and audio (WebM, MP3, WAV) are allowed.'));
  }

  // Determine file size limit based on type
  let sizeLimit = FILE_SIZE_LIMITS.default;
  if (mimetype.startsWith('image/')) {
    sizeLimit = FILE_SIZE_LIMITS.image;
  } else if (mimetype.startsWith('audio/')) {
    sizeLimit = FILE_SIZE_LIMITS.audio;
  }

  // Store size limit in req for later validation
  req.fileSizeLimit = sizeLimit;

  cb(null, true);
};

// ========== MULTER UPLOAD INSTANCE ==========

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: FILE_SIZE_LIMITS.default, // Hard limit at multer level
  },
});

// ========== FILE UPLOAD VALIDATION MIDDLEWARE ==========

const validateFileUpload = (req, res, next) => {
  if (!req.file) {
    return next();
  }

  try {
    // Double-check MIME type
    if (!ALLOWED_MIMES[req.file.mimetype]) {
      // Delete the uploaded file
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
      return res.status(400).json({
        message: 'Invalid file type. Only images and audio allowed.'
      });
    }

    // Check file size
    if (req.file.size > FILE_SIZE_LIMITS.default) {
      // Delete the uploaded file
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
      return res.status(400).json({
        message: `File size exceeds ${FILE_SIZE_LIMITS.default / (1024 * 1024)}MB limit`
      });
    }

    // Check file exists and is readable
    if (!fs.existsSync(req.file.path)) {
      return res.status(500).json({
        message: 'File upload failed'
      });
    }

    next();
  } catch (error) {
    // Clean up on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }
    return res.status(500).json({
      message: 'File validation failed',
      error: error.message
    });
  }
};

// ========== FILE DELETION UTILITY ==========

const deleteFile = (filePath) => {
  try {
    const fullPath = path.join(uploadsDir, path.basename(filePath));
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return true;
    }
  } catch (error) {
    console.error('Error deleting file:', error);
  }
  return false;
};

module.exports = {
  upload,
  validateFileUpload,
  deleteFile,
  ALLOWED_MIMES,
  FILE_SIZE_LIMITS,
  uploadsDir
};

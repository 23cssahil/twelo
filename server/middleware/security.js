const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');

// ========== INPUT SANITIZATION ==========
const sanitizeInput = (str) => {
  if (!str) return str;
  // Remove HTML tags and dangerous characters
  return str
    .replace(/<[^>]*>/g, '')
    .replace(/[<>\"'%&]/g, '')
    .trim();
};

// ========== RATE LIMITING ==========

// Strict rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per 15 minutes
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Message rate limiter
const messageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 messages per minute
  message: 'Too many messages, please slow down',
  skip: (req) => !req.user, // Only rate limit authenticated users
});

// Report rate limiter
const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 reports per hour
  message: 'Too many reports, please try again later',
});

// Friend request rate limiter
const friendRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 requests per hour
  message: 'Too many friend requests, please try again later',
});

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// ========== SECURITY HEADERS ==========
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
});

// ========== ADMIN AUTH MIDDLEWARE (JWT-BASED) ==========
const adminAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Admin token missing' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'insta_jwt_secret_key_12345');
    
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized - Admin access required' });
    }

    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired admin token' });
  }
};

// ========== CORS CONFIG ==========
const corsConfig = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
};

// ========== INPUT VALIDATION HELPERS ==========
const validateAge = (age) => {
  const ageNum = Number(age);
  return ageNum >= 13 && ageNum <= 120;
};

const validateUsername = (username) => {
  // 3-20 characters, alphanumeric and underscore only
  const regex = /^[a-zA-Z0-9_]{3,20}$/;
  return regex.test(username);
};

const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

const validateCountry = (country) => {
  const validCountries = [
    'India', 'USA', 'UK', 'Canada', 'Australia', 'Germany',
    'France', 'Japan', 'Brazil', 'Other'
  ];
  return validCountries.includes(country);
};

const validateGender = (gender) => {
  return ['male', 'female', 'other'].includes(gender.toLowerCase());
};

// ========== FILE UPLOAD VALIDATION ==========
const validateFileUpload = (req, res, next) => {
  if (!req.file) {
    return next();
  }

  // Allowed MIME types
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'audio/webm', 'audio/mpeg'];
  
  // File size limit: 10MB
  const maxSize = 10 * 1024 * 1024;

  if (!allowedMimes.includes(req.file.mimetype)) {
    return res.status(400).json({ message: 'Invalid file type. Only images and audio allowed.' });
  }

  if (req.file.size > maxSize) {
    return res.status(400).json({ message: 'File size exceeds 10MB limit' });
  }

  next();
};

module.exports = {
  sanitizeInput,
  authLimiter,
  messageLimiter,
  reportLimiter,
  friendRequestLimiter,
  apiLimiter,
  securityHeaders,
  adminAuth,
  corsConfig,
  validateAge,
  validateUsername,
  validateEmail,
  validateCountry,
  validateGender,
  validateFileUpload,
};

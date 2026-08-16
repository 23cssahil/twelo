const rateLimit = require('express-rate-limit');

// ========== AUTH ENDPOINTS - STRICT RATE LIMITING ==========
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per 15 minutes
  message: 'Too many login attempts, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'test', // Skip in test mode
  keyGenerator: (req) => req.ip || req.connection.remoteAddress,
});

// ========== MESSAGE ENDPOINTS - MODERATE RATE LIMITING ==========
const messageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 messages per minute
  message: 'Too many messages sent, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !req.user, // Only rate limit authenticated users
});

// ========== REPORT ENDPOINTS - STRICT RATE LIMITING ==========
const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 reports per hour per user
  message: 'Too many reports submitted, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.userId || req.ip,
});

// ========== FRIEND REQUEST ENDPOINTS - MODERATE RATE LIMITING ==========
const friendRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 requests per hour
  message: 'Too many friend requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.userId || req.ip,
});

// ========== SEARCH ENDPOINTS - MODERATE RATE LIMITING ==========
const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 searches per minute
  message: 'Too many searches, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.userId || req.ip,
});

// ========== FILE UPLOAD ENDPOINTS - MODERATE RATE LIMITING ==========
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 uploads per hour
  message: 'Too many file uploads, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.userId || req.ip,
});

// ========== GENERAL API - PERMISSIVE RATE LIMITING ==========
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per 15 minutes
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'test',
});

module.exports = {
  authLimiter,
  messageLimiter,
  reportLimiter,
  friendRequestLimiter,
  searchLimiter,
  uploadLimiter,
  apiLimiter,
};

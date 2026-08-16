const jwt = require('jsonwebtoken');

/**
 * Generate admin JWT token
 * @param {string} adminId - Admin user ID
 * @returns {string} JWT token
 */
const generateAdminToken = (adminId) => {
  return jwt.sign(
    { adminId, role: 'admin' },
    process.env.ADMIN_JWT_SECRET || 'admin_secret_key_12345',
    { expiresIn: '7d' }
  );
};

/**
 * Verify admin JWT token
 * @param {string} token - JWT token
 * @returns {object} Decoded token
 */
const verifyAdminToken = (token) => {
  try {
    return jwt.verify(token, process.env.ADMIN_JWT_SECRET || 'admin_secret_key_12345');
  } catch (error) {
    throw new Error('Invalid or expired admin token');
  }
};

/**
 * Admin authentication middleware
 */
const adminAuth = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Admin token missing' });
    }

    const decoded = verifyAdminToken(token);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized - Admin access required' });
    }

    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired admin token' });
  }
};

module.exports = {
  generateAdminToken,
  verifyAdminToken,
  adminAuth
};

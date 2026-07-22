/**
 * Sanitize user input to prevent XSS attacks
 * @param {string} str - Input string
 * @returns {string} Sanitized string
 */
const sanitizeInput = (str) => {
  if (!str || typeof str !== 'string') return str;
  
  return str
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>"'%&;]/g, '') // Remove dangerous characters
    .trim();
};

/**
 * Sanitize message content
 * @param {string} message - Message text
 * @returns {string} Sanitized message
 */
const sanitizeMessage = (message) => {
  return sanitizeInput(message).substring(0, 5000); // Max 5000 chars
};

/**
 * Sanitize username
 * @param {string} username - Username
 * @returns {string} Sanitized username
 */
const sanitizeUsername = (username) => {
  return sanitizeInput(username).toLowerCase().substring(0, 50);
};

module.exports = {
  sanitizeInput,
  sanitizeMessage,
  sanitizeUsername
};

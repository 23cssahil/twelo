/**
 * Input Validation Utilities
 * Validates user input for security and data integrity
 */

// ========== AGE VALIDATION ==========
const validateAge = (age) => {
  const ageNum = Number(age);
  return !isNaN(ageNum) && ageNum >= 13 && ageNum <= 120;
};

// ========== USERNAME VALIDATION ==========
const validateUsername = (username) => {
  if (!username || typeof username !== 'string') return false;
  // 3-30 characters, alphanumeric and underscore only
  const regex = /^[a-zA-Z0-9_]{3,30}$/;
  return regex.test(username.trim());
};

// ========== EMAIL VALIDATION ==========
const validateEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email.trim());
};

// ========== COUNTRY VALIDATION ==========
const VALID_COUNTRIES = [
  'India', 'USA', 'UK', 'Canada', 'Australia', 'Germany',
  'France', 'Japan', 'Brazil', 'Mexico', 'Spain', 'Italy',
  'Netherlands', 'Sweden', 'Switzerland', 'Singapore', 'Other'
];

const validateCountry = (country) => {
  if (!country || typeof country !== 'string') return false;
  return VALID_COUNTRIES.includes(country.trim());
};

// ========== GENDER VALIDATION ==========
const VALID_GENDERS = ['male', 'female', 'other'];

const validateGender = (gender) => {
  if (!gender || typeof gender !== 'string') return false;
  return VALID_GENDERS.includes(gender.toLowerCase().trim());
};

// ========== NAME VALIDATION ==========
const validateName = (name) => {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  // 2-50 characters, letters, numbers, and spaces/hyphens
  const regex = /^[a-zA-Z0-9\s\-']{2,50}$/;
  return regex.test(trimmed);
};

// ========== MESSAGE VALIDATION ==========
const validateMessage = (message) => {
  if (typeof message !== 'string') return false;
  const trimmed = message.trim();
  return trimmed.length > 0 && trimmed.length <= 5000;
};

// ========== UNIQUE ID VALIDATION ==========
const validateUniqueId = (uniqueId) => {
  if (!uniqueId || typeof uniqueId !== 'string') return false;
  // 8 character alphanumeric
  const regex = /^[a-z0-9]{8}$/;
  return regex.test(uniqueId.toLowerCase().trim());
};

// ========== MONGODB OBJECT ID VALIDATION ==========
const validateMongoId = (id) => {
  if (!id || typeof id !== 'string') return false;
  // MongoDB ObjectId: 24 hex characters
  const regex = /^[a-f\d]{24}$/i;
  return regex.test(id);
};

// ========== URL VALIDATION ==========
const validateUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
};

// ========== REPORT REASON VALIDATION ==========
const VALID_REPORT_REASONS = [
  'Sexual Harassment',
  'Spam / Scams',
  'Abuse / Insult',
  'Other Inappropriate Behavior'
];

const validateReportReason = (reason) => {
  if (!reason || typeof reason !== 'string') return false;
  return VALID_REPORT_REASONS.includes(reason.trim());
};

// ========== COMBINED PROFILE VALIDATION ==========
const validateProfileData = (data) => {
  const errors = [];

  if (!validateName(data.name)) {
    errors.push('Invalid name. Must be 2-50 characters.');
  }

  if (!validateEmail(data.email)) {
    errors.push('Invalid email format.');
  }

  if (!validateAge(data.age)) {
    errors.push('Age must be between 13 and 120.');
  }

  if (!validateCountry(data.country)) {
    errors.push('Invalid country.');
  }

  if (!validateGender(data.gender)) {
    errors.push('Invalid gender.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  validateAge,
  validateUsername,
  validateEmail,
  validateCountry,
  validateGender,
  validateName,
  validateMessage,
  validateUniqueId,
  validateMongoId,
  validateUrl,
  validateReportReason,
  validateProfileData,
  VALID_COUNTRIES,
  VALID_GENDERS,
  VALID_REPORT_REASONS
};

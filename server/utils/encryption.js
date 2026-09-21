/**
 * Chat Message Encryption Utility
 * Uses AES-256-CBC for symmetric encryption.
 * Key is loaded from environment variable ENCRYPTION_KEY.
 */
const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const KEY_RAW = process.env.ENCRYPTION_KEY;
if (!KEY_RAW) {
  console.error('[FATAL] Required environment variable ENCRYPTION_KEY is not set. Refusing to start.');
  process.exit(1);
}

// AES-256 requires exactly 32 bytes key — derive it using SHA-256
const KEY = crypto.createHash('sha256').update(KEY_RAW).digest(); // 32 bytes

/**
 * Encrypt plain text string → returns "iv:ciphertext" string
 */
function encrypt(text) {
  if (!text || typeof text !== 'string') return text;
  try {
    const iv = crypto.randomBytes(16); // 16 bytes IV
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  } catch (err) {
    console.error('[Encryption] Failed to encrypt:', err.message);
    return text; // fallback: return plain text so app doesn't break
  }
}

/**
 * Decrypt "iv:ciphertext" string → returns plain text
 * If string is not in encrypted format, returns as-is (backward compat)
 */
function decrypt(ciphertext) {
  if (!ciphertext || typeof ciphertext !== 'string') return ciphertext;
  // If it doesn't look like our encrypted format, return as-is (legacy plain text)
  if (!ciphertext.includes(':')) return ciphertext;
  try {
    const [ivHex, encryptedHex] = ciphertext.split(':');
    // Basic validation
    if (!ivHex || !encryptedHex || ivHex.length !== 32) return ciphertext;
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    // If decryption fails (e.g. old plain text message with a colon), return as-is
    return ciphertext;
  }
}

module.exports = { encrypt, decrypt };

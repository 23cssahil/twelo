const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  pastUsernames: [{
    type: String
  }],
  name: {
    type: String,
    required: true,
  },
  bio: {
    type: String,
    default: '',
    maxLength: 150,
  },
  email: {
    type: String,
    trim: true,
    unique: true,
  },
  // Deterministic HMAC-SHA256 of the normalized (trimmed+lowercased) email. The `email`
  // field itself is stored as randomized AES ciphertext (fresh IV every save), so it can
  // never be searched or uniqueness-enforced directly. This hash gives us an exact-match
  // search key for the admin dashboard without ever storing a reversible plaintext email.
  emailHash: {
    type: String,
    index: true,
    sparse: true,
  },
  googleId: {
    type: String,
    trim: true,
    unique: true,
  },
  // Guest accounts have no email/googleId yet. Because MongoDB unique indexes
  // permit multiple missing/null values, leaving email/googleId undefined for a
  // guest never collides. Upgrading a guest links real values onto the SAME doc.
  isGuest: {
    type: Boolean,
    default: false,
  },
  // SHA-256 hash of the one-time guest recovery/claim code (sparse so only guests
  // that still have a code are indexed). Lets a guest restore their account on a
  // new device, and is cleared once they upgrade to Google.
  guestClaimCodeHash: {
    type: String,
    trim: true,
    unique: true,
    sparse: true,
  },
  uniqueId: {
    type: String,
    required: true,
    unique: true,
  },
  age: {
    type: Number,
    required: true,
    default: 18,
  },
  country: {
    type: String,
    required: true,
    default: 'Earth',
  },
  countryCode: {
    type: String,
    default: 'UN', // Default to UN (United Nations / Unknown)
  },
  gender: {
    type: String,
    required: true,
    enum: ['male', 'female'],
    default: 'male',
  },
  avatarUrl: {
    type: String,
    default: '',
  },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  searchHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  chatThemes: {
    type: Map,
    of: String,
    default: {}
  },
  isBlocked: { type: Boolean, default: false },
  // ── Moderation / enforcement ──────────────────────────────────────────────
  // Suspension is DISTINCT from a block: a suspended account can still sign in
  // but is shown a notice + live countdown and is auto-lifted once it lapses.
  // A block is a hard lockout. Both persist the last admin message in
  // enforcementNotice so the user actually reads it even when offline.
  isSuspended: { type: Boolean, default: false },
  suspendedUntil: { type: Date, default: null }, // null + isSuspended=true => permanent (admin must lift)
  suspensionStart: { type: Date, default: null },
  suspensionReason: { type: String, default: null },
  enforcementNotice: { type: String, default: null }, // last warn/suspend/block text shown to the user
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  notifications: [{
    type: { type: String, enum: ['follow_request', 'request_accepted', 'system_alert', 'anonymous_follow_request', 'anonymous_request_accepted', 'follow_back_request', 'started_following_you', 'request_rejected', 'story_comment', 'comment_reply', 'story_like'], required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    message: { type: String },
    alertType: { type: String, enum: ['info', 'warning', 'success', 'urgent'] },
    storyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Story' },
    commentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment' },
    createdAt: { type: Date, default: Date.now },
    read: { type: Boolean, default: false }
  }],
  pushSubscriptions: { type: Array, default: [] },
  // Firebase Cloud Messaging device token for the packaged native (Capacitor) app.
  // Set by POST /api/users/fcm-token; used by sendToUserDevices for closed-app push.
  fcmToken: { type: String, default: null },
  coins: { type: Number, default: 10 },
  lastCoinReplenishDate: { type: Date, default: Date.now },
  ownedByAdmin: { type: Boolean, default: false },
  // For admin bot accounts: the single real user this persona is dedicated to.
  // Guarantees each user sees their own admin identity, never a shared/overwritten one.
  dedicatedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  lastActive: { type: Date, default: Date.now },
  lastDailyReward: { type: Date },
  isPrivate: { type: Boolean, default: false },
  // Last client IP captured at guest creation/recovery login (used to derive country and
  // surfaced in the admin User Database for moderation/abuse review).
  lastIp: { type: String, default: null },
  lastIpAt: { type: Date, default: null },
  // Approximate geolocation of that IP (city/region/state level) for the admin world map.
  // Populated on login/registration; only forward-looking users have coordinates.
  lastLat: { type: Number, default: null },
  lastLon: { type: Number, default: null },
  lastRegion: { type: String, default: null },
  lastCity: { type: String, default: null },
  lastDistrict: { type: String, default: null },
  // Signup (first-ever captured) location — frozen permanently the first time we geolocate
  // this account and never overwritten by later logins, so we always know where they joined.
  signupLat: { type: Number, default: null },
  signupLon: { type: Number, default: null },
  signupRegion: { type: String, default: null },
  signupCity: { type: String, default: null },
  signupDistrict: { type: String, default: null },
  signupCountry: { type: String, default: null },
  signupAt: { type: Date, default: null },
  // Rolling list of the distinct places this account has logged in from (newest last, capped
  // server-side to ~20) so the admin User Map can show a "where have they been" history.
  locationHistory: [{
    lat: Number,
    lon: Number,
    city: String,
    region: String,
    district: String,
    country: String,
    at: Date,
  }],
}, { timestamps: true });

// ========== INDEXES FOR PERFORMANCE ==========
// Fast username/uniqueId search (prefix match)
UserSchema.index({ username: 1 });
UserSchema.index({ uniqueId: 1 });
// Notifications sorted by date
UserSchema.index({ 'notifications.createdAt': -1 });
// lastActive for online status queries
UserSchema.index({ lastActive: -1 });

module.exports = mongoose.model('User', UserSchema);

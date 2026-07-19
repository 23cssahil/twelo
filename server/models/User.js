const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  googleId: {
    type: String,
    required: true,
    unique: true,
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
  isBlocked: { type: Boolean, default: false },
  notifications: [{
    type: { type: String, enum: ['follow_request', 'request_accepted', 'system_alert'], required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    message: { type: String },
    createdAt: { type: Date, default: Date.now },
    read: { type: Boolean, default: false }
  }],
  coins: { type: Number, default: 10 },
  lastCoinReplenishDate: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);

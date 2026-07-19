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
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  coins: { type: Number, default: 10 },
  lastCoinReplenishDate: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);

const mongoose = require('mongoose');

const UserSessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  durationMs: { type: Number, required: true }, // duration in milliseconds
  messagesSent: { type: Number, default: 0 },
  matchesMade: { type: Number, default: 0 }
}, { timestamps: true });

// Indexing for faster analytics queries based on time and user
UserSessionSchema.index({ startTime: 1, endTime: 1 });
UserSessionSchema.index({ user: 1, startTime: 1 });

module.exports = mongoose.model('UserSession', UserSessionSchema);

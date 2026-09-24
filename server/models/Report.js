const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reporterUsername: { type: String, required: true },
  reportedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reportedUsername: { type: String, required: true }, // Store username in case user gets deleted
  reason: { type: String, required: true },
  chatContext: { type: String }, // JSON stringified array of messages
  status: { type: String, enum: ['pending', 'resolved'], default: 'pending' },
  // Moderation workflow fields
  warnSent: { type: Boolean, default: false }, // admin sent a warning for this report (prevents duplicates)
  warningMessage: { type: String }, // the exact warning text delivered to the reported user
  actionTaken: { type: Boolean, default: false }, // reporter was notified that action was taken
  resolvedAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Report', ReportSchema);

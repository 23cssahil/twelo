const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  message: {
    type: String,
    required: false,
    default: '',
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'audio'],
    default: 'text',
  },
  fileUrl: {
    type: String,
    default: null,
  },
  deletedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  isViewOnce: {
    type: Boolean,
    default: false,
  },
  isViewed: {
    type: Boolean,
    default: false,
  },
  replyTo: {
    messageId: { type: String },
    messageText: { type: String },
    senderName: { type: String }
  }
}, { timestamps: true });

// Supports the two directions used when loading a user's conversations.
MessageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
MessageSchema.index({ receiver: 1, sender: 1, createdAt: -1 });

module.exports = mongoose.model('Message', MessageSchema);

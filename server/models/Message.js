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

module.exports = mongoose.model('Message', MessageSchema);

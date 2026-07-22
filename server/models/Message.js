const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  message: {
    type: String,
    required: false,
    default: '',
    maxlength: 5000,
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
  viewedAt: {
    type: Date,
    default: null,
  },
  // ========== FIXED REPLYTO SCHEMA ==========
  replyTo: {
    messageId: {
      type: mongoose.Schema.Types.ObjectId,  // Changed from String to ObjectId
      ref: 'Message',
      default: null,
    },
    messageText: {
      type: String,
      default: null,
      maxlength: 500,
    },
    senderName: {
      type: String,
      default: null,
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'audio'],
      default: 'text',
    },
  },
}, { timestamps: true });

// ========== INDEXES FOR PERFORMANCE ==========
// Compound index for finding messages between two users
MessageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
MessageSchema.index({ receiver: 1, sender: 1, createdAt: -1 });

// Index for finding messages by receiver (for notifications)
MessageSchema.index({ receiver: 1, createdAt: -1 });

// Index for finding messages by sender
MessageSchema.index({ sender: 1, createdAt: -1 });

// Index for finding unviewed messages
MessageSchema.index({ receiver: 1, isViewed: 1 });

// Index for finding view-once messages
MessageSchema.index({ isViewOnce: 1, createdAt: -1 });

// ========== TTL INDEX FOR VIEW-ONCE MESSAGES ==========
// Auto-delete view-once messages after 24 hours
MessageSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 86400,
    partialFilterExpression: { isViewOnce: true, isViewed: true }
  }
);

// ========== VIRTUAL FIELDS ==========
MessageSchema.virtual('displayTime').get(function() {
  return this.createdAt.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: true 
  }).toUpperCase();
});

// ========== METHODS ==========
/**
 * Check if message is visible to a user
 */
MessageSchema.methods.isVisibleTo = function(userId) {
  return !this.deletedBy.includes(userId);
};

/**
 * Mark message as viewed
 */
MessageSchema.methods.markViewed = async function() {
  this.isViewed = true;
  this.viewedAt = new Date();
  return await this.save();
};

/**
 * Soft delete for a specific user
 */
MessageSchema.methods.softDelete = async function(userId) {
  if (!this.deletedBy.includes(userId)) {
    this.deletedBy.push(userId);
    return await this.save();
  }
  return this;
};

module.exports = mongoose.model('Message', MessageSchema);

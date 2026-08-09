const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() { return !this.isAdminStory; }
  },
  isAdminStory: {
    type: Boolean,
    default: false
  },
  mediaUrl: {
    type: String,
    required: true
  },
  mediaType: {
    type: String,
    enum: ['image', 'video'],
    default: 'image'
  },
  visibility: {
    type: String,
    enum: ['global', 'followers', 'custom', 'everyone'],
    default: 'everyone'
  },
  allowedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  viewedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  likedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  songUrl: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    expires: 0 // TTL index: documents expire at this specific date
  }
});

// Create index for faster querying by user
storySchema.index({ user: 1 });

module.exports = mongoose.model('Story', storySchema);

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
  // 👇 Naya Music Metadata Object (Instagram Trim & Looping ke liye)
  song: {
    audioUrl: { type: String, default: null },
    title: { type: String, default: null },
    artist: { type: String, default: null },
    image: { type: String, default: null },
    startTime: { type: Number, default: 0 },
    duration: { type: Number, default: 15 }
  },
  comment_count: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    expires: 0
  },
  isPrivate: {
    type: Boolean,
    default: false
  }
});

// Create index for faster querying by user
storySchema.index({ user: 1 });

module.exports = mongoose.model('Story', storySchema);
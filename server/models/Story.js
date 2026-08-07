const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400 // TTL index: MongoDB will automatically delete documents after 24 hours (86400 seconds)
  }
});

// Create index for faster querying by user
storySchema.index({ user: 1 });

module.exports = mongoose.model('Story', storySchema);

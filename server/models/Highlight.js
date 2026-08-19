const mongoose = require('mongoose');

const highlightSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  originalStoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Story'
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
  song: {
    audioUrl: { type: String, default: null },
    title: { type: String, default: null },
    artist: { type: String, default: null },
    image: { type: String, default: null },
    startTime: { type: Number, default: 0 },
    duration: { type: Number, default: 15 }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

highlightSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Highlight', highlightSchema);

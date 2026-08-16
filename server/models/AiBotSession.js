const mongoose = require('mongoose');

const AiBotSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  botName: { type: String, required: true },
  botGender: { type: String, enum: ['male', 'female'], required: true },
  userGender: { type: String, default: 'male' },
  chatHistory: [
    {
      role: { type: String, enum: ['user', 'model'], required: true },
      parts: [{ text: { type: String } }]
    }
  ],
  isActive: { type: Boolean, default: true },
  endedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AiBotSession', AiBotSessionSchema);

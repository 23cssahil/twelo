const mongoose = require('mongoose');

const botRuleSchema = new mongoose.Schema({
  userMessageTriggers: [{ 
    type: String, 
    required: true,
    trim: true,
    lowercase: true
  }], // Array of phrases user might say
  botResponses: [{ 
    type: String, 
    required: true,
    trim: true
  }], // Array of possible responses (bot picks randomly)
  botFollowUps: [{ 
    type: String,
    trim: true
  }], // Array of possible follow-up questions
  botFollowUpResponses: [{ 
    type: String,
    trim: true
  }], // Array of possible reactions to user's answer to the follow-up
  action: { 
    type: String, 
    enum: ['continue', 'disconnect', 'disconnect_immediately'], 
    default: 'continue' 
  },
  botGender: { 
    type: String, 
    enum: ['male', 'female', 'both'], 
    default: 'both' 
  },
  isConsistent: {
    type: Boolean,
    default: true
  },
  responseMode: {
    type: String,
    enum: ['random', 'sequential'],
    default: 'random'
  },
  isActive: { 
    type: Boolean, 
    default: true 
  }
}, { timestamps: true });

module.exports = mongoose.model('BotRule', botRuleSchema);

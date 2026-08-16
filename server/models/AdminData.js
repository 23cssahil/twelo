const mongoose = require('mongoose');

const adminDataSchema = new mongoose.Schema({
  pushSubscriptions: { type: Array, default: [] },
  globeStatus: {
    isEnabled: { type: Boolean, default: true },
    customMessage: { type: String, default: 'Globe is currently offline.' },
    enableAt: { type: Date, default: null }
  }
}, { timestamps: true });

module.exports = mongoose.model('AdminData', adminDataSchema);

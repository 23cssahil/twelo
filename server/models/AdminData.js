const mongoose = require('mongoose');

const adminDataSchema = new mongoose.Schema({
  pushSubscriptions: { type: Array, default: [] }
}, { timestamps: true });

module.exports = mongoose.model('AdminData', adminDataSchema);

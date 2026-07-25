const mongoose = require('mongoose');

const CountryFactSchema = new mongoose.Schema({
  countryCode: {
    type: String,
    required: true,
    unique: true, // E.g., 'IN', 'US'
    uppercase: true,
    trim: true,
  },
  countryName: {
    type: String,
    required: true,
    trim: true,
  },
  facts: [{
    type: String,
    trim: true,
  }],
}, { timestamps: true });

module.exports = mongoose.model('CountryFact', CountryFactSchema);

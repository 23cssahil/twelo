const mongoose = require('mongoose');

const DeletedUserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  name: { type: String, required: true },
  // Guest accounts have no Google identity — these must stay optional, otherwise
  // archiving a deleted guest throws a ValidationError and /delete_account returns 500.
  email: { type: String, default: null },
  googleId: { type: String, default: null },
  uniqueId: { type: String, required: true },
  age: { type: Number, required: true },
  country: { type: String, required: true },
  gender: { type: String, required: true },
  avatarUrl: { type: String, default: '' },
  followers: [{ type: mongoose.Schema.Types.ObjectId }],
  following: [{ type: mongoose.Schema.Types.ObjectId }],
  friendRequests: [{ type: mongoose.Schema.Types.ObjectId }],
  coins: { type: Number, default: 0 },
  deletedAt: { type: Date, default: Date.now }
  // strict:false keeps EVERY other field of the original user doc (lastIp, signup/current
  // geo, locationHistory, deviceId/deviceInfo/deviceHistory, loginCount, bio, isGuest…)
  // so the full record survives in the User Database after account deletion — for abuse
  // defence and legal evidence. Declared paths above stay validated & typed regardless.
}, { timestamps: true, strict: false });

module.exports = mongoose.model('DeletedUser', DeletedUserSchema);

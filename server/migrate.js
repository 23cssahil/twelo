const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const UserSchema = new mongoose.Schema({
  // Only defining fields we need to interact with
  friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  notifications: [{
    type: { type: String, enum: ['follow_request', 'request_accepted'], required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    read: { type: Boolean, default: false }
  }],
}, { strict: false });

const User = mongoose.model('User', UserSchema);

async function migrate() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log("Connected. Fetching users...");

    const users = await User.find();
    console.log(`Found ${users.length} users. Migrating...`);

    let modifiedCount = 0;

    for (let user of users) {
      let isModified = false;

      // 1. Pending friend requests -> follow_request
      for (let reqId of (user.friendRequests || [])) {
        const exists = user.notifications.some(n => n.user && n.user.toString() === reqId.toString());
        if (!exists) {
          user.notifications.push({ type: 'follow_request', user: reqId, createdAt: new Date(Date.now() - 10000) });
          isModified = true;
        }
      }

      // 2. Current followers -> follow_request (which the UI will see as "Accepted")
      for (let followerId of (user.followers || [])) {
        const exists = user.notifications.some(n => n.user && n.user.toString() === followerId.toString());
        if (!exists) {
          // Give it an old date so it goes to bottom
          user.notifications.push({ type: 'follow_request', user: followerId, createdAt: new Date(Date.now() - 86400000) });
          isModified = true;
        }
      }

      // 3. Current following -> request_accepted
      for (let followingId of (user.following || [])) {
        const exists = user.notifications.some(n => n.user && n.user.toString() === followingId.toString() && n.type === 'request_accepted');
        if (!exists) {
          user.notifications.push({ type: 'request_accepted', user: followingId, createdAt: new Date(Date.now() - 86400000) });
          isModified = true;
        }
      }

      if (isModified) {
        await user.save();
        modifiedCount++;
      }
    }

    console.log(`Migration complete! Modified ${modifiedCount} users.`);
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrate();

const mongoose = require('mongoose');
const mongoURI = 'mongodb+srv://danish000786:bN61sR97B2L6UuW2@twelo-cluster.m2wdf.mongodb.net/twelo?retryWrites=true&w=majority&appName=twelo-cluster';

mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    const userSchema = new mongoose.Schema({}, { strict: false });
    const User = mongoose.model('User_temp', userSchema, 'users');
    
    const users = await User.find({ avatarUrl: { $exists: false } });
    console.log(`Found ${users.length} users without avatarUrl`);
    
    for (const u of users) {
      const g = (u.gender || 'male').toLowerCase();
      const url = g === 'male' 
        ? `https://avatar.iran.liara.run/public/boy?username=${u.username}`
        : `https://avatar.iran.liara.run/public/girl?username=${u.username}`;
      await User.updateOne({ _id: u._id }, { $set: { avatarUrl: url } });
    }
    
    // Also patch users with empty avatarUrl string
    const emptyUsers = await User.find({ avatarUrl: "" });
    console.log(`Found ${emptyUsers.length} users with empty avatarUrl`);
    for (const u of emptyUsers) {
      const g = (u.gender || 'male').toLowerCase();
      const url = g === 'male' 
        ? `https://avatar.iran.liara.run/public/boy?username=${u.username}`
        : `https://avatar.iran.liara.run/public/girl?username=${u.username}`;
      await User.updateOne({ _id: u._id }, { $set: { avatarUrl: url } });
    }

    console.log('Done updating avatars');
    process.exit(0);
  });

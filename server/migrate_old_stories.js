require('dotenv').config();
const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({}, { strict: false });
const Story = mongoose.model('Story', storySchema, 'stories');

async function migrateStories() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/twelo');
    console.log('Connected to DB');

    // 1. Update old "everyone" stories to "global" so they show up on profiles
    const globalRes = await Story.updateMany(
      { visibility: 'everyone' },
      { $set: { visibility: 'global' } }
    );
    console.log(`Updated ${globalRes.modifiedCount} old 'everyone' stories to 'global'`);

    // 2. Add expiresAt to all existing 'followers' or 'custom' stories so they expire
    const stories = await Story.find({ visibility: { $in: ['followers', 'custom'] }, expiresAt: { $exists: false } });
    let expiredCount = 0;
    
    for (const story of stories) {
      const createdAt = story.createdAt || story._id.getTimestamp();
      const expiresAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);
      await Story.updateOne({ _id: story._id }, { $set: { expiresAt: expiresAt } });
      expiredCount++;
    }
    console.log(`Added expiresAt to ${expiredCount} non-global stories.`);

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateStories();

require('dotenv').config();
const mongoose = require('mongoose');
const Comment = require('./models/Comment'); // Ensure this is the correct path

async function fixLikesCount() {
  try {
    const uri = process.env.MONGO_URI || 'mongodb+srv://23cssahil_db_user:xsBXlihiFfWrsEZY@cluster0.pmn7via.mongodb.net/twelo_db?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    const comments = await Comment.find({});
    let fixedCount = 0;

    for (const comment of comments) {
      const actualLikes = comment.liked_by ? comment.liked_by.length : 0;
      if (comment.likes_count !== actualLikes) {
        console.log(`Fixing comment ${comment._id}: likes_count was ${comment.likes_count}, setting to ${actualLikes}`);
        comment.likes_count = actualLikes;
        await comment.save();
        fixedCount++;
      }
    }

    console.log(`Successfully fixed ${fixedCount} comments.`);
    process.exit(0);
  } catch (err) {
    console.error('Error fixing likes count:', err);
    process.exit(1);
  }
}

fixLikesCount();

require('dotenv').config();
const mongoose = require('mongoose');
const Comment = require('./models/Comment');

mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://23cssahil_db_user:xsBXlihiFfWrsEZY@cluster0.pmn7via.mongodb.net/twelo_db?retryWrites=true&w=majority&appName=Cluster0')
  .then(async () => {
    try {
      const comments = await Comment.find({ likes_count: { $gt: 0 } });
      let fixedCount = 0;
      for (let c of comments) {
        if (!c.liked_by) continue;
        const uniqueLikes = [...new Set(c.liked_by.map(id => id.toString()))];
        if (c.likes_count !== uniqueLikes.length || c.liked_by.length !== uniqueLikes.length) {
          c.liked_by = uniqueLikes.map(id => new mongoose.Types.ObjectId(id));
          c.likes_count = uniqueLikes.length;
          await c.save();
          fixedCount++;
        }
      }
      console.log('Fixed', fixedCount, 'comments');
    } catch(e) {
      console.error(e);
    } finally {
      mongoose.disconnect();
    }
  });

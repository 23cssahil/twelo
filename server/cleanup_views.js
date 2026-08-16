const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/twelo').then(async () => {
  console.log('Connected to DB. Cleaning up duplicate views...');
  const Story = mongoose.model('Story', new mongoose.Schema({
    viewedBy: [mongoose.Schema.Types.ObjectId],
    likedBy: [mongoose.Schema.Types.ObjectId]
  }, { strict: false }), 'stories');

  const stories = await Story.find({});
  let fixedCount = 0;

  for (let story of stories) {
    let needsSave = false;
    
    if (story.viewedBy && story.viewedBy.length > 0) {
      const uniqueViews = [...new Set(story.viewedBy.map(id => id.toString()))];
      if (uniqueViews.length !== story.viewedBy.length) {
        story.viewedBy = uniqueViews.map(id => new mongoose.Types.ObjectId(id));
        needsSave = true;
      }
    }
    
    if (story.likedBy && story.likedBy.length > 0) {
      const uniqueLikes = [...new Set(story.likedBy.map(id => id.toString()))];
      if (uniqueLikes.length !== story.likedBy.length) {
        story.likedBy = uniqueLikes.map(id => new mongoose.Types.ObjectId(id));
        needsSave = true;
      }
    }

    if (needsSave) {
      await story.save();
      fixedCount++;
    }
  }

  console.log(`Cleanup complete. Fixed ${fixedCount} stories with duplicate views/likes.`);
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

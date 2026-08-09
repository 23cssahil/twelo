const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/twelo').then(async () => {
  const Story = mongoose.model('Story', new mongoose.Schema({}, {strict: false}), 'stories');
  const stories = await Story.find({ viewedBy: { $exists: true, $not: { $size: 0 } } }).limit(5);
  console.log(JSON.stringify(stories, null, 2));
  process.exit(0);
});

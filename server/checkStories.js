const mongoose = require('mongoose');

async function testQuery() {
  await mongoose.connect('mongodb+srv://admin:admin@cluster0.p713n69.mongodb.net/twelo?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true });
  
  const stories = await mongoose.connection.db.collection('stories').find().sort({createdAt: -1}).limit(5).toArray();
  console.log("Recent 5 Stories:", JSON.stringify(stories, null, 2));
  
  mongoose.disconnect();
}
testQuery().catch(console.error);

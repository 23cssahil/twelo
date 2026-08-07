const mongoose = require('mongoose');

async function checkDB() {
  await mongoose.connect('mongodb+srv://admin:admin@cluster0.p713n69.mongodb.net/twelo?retryWrites=true&w=majority');
  const stories = await mongoose.connection.db.collection('stories').find().sort({createdAt: -1}).toArray();
  console.log("Total Stories:", stories.length);
  if (stories.length > 0) {
    console.log("Latest Story:", JSON.stringify(stories[0], null, 2));
  }
  process.exit(0);
}
checkDB().catch(console.error);

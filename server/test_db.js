const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://Telo1:Telo12@telo.dngot.mongodb.net/Twelo?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    const User = require('./models/User');
    const bots = await User.find({ ownedByAdmin: true });
    console.log('Bots count:', bots.length);
    const nonBots = await User.find({ ownedByAdmin: { $ne: true } });
    console.log('Non bots count:', nonBots.length);
    process.exit(0);
  }).catch(e => { console.log(e); process.exit(1); });

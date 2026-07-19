const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

function generateAvatarUrl(gender) {
  const seed = Math.random().toString(36).substring(7);
  const g = (gender || 'male').toLowerCase();
  if (g === 'female') {
     const femaleTops = ['longHair', 'longHairCurly', 'longHairStraight', 'longHairMiaWallace', 'longHairBob', 'hijab', 'longHairBigHair', 'longHairBun', 'longHairFro', 'longHairFroBand', 'longHairNotTooLong', 'longHairShavedSides', 'longHairStraight2', 'longHairStraightStrand'];
     const femaleClothes = ['blazerAndSweater', 'collarAndSweater', 'graphicShirt', 'shirtCrewNeck', 'shirtScoopNeck', 'shirtVNeck'];
     const top = femaleTops[Math.floor(Math.random() * femaleTops.length)];
     const clothes = femaleClothes[Math.floor(Math.random() * femaleClothes.length)];
     return `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}&top=${top}&clothes=${clothes}`;
  } else {
     const maleTops = ['shortHair', 'hat', 'turban', 'winterHat1', 'winterHat2', 'shortHairDreads01', 'shortHairShortFlat', 'shortHairShortRound', 'shortHairSides', 'shortHairTheCaesar', 'shortHairTheCaesarSidePart'];
     const maleClothes = ['hoodie', 'blazerAndShirt', 'shirtCrewNeck', 'shirtVNeck', 'collarAndSweater'];
     const top = maleTops[Math.floor(Math.random() * maleTops.length)];
     const clothes = maleClothes[Math.floor(Math.random() * maleClothes.length)];
     return `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}&top=${top}&clothes=${clothes}`;
  }
}

mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://twelodev:twelodev123@twelocluster.11a5v.mongodb.net/twelo_dashboard', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(async () => {
  const users = await User.find({});
  let count = 0;
  for (let u of users) {
    if (u.gender) {
       u.avatarUrl = generateAvatarUrl(u.gender);
       await u.save();
       count++;
    }
  }
  console.log('Updated avatars for ' + count + ' users');
  process.exit(0);
});

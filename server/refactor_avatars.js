const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'index.js');
let code = fs.readFileSync(filePath, 'utf8');

const generateFunc = `
function generateAvatarUrl(gender) {
  const seed = Math.random().toString(36).substring(7);
  const g = (gender || 'male').toLowerCase();
  if (g === 'female') {
     const femaleTops = ['longHair', 'longHairCurly', 'longHairStraight', 'longHairMiaWallace', 'longHairBob', 'hijab', 'longHairBigHair', 'longHairBun', 'longHairFro', 'longHairFroBand', 'longHairNotTooLong', 'longHairShavedSides', 'longHairStraight2', 'longHairStraightStrand'];
     const femaleClothes = ['blazerAndSweater', 'collarAndSweater', 'graphicShirt', 'shirtCrewNeck', 'shirtScoopNeck', 'shirtVNeck'];
     const top = femaleTops[Math.floor(Math.random() * femaleTops.length)];
     const clothes = femaleClothes[Math.floor(Math.random() * femaleClothes.length)];
     return \`https://api.dicebear.com/9.x/avataaars/svg?seed=\${seed}&top=\${top}&clothes=\${clothes}\`;
  } else {
     const maleTops = ['shortHair', 'hat', 'turban', 'winterHat1', 'winterHat2', 'shortHairDreads01', 'shortHairShortFlat', 'shortHairShortRound', 'shortHairSides', 'shortHairTheCaesar', 'shortHairTheCaesarSidePart'];
     const maleClothes = ['hoodie', 'blazerAndShirt', 'shirtCrewNeck', 'shirtVNeck', 'collarAndSweater'];
     const top = maleTops[Math.floor(Math.random() * maleTops.length)];
     const clothes = maleClothes[Math.floor(Math.random() * maleClothes.length)];
     return \`https://api.dicebear.com/9.x/avataaars/svg?seed=\${seed}&top=\${top}&clothes=\${clothes}\`;
  }
}
`;

if (!code.includes('function generateAvatarUrl')) {
  code = code.replace('const User = require(', generateFunc + '\nconst User = require(');
}

// Block 1 (registration)
code = code.replace(/if \(gender\.toLowerCase\(\) === 'male'\) \{[\s\S]*?avatarUrl = `https:\/\/api\.dicebear\.com\/9\.x\/avataaars\/svg\?seed=\$\{seed\}&top=\$\{top\}&clothes=\$\{clothes\}`;[\s\n]*\}/, 'avatarUrl = generateAvatarUrl(gender);');
code = code.replace(/let avatarUrl = "";[\s\n]*const seed = Math\.random\(\)\.toString\(36\)\.substring\(7\);/, 'let avatarUrl = "";');

// Block 2 (profile)
code = code.replace(/const g = \(user\.gender \|\| 'male'\)\.toLowerCase\(\);[\s\n]*const seed = Math\.random\(\)\.toString\(36\)\.substring\(7\);[\s\n]*if \(g === 'male'\) \{[\s\S]*?user\.avatarUrl = `https:\/\/api\.dicebear\.com\/9\.x\/avataaars\/svg\?seed=\$\{seed\}&top=\$\{top\}&clothes=\$\{clothes\}`;[\s\n]*\} else \{[\s\S]*?user\.avatarUrl = `https:\/\/api\.dicebear\.com\/9\.x\/avataaars\/svg\?seed=\$\{seed\}&top=\$\{top\}&clothes=\$\{clothes\}`;[\s\n]*\}/g, 'user.avatarUrl = generateAvatarUrl(user.gender);');

// Block 3 (public profile id)
code = code.replace(/const g = \(user\.gender \|\| 'male'\)\.toLowerCase\(\);[\s\n]*const seed = Math\.random\(\)\.toString\(36\)\.substring\(7\);[\s\n]*if \(g === 'male'\) \{[\s\S]*?user\.avatarUrl = `https:\/\/api\.dicebear\.com\/9\.x\/avataaars\/svg\?seed=\$\{seed\}&top=\$\{top\}&clothes=\$\{clothes\}`;[\s\n]*\} else \{[\s\S]*?user\.avatarUrl = `https:\/\/api\.dicebear\.com\/9\.x\/avataaars\/svg\?seed=\$\{seed\}&top=\$\{top\}&clothes=\$\{clothes\}`;[\s\n]*\}/g, 'user.avatarUrl = generateAvatarUrl(user.gender);');

// Block 4 (chat rooms)
code = code.replace(/const g = \(u\.gender \|\| 'male'\)\.toLowerCase\(\);[\s\n]*const seed = Math\.random\(\)\.toString\(36\)\.substring\(7\);[\s\n]*if \(g === 'male'\) \{[\s\S]*?u\.avatarUrl = `https:\/\/api\.dicebear\.com\/9\.x\/avataaars\/svg\?seed=\$\{seed\}&top=\$\{top\}&clothes=\$\{clothes\}`;[\s\n]*\} else \{[\s\S]*?u\.avatarUrl = `https:\/\/api\.dicebear\.com\/9\.x\/avataaars\/svg\?seed=\$\{seed\}&top=\$\{top\}&clothes=\$\{clothes\}`;[\s\n]*\}/g, 'u.avatarUrl = generateAvatarUrl(u.gender);');

fs.writeFileSync(filePath, code, 'utf8');
console.log('Refactored server/index.js successfully!');

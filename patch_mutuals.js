const fs = require('fs');
let code = fs.readFileSync('server/index.js', 'utf8');

const target = /\/\/ DEMO OVERRIDE: If no mutuals exist, just show random followers so user can test the UI\s+if \(mutualIds\.length === 0 && targetFollowersIds\.length > 0\) \{\s+mutualIds\.push\(\.\.\.targetFollowersIds\.slice\(0, Math\.min\(3, targetFollowersIds\.length\)\)\);\s+\}/g;

const replacement = `// DEMO OVERRIDE: Simulate mutuals for testing even for old users with 0 followers
        if (mutualIds.length === 0) {
          if (targetFollowersIds.length > 0) {
            mutualIds.push(...targetFollowersIds.slice(0, Math.min(3, targetFollowersIds.length)));
          } else {
            const randomUsers = await User.aggregate([ { $sample: { size: 3 } } ]);
            mutualIds.push(...randomUsers.map(u => u._id.toString()));
          }
        }`;

code = code.replace(target, replacement);
fs.writeFileSync('server/index.js', code);

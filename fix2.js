const fs = require('fs');
let code = fs.readFileSync('client/src/components/Dashboard.jsx', 'utf8');

code = code.replace(
    /onClick=\{\(\) => setSelectedMsgId\(prev => prev === msg\._id \? null : msg\._id\)\}\s*>/g,
    "onClick={() => setSelectedMsgId(prev => prev === msg._id ? null : msg._id)}>\n                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: msg.sender === user.id ? 'flex-end' : 'flex-start', maxWidth: '100%' }}>"
);

// We need to close this new div AFTER the Seen status.
// Wait, the previous replacement ALREADY moved the Seen text and closed a div...
// Let's restore and do it properly in one go to avoid messing up.

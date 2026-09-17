const fs = require('fs');
const p = 'C:/Users/DELL/.gemini/antigravity-ide/scratch/twelo/client/src/components/Dashboard.jsx';
let c = fs.readFileSync(p, 'utf8');
c = c.replace(/borderBottom:\s*'1px solid #1a1a1a'/g, "borderBottom: '1px solid var(--border-color)'");
fs.writeFileSync(p, c);

const p2 = 'C:/Users/DELL/.gemini/antigravity-ide/scratch/twelo/client/src/index.css';
let c2 = fs.readFileSync(p2, 'utf8');
c2 = c2.replace(/border-bottom:\s*1px solid #1a1a1a;/g, "border-bottom: 1px solid var(--border-color);");
fs.writeFileSync(p2, c2);

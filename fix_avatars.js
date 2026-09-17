const fs = require('fs'); 
const path = 'C:/Users/DELL/.gemini/antigravity-ide/scratch/twelo/client/src/components/Dashboard.jsx'; 
let content = fs.readFileSync(path, 'utf8'); 
content = content.replace(/background:\s*'#333'/g, "background: 'var(--insta-gradient)'"); 
fs.writeFileSync(path, content);

const fs = require('fs');
let code = fs.readFileSync('client/src/components/Dashboard.jsx', 'utf8');

const target2 = `              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>`;

const highlightBtn = `              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                <button 
                  style={{ background: 'none', border: 'none', cursor: 'pointer', zIndex: 15, display: 'flex', alignItems: 'center', marginRight: '15px' }}
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      const res = await fetch(\`\${API_URL}/api/stories/\${story._id}/highlight\`, {
                        method: 'POST',
                        headers: { 'Authorization': \`Bearer \${token}\` }
                      });
                      if (res.ok) {
                        const data = await res.json();
                        alert(data.message);
                      }
                    } catch(e) { console.error(e); }
                  }}
                >
                  <span style={{ fontSize: '1.2rem', color: '#ffd700' }}>⭐</span>
                  <span style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 'bold', marginLeft: '5px' }}>
                    Highlight
                  </span>
                </button>`;

code = code.replace(target2, highlightBtn);
fs.writeFileSync('client/src/components/Dashboard.jsx', code);

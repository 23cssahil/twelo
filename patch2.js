const fs = require('fs');
let code = fs.readFileSync('client/src/components/Dashboard.jsx', 'utf8');

const target1 = '                {publicProfileData.globalStories && publicProfileData.globalStories.length > 0 && (\n                  <div style={{ marginTop: \'20px\', width: \'100%\' }}>\n                    <h3 style={{ fontSize: \'1.1rem\', marginBottom: \'10px\' }}>Global Stories</h3>';

const highlightUI = `
                {/* Highlights Section */}
                {publicProfileData.highlights && publicProfileData.highlights.length > 0 && (
                  <div style={{ marginTop: '20px', width: '100%' }}>
                    <div style={{ display: 'flex', overflowX: 'auto', gap: '15px', paddingBottom: '10px' }} className="hide-scrollbar">
                      {publicProfileData.highlights.map((highlight, index) => (
                        <div 
                          key={highlight._id}
                          onClick={() => {
                            setProfileStoryGroups([{
                              user: {
                                _id: publicProfileData._id,
                                username: publicProfileData.username,
                                avatarUrl: publicProfileData.avatarUrl
                              },
                              stories: publicProfileData.highlights
                            }]);
                            setActiveTab('profile-stories');
                            setCurrentStoryUserIndex(0);
                            setCurrentStoryIndex(index);
                            setStoryViewerActive(true);
                          }}
                          style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', flexShrink: 0
                          }}
                        >
                          <div style={{
                            width: '64px', height: '64px', borderRadius: '50%',
                            padding: '2px', background: '#333', border: '1px solid #555',
                            display: 'flex', justifyContent: 'center', alignItems: 'center'
                          }}>
                            {highlight.mediaType === 'video' ? (
                              <video src={highlight.mediaUrl} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                              <img src={highlight.mediaUrl} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                            )}
                          </div>
                          <span style={{ fontSize: '0.75rem', marginTop: '5px', color: '#ccc' }}>Highlight</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
`;

code = code.split(target1).join(highlightUI + '\n' + target1);
fs.writeFileSync('client/src/components/Dashboard.jsx', code);

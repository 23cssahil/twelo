import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Trash2, Bot, Lock, List, Plus } from 'lucide-react';
import './BotTrainingAdmin.css';

export default function BotTrainingAdmin() {
  const { API_URL } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showExistingRules, setShowExistingRules] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [botRules, setBotRules] = useState([]);
  const [newRule, setNewRule] = useState({
    triggers: '',
    responses: '',
    followUps: '',
    followUpResponses: '',
    disableFollowUpOnRepeat: false,
    gender: 'both',
    action: 'continue',
    isConsistent: true,
    responseMode: 'random'
  });

  const fetchBotRules = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/bot-rules`, { headers: { 'x-admin-pass': password } });
      if (res.ok) setBotRules(await res.json());
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchBotRules();
    }
  }, [isAuthenticated]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === 'twelo-admin-6006390989') {
      setIsAuthenticated(true);
    } else {
      alert('Incorrect password');
    }
  };

  const handleCreateBotRule = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        userMessageTriggers: newRule.triggers.split(',').map(t => t.trim()).filter(Boolean),
        botResponses: newRule.responses.split('|').map(t => t.trim()).filter(Boolean),
        botFollowUps: newRule.followUps ? newRule.followUps.split('|').map(t => t.trim()).filter(Boolean) : [],
        botFollowUpResponses: newRule.followUpResponses ? newRule.followUpResponses.split('|').map(t => t.trim()).filter(Boolean) : [],
        disableFollowUpOnRepeat: newRule.disableFollowUpOnRepeat,
        botGender: newRule.gender,
        action: newRule.action,
        isConsistent: newRule.isConsistent,
        responseMode: newRule.responseMode
      };
      const res = await fetch(`${API_URL}/api/admin/bot-rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-pass': password },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setNewRule({ triggers: '', responses: '', followUps: '', followUpResponses: '', disableFollowUpOnRepeat: false, gender: 'both', action: 'continue', isConsistent: true, responseMode: 'random' });
        fetchBotRules();
      }
    } catch (err) { console.error(err); }
  };

  const handleDeleteBotRule = async (id) => {
    if (!window.confirm("Are you sure you want to delete this bot rule?")) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/bot-rules/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-pass': password }
      });
      if (res.ok) fetchBotRules();
    } catch (err) { console.error(err); }
  };

  if (!isAuthenticated) {
    return (
      <div className="dev-auth-container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}>
        <div className="dev-auth-card" style={{ background: '#111', padding: '40px', borderRadius: '12px', border: '1px solid #333', textAlign: 'center', width: '100%', maxWidth: '400px' }}>
          <Lock size={48} color="#0095f6" style={{ marginBottom: '20px' }} />
          <h2 style={{ marginBottom: '5px', color: '#fff' }}>Twelo Bot Training</h2>
          <p style={{ color: '#888', marginBottom: '20px', fontSize: '0.9rem' }}>Admin Access Only</p>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input 
              type="password" 
              placeholder="Enter Admin Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="dev-input"
              style={{ width: '100%', padding: '12px', background: '#050505', border: '1px solid #333', color: '#fff', borderRadius: '8px', boxSizing: 'border-box' }}
            />
            <button type="submit" className="bot-btn-submit">Access Training</button>
          </form>
          <button onClick={() => navigate(-1)} style={{ marginTop: '20px', background: 'transparent', border: 'none', color: '#888', cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bot-training-container">
      <div className="bot-training-header">
        <h1><Bot size={28} color="#0095f6" /> AI Bot Training Center</h1>
        <Link to="/admin" className="bot-training-back">
          <ArrowLeft size={18} /> Back to Dashboard
        </Link>
      </div>

      <div className="bot-manual">
        <div style={{ padding: '20px' }}>
          <h2>📖 Training Manual (Kaise Use Karein)</h2>
          <ul>
            <li><strong>Triggers (User kya puchega):</strong> Yahan wo saare words ya sentences daalein jo user puch sakta hai. Ek se zyada tarike comma (,) lagakar daalein. (Jaise: <code>name kya hai, naam batao, who are you</code>)</li>
            <li><strong>Bot's Responses (Bot kya bolega):</strong> Bot ka reply yahan set karein. Agar aap chahte hain ki bot har baar alag reply de (randomness), toh multiple replies ko pipe (|) symbol se alag karein. (Jaise: <code>Mera naam Sahil hai | Main Rohan hu</code>)</li>
            <li><strong>Follow-up (Bot ka next sawaal):</strong> Reply dene ke baad bot kya puchega? Ise blank bhi chhod sakte hain. Multiple options yahan bhi pipe (|) se set kar sakte hain. (Jaise: <code>Aap batao? | Tumhara kya naam hai?</code>)</li>
            <li><strong>Consistency:</strong> Agar bot ne ek chat me khud ka naam "Sahil" pick kar liya, toh ussi user se ussi chat me baar baar puchne par wo "Sahil" hi yaad rakhega. Nayi chat me random dusra naam lega.</li>
            <li><strong>Gender Logic:</strong> "Female Bot Only" select karenge toh ye rule sirf tab kaam karega jab koi Male user chat kar raha ho (kyunki usko Female bot milti hai).</li>
            <li><strong>Disconnect Action:</strong> Aap chat end karne ke 2 options chun sakte hain:
              <br />- <em>Disconnect after reply:</em> Bot pehle reply aur follow-up bhejega, uske baad 2 second me room disconnect karega.
              <br />- <em>Disconnect immediately:</em> Jaise hi user trigger message bhejega, bot bina koi reply bheje user message ki length ke hisaab se (read delay) + 2 second ke baad room disconnect kar dega.
            </li>
          </ul>
        </div>
      </div>

      <div className="bot-training-grid" style={{ display: 'block' }}>
        {!showExistingRules ? (
          <div className="bot-training-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>Create New Rule</h2>
              <button type="button" onClick={() => setShowExistingRules(true)} className="bot-btn-submit" style={{ width: 'auto', padding: '8px 16px', background: '#333', margin: 0, display: 'flex', alignItems: 'center' }}>
                <List size={16} style={{ marginRight: '8px' }} /> View Existing Rules ({botRules.length})
              </button>
            </div>
            <form onSubmit={handleCreateBotRule}>
            <div className="form-group">
              <label>User's Message Triggers (comma-separated):</label>
              <input type="text" placeholder="e.g. name kya hai, naam batao, who are you" value={newRule.triggers} onChange={e => setNewRule({...newRule, triggers: e.target.value})} required />
            </div>
            
            <div className="form-group">
              <label>Bot's Responses (separated by | for random options):</label>
              <input type="text" placeholder="e.g. Mera naam Sahil hai | Main Rohan hu" value={newRule.responses} onChange={e => setNewRule({...newRule, responses: e.target.value})} required />
            </div>
            
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                <label style={{ margin: 0 }}>Bot's Follow-up Question (optional, separated by |):</label>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <input type="checkbox" id="disableFollowUp" checked={newRule.disableFollowUpOnRepeat} onChange={e => setNewRule({...newRule, disableFollowUpOnRepeat: e.target.checked})} style={{ width: 'auto', marginRight: '5px' }} />
                  <label htmlFor="disableFollowUp" style={{ margin: 0, fontSize: '0.85em', cursor: 'pointer', fontWeight: 'normal' }}>Disable on repeat</label>
                </div>
              </div>
              <input type="text" placeholder="e.g. Aap batao? | Tumhara kya hai?" value={newRule.followUps} onChange={e => setNewRule({...newRule, followUps: e.target.value})} />
            </div>
            
            <div className="form-group">
              <label>Bot's Reaction to Follow-up Answer (optional, separated by |):</label>
              <input type="text" placeholder="e.g. Achha name hai | Nice | Sahi hai" value={newRule.followUpResponses} onChange={e => setNewRule({...newRule, followUpResponses: e.target.value})} />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Response Mode:</label>
                <select value={newRule.responseMode} onChange={e => setNewRule({...newRule, responseMode: e.target.value})}>
                  <option value="random">Random (Pick randomly)</option>
                  <option value="sequential">Sequential (Match trigger index to response index)</option>
                </select>
              </div>
              
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', marginTop: '25px' }}>
                <input type="checkbox" id="isConsistent" checked={newRule.isConsistent} onChange={e => setNewRule({...newRule, isConsistent: e.target.checked})} style={{ width: 'auto', marginRight: '8px' }} />
                <label htmlFor="isConsistent" style={{ margin: 0, cursor: 'pointer' }}>Consistent in same chat</label>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Target Bot Gender:</label>
                <select value={newRule.gender} onChange={e => setNewRule({...newRule, gender: e.target.value})}>
                  <option value="both">Both (Male & Female Bots)</option>
                  <option value="male">Male Bot Only (talks to Female)</option>
                  <option value="female">Female Bot Only (talks to Male)</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Action after reply:</label>
                <select value={newRule.action} onChange={e => setNewRule({...newRule, action: e.target.value})}>
                  <option value="continue">Continue Chat</option>
                  <option value="disconnect">Disconnect after reply</option>
                  <option value="disconnect_immediately">Disconnect immediately (no reply)</option>
                </select>
              </div>
            </div>
            
            <button type="submit" className="bot-btn-submit" style={{ marginTop: '10px' }}>Save Rule</button>
            </form>
          </div>
        ) : (
          <div className="bot-training-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h2 style={{ margin: 0 }}>Existing Rules ({botRules.length})</h2>
              <button type="button" onClick={() => setShowExistingRules(false)} className="bot-btn-submit" style={{ width: 'auto', padding: '8px 16px', background: '#0095f6', margin: 0, display: 'flex', alignItems: 'center' }}>
                <Plus size={16} style={{ marginRight: '8px' }} /> Create New Rule
              </button>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <input 
                type="text" 
                placeholder="Search by Trigger, Response, or Follow-up..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid #333', background: '#1a1a1a', color: '#fff', fontSize: '0.95rem' }}
              />
            </div>
            
            <div className="bot-rules-list" style={{ maxHeight: '650px', overflowY: 'auto', paddingRight: '15px' }}>
            {botRules.length === 0 ? (
              <div className="empty-rules">No rules found. Start training your bot by adding a rule!</div>
            ) : (
              botRules.filter(rule => {
                if (!searchQuery) return true;
                const q = searchQuery.toLowerCase();
                return (
                  rule.userMessageTriggers.some(t => t.toLowerCase().includes(q)) ||
                  rule.botResponses.some(r => r.toLowerCase().includes(q)) ||
                  (rule.botFollowUps && rule.botFollowUps.some(f => f.toLowerCase().includes(q)))
                );
              }).map(rule => (
                <div key={rule._id} className={`bot-rule-item ${rule.action === 'disconnect' ? 'disconnect' : ''}`}>
                  <div className="bot-rule-content">
                    <p><strong>Triggers:</strong> {rule.userMessageTriggers.join(', ')}</p>
                    <p><strong>Responses:</strong> {rule.botResponses.join(' | ')}</p>
                    {rule.botFollowUps && rule.botFollowUps.length > 0 && <p><strong>Follow-ups:</strong> {rule.botFollowUps.join(' | ')}</p>}
                    {rule.botFollowUpResponses && rule.botFollowUpResponses.length > 0 && <p><strong>Reactions:</strong> {rule.botFollowUpResponses.join(' | ')}</p>}
                    
                    <div className="bot-rule-meta">
                      <span className="meta-badge">Bot: {rule.botGender}</span>
                      <span className="meta-badge">Action: {rule.action}</span>
                      <span className="meta-badge">{rule.responseMode}</span>
                      <span className="meta-badge">{rule.isConsistent ? 'Consistent' : 'Varying'}</span>
                      {rule.disableFollowUpOnRepeat && <span className="meta-badge" style={{background: '#6c757d'}}>No Repeat Follow-up</span>}
                    </div>
                  </div>
                  <button onClick={() => handleDeleteBotRule(rule._id)} className="bot-btn-delete" title="Delete Rule">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))
            )}
          </div>
          </div>
        )}
      </div>
    </div>
  );
}

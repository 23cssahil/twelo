import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import { useNavigate } from 'react-router-dom';
import { Users, Search, Ban, Send, Lock, Globe, MessageSquare, AlertTriangle } from 'lucide-react';
import './DeveloperAdmin.css';

export default function DeveloperAdmin() {
  const { API_URL } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const [stats, setStats] = useState({ activeUsers: 0, randomRooms: 0, queuedRandom: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [broadcastMessage, setBroadcastMessage] = useState('');

  // Focus input on load
  useEffect(() => {
    if (isAuthenticated) {
      fetchStats();
      const interval = setInterval(fetchStats, 10000); // Poll every 10s
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === 'twelo-admin-6006390989') {
      setIsAuthenticated(true);
    } else {
      alert('Incorrect Developer Password');
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/stats`, {
        headers: { 'x-admin-pass': password }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/users?q=${encodeURIComponent(searchQuery)}`, {
        headers: { 'x-admin-pass': password }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBlockUser = async (userId, isCurrentlyBlocked) => {
    const confirmMessage = isCurrentlyBlocked 
      ? "Are you sure you want to unblock this user?" 
      : "Are you sure you want to block this user? They will be force logged out immediately.";
    
    if (!window.confirm(confirmMessage)) return;

    try {
      const res = await fetch(`${API_URL}/api/admin/block`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pass': password
        },
        body: JSON.stringify({ userId, isBlocked: !isCurrentlyBlocked })
      });
      
      if (res.ok) {
        const data = await res.json();
        setUsers(users.map(u => u._id === userId ? { ...u, isBlocked: data.isBlocked } : u));
        alert(data.isBlocked ? 'User Blocked Successfully' : 'User Unblocked Successfully');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update block status');
    }
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;
    
    if (!window.confirm("Send this message to ALL online users globally?")) return;

    try {
      const res = await fetch(`${API_URL}/api/admin/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pass': password
        },
        body: JSON.stringify({ message: broadcastMessage })
      });
      
      if (res.ok) {
        setBroadcastMessage('');
        alert('Broadcast sent globally!');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to send broadcast');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="dev-auth-container">
        <div className="dev-auth-card">
          <Lock size={48} color="#0095f6" style={{ marginBottom: '20px' }} />
          <h2 style={{ marginBottom: '5px', color: '#fff' }}>Twelo Developer Mode</h2>
          <p style={{ color: '#888', marginBottom: '20px', fontSize: '0.9rem' }}>Restricted Access Area</p>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input
              type="password"
              placeholder="Enter Developer Key"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="dev-input"
              autoFocus
            />
            <button type="submit" className="dev-btn-primary">Authenticate</button>
          </form>
          <button onClick={() => navigate('/')} className="dev-btn-secondary" style={{ marginTop: '15px', width: '100%' }}>Return to App</button>
        </div>
      </div>
    );
  }

  return (
    <div className="dev-dashboard">
      <div className="dev-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertTriangle color="#ff4b4b" />
          <h2 style={{ color: '#fff' }}>Twelo Developer Admin</h2>
        </div>
        <button onClick={() => navigate('/')} className="dev-btn-secondary">Exit Admin</button>
      </div>

      <div className="dev-content">
        {/* Stats Section */}
        <div className="dev-stats-grid">
          <div className="dev-stat-card">
            <Users size={32} color="#0095f6" />
            <div className="stat-info">
              <h3>{stats.activeUsers}</h3>
              <p>Active Users Online</p>
            </div>
          </div>
          <div className="dev-stat-card">
            <Globe size={32} color="#10b981" />
            <div className="stat-info">
              <h3>{stats.randomRooms}</h3>
              <p>Active Random Rooms</p>
            </div>
          </div>
          <div className="dev-stat-card">
            <MessageSquare size={32} color="#f59e0b" />
            <div className="stat-info">
              <h3>{stats.queuedRandom}</h3>
              <p>Users in Queue</p>
            </div>
          </div>
        </div>

        {/* Action Grid */}
        <div className="dev-action-grid">
          {/* Global Broadcast */}
          <div className="dev-panel">
            <h3><Send size={18} style={{ marginRight: '8px' }}/> Global Broadcast</h3>
            <p className="panel-desc">Send a real-time notification to all connected users.</p>
            <form onSubmit={handleBroadcast} style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
              <input 
                type="text" 
                placeholder="Type system alert..."
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                className="dev-input"
                style={{ flex: 1 }}
              />
              <button type="submit" className="dev-btn-primary" style={{ background: '#f59e0b', color: '#000' }}>Broadcast</button>
            </form>
          </div>

          {/* User Management */}
          <div className="dev-panel" style={{ gridColumn: '1 / -1' }}>
            <h3><Search size={18} style={{ marginRight: '8px' }}/> User Database Management</h3>
            <p className="panel-desc">Search by name, username, email, or Google ID</p>
            
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', marginTop: '15px', marginBottom: '20px' }}>
              <input 
                type="text" 
                placeholder="Search database..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="dev-input"
                style={{ flex: 1 }}
              />
              <button type="submit" className="dev-btn-primary">Search</button>
            </form>

            <div className="dev-user-list">
              {users.map(u => (
                <div key={u._id} className="dev-user-card">
                  <div className="user-details">
                    <img src={u.avatarUrl} alt="avatar" className="dev-avatar" />
                    <div>
                      <div className="dev-username">{u.name} <span style={{ color: '#888', fontWeight: 'normal' }}>@{u.username}</span></div>
                      <div className="dev-user-meta"><strong>ID:</strong> {u.uniqueId} | <strong>Email:</strong> {u.email}</div>
                      <div className="dev-user-meta"><strong>Google ID:</strong> {u.googleId}</div>
                      <div className="dev-user-meta"><strong>Gender:</strong> {u.gender} | <strong>Age:</strong> {u.age} | <strong>Country:</strong> {u.country}</div>
                      <div className="dev-user-meta"><strong>Coins:</strong> {u.coins} | <strong>Status:</strong> {u.isBlocked ? <span style={{color: '#ff4b4b'}}>Blocked</span> : <span style={{color: '#10b981'}}>Active</span>}</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleBlockUser(u._id, u.isBlocked)}
                    className={`dev-btn-${u.isBlocked ? 'secondary' : 'danger'}`}
                  >
                    <Ban size={16} style={{ marginRight: '5px' }} />
                    {u.isBlocked ? 'Unblock' : 'Block User'}
                  </button>
                </div>
              ))}
              {users.length === 0 && searchQuery && (
                <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>No users found matching "{searchQuery}"</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

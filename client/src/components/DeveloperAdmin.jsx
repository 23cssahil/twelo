import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import { useNavigate } from 'react-router-dom';
import { Users, Search, Ban, Send, Lock, Globe, MessageSquare, AlertTriangle, Trash2, Filter, RefreshCcw, Flag, X, CheckCircle } from 'lucide-react';
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
  const [showBlockedOnly, setShowBlockedOnly] = useState(false);

  const [activeTab, setActiveTab] = useState('users');
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);

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

  const handleLoadAll = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/users`, {
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

  const fetchReports = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/reports`, {
        headers: { 'x-admin-pass': password }
      });
      if (res.ok) {
        const data = await res.json();
        setReports(data);
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

  const handleFlushQueue = async () => {
    if (!window.confirm("Are you sure you want to flush the random chat queue? This will drop everyone waiting.")) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/clear-queue`, {
        method: 'POST',
        headers: { 'x-admin-pass': password }
      });
      if (res.ok) {
        alert('Queue flushed successfully!');
        fetchStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`DANGER: Are you absolutely sure you want to PERMANENTLY DELETE @${username}? This action cannot be undone.`)) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/delete-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pass': password
        },
        body: JSON.stringify({ userId })
      });
      
      if (res.ok) {
        setUsers(users.filter(u => u._id !== userId));
        alert('User account permanently deleted.');
        fetchStats();
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete user');
    }
  };

  const handlePersonalNotification = async (userId, username) => {
    const msg = window.prompt(`Enter message to send directly to @${username}'s notifications:`);
    if (!msg || !msg.trim()) return;
    
    try {
      const res = await fetch(`${API_URL}/api/admin/notify-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pass': password
        },
        body: JSON.stringify({ userId, message: msg.trim() })
      });
      
      if (res.ok) {
        alert('Personal notification sent successfully!');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to send personal notification');
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

  const handleResolveReport = async (reportId) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/reports/${reportId}/resolve`, {
        method: 'POST',
        headers: { 'x-admin-pass': password }
      });
      if (res.ok) {
        setReports(reports.filter(r => r._id !== reportId));
        setSelectedReport(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

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
            <button 
              onClick={handleFlushQueue} 
              className="dev-btn-secondary" 
              style={{ marginLeft: 'auto', padding: '5px 10px', fontSize: '0.8rem' }}
              title="Clear entire queue"
            >
              <RefreshCcw size={14} />
            </button>
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
            <div className="dev-main">
              <div className="dev-tabs" style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                <button 
                  onClick={() => setActiveTab('users')} 
                  className={`dev-btn-${activeTab === 'users' ? 'primary' : 'secondary'}`}
                >
                  <Users size={16} style={{ marginRight: '8px' }} />
                  User Database
                </button>
                <button 
                  onClick={() => { setActiveTab('reports'); fetchReports(); }} 
                  className={`dev-btn-${activeTab === 'reports' ? 'primary' : 'secondary'}`}
                  style={{ position: 'relative' }}
                >
                  <Flag size={16} style={{ marginRight: '8px' }} />
                  User Reports
                  {reports.length > 0 && <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ff4b4b', color: 'white', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '10px' }}>{reports.length}</span>}
                </button>
              </div>

              {activeTab === 'users' ? (
                <>
                  <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                    <input 
                      type="text" 
                      placeholder="Search database..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="dev-input"
                      style={{ flex: 1 }}
                    />
                    <button type="submit" className="dev-btn-primary">Search</button>
                    <button type="button" onClick={handleLoadAll} className="dev-btn-secondary" style={{ backgroundColor: '#222' }}>Load All Users</button>
                    <button 
                      type="button" 
                      onClick={() => setShowBlockedOnly(!showBlockedOnly)} 
                      className="dev-btn-secondary" 
                      style={{ backgroundColor: showBlockedOnly ? 'rgba(255, 75, 75, 0.2)' : 'transparent', border: showBlockedOnly ? '1px solid rgba(255, 75, 75, 0.5)' : '' }}
                    >
                      <Filter size={16} style={{ marginRight: '5px' }} />
                      Blocked Only
                    </button>
                  </form>

                  <div className="dev-user-list">
                    {users.filter(u => showBlockedOnly ? u.isBlocked : true).map(u => (
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
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button 
                            onClick={() => handlePersonalNotification(u._id, u.username)}
                            className="dev-btn-secondary"
                            style={{ background: '#222', color: '#fff', border: '1px solid #333' }}
                          >
                            <Send size={16} style={{ marginRight: '5px' }} />
                            Send Alert
                          </button>
                          <button 
                            onClick={() => handleBlockUser(u._id, u.isBlocked)}
                            className={`dev-btn-${u.isBlocked ? 'secondary' : 'danger'}`}
                          >
                            <Ban size={16} style={{ marginRight: '5px' }} />
                            {u.isBlocked ? 'Unblock' : 'Block User'}
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(u._id, u.username)}
                            className="dev-btn-danger"
                            style={{ background: '#ff4b4b', color: '#fff', padding: '8px 12px' }}
                            title="Permanently Delete User"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {users.length === 0 && searchQuery && (
                      <div style={{ textAlign: 'center', color: '#a8a8a8', marginTop: '20px' }}>No users found for "{searchQuery}"</div>
                    )}
                  </div>
                </>
              ) : (
                <div className="dev-reports-list" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {reports.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#a8a8a8', marginTop: '20px' }}>No pending reports. Great job!</div>
                  ) : (
                    reports.map(report => (
                      <div key={report._id} className="dev-user-card" style={{ borderLeft: '4px solid #ff4b4b' }}>
                        <div className="user-details" style={{ flex: 1 }}>
                          <div className="dev-user-info">
                            <h3>Reported User: @{report.reportedUsername}</h3>
                            <div className="dev-user-meta" style={{ color: '#ff4b4b', fontWeight: 'bold' }}>Reason: {report.reason}</div>
                            <div className="dev-user-meta" style={{ fontSize: '0.8rem' }}>Reported by: @{report.reporterUsername} | {new Date(report.createdAt).toLocaleString()}</div>
                          </div>
                        </div>
                        <button 
                          onClick={() => setSelectedReport(report)}
                          className="dev-btn-primary"
                        >
                          <Search size={16} style={{ marginRight: '5px' }} />
                          Investigate
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedReport && (
        <div className="modal-overlay" onClick={() => setSelectedReport(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>Investigation: @{selectedReport.reportedUsername}</h2>
              <button className="icon-btn" onClick={() => setSelectedReport(null)}><X size={24} /></button>
            </div>
            <div style={{ padding: '20px 0' }}>
              <h3 style={{ color: '#f59e0b', marginBottom: '10px' }}>Reason: {selectedReport.reason}</h3>
              <p style={{ color: '#a8a8a8', fontSize: '0.9rem', marginBottom: '10px' }}>Reporter: @{selectedReport.reporterUsername}</p>
              
              <div style={{ background: '#111', padding: '15px', borderRadius: '8px', maxHeight: '300px', overflowY: 'auto', border: '1px solid #333', marginBottom: '20px', fontFamily: 'monospace', whiteSpace: 'pre-wrap', color: '#ccc' }}>
                {selectedReport.chatContext || "No chat context provided."}
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button 
                  onClick={() => handlePersonalNotification(selectedReport.reportedUserId, selectedReport.reportedUsername)}
                  className="dev-btn-secondary"
                  style={{ background: '#222' }}
                >
                  <AlertTriangle size={16} style={{ marginRight: '5px' }} />
                  Send Warning
                </button>
                <button 
                  onClick={() => handleBlockUser(selectedReport.reportedUserId, false)}
                  className="dev-btn-danger"
                >
                  <Ban size={16} style={{ marginRight: '5px' }} />
                  Block User
                </button>
                <button 
                  onClick={() => handleResolveReport(selectedReport._id)}
                  className="dev-btn-primary"
                  style={{ background: '#10b981' }}
                >
                  <CheckCircle size={16} style={{ marginRight: '5px' }} />
                  Mark as Resolved
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

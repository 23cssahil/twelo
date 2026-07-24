import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../App';
import { useNavigate, Link } from 'react-router-dom';
import io from 'socket.io-client';
import { Users, Search, Ban, Send, Lock, Globe, MessageSquare, AlertTriangle, Trash2, Filter, RefreshCcw, Flag, X, CheckCircle, BarChart2 } from 'lucide-react';
import './DeveloperAdmin.css';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function DeveloperAdmin() {
  const { API_URL } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [adminSocket, setAdminSocket] = useState(null);
  
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const [stats, setStats] = useState({ activeUsers: 0, randomRooms: 0, queuedRandom: 0 });
  const [analyticsData, setAnalyticsData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [showBlockedOnly, setShowBlockedOnly] = useState(false);

  const [activeTab, setActiveTab] = useState('users');
  const [growthTimeframe, setGrowthTimeframe] = useState('monthly');
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);

  const [chatViewTarget, setChatViewTarget] = useState(null);
  const [selectedUserChats, setSelectedUserChats] = useState(null);
  const [isFetchingChats, setIsFetchingChats] = useState(false);

  const [incomingRandom, setIncomingRandom] = useState(null);
  const [activeRandomChat, setActiveRandomChat] = useState(null);
  const activeRandomChatRef = React.useRef(activeRandomChat);
  const [randomMessages, setRandomMessages] = useState([]);
  const [randomMessageInput, setRandomMessageInput] = useState('');

  const [globeStatus, setGlobeStatus] = useState({ isEnabled: true, customMessage: 'Globe is currently offline.', enableAt: null });
  const [globeTimerMinutes, setGlobeTimerMinutes] = useState('');

  // Sync ref with state
  useEffect(() => {
    activeRandomChatRef.current = activeRandomChat;
  }, [activeRandomChat]);

  const [botRequests, setBotRequests] = useState([]);
  const [botChats, setBotChats] = useState([]);
  const [selectedBotChat, setSelectedBotChat] = useState(null);
  const selectedBotChatRef = useRef(null);
  const botMessagesEndRef = useRef(null);
  const [unreadBotChats, setUnreadBotChats] = useState(new Set());
  const [botChatMessages, setBotChatMessages] = useState([]);
  const [botChatMessageInput, setBotChatMessageInput] = useState('');

  useEffect(() => {
    selectedBotChatRef.current = selectedBotChat;
  }, [selectedBotChat]);

  useEffect(() => {
    if (botMessagesEndRef.current) {
      botMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [botChatMessages]);

  useEffect(() => {
    const setupWebPush = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted' && 'serviceWorker' in navigator && 'PushManager' in window) {
          const registration = await navigator.serviceWorker.ready;
          
          let subscription = await registration.pushManager.getSubscription();
          if (!subscription) {
            const vapidPublicKey = 'BKZ4Be1x-eWdYF_3Rh5ATnXYspYye1t7XY0KeiGkNbPxY5QnF_Bwc7PUkrF69G5-SuyVQvd6myaSYv6m4WC5AxA';
            const convertedVapidKey = (base64String => {
              const padding = '='.repeat((4 - base64String.length % 4) % 4);
              const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
              const rawData = window.atob(base64);
              const outputArray = new Uint8Array(rawData.length);
              for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
              return outputArray;
            })(vapidPublicKey);

            subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: convertedVapidKey
            });
          }
          
          // Send to backend
          await fetch(`${API_URL}/api/admin/subscribe`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'x-admin-pass': password 
            },
            body: JSON.stringify(subscription)
          });
        }
      } catch (err) {
        console.error('Web Push Setup Error:', err);
      }
    };
    
    if (isAuthenticated) {
      setupWebPush();
    }
  }, [isAuthenticated, password, API_URL]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchStats();
      const interval = setInterval(fetchStats, 10000); // Poll every 10s
      
      fetch(`${API_URL}/api/config/globe`)
        .then(res => res.json())
        .then(data => setGlobeStatus(data))
        .catch(e => console.error(e));

      
      const newSocket = io(API_URL);
      setAdminSocket(newSocket);

      newSocket.on('connect', () => {
        newSocket.emit('admin_online');
      });
        
      newSocket.on('admin_alert_new_random', (user) => {
        try {
          const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
          audio.play().catch(e => console.log('Audio blocked', e));
        } catch (e) {}
        
        if (Notification.permission === 'granted') {
          const notif = new Notification('New Random Chat!', { body: `@${user.username} is waiting...` });
          notif.onclick = () => {
            window.focus();
            if (activeRandomChatRef.current) {
              newSocket.emit('send_anonymous_message', { roomId: activeRandomChatRef.current.roomId, messageText: 'bye' });
              newSocket.emit('leave_anonymous_chat', { roomId: activeRandomChatRef.current.roomId });
            }
            newSocket.emit('admin_intercept_random', { targetUserId: user._id });
          };
        }
        setIncomingRandom(user);
        // Auto clear after 6 seconds if not intercepted
        setTimeout(() => setIncomingRandom(null), 6000);
      });

      newSocket.on('admin_intercept_started', (data) => {
        setActiveRandomChat(data);
        setIncomingRandom(null);
        setRandomMessages([]);
      });

      newSocket.on('receive_anonymous_message', (msg) => {
        setRandomMessages(prev => [...prev, { ...msg, isMine: false }]);
      });
      
      newSocket.on('receive_message', (msg) => {
        const currBot = selectedBotChatRef.current;
        if (currBot && (
            (msg.sender === currBot.bot._id && msg.receiver === currBot.user._id) || 
            (msg.sender === currBot.user._id && msg.receiver === currBot.bot._id)
        )) {
            setBotChatMessages(prev => [...prev, msg]);
        } else {
            setUnreadBotChats(prev => new Set(prev).add(msg.sender));
        }
      });
      
      newSocket.on('anonymous_chat_ended', () => {
        alert('Anonymous chat ended by user.');
        setActiveRandomChat(null);
      });

      newSocket.on('globe_status_update', (status) => {
        setGlobeStatus(status);
        if (status.isEnabled) {
          setGlobeTimerMinutes('');
        }
      });

      return () => {
        clearInterval(interval);
        newSocket.off('connect');
        newSocket.off('admin_alert_new_random');
        newSocket.off('admin_intercept_started');
        newSocket.off('receive_anonymous_message');
        newSocket.off('receive_message');
        newSocket.off('anonymous_chat_ended');
        newSocket.off('globe_status_update');
        newSocket.disconnect();
      };
    }
  }, [isAuthenticated, API_URL]);

  // SPA Back Button Handling for Overlays & Chats
  useEffect(() => {
    const isOverlayOpen = selectedReport || chatViewTarget || activeRandomChat || selectedBotChat;
    
    if (isOverlayOpen) {
      window.history.pushState({ adminOverlay: true }, '');
    }

    const handlePopState = (e) => {
      if (selectedReport || chatViewTarget || activeRandomChat || selectedBotChat) {
        if (activeRandomChat && adminSocket) {
          adminSocket.emit('leave_anonymous_chat', { roomId: activeRandomChat.roomId });
        }
        setSelectedReport(null);
        setChatViewTarget(null);
        setActiveRandomChat(null);
        setSelectedBotChat(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedReport, chatViewTarget, activeRandomChat, selectedBotChat, adminSocket]);

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
      
      if (activeTab === 'analytics') {
        const analyticsRes = await fetch(`${API_URL}/api/admin/analytics`, {
          headers: { 'x-admin-pass': password }
        });
        if (analyticsRes.ok) {
          const aData = await analyticsRes.json();
          setAnalyticsData(aData);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === 'analytics') fetchStats();
  }, [activeTab]);

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

    try {
      await fetch(`${API_URL}/api/admin/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-pass': password },
        body: JSON.stringify({ message: broadcastMessage })
      });
      setBroadcastMessage('');
      alert("Broadcast sent successfully!");
    } catch (err) {
      alert("Error sending broadcast");
    }
  };

  const handleUpdateGlobe = async (e) => {
    e.preventDefault();
    const enableAt = globeTimerMinutes ? new Date(Date.now() + parseInt(globeTimerMinutes) * 60000) : null;
    try {
      const res = await fetch(`${API_URL}/api/admin/globe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-pass': password },
        body: JSON.stringify({
           isEnabled: globeStatus.isEnabled,
           customMessage: globeStatus.customMessage,
           enableAt
        })
      });
      const data = await res.json();
      setGlobeStatus(data);
      setGlobeTimerMinutes('');
      alert('Globe status updated successfully!');
    } catch (err) {
      alert('Error updating globe status');
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

  const handleViewChats = async (user) => {
    setChatViewTarget(user);
    setIsFetchingChats(true);
    setSelectedUserChats(null);
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${user._id}/chats`, {
        headers: { 'x-admin-pass': password }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedUserChats(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetchingChats(false);
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

  const handleIntercept = () => {
    if (incomingRandom && adminSocket) {
      if (activeRandomChat) {
        adminSocket.emit('send_anonymous_message', { 
          roomId: activeRandomChat.roomId, 
          messageText: 'bye' 
        });
        adminSocket.emit('leave_anonymous_chat', { roomId: activeRandomChat.roomId });
      }
      adminSocket.emit('admin_intercept_random', { targetUserId: incomingRandom._id });
    }
  };

  const handleSendRandomMessage = (e) => {
    e.preventDefault();
    if (!randomMessageInput.trim() || !activeRandomChat || !adminSocket) return;
    
    adminSocket.emit('send_anonymous_message', { 
      roomId: activeRandomChat.roomId, 
      messageText: randomMessageInput 
    });
    setRandomMessages(prev => [...prev, { 
      _id: Date.now(), 
      message: randomMessageInput, 
      isMine: true, 
      createdAt: new Date().toISOString() 
    }]);
    setRandomMessageInput('');
  };

  const fetchBotRequests = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/bots/requests`, { headers: { 'x-admin-pass': password }});
      if (res.ok) setBotRequests(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchBotChats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/bots/chats`, { headers: { 'x-admin-pass': password }});
      if (res.ok) {
        const data = await res.json();
        setBotChats(data.reverse());
      }
    } catch (err) { console.error(err); }
  };

  const handleAcceptBotRequest = async (botId, userId) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/bots/accept/${botId}/${userId}`, {
        method: 'POST', headers: { 'x-admin-pass': password }
      });
      if (res.ok) {
        setBotRequests(botRequests.filter(r => r.requester._id !== userId || r.bot._id !== botId));
        fetchBotChats();
        alert('Request accepted!');
      }
    } catch (err) { console.error(err); }
  };

  const openBotChat = async (chat) => {
    setSelectedBotChat(chat);
    setUnreadBotChats(prev => {
      const newSet = new Set(prev);
      newSet.delete(chat.user._id);
      return newSet;
    });
    try {
      const res = await fetch(`${API_URL}/api/admin/bots/messages/${chat.bot._id}/${chat.user._id}`, {
        headers: { 'x-admin-pass': password }
      });
      if (res.ok) setBotChatMessages(await res.json());
    } catch (err) { console.error(err); }
  };

  const handleSendBotMessage = (e) => {
    e.preventDefault();
    if (!botChatMessageInput.trim() || !selectedBotChat || !adminSocket) return;
    
    const msgData = {
      senderId: selectedBotChat.bot._id,
      receiverId: selectedBotChat.user._id,
      messageText: botChatMessageInput,
      messageType: 'text',
      fileUrl: null,
      replyTo: null
    };
    
    adminSocket.emit('send_message', msgData);
    setBotChatMessages(prev => [...prev, {
      ...msgData,
      _id: Date.now(),
      sender: selectedBotChat.bot._id,
      createdAt: new Date().toISOString()
    }]);
    setBotChatMessageInput('');
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

          {/* Globe Control System */}
          <div className="dev-panel" style={{ border: globeStatus.isEnabled ? '1px solid #10b981' : '1px solid #ef4444' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3><Globe size={18} style={{ marginRight: '8px' }}/> Globe Control System</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: globeStatus.isEnabled ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
                  {globeStatus.isEnabled ? 'ONLINE' : 'OFFLINE'}
                </span>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={globeStatus.isEnabled}
                    onChange={(e) => setGlobeStatus({ ...globeStatus, isEnabled: e.target.checked })}
                  />
                  <span className="slider round"></span>
                </label>
              </div>
            </div>
            <p className="panel-desc">Turn the Random Chat matching ON or OFF.</p>
            {!globeStatus.isEnabled && (
              <form onSubmit={handleUpdateGlobe} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
                <input 
                  type="text" 
                  placeholder="Custom Offline Message..."
                  value={globeStatus.customMessage}
                  onChange={(e) => setGlobeStatus({ ...globeStatus, customMessage: e.target.value })}
                  className="dev-input"
                />
                <input 
                  type="number" 
                  placeholder="Auto-Enable Timer (in minutes, optional)"
                  value={globeTimerMinutes}
                  onChange={(e) => setGlobeTimerMinutes(e.target.value)}
                  className="dev-input"
                />
                <button type="submit" className="dev-btn-primary" style={{ background: '#ef4444', color: '#fff' }}>Save Offline State</button>
              </form>
            )}
            {globeStatus.isEnabled && (
              <button onClick={handleUpdateGlobe} className="dev-btn-primary" style={{ background: '#10b981', color: '#fff', marginTop: '15px' }}>Save Online State</button>
            )}
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
                <button 
                  onClick={() => { setActiveTab('bot-requests'); fetchBotRequests(); }} 
                  className={`dev-btn-${activeTab === 'bot-requests' ? 'primary' : 'secondary'}`}
                >
                  <Users size={16} style={{ marginRight: '8px' }} />
                  Bot Inbox
                </button>
                <button 
                  onClick={() => { setActiveTab('bot-chats'); fetchBotChats(); }} 
                  className={`dev-btn-${activeTab === 'bot-chats' ? 'primary' : 'secondary'}`}
                  style={{ position: 'relative' }}
                >
                  <MessageSquare size={16} style={{ marginRight: '8px' }} />
                  Bot Chats
                  {unreadBotChats.size > 0 && <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ff4b4b', color: 'white', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '10px' }}>{unreadBotChats.size}</span>}
                </button>
                <button 
                  onClick={() => { setActiveTab('analytics'); }} 
                  className={`dev-btn-${activeTab === 'analytics' ? 'primary' : 'secondary'}`}
                  style={{ background: activeTab === 'analytics' ? '#8b5cf6' : '' }}
                >
                  <BarChart2 size={16} style={{ marginRight: '8px' }} />
                  Analytics & Growth
                </button>
                <Link 
                  to="/admin/bot-training"
                  className="dev-btn-secondary"
                  style={{ textDecoration: 'none' }}
                >
                  <MessageSquare size={16} style={{ marginRight: '8px' }} />
                  🤖 Bot Training
                </Link>
              </div>

              {activeTab === 'analytics' ? (
                analyticsData ? (
                <div className="dev-analytics-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className="dev-stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                     <div className="dev-stat-card" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', border: 'none' }}>
                        <div className="stat-info">
                          <h3 style={{ fontSize: '2rem' }}>{analyticsData.dau}</h3>
                          <p style={{ color: '#e0e7ff' }}>Daily Active Users</p>
                        </div>
                     </div>
                     <div className="dev-stat-card" style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', border: 'none' }}>
                        <div className="stat-info">
                          <h3 style={{ fontSize: '2rem' }}>{analyticsData.mau}</h3>
                          <p style={{ color: '#e0f2fe' }}>Monthly Active Users</p>
                        </div>
                     </div>
                     <div className="dev-stat-card" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none' }}>
                        <div className="stat-info">
                          <h3 style={{ fontSize: '2rem' }}>{analyticsData.day1Retention}%</h3>
                          <p style={{ color: '#d1fae5' }}>Retention Rate (Est.)</p>
                        </div>
                     </div>
                     <div className="dev-stat-card" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', border: 'none' }}>
                        <div className="stat-info">
                          <h3 style={{ fontSize: '2rem' }}>{analyticsData.avgSessionMinutes}m</h3>
                          <p style={{ color: '#fef3c7' }}>Avg Session Length</p>
                        </div>
                     </div>
                  </div>
                  
                  <div className="analytics-charts-grid">
                     <div className="dev-panel" style={{ padding: '20px' }}>
                        <h4 style={{ marginBottom: '15px' }}>DAU Trend (Last 7 Days)</h4>
                        {analyticsData.chartData && (
                          <Line 
                            data={{
                              labels: analyticsData.chartData.labels,
                              datasets: [{
                                label: 'Daily Active Users',
                                data: analyticsData.chartData.dau,
                                borderColor: '#8b5cf6',
                                backgroundColor: 'rgba(139, 92, 246, 0.2)',
                                fill: true,
                                tension: 0.4
                              }]
                            }}
                            options={{ responsive: true, scales: { y: { beginAtZero: true } } }}
                          />
                        )}
                     </div>
                     
                     <div className="dev-panel" style={{ padding: '20px' }}>
                        <h4 style={{ marginBottom: '15px' }}>Core Actions (Avg per session)</h4>
                        {analyticsData && (
                          <Bar 
                            data={{
                              labels: ['Messages Sent', 'Matches Made'],
                              datasets: [{
                                label: 'Average Count',
                                data: [analyticsData.avgMessages, analyticsData.avgMatches],
                                backgroundColor: ['#0ea5e9', '#f59e0b']
                              }]
                            }}
                            options={{ responsive: true, scales: { y: { beginAtZero: true } } }}
                          />
                        )}
                     </div>
                  </div>
                  
                  <div className="dev-stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginTop: '10px' }}>
                     <div className="dev-stat-card" style={{ background: 'linear-gradient(135deg, #14b8a6, #0f766e)', border: 'none' }}>
                        <div className="stat-info">
                          <h3 style={{ fontSize: '2rem' }}>+{analyticsData.todaySignups || 0}</h3>
                          <p style={{ color: '#ccfbf1' }}>New Users (Today)</p>
                        </div>
                     </div>
                     <div className="dev-stat-card" style={{ background: 'linear-gradient(135deg, #ec4899, #be185d)', border: 'none' }}>
                        <div className="stat-info">
                          <h3 style={{ fontSize: '2rem' }}>+{growthTimeframe === 'monthly' ? (analyticsData.monthSignups || 0) : (analyticsData.yearSignups || 0)}</h3>
                          <p style={{ color: '#fbcfe8' }}>New Users ({growthTimeframe === 'monthly' ? 'Last 30 Days' : 'Last 12 Months'})</p>
                        </div>
                     </div>
                  </div>

                  {(analyticsData.growthData || analyticsData.yearlyGrowthData) && (
                     <div className="dev-panel" style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                          <h4 style={{ margin: 0 }}>
                            User Growth & Acquisition ({growthTimeframe === 'monthly' ? 'Last 30 Days' : 'Last 12 Months'})
                          </h4>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button 
                              onClick={() => setGrowthTimeframe('monthly')}
                              className={`dev-btn-${growthTimeframe === 'monthly' ? 'primary' : 'secondary'}`}
                              style={{ padding: '5px 12px', fontSize: '0.8rem' }}
                            >
                              Monthly
                            </button>
                            <button 
                              onClick={() => setGrowthTimeframe('yearly')}
                              className={`dev-btn-${growthTimeframe === 'yearly' ? 'primary' : 'secondary'}`}
                              style={{ padding: '5px 12px', fontSize: '0.8rem' }}
                            >
                              Yearly
                            </button>
                          </div>
                        </div>
                        <Line 
                          data={{
                            labels: growthTimeframe === 'monthly' ? analyticsData.growthData.labels : analyticsData.yearlyGrowthData.labels,
                            datasets: [{
                              label: 'New Signups',
                              data: growthTimeframe === 'monthly' ? analyticsData.growthData.signups : analyticsData.yearlyGrowthData.signups,
                              borderColor: '#ec4899',
                              backgroundColor: 'rgba(236, 72, 153, 0.2)',
                              fill: true,
                              tension: 0.4,
                              pointRadius: 4,
                              pointHoverRadius: 6,
                              pointBackgroundColor: '#fff',
                              pointBorderColor: '#ec4899',
                              pointBorderWidth: 2,
                            }]
                          }}
                          options={{ 
                            responsive: true, 
                            scales: { 
                              y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                              x: { grid: { color: 'rgba(255,255,255,0.05)' } }
                            },
                            plugins: {
                              legend: { display: false },
                              tooltip: {
                                backgroundColor: 'rgba(0,0,0,0.8)',
                                titleColor: '#ec4899',
                                bodyFont: { size: 14, weight: 'bold' },
                                padding: 12,
                                displayColors: false
                              }
                            }
                          }}
                        />
                     </div>
                  )}
                </div>
                ) : (
                  <div style={{ textAlign: 'center', color: '#888', marginTop: '20px' }}>Loading analytics data...</div>
                )
              ) : activeTab === 'users' ? (
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
                        <button 
                          onClick={() => handleViewChats(u)}
                          className="dev-btn-secondary"
                          style={{ marginTop: '10px', width: '100%', display: 'flex', justifyContent: 'center' }}
                        >
                          <MessageSquare size={16} style={{ marginRight: '5px' }} />
                          View All Chats
                        </button>
                      </div>
                    ))}
                    {users.length === 0 && searchQuery && (
                      <div style={{ textAlign: 'center', color: '#a8a8a8', marginTop: '20px' }}>No users found for "{searchQuery}"</div>
                    )}
                  </div>
                </>
              ) : activeTab === 'reports' ? (
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
              ) : activeTab === 'bot-requests' ? (
                <div className="chat-container" style={{ border: '1px solid #333', borderRadius: '12px', overflow: 'hidden' }}>
                  <div className="chat-list" style={{ width: '100%', maxWidth: '100%', borderRight: 'none' }}>
                    <div className="chat-list-header" style={{ background: '#111' }}>
                      <h2>Pending Requests ({botRequests.length})</h2>
                    </div>
                    <div className="chat-users-scroll" style={{ background: '#050505' }}>
                      {botRequests.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#a8a8a8', padding: '20px' }}>No pending requests for bots.</div>
                      ) : (
                        botRequests.map((req, i) => (
                          <div key={i} className="chat-user-item" style={{ cursor: 'default', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                              <div className="user-avatar-small">
                                <img src={req.requester.avatarUrl || `https://ui-avatars.com/api/?name=${req.requester.username}`} alt='avatar' />
                              </div>
                              <div className="user-names">
                                <span className="user-username">@{req.requester.username}</span>
                                <span style={{ fontSize: '0.75rem', color: '#a8a8a8' }}>
                                  wants to be friends with bot <strong>@{req.bot.username}</strong>
                                </span>
                              </div>
                            </div>
                            <button 
                              onClick={() => handleAcceptBotRequest(req.bot._id, req.requester._id)}
                              className="dev-btn-primary" style={{ background: '#10b981', padding: '8px 15px', borderRadius: '20px', fontSize: '0.85rem' }}
                            >
                              Accept
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="chat-container" style={{ border: '1px solid #333', borderRadius: '12px', overflow: 'hidden' }}>
                  {!selectedBotChat ? (
                    <div className="chat-list" style={{ width: '100%', maxWidth: '100%', borderRight: 'none' }}>
                      <div className="chat-list-header" style={{ background: '#111' }}>
                        <h2>Bot Chats</h2>
                      </div>
                      <div className="chat-users-scroll" style={{ background: '#050505' }}>
                        {botChats.length === 0 ? (
                          <div style={{ textAlign: 'center', color: '#a8a8a8', padding: '20px' }}>No bot chats found.</div>
                        ) : (
                          botChats.map((chat, i) => (
                            <div key={i} className="chat-user-item" onClick={() => openBotChat(chat)}>
                              <div className="user-avatar-small">
                                <img src={chat.user.avatarUrl || `https://ui-avatars.com/api/?name=${chat.user.username}`} alt='avatar' />
                              </div>
                              <div className="user-names">
                                <span className="user-username">@{chat.user.username}</span>
                                <span style={{ fontSize: '0.75rem', color: '#10b981' }}>
                                  Chatting with your bot <strong>@{chat.bot.username}</strong>
                                </span>
                              </div>
                              {unreadBotChats.has(chat.user._id) && (
                                <div style={{ width: '10px', height: '10px', background: '#ff4b4b', borderRadius: '50%', marginLeft: 'auto' }}></div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="chat-area" style={{ flex: 1 }}>
                      <div className="chat-room-header" style={{ background: '#111' }}>
                        <div className="chat-header-info">
                          <button className="back-btn" onClick={() => setSelectedBotChat(null)} style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', cursor: 'pointer', marginRight: '8px', color: '#fff' }}>
                            <X size={24} />
                          </button>
                          <div className="user-names">
                            <span className="user-username" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div className='user-avatar-small' style={{ width: '28px', height: '28px' }}>
                                <img src={`https://ui-avatars.com/api/?name=${selectedBotChat.bot.username}`} alt='avatar' />
                              </div>
                              Disguised as @{selectedBotChat.bot.username}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: '#10b981' }}>Chatting with @{selectedBotChat.user.username}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="chat-messages-area" style={{ background: '#0a0a0a', flex: 1, padding: '20px', overflowY: 'auto' }}>
                        {botChatMessages.map((msg, i) => {
                          const isBot = msg.sender === selectedBotChat.bot._id;
                          return (
                            <div key={i} className={`msg-wrapper ${isBot ? 'sent' : 'received'}`}>
                              <div className="msg-bubble">
                                <div>{msg.message}</div>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={botMessagesEndRef} />
                      </div>
                      
                      <form className="chat-input-area" onSubmit={handleSendBotMessage} style={{ background: '#111' }}>
                        <div className="chat-input-wrapper">
                          <input
                            type="text"
                            value={botChatMessageInput}
                            onChange={(e) => setBotChatMessageInput(e.target.value)}
                            placeholder="Reply as bot..."
                          />
                          <button type="submit" className="action-icon-btn send-btn"><Send size={22} /></button>
                        </div>
                      </form>
                    </div>
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

      {chatViewTarget && (
        <div className="modal-overlay" onClick={() => setChatViewTarget(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', height: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <h2>Chat History: @{chatViewTarget.username}</h2>
              <button className="icon-btn" onClick={() => setChatViewTarget(null)}><X size={24} /></button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '15px', color: '#ccc' }}>
              {isFetchingChats ? (
                <div style={{ textAlign: 'center', marginTop: '50px', color: '#a8a8a8' }}>Fetching chats...</div>
              ) : selectedUserChats === null ? (
                <div style={{ textAlign: 'center', marginTop: '50px', color: '#a8a8a8' }}>Loading...</div>
              ) : selectedUserChats.length === 0 ? (
                <div style={{ textAlign: 'center', marginTop: '50px', color: '#a8a8a8' }}>No chat history found for this user.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {selectedUserChats.map((msg, i) => {
                    const isSender = msg.sender?._id === chatViewTarget._id;
                    const otherUser = isSender ? msg.receiver : msg.sender;
                    return (
                      <div key={msg._id || i} style={{ 
                        background: '#1a1a1a', 
                        padding: '10px', 
                        borderRadius: '8px', 
                        borderLeft: isSender ? '4px solid var(--brand-blue)' : '4px solid #666'
                      }}>
                        <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '5px', display: 'flex', justifyContent: 'space-between' }}>
                          <span>
                            {isSender ? 'Sent to' : 'Received from'}: <strong>@{otherUser?.username || 'Unknown'}</strong>
                          </span>
                          <span>{new Date(msg.createdAt).toLocaleString()}</span>
                        </div>
                        <div style={{ wordBreak: 'break-word', color: '#fff' }}>
                          {msg.message || (msg.fileUrl ? `[Media: ${msg.messageType}]` : '[Empty Message]')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Incoming Random User Alert Toast */}
      {incomingRandom && (
        <div style={{
          position: 'fixed', bottom: '20px', right: '20px', background: '#10b981', color: '#fff', 
          padding: '20px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', zIndex: 9999,
          animation: 'slideUp 0.3s ease-out'
        }}>
          <h3 style={{ margin: '0 0 10px 0' }}>🔔 New Random Chat Waiting!</h3>
          <p style={{ margin: '0 0 15px 0' }}><strong>@{incomingRandom.username}</strong> is searching for a partner...</p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleIntercept} className="dev-btn-primary" style={{ background: '#fff', color: '#10b981' }}>{activeRandomChat ? 'Say Bye & Switch' : 'Intercept Now'}</button>
            <button onClick={() => setIncomingRandom(null)} className="dev-btn-secondary" style={{ background: 'transparent', border: '1px solid #fff', color: '#fff' }}>Ignore</button>
          </div>
        </div>
      )}

      {/* Active Random Chat Modal */}
      {activeRandomChat && (
        <div className="modal-overlay dev-chat-override">
          <div className="chat-container" style={{ width: '100%', maxWidth: '800px', height: '80vh', position: 'relative', zIndex: 1001 }}>
            <div className="chat-area">
              <div className="chat-room-header" style={{ background: '#111' }}>
                <div className="chat-header-info">
                  <button className="back-btn" onClick={() => {
                    if(window.confirm('Leave chat?')) {
                      socket.emit('leave_anonymous_chat', { roomId: activeRandomChat.roomId });
                      setActiveRandomChat(null);
                    }
                  }} style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', cursor: 'pointer', marginRight: '8px', color: '#fff' }}>
                    <X size={24} />
                  </button>
                  <div className="user-names">
                    <span className="user-username" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className='user-avatar-small' style={{ width: '28px', height: '28px' }}>
                        <img src={activeRandomChat.botAccount.avatarUrl || `https://ui-avatars.com/api/?name=${activeRandomChat.botAccount.username}`} alt='avatar' />
                      </div>
                      Disguised as @{activeRandomChat.botAccount.username}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#10b981' }}>Chatting with @{activeRandomChat.targetUser.username}</span>
                  </div>
                </div>
              </div>
              
              <div className="chat-messages-area" style={{ background: '#0a0a0a', flex: 1, padding: '20px' }}>
                {randomMessages.map((msg, i) => (
                  <div key={i} className={`msg-wrapper ${msg.isMine ? 'sent' : 'received'}`}>
                    <div className="msg-bubble">
                      <div>{msg.message}</div>
                    </div>
                  </div>
                ))}
              </div>
              
              <form className="chat-input-area" onSubmit={handleSendRandomMessage} style={{ background: '#111' }}>
                <div className="chat-input-wrapper">
                  <input
                    type="text"
                    value={randomMessageInput}
                    onChange={(e) => setRandomMessageInput(e.target.value)}
                    placeholder="Type a message as bot..."
                  />
                  <button type="submit" className="action-icon-btn send-btn"><Send size={22} /></button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}

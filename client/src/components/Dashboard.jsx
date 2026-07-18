import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Home as HomeIcon, 
  Search as SearchIcon, 
  MessageSquare, 
  User as UserIcon, 
  LogOut, 
  Video, 
  Phone, 
  Send,
  VideoOff,
  PhoneOff,
  UserCheck,
  Bell,
  Check,
  X
} from 'lucide-react';
import Peer from 'simple-peer';
import { AuthContext, SocketContext } from '../App';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('home');
  const { user, token, logout, API_URL } = useContext(AuthContext);
  const socket = useContext(SocketContext);
  const navigate = useNavigate();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Profile & Social State
  const [profileStats, setProfileStats] = useState(null);
  const [notifications, setNotifications] = useState([]);

  // Chat state
  const [recentChats, setRecentChats] = useState([]);
  const [activeChatUser, setActiveChatUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);

  // Calling States
  const [callActive, setCallActive] = useState(false);
  const [calling, setCalling] = useState(false);
  const [receivingCall, setReceivingCall] = useState(false);
  const [callAccepted, setCallAccepted] = useState(false);
  const [isVideoCall, setIsVideoCall] = useState(true);

  // Call Details
  const [callerId, setCallerId] = useState('');
  const [callerName, setCallerName] = useState('');
  const [callerSignal, setCallerSignal] = useState(null);

  // Refs for media
  const myVideoRef = useRef(null);
  const userVideoRef = useRef(null);
  const connectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const messagesEndRef = useRef(null);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_URL}/api/users/profile`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setProfileStats(data);
    } catch (e) { console.error(e); }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_URL}/api/users/requests`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setNotifications(data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (token) {
      fetchRecentChats();
      fetchProfile();
      fetchNotifications();
    }
  }, [activeTab, token]);

  useEffect(() => {
    if (!socket) return;
    socket.on('online_users', (users) => setOnlineUsers(users));
    socket.on('receive_message', (msg) => {
      if ((activeChatUser && msg.sender === activeChatUser._id) || msg.sender === user.id) {
        setMessages((prev) => [...prev, msg]);
      }
      fetchRecentChats();
    });

    socket.on('incoming_call', ({ from, fromUsername, signal, isVideo }) => {
      setReceivingCall(true);
      setCallerId(from);
      setCallerName(fromUsername);
      setCallerSignal(signal);
      setIsVideoCall(isVideo);
    });

    socket.on('call_accepted', (signal) => {
      setCallAccepted(true);
      if (connectionRef.current) connectionRef.current.signal(signal);
    });

    socket.on('call_ended', () => handleEndCallQuietly());

    return () => {
      socket.off('online_users');
      socket.off('receive_message');
      socket.off('incoming_call');
      socket.off('call_accepted');
      socket.off('call_ended');
    };
  }, [socket, activeChatUser, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (activeChatUser) fetchMessages(activeChatUser._id);
  }, [activeChatUser]);

  const fetchRecentChats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/chats/recent`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setRecentChats(data);
    } catch (err) { console.error(err); }
  };

  const fetchMessages = async (otherId) => {
    try {
      const res = await fetch(`${API_URL}/api/messages/${otherId}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setMessages(data);
    } catch (err) { console.error(err); }
  };

  const handleSearch = async (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    if (value.trim().length === 0) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/users/search?query=${value}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setSearchResults(data);
    } catch (err) { console.error(err); } finally {
      setSearchLoading(false);
    }
  };

  const sendFollowRequest = async (targetUserId) => {
    try {
      const res = await fetch(`${API_URL}/api/users/follow/${targetUserId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        // Refresh search results to update button state
        handleSearch({ target: { value: searchQuery } });
        fetchProfile();
      }
    } catch (err) { console.error(err); }
  };

  const acceptRequest = async (requesterId) => {
    try {
      const res = await fetch(`${API_URL}/api/users/accept/${requesterId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchNotifications();
        fetchProfile();
      }
    } catch (err) { console.error(err); }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChatUser || !socket) return;
    socket.emit('send_message', { senderId: user.id, receiverId: activeChatUser._id, messageText: newMessage });
    setNewMessage('');
  };

  const startChatWithUser = (targetUser) => {
    setActiveChatUser(targetUser);
    setActiveTab('messages');
  };

  // --- WebRTC System with Camera permission error handling ---
  const requestMediaPermissions = async (isVideo) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true });
      return stream;
    } catch (error) {
      console.error('Permission denied or no devices found:', error);
      alert('Error: Could not access camera or microphone. Please allow permissions in your browser settings (Site Settings > Camera/Mic) and try again.');
      throw error;
    }
  };

  const callUser = async (targetUserId, targetUsername, isVideo) => {
    setIsVideoCall(isVideo);
    setCalling(true);
    setCallActive(true);
    setCallerName(targetUsername);

    try {
      const stream = await requestMediaPermissions(isVideo);
      localStreamRef.current = stream;
      if (myVideoRef.current) myVideoRef.current.srcObject = stream;

      const peer = new Peer({ initiator: true, trickle: false, stream: stream });

      peer.on('signal', (data) => {
        socket.emit('call_user', {
          userToCall: targetUserId,
          signalData: data,
          from: user.id,
          fromUsername: user.username,
          isVideo: isVideo
        });
      });

      peer.on('stream', (remoteStream) => {
        if (userVideoRef.current) userVideoRef.current.srcObject = remoteStream;
      });

      socket.on('call_accepted', (signal) => {
        setCallAccepted(true);
        setCalling(false);
        peer.signal(signal);
      });

      connectionRef.current = peer;
    } catch (error) {
      handleEndCallQuietly();
    }
  };

  const acceptCall = async () => {
    setReceivingCall(false);
    setCallAccepted(true);
    setCallActive(true);

    try {
      const stream = await requestMediaPermissions(isVideoCall);
      localStreamRef.current = stream;
      if (myVideoRef.current) myVideoRef.current.srcObject = stream;

      const peer = new Peer({ initiator: false, trickle: false, stream: stream });

      peer.on('signal', (data) => {
        socket.emit('answer_call', { to: callerId, signal: data });
      });

      peer.on('stream', (remoteStream) => {
        if (userVideoRef.current) userVideoRef.current.srcObject = remoteStream;
      });

      peer.signal(callerSignal);
      connectionRef.current = peer;
    } catch (error) {
      declineCall();
    }
  };

  const declineCall = () => {
    socket.emit('end_call', { to: callerId });
    setReceivingCall(false);
    handleEndCallQuietly();
  };

  const endCall = () => {
    const targetId = activeChatUser ? activeChatUser._id : callerId;
    socket.emit('end_call', { to: targetId });
    handleEndCallQuietly();
  };

  const handleEndCallQuietly = () => {
    setCallActive(false);
    setCalling(false);
    setReceivingCall(false);
    setCallAccepted(false);
    if (connectionRef.current) { connectionRef.current.destroy(); connectionRef.current = null; }
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null; }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="feed-container">
            <div className="welcome-card" style={{ position: 'relative' }}>
              <div 
                className="notification-icon"
                onClick={() => setActiveTab('notifications')}
                style={{ position: 'absolute', top: '16px', left: '16px', cursor: 'pointer' }}
              >
                <Bell size={24} />
                {notifications.length > 0 && <span className="badge">{notifications.length}</span>}
              </div>
              
              <h2>Welcome to <span className="gradient-text">Twelo</span></h2>
              <p>Hi, <strong>@{user.username}</strong>! This is your world-class real-time MERN dashboard.</p>
              <p>Go to the <strong>Search</strong> tab to find other users, or click <strong>Messages</strong> to chat and call.</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '16px' }}>
                <button className="chat-now-btn" onClick={() => setActiveTab('search')}>Find Friends</button>
                <button className="logout-btn" onClick={() => setActiveTab('messages')}>Inbox</button>
              </div>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="notifications-container" style={{ padding: '16px' }}>
            <h2 className="search-header-text">Notifications</h2>
            {notifications.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#a8a8a8', marginTop: '20px' }}>No new notifications.</div>
            ) : (
              <div className="requests-list">
                {notifications.map(req => (
                  <div className="user-card" key={req._id}>
                    <div className="user-card-info">
                      <div className="user-avatar-small">{req.username.charAt(0).toUpperCase()}</div>
                      <div className="user-names">
                        <span className="user-username">@{req.username}</span>
                        <span className="user-id">wants to follow you</span>
                      </div>
                    </div>
                    <button className="chat-now-btn accept-btn" onClick={() => acceptRequest(req._id)}>Accept</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'search':
        return (
          <div className="search-container">
            <h2 className="search-header-text">Search</h2>
            <div className="search-box-wrapper">
              <SearchIcon className="search-icon-inside" size={20} />
              <input
                type="text"
                placeholder="Search by Unique ID or Username..."
                className="search-input"
                value={searchQuery}
                onChange={handleSearch}
              />
            </div>
            
            {searchLoading && <div style={{ textAlign: 'center', color: '#a8a8a8' }}>Searching...</div>}
            
            <div className="search-results">
              {searchResults.map((searchUser) => {
                const isFollowing = profileStats?.following?.includes(searchUser._id);
                const hasRequested = searchUser.friendRequests?.includes(user.id);
                return (
                  <div className="user-card" key={searchUser._id}>
                    <div className="user-card-info">
                      <div className="user-avatar-small">
                        {searchUser.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="user-names">
                        <span className="user-username">@{searchUser.username}</span>
                        <span className="user-id">ID: {searchUser.uniqueId}</span>
                      </div>
                    </div>
                    
                    {isFollowing ? (
                      <button className="chat-now-btn" onClick={() => startChatWithUser(searchUser)}>Message</button>
                    ) : hasRequested ? (
                      <button className="chat-now-btn" disabled style={{ background: '#333' }}>Requested</button>
                    ) : (
                      <button className="chat-now-btn" onClick={() => sendFollowRequest(searchUser._id)}>Follow</button>
                    )}
                  </div>
                );
              })}
              {!searchLoading && searchQuery && searchResults.length === 0 && (
                <div style={{ textAlign: 'center', color: '#a8a8a8', marginTop: '20px' }}>No users found</div>
              )}
            </div>
          </div>
        );

      case 'messages':
        return (
          <div className="chat-container">
            <div className={`chat-list ${activeChatUser ? 'hide-on-mobile' : ''}`}>
              <div className="chat-list-header">
                <h2>Chats</h2>
              </div>
              <div className="chat-users-scroll">
                {recentChats.map((chatUser) => {
                  const isOnline = onlineUsers.includes(chatUser._id);
                  return (
                    <div 
                      key={chatUser._id} 
                      className={`chat-user-item ${activeChatUser?._id === chatUser._id ? 'active' : ''}`}
                      onClick={() => setActiveChatUser(chatUser)}
                    >
                      <div className="user-avatar-small">
                        {chatUser.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="user-names">
                        <span className="user-username">@{chatUser.username}</span>
                        <span style={{ fontSize: '0.75rem', color: isOnline ? '#2bd856' : '#a8a8a8' }}>
                          {isOnline ? 'online' : 'offline'}
                        </span>
                      </div>
                      {isOnline && <div className="chat-user-status" />}
                    </div>
                  );
                })}
                {recentChats.length === 0 && (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#a8a8a8', fontSize: '0.9rem' }}>
                    No recent chats. Search and follow users to start chatting!
                  </div>
                )}
              </div>
            </div>

            <div className={`chat-area ${!activeChatUser ? 'hide-on-mobile' : ''}`}>
              {activeChatUser ? (
                <>
                  <div className="chat-room-header">
                    <div className="chat-header-info">
                      <button 
                        className="back-btn" 
                        onClick={() => setActiveChatUser(null)}
                        style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', cursor: 'pointer', marginRight: '8px' }}
                      >
                        ←
                      </button>
                      <div className="user-avatar-small">
                        {activeChatUser.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="user-names">
                        <span className="user-username">@{activeChatUser.username}</span>
                        <span style={{ fontSize: '0.75rem', color: onlineUsers.includes(activeChatUser._id) ? '#2bd856' : '#a8a8a8' }}>
                          {onlineUsers.includes(activeChatUser._id) ? 'Active now' : 'offline'}
                        </span>
                      </div>
                    </div>
                    <div className="chat-actions">
                      <button className="action-icon-btn call-audio" onClick={() => callUser(activeChatUser._id, activeChatUser.username, false)}><Phone size={22} /></button>
                      <button className="action-icon-btn call-video" onClick={() => callUser(activeChatUser._id, activeChatUser.username, true)}><Video size={22} /></button>
                    </div>
                  </div>

                  <div className="chat-messages-area">
                    {messages.map((msg) => (
                      <div key={msg._id} className={`msg-wrapper ${msg.sender === user.id ? 'sent' : 'received'}`}>
                        <div className="msg-bubble">{msg.message}</div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  <form className="chat-input-area" onSubmit={handleSendMessage}>
                    <div className="chat-input-wrapper">
                      <input
                        type="text"
                        placeholder="Message..."
                        className="chat-text-input"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        required
                      />
                      {newMessage.trim() && (
                        <button type="submit" className="chat-send-btn"><Send size={18} /></button>
                      )}
                    </div>
                  </form>
                </>
              ) : (
                <div className="no-chat-selected">
                  <div className="no-chat-circle"><MessageSquare size={44} /></div>
                  <h3>Your Messages</h3>
                  <p>Send private messages to your friends.</p>
                </div>
              )}
            </div>
          </div>
        );

      case 'profile':
        return (
          <div className="profile-container">
            <div className="profile-header">
              <div className="profile-avatar-large">
                <div className="profile-avatar-inner">
                  {user.username.charAt(0).toUpperCase()}
                </div>
              </div>
              
              <div className="profile-info">
                <div className="profile-username-row">
                  <span className="profile-username">@{user.username}</span>
                  <button className="logout-btn" onClick={logout}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <LogOut size={16} /> Log Out
                    </div>
                  </button>
                </div>
                
                <div className="profile-stats">
                  <span><strong>{profileStats?.followers?.length || 0}</strong> followers</span>
                  <span><strong>{profileStats?.following?.length || 0}</strong> following</span>
                </div>

                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>{user.username}</h3>
                  <div className="profile-id-box">
                    <label>Unique Profile ID</label>
                    <div className="profile-id-value">
                      <span>{user.uniqueId}</span>
                      <UserCheck size={20} style={{ color: 'var(--brand-blue)' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div>
          <h1 className="sidebar-logo" onClick={() => setActiveTab('home')}>Twelo</h1>
          <nav className="nav-links">
            <div className={`nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>
              <HomeIcon size={24} /><span>Home</span>
            </div>
            <div className={`nav-item ${activeTab === 'search' ? 'active' : ''}`} onClick={() => setActiveTab('search')}>
              <SearchIcon size={24} /><span>Search</span>
            </div>
            <div className={`nav-item ${activeTab === 'notifications' ? 'active' : ''}`} onClick={() => setActiveTab('notifications')}>
              <Bell size={24} /><span>Notifications</span>
              {notifications.length > 0 && <span className="sidebar-badge">{notifications.length}</span>}
            </div>
            <div className={`nav-item ${activeTab === 'messages' ? 'active' : ''}`} onClick={() => setActiveTab('messages')}>
              <MessageSquare size={24} /><span>Messages</span>
            </div>
            <div className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
              <UserIcon size={24} /><span>Profile</span>
            </div>
          </nav>
        </div>
        <div className="sidebar-footer">
          <div className="nav-item" onClick={logout} style={{ color: 'var(--brand-red)' }}><LogOut size={24} /><span>Logout</span></div>
        </div>
      </aside>

      <header className="mobile-header">
        <h1 className="mobile-logo">Twelo</h1>
        <div style={{ display: 'flex', gap: '16px' }}>
          <button onClick={() => setActiveTab('notifications')} style={{ position: 'relative' }}>
            <Bell size={20} />
            {notifications.length > 0 && <span className="badge">{notifications.length}</span>}
          </button>
          <button onClick={logout} style={{ color: 'var(--brand-red)' }}><LogOut size={20} /></button>
        </div>
      </header>

      <main className="main-content">
        {renderTabContent()}
      </main>

      <nav className={`mobile-nav ${(activeChatUser && activeTab === 'messages') ? 'hide-on-mobile' : ''}`}>
        <div className={`nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}><HomeIcon size={24} /></div>
        <div className={`nav-item ${activeTab === 'search' ? 'active' : ''}`} onClick={() => setActiveTab('search')}><SearchIcon size={24} /></div>
        <div className={`nav-item ${activeTab === 'messages' ? 'active' : ''}`} onClick={() => setActiveTab('messages')}><MessageSquare size={24} /></div>
        <div className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}><UserIcon size={24} /></div>
      </nav>

      {/* CALLING OVERLAYS */}
      {receivingCall && (
        <div className="call-overlay">
          <div className="incoming-call-box">
            <div className="pulse-avatar">{callerName.charAt(0).toUpperCase()}</div>
            <div>
              <h3>@{callerName}</h3>
              <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>Incoming {isVideoCall ? 'Video' : 'Audio'} Call...</p>
            </div>
            <div className="call-btn-group">
              <button className="call-action-btn accept" onClick={acceptCall} title="Accept">{isVideoCall ? <Video size={28} /> : <Phone size={28} />}</button>
              <button className="call-action-btn decline" onClick={declineCall} title="Decline"><PhoneOff size={28} /></button>
            </div>
          </div>
        </div>
      )}

      {callActive && (
        <div className="call-overlay">
          <div className="call-screen-active">
            {isVideoCall ? (
              <div className={`video-grid ${callAccepted ? 'two-videos' : ''}`}>
                <div className="video-container-box">
                  <video playsInline muted ref={myVideoRef} autoPlay className="video-element" />
                  <div className="video-label">You</div>
                </div>
                {callAccepted ? (
                  <div className="video-container-box">
                    <video playsInline ref={userVideoRef} autoPlay className="video-element" />
                    <div className="video-label">@{callerName}</div>
                  </div>
                ) : (
                  <div className="video-container-box">
                    <div style={{ textAlign: 'center' }}>
                      <div className="pulse-avatar" style={{ margin: '0 auto' }}>{callerName.charAt(0).toUpperCase()}</div>
                      <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Calling...</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="audio-only-status" style={{ margin: 'auto' }}>
                <div className="pulse-avatar">{callerName.charAt(0).toUpperCase()}</div>
                <h2>@{callerName}</h2>
                <p style={{ color: 'var(--text-secondary)' }}>{callAccepted ? 'Voice Call Connected' : 'Calling...'}</p>
                <audio ref={userVideoRef} autoPlay style={{ display: 'none' }} />
                <audio ref={myVideoRef} muted autoPlay style={{ display: 'none' }} />
              </div>
            )}
            <div className="call-controls-bar">
              <button className="call-action-btn decline" onClick={endCall} title="End Call"><PhoneOff size={28} /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

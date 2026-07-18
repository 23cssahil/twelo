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
  UserCheck
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

  // Fetch recent chats when tab is messages
  useEffect(() => {
    if (token) {
      fetchRecentChats();
    }
  }, [activeTab, token]);

  // Handle socket events for message and calls
  useEffect(() => {
    if (!socket) return;

    socket.on('online_users', (users) => {
      setOnlineUsers(users);
    });

    socket.on('receive_message', (msg) => {
      // If we are currently chatting with the sender or receiver
      if (
        (activeChatUser && msg.sender === activeChatUser._id) || 
        msg.sender === user.id
      ) {
        setMessages((prev) => [...prev, msg]);
      }
      
      // Refresh recent list to update positions
      fetchRecentChats();
    });

    // WebRTC call signaling events
    socket.on('incoming_call', ({ from, fromUsername, signal, isVideo }) => {
      setReceivingCall(true);
      setCallerId(from);
      setCallerName(fromUsername);
      setCallerSignal(signal);
      setIsVideoCall(isVideo);
    });

    socket.on('call_accepted', (signal) => {
      setCallAccepted(true);
      if (connectionRef.current) {
        connectionRef.current.signal(signal);
      }
    });

    socket.on('call_ended', () => {
      handleEndCallQuietly();
    });

    return () => {
      socket.off('online_users');
      socket.off('receive_message');
      socket.off('incoming_call');
      socket.off('call_accepted');
      socket.off('call_ended');
    };
  }, [socket, activeChatUser, user]);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch messages for selected user
  useEffect(() => {
    if (activeChatUser) {
      fetchMessages(activeChatUser._id);
    }
  }, [activeChatUser]);

  const fetchRecentChats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/chats/recent`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setRecentChats(data);
      }
    } catch (err) {
      console.error('Error fetching chats', err);
    }
  };

  const fetchMessages = async (otherId) => {
    try {
      const res = await fetch(`${API_URL}/api/messages/${otherId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setMessages(data);
      }
    } catch (err) {
      console.error('Error fetching messages', err);
    }
  };

  // Search API Call
  const handleSearch = async (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    if (value.trim().length === 0) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/users/search?query=${value}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setSearchResults(data);
      }
    } catch (err) {
      console.error('Search error', err);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChatUser || !socket) return;

    socket.emit('send_message', {
      senderId: user.id,
      receiverId: activeChatUser._id,
      messageText: newMessage
    });
    setNewMessage('');
  };

  const startChatWithUser = (targetUser) => {
    setActiveChatUser(targetUser);
    setActiveTab('messages');
  };

  // --- WebRTC Video & Audio Call System ---

  // Initiate call
  const callUser = async (targetUserId, targetUsername, isVideo) => {
    setIsVideoCall(isVideo);
    setCalling(true);
    setCallActive(true);
    setCallerName(targetUsername);

    try {
      // Get audio/video streams
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideo,
        audio: true
      });
      localStreamRef.current = stream;

      // Assign to local video element
      if (myVideoRef.current) {
        myVideoRef.current.srcObject = stream;
      }

      // Initialize peer connection
      const peer = new Peer({
        initiator: true,
        trickle: false,
        stream: stream
      });

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
        if (userVideoRef.current) {
          userVideoRef.current.srcObject = remoteStream;
        }
      });

      socket.on('call_accepted', (signal) => {
        setCallAccepted(true);
        setCalling(false);
        peer.signal(signal);
      });

      connectionRef.current = peer;
    } catch (error) {
      console.error('Failed to get media devices or start peer:', error);
      alert('Error: Could not access camera or microphone.');
      handleEndCallQuietly();
    }
  };

  // Accept incoming call
  const acceptCall = async () => {
    setReceivingCall(false);
    setCallAccepted(true);
    setCallActive(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideoCall,
        audio: true
      });
      localStreamRef.current = stream;

      if (myVideoRef.current) {
        myVideoRef.current.srcObject = stream;
      }

      const peer = new Peer({
        initiator: false,
        trickle: false,
        stream: stream
      });

      peer.on('signal', (data) => {
        socket.emit('answer_call', {
          to: callerId,
          signal: data
        });
      });

      peer.on('stream', (remoteStream) => {
        if (userVideoRef.current) {
          userVideoRef.current.srcObject = remoteStream;
        }
      });

      peer.signal(callerSignal);
      connectionRef.current = peer;
    } catch (error) {
      console.error('Failed to get media devices or accept call:', error);
      alert('Error: Could not access camera or microphone.');
      declineCall();
    }
  };

  // Decline incoming call
  const declineCall = () => {
    socket.emit('end_call', { to: callerId });
    setReceivingCall(false);
    handleEndCallQuietly();
  };

  // End an active call
  const endCall = () => {
    const targetId = activeChatUser ? activeChatUser._id : callerId;
    socket.emit('end_call', { to: targetId });
    handleEndCallQuietly();
  };

  // Release media resources and reset UI state
  const handleEndCallQuietly = () => {
    setCallActive(false);
    setCalling(false);
    setReceivingCall(false);
    setCallAccepted(false);

    if (connectionRef.current) {
      connectionRef.current.destroy();
      connectionRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
  };

  // Render components based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="feed-container">
            <div className="welcome-card">
              <h2>Welcome to <span className="gradient-text">Instagram</span></h2>
              <p>Hi, <strong>@{user.username}</strong>! This is your world-class real-time MERN dashboard.</p>
              <p>Go to the <strong>Search</strong> tab to find other users, or click <strong>Messages</strong> to chat and call.</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '16px' }}>
                <button className="chat-now-btn" onClick={() => setActiveTab('search')}>Find Friends</button>
                <button className="logout-btn" onClick={() => setActiveTab('messages')}>Inbox</button>
              </div>
            </div>
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
              {searchResults.map((searchUser) => (
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
                  <button 
                    className="chat-now-btn"
                    onClick={() => startChatWithUser(searchUser)}
                  >
                    Message
                  </button>
                </div>
              ))}
              {!searchLoading && searchQuery && searchResults.length === 0 && (
                <div style={{ textAlign: 'center', color: '#a8a8a8', marginTop: '20px' }}>No users found</div>
              )}
            </div>
          </div>
        );

      case 'messages':
        return (
          <div className="chat-container">
            {/* Sidebar list of recent chats */}
            <div className="chat-list">
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
                    No recent chats. Search for users to start chatting!
                  </div>
                )}
              </div>
            </div>

            {/* Active chat window */}
            <div className="chat-area">
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
                      <button 
                        className="action-icon-btn call-audio" 
                        title="Voice Call"
                        onClick={() => callUser(activeChatUser._id, activeChatUser.username, false)}
                      >
                        <Phone size={22} />
                      </button>
                      <button 
                        className="action-icon-btn call-video" 
                        title="Video Call"
                        onClick={() => callUser(activeChatUser._id, activeChatUser.username, true)}
                      >
                        <Video size={22} />
                      </button>
                    </div>
                  </div>

                  <div className="chat-messages-area">
                    {messages.map((msg) => (
                      <div 
                        key={msg._id} 
                        className={`msg-wrapper ${msg.sender === user.id ? 'sent' : 'received'}`}
                      >
                        <div className="msg-bubble">
                          {msg.message}
                        </div>
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
                        <button type="submit" className="chat-send-btn">
                          <Send size={18} />
                        </button>
                      )}
                    </div>
                  </form>
                </>
              ) : (
                <div className="no-chat-selected">
                  <div className="no-chat-circle">
                    <MessageSquare size={44} />
                  </div>
                  <h3>Your Messages</h3>
                  <p>Send private photos, videos and messages to a friend.</p>
                  <button className="chat-now-btn" onClick={() => setActiveTab('search')}>Send message</button>
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
                  <span><strong>0</strong> posts</span>
                  <span><strong>1</strong> profile ID</span>
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
      {/* Sidebar - Desktop Layout */}
      <aside className="sidebar">
        <div>
          <h1 className="sidebar-logo" onClick={() => setActiveTab('home')}>Instagram</h1>
          <nav className="nav-links">
            <div 
              className={`nav-item ${activeTab === 'home' ? 'active' : ''}`}
              onClick={() => setActiveTab('home')}
            >
              <HomeIcon size={24} />
              <span>Home</span>
            </div>
            
            <div 
              className={`nav-item ${activeTab === 'search' ? 'active' : ''}`}
              onClick={() => setActiveTab('search')}
            >
              <SearchIcon size={24} />
              <span>Search</span>
            </div>

            <div 
              className={`nav-item ${activeTab === 'messages' ? 'active' : ''}`}
              onClick={() => setActiveTab('messages')}
            >
              <MessageSquare size={24} />
              <span>Messages</span>
            </div>

            <div 
              className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              <UserIcon size={24} />
              <span>Profile</span>
            </div>
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="nav-item" onClick={logout} style={{ color: 'var(--brand-red)' }}>
            <LogOut size={24} />
            <span>Logout</span>
          </div>
        </div>
      </aside>

      {/* Header - Mobile Layout */}
      <header className="mobile-header">
        <h1 className="mobile-logo">Instagram</h1>
        <button 
          onClick={logout} 
          style={{ color: 'var(--brand-red)', display: 'flex', alignItems: 'center' }}
        >
          <LogOut size={20} />
        </button>
      </header>

      {/* Main Panel Content */}
      <main className="main-content">
        {renderTabContent()}
      </main>

      {/* Navigation - Bottom Mobile Layout */}
      <nav className="mobile-nav">
        <div className={`nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>
          <HomeIcon size={24} />
        </div>
        <div className={`nav-item ${activeTab === 'search' ? 'active' : ''}`} onClick={() => setActiveTab('search')}>
          <SearchIcon size={24} />
        </div>
        <div className={`nav-item ${activeTab === 'messages' ? 'active' : ''}`} onClick={() => setActiveTab('messages')}>
          <MessageSquare size={24} />
        </div>
        <div className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
          <UserIcon size={24} />
        </div>
      </nav>

      {/* INCOMING CALL OVERLAY MODAL */}
      {receivingCall && (
        <div className="call-overlay">
          <div className="incoming-call-box">
            <div className="pulse-avatar">
              {callerName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3>@{callerName}</h3>
              <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
                Incoming {isVideoCall ? 'Video' : 'Audio'} Call...
              </p>
            </div>
            <div className="call-btn-group">
              <button className="call-action-btn accept" onClick={acceptCall} title="Accept">
                {isVideoCall ? <Video size={28} /> : <Phone size={28} />}
              </button>
              <button className="call-action-btn decline" onClick={declineCall} title="Decline">
                <PhoneOff size={28} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE CALL SCREEN OVERLAY */}
      {callActive && (
        <div className="call-overlay">
          <div className="call-screen-active">
            {isVideoCall ? (
              <div className={`video-grid ${callAccepted ? 'two-videos' : ''}`}>
                {/* Local Video Stream */}
                <div className="video-container-box">
                  <video 
                    playsInline 
                    muted 
                    ref={myVideoRef} 
                    autoPlay 
                    className="video-element" 
                  />
                  <div className="video-label">You</div>
                </div>

                {/* Remote Video Stream */}
                {callAccepted ? (
                  <div className="video-container-box">
                    <video 
                      playsInline 
                      ref={userVideoRef} 
                      autoPlay 
                      className="video-element" 
                    />
                    <div className="video-label">@{callerName}</div>
                  </div>
                ) : (
                  <div className="video-container-box">
                    <div style={{ textAlign: 'center' }}>
                      <div className="pulse-avatar" style={{ margin: '0 auto' }}>
                        {callerName.charAt(0).toUpperCase()}
                      </div>
                      <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Calling...</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Audio Call View
              <div className="audio-only-status" style={{ margin: 'auto' }}>
                <div className="pulse-avatar">
                  {callerName.charAt(0).toUpperCase()}
                </div>
                <h2>@{callerName}</h2>
                <p style={{ color: 'var(--text-secondary)' }}>
                  {callAccepted ? 'Voice Call Connected' : 'Calling...'}
                </p>
                <audio ref={userVideoRef} autoPlay style={{ display: 'none' }} />
                <audio ref={myVideoRef} muted autoPlay style={{ display: 'none' }} />
              </div>
            )}

            {/* End Call button controls */}
            <div className="call-controls-bar">
              <button className="call-action-btn decline" onClick={endCall} title="End Call">
                <PhoneOff size={28} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

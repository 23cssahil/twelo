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
  Check,
  X,
  Menu,
  Coins,
  ArrowLeft,
  UserPlus,
  Bell
} from 'lucide-react';
import Peer from 'simple-peer';
import Globe from 'react-globe.gl';
import * as THREE from 'three';
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

  // Settings & Profile Edit State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editUsernameMode, setEditUsernameMode] = useState(false);
  const [newUsernameInput, setNewUsernameInput] = useState('');
  const [usernameError, setUsernameError] = useState('');

  // Profile & Social State
  const [profileStats, setProfileStats] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);
  const [publicProfileData, setPublicProfileData] = useState(null);
  const [connectionsModal, setConnectionsModal] = useState({ isOpen: false, title: '', users: [] });

  // Anonymous Matchmaking & Economy State
  const [coins, setCoins] = useState(0);
  const [isSearchingRandom, setIsSearchingRandom] = useState(false);
  const [randomSearchTimer, setRandomSearchTimer] = useState(5);
  const [anonymousRoomId, setAnonymousRoomId] = useState(null);
  const [anonymousPartnerId, setAnonymousPartnerId] = useState(null);
  const [anonymousMessages, setAnonymousMessages] = useState([]);
  const [isAnonymousChatActive, setIsAnonymousChatActive] = useState(false);
  const [matchFailed, setMatchFailed] = useState(false);
  const [anonymousPartnerAvatar, setAnonymousPartnerAvatar] = useState('');
  const [anonymousPartnerCountry, setAnonymousPartnerCountry] = useState('');

  // Chat state
  const [recentChats, setRecentChats] = useState([]);
  const [activeChatUser, setActiveChatUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState({});

  // Calling States
  const [callActive, setCallActive] = useState(false);
  const [calling, setCalling] = useState(false);
  const [receivingCall, setReceivingCall] = useState(false);
  const [callAccepted, setCallAccepted] = useState(false);
  const [isVideoCall, setIsVideoCall] = useState(true);
  const [swapVideo, setSwapVideo] = useState(false);

  // Call Details
  const [callerId, setCallerId] = useState('');
  const [callerName, setCallerName] = useState('');
  const [callerSignal, setCallerSignal] = useState(null);

  // Refs for media
  const myVideoRef = useRef(null);
  const userVideoRef = useRef(null);
  const connectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const [remoteStreamState, setRemoteStreamState] = useState(null);
  const ringtoneOutRef = useRef(null);
  const ringtoneInRef = useRef(null);
  const messagesEndRef = useRef(null);
  const globeEl = useRef(null);
  
  const isCallerRef = useRef(false);
  const callStartTimeRef = useRef(null);
  const activeCallTargetRef = useRef(null);

  const [gyro, setGyro] = useState({ x: 0, y: 0 });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteUsernameInput, setDeleteUsernameInput] = useState('');
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    const handleOrientation = (e) => {
      let x = e.gamma || 0; // -90 to 90 (left-right)
      let y = e.beta || 0;  // -180 to 180 (front-back)
      
      // Reduce sensitivity for a very subtle effect
      x = x / 3;
      y = y / 3;

      // Restrict max pixel movement to a small range (10px)
      x = Math.max(-10, Math.min(10, x));
      y = Math.max(-10, Math.min(10, y));
      setGyro({ x, y });
    };
    
    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation);
    }
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, []);

  const handleUpdateUsername = async () => {
    setUsernameError('');
    if (newUsernameInput.trim().length < 3) {
      setUsernameError('Username must be at least 3 characters long');
      return;
    }
    try {
      const response = await fetch(`${API_URL}/users/change_username`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ newUsername: newUsernameInput })
      });
      const data = await response.json();
      if (!response.ok) {
        setUsernameError(data.message);
      } else {
        localStorage.setItem('token', data.token);
        window.location.reload();
      }
    } catch (err) {
      setUsernameError('An error occurred');
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteError('');
    if (deleteUsernameInput !== user.username) {
      setDeleteError('Username does not match.');
      return;
    }
    try {
      const response = await fetch(`${API_URL}/api/users/delete_account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username: deleteUsernameInput }),
      });
      const data = await response.json();
      if (response.ok) {
        alert("Account permanently deleted.");
        logout();
      } else {
        setDeleteError(data.message || 'Error deleting account');
      }
    } catch (err) {
      setDeleteError('Network error');
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_URL}/api/users/profile`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) {
        setProfileStats(data);
        setCoins(data.coins || 0);
      }
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
      } else {
        if (msg.sender !== user.id) {
          setUnreadMessages(prev => ({...prev, [msg.sender]: (prev[msg.sender] || 0) + 1}));
        }
      }
      fetchRecentChats();
    });

    socket.on('new_notification', () => {
      fetchNotifications();
      if (activeTab !== 'notifications') {
        setUnreadNotifsCount(prev => prev + 1);
      }
    });

    socket.on('request_accepted_alert', () => {
      fetchProfile();
      if (activeTab === 'search') {
        handleSearch({ target: { value: searchQuery } });
      }
      if (activeTab === 'publicProfile' && publicProfileData) {
        viewPublicProfile(publicProfileData._id);
      }
    });

    socket.on('request_rejected_alert', () => {
      alert("Your follow request was rejected.");
      fetchProfile();
      if (activeTab === 'search') {
        handleSearch({ target: { value: searchQuery } });
      }
      if (activeTab === 'publicProfile' && publicProfileData) {
        viewPublicProfile(publicProfileData._id);
      }
    });

    socket.on('incoming_call', ({ from, fromUsername, signal, isVideo }) => {
      setReceivingCall(true);
      setCallerId(from);
      setCallerName(fromUsername);
      setCallerSignal(signal);
      setIsVideoCall(isVideo);
      if (ringtoneInRef.current) {
        ringtoneInRef.current.currentTime = 0;
        ringtoneInRef.current.play().catch(e => console.log('Audio autoplay prevented'));
      }
    });

    socket.on('call_accepted', (signal) => {
      setCallAccepted(true);
      setCalling(false);
      callStartTimeRef.current = Date.now();
      if (ringtoneOutRef.current) {
        ringtoneOutRef.current.pause();
        ringtoneOutRef.current.currentTime = 0;
      }
      if (connectionRef.current) connectionRef.current.signal(signal);
    });

    socket.on('call_ended', () => {
      finalizeCallLog();
      handleEndCallQuietly();
    });

    socket.on('match_found', ({ roomId, partnerId, partnerAvatar, partnerCountry }) => {
        setIsSearchingRandom(false);
        setAnonymousRoomId(roomId);
        setAnonymousPartnerId(partnerId);
        setAnonymousPartnerAvatar(partnerAvatar || '');
        setAnonymousPartnerCountry(partnerCountry || 'Earth');
        setAnonymousMessages([]);
        setIsAnonymousChatActive(true);
        setActiveTab('anonymousChat');
      });

    socket.on('receive_anonymous_message', (msg) => {
      setAnonymousMessages(prev => [...prev, msg]);
    });

    socket.on('anonymous_chat_ended', () => {
      setIsAnonymousChatActive(false);
      setAnonymousMessages(prev => [...prev, { _id: `sys-${Date.now()}`, message: 'Stranger has disconnected.', isSystem: true }]);
    });

    return () => {
      socket.off('online_users');
      socket.off('receive_message');
      socket.off('new_notification');
      socket.off('request_accepted_alert');
      socket.off('request_rejected_alert');
      socket.off('incoming_call');
      socket.off('call_accepted');
      socket.off('call_ended');
      socket.off('match_found');
      socket.off('receive_anonymous_message');
      socket.off('anonymous_chat_ended');
    };
  }, [socket, activeChatUser, user, activeTab, searchQuery, publicProfileData]);
  // Matchmaking Timer and Globe auto-rotate
  useEffect(() => {
    if (globeEl.current) {
      globeEl.current.controls().autoRotate = true;
      globeEl.current.controls().autoRotateSpeed = isSearchingRandom ? 6.0 : 1.5;
      globeEl.current.controls().enableZoom = false;

      // Set camera distance to make the globe smaller
      globeEl.current.pointOfView({ altitude: 5.5 });

      const scene = globeEl.current.scene();
      if (scene && !scene.userData.ambientAdded) {
        const ambientLight = new THREE.AmbientLight(0xffffff, 2.5); // Bright ambient light removes all shadows
        scene.add(ambientLight);
        scene.userData.ambientAdded = true;
      }
    }

    let interval;
    if (isSearchingRandom && randomSearchTimer > 0) {
      interval = setInterval(() => setRandomSearchTimer(prev => prev - 1), 1000);
    } else if (isSearchingRandom && randomSearchTimer === 0) {
      setIsSearchingRandom(false);
      setMatchFailed(true);
      if (socket) socket.emit('cancel_search', user.id);
      setTimeout(() => setMatchFailed(false), 3000);
    }
    return () => clearInterval(interval);
  }, [isSearchingRandom, randomSearchTimer, socket, user, activeTab]);

  // Handle hardware back button
  useEffect(() => {
    const handlePopState = (e) => {
      if (activeChatUser) {
        setActiveChatUser(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeChatUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Deep Link check on load
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/u/')) {
      const uId = path.split('/')[2];
      if (uId) {
        const viewSharedProfile = async () => {
          try {
            const res = await fetch(`${API_URL}/api/users/public_profile_by_uid/${uId}`, { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (res.ok) {
              setPublicProfileData(data);
              setActiveTab('publicProfile');
            }
          } catch (error) {
            console.error(error);
          }
          window.history.replaceState({}, '', '/');
        };
        viewSharedProfile();
      }
    }
  }, []);

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

  const viewPublicProfile = async (targetUserId) => {
    try {
      const res = await fetch(`${API_URL}/api/users/public_profile/${targetUserId}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) {
        setPublicProfileData(data);
        setActiveTab('publicProfile');
      }
    } catch (err) { console.error(err); }
  };

  const sendFollowRequest = async (targetUserId) => {
    // Optimistic UI
    setSearchResults(prev => prev.map(u => u._id === targetUserId ? { ...u, friendRequests: [...(u.friendRequests || []), user.id] } : u));
    if (publicProfileData && publicProfileData._id === targetUserId) {
      setPublicProfileData(prev => ({ ...prev, friendRequests: [...(prev.friendRequests || []), user.id] }));
    }
    
    try {
      const res = await fetch(`${API_URL}/api/users/follow/${targetUserId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        socket.emit('send_friend_request', { targetUserId });
        fetchProfile();
      }
    } catch (err) { console.error(err); }
  };

  const unfollowUser = async (targetUserId) => {
    // Optimistic UI
    setSearchResults(prev => prev.map(u => u._id === targetUserId ? { 
      ...u, 
      friendRequests: (u.friendRequests || []).filter(id => id !== user.id),
      followers: (u.followers || []).filter(id => id !== user.id)
    } : u));
    if (publicProfileData && publicProfileData._id === targetUserId) {
      setPublicProfileData(prev => ({ 
        ...prev, 
        friendRequests: (prev.friendRequests || []).filter(id => id !== user.id),
        followers: (prev.followers || []).filter(id => id !== user.id)
      }));
    }
    setProfileStats(prev => ({
      ...prev,
      following: (prev.following || []).filter(id => id !== targetUserId)
    }));

    try {
      const res = await fetch(`${API_URL}/api/users/unfollow/${targetUserId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchProfile();
      }
    } catch (err) { console.error(err); }
  };

  const acceptRequest = async (requesterId) => {
    // Optimistic UI
    setNotifications(prev => prev.filter(req => req._id !== requesterId));
    setProfileStats(prev => ({
      ...prev,
      followers: [...(prev.followers || []), requesterId]
    }));

    try {
      const res = await fetch(`${API_URL}/api/users/accept/${requesterId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        socket.emit('accept_friend_request', { requesterId });
        fetchProfile();
      }
    } catch (err) { console.error(err); }
  };

  const rejectRequest = async (requesterId) => {
    // Optimistic UI
    setNotifications(prev => prev.filter(req => req._id !== requesterId));

    try {
      const res = await fetch(`${API_URL}/api/users/reject/${requesterId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        socket.emit('reject_friend_request', { requesterId });
      }
    } catch (err) { console.error(err); }
  };

  const handleConnectionsClick = async (type, userId) => {
    try {
      const res = await fetch(`${API_URL}/api/users/connections/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) {
        setConnectionsModal({ isOpen: true, title: type.charAt(0).toUpperCase() + type.slice(1), users: data[type] });
      } else {
        alert(data.message || "Not authorized to view connections. You must follow this user first.");
      }
    } catch (err) { console.error(err); }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChatUser || !socket) return;
    const msgData = { senderId: user.id, receiverId: activeChatUser._id, messageText: newMessage };
    socket.emit('send_message', msgData);
    
    // Optimistic UI update
    setMessages(prev => [...prev, { 
      _id: `temp-${Date.now()}`,
      sender: user.id, 
      receiver: activeChatUser._id, 
      message: newMessage, 
      createdAt: new Date().toISOString() 
    }]);

    setNewMessage('');
  };

  const logCallMessage = (targetId, messageText) => {
    const msgData = {
      senderId: user.id,
      receiverId: targetId,
      messageText: messageText
    };
    socket.emit('send_message', msgData);
    
    if (activeChatUser && activeChatUser._id === targetId) {
      setMessages(prev => [...prev, {
        _id: `temp-call-${Date.now()}`,
        sender: user.id,
        receiver: targetId,
        message: messageText,
        createdAt: new Date().toISOString()
      }]);
    }
  };

  const finalizeCallLog = () => {
    if (isCallerRef.current && activeCallTargetRef.current) {
      if (callStartTimeRef.current) {
        const dur = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
        const m = Math.floor(dur / 60);
        const s = dur % 60;
        const durStr = m > 0 ? `${m}m ${s}s` : `${s}s`;
        logCallMessage(activeCallTargetRef.current, `📞 Call Ended (${durStr})`);
      } else {
        logCallMessage(activeCallTargetRef.current, '📞 Call Ended');
      }
    }
    isCallerRef.current = false;
    callStartTimeRef.current = null;
    activeCallTargetRef.current = null;
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
  };

  const startChatWithUser = (targetUser) => {
    setActiveChatUser(targetUser);
    setActiveTab('messages');
    setUnreadMessages(prev => ({...prev, [targetUser._id]: 0})); // Reset unread
    fetchMessages(targetUser._id);
    window.history.pushState({ view: 'chat' }, '', '');
  };

  // --- WebRTC System with Camera permission error handling ---

  const requestMediaPermissions = async (isVideo) => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Error: Browser does not support media devices. (Are you using HTTP instead of HTTPS?)");
      throw new Error("MediaDevices not supported");
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true });
      return stream;
    } catch (error) {
      console.error('Media permission error:', error);
      alert(`Call Error: ${error.name} - ${error.message}. (Hardware missing, or blocked by OS/Browser)`);
      throw error;
    }
  };

  const callUser = async (targetUserId, targetUsername, isVideo) => {
    setIsVideoCall(isVideo);
    setCalling(true);
    setCallActive(true);
    setCallerName(targetUsername);
    setCallerId(targetUserId);
    isCallerRef.current = true;
    activeCallTargetRef.current = targetUserId;

    if (ringtoneOutRef.current) {
      ringtoneOutRef.current.currentTime = 0;
      ringtoneOutRef.current.play().catch(e => console.log('Audio autoplay prevented'));
    }

    try {
      const stream = await requestMediaPermissions(isVideo);
      localStreamRef.current = stream;
      if (myVideoRef.current) {
        myVideoRef.current.srcObject = stream;
        myVideoRef.current.play().catch(e => console.error('Local video play error:', e));
      }

      const peer = new Peer({ initiator: true, trickle: false, stream: stream });

      logCallMessage(targetUserId, isVideo ? '📞 Started a Video Call' : '📞 Started a Voice Call');

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
        setRemoteStreamState(remoteStream);
        if (userVideoRef.current) {
          userVideoRef.current.srcObject = remoteStream;
          userVideoRef.current.play().catch(e => console.error('Remote video play error:', e));
        }
      });

      connectionRef.current = peer;
    } catch (error) {
      console.error(error);
      alert('Call setup failed: ' + error.message);
      handleEndCallQuietly();
    }
  };

  const acceptCall = async () => {
    setReceivingCall(false);
    setCallAccepted(true);
    setCallActive(true);
    isCallerRef.current = false;
    callStartTimeRef.current = Date.now();
    if (ringtoneInRef.current) {
      ringtoneInRef.current.pause();
      ringtoneInRef.current.currentTime = 0;
    }

    try {
      const stream = await requestMediaPermissions(isVideoCall);
      localStreamRef.current = stream;
      if (myVideoRef.current) {
        myVideoRef.current.srcObject = stream;
        myVideoRef.current.play().catch(e => console.error('Local video play error:', e));
      }

      const peer = new Peer({ initiator: false, trickle: false, stream: stream });

      peer.on('signal', (data) => {
        socket.emit('answer_call', { to: callerId, signal: data });
      });

      peer.on('stream', (remoteStream) => {
        setRemoteStreamState(remoteStream);
        if (userVideoRef.current) {
          userVideoRef.current.srcObject = remoteStream;
          userVideoRef.current.play().catch(e => console.error('Remote video play error:', e));
        }
      });

      peer.signal(callerSignal);
      connectionRef.current = peer;
    } catch (error) {
      console.error(error);
      alert('Call accept failed: ' + error.message);
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
    finalizeCallLog();
    handleEndCallQuietly();
  };

  const handleEndCallQuietly = () => {
    setCallActive(false);
    setCalling(false);
    setReceivingCall(false);
    setCallAccepted(false);
    setRemoteStreamState(null);
    if (ringtoneInRef.current) { ringtoneInRef.current.pause(); ringtoneInRef.current.currentTime = 0; }
    if (ringtoneOutRef.current) { ringtoneOutRef.current.pause(); ringtoneOutRef.current.currentTime = 0; }
    if (connectionRef.current) { connectionRef.current.destroy(); connectionRef.current = null; }
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null; }
  };

  useEffect(() => {
    if (activeTab === 'notifications') {
      setUnreadNotifsCount(0);
    }
  }, [activeTab]);

  useEffect(() => {
    if (callActive) {
      if (myVideoRef.current && localStreamRef.current) {
        myVideoRef.current.srcObject = localStreamRef.current;
        myVideoRef.current.play().catch(e => {});
      }
      if (userVideoRef.current && remoteStreamState) {
        userVideoRef.current.srcObject = remoteStreamState;
        userVideoRef.current.play().catch(e => {});
      }
    }
  }, [swapVideo, callActive, remoteStreamState]);

  const handleGlobeClick = () => {
    if (!isSearchingRandom) {
      setIsSearchingRandom(true);
      setRandomSearchTimer(5);
      if (socket) socket.emit('search_random', user.id);
    } else {
      setIsSearchingRandom(false);
      if (socket) socket.emit('cancel_search', user.id);
    }
  };

  const handleSendAnonymousMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !anonymousRoomId || !socket || !isAnonymousChatActive) return;
    
    const msg = {
      _id: `temp-${Date.now()}`,
      message: newMessage,
      senderSocket: socket.id,
      createdAt: new Date().toISOString()
    };
    
    socket.emit('send_anonymous_message', { roomId: anonymousRoomId, messageText: newMessage });
    setAnonymousMessages(prev => [...prev, msg]);
    setNewMessage('');
  };

  const handleSendAnonymousFriendRequest = async () => {
    if (coins < 5) {
      alert("Not enough coins! You need 5 coins.");
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/users/anonymous_follow/${anonymousPartnerId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setCoins(data.coinsLeft);
        if (socket) socket.emit('send_friend_request', { targetUserId: anonymousPartnerId });
        alert("Friend request sent!");
      } else {
        alert(data.message || "Could not send request.");
      }
    } catch (err) { console.error(err); }
  };

  const handleLeaveAnonymousChat = () => {
    if (socket && anonymousRoomId) {
      socket.emit('leave_anonymous_chat', { roomId: anonymousRoomId });
    }
    setAnonymousRoomId(null);
    setAnonymousPartnerId(null);
    setIsAnonymousChatActive(false);
    setActiveTab('home');
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="space-container" style={{ overflow: 'hidden' }}>
            <div 
              style={{ 
                position: 'absolute', top: '-15vh', left: '0', width: '100%', height: '130vh', zIndex: 0,
                transform: `translate(${gyro.x}px, ${gyro.y}px) scale(1.1)`,
                transition: 'transform 0.1s ease-out'
              }}
            >
               <Globe
                  ref={globeEl}
                  globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
                  backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
                  bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
                  backgroundColor="rgba(0,0,0,0)"
                  showAtmosphere={false}
                  onGlobeClick={handleGlobeClick}
                />
            </div>
            
            <div className="coin-display" style={{ zIndex: 10 }}>
              <Coins size={18} />
              <span>{coins}</span>
            </div>

            <div 
              className="space-ui-layer"
              style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'none',
                zIndex: 5,
                paddingTop: '65vh'
              }}
            >
              {isSearchingRandom && (
                <div style={{ pointerEvents: 'auto', textAlign: 'center' }}>
                  <div className="match-timer">{randomSearchTimer}s</div>
                  <div className="search-text">Looking for someone in the universe...</div>
                </div>
              )}
              {matchFailed && (
                <div className="search-text" style={{ pointerEvents: 'auto', color: 'var(--brand-red)' }}>
                  No match found
                </div>
              )}
              {!isSearchingRandom && !matchFailed && (
                <div className="search-text" style={{ pointerEvents: 'auto' }}>
                  Tap the globe to find a random chat!
                </div>
              )}
            </div>
            
            <div 
              className="icon-btn" 
              style={{ position: 'absolute', top: '16px', left: '16px', cursor: 'pointer', zIndex: 10, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)' }}
              onClick={() => setActiveTab('notifications')}
            >
              <Bell size={24} color="#fff" />
              {notifications.length > 0 && <span className="badge">{notifications.length}</span>}
            </div>
          </div>
        );

      case 'anonymousChat':
        return (
          <div className="chat-container">
            <div className="chat-area" style={{ position: 'relative' }}>
              <div className="chat-room-header">
                <div className="chat-header-info">
                  <button 
                    className="back-btn" 
                    onClick={handleLeaveAnonymousChat}
                    style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', cursor: 'pointer', marginRight: '8px' }}
                  >
                    ←
                  </button>
                  <div className="user-names">
                    <span className="user-username" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {anonymousPartnerAvatar ? <div className='user-avatar-small' style={{ width: '28px', height: '28px', fontSize: '12px' }}><img src={anonymousPartnerAvatar} alt='avatar' /></div> : <div className='user-avatar-small' style={{ width: '28px', height: '28px', fontSize: '12px' }}>?</div>}
                      Stranger
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#a8a8a8' }}>
                      {anonymousPartnerCountry}
                    </span>
                  </div>
                </div>
                <div className="chat-actions">
                  <button 
                    className="premium-btn primary" 
                    style={{ fontSize: '0.8rem', padding: '6px 12px', display: 'flex', alignItems: 'center' }}
                    onClick={handleSendAnonymousFriendRequest}
                    disabled={!isAnonymousChatActive || coins < 5}
                    title="Send Friend Request (Costs 5 Coins)"
                  >
                    <UserPlus size={16} style={{ marginRight: '6px' }} /> Add Friend
                  </button>
                </div>
              </div>
              
              <div className="chat-messages-area" style={{ flex: 1, background: 'var(--bg-color)' }}>
                {anonymousMessages.map((msg) => (
                  <div key={msg._id} className={`msg-wrapper ${msg.isSystem ? 'system' : (msg.senderSocket === socket?.id ? 'sent' : 'received')}`}>
                    <div className={`msg-bubble ${msg.isSystem ? 'system-bubble' : ''}`} style={msg.isSystem ? { background: 'transparent', color: '#888', textAlign: 'center', width: '100%', fontStyle: 'italic' } : {}}>
                      <div>{msg.message}</div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {isAnonymousChatActive ? (
                <form className="chat-input-area" onSubmit={handleSendAnonymousMessage}>
                  <div className="chat-input-wrapper">
                    <input
                      type="text"
                      placeholder="Type a message..."
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
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: '#a8a8a8', background: 'var(--bg-color)' }}>
                  Chat has ended. <button onClick={handleLeaveAnonymousChat} style={{ background: 'none', border: 'none', color: 'var(--brand-blue)', cursor: 'pointer', fontWeight: 'bold' }}>Return Home</button>
                </div>
              )}
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
                {notifications.map(req => {
                  const isAccepted = profileStats?.followers?.includes(req._id);
                  return (
                    <div className="user-card" key={req._id}>
                      <div className="user-card-info" onClick={() => viewPublicProfile(req._id)} style={{ cursor: 'pointer' }}>
                        <div className="user-avatar-small">{req.avatarUrl ? <img src={req.avatarUrl} alt='avatar' /> : req.username.charAt(0).toUpperCase()}</div>
                        <div className="user-names">
                          <span className="user-username">@{req.username}</span>
                          <span className="user-id">wants to follow you</span>
                        </div>
                      </div>
                      {isAccepted ? (
                        <button className="chat-now-btn" disabled style={{ background: '#333' }}>Accepted</button>
                      ) : (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="chat-now-btn accept-btn" style={{ flex: 1 }} onClick={() => acceptRequest(req._id)}>Accept</button>
                          <button className="chat-now-btn" style={{ flex: 1, background: '#333' }} onClick={() => rejectRequest(req._id)}>Reject</button>
                        </div>
                      )}
                    </div>
                  );
                })}
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
                    <div className="user-card-info" onClick={() => viewPublicProfile(searchUser._id)} style={{ cursor: 'pointer' }}>
                      <div className="user-avatar-small">
                        {searchUser.avatarUrl ? <img src={searchUser.avatarUrl} alt='avatar' /> : searchUser.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="user-names">
                        <span className="user-username">@{searchUser.username}</span>
                        <span className="user-id">ID: {searchUser.uniqueId}</span>
                      </div>
                    </div>
                    
                    {isFollowing ? (
                      <button className="chat-now-btn" onClick={() => startChatWithUser(searchUser)}>Message</button>
                    ) : hasRequested ? (
                      <button className="chat-now-btn" style={{ background: '#333' }} onClick={(e) => { e.stopPropagation(); unfollowUser(searchUser._id); }}>Cancel Request</button>
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

      case 'publicProfile':
        if (!publicProfileData) return null;
        const isFollowing = profileStats?.following?.includes(publicProfileData._id);
        const hasRequested = publicProfileData.friendRequests?.includes(user.id);
        
        return (
          <div className="profile-container">
            <div className="profile-header" style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
              <button 
                onClick={() => setActiveTab('search')} 
                className="back-btn" 
                style={{ position: 'absolute', top: 0, left: 0, border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer', zIndex: 10 }}
              >
                ←
              </button>
              <div className="profile-avatar-large" style={{ margin: '0 auto' }}>
                <div className="profile-avatar-inner">{publicProfileData.avatarUrl ? <img src={publicProfileData.avatarUrl} alt='avatar' /> : publicProfileData.username.charAt(0).toUpperCase()}</div>
              </div>
              <div className="profile-info" style={{ marginTop: '16px' }}>
                <span className="profile-username">@{publicProfileData.username}</span>
                <div className="profile-stats" style={{ justifyContent: 'center', marginTop: '16px', gap: '24px' }}>
                  <span style={{ cursor: 'pointer' }} onClick={() => handleConnectionsClick('followers', publicProfileData._id)}><strong>{publicProfileData.followers?.length || 0}</strong> followers</span>
                  <span style={{ cursor: 'pointer' }} onClick={() => handleConnectionsClick('following', publicProfileData._id)}><strong>{publicProfileData.following?.length || 0}</strong> following</span>
                </div>
                <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                  {isFollowing ? (
                    <>
                      <button className="chat-now-btn" style={{ flex: 1 }} onClick={() => startChatWithUser(publicProfileData)}>Message</button>
                      <button className="chat-now-btn" style={{ flex: 1, background: '#333' }} onClick={() => unfollowUser(publicProfileData._id)}>Unfollow</button>
                    </>
                  ) : hasRequested ? (
                    <button className="chat-now-btn" style={{ background: '#333', width: '100%' }} onClick={() => unfollowUser(publicProfileData._id)}>Cancel Request</button>
                  ) : (
                    <button className="chat-now-btn" style={{ width: '100%' }} onClick={() => sendFollowRequest(publicProfileData._id)}>Follow</button>
                  )}
                </div>
              </div>
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
                  const unreadCount = unreadMessages[chatUser._id] || 0;
                  return (
                    <div 
                      key={chatUser._id} 
                      className={`chat-user-item ${activeChatUser?._id === chatUser._id ? 'active' : ''}`}
                      onClick={() => startChatWithUser(chatUser)}
                    >
                      <div className="user-avatar-small">
                        {chatUser.avatarUrl ? <img src={chatUser.avatarUrl} alt='avatar' /> : chatUser.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="user-names">
                        <span className="user-username">@{chatUser.username}</span>
                        <span style={{ fontSize: '0.75rem', color: isOnline ? '#2bd856' : '#a8a8a8' }}>
                          {isOnline ? 'online' : 'offline'}
                        </span>
                      </div>
                      {unreadCount > 0 && (
                        <div style={{ marginLeft: 'auto', background: 'var(--brand-red)', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                          {unreadCount}
                        </div>
                      )}
                      {isOnline && unreadCount === 0 && <div className="chat-user-status" />}
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
                        onClick={() => {
                          if (window.history.state && window.history.state.view === 'chat') {
                            window.history.back();
                          } else {
                            setActiveChatUser(null);
                          }
                        }}
                        style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', cursor: 'pointer', marginRight: '8px' }}
                      >
                        ←
                      </button>
                      <div className="user-avatar-small" onClick={() => viewPublicProfile(activeChatUser._id)} style={{ cursor: 'pointer' }}>
                        {activeChatUser.avatarUrl ? <img src={activeChatUser.avatarUrl} alt='avatar' /> : activeChatUser.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="user-names" onClick={() => viewPublicProfile(activeChatUser._id)} style={{ cursor: 'pointer' }}>
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
                        <div className="msg-bubble">
                          <div>{msg.message}</div>
                          <div className="msg-time">{formatTime(msg.createdAt)}</div>
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
          <div className="profile-container" style={{ position: 'relative' }}>
            <div className="profile-header-actions" style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10 }}>
              <button className="icon-btn settings-btn" onClick={() => { setEditUsernameMode(false); setShowSettingsModal(true); }}>
                <Menu size={24} />
              </button>
            </div>
            <div className="profile-header">
              <div className="profile-avatar-large">
                <div className="profile-avatar-inner">
                  {user.avatarUrl ? <img src={user.avatarUrl} alt='avatar' /> : user.username.charAt(0).toUpperCase()}
                </div>
              </div>
              
              <div className="profile-info">
                <div className="profile-username-row" style={{ justifyContent: 'center' }}>
                  <span className="profile-username">@{user.username}</span>
                </div>
                
                <div className="premium-stats-container">
                  <div className="premium-stat-box" onClick={() => handleConnectionsClick('followers', user.id)}>
                    <span className="stat-number">{profileStats?.followers?.length || 0}</span>
                    <span className="stat-label">Followers</span>
                  </div>
                  <div className="premium-stat-box" onClick={() => handleConnectionsClick('following', user.id)}>
                    <span className="stat-number">{profileStats?.following?.length || 0}</span>
                    <span className="stat-label">Following</span>
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>{user.name}</h3>
                  <div className="profile-id-box">
                    <label>Unique Profile ID</label>
                    <div className="profile-id-value">
                      <span>{user.uniqueId}</span>
                      <UserCheck size={20} style={{ color: 'var(--brand-blue)' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                      <button 
                        className="premium-btn secondary" 
                        style={{ fontSize: '0.8rem', padding: '8px' }}
                        onClick={() => {
                          navigator.clipboard.writeText(user.uniqueId);
                          alert('ID Copied!');
                        }}
                      >
                        Copy ID
                      </button>
                      <button 
                        className="premium-btn primary" 
                        style={{ fontSize: '0.8rem', padding: '8px' }}
                        onClick={() => {
                          const url = `${window.location.origin}/u/${user.uniqueId}`;
                          if (navigator.share) {
                            navigator.share({ title: 'Twelo Profile', url });
                          } else {
                            navigator.clipboard.writeText(url);
                            alert('Profile Link Copied!');
                          }
                        }}
                      >
                        Share Profile
                      </button>
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

  const totalUnread = Object.values(unreadMessages).reduce((a, b) => a + b, 0);

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
              {unreadNotifsCount > 0 && <span className="sidebar-badge">{unreadNotifsCount}</span>}
            </div>
            <div className={`nav-item ${activeTab === 'messages' ? 'active' : ''}`} onClick={() => setActiveTab('messages')}>
              <MessageSquare size={24} /><span>Messages</span>
              {totalUnread > 0 && <span className="sidebar-badge">{totalUnread}</span>}
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
            {unreadNotifsCount > 0 && <span className="badge">{unreadNotifsCount}</span>}
          </button>
          <button onClick={logout} style={{ color: 'var(--brand-red)' }}><LogOut size={20} /></button>
        </div>
      </header>

      <main className={`main-content ${activeTab === 'home' ? 'no-scroll' : ''}`}>
        {renderTabContent()}
      </main>

      <nav className={`mobile-nav ${(activeChatUser && activeTab === 'messages') ? 'hide-on-mobile' : ''}`}>
        <div className={`nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}><HomeIcon size={24} /></div>
        <div className={`nav-item ${activeTab === 'search' ? 'active' : ''}`} onClick={() => setActiveTab('search')}><SearchIcon size={24} /></div>
        <div className={`nav-item ${activeTab === 'messages' ? 'active' : ''}`} onClick={() => setActiveTab('messages')} style={{ position: 'relative' }}>
          <MessageSquare size={24} />
          {totalUnread > 0 && <span className="badge">{totalUnread}</span>}
        </div>
        <div className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}><UserIcon size={24} /></div>
      </nav>

      {/* CONNECTIONS MODAL */}
      {/* Modals and Overlays */}
      {showSettingsModal && (
        <div className="settings-drawer-overlay" onClick={() => setShowSettingsModal(false)}>
          <div className="settings-drawer" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Settings</h2>
              <button onClick={() => setShowSettingsModal(false)} className="close-btn"><X size={24} /></button>
            </div>
            <div className="settings-options">
              {editUsernameMode ? (
                <div className="settings-edit-username">
                  <input 
                    type="text" 
                    value={newUsernameInput} 
                    onChange={(e) => setNewUsernameInput(e.target.value)} 
                    placeholder="New Username" 
                    className="premium-input"
                  />
                  {usernameError && <p className="error-text" style={{fontSize: '0.85rem', marginTop: '6px', color: 'var(--brand-red)'}}>{usernameError}</p>}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                    <button className="premium-btn primary" onClick={handleUpdateUsername}>Save Changes</button>
                    <button className="premium-btn secondary" onClick={() => setEditUsernameMode(false)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button className="settings-item-btn" onClick={() => {
                  setNewUsernameInput(user.username);
                  setEditUsernameMode(true);
                }}>
                  Change Username
                </button>
              )}
              
              <button className="settings-item-btn" onClick={() => alert("Privacy Policy: Your data is secure with Twelo.")}>
                Privacy Policy
              </button>
              
              <button className="settings-item-btn logout-danger" onClick={logout}>
                Log Out
              </button>

              {showDeleteConfirm ? (
                <div className="settings-edit-username" style={{ marginTop: '24px', borderTop: '1px solid rgba(255,0,0,0.3)', paddingTop: '16px' }}>
                  <p style={{ color: 'var(--brand-red)', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 'bold' }}>Warning: This action is permanent.</p>
                  <p style={{ color: '#a8a8a8', marginBottom: '12px', fontSize: '0.8rem' }}>Please type your username to confirm.</p>
                  <input 
                    type="text" 
                    value={deleteUsernameInput} 
                    onChange={(e) => setDeleteUsernameInput(e.target.value)} 
                    placeholder={`Type '${user.username}'`}
                    className="premium-input"
                  />
                  {deleteError && <p className="error-text" style={{fontSize: '0.85rem', marginTop: '6px', color: 'var(--brand-red)'}}>{deleteError}</p>}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                    <button className="premium-btn primary" style={{ background: 'var(--brand-red)' }} onClick={handleDeleteAccount}>Confirm Delete</button>
                    <button className="premium-btn secondary" onClick={() => { setShowDeleteConfirm(false); setDeleteError(''); setDeleteUsernameInput(''); }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button className="settings-item-btn logout-danger" onClick={() => setShowDeleteConfirm(true)} style={{ marginTop: '24px' }}>
                  Delete My Account
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {connectionsModal.isOpen && (
        <div className="call-overlay" style={{ zIndex: 100 }}>
          <div className="auth-card" style={{ maxWidth: '400px', width: '90%', background: '#121212', padding: '24px', borderRadius: '12px', position: 'relative' }}>
            <button 
              className="back-btn" 
              style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#f5f5f5' }} 
              onClick={() => setConnectionsModal({ isOpen: false, title: '', users: [] })}
            >
              <X size={24} />
            </button>
            <h2 style={{ marginBottom: '20px', borderBottom: '1px solid #333', paddingBottom: '12px', color: '#f5f5f5' }}>{connectionsModal.title}</h2>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {connectionsModal.users.map(u => (
                <div 
                  className="user-card-info" 
                  key={u._id} 
                  style={{ padding: '8px 0', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} 
                  onClick={() => {
                    setConnectionsModal({ isOpen: false, title: '', users: [] });
                    viewPublicProfile(u._id);
                  }}
                >
                  <div className="user-avatar-small">{u.avatarUrl ? <img src={u.avatarUrl} alt='avatar' /> : u.username.charAt(0).toUpperCase()}</div>
                  <div className="user-names">
                    <span className="user-username">@{u.username}</span>
                  </div>
                </div>
              ))}
              {connectionsModal.users.length === 0 && <p style={{ color: '#a8a8a8', textAlign: 'center' }}>No {connectionsModal.title.toLowerCase()} yet.</p>}
            </div>
          </div>
        </div>
      )}

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
              <div className="video-grid">
                {callAccepted ? (
                  <>
                    <div className={swapVideo ? "local-video-container clickable-video" : "remote-video-container"} onClick={() => swapVideo && setSwapVideo(false)}>
                      <video playsInline webkit-playsinline="true" ref={userVideoRef} autoPlay className="video-element" style={{ objectFit: 'cover' }} />
                      {!swapVideo && <div className="video-label">@{callerName}</div>}
                    </div>
                    <div className={!swapVideo ? "local-video-container clickable-video" : "remote-video-container"} onClick={() => !swapVideo && setSwapVideo(true)}>
                      <video playsInline webkit-playsinline="true" muted ref={myVideoRef} autoPlay className="video-element" style={{ objectFit: 'cover' }} />
                      {swapVideo && <div className="video-label">You</div>}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="remote-video-container">
                      <video playsInline webkit-playsinline="true" muted ref={myVideoRef} autoPlay className="video-element" style={{ objectFit: 'cover' }} />
                      <div className="video-label">You</div>
                    </div>
                    <div className="local-video-container" style={{ background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div className="pulse-avatar" style={{ width: '40px', height: '40px', fontSize: '1.2rem', margin: '0 auto' }}>{callerName.charAt(0).toUpperCase()}</div>
                        <p style={{ marginTop: '8px', color: '#fff', fontSize: '10px' }}>{onlineUsers.includes(callerId) ? 'Ringing...' : 'Calling...'}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="audio-only-status" style={{ margin: 'auto' }}>
                <div className="pulse-avatar">{callerName.charAt(0).toUpperCase()}</div>
                <h2>@{callerName}</h2>
                <p style={{ color: 'var(--text-secondary)' }}>{callAccepted ? 'Voice Call Connected' : (onlineUsers.includes(callerId) ? 'Ringing...' : 'Calling...')}</p>
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

      {/* Ringtones */}
      <audio ref={ringtoneOutRef} loop src="/ringtone.wav" style={{ display: 'none' }} />
      <audio ref={ringtoneInRef} loop src="/incoming.wav" style={{ display: 'none' }} />
    </div>
  );
}

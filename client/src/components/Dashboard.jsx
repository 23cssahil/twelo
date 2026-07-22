import React, { useState, useEffect, useContext, useRef, useMemo, useCallback, useLayoutEffect } from 'react';
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
  Bell,
  Gift,
  Mic,
  MicOff,
  SwitchCamera,
  Image as ImageIcon,
  Camera,
  MoreVertical,
  Trash2,
  Play,
  Square,
  Pause,
  Flag,
  Loader2
} from 'lucide-react';
import Peer from 'simple-peer';
import Globe from 'react-globe.gl';
import * as THREE from 'three';
import { AuthContext, SocketContext } from '../App';

const CoinSVG = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="coinRim" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fdf0a6" />
        <stop offset="25%" stopColor="#d4af37" />
        <stop offset="50%" stopColor="#fff8cd" />
        <stop offset="75%" stopColor="#aa7c11" />
        <stop offset="100%" stopColor="#fdf0a6" />
      </linearGradient>
      <linearGradient id="coinFace" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ffe55c" />
        <stop offset="100%" stopColor="#d4af37" />
      </linearGradient>
      <filter id="innerShadow">
        <feOffset dx="0" dy="2"/>
        <feGaussianBlur stdDeviation="1.5" result="offset-blur"/>
        <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse"/>
        <feFlood floodColor="black" floodOpacity="0.4" result="color"/>
        <feComposite operator="in" in="color" in2="inverse" result="shadow"/>
        <feComposite operator="over" in="shadow" in2="SourceGraphic"/>
      </filter>
      <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.3" />
      </filter>
    </defs>
    
    <circle cx="20" cy="20" r="18" fill="url(#coinRim)" filter="url(#dropShadow)" />
    <circle cx="20" cy="20" r="15" fill="url(#coinFace)" filter="url(#innerShadow)" stroke="#b8860b" strokeWidth="1" />
    
    <text x="20" y="27" fontSize="22" fontFamily="Arial, sans-serif" fontWeight="900" fill="#a47209" textAnchor="middle" style={{textShadow: "1px 1px 1px rgba(255,255,255,0.7)"}}>T</text>
  </svg>
);
import { Capacitor } from '@capacitor/core';
import { AdMob, RewardAdPluginEvents } from '@capacitor-community/admob';

export default function Dashboard() {
  const [activeTab, _setActiveTab] = useState('home');
  
  const setActiveTab = useCallback((tab) => {
    _setActiveTab(prev => {
      if (prev !== tab) {
        window.history.pushState({ tab }, '');
        return tab;
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    window.history.replaceState({ tab: 'home' }, '');
  }, []);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const initializeAdMob = async () => {
        try {
          const adUnitId = 'ca-app-pub-7775487062260313/6350919371';
          
          await AdMob.initialize({
            requestTrackingAuthorization: true,
            testingDevices: ['2077ef9a63d2b398840261c8221a0c9b'],
            initializeForTesting: false,
          });

          AdMob.removeAllListeners();

          AdMob.addListener(RewardAdPluginEvents.Rewarded, (rewardItem) => {
            rewardUserForAd();
            // Removed alert here because it freezes the AdMob WebView on Android
          });

          // Preload the NEXT ad as soon as the current one is dismissed
          AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
            AdMob.prepareRewardVideoAd({ adUnitId, isTesting: false }).catch(e => console.error("Re-preload failed", e));
          });

          AdMob.addListener(RewardAdPluginEvents.FailedToLoad, (err) => {
            console.error("Ad failed to load", err);
          });

          // Preload the FIRST ad
          await AdMob.prepareRewardVideoAd({ adUnitId, isTesting: false });
        } catch (e) {
          console.error("AdMob initialization failed", e);
        }
      };
      initializeAdMob();
    }
  }, []);

  const { user, token, logout } = useContext(AuthContext);
  const API_URL = import.meta.env.VITE_API_URL || 'https://twelo-backend.onrender.com';
  const socket = useContext(SocketContext);
  const navigate = useNavigate();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  
  // Ad System State
  const [showAdModal, setShowAdModal] = useState(false);
  const [adTimeLeft, setAdTimeLeft] = useState(15);
  const [adCompleted, setAdCompleted] = useState(false);
  const videoRef = React.useRef(null);

  useEffect(() => {
    let timer;
    if (showAdModal && !adCompleted && adTimeLeft > 0) {
      timer = setTimeout(() => {
        setAdTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (showAdModal && adTimeLeft === 0 && !adCompleted) {
      setAdCompleted(true);
      rewardUserForAd();
    }
    return () => clearTimeout(timer);
  }, [showAdModal, adTimeLeft, adCompleted]);

  const handleWatchAd = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        // Show the ad because it's already preloaded by our useEffect
        await AdMob.showRewardVideoAd();
      } catch (e) {
        console.error("Ad show failed", e);
        // Attempt to preload again just in case
        AdMob.prepareRewardVideoAd({ adUnitId: 'ca-app-pub-7775487062260313/6350919371', isTesting: false }).catch(err => console.error(err));
      }
    } else {
      setShowAdModal(true);
      setAdTimeLeft(15);
      setAdCompleted(false);
    }
  };

  const rewardUserForAd = async () => {
    try {
      const res = await fetch(`${API_URL}/api/users/earn/ad`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) {
        setCoins(data.balance);
      }
    } catch (err) { console.error(err); }
  };
  
  const getFlagEmoji = (countryName) => {
    if (!countryName) return '🌍';
    const flags = {
      'India': '🇮🇳',
      'USA': '🇺🇸',
      'UK': '🇬🇧',
      'Canada': '🇨🇦',
      'Australia': '🇦🇺',
      'Germany': '🇩🇪',
      'France': '🇫🇷',
      'Japan': '🇯🇵',
      'Brazil': '🇧🇷',
    };
    return flags[countryName] || '🌍';
  };

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
  const [randomSearchTimer, setRandomSearchTimer] = useState(0);
  const [matchFailed, setMatchFailed] = useState(false);
  const [genderFilter, setGenderFilter] = useState('any');
  const [anonymousRoomId, setAnonymousRoomId] = useState(null);
  const [anonymousPartnerId, setAnonymousPartnerId] = useState(null);
  const [anonymousMessages, setAnonymousMessages] = useState([]);
  const [isAnonymousChatActive, setIsAnonymousChatActive] = useState(false);
  const [anonymousPartnerAvatar, setAnonymousPartnerAvatar] = useState('');
  const [anonymousPartnerCountry, setAnonymousPartnerCountry] = useState('');
  const [anonymousPartnerName, setAnonymousPartnerName] = useState('Stranger');
  const [isAiCompanion, setIsAiCompanion] = useState(false);
  const [anonymousPartnerTyping, setAnonymousPartnerTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  // Chat state
  const [recentChats, setRecentChats] = useState([]);
  const [activeChatUser, setActiveChatUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const chatTypingTimeoutRef = useRef(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState({});

  // Report States
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('Spam');
  const [reportTarget, setReportTarget] = useState(null); // { id, username, isAnonymous }
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  // Calling States
  const [callActive, setCallActive] = useState(false);
  const [calling, setCalling] = useState(false);
  const [receivingCall, setReceivingCall] = useState(false);
  const [callAccepted, setCallAccepted] = useState(false);
  const [isVideoCall, setIsVideoCall] = useState(true);
  const [swapVideo, setSwapVideo] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [currentFacingMode, setCurrentFacingMode] = useState('user');

  // Call Details
  const [callerId, setCallerId] = useState('');
  const [callerName, setCallerName] = useState('');
  const [callerSignal, setCallerSignal] = useState(null);

  // Refs for media
  const myVideoRef = useRef(null);
  const userVideoRef = useRef(null);
  const connectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const callTimeoutRef = useRef(null);
  const [remoteStreamState, setRemoteStreamState] = useState(null);
  const ringtoneOutRef = useRef(null);
  const ringtoneInRef = useRef(null);
  const messagesEndRef = useRef(null);
  const globeEl = useRef(null);

  // Swipe to reply state
  const [replyingTo, setReplyingTo] = useState(null);
  const swipeStartX = useRef(null);
  const swipeCurrentX = useRef(null);
  const [swipeMsgId, setSwipeMsgId] = useState(null);
  
  const isCallerRef = useRef(false);
  const callStartTimeRef = useRef(null);
  const activeCallTargetRef = useRef(null);
  // Refs for Socket optimization
  const activeChatUserRef = useRef(activeChatUser);
  const activeTabRef = useRef(activeTab);
  const searchQueryRef = useRef(searchQuery);
  const publicProfileDataRef = useRef(publicProfileData);

  useEffect(() => {
    activeChatUserRef.current = activeChatUser;
    activeTabRef.current = activeTab;
    searchQueryRef.current = searchQuery;
    publicProfileDataRef.current = publicProfileData;
  }, [activeChatUser, activeTab, searchQuery, publicProfileData]);


  // Media & Context Menu State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const isRecordingCancelledRef = useRef(false);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  const [selectedImage, setSelectedImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  
  const [previewImage, setPreviewImage] = useState(null);
  const [isViewOnce, setIsViewOnce] = useState(false);

  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, msgId: null, isSender: false });
  const pressTimerRef = useRef(null);

  const [isVideoOff, setIsVideoOff] = useState(false);
  const [fullScreenMedia, setFullScreenMedia] = useState(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteUsernameInput, setDeleteUsernameInput] = useState('');
  const [deleteError, setDeleteError] = useState('');



  const handleUpdateUsername = async () => {
    setUsernameError('');
    if (newUsernameInput.trim().length < 3) {
      setUsernameError('Username must be at least 3 characters long');
      return;
    }
    try {
      const response = await fetch(`${API_URL}/api/users/change_username`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ newUsername: newUsernameInput })
      });
      const data = await response.json();
      if (!response.ok) {
        setUsernameError(data.message);
        } else {
          localStorage.setItem('token', data.token);
          const savedUser = JSON.parse(localStorage.getItem('user'));
          if (savedUser) {
            savedUser.username = data.username;
            localStorage.setItem('user', JSON.stringify(savedUser));
          }
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
      const res = await fetch(`${API_URL}/api/users/notifications`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) {
        setNotifications(data);
        const unreadCount = data.filter(n => !n.read).length;
        if (activeTab !== 'notifications') {
          setUnreadNotifsCount(unreadCount);
        }
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (token) {
      fetchRecentChats();
      fetchProfile();
      fetchNotifications();
    }
  }, [token]);

  useEffect(() => {
    if (token && activeTab === 'messages') {
      fetchRecentChats();
    }
  }, [activeTab, token]);

  useEffect(() => {
    const handleResize = () => {
      if (window.visualViewport) {
        document.documentElement.style.setProperty('--vvp-height', `${window.visualViewport.height}px`);
        if (document.activeElement && document.activeElement.tagName === 'INPUT') {
          window.scrollTo(0, 0);
        }
      }
    };
    window.visualViewport?.addEventListener('resize', handleResize);
    window.visualViewport?.addEventListener('scroll', handleResize);
    handleResize();
    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('scroll', handleResize);
    };
  }, []);

  useEffect(() => {
    if (!socket) return;
    
    socket.on('online_users', (users) => setOnlineUsers(users));
    
    socket.on('receive_message', (msg) => {
      if ((activeChatUserRef.current && msg.sender === activeChatUserRef.current._id) || msg.sender === user.id) {
        setMessages((prev) => [...prev, msg]);
        if (msg.sender !== user.id) {
          socket.emit('mark_viewed', { messageId: msg._id, receiverId: user.id, senderId: msg.sender });
        }
      } else {
        if (msg.sender !== user.id) {
          setUnreadMessages(prev => ({...prev, [msg.sender]: (prev[msg.sender] || 0) + 1}));
        }
      }
      fetchRecentChats();
    });

    socket.on('message_deleted', ({ messageId, type }) => {
      setMessages(prev => prev.filter(m => m._id !== messageId));
      fetchRecentChats();
    });

    socket.on('new_notification', () => {
      fetchNotifications();
      if (activeTabRef.current !== 'notifications') {
        setUnreadNotifsCount(prev => prev + 1);
      }
    });

    socket.on('request_accepted_alert', () => {
      fetchProfile();
      if (activeTabRef.current === 'search') {
        handleSearch({ target: { value: searchQueryRef.current } });
      }
      if (activeTabRef.current === 'publicProfile' && publicProfileDataRef.current) {
        viewPublicProfile(publicProfileDataRef.current._id);
      }
    });

    socket.on('request_rejected_alert', () => {
      alert("Your follow request was rejected.");
      fetchProfile();
      if (activeTabRef.current === 'search') {
        handleSearch({ target: { value: searchQueryRef.current } });
      }
      if (activeTabRef.current === 'publicProfile' && publicProfileDataRef.current) {
        viewPublicProfile(publicProfileDataRef.current._id);
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
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
        callTimeoutRef.current = null;
      }
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

    socket.on('match_found', ({ roomId, partnerId, partnerAvatar, partnerCountry, partnerName, isAiCompanion: aiCompanion }) => {
        setIsSearchingRandom(false);
        setAnonymousRoomId(roomId);
        setAnonymousPartnerId(partnerId);
        setAnonymousPartnerAvatar(partnerAvatar || '');
        setAnonymousPartnerCountry(partnerCountry || 'Earth');
        setAnonymousPartnerName(partnerName || 'Stranger');
        setIsAiCompanion(Boolean(aiCompanion));
        setAnonymousMessages([]);
        setIsAnonymousChatActive(true);
        setActiveTab('anonymousChat');
        setAnonymousPartnerTyping(false);
      });

    socket.on('cancel_search', () => {
      setIsSearchingRandom(false);
      setRandomSearchTimer(7);
    });

    socket.on('receive_anonymous_typing', ({ isTyping }) => {
      setAnonymousPartnerTyping(isTyping);
    });

    socket.on('receive_anonymous_message', (msg) => {
      setAnonymousMessages(prev => [...prev, msg]);
    });

    socket.on('anonymous_chat_ended', () => {
      setIsAnonymousChatActive(false);
      setAnonymousMessages(prev => [...prev, { _id: `sys-${Date.now()}`, message: 'Stranger has disconnected.', isSystem: true }]);
    });

    socket.on('coins_deducted', ({ amount, balance }) => {
      setCoins(balance);
    });

    socket.on('message_viewed', ({ messageId, viewedAt }) => {
      setMessages(prev => prev.map(msg => msg._id === messageId ? { ...msg, isViewed: true, viewedAt } : msg));
      fetchRecentChats();
    });

    socket.on('messages_marked_read', ({ readerId, viewedAt }) => {
      if (activeChatUserRef.current && activeChatUserRef.current._id === readerId) {
        setMessages(prev => prev.map(msg => msg.sender === user.id ? { ...msg, isViewed: true, viewedAt } : msg));
      }
    });

    socket.on('typing_status_received', ({ senderId, isTyping }) => {
      setTypingUsers(prev => ({ ...prev, [senderId]: isTyping }));
      if (activeChatUserRef.current && activeChatUserRef.current._id === senderId) {
        setPartnerTyping(isTyping);
      }
    });

    return () => {
      socket.off('online_users');
      socket.off('receive_message');
      socket.off('message_deleted');
      socket.off('new_notification');
      socket.off('request_accepted_alert');
      socket.off('request_rejected_alert');
      socket.off('incoming_call');
      socket.off('call_accepted');
      socket.off('call_ended');
      socket.off('match_found');
      socket.off('cancel_search');
      socket.off('receive_anonymous_typing');
      socket.off('receive_anonymous_message');
      socket.off('anonymous_chat_ended');
      socket.off('coins_deducted');
      socket.off('message_viewed');
      socket.off('messages_marked_read');
      socket.off('typing_status_received');
    };
  }, [socket, user]);

  // SPA Back Button Handling for Overlays & Chats
  useEffect(() => {
    const isOverlayOpen = showSettingsModal || publicProfileData || activeChatUser || isAnonymousChatActive || connectionsModal.isOpen;
    
    if (isOverlayOpen) {
      window.history.pushState({ overlayOpen: true }, '');
    }

    const handlePopState = (e) => {
      if (showSettingsModal || publicProfileData || activeChatUser || isAnonymousChatActive || connectionsModal.isOpen) {
        setShowSettingsModal(false);
        setPublicProfileData(null);
        setActiveChatUser(null);
        if (isAnonymousChatActive) {
          if (socket) {
             socket.emit('leave_anonymous_chat', { roomId: anonymousRoomId });
          }
          setIsAnonymousChatActive(false);
        }
        setConnectionsModal({ isOpen: false, title: '', users: [] });
      } else if (e.state && e.state.tab) {
        _setActiveTab(e.state.tab);
      } else {
        _setActiveTab('home');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [showSettingsModal, publicProfileData, activeChatUser, isAnonymousChatActive, connectionsModal.isOpen]);

  // Lock document scroll when chat is active to prevent keyboard from pushing header out of view
  useEffect(() => {
    if (activeChatUser || isAnonymousChatActive) {
      document.documentElement.classList.add('body-lock');
    } else {
      document.documentElement.classList.remove('body-lock');
    }
    return () => document.documentElement.classList.remove('body-lock');
  }, [activeChatUser, isAnonymousChatActive]);

  // Matchmaking Timer and Globe auto-rotate
  useEffect(() => {
    if (globeEl.current) {
      const controls = globeEl.current.controls && globeEl.current.controls();
      if (controls) {
        controls.autoRotate = true;
        controls.autoRotateSpeed = isSearchingRandom ? 6.0 : 1.5;
        controls.enableZoom = false;
      }

      // Set camera distance to make the globe smaller
      if (globeEl.current.pointOfView) {
        globeEl.current.pointOfView({ altitude: 5.5 });
      }

      const scene = globeEl.current.scene && globeEl.current.scene();
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

  // Removed redundant popstate handler

  useLayoutEffect(() => {
    if (messagesEndRef.current) {
      const parent = messagesEndRef.current.parentElement;
      if (parent) {
        parent.scrollTop = parent.scrollHeight;
      }
    }
  }, [messages, anonymousMessages, partnerTyping, anonymousPartnerTyping]);

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
      if (res.ok) {
        setRecentChats(data);
        const unreads = {};
        data.forEach(chat => {
          unreads[chat._id] = chat.unreadCount || 0;
        });
        setUnreadMessages(unreads);
      }
    } catch (err) { console.error(err); }
  };

  const fetchMessages = async (otherId) => {
    try {
      const res = await fetch(`${API_URL}/api/messages/${otherId}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setMessages(data);
    } catch (err) { console.error(err); }
  };

  const handleDeleteChat = async () => {
    if (!activeChatUser) return;
    if (window.confirm('Are you sure you want to delete all messages in this chat?')) {
      try {
        const res = await fetch(`${API_URL}/api/messages/chat/${activeChatUser._id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          setMessages([]);
          fetchRecentChats();
        } else {
          alert('Failed to delete chat');
        }
      } catch (err) {
        console.error('Error deleting chat:', err);
      }
    }
  };

  const fetchSearchHistory = async () => {
    try {
      const res = await fetch(`${API_URL}/api/users/search-history`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setSearchResults(data);
    } catch (e) { console.error("Search history error", e); }
  };

  useEffect(() => {
    if (activeTab === 'search' && !searchQuery.trim()) {
      fetchSearchHistory();
    }
  }, [activeTab, searchQuery]);

  const handleSearch = async (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (!value.trim()) {
      fetchSearchHistory();
      return;
    }
    setSearchLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/users/search?q=${value}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setSearchResults(data);
    } catch (err) { console.error(err); } finally {
      setSearchLoading(false);
    }
  };

  const viewPublicProfile = async (targetId) => {
    if (!targetId || targetId === user.id) return;
    setPublicProfileData({ isLoading: true, _id: targetId });
    setActiveTab('publicProfile');
    try {
      const res = await fetch(`${API_URL}/api/users/public_profile/${targetId}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) {
        setPublicProfileData(data);
        
        // Record search history if viewing from search
        if (activeTab === 'search') {
          fetch(`${API_URL}/api/users/search-history/${targetId}`, { 
            method: 'POST', 
            headers: { Authorization: `Bearer ${token}` } 
          }).catch(e => console.error("History error", e));
        }
      } else {
        alert(data.message || "Failed to load profile");
      }
    } catch (e) {
      console.error(e);
      alert("Error loading profile");
    }
  };

  const sendFollowRequest = async (targetUserId) => {
    // Optimistic UI
    setSearchResults(prev => prev.map(u => u._id === targetUserId ? { ...u, friendRequests: [...(u.friendRequests || []), user.id] } : u));
    if (publicProfileData && publicProfileData._id === targetUserId) {
      setPublicProfileData(prev => ({ ...prev, friendRequests: [...(prev.friendRequests || []), user.id] }));
    }
    setNotifications(prev => prev.map(notif =>
      String(notif.user?._id) === String(targetUserId)
        ? { ...notif, followBackRequested: true }
        : notif
    ));
    
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
    setNotifications(prev => prev.filter(notif => notif.user?._id !== requesterId));

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

  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      return data.url;
    } catch (err) {
      console.error('Upload failed', err);
      return null;
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPreviewImage(file);
      setIsViewOnce(false);
    }
  };

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      // Don't compress small files or non-images (like gifs if they somehow bypass accept)
      if (file.size < 500000 || !file.type.startsWith('image/') || file.type === 'image/gif') {
        return resolve(file);
      }
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = event => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1280;
          const MAX_HEIGHT = 1280;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob(blob => {
            if (!blob) return reject(new Error('Canvas is empty'));
            const newFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(newFile);
          }, 'image/jpeg', 0.7);
        };
        img.onerror = error => reject(error);
      };
      reader.onerror = error => reject(error);
    });
  };

  const confirmSendImage = async () => {
    if (previewImage) {
      setIsUploading(true);
      try {
        let fileToUpload = previewImage;
        try {
          fileToUpload = await compressImage(previewImage);
        } catch (err) {
          console.warn('Compression failed, falling back to original:', err);
        }

        const url = await uploadFile(fileToUpload);
        setIsUploading(false);
        setPreviewImage(null);
        
        if (url) {
          socket.emit('send_message', { 
            senderId: user.id, 
            receiverId: activeChatUser._id, 
            messageText: '', 
            messageType: 'image', 
            fileUrl: url, 
            replyTo: replyToMessage?._id || null,
            isViewOnce: isViewOnce
          });
          
          setMessages(prev => [...prev, { 
            _id: `temp-${Date.now()}`,
            sender: user.id, 
            receiver: activeChatUser._id, 
            message: '', 
            messageType: 'image',
            fileUrl: url,
            replyTo: replyToMessage ? {
              messageId: replyToMessage._id,
              messageText: replyToMessage.message,
              senderName: replyToMessage.sender === user.id ? 'You' : activeChatUser.username
            } : null,
            isViewOnce: isViewOnce,
            isViewed: false,
            createdAt: new Date().toISOString() 
          }]);
          
          setReplyToMessage(null);
          fetchRecentChats();
        }
      } catch (error) {
        console.error('Error sending image:', error);
        setIsUploading(false);
        setPreviewImage(null);
      }
    }
  };

  const cancelImageSend = () => {
    setPreviewImage(null);
    setIsViewOnce(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      isRecordingCancelledRef.current = false;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        if (isRecordingCancelledRef.current) return;
        const mimeType = mediaRecorderRef.current.mimeType || 'audio/webm';
        const extension = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const file = new File([audioBlob], `audio.${extension}`, { type: mimeType });
        setIsUploading(true);
        const url = await uploadFile(file);
        setIsUploading(false);
        if (url) {
          socket.emit('send_message', { senderId: user.id, receiverId: activeChatUser._id, messageText: '', messageType: 'audio', fileUrl: url, replyTo: null });
          setMessages(prev => [...prev, { 
            _id: `temp-${Date.now()}`,
            sender: user.id, 
            receiver: activeChatUser._id, 
            message: '', 
            messageType: 'audio',
            fileUrl: url,
            replyTo: null,
            createdAt: new Date().toISOString() 
          }]);
          fetchRecentChats();
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording', error);
      alert('Microphone access is required for voice notes.');
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      isRecordingCancelledRef.current = true;
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      clearInterval(timerRef.current);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      clearInterval(timerRef.current);
      setIsRecording(false);
    }
  };

  const handleReportSubmit = async () => {
    if (!reportTarget) return;
    setIsSubmittingReport(true);
    
    // Capture exactly what is on the screen right now
    const chatContextData = reportTarget.isAnonymous ? anonymousMessages : messages;
    // Format to a readable string or keep as JSON. Let's just stringify a simplified version
    const simplifiedContext = chatContextData.map(m => `[${new Date(m.createdAt || Date.now()).toLocaleTimeString()}] ${m.sender === user.id ? 'Me' : reportTarget.username}: ${m.message || '(Media)'}`).join('\n');

    try {
      const res = await fetch(`${API_URL}/api/reports/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          reportedUserId: reportTarget.id,
          reportedUsername: reportTarget.username,
          reason: reportReason,
          chatContext: simplifiedContext
        })
      });
      if (res.ok) {
        setReportSuccess(true);
        setTimeout(() => {
          setShowReportModal(false);
          setReportTarget(null);
          setReportSuccess(false);
        }, 2000);
      } else {
        console.error("Failed to submit report");
        setIsSubmittingReport(false);
      }
    } catch (err) {
      console.error(err);
      setIsSubmittingReport(false);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChatUser || !socket) return;
    
    if (chatTypingTimeoutRef.current) clearTimeout(chatTypingTimeoutRef.current);
    socket.emit('typing_status', { senderId: user.id, receiverId: activeChatUser._id, isTyping: false });
    
    const replyToObj = replyingTo ? {
      messageId: replyingTo._id,
      messageText: replyingTo.message,
      senderName: replyingTo.sender === user.id ? 'You' : activeChatUser.username
    } : null;

    const msgData = { senderId: user.id, receiverId: activeChatUser._id, messageText: newMessage, messageType: 'text', fileUrl: null, replyTo: replyToObj };
    socket.emit('send_message', msgData);
    
    // Optimistic UI update
    setMessages(prev => [...prev, { 
      _id: `temp-${Date.now()}`,
      sender: user.id, 
      receiver: activeChatUser._id, 
      message: newMessage, 
      replyTo: replyToObj,
      createdAt: new Date().toISOString() 
    }]);

    setNewMessage('');
    setReplyingTo(null);
  };

  const handleLongPress = (msg) => {
    setContextMenu({
      visible: true,
      msgId: msg._id,
      isSender: msg.sender === user.id
    });
  };

  const deleteMessage = (type) => {
    if (contextMenu.msgId && socket) {
      socket.emit('delete_message', { messageId: contextMenu.msgId, type, userId: user.id });
    }
    setContextMenu({ visible: false, msgId: null, isSender: false });
  };

  const handleTouchStart = (e, msg) => {
    swipeStartX.current = e.touches[0].clientX;
    setSwipeMsgId(msg._id);
    pressTimerRef.current = setTimeout(() => {
      handleLongPress(msg);
      swipeStartX.current = null;
      setSwipeMsgId(null);
    }, 600); // 600ms for long press
  };

  const handleTouchMove = (e, msg, isSent) => {
    if (!swipeStartX.current) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - swipeStartX.current;

    if (pressTimerRef.current && Math.abs(diff) > 10) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    
    // Swipe direction logic: Sent messages swipe left (-), Received messages swipe right (+)
    if ((isSent && diff < 0 && diff > -100) || (!isSent && diff > 0 && diff < 100)) {
      swipeCurrentX.current = diff;
      const el = document.getElementById(`msg-bubble-${msg._id}`);
      if (el) el.style.transform = `translateX(${diff}px)`;
    }
  };

  const handleTouchEnd = (e, msg, isSent) => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    if (swipeCurrentX.current !== null) {
      const diff = swipeCurrentX.current;
      // Threshold 50px
      if (Math.abs(diff) > 50) {
        setReplyingTo(msg);
        if (navigator.vibrate) navigator.vibrate(50);
      }
      const el = document.getElementById(`msg-bubble-${msg._id}`);
      if (el) {
        el.style.transition = 'transform 0.2s';
        el.style.transform = `translateX(0px)`;
        setTimeout(() => { if (el) el.style.transition = ''; }, 200);
      }
    }
    swipeStartX.current = null;
    swipeCurrentX.current = null;
    setSwipeMsgId(null);
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

  const formatSeenTime = (dateStr) => {
    if (!dateStr) return 'Seen';
    const date = new Date(dateStr);
    const diffInSeconds = Math.floor((new Date() - date) / 1000);
    if (diffInSeconds < 60) return 'Seen just now';
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `Seen ${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `Seen ${diffInHours}h ago`;
    return `Seen ${Math.floor(diffInHours / 24)}d ago`;
  };

  const startChatWithUser = (targetUser) => {
    setActiveChatUser(targetUser);
    setActiveTab('messages');
    setUnreadMessages(prev => ({...prev, [targetUser._id]: 0})); // Reset unread
    setPartnerTyping(false);
    fetchMessages(targetUser._id);
    if (socket) {
      socket.emit('mark_all_read', { senderId: targetUser._id, receiverId: user.id });
    }
    window.history.pushState({ view: 'chat' }, '', '');
  };

  // --- WebRTC System with Camera permission error handling ---

  const requestMediaPermissions = async (isVideo, facingMode = currentFacingMode) => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Error: Browser does not support media devices. (Are you using HTTP instead of HTTPS?)");
      throw new Error("MediaDevices not supported");
    }
    try {
      const constraints = {
        audio: true,
        video: isVideo ? { facingMode: { ideal: facingMode } } : false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
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
      
      callTimeoutRef.current = setTimeout(() => {
        endCall();
      }, 60000);
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
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
    setCallActive(false);
    setCalling(false);
    setReceivingCall(false);
    setCallAccepted(false);
    setRemoteStreamState(null);
    if (ringtoneInRef.current) { 
      ringtoneInRef.current.pause(); 
      ringtoneInRef.current.currentTime = 0; 
      ringtoneInRef.current.src = '';
      setTimeout(() => { if (ringtoneInRef.current) ringtoneInRef.current.src = '/ringtone.mp3'; }, 500);
    }
    if (ringtoneOutRef.current) { 
      ringtoneOutRef.current.pause(); 
      ringtoneOutRef.current.currentTime = 0; 
      ringtoneOutRef.current.src = '';
      setTimeout(() => { if (ringtoneOutRef.current) ringtoneOutRef.current.src = '/ringtone.mp3'; }, 500);
    }
    if (connectionRef.current) { connectionRef.current.destroy(); connectionRef.current = null; }
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null; }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioMuted(!audioTrack.enabled);
      }
    }
  };

  const switchCamera = async () => {
    if (!isVideoCall || !localStreamRef.current || !connectionRef.current) return;
    try {
      const newMode = currentFacingMode === 'user' ? 'environment' : 'user';
      const newStream = await requestMediaPermissions(true, newMode);
      
      const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
      const newVideoTrack = newStream.getVideoTracks()[0];
      
      if (oldVideoTrack && newVideoTrack) {
        connectionRef.current.replaceTrack(oldVideoTrack, newVideoTrack, localStreamRef.current);
        oldVideoTrack.stop();
        localStreamRef.current.removeTrack(oldVideoTrack);
        localStreamRef.current.addTrack(newVideoTrack);
        
        if (myVideoRef.current) {
          myVideoRef.current.srcObject = localStreamRef.current;
        }
        setCurrentFacingMode(newMode);
      }
    } catch (e) {
      console.error('Failed to switch camera', e);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const downloadMedia = async (url) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = url.split('/').pop() || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  useEffect(() => {
    if (activeTab === 'notifications') {
      setUnreadNotifsCount(0);
      // Mark as read in backend
      fetch(`${API_URL}/api/users/notifications/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      }).catch(e => console.error(e));
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

  const handleGlobeClick = useCallback(() => {
    if (!isSearchingRandom) {
      if (genderFilter !== 'any' && coins < 2) {
        alert("Not enough coins! You need 2 coins to use the gender filter.");
        return;
      }
      setIsSearchingRandom(true);
      setRandomSearchTimer(7);
      setMatchFailed(false);
      if (socket) socket.emit('search_random', { userId: user.id, isBotEligible: false, genderFilter });
    } else {
      setIsSearchingRandom(false);
      if (socket) socket.emit('cancel_search', user.id);
    }
  }, [isSearchingRandom, genderFilter, coins, socket, user]);

  const handleGlobeClickRef = useRef(handleGlobeClick);
  useEffect(() => {
    handleGlobeClickRef.current = handleGlobeClick;
  }, [handleGlobeClick]);

  const handleSendAnonymousMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !anonymousRoomId || !socket || !isAnonymousChatActive) return;
    
    const msg = {
      _id: `temp-${Date.now()}`,
      message: newMessage,
      senderSocket: socket.id,
      isMine: true,
      createdAt: new Date().toISOString()
    };
    
    socket.emit('send_anonymous_message', { roomId: anonymousRoomId, messageText: newMessage });
    socket.emit('send_anonymous_typing', { roomId: anonymousRoomId, isTyping: false });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

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
    setAnonymousPartnerName('Stranger');
    setIsAiCompanion(false);
    setIsAnonymousChatActive(false);
    setActiveTab('home');
  };

  const globeComponent = useMemo(() => (
    <Globe
      ref={globeEl}
      globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
      backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
      bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
      backgroundColor="rgba(0,0,0,0)"
      showAtmosphere={false}
      onGlobeClick={() => handleGlobeClickRef.current && handleGlobeClickRef.current()}
    />
  ), []);

  const timeSince = (date) => {
    if (!date) return 'a while ago';
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval >= 1) return Math.floor(interval) + " mins ago";
    return "just now";
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'earn':
        return (
          <div className="earn-container" style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', color: '#fff', paddingBottom: '100px' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '20px', fontSize: '2rem', background: 'linear-gradient(45deg, #FFD700, #FFA500)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Earn Free Coins
            </h2>
            
            <div className="earn-card" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: '15px', padding: '20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', color: '#FFD700' }}>Watch Video Ad</h3>
                <p style={{ margin: 0, color: '#aaa', fontSize: '0.9rem' }}>Watch a 15-second video to earn 5 coins instantly.</p>
              </div>
              <button onClick={handleWatchAd} style={{ padding: '10px 20px', background: 'linear-gradient(45deg, #00c6ff, #0072ff)', border: 'none', borderRadius: '20px', color: '#fff', fontWeight: 'bold', cursor: 'pointer', minWidth: '110px' }}>
                Watch (+5)
              </button>
            </div>

            <div className="earn-card" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: '15px', padding: '20px', marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', color: '#FFD700' }}>Invite Friends</h3>
              <p style={{ margin: '0 0 15px 0', color: '#aaa', fontSize: '0.9rem' }}>Share your unique link. You earn 20 coins for every friend who signs up!</p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input type="text" readOnly value={`${window.location.origin}/login?ref=${user?.id}`} style={{ flex: 1, padding: '10px', background: 'rgba(0,0,0,0.5)', border: '1px solid #333', borderRadius: '8px', color: '#fff' }} />
                <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/login?ref=${user?.id}`); alert('Link Copied!'); }} style={{ padding: '10px 20px', background: '#333', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>
                  Copy
                </button>
              </div>
            </div>
          </div>
        );
      case 'home':
        return (
          <div className="space-container" style={{ overflow: 'hidden' }}>
            <div className="coin-display" style={{ zIndex: 10 }}>
              <CoinSVG size={18} />
              <span>{coins}</span>
            </div>

            <div 
              className="space-ui-layer"
              style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'none',
                zIndex: 5,
                paddingTop: '53vh'
              }}
            >
              {isSearchingRandom && (
                <div style={{ pointerEvents: 'auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <div className="match-timer">{randomSearchTimer}s</div>
                  <div className="search-text">Looking for someone in the universe...</div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setIsSearchingRandom(false); setRandomSearchTimer(5); if (socket) socket.emit('cancel_search', user.id); }}
                    style={{ padding: '8px 20px', borderRadius: '20px', border: '1px solid rgba(255,100,100,0.5)', background: 'rgba(255,50,50,0.2)', color: '#ff6b6b', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}
                  >
                    Cancel
                  </button>
                </div>
              )}
              {matchFailed && (
                <div className="search-text" style={{ pointerEvents: 'auto', color: 'var(--brand-red)' }}>
                  No match found
                </div>
              )}
              {!isSearchingRandom && !matchFailed && (
                <div className="search-text" style={{ pointerEvents: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
                  <span style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)', fontWeight: 'bold' }}>Tap the globe to find a random chat!</span>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', background: 'rgba(255,255,255,0.1)', padding: '6px', borderRadius: '30px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', transform: 'scale(0.95)' }}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setGenderFilter('any'); }} 
                      style={{ padding: '8px 16px', borderRadius: '25px', border: 'none', background: genderFilter === 'any' ? 'linear-gradient(135deg, #00c6ff, #0072ff)' : 'transparent', color: genderFilter === 'any' ? '#fff' : '#aaa', cursor: 'pointer', transition: '0.3s', fontWeight: 'bold', fontSize: '0.9rem', boxShadow: genderFilter === 'any' ? '0 4px 15px rgba(0, 114, 255, 0.4)' : 'none' }}
                    >
                      Any (Free)
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setGenderFilter('male'); }} 
                      style={{ padding: '6px 14px', borderRadius: '25px', border: '1px solid', borderColor: genderFilter === 'male' ? 'transparent' : 'rgba(255,255,255,0.1)', background: genderFilter === 'male' ? 'linear-gradient(135deg, #f12711, #f5af19)' : 'rgba(0,0,0,0.2)', color: genderFilter === 'male' ? '#fff' : '#ccc', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: '0.3s', fontWeight: 'bold', fontSize: '0.9rem', boxShadow: genderFilter === 'male' ? '0 4px 15px rgba(245, 175, 25, 0.4)' : 'none' }}
                    >
                      <img src="https://api.dicebear.com/9.x/avataaars/svg?seed=Leo" alt="Male" style={{width:'24px', height:'24px', borderRadius:'50%', background:'#fff', border: '2px solid rgba(255,255,255,0.8)'}} />
                      Male
                      <div style={{display:'flex', alignItems:'center', background:'rgba(0,0,0,0.3)', padding:'2px 6px', borderRadius:'12px', fontSize:'0.75rem', fontWeight:'normal'}}><CoinSVG size={14}/> <span style={{marginLeft:'3px', marginTop:'1px'}}>2</span></div>
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setGenderFilter('female'); }} 
                      style={{ padding: '6px 14px', borderRadius: '25px', border: '1px solid', borderColor: genderFilter === 'female' ? 'transparent' : 'rgba(255,255,255,0.1)', background: genderFilter === 'female' ? 'linear-gradient(135deg, #fc4a1a, #f7b733)' : 'rgba(0,0,0,0.2)', color: genderFilter === 'female' ? '#fff' : '#ccc', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: '0.3s', fontWeight: 'bold', fontSize: '0.9rem', boxShadow: genderFilter === 'female' ? '0 4px 15px rgba(247, 183, 51, 0.4)' : 'none' }}
                    >
                      <img src="https://api.dicebear.com/9.x/avataaars/svg?seed=Anita" alt="Female" style={{width:'24px', height:'24px', borderRadius:'50%', background:'#fff', border: '2px solid rgba(255,255,255,0.8)'}} />
                      Female
                      <div style={{display:'flex', alignItems:'center', background:'rgba(0,0,0,0.3)', padding:'2px 6px', borderRadius:'12px', fontSize:'0.75rem', fontWeight:'normal'}}><CoinSVG size={14}/> <span style={{marginLeft:'3px', marginTop:'1px'}}>2</span></div>
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <div 
              className="icon-btn" 
              style={{ position: 'absolute', top: '16px', left: '16px', cursor: 'pointer', zIndex: 10, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)', pointerEvents: 'auto' }}
              onClick={() => setActiveTab('notifications')}
            >
              <Bell size={24} color="#fff" />
              {unreadNotifsCount > 0 && <span className="badge">{unreadNotifsCount}</span>}
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
                      {anonymousPartnerName}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#a8a8a8' }}>
                      {anonymousPartnerCountry}
                    </span>
                  </div>
                </div>
                <div className="chat-actions">
                  {!isAiCompanion && <button
                    className="action-icon-btn" 
                    onClick={() => {
                      setReportTarget({ id: anonymousPartnerId, username: 'Anonymous User', isAnonymous: true });
                      setShowReportModal(true);
                    }} 
                    title="Report User"
                    style={{ color: '#ff4b4b' }}
                  >
                    <Flag size={20} />
                  </button>}
                  {!isAiCompanion && <button
                      className="premium-btn primary" 
                      style={{ fontSize: '0.8rem', padding: '6px 12px', display: 'flex', alignItems: 'center' }}
                      onClick={handleSendAnonymousFriendRequest}
                      title="Send Friend Request (Costs 5 Coins)"
                    >
                      <UserPlus size={16} style={{ marginRight: '6px' }} /> Add Friend (5 <CoinSVG size={12} style={{marginLeft: '2px'}}/>)
                    </button>}
                </div>
              </div>
              
              <div className="chat-messages-area" style={{ flex: 1, background: 'var(--bg-color)' }}>
                {anonymousMessages.map((msg) => (
                  <div key={msg._id} className={`msg-wrapper ${msg.isSystem ? 'system' : (msg.isMine ? 'sent' : 'received')}`}>
                    <div className={`msg-bubble ${msg.isSystem ? 'system-bubble' : ''}`} style={msg.isSystem ? { background: 'transparent', color: '#888', textAlign: 'center', width: '100%', fontStyle: 'italic' } : {}}>
                      <div>{msg.message}</div>
                    </div>
                    
                    {/* Context Menu for Delete removed from anonymous chats (not supported) */}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
                {anonymousPartnerTyping && (
                  <div style={{ padding: '0 20px', fontSize: '0.85rem', color: '#a8a8a8', fontStyle: 'italic', marginBottom: '10px' }}>
                    Stranger is typing...
                  </div>
                )}
              {isAnonymousChatActive ? (
                <form className="chat-input-area" onSubmit={handleSendAnonymousMessage}>
                  <div className="chat-input-wrapper">
                    <textarea
                      id="anonymous-chat-input"
                      autoComplete="off"
                      placeholder="Type a message..."
                      className="chat-text-input"
                      style={{ resize: 'none', minHeight: '44px', maxHeight: '120px', lineHeight: '24px', overflowY: 'auto' }}
                      value={newMessage}
                      rows={1}
                      onInput={(e) => {
                        e.target.style.height = 'auto';
                        e.target.style.height = `${e.target.scrollHeight}px`;
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (newMessage.trim()) {
                            handleSendAnonymousMessage(e);
                            e.target.style.height = 'auto';
                          }
                        }
                      }}
                      onChange={(e) => {
                        setNewMessage(e.target.value);
                        if (socket && anonymousRoomId && isAnonymousChatActive) {
                          socket.emit('send_anonymous_typing', { roomId: anonymousRoomId, isTyping: true });
                          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                          typingTimeoutRef.current = setTimeout(() => {
                            socket.emit('send_anonymous_typing', { roomId: anonymousRoomId, isTyping: false });
                          }, 2000);
                        }
                      }}
                      required
                    />
                    {newMessage.trim() && (
                      <button type="submit" className="chat-send-btn" onPointerDown={(e) => e.preventDefault()}><Send size={18} /></button>
                    )}
                  </div>
                </form>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: '#a8a8a8', background: 'var(--bg-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                  <div>Chat has ended.</div>
                  {anonymousPartnerId && !isAiCompanion && (
                    <button 
                      className="premium-btn primary" 
                      style={{ fontSize: '0.85rem', padding: '8px 16px', display: 'flex', alignItems: 'center' }}
                      onClick={handleSendAnonymousFriendRequest}
                    >
                      <UserPlus size={16} style={{ marginRight: '6px' }} /> Add Friend (5 <CoinSVG size={12} style={{marginLeft: '2px'}}/>)
                    </button>
                  )}
                  <button onClick={handleLeaveAnonymousChat} style={{ background: 'none', border: 'none', color: 'var(--brand-blue)', cursor: 'pointer', fontWeight: 'bold' }}>Return Home</button>
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
              <div style={{ textAlign: 'center', color: '#a8a8a8', marginTop: '20px' }}>No notifications yet.</div>
            ) : (
              <div className="requests-list">
                {notifications.map(notif => {
                  if (notif.type === 'system_alert') {
                    return (
                      <div className="user-card" key={notif._id} style={{ borderLeft: '4px solid #f59e0b', background: '#1a1a1a' }}>
                        <div className="user-card-info" style={{ cursor: 'default' }}>
                          <div className="user-avatar-small" style={{ background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                             <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                          </div>
                          <div className="user-names">
                            <span className="user-username" style={{ color: '#f59e0b' }}>Twelo Team</span>
                            <span className="user-id" style={{ fontSize: '0.9rem', color: '#eee', marginTop: '4px' }}>{notif.message}</span>
                            <span style={{ fontSize: '0.7rem', color: '#888', marginTop: '4px' }}>{new Date(notif.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  const reqUser = notif.user;
                  if (!reqUser) return null;
                  const isAccepted = profileStats?.followers?.includes(reqUser._id);
                  const isFollowingBack = profileStats?.following?.includes(reqUser._id);
                  const hasSentFollowBack = notif.followBackRequested === true;
                  const text = notif.type === 'request_accepted' ? 'accepted your follow request' : 'wants to follow you';
                  
                  return (
                    <div className="user-card" key={notif._id}>
                      <div className="user-card-info" onClick={() => viewPublicProfile(reqUser._id)} style={{ cursor: 'pointer' }}>
                        <div className="user-avatar-small">{reqUser.avatarUrl ? <img src={reqUser.avatarUrl} alt='avatar' /> : reqUser.username.charAt(0).toUpperCase()}</div>
                        <div className="user-names">
                          <span className="user-username">@{reqUser.username}</span>
                          <span className="user-id" style={{ fontSize: '0.8rem' }}>{text}</span>
                        </div>
                      </div>
                      {notif.type === 'request_accepted' ? (
                        <button className="chat-now-btn" style={{ background: 'var(--brand-blue)' }} onClick={() => startChatWithUser(reqUser)}>Chat</button>
                      ) : isAccepted ? (
                        isFollowingBack ? (
                          <button className="chat-now-btn" style={{ background: 'var(--brand-blue)' }} onClick={() => startChatWithUser(reqUser)}>Chat</button>
                        ) : hasSentFollowBack ? (
                          <button className="chat-now-btn" style={{ background: '#333', cursor: 'default' }} disabled>Request Sent</button>
                        ) : (
                          <button className="chat-now-btn" style={{ background: '#10b981' }} onClick={() => sendFollowRequest(reqUser._id)}>Follow Back</button>
                        )
                      ) : (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="chat-now-btn accept-btn" style={{ flex: 1 }} onClick={() => acceptRequest(reqUser._id)}>Accept</button>
                          <button className="chat-now-btn" style={{ flex: 1, background: '#333' }} onClick={() => rejectRequest(reqUser._id)}>Reject</button>
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
        if (publicProfileData.isLoading) {
          return (
            <div className="profile-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
              <div style={{ color: '#a8a8a8' }}>Loading...</div>
            </div>
          );
        }
        const isFollowing = profileStats?.following?.includes(publicProfileData._id);
        const hasRequested = publicProfileData.friendRequests?.includes(user.id);
        
        return (
          <div className="profile-container">
            <div className="profile-card">
              <button 
                onClick={() => {
                  if (activeChatUser) {
                    setActiveTab('messages');
                  } else {
                    setActiveTab('search');
                  }
                }} 
                className="back-btn" 
                style={{ position: 'absolute', top: 0, left: 0, border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer', zIndex: 10 }}
              >
                ←
              </button>
              <div className="profile-avatar-large">
                <div className="profile-avatar-inner">{publicProfileData.avatarUrl ? <img src={publicProfileData.avatarUrl} alt='avatar' /> : publicProfileData.username.charAt(0).toUpperCase()}</div>
                {publicProfileData.country && (
                  <div style={{ position: 'absolute', bottom: '0', right: '-10px', fontSize: '1.5rem', background: '#222', borderRadius: '50%', padding: '4px', border: '2px solid #000' }}>
                    {getFlagEmoji(publicProfileData.country)}
                  </div>
                )}
              </div>
              <div className="profile-info">
                <span className="profile-username">@{publicProfileData.username}</span>
                <div style={{ fontSize: '0.85rem', color: onlineUsers.includes(publicProfileData._id) ? '#2bd856' : '#a8a8a8', marginTop: '4px' }}>
                  {onlineUsers.includes(publicProfileData._id) ? '🟢 Online' : `Last active: ${timeSince(publicProfileData.lastActive)}`}
                </div>
                <div className="profile-stats">
                  <span style={{ cursor: 'pointer' }} onClick={() => handleConnectionsClick('followers', publicProfileData._id)}><strong>{publicProfileData.followers?.length || 0}</strong> followers</span>
                  <span style={{ cursor: 'pointer' }} onClick={() => handleConnectionsClick('following', publicProfileData._id)}><strong>{publicProfileData.following?.length || 0}</strong> following</span>
                </div>
                <div className="profile-actions">
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
                {publicProfileData.age && publicProfileData.gender && (
                  <div className="profile-demographics">
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontSize: '1.2rem', marginBottom: '4px' }}>🎂</span>
                      <span>{publicProfileData.age} Yrs</span>
                    </div>
                    <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textTransform: 'capitalize' }}>
                      <span style={{ fontSize: '1.2rem', marginBottom: '4px' }}>{publicProfileData.gender === 'male' ? '👨' : '👩'}</span>
                      <span>{publicProfileData.gender}</span>
                    </div>
                  </div>
                )}
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
                        {typingUsers[chatUser._id] ? (
                          <span style={{ fontSize: '0.75rem', color: 'var(--brand-blue)', fontStyle: 'italic', fontWeight: 'bold' }}>
                            typing...
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: isOnline ? '#2bd856' : '#a8a8a8' }}>
                            {isOnline ? 'online' : 'offline'}
                          </span>
                        )}
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
                          setActiveChatUser(null);
                          setActiveTab('messages'); // Back to chats list
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
                      <button 
                        className="action-icon-btn" 
                        onClick={handleDeleteChat}
                        title="Delete Chat"
                        style={{ color: '#ff4b4b' }}
                      >
                        <Trash2 size={20} />
                      </button>
                      <button 
                        className="action-icon-btn" 
                        onClick={() => {
                          setReportTarget({ id: activeChatUser._id, username: activeChatUser.username, isAnonymous: false });
                          setShowReportModal(true);
                        }} 
                        title="Report User"
                        style={{ color: '#ff4b4b' }}
                      >
                        <Flag size={20} />
                      </button>
                      <button className="action-icon-btn call-audio" onClick={() => callUser(activeChatUser._id, activeChatUser.username, false)}><Phone size={22} /></button>
                      <button className="action-icon-btn call-video" onClick={() => callUser(activeChatUser._id, activeChatUser.username, true)}><Video size={22} /></button>
                    </div>
                  </div>

                  <div className="chat-messages-area">
                    {messages.map((msg) => (
                      <div key={msg._id} className={`msg-wrapper ${msg.sender === user.id ? 'sent' : 'received'}`} 
                        onTouchStart={(e) => handleTouchStart(e, msg)}
                        onTouchMove={(e) => handleTouchMove(e, msg, msg.sender === user.id)}
                        onTouchEnd={(e) => handleTouchEnd(e, msg, msg.sender === user.id)}
                      >
                        <div id={`msg-bubble-${msg._id}`} className="msg-bubble">
                          {msg.replyTo && (
                            <div className="msg-reply-box" onClick={() => {
                               const el = document.getElementById(`msg-bubble-${msg.replyTo.messageId}`);
                               if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }}>
                              <div className="reply-preview">
                                <span className="reply-sender">{msg.replyTo.senderName}</span>
                                <p>{msg.replyTo.messageText || (msg.replyTo.messageType === 'image' ? '📷 Photo' : '🎤 Voice Note')}</p>
                              </div>
                            </div>
                          )}

                          {msg.messageType === 'image' && (
                            <div className="msg-image-container" style={{ marginTop: '5px', marginBottom: '5px' }}>
                              {msg.isViewOnce ? (
                                msg.isViewed ? (
                                  <div style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', color: '#a8a8a8' }}>
                                    <ImageIcon size={18} /> Opened
                                  </div>
                                ) : (
                                  <button onClick={() => {
                                    if (msg.sender !== user.id) {
                                      socket.emit('mark_viewed', { messageId: msg._id, receiverId: user.id, senderId: msg.sender });
                                      msg.isViewed = true; // Optimistic update
                                    }
                                    setFullScreenMedia(msg.fileUrl.startsWith('http') ? msg.fileUrl : `${API_URL}${msg.fileUrl}`);
                                  }} style={{ padding: '10px 20px', background: 'var(--brand-blue)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', border: 'none', cursor: 'pointer' }}>
                                    <ImageIcon size={18} /> View Photo
                                  </button>
                                )
                              ) : (
                                <img 
                                  src={msg.fileUrl.startsWith('http') ? msg.fileUrl : `${API_URL}${msg.fileUrl}`} 
                                  alt="Sent Photo" 
                                  style={{ maxWidth: '100%', borderRadius: '10px', cursor: 'pointer' }} 
                                  onClick={() => setFullScreenMedia(msg.fileUrl.startsWith('http') ? msg.fileUrl : `${API_URL}${msg.fileUrl}`)}
                                />
                              )}
                            </div>
                          )}

                          {msg.messageType === 'audio' && (
                            <div className="msg-audio-container" style={{ marginTop: '5px', marginBottom: '5px' }}>
                              <audio controls src={msg.fileUrl.startsWith('http') ? msg.fileUrl : `${API_URL}${msg.fileUrl}`} style={{ width: '200px', height: '40px' }} />
                            </div>
                          )}
                          
                          <p className="msg-text">{msg.message}</p>
                          <div className="msg-time" style={{ display: 'flex', alignItems: 'center', justifyContent: msg.sender === user.id ? 'flex-end' : 'flex-start', gap: '4px' }}>
                            <span>{formatTime(msg.createdAt)}</span>
                            {msg.sender === user.id && (
                              <span style={{ fontSize: '0.65rem', opacity: 0.8, fontWeight: 'bold' }}>
                                {msg.isViewed ? `✓ ${formatSeenTime(msg.viewedAt)}` : '✓ Sent'}
                              </span>
                            )}
                          </div>
                        </div>
                        {swipeMsgId === msg._id && (
                          <div className={`swipe-reply-icon ${msg.sender === user.id ? 'sent-icon' : 'received-icon'}`}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7"></polyline><path d="M20 18v-2a4 4 0 0 0-4-4H4"></path></svg>
                          </div>
                        )}
                        
                        {/* Context Menu for Delete */}
                        {contextMenu.visible && contextMenu.msgId === msg._id && (
                          <div className="msg-context-menu">
                            <button onClick={() => deleteMessage('me')} className="context-btn"><Trash2 size={14} /> Delete for me</button>
                            {contextMenu.isSender && (
                              <button onClick={() => deleteMessage('everyone')} className="context-btn" style={{ color: '#ff4b4b' }}><Trash2 size={14} /> Delete for everyone</button>
                            )}
                            <button onClick={() => setContextMenu({ visible: false, msgId: null, isSender: false })} className="context-btn"><X size={14} /> Cancel</button>
                          </div>
                        )}
                      </div>
                    ))}
                    {partnerTyping && (
                      <div className="msg-wrapper received">
                        <div className="msg-bubble" style={{ opacity: 0.7, padding: '8px 12px', fontSize: '0.85rem', color: '#a8a8a8', fontStyle: 'italic', background: 'rgba(255,255,255,0.05)' }}>
                          @{activeChatUser.username} is typing...
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <form className="chat-input-area" onSubmit={handleSendMessage}>
                    {replyingTo && (
                      <div className="replying-to-banner">
                        <div className="reply-content">
                          <div className="reply-sender">{replyingTo.sender === user.id ? 'You' : activeChatUser.username}</div>
                          <div className="reply-text">{replyingTo.message}</div>
                        </div>
                        <button type="button" className="close-reply-btn" onClick={() => setReplyingTo(null)}><X size={20} /></button>
                      </div>
                    )}
                    <div className="chat-input-wrapper">
                      {isRecording && (
                        <div className="recording-indicator" style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ff4b4b', padding: '0 10px', flex: 1 }}>
                          <div className="recording-dot" style={{ width: '10px', height: '10px', background: '#ff4b4b', borderRadius: '50%', animation: 'pulse 1s infinite' }} />
                          {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                        </div>
                      )}
                      
                      {!isRecording && (
                        <div style={{ display: 'flex', alignItems: 'center', flex: 1, position: 'relative' }}>
                          <button type="button" className="media-btn" onClick={() => cameraInputRef.current.click()} style={{ background: 'transparent', border: 'none', cursor: 'pointer', position: 'absolute', left: '10px', zIndex: 10 }}>
                            <Camera size={20} color="#a8a8a8" />
                          </button>
                          <input 
                            type="file" 
                            id="camera-input"
                            accept="image/jpeg, image/png, image/webp" 
                            capture="environment"
                            ref={cameraInputRef} 
                            style={{ display: 'none' }} 
                            onChange={handleImageSelect} 
                          />
                          <textarea
                            id="chat-input"
                            autoComplete="off"
                            placeholder="Message..."
                            className="chat-text-input"
                            style={{ paddingLeft: '40px', resize: 'none', minHeight: '44px', maxHeight: '120px', lineHeight: '24px', overflowY: 'auto' }}
                            value={newMessage}
                            rows={1}
                            onInput={(e) => {
                              e.target.style.height = 'auto';
                              e.target.style.height = `${e.target.scrollHeight}px`;
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                if (newMessage.trim()) {
                                  handleSendMessage(e);
                                  e.target.style.height = 'auto';
                                }
                              }
                            }}
                            onChange={(e) => {
                              setNewMessage(e.target.value);
                              if (socket && activeChatUser) {
                                socket.emit('typing_status', { senderId: user.id, receiverId: activeChatUser._id, isTyping: true });
                                if (chatTypingTimeoutRef.current) clearTimeout(chatTypingTimeoutRef.current);
                                chatTypingTimeoutRef.current = setTimeout(() => {
                                  if (socket && activeChatUserRef.current) {
                                    socket.emit('typing_status', { senderId: user.id, receiverId: activeChatUserRef.current._id, isTyping: false });
                                  }
                                }, 2000);
                              }
                            }}
                            onFocus={() => {
                              setTimeout(() => {
                                window.scrollTo({ top: 0, behavior: 'instant' });
                                document.body.scrollTop = 0;
                              }, 100);
                              setTimeout(() => {
                                window.scrollTo({ top: 0, behavior: 'instant' });
                              }, 300);
                            }}
                          />
                        </div>
                      )}

                      {!newMessage.trim() && !isRecording && (
                        <div className="media-actions" style={{ display: 'flex', gap: '10px', paddingRight: '10px', alignItems: 'center' }}>
                          <button type="button" className="media-btn" onClick={() => fileInputRef.current.click()} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                            <ImageIcon size={20} color="#a8a8a8" />
                          </button>
                          <input 
                            type="file" 
                            accept="image/jpeg, image/png, image/webp" 
                            ref={fileInputRef} 
                            style={{ display: 'none' }} 
                            onChange={handleImageSelect} 
                          />
                          <button type="button" className="media-btn" onClick={startRecording} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                            <Mic size={20} color="#a8a8a8" />
                          </button>
                        </div>
                      )}

                      {isRecording && (
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button type="button" className="chat-send-btn" onClick={cancelRecording} style={{ background: 'transparent', color: '#ff4b4b' }}>
                            <Trash2 size={20} />
                          </button>
                          <button type="button" className="chat-send-btn" onClick={stopRecording} style={{ background: '#2bd856', color: 'white' }}>
                            <Send size={18} />
                          </button>
                        </div>
                      )}

                      {newMessage.trim() && !isRecording && (
                        <button type="submit" className="chat-send-btn" disabled={isUploading} onPointerDown={(e) => e.preventDefault()}>
                          {isUploading ? <span style={{ fontSize: '12px' }}>...</span> : <Send size={18} />}
                        </button>
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
              <div className="profile-avatar-large" style={{ position: 'relative' }}>
                <div className="profile-avatar-inner">
                  {(profileStats?.avatarUrl || user.avatarUrl) ? <img src={profileStats?.avatarUrl || user.avatarUrl} alt='avatar' /> : user.username.charAt(0).toUpperCase()}
                </div>
                {(profileStats?.country || user.country) && (
                  <div style={{ position: 'absolute', bottom: '0', right: '-10px', fontSize: '1.5rem', background: '#222', borderRadius: '50%', padding: '4px', border: '2px solid #000' }}>
                    {getFlagEmoji(profileStats?.country || user.country)}
                  </div>
                )}
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

                {(profileStats?.age || user.age) && (profileStats?.gender || user.gender) && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', margin: '20px 0', color: '#a8a8a8', fontSize: '0.9rem', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontSize: '1.2rem', marginBottom: '4px' }}>🎂</span>
                      <span>{profileStats?.age || user.age} Yrs</span>
                    </div>
                    <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textTransform: 'capitalize' }}>
                      <span style={{ fontSize: '1.2rem', marginBottom: '4px' }}>{(profileStats?.gender || user.gender) === 'male' ? '👨' : '👩'}</span>
                      <span>{profileStats?.gender || user.gender}</span>
                    </div>
                  </div>
                )}

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

  const totalUnreadUsers = Object.values(unreadMessages).filter(count => count > 0).length;

  return (
    <div className="dashboard-container">
      {/* Globe always mounted to prevent WebGL context loss / black screen */}
      <div style={{
        position: 'fixed', top: '-5vh', left: '0', width: '100%', height: '130vh', zIndex: 0,
        transform: 'scale(1.1)',
        display: activeTab === 'home' ? 'block' : 'none',
        pointerEvents: activeTab === 'home' ? 'auto' : 'none'
      }}>
        {globeComponent}
      </div>
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
              {totalUnreadUsers > 0 && <span className="sidebar-badge">{totalUnreadUsers}</span>}
            </div>
            <div className={`nav-item ${activeTab === 'earn' ? 'active' : ''}`} onClick={() => setActiveTab('earn')}>
              <Gift size={24} color="#FFD700" /><span>Earn Coins</span>
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

      <main 
        className={`main-content ${(activeTab === 'home' || activeTab === 'messages') ? 'no-scroll' : ''}`}
        style={{ pointerEvents: activeTab === 'home' ? 'none' : 'auto' }}
      >
        {renderTabContent()}
      </main>

      <nav className={`mobile-nav ${(activeChatUser && activeTab === 'messages') ? 'hide-on-mobile' : ''}`}>
        <div className={`nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}><HomeIcon size={24} /></div>
        <div className={`nav-item ${activeTab === 'search' ? 'active' : ''}`} onClick={() => setActiveTab('search')}><SearchIcon size={24} /></div>
        <div className={`nav-item ${activeTab === 'earn' ? 'active' : ''}`} onClick={() => setActiveTab('earn')}><Gift size={24} color={activeTab === 'earn' ? '#fff' : '#FFD700'} /></div>
        <div className={`nav-item ${activeTab === 'messages' ? 'active' : ''}`} onClick={() => setActiveTab('messages')} style={{ position: 'relative' }}>
          <MessageSquare size={24} />
          {totalUnreadUsers > 0 && <span className="badge">{totalUnreadUsers}</span>}
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
              
              <button className="settings-item-btn" onClick={() => navigate('/privacy-policy')}>
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
            <div className="video-call-controls" style={{
              position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)',
              display: 'flex', gap: '20px', background: 'rgba(0,0,0,0.5)', padding: '15px 30px', borderRadius: '40px', backdropFilter: 'blur(10px)'
            }}>
              <button className="call-action-btn" style={{ background: 'rgba(255,255,255,0.2)' }} onClick={toggleAudio} title="Toggle Audio">
                {isAudioMuted ? <MicOff size={24} color="#ff4b4b" /> : <Mic size={24} />}
              </button>
              {isVideoCall && (
                <>
                  <button className="call-action-btn" style={{ background: 'rgba(255,255,255,0.2)' }} onClick={toggleVideo} title="Toggle Video">
                    {isVideoOff ? <VideoOff size={24} color="#ff4b4b" /> : <Video size={24} />}
                  </button>
                  <button className="call-action-btn" style={{ background: 'rgba(255,255,255,0.2)' }} onClick={switchCamera} title="Switch Camera">
                    <SwitchCamera size={24} />
                  </button>
                </>
              )}
              <button className="call-action-btn decline" onClick={endCall} title="End Call"><PhoneOff size={28} /></button>
            </div>
          </div>
        </div>
      )}

      {/* Ringtones */}
      <audio ref={ringtoneOutRef} loop src="/ringtone.wav" style={{ display: 'none' }} />
      <audio ref={ringtoneInRef} loop src="/incoming.wav" style={{ display: 'none' }} />
      {/* Full Screen Media Viewer */}
      {fullScreenMedia && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ position: 'absolute', top: '20px', right: '20px', display: 'flex', gap: '15px' }}>
            <button onClick={() => downloadMedia(fullScreenMedia)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            </button>
            <button onClick={() => setFullScreenMedia(null)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
              <X size={28} />
            </button>
          </div>
          <img src={fullScreenMedia} alt="Full Screen" style={{ maxWidth: '95%', maxHeight: '90%', objectFit: 'contain' }} />
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.95)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
            <button onClick={cancelImageSend} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
              <X size={28} />
            </button>
          </div>
          <img src={URL.createObjectURL(previewImage)} alt="Preview" style={{ maxWidth: '90%', maxHeight: '70%', borderRadius: '10px', objectFit: 'contain' }} />
          
          <div style={{ marginTop: '30px', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#fff', cursor: 'pointer', fontSize: '1.1rem' }}>
              <input 
                type="checkbox" 
                checked={isViewOnce} 
                onChange={(e) => setIsViewOnce(e.target.checked)} 
                style={{ width: '20px', height: '20px' }}
              />
              Send as View Once (Disappears after opening)
            </label>
            <button onClick={confirmSendImage} disabled={isUploading} style={{ background: 'var(--brand-blue)', color: '#fff', padding: '15px 40px', borderRadius: '30px', border: 'none', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
              {isUploading ? 'Sending...' : <><Send size={20} /> Send Photo</>}
            </button>
          </div>
        </div>
      )}

      {showReportModal && (
        <div className="modal-overlay" onClick={() => !isSubmittingReport && !reportSuccess && setShowReportModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Report {reportTarget?.username}</h2>
              <button className="icon-btn" onClick={() => !isSubmittingReport && !reportSuccess && setShowReportModal(false)}><X size={24} /></button>
            </div>
            {reportSuccess ? (
              <div style={{ padding: '30px 0', textAlign: 'center' }}>
                <Check size={48} color="#10b981" style={{ marginBottom: '15px' }} />
                <h3 style={{ color: '#10b981' }}>Report Submitted</h3>
                <p style={{ color: '#a8a8a8', marginTop: '10px' }}>Our team will review this chat shortly.</p>
              </div>
            ) : (
              <div style={{ padding: '20px 0' }}>
                <p style={{ color: '#a8a8a8', marginBottom: '15px', fontSize: '0.9rem' }}>
                  Please select a reason for reporting. A snapshot of your current chat will be securely sent to our admin team for review.
                </p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {['Sexual Harassment', 'Spam / Scams', 'Abuse / Insult', 'Other Inappropriate Behavior'].map(reason => (
                    <label key={reason} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#1a1a1a', padding: '12px', borderRadius: '8px', cursor: 'pointer', border: reportReason === reason ? '1px solid var(--brand-blue)' : '1px solid #333' }}>
                      <input 
                        type="radio" 
                        name="reportReason" 
                        value={reason} 
                        checked={reportReason === reason} 
                        onChange={() => setReportReason(reason)}
                        style={{ accentColor: 'var(--brand-blue)', width: '18px', height: '18px' }}
                      />
                      <span style={{ color: '#fff' }}>{reason}</span>
                    </label>
                  ))}
                </div>
                
                <button 
                  onClick={handleReportSubmit} 
                  disabled={isSubmittingReport}
                  className="btn-primary" 
                  style={{ width: '100%', marginTop: '20px', background: '#ff4b4b', color: 'white' }}
                >
                  {isSubmittingReport ? <Loader2 className="spin" size={20} /> : 'Submit Report'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ad Modal */}
      {showAdModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: '#000', zIndex: 10000, display: 'flex', flexDirection: 'column'
        }}>
          {/* Top Bar for Ad */}
          <div style={{ padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.5)', position: 'absolute', top: 0, width: '100%', zIndex: 10 }}>
            <div style={{ color: '#fff', fontSize: '1rem', fontWeight: 'bold' }}>
              Reward in {adTimeLeft}s
            </div>
            {adCompleted ? (
              <button onClick={() => setShowAdModal(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            ) : (
              <div style={{ width: '40px', height: '40px' }} /> /* Placeholder to keep alignment */
            )}
          </div>
          
          {/* Ad Video */}
          <video 
            ref={videoRef}
            src="http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" 
            autoPlay 
            muted 
            playsInline
            loop
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />

          {/* Reward Screen Overlay */}
          {adCompleted && (
            <div style={{
              position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
              background: 'rgba(0,0,0,0.8)', zIndex: 5, display: 'flex', flexDirection: 'column',
              justifyContent: 'center', alignItems: 'center', color: '#fff'
            }}>
              <CoinSVG size={80} />
              <h2 style={{ marginTop: '20px', fontSize: '2rem', color: '#FFD700' }}>Reward Granted!</h2>
              <p style={{ fontSize: '1.2rem' }}>You earned 5 coins.</p>
              <button 
                onClick={() => setShowAdModal(false)}
                style={{ marginTop: '30px', padding: '15px 40px', fontSize: '1.2rem', fontWeight: 'bold', background: 'linear-gradient(45deg, #00c6ff, #0072ff)', border: 'none', borderRadius: '30px', color: '#fff', cursor: 'pointer' }}
              >
                Close Ad
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

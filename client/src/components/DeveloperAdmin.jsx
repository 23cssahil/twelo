import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../App';
import { useNavigate, Link } from 'react-router-dom';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import { Users, Search, Ban, Send, Lock, Globe, MessageSquare, AlertTriangle, Trash2, Filter, RefreshCcw, Flag, X, CheckCircle, BarChart2, Activity, Radio, UserPlus, UserCheck, Phone, Video, VideoOff, Mic, MicOff, PhoneOff, Clock } from 'lucide-react';
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
  ArcElement
} from 'chart.js';
import AdminStoryCreator from './AdminStoryCreator';
import AdminStoryManager from './AdminStoryManager';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// HH:MM:SS from a millisecond remainder (for the auto-online countdown).
function formatCountdown(ms) {
  const total = Math.max(0, Math.floor((ms || 0) / 1000));
  const p = (n) => String(n).padStart(2, '0');
  return `${p(Math.floor(total / 3600))}:${p(Math.floor((total % 3600) / 60))}:${p(total % 60)}`;
}

// Same STUN/TURN set the user app uses, so admin calls traverse NAT reliably.
const CALL_ICE = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:global.stun.twilio.com:3478' },
    { urls: 'turn:a.relay.metered.ca:80', username: 'e8dd65b92f6daa8a0f279a8c', credential: '2VnE1hXNPHqOIUkd' },
    { urls: 'turn:a.relay.metered.ca:80?transport=tcp', username: 'e8dd65b92f6daa8a0f279a8c', credential: '2VnE1hXNPHqOIUkd' },
    { urls: 'turn:a.relay.metered.ca:443', username: 'e8dd65b92f6daa8a0f279a8c', credential: '2VnE1hXNPHqOIUkd' },
    { urls: 'turns:a.relay.metered.ca:443?transport=tcp', username: 'e8dd65b92f6daa8a0f279a8c', credential: '2VnE1hXNPHqOIUkd' }
  ]
};

function formatCallDuration(sec) {
  const s = Math.max(0, sec | 0);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(Math.floor(s / 60))}:${p(s % 60)}`;
}

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
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastTopic, setBroadcastTopic] = useState('');
  const [broadcastType, setBroadcastType] = useState('info');
  const [autoFooter, setAutoFooter] = useState(true);
  const [showBlockedOnly, setShowBlockedOnly] = useState(false);
  const [showAdminStoryUI, setShowAdminStoryUI] = useState(false);

  const [activeTab, setActiveTab] = useState('users');
  const [growthTimeframe, setGrowthTimeframe] = useState('monthly');
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [warnNotice, setWarnNotice] = useState('');
  const [sendingWarn, setSendingWarn] = useState(false);
  const [resolvingReport, setResolvingReport] = useState(false);

  const [chatViewTarget, setChatViewTarget] = useState(null);
  const [selectedUserChats, setSelectedUserChats] = useState(null);
  const [isFetchingChats, setIsFetchingChats] = useState(false);

  const [activeRandomChat, setActiveRandomChat] = useState(null);
  const activeRandomChatRef = React.useRef(activeRandomChat);
  const [randomMessages, setRandomMessages] = useState([]);
  const [randomMessageInput, setRandomMessageInput] = useState('');

  const [globeStatus, setGlobeStatus] = useState({ isEnabled: true, customMessage: 'Globe is currently offline.', enableAt: null });
  const [globeTimerMinutes, setGlobeTimerMinutes] = useState('');
  const [globeSaving, setGlobeSaving] = useState(false);
  const [globeMsg, setGlobeMsg] = useState({ text: '', ok: true });
  const [globeTick, setGlobeTick] = useState(Date.now());

  // Sync ref with state
  useEffect(() => {
    activeRandomChatRef.current = activeRandomChat;
  }, [activeRandomChat]);

  // Drive the auto-online countdown while the globe is offline with a timer set.
  useEffect(() => {
    if (!globeStatus.isEnabled && globeStatus.enableAt) {
      const id = setInterval(() => setGlobeTick(Date.now()), 1000);
      return () => clearInterval(id);
    }
  }, [globeStatus.isEnabled, globeStatus.enableAt]);

  const [totalStories, setTotalStories] = useState(0);
  const [totalChats, setTotalChats] = useState(0);
  const [showStoryManager, setShowStoryManager] = useState(false);
  const [botRequests, setBotRequests] = useState([]);
  const [botChats, setBotChats] = useState([]);
  const [selectedBotChat, setSelectedBotChat] = useState(null);
  const selectedBotChatRef = useRef(null);
  const botMessagesEndRef = useRef(null);
  const [unreadBotChats, setUnreadBotChats] = useState(new Set());
  const [botChatMessages, setBotChatMessages] = useState([]);
  const [botChatMessageInput, setBotChatMessageInput] = useState('');

  // ── Live Random page state ──
  const [liveQueue, setLiveQueue] = useState([]);            // waiting users board (max 10, newest first)
  const [adminRightTab, setAdminRightTab] = useState('requests'); // requests | friends | chats
  const [showRightList, setShowRightList] = useState(false); // drawer open on the right pane
  const [conversations, setConversations] = useState([]);    // recent chats with previews
  const [identityForm, setIdentityForm] = useState(null);    // { botId, userId, requesterName, name, username, age, country, gender, bio }
  const [identitySaving, setIdentitySaving] = useState(false);
  const [liveTick, setLiveTick] = useState(Date.now());      // re-renders the "waiting Xs" labels every second
  const [requestToast, setRequestToast] = useState(null);    // transient toast when a new bot request arrives

  // ── Admin WebRTC call state ──
  const [adminCall, setAdminCall] = useState(null);   // { active, incoming, isVideo, peerUserId, peerSocketId, peerUsername, peerAvatar, botId, botUsername }
  const [callAccepted, setCallAccepted] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const adminMyVideoRef = useRef(null);
  const adminRemoteVideoRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const callerSignalRef = useRef(null);
  const callAcceptedRef = useRef(false);
  const callTimeoutRef = useRef(null);
  const [followedIds, setFollowedIds] = useState(new Set()); // user ids the admin bot is already connected to
  const [requestedUserIds, setRequestedUserIds] = useState(new Set()); // user ids the bot has a pending follow request to
  const [blockedIds, setBlockedIds] = useState(new Set());   // user ids blocked by the admin bot



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
      fetchReports(); // load pending reports so the User Reports badge shows without opening the tab
      fetchBotRequests(); // load pending bot requests so the Live Random badge shows without opening the tab
      const interval = setInterval(() => { fetchStats(); fetchReports(); }, 10000); // Poll every 10s
      
      fetch(`${API_URL}/api/config/globe`)
        .then(res => res.json())
        .then(data => setGlobeStatus(data))
        .catch(e => console.error(e));

      
      const newSocket = io(API_URL);
      setAdminSocket(newSocket);

      newSocket.on('connect', () => {
        newSocket.emit('admin_online');
      });
        
      newSocket.on('admin_random_queue', (arr) => {
        setLiveQueue(Array.isArray(arr) ? arr : []);
      });

      // Real-time: a user just sent a request to one of the admin's bots.
      newSocket.on('admin_new_bot_request', (data) => {
        fetchBotRequests(); // refresh pending list + badge immediately, no page refresh needed
        const rn = data && data.requester ? data.requester.username : 'Someone';
        const bn = data && data.bot ? data.bot.username : 'you';
        setRequestToast({ text: `🔔 @${rn} ne @${bn} ko request bheji`, ts: Date.now() });
      });

      // Real-time: a user accepted one of the bot's follow requests -> refresh contacts.
      newSocket.on('admin_bots_updated', () => {
        fetchBotChats();
        fetchConversations();
      });

      // ── Admin call signaling (a real user is calling one of the admin's bots) ──
      newSocket.on('admin_incoming_call', ({ signal, from, fromSocketId, fromUsername, fromAvatar, isVideo, botId, botUsername }) => {
        if (signal && signal.type === 'offer') {
          callerSignalRef.current = signal;
          pendingCandidatesRef.current = [];
          callAcceptedRef.current = false;
          setCallAccepted(false);
          setAdminCall({ active: true, incoming: true, isVideo, peerUserId: String(from), peerSocketId: fromSocketId, peerUsername: fromUsername, peerAvatar: fromAvatar, botId, botUsername });
        } else if (signal && signal.candidate) {
          if (peerRef.current) peerRef.current.signal(signal);
          else pendingCandidatesRef.current.push(signal);
        }
      });

      newSocket.on('call_accepted', (signal) => {
        callAcceptedRef.current = true;
        setCallAccepted(true);
        if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null; }
        if (peerRef.current && signal) peerRef.current.signal(signal);
      });

      newSocket.on('call_ended', () => { resetAdminCall(); });
      newSocket.on('call_failed', () => { alert('User is unavailable right now.'); resetAdminCall(); });

      newSocket.on('admin_intercept_started', (data) => {
        setActiveRandomChat(data);
        setRandomMessages([]);
        setShowRightList(false); // jump straight to the intercepted chat
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
        newSocket.off('admin_random_queue');
        newSocket.off('admin_new_bot_request');
        newSocket.off('admin_bots_updated');
        newSocket.off('admin_intercept_started');
        newSocket.off('receive_anonymous_message');
        newSocket.off('receive_message');
        newSocket.off('anonymous_chat_ended');
        newSocket.off('globe_status_update');
        newSocket.off('admin_incoming_call');
        newSocket.off('call_accepted');
        newSocket.off('call_ended');
        newSocket.off('call_failed');
        stopAdminCallMedia();
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

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/admin/stats`, {
        headers: { 'x-admin-pass': password }
      });
      if (res.ok) {
        setIsAuthenticated(true);
      } else {
        alert('Incorrect Developer Password');
      }
    } catch (err) {
      alert('Network Error. Is backend running?');
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
    if (!broadcastMessage.trim() || !broadcastTopic.trim()) {
      alert("Topic and message are required.");
      return;
    }

    const typeIcons = {
      info: 'ℹ️',
      warning: '⚠️',
      success: '✅',
      urgent: '🚨'
    };
    
    const icon = typeIcons[broadcastType] || '📢';
    let finalMessage = `${icon} **${broadcastTopic.toUpperCase()}**\n\n${broadcastMessage}`;
    
    if (autoFooter) {
      finalMessage += `\n\nThank you,\nTwelo Administration`;
    }

    try {
      await fetch(`${API_URL}/api/admin/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-pass': password },
        body: JSON.stringify({ message: finalMessage, alertType: broadcastType })
      });
      setBroadcastMessage('');
      setBroadcastTopic('');
      setShowBroadcastModal(false);
      alert("Broadcast sent successfully!");
    } catch (err) {
      alert("Error sending broadcast");
    }
  };

  // Persist a globe change and refresh local state from the authoritative response
  // (the server returns the effective status + remainingMs, so the UI never drifts).
  const saveGlobe = async (payload, successMsg) => {
    setGlobeSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/globe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-pass': password },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('request failed');
      const data = await res.json();
      setGlobeStatus(data);
      setGlobeTick(Date.now());
      setGlobeMsg({ text: successMsg || 'Globe status updated.', ok: true });
    } catch (err) {
      setGlobeMsg({ text: 'Error updating globe status', ok: false });
    } finally {
      setGlobeSaving(false);
    }
  };

  const bringGlobeOnline = () => saveGlobe({ isEnabled: true }, 'Globe is now ONLINE — random matching enabled.');
  const takeGlobeOffline = (minutes) => {
    const mins = parseInt(minutes, 10);
    if (!mins || mins <= 0) {
      // No duration given: while already offline, just persist a message edit (the
      // server keeps the existing auto-restore time). Otherwise ask for a duration.
      if (!globeStatus.isEnabled) { saveGlobe({ isEnabled: false, customMessage: globeStatus.customMessage }, 'Offline message updated.'); return; }
      setGlobeMsg({ text: 'Choose or enter a duration first.', ok: false }); return;
    }
    saveGlobe({ isEnabled: false, durationMinutes: mins, customMessage: globeStatus.customMessage }, `Globe OFFLINE for ${mins} min — it will auto-restore.`);
    setGlobeTimerMinutes('');
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

  const interceptUser = (userId) => {
    if (!userId || !adminSocket) return;
    if (activeRandomChat) {
      adminSocket.emit('send_anonymous_message', { roomId: activeRandomChat.roomId, messageText: 'bye' });
      adminSocket.emit('leave_anonymous_chat', { roomId: activeRandomChat.roomId });
    }
    setSelectedBotChat(null); // close any persistent chat so the live intercept chat shows
    setShowRightList(false);
    adminSocket.emit('admin_intercept_random', { targetUserId: userId });
  };

  const openLiveRandomPage = () => {
    fetchBotRequests();
    fetchBotChats();
    fetchConversations();
  };

  // Join / leave the admin_live room as the page opens or closes, so waiting users are
  // held on the board (no AI bot) only while the admin is actually watching it.
  useEffect(() => {
    if (!adminSocket) return;
    if (activeTab === 'live-random') adminSocket.emit('admin_watch_live');
    else adminSocket.emit('admin_unwatch_live');
  }, [activeTab, adminSocket]);

  // Tick the waiting-time labels once a second while the live page is open.
  useEffect(() => {
    if (activeTab !== 'live-random') return;
    const id = setInterval(() => setLiveTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [activeTab]);

  // Auto-dismiss the new-request toast.
  useEffect(() => {
    if (!requestToast) return;
    const id = setTimeout(() => setRequestToast(null), 6000);
    return () => clearTimeout(id);
  }, [requestToast]);

  // Tick the connected-call duration once a second.
  useEffect(() => {
    if (!adminCall || !callAccepted) return;
    const id = setInterval(() => setCallSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [adminCall, callAccepted]);

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

  const fetchConversations = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/bots/conversations`, { headers: { 'x-admin-pass': password } });
      if (res.ok) setConversations(await res.json());
    } catch (err) { console.error(err); }
  };

  // Accepting a request opens the per-friend identity form first (how the admin will
  // appear to this user, since the admin was a stranger when the request was sent).
  const openIdentityForm = (req) => {
    setIdentityForm({
      botId: req.bot._id,
      userId: req.requester._id,
      requesterName: req.requester.username,
      name: req.bot.name || req.bot.username || '',
      username: req.bot.username || '',
      age: req.bot.age || '',
      country: req.bot.country || '',
      gender: req.bot.gender || 'male',
      bio: req.bot.bio || ''
    });
  };

  const submitIdentityForm = async (e) => {
    e.preventDefault();
    if (!identityForm || !identityForm.name.trim() || !identityForm.username.trim()) return;
    setIdentitySaving(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/bots/accept/${identityForm.botId}/${identityForm.userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-pass': password },
        body: JSON.stringify({ identity: { name: identityForm.name, username: identityForm.username, age: identityForm.age, country: identityForm.country, gender: identityForm.gender, bio: identityForm.bio } })
      });
      if (res.ok) {
        setBotRequests(prev => prev.filter(r => r.requester._id !== identityForm.userId || r.bot._id !== identityForm.botId));
        setIdentityForm(null);
        fetchBotChats();
        fetchConversations();
      }
    } catch (err) { console.error(err); }
    finally { setIdentitySaving(false); }
  };

  const openBotChat = async (chat) => {
    // Switching to a persistent chat closes any open live intercept chat first.
    if (activeRandomChat && adminSocket) {
      adminSocket.emit('send_anonymous_message', { roomId: activeRandomChat.roomId, messageText: 'bye' });
      adminSocket.emit('leave_anonymous_chat', { roomId: activeRandomChat.roomId });
      setActiveRandomChat(null);
    }
    setShowRightList(false);
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
      message: botChatMessageInput,
      createdAt: new Date().toISOString()
    }]);
    setBotChatMessageInput('');
  };

  // ── Request-to-follow / Block for the open bot chat ──
  // The bot no longer auto-follows: it sends a real follow request the user can accept,
  // matching how normal users connect. Only if the user already follows the bot does the
  // server connect them instantly (mutual).
  const followBackUser = async () => {
    if (!selectedBotChat) return;
    const uid = String(selectedBotChat.user._id);
    try {
      const res = await fetch(`${API_URL}/api/admin/bots/follow/${selectedBotChat.bot._id}/${uid}`, {
        method: 'POST', headers: { 'x-admin-pass': password }
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.connected) {
          setFollowedIds(prev => new Set(prev).add(uid));
        } else {
          setRequestedUserIds(prev => new Set(prev).add(uid));
        }
        fetchBotChats();
      } else {
        alert('Could not send request.');
      }
    } catch (err) { console.error(err); alert('Could not send request.'); }
  };

  const blockUserInChat = async () => {
    if (!selectedBotChat) return;
    const userId = String(selectedBotChat.user._id);
    const willBlock = !blockedIds.has(userId);
    try {
      const res = await fetch(`${API_URL}/api/admin/bots/block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-pass': password },
        body: JSON.stringify({ botId: selectedBotChat.bot._id, userId, blocked: willBlock })
      });
      if (res.ok) {
        setBlockedIds(prev => {
          const s = new Set(prev);
          if (willBlock) s.add(userId); else s.delete(userId);
          return s;
        });
      } else {
        alert('Could not update block.');
      }
    } catch (err) { console.error(err); alert('Could not update block.'); }
  };

  // ── Admin WebRTC call helpers ──
  const stopAdminCallMedia = () => {
    if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null; }
    if (peerRef.current) { try { peerRef.current.destroy(); } catch (e) {} peerRef.current = null; }
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null; }
    pendingCandidatesRef.current = [];
    callerSignalRef.current = null;
    callAcceptedRef.current = false;
  };

  const resetAdminCall = () => {
    stopAdminCallMedia();
    setAdminCall(null);
    setCallAccepted(false);
    setIsAudioMuted(false);
    setIsVideoOff(false);
    setCallSeconds(0);
  };

  const getAdminMedia = (isVideo) =>
    navigator.mediaDevices.getUserMedia({ audio: true, video: isVideo ? { facingMode: 'user' } : false });

  const attachLocalStream = (stream) => {
    setTimeout(() => {
      if (adminMyVideoRef.current) {
        adminMyVideoRef.current.srcObject = stream;
        adminMyVideoRef.current.play()?.catch(() => {});
      }
    }, 60);
  };

  const startAdminCall = async (isVideo) => {
    if (!selectedBotChat || !adminSocket) return;
    const user = selectedBotChat.user, bot = selectedBotChat.bot;
    try {
      const stream = await getAdminMedia(isVideo);
      localStreamRef.current = stream;
      setAdminCall({ active: true, incoming: false, isVideo, peerUserId: String(user._id), peerSocketId: null, peerUsername: user.username, peerAvatar: user.avatarUrl, botId: bot._id, botUsername: bot.username });
      setCallAccepted(false);
      attachLocalStream(stream);
      const peer = new Peer({ initiator: true, trickle: true, stream, config: CALL_ICE });
      peer.on('signal', (data) => {
        adminSocket.emit('call_user', { userToCall: String(user._id), signalData: data, from: bot._id, fromUsername: bot.username, fromAvatar: bot.avatarUrl, isVideo });
      });
      peer.on('stream', (remote) => {
        if (adminRemoteVideoRef.current) { adminRemoteVideoRef.current.srcObject = remote; adminRemoteVideoRef.current.play()?.catch(() => {}); }
      });
      peer.on('close', () => resetAdminCall());
      peer.on('error', () => resetAdminCall());
      peerRef.current = peer;
      callTimeoutRef.current = setTimeout(() => { if (!callAcceptedRef.current) endAdminCall(); }, 60000);
    } catch (err) {
      console.error(err);
      alert('Call setup failed: ' + (err.message || err));
      resetAdminCall();
    }
  };

  const acceptAdminCall = async () => {
    const c = adminCall;
    if (!c || !c.incoming || !adminSocket) return;
    try {
      const stream = await getAdminMedia(c.isVideo);
      localStreamRef.current = stream;
      attachLocalStream(stream);
      const peer = new Peer({ initiator: false, trickle: true, stream, config: CALL_ICE });
      peer.on('signal', (data) => {
        adminSocket.emit('answer_call', { to: c.peerUserId, toSocketId: c.peerSocketId, signal: data });
      });
      peer.on('stream', (remote) => {
        if (adminRemoteVideoRef.current) { adminRemoteVideoRef.current.srcObject = remote; adminRemoteVideoRef.current.play()?.catch(() => {}); }
      });
      peer.on('close', () => resetAdminCall());
      peer.on('error', () => resetAdminCall());
      if (callerSignalRef.current) peer.signal(callerSignalRef.current);
      pendingCandidatesRef.current.forEach(cd => peer.signal(cd));
      pendingCandidatesRef.current = [];
      peerRef.current = peer;
      setAdminCall({ ...c, incoming: false });
      setCallAccepted(true);
      callAcceptedRef.current = true;
    } catch (err) {
      console.error(err);
      alert('Could not access mic/camera: ' + (err.message || err));
      declineAdminCall();
    }
  };

  const endAdminCall = () => {
    const c = adminCall;
    if (c && adminSocket && c.peerUserId) {
      adminSocket.emit('end_call', { to: c.peerUserId, toSocketId: c.peerSocketId || undefined });
    }
    resetAdminCall();
  };

  const declineAdminCall = () => {
    const c = adminCall;
    if (c && adminSocket && c.peerUserId) {
      adminSocket.emit('end_call', { to: c.peerUserId, toSocketId: c.peerSocketId || undefined });
    }
    resetAdminCall();
  };

  const toggleMute = () => {
    const s = localStreamRef.current; if (!s) return;
    const next = !isAudioMuted;
    s.getAudioTracks().forEach(t => { t.enabled = !next; });
    setIsAudioMuted(next);
  };

  const toggleCamera = () => {
    const s = localStreamRef.current; if (!s) return;
    const next = !isVideoOff;
    s.getVideoTracks().forEach(t => { t.enabled = !next; });
    setIsVideoOff(next);
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
    // Guard against rapid re-clicks while the request is in-flight (server is also
    // idempotent now, but this stops the confusing multi-notify from the UI side).
    if (resolvingReport) return;
    setResolvingReport(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/reports/${reportId}/resolve`, {
        method: 'POST',
        headers: { 'x-admin-pass': password }
      });
      if (res.ok) {
        setReports(reports.filter(r => r._id !== reportId));
        setSelectedReport(null);
        alert('Report resolved. The reporter has been notified that action was taken.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setResolvingReport(false);
    }
  };

  // Build a reason-based official warning text (mirrors the server default) to prefill the composer.
  const buildWarning = (reason, username) => {
    const map = {
      'Sexual Harassment': 'sexual harassment and inappropriate sexual conduct',
      'Spam / Scams': 'spam, scams or misleading behaviour',
      'Abuse / Insult': 'abusive language, insults or harassment of other users',
      'Other Inappropriate Behavior': 'behaviour that violates our community guidelines'
    };
    const what = map[reason] || 'conduct that violates our community guidelines';
    const who = username ? `@${username}` : 'Your account';
    return `⚠️ Community Guidelines Warning\n\n${who} has been reported and reviewed by our moderation team for ${what}. This is an official warning. Repeated violations may lead to temporary restrictions or a permanent ban from Twelo. Please treat other users with respect.`;
  };

  const openInvestigate = (report) => {
    setSelectedReport(report);
    setWarnNotice(buildWarning(report.reason, report.reportedUsername));
  };

  const handleSendReportWarning = async (report) => {
    if (report.warnSent || sendingWarn) return;
    const message = (warnNotice || '').trim() || buildWarning(report.reason, report.reportedUsername);
    setSendingWarn(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/reports/${report._id}/warn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-pass': password },
        body: JSON.stringify({ message })
      });
      const data = await res.json();
      if (res.ok) {
        setReports(prev => prev.map(r => r._id === report._id ? { ...r, warnSent: true, warningMessage: data.message } : r));
        setSelectedReport(prev => prev ? { ...prev, warnSent: true, warningMessage: data.message } : prev);
        alert('Warning sent to the reported user.');
      } else {
        alert(data.message || 'Failed to send warning');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to send warning');
    } finally {
      setSendingWarn(false);
    }
  };

  const handleAddGlobalStory = () => {
    setShowAdminStoryUI(true);
  };

  if (showAdminStoryUI) {
    return <AdminStoryCreator onClose={() => setShowAdminStoryUI(false)} API_URL={API_URL} adminPass={password} />;
  }

  if (showStoryManager) {
    return <AdminStoryManager onClose={() => setShowStoryManager(false)} API_URL={API_URL} adminPass={password} />;
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
        {/* Server Health Section */}
        {stats.serverHealth && (
          <div className="dev-server-health-panel" style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#111', borderRadius: '12px', border: '1px solid #333' }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1rem', color: '#a8a8a8', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} color="#10b981" /> Live Server Health
            </h3>
            <div className="dev-stats-grid">
              <div className="dev-stat-card">
                <div style={{ color: stats.serverHealth.ramUsage > 90 ? '#ef4444' : '#10b981', fontSize: '1.8rem', fontWeight: 'bold' }}>
                  {stats.serverHealth.ramUsage}%
                </div>
                <p>RAM Usage</p>
              </div>
              <div className="dev-stat-card">
                <div style={{ color: '#0095f6', fontSize: '1.8rem', fontWeight: 'bold' }}>
                  {stats.serverHealth.cpuLoad}%
                </div>
                <p>CPU Load</p>
              </div>
              <div className="dev-stat-card">
                <div style={{ color: '#8b5cf6', fontSize: '1.8rem', fontWeight: 'bold' }}>
                  {stats.serverHealth.dbStorageMB} MB
                </div>
                <p>DB Size</p>
              </div>
            </div>
          </div>
        )}

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
          {/* Global Broadcast & Stories */}
          <div className="dev-panel">
            <h3><Send size={18} style={{ marginRight: '8px' }}/> Broadcasts & Stories</h3>
            <p className="panel-desc">Send notifications or post global TWELO stories.</p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
              <button 
                className="dev-btn-primary" 
                style={{ background: '#f59e0b', color: '#000', flex: 1 }}
                onClick={() => setShowBroadcastModal(true)}
              >
                Open Hub
              </button>
              <button 
                className="dev-btn-primary" 
                style={{ background: '#ec4899', color: '#fff', flex: 1 }}
                onClick={handleAddGlobalStory}
              >
                Add Global Story
              </button>
              <button 
                className="dev-btn-primary" 
                style={{ background: '#8b5cf6', color: '#fff', flex: 1 }}
                onClick={() => setShowStoryManager(true)}
              >
                Manage Stories
              </button>
            </div>
          </div>

          {/* Globe Control System */}
          {(() => {
            const online = globeStatus.isEnabled;
            const remainingMs = (!online && globeStatus.enableAt) ? (new Date(globeStatus.enableAt).getTime() - globeTick) : 0;
            const presets = [15, 30, 60, 120, 240, 480];
            const restoreAt = globeStatus.enableAt ? new Date(globeStatus.enableAt) : null;
            return (
              <div className="dev-panel" style={{ border: `1px solid ${online ? '#10b981' : '#ef4444'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <Globe size={18} color={online ? '#10b981' : '#ef4444'} /> Globe Control System
                  </h3>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '5px 12px', borderRadius: '999px', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.5px', background: online ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: online ? '#10b981' : '#ef4444' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: online ? '#10b981' : '#ef4444', animation: 'globePulse 1.6s infinite' }} />
                    {online ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </div>
                <p className="panel-desc">Control Random Chat (anonymous matching) for everyone. When offline, a live countdown auto-restores it — no manual reset needed.</p>

                {/* Status / countdown strip */}
                <div style={{ marginTop: '6px', padding: '12px 14px', borderRadius: '12px', background: online ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${online ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}` }}>
                  {online ? (
                    <div style={{ color: '#10b981', fontWeight: 600 }}>✅ Matching is live — users can find strangers right now.</div>
                  ) : (
                    <div>
                      <div style={{ color: '#ef4444', fontWeight: 600, marginBottom: '8px' }}>⛔ Matching is paused. Users see: “{globeStatus.customMessage || 'Globe is currently offline.'}”</div>
                      {restoreAt ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                          <div>
                            <div style={{ fontSize: '0.72rem', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Auto-restores in</div>
                            <div style={{ fontSize: '1.8rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: '#fff' }}>{formatCountdown(remainingMs)}</div>
                            <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>at {restoreAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({restoreAt.toLocaleDateString()})</div>
                          </div>
                          <button onClick={bringGlobeOnline} disabled={globeSaving} className="dev-btn-primary" style={{ background: '#10b981', color: '#fff', opacity: globeSaving ? 0.6 : 1 }}>Bring Online Now</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                          <div style={{ color: '#f59e0b', fontWeight: 600 }}>⚠️ No auto-restore scheduled — it stays offline until you bring it online.</div>
                          <button onClick={bringGlobeOnline} disabled={globeSaving} className="dev-btn-primary" style={{ background: '#10b981', color: '#fff', opacity: globeSaving ? 0.6 : 1 }}>Bring Online Now</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Offline scheduler */}
                <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ fontSize: '0.8rem', opacity: 0.8 }}>Take offline for (quick presets):</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {presets.map(p => {
                      const active = String(globeTimerMinutes) === String(p);
                      return (
                        <button key={p} type="button" onClick={() => setGlobeTimerMinutes(String(p))}
                          style={{ padding: '6px 12px', borderRadius: '999px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                            background: active ? 'var(--brand-blue, #0095f6)' : 'rgba(255,255,255,0.06)',
                            color: active ? '#fff' : 'inherit', border: '1px solid rgba(255,255,255,0.12)' }}>
                          {p < 60 ? `${p}m` : `${p / 60}h`}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <input type="number" min="1" placeholder="Custom minutes" value={globeTimerMinutes} onChange={(e) => setGlobeTimerMinutes(e.target.value)} className="dev-input" style={{ flex: '1 1 140px' }} />
                    <input type="text" placeholder="Custom offline message (users see this)" value={globeStatus.customMessage} onChange={(e) => setGlobeStatus({ ...globeStatus, customMessage: e.target.value })} className="dev-input" style={{ flex: '2 1 220px' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button onClick={() => takeGlobeOffline(globeTimerMinutes)} disabled={globeSaving} className="dev-btn-primary" style={{ background: '#ef4444', color: '#fff', opacity: globeSaving ? 0.6 : 1 }}>
                      {globeSaving ? 'Saving…' : online ? 'Take Offline' : 'Update Offline Timer'}
                    </button>
                    {!online && (
                      <button onClick={bringGlobeOnline} disabled={globeSaving} className="dev-btn-primary" style={{ background: '#10b981', color: '#fff', opacity: globeSaving ? 0.6 : 1 }}>Bring Online</button>
                    )}
                  </div>
                </div>

                {globeMsg.text && (
                  <div style={{ marginTop: '12px', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem', background: globeMsg.ok ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', color: globeMsg.ok ? '#10b981' : '#ef4444' }}>
                    {globeMsg.text}
                  </div>
                )}
              </div>
            );
          })()}

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
                  onClick={() => { setActiveTab('live-random'); openLiveRandomPage(); }} 
                  className={`dev-btn-${activeTab === 'live-random' ? 'primary' : 'secondary'}`}
                  style={{ position: 'relative', background: activeTab === 'live-random' ? '#ef4444' : '' }}
                >
                  <Radio size={16} style={{ marginRight: '8px' }} />
                  Live Random
                  {botRequests.length > 0 && <span style={{ position: 'absolute', top: '-5px', left: '-5px', background: '#f59e0b', color: 'white', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '10px' }}>{botRequests.length}</span>}
                  {liveQueue.length > 0 && <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#10b981', color: 'white', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '10px' }}>{liveQueue.length}</span>}
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

              {requestToast && (
                <div
                  onClick={() => { setActiveTab('live-random'); setAdminRightTab('requests'); setShowRightList(true); openLiveRandomPage(); setRequestToast(null); }}
                  style={{ position: 'fixed', top: '16px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: '#111827', color: '#fff', padding: '10px 16px', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.35)', border: '1px solid rgba(245,158,11,0.5)', cursor: 'pointer', fontSize: '0.9rem' }}
                >
                  {requestToast.text} · <b>View</b>
                </div>
              )}

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
                     <div className="dev-panel">
                        <h4 style={{ marginBottom: '15px' }}>DAU Trend (Last 7 Days)</h4>
                        {analyticsData.chartData && (
                          <div style={{ position: 'relative', height: '300px', width: '100%' }}>
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
                              options={{ responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }}
                            />
                          </div>
                        )}
                     </div>
                     
                     <div className="dev-panel">
                        <h4 style={{ marginBottom: '15px' }}>Core Actions (Avg per session)</h4>
                        {analyticsData && (
                          <div style={{ position: 'relative', height: '300px', width: '100%' }}>
                            <Bar 
                              data={{
                                labels: ['Messages Sent', 'Matches Made'],
                                datasets: [{
                                  label: 'Average Count',
                                  data: [analyticsData.avgMessages, analyticsData.avgMatches],
                                  backgroundColor: ['#0ea5e9', '#f59e0b']
                                }]
                              }}
                              options={{ responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }}
                            />
                          </div>
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
                     <div className="dev-panel">
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
                        <div style={{ position: 'relative', height: '300px', width: '100%' }}>
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
                              maintainAspectRatio: false,
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
                     </div>
                  )}
                  {analyticsData.demographics && (
                    <div className="demographics-charts-grid" style={{ marginTop: '20px' }}>
                      <div className="dev-panel">
                        <h4 style={{ marginBottom: '15px' }}>Gender Distribution</h4>
                        <div style={{ position: 'relative', height: '250px', width: '100%', maxWidth: '300px', margin: '0 auto' }}>
                          <Doughnut
                            data={{
                              labels: ['Male', 'Female'],
                              datasets: [{
                                data: [analyticsData.demographics.gender.male, analyticsData.demographics.gender.female],
                                backgroundColor: ['#3b82f6', '#ec4899'],
                                borderWidth: 0,
                                hoverOffset: 4
                              }]
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: {
                                legend: { position: 'bottom', labels: { color: '#fff', font: { size: 14 } } },
                                tooltip: { backgroundColor: 'rgba(0,0,0,0.8)', titleColor: '#fff', padding: 12 }
                              },
                              cutout: '70%'
                            }}
                          />
                        </div>
                      </div>

                      <div className="dev-panel">
                        <h4 style={{ marginBottom: '15px' }}>Top Locations</h4>
                        <div style={{ position: 'relative', height: '250px', width: '100%', maxWidth: '300px', margin: '0 auto' }}>
                          <Doughnut
                            data={{
                              labels: analyticsData.demographics.country.labels,
                              datasets: [{
                                data: analyticsData.demographics.country.counts,
                                backgroundColor: [
                                  '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4',
                                  '#f97316', '#14b8a6', '#6366f1', '#eab308', '#d946ef'
                                ],
                                borderWidth: 0,
                                hoverOffset: 4
                              }]
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: {
                                legend: { position: 'bottom', labels: { color: '#fff', boxWidth: 12, padding: 15 } },
                                tooltip: { backgroundColor: 'rgba(0,0,0,0.8)', titleColor: '#fff', padding: 12 }
                              },
                              cutout: '60%'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {analyticsData.peakHours && (
                    <div className="dev-panel" style={{ marginTop: '20px' }}>
                      <h4 style={{ marginBottom: '15px' }}>Peak Activity Heatmap (24 Hours)</h4>
                      <div style={{ position: 'relative', height: '300px', width: '100%' }}>
                        <Bar
                          data={{
                            labels: ['12 AM', '1 AM', '2 AM', '3 AM', '4 AM', '5 AM', '6 AM', '7 AM', '8 AM', '9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM', '6 PM', '7 PM', '8 PM', '9 PM', '10 PM', '11 PM'],
                            datasets: [{
                              label: 'Messages Sent',
                              data: analyticsData.peakHours,
                              backgroundColor: 'rgba(236, 72, 153, 0.8)',
                              borderRadius: 4
                            }]
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: { 
                              y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                              x: { grid: { display: false } }
                            },
                            plugins: {
                              legend: { display: false },
                              tooltip: { backgroundColor: 'rgba(0,0,0,0.8)', titleColor: '#ec4899', padding: 12 }
                            }
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                ) : (
                  <div style={{ textAlign: 'center', color: '#888', marginTop: '20px' }}>Loading analytics data...</div>
                )
              ) : activeTab === 'users' ? (
                <>
                  <form onSubmit={handleSearch} style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
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
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', width: '100%' }}>
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
                            <div className="dev-user-meta" style={{ fontSize: '0.8rem', marginTop: '6px' }}>
                              {report.reportsAgainstUser >= 2
                                ? <span style={{ background: '#ff4b4b', color: '#fff', fontWeight: 'bold', fontSize: '0.72rem', padding: '2px 8px', borderRadius: '10px' }}>⚠ Reported {report.reportsAgainstUser} times</span>
                                : <span style={{ background: '#f59e0b', color: '#111', fontWeight: 'bold', fontSize: '0.72rem', padding: '2px 8px', borderRadius: '10px' }}>1st report</span>}
                              {report.warnSent && <span style={{ marginLeft: '8px', color: '#10b981', fontSize: '0.78rem', fontWeight: 'bold' }}>✓ Warning sent</span>}
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => openInvestigate(report)}
                          className="dev-btn-primary"
                        >
                          <Search size={16} style={{ marginRight: '5px' }} />
                          Investigate
                        </button>
                      </div>
                    ))
                  )}
                </div>
              ) : activeTab === 'live-random' ? (
                <>
                  <div className="live-random-wrap">
                    {/* LEFT: live waiting board */}
                    <aside className="live-random-left">
                      <div className="lr-left-head">
                        <span className="lr-live-dot" />
                        <h3>Waiting Now</h3>
                        <span className="lr-count">{liveQueue.length}</span>
                      </div>
                      <div className="lr-left-sub">Users who pressed Match with no partner. Tap to intercept &amp; chat. Newest first (max 10).</div>
                      <div className="lr-list">
                        {liveQueue.length === 0 ? (
                          <div className="lr-empty">No one waiting right now. 🎉</div>
                        ) : liveQueue.map((u) => {
                          const secs = Math.max(0, Math.floor((liveTick - (u.waitingSince || liveTick)) / 1000));
                          return (
                            <button key={u.userId} className="lr-user-row" onClick={() => interceptUser(u.userId)}>
                              <div className="lr-avatar">
                                <img src={u.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.username || '?')}&background=random`} alt='' />
                              </div>
                              <div className="lr-user-meta">
                                <span className="lr-user-name">@{u.username}</span>
                                <span className="lr-user-sub">{u.country && u.country !== 'Earth' ? `📍 ${u.country}` : '🌍 Earth'} · {u.gender || '—'} · waiting {secs}s</span>
                              </div>
                              <span className="lr-intercept">Intercept ›</span>
                            </button>
                          );
                        })}
                      </div>
                    </aside>

                    {/* RIGHT: chat + top row */}
                    <section className="live-random-right">
                      <div className="lr-row">
                        <button className={`lr-row-btn ${adminRightTab === 'requests' && showRightList ? 'active' : ''}`} onClick={() => { setAdminRightTab('requests'); setShowRightList(true); }}>
                          <UserPlus size={16} /> Requests {botRequests.length > 0 && <span className="lr-badge">{botRequests.length}</span>}
                        </button>
                        <button className={`lr-row-btn ${adminRightTab === 'friends' && showRightList ? 'active' : ''}`} onClick={() => { setAdminRightTab('friends'); setShowRightList(true); }}>
                          <UserCheck size={16} /> Friends {botChats.length > 0 && <span className="lr-badge">{botChats.length}</span>}
                        </button>
                        <button className={`lr-row-btn ${adminRightTab === 'chats' && showRightList ? 'active' : ''}`} onClick={() => { setAdminRightTab('chats'); setShowRightList(true); fetchConversations(); }}>
                          <MessageSquare size={16} /> Chats {unreadBotChats.size > 0 && <span className="lr-badge" style={{ background: '#f59e0b' }}>{unreadBotChats.size}</span>}
                        </button>
                      </div>

                      <div className="lr-chat">
                        {activeRandomChat ? (
                          <>
                            <div className="lr-chat-head live">
                              <div>
                                <div className="lr-chat-title">🔴 Live intercept — @{activeRandomChat.targetUser?.username}</div>
                                <div className="lr-chat-sub">Disguised as @{activeRandomChat.botAccount?.username}</div>
                              </div>
                              <button className="lr-leave" onClick={() => { if (adminSocket) { adminSocket.emit('send_anonymous_message', { roomId: activeRandomChat.roomId, messageText: 'bye' }); adminSocket.emit('leave_anonymous_chat', { roomId: activeRandomChat.roomId }); } setActiveRandomChat(null); }}>Leave</button>
                            </div>
                            <div className="lr-chat-body">
                              {randomMessages.map((msg, i) => (
                                <div key={i} className={`msg-wrapper ${msg.isMine ? 'sent' : 'received'}`}><div className="msg-bubble"><div>{msg.message}</div></div></div>
                              ))}
                            </div>
                            <form className="lr-chat-input" onSubmit={handleSendRandomMessage}>
                              <input type="text" value={randomMessageInput} onChange={(e) => setRandomMessageInput(e.target.value)} placeholder="Type as stranger..." />
                              <button type="submit" className="action-icon-btn send-btn"><Send size={20} /></button>
                            </form>
                          </>
                        ) : selectedBotChat ? (
                          <>
                            <div className="lr-chat-head">
                              <div>
                                <div className="lr-chat-title">@{selectedBotChat.user.username}</div>
                                <div className="lr-chat-sub">You are @{selectedBotChat.bot.username}</div>
                              </div>
                              <div className="lr-chat-actions">
                                <button className="lr-act" title="Voice call" onClick={() => startAdminCall(false)}><Phone size={18} /></button>
                                <button className="lr-act" title="Video call" onClick={() => startAdminCall(true)}><Video size={18} /></button>
                                {followedIds.has(String(selectedBotChat.user._id))
                                  ? <span className="lr-act lr-act-static" title="Connected"><UserCheck size={18} /></span>
                                  : requestedUserIds.has(String(selectedBotChat.user._id))
                                  ? <span className="lr-act lr-act-static" title="Request sent — waiting for them to accept"><Clock size={18} /></span>
                                  : <button className="lr-act" title="Send follow request" onClick={followBackUser}><UserPlus size={18} /></button>}
                                {blockedIds.has(String(selectedBotChat.user._id))
                                  ? <button className="lr-act lr-act-danger" title="Unblock user" onClick={blockUserInChat}><Ban size={18} /></button>
                                  : <button className="lr-act" title="Block user" onClick={blockUserInChat}><Ban size={18} /></button>}
                                <button className="lr-leave" onClick={() => setSelectedBotChat(null)}>Close</button>
                              </div>
                            </div>
                            <div className="lr-chat-body">
                              {botChatMessages.map((msg, i) => {
                                const isBot = String(msg.sender) === String(selectedBotChat.bot._id);
                                return (<div key={i} className={`msg-wrapper ${isBot ? 'sent' : 'received'}`}><div className="msg-bubble"><div>{msg.message}</div></div></div>);
                              })}
                              <div ref={botMessagesEndRef} />
                            </div>
                            <form className="lr-chat-input" onSubmit={handleSendBotMessage}>
                              <input type="text" value={botChatMessageInput} onChange={(e) => setBotChatMessageInput(e.target.value)} placeholder="Reply..." />
                              <button type="submit" className="action-icon-btn send-btn"><Send size={20} /></button>
                            </form>
                          </>
                        ) : (
                          <div className="lr-chat-placeholder">
                            <Radio size={40} color="#333" />
                            <p>Select a waiting user to intercept, or open Requests / Friends / Chats.</p>
                          </div>
                        )}
                      </div>

                      {/* Drawer for Requests / Friends / Chats */}
                      {showRightList && (
                        <div className="lr-drawer">
                          <div className="lr-drawer-head">
                            <h4>{adminRightTab === 'requests' ? 'Requests' : adminRightTab === 'friends' ? 'Friends' : 'Chats'}</h4>
                            <button onClick={() => setShowRightList(false)}><X size={18} /></button>
                          </div>
                          <div className="lr-drawer-body">
                            {adminRightTab === 'requests' && (
                              botRequests.length === 0 ? <div className="lr-empty">No pending requests.</div> :
                              botRequests.map((req, i) => (
                                <div key={i} className="lr-drawer-item">
                                  <img className="lr-avatar-sm" src={req.requester.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(req.requester.username)}`} alt='' />
                                  <div className="lr-drawer-meta">
                                    <span className="lr-drawer-title">@{req.requester.username}</span>
                                    <span className="lr-drawer-sub">wants to chat (via @{req.bot.username})</span>
                                  </div>
                                  <button className="lr-accept" onClick={() => openIdentityForm(req)}>Accept</button>
                                </div>
                              ))
                            )}
                            {adminRightTab === 'friends' && (
                              botChats.length === 0 ? <div className="lr-empty">No friends yet. Accept a request first.</div> :
                              botChats.map((chat, i) => (
                                <div key={i} className="lr-drawer-item clickable" onClick={() => openBotChat(chat)}>
                                  <img className="lr-avatar-sm" src={chat.user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.user.username)}`} alt='' />
                                  <div className="lr-drawer-meta">
                                    <span className="lr-drawer-title">@{chat.user.username}</span>
                                    <span className="lr-drawer-sub">as @{chat.bot.username}</span>
                                  </div>
                                  <MessageSquare size={16} color="#10b981" />
                                </div>
                              ))
                            )}
                            {adminRightTab === 'chats' && (
                              conversations.length === 0 ? <div className="lr-empty">No conversations yet.</div> :
                              conversations.map((c, i) => (
                                <div key={i} className="lr-drawer-item clickable" onClick={() => openBotChat({ bot: c.bot, user: c.user })}>
                                  <img className="lr-avatar-sm" src={c.user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.user.username)}`} alt='' />
                                  <div className="lr-drawer-meta">
                                    <span className="lr-drawer-title">@{c.user.username}</span>
                                    <span className="lr-drawer-sub">{c.mine ? 'You: ' : ''}{c.lastMessage || '—'}</span>
                                  </div>
                                  {(unreadBotChats.has(String(c.userId || c.user._id))) && <span className="lr-unread" />}
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </section>
                  </div>

                  {/* Identity form modal shown when accepting a request */}
                  {identityForm && (
                    <div className="lr-modal-overlay" onClick={() => !identitySaving && setIdentityForm(null)}>
                      <form className="lr-modal" onClick={(e) => e.stopPropagation()} onSubmit={submitIdentityForm}>
                        <h3>Set your identity for @{identityForm.requesterName}</h3>
                        <p className="lr-modal-sub">This is how you'll appear to them (you were a stranger when they requested).</p>
                        <label>Name<input className="dev-input" type="text" value={identityForm.name} onChange={(e) => setIdentityForm({ ...identityForm, name: e.target.value })} required maxLength={60} /></label>
                        <label>Username<input className="dev-input" type="text" value={identityForm.username} onChange={(e) => setIdentityForm({ ...identityForm, username: e.target.value })} required maxLength={30} /></label>
                        <div className="lr-modal-row">
                          <label>Age<input className="dev-input" type="number" min="1" max="120" value={identityForm.age} onChange={(e) => setIdentityForm({ ...identityForm, age: e.target.value })} /></label>
                          <label>Gender
                            <select className="dev-input" value={identityForm.gender} onChange={(e) => setIdentityForm({ ...identityForm, gender: e.target.value })}>
                              <option value="male">Male</option><option value="female">Female</option>
                            </select>
                          </label>
                        </div>
                        <label>Country<input className="dev-input" type="text" value={identityForm.country} onChange={(e) => setIdentityForm({ ...identityForm, country: e.target.value })} maxLength={60} /></label>
                        <label>Bio<textarea className="dev-input" value={identityForm.bio} onChange={(e) => setIdentityForm({ ...identityForm, bio: e.target.value })} maxLength={150} rows={2} /></label>
                        <div className="lr-modal-actions">
                          <button type="button" className="dev-btn-secondary" onClick={() => setIdentityForm(null)} disabled={identitySaving}>Cancel</button>
                          <button type="submit" className="dev-btn-primary" style={{ background: '#10b981' }} disabled={identitySaving}>{identitySaving ? 'Saving…' : 'Accept & Save'}</button>
                        </div>
                      </form>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {adminCall && (
        <div className="admin-call-overlay">
          <div className="admin-call-stage">
            {adminCall.isVideo ? (
              <>
                <video ref={adminRemoteVideoRef} autoPlay playsInline className="admin-call-remote" />
                <video ref={adminMyVideoRef} autoPlay playsInline muted className="admin-call-pip" style={{ transform: 'scaleX(-1)' }} />
              </>
            ) : (
              <>
                <video ref={adminRemoteVideoRef} autoPlay playsInline className="admin-call-audio-el" />
                <video ref={adminMyVideoRef} autoPlay playsInline muted className="admin-call-audio-el" />
                <div className="admin-call-avatar">
                  {adminCall.peerAvatar ? <img src={adminCall.peerAvatar} alt="" /> : <span>{(adminCall.peerUsername || '?').charAt(0).toUpperCase()}</span>}
                </div>
              </>
            )}

            <div className="admin-call-top">
              <div className="admin-call-who">@{adminCall.peerUsername}</div>
              <div className="admin-call-sub">
                {adminCall.incoming
                  ? `Incoming ${adminCall.isVideo ? 'video' : 'voice'} call · as @${adminCall.botUsername}`
                  : (!callAccepted ? 'Ringing…' : `${adminCall.isVideo ? 'Video' : 'Voice'} connected · ${formatCallDuration(callSeconds)} · as @${adminCall.botUsername}`)}
              </div>
            </div>

            <div className="admin-call-controls">
              {adminCall.incoming && !callAccepted ? (
                <>
                  <button className="admin-call-btn decline" onClick={declineAdminCall} title="Decline"><PhoneOff size={24} /></button>
                  <button className="admin-call-btn accept" onClick={acceptAdminCall} title="Accept">{adminCall.isVideo ? <Video size={24} /> : <Phone size={24} />}</button>
                </>
              ) : (
                <>
                  <button className={`admin-call-btn ${isAudioMuted ? 'off' : ''}`} onClick={toggleMute} title="Mute"><Mic size={22} /></button>
                  {adminCall.isVideo && (
                    <button className={`admin-call-btn ${isVideoOff ? 'off' : ''}`} onClick={toggleCamera} title="Camera"><VideoOff size={22} /></button>
                  )}
                  <button className="admin-call-btn decline" onClick={endAdminCall} title="End call"><PhoneOff size={24} /></button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

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
              <div style={{ marginBottom: '12px' }}>
                {selectedReport.reportsAgainstUser >= 2
                  ? <span style={{ background: '#ff4b4b', color: '#fff', fontWeight: 'bold', fontSize: '0.75rem', padding: '3px 10px', borderRadius: '10px' }}>⚠ This user has been reported {selectedReport.reportsAgainstUser} times — consider blocking</span>
                  : <span style={{ background: '#f59e0b', color: '#111', fontWeight: 'bold', fontSize: '0.75rem', padding: '3px 10px', borderRadius: '10px' }}>First report on this user</span>}
              </div>
              
              <div style={{ background: '#0a0a0a', padding: '15px', borderRadius: '8px', maxHeight: '350px', overflowY: 'auto', border: '1px solid #333', marginBottom: '20px' }}>
                <p style={{ color: '#666', fontSize: '0.75rem', marginBottom: '10px', textAlign: 'center' }}>{'🔒 Last 20 encrypted messages (server-decrypted for review)'}</p>
                {(() => {
                  if (!selectedReport.chatContext) return <p style={{ color: '#666', fontStyle: 'italic' }}>No chat context available.</p>;
                  try {
                    const msgs = JSON.parse(selectedReport.chatContext);
                    if (!Array.isArray(msgs) || msgs.length === 0) return <pre style={{ color: '#ccc', whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.8rem' }}>{selectedReport.chatContext}</pre>;
                    return msgs.map((m, i) => (
                      <div key={i} style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column', alignItems: m.from === selectedReport.reportedUsername ? 'flex-start' : 'flex-end' }}>
                        <span style={{ fontSize: '0.7rem', color: '#666', marginBottom: '2px' }}>{'@'}{m.from} {m.time ? new Date(m.time).toLocaleString() : ''}{m.deletedForEveryone ? <span style={{ color: m.recovered ? '#10b981' : '#e74c3c', fontWeight: 700 }}> · 🗑️ {m.recovered ? 'deleted (original recovered)' : 'deleted before recovery existed (content gone)'}</span> : null}</span>
                        <div style={{ background: m.from === selectedReport.reportedUsername ? '#1a1a2e' : '#0d2137', border: '1px solid ' + (m.from === selectedReport.reportedUsername ? '#e74c3c' : '#2980b9'), color: '#fff', padding: '8px 12px', borderRadius: '10px', maxWidth: '85%', fontSize: '0.85rem', wordBreak: 'break-word' }}>
                          {m.type === 'image' ? '📷 Image' : m.type === 'audio' ? '🎵 Audio' : m.type === 'screenshot' ? '📸 Took a screenshot' : (m.message || '(empty)')}
                        </div>
                      </div>
                    ));
                  } catch (e) {
                    return <pre style={{ color: '#ccc', whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.8rem' }}>{selectedReport.chatContext}</pre>;
                  }
                })()}
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: '#a8a8a8', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '6px' }}>Warning notice to @{selectedReport.reportedUsername} <span style={{ color: '#666', fontWeight: 'normal' }}>(built-in from the report reason &mdash; editable)</span></label>
                <textarea
                  value={warnNotice}
                  onChange={(e) => setWarnNotice(e.target.value)}
                  disabled={selectedReport.warnSent}
                  rows={5}
                  className="dev-input"
                  style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit', fontSize: '0.85rem', lineHeight: '1.4', whiteSpace: 'pre-wrap' }}
                  placeholder="Enter the warning message to send to this user..."
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setWarnNotice(buildWarning(selectedReport.reason, selectedReport.reportedUsername))}
                    disabled={selectedReport.warnSent}
                    style={{ background: 'none', border: 'none', color: '#0095f6', cursor: 'pointer', fontSize: '0.78rem', textDecoration: 'underline', padding: 0 }}
                  >Reset to built-in text</button>
                  {selectedReport.warnSent && <span style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 'bold' }}>✓ Warning already sent</span>}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => handleSendReportWarning(selectedReport)}
                  disabled={selectedReport.warnSent || sendingWarn}
                  className="dev-btn-secondary"
                  style={{ background: '#222', opacity: (selectedReport.warnSent || sendingWarn) ? 0.5 : 1, cursor: (selectedReport.warnSent || sendingWarn) ? 'not-allowed' : 'pointer' }}
                >
                  <AlertTriangle size={16} style={{ marginRight: '5px' }} />
                  {sendingWarn ? 'Sending…' : (selectedReport.warnSent ? 'Warning Sent' : 'Send Warning')}
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
                  disabled={resolvingReport}
                  style={{ background: '#10b981', opacity: resolvingReport ? 0.6 : 1, cursor: resolvingReport ? 'not-allowed' : 'pointer' }}
                >
                  <CheckCircle size={16} style={{ marginRight: '5px' }} />
                  {resolvingReport ? 'Resolving…' : 'Mark as Resolved'}
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

      {/* Active Random Chat Modal removed — the intercept chat now lives in the right pane of the Live Random page. */}
      {/* Broadcast Hub Modal */}
      {showBroadcastModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ background: '#111', border: '1px solid #333', padding: '30px', borderRadius: '15px', width: '90%', maxWidth: '500px', boxShadow: '0 15px 35px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}><Send size={24} color="#f59e0b" /> Broadcast Hub</h2>
              <button onClick={() => setShowBroadcastModal(false)} style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            
            <form onSubmit={handleBroadcast}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#ccc' }}>Alert Type</label>
                <select 
                  value={broadcastType} 
                  onChange={(e) => setBroadcastType(e.target.value)}
                  className="dev-input"
                  style={{ width: '100%' }}
                >
                  <option value="info">ℹ️ Information</option>
                  <option value="warning">⚠️ Warning</option>
                  <option value="success">✅ Success</option>
                  <option value="urgent">🚨 Urgent</option>
                </select>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#ccc' }}>Topic / Subject</label>
                <input 
                  type="text" 
                  value={broadcastTopic} 
                  onChange={(e) => setBroadcastTopic(e.target.value)}
                  placeholder="e.g. SYSTEM MAINTENANCE"
                  className="dev-input"
                  style={{ width: '100%' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#ccc' }}>Message Body</label>
                <textarea 
                  value={broadcastMessage} 
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Enter multi-line message here..."
                  className="dev-input"
                  style={{ width: '100%', minHeight: '120px', resize: 'vertical', fontFamily: 'inherit' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input 
                  type="checkbox" 
                  id="autoFooter"
                  checked={autoFooter}
                  onChange={(e) => setAutoFooter(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="autoFooter" style={{ color: '#ccc', cursor: 'pointer', fontSize: '0.9rem' }}>
                  Add Professional Footer ("Thank you, Twelo Administration")
                </label>
              </div>

              <button type="submit" className="dev-btn-primary" style={{ width: '100%', background: '#f59e0b', color: '#000', padding: '12px', fontSize: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                <Send size={20} /> Send Global Broadcast
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

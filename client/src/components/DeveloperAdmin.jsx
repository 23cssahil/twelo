import React, { useState, useEffect, useContext, useRef, useMemo } from 'react';
import { AuthContext } from '../App';
import { useNavigate, Link } from 'react-router-dom';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import { Users, Search, Ban, Send, Lock, Globe, MessageSquare, AlertTriangle, Trash2, Filter, RefreshCcw, Flag, X, CheckCircle, BarChart2, Activity, Radio, UserPlus, UserCheck, Phone, Video, VideoOff, Mic, MicOff, PhoneOff, Clock, Menu, LayoutDashboard, ChevronDown, ChevronUp, Map as MapIcon } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
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

// ── Broadcast Studio config (drawer in the Overview tab) ──
const BC_TYPES = [
  { id: 'info', label: 'Information', emoji: 'ℹ️', accent: '#3b82f6' },
  { id: 'warning', label: 'Warning', emoji: '⚠️', accent: '#f59e0b' },
  { id: 'success', label: 'Success', emoji: '✅', accent: '#22c55e' },
  { id: 'urgent', label: 'Urgent', emoji: '🚨', accent: '#ef4444' },
];
const BC_AUDIENCES = [
  { id: 'all', label: 'Everyone', emoji: '🌍' },
  { id: 'online', label: 'Online now', emoji: '⚡' },
  { id: 'guests', label: 'Guests', emoji: '👻' },
  { id: 'registered', label: 'Registered', emoji: '🆕' },
];
const BC_TEMPLATES = [
  { id: 'maintenance', label: '🛠️ Maintenance', type: 'warning', topic: 'SYSTEM MAINTENANCE', body: 'We are performing scheduled maintenance today between 2–4 AM IST.\nTwelo may be briefly unavailable during this window.\n\nSorry for the inconvenience.' },
  { id: 'feature', label: '🚀 New Feature', type: 'success', topic: 'NEW FEATURE UPDATE', body: 'A brand new feature has just landed on Twelo!\nUpdate the app and try it out — your feedback matters.' },
  { id: 'coins', label: '🪙 Coin Bonus', type: 'success', topic: 'COIN GIVEAWAY', body: 'Free coins are live for a limited time!\nOpen the Earn section and claim your bonus before it ends.' },
  { id: 'safety', label: '🛡️ Safety Alert', type: 'urgent', topic: 'URGENT SAFETY NOTICE', body: 'We have detected a wave of fake support accounts.\nTwelo staff will NEVER ask for your password or recovery code.\nReport any suspicious DMs instantly.' },
  { id: 'greeting', label: '🎉 Greeting', type: 'info', topic: 'SEASON GREETINGS', body: 'Warm wishes from all of us at Twelo!\nThank you for being part of our community.' },
];

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

// Lightweight SVG sparkline for the live server-health strip. `history` is an
// array of { ram, cpu } samples (newest last); we draw two normalized lines.
function HealthSparkline({ history }) {
  const data = Array.isArray(history) ? history : [];
  if (data.length < 2) {
    return <div className="dev-spark-empty">Collecting live health data…</div>;
  }
  const W = 100;
  const H = 36;
  const step = W / (data.length - 1);
  const toPts = (key) => data
    .map((v, i) => `${(i * step).toFixed(1)},${(H - (Math.max(0, Math.min(100, v[key] || 0)) / 100) * H).toFixed(1)}`)
    .join(' ');
  return (
    <svg className="dev-spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <polyline fill="none" stroke="#10b981" strokeWidth="1.6" points={toPts('ram')} />
      <polyline fill="none" stroke="#0095f6" strokeWidth="1.6" strokeDasharray="3 2" points={toPts('cpu')} />
    </svg>
  );
}

// Compact stat chip used in the Analytics > Live Users totals strip.
function MiniStat({ icon: Icon, label, value, grad }) {
  return (
    <div className="dev-mini-stat" style={grad ? { background: grad, border: 'none' } : undefined}>
      {Icon ? <span className="dev-mini-stat-icon"><Icon size={18} /></span> : null}
      <div className="dev-mini-stat-body">
        <div className="dev-mini-stat-value">{value}</div>
        <div className="dev-mini-stat-label">{label}</div>
      </div>
    </div>
  );
}

// Human date+time for the expanded user detail panel. Falls back to an em dash.
function fmtDateTime(v) {
  if (!v) return '—';
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Compact relative time (e.g. "just now", "5m ago", "3h ago", "2d ago") with the full
// timestamp as a native title tooltip for precision on hover.
function timeAgo(v) {
  if (!v) return '—';
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  let rel;
  if (s < 45) rel = 'just now';
  else if (s < 3600) rel = `${Math.floor(s / 60)}m ago`;
  else if (s < 86400) rel = `${Math.floor(s / 3600)}h ago`;
  else if (s < 604800) rel = `${Math.floor(s / 86400)}d ago`;
  else rel = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return rel;
}

// One labelled cell in the admin user-detail grid.
function DetailItem({ label, value, mono, full }) {
  return (
    <div className={`dev-detail-item${full ? ' dev-detail-full' : ''}`}>
      <span className="dev-detail-label">{label}</span>
      <span className={`dev-detail-value${mono ? ' dev-detail-mono' : ''}`}>{value === undefined || value === null || value === '' ? '—' : value}</span>
    </div>
  );
}

// ── Admin world map with click-to-drill-down by administrative level. ──
// The server returns one row per (country, region/state, city, district) tuple with a user count
// and that tuple's centroid. Depending on the current zoom we roll those rows up to a coarser
// level and draw ONE small green dot per group, sized by count, labelled with its count. Zooming
// (or clicking a dot, which zooms in) reveals the next finer level: country → state → city → district.
const GEO_LEVEL_LABEL = { country: 'Country', region: 'State / Region', city: 'City', district: 'District' };

// Map zoom → grouping level.
function geoLevelForZoom(z) {
  if (z <= 3) return 'country';
  if (z <= 5) return 'region';
  if (z <= 7) return 'city';
  return 'district';
}
// Clicking a dot at a level zooms to the zoom that reveals the next finer level.
function geoZoomForLevel(level) {
  return { country: 4, region: 6, city: 8, district: 10 }[level] || 4;
}
// Small base radius, grows with sqrt(count), capped so a single user is a tiny dot.
function geoRadius(count) {
  return Math.min(16, 4 + Math.sqrt(Math.max(1, count)) * 1.6);
}

// Roll server tuples up into groups for the requested level, weighting the centroid by count.
function geoGroupPoints(points, level) {
  const groups = new Map();
  (points || []).forEach((p) => {
    if (typeof p.lat !== 'number' || typeof p.lon !== 'number') return;
    let key;
    let name;
    if (level === 'country') {
      key = p.countryCode || p.country || '??';
      name = p.country || p.countryCode || 'Unknown country';
    } else if (level === 'region') {
      key = `${p.countryCode}|${p.region || ''}`;
      name = p.region || 'Unknown state';
    } else if (level === 'city') {
      key = `${p.countryCode}|${p.region}|${p.city || ''}`;
      name = p.city || 'Unknown city';
    } else {
      key = `${p.countryCode}|${p.region}|${p.city}|${p.district || ''}`;
      name = p.district || p.city || 'Unknown area';
    }
    const c = p.count || 1;
    const g = groups.get(key) || { name, count: 0, latSum: 0, lonSum: 0 };
    g.count += c;
    g.latSum += p.lat * c;
    g.lonSum += p.lon * c;
    groups.set(key, g);
  });
  return Array.from(groups.values()).map((g) => ({
    name: g.name,
    count: g.count,
    lat: g.latSum / g.count,
    lon: g.lonSum / g.count
  }));
}

function GeoWorldMap({ points, focus }) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const highlightRef = useRef(null);
  const [level, setLevel] = useState('country');

  // Init the map once; re-group whenever the zoom crosses a level boundary.
  useEffect(() => {
    if (!elRef.current || mapRef.current) return undefined;
    const map = L.map(elRef.current, { worldCopyJump: true, minZoom: 2, maxZoom: 19, zoomControl: true }).setView([22, 12], 2);
    // OpenStreetMap standard tiles: free and key-less (CARTO basemaps started requiring an API key).
    // A CSS filter (see .dev-geo-map .leaflet-tile) darkens them to match the admin theme.
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      subdomains: 'abc',
      maxZoom: 19
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    map.on('zoomend', () => { setLevel(geoLevelForZoom(map.getZoom())); });
    // When the container resizes (window resize OR the full-map ↔ split-view layout switch),
    // tell Leaflet to recompute its size — otherwise setView/fly looks broken until a refresh.
    const ro = new ResizeObserver(() => { if (mapRef.current) mapRef.current.invalidateSize(); });
    ro.observe(elRef.current);
    mapRef.current = map;
    return () => { ro.disconnect(); map.remove(); mapRef.current = null; layerRef.current = null; };
  }, []);

  // (Re)draw dots whenever the data or the active level changes.
  useEffect(() => {
    if (!mapRef.current || !layerRef.current) return;
    layerRef.current.clearLayers();
    geoGroupPoints(points, level).forEach((g) => {
      const marker = L.circleMarker([g.lat, g.lon], {
        radius: geoRadius(g.count), color: '#10b981', weight: 1, fillColor: '#10b981', fillOpacity: 0.6
      });
      marker.bindTooltip(`${g.name} — ${g.count} ${g.count === 1 ? 'user' : 'users'}`);
      // Click a dot to zoom into it and reveal the next finer administrative level.
      marker.on('click', () => { mapRef.current.setView([g.lat, g.lon], geoZoomForLevel(level)); });
      marker.addTo(layerRef.current);
    });
  }, [points, level]);

  // When a searched user / signup / history point is provided, fly to it and pin a highlight
  // marker. Callers can override the pin colour and zoom so the current location (amber), the
  // frozen signup (blue) and history stops (green) are visually distinct.
  useEffect(() => {
    if (!mapRef.current || !focus || typeof focus.lat !== 'number' || typeof focus.lon !== 'number') return;
    mapRef.current.invalidateSize();
    mapRef.current.flyTo([focus.lat, focus.lon], focus.zoom || 12, { duration: 0.8 });
    if (highlightRef.current) { highlightRef.current.remove(); highlightRef.current = null; }
    const color = focus.color || '#f59e0b';
    highlightRef.current = L.circleMarker([focus.lat, focus.lon], {
      radius: 9, color, weight: 2, fillColor: color, fillOpacity: 0.9
    }).bindTooltip(focus.label || 'This user', { permanent: true, direction: 'top', offset: [0, -8] }).addTo(mapRef.current);
  }, [focus]);

  return (
    <div className="dev-geo-wrap">
      <div className="dev-geo-level">Showing by <strong>{GEO_LEVEL_LABEL[level]}</strong> · zoom in or tap a dot to drill deeper</div>
      <div ref={elRef} className="dev-geo-map" />
    </div>
  );
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
  // Cursor-based pagination state for the "Load All Users" browse list (10 per page).
  const [usersCursor, setUsersCursor] = useState(null);
  const [hasMoreUsers, setHasMoreUsers] = useState(false);
  const [loadingMoreUsers, setLoadingMoreUsers] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const usersSentinelRef = useRef(null);
  // User Database location filters: cascading Country → State → District → City selectors.
  // Options come from /api/admin/user-facets and carry live user counts.
  const [userCountry, setUserCountry] = useState('');
  const [userState, setUserState] = useState('');
  const [userDistrict, setUserDistrict] = useState('');
  const [userCity, setUserCity] = useState('');
  const [facetCountries, setFacetCountries] = useState([]);
  const [facetStates, setFacetStates] = useState([]);
  const [facetDistricts, setFacetDistricts] = useState([]);
  const [facetCities, setFacetCities] = useState([]);
  const searchDebounceRef = useRef(null);
  // Which user's full detail panel is expanded (single-open accordion so the list stays compact).
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastTopic, setBroadcastTopic] = useState('');
  const [broadcastType, setBroadcastType] = useState('info');
  const [broadcastAudience, setBroadcastAudience] = useState('all');
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [autoFooter, setAutoFooter] = useState(true);
  const [showBlockedOnly, setShowBlockedOnly] = useState(false);
  const [showAdminStoryUI, setShowAdminStoryUI] = useState(false);

  // ── Analytics sub-view + live-users feed ──
  const [analyticsView, setAnalyticsView] = useState('live'); // live | growth | locations | gender | peak | map
  // World-map geolocation feed (IP-derived user location clusters).
  const [geoData, setGeoData] = useState(null);               // { points, totalGeoUsers } | null
  const [geoLoading, setGeoLoading] = useState(false);
  // User Map: search a specific user by username / ID and jump to their location.
  const [locQuery, setLocQuery] = useState('');
  const [locResult, setLocResult] = useState(null);           // { found, user } | null
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState('');
  const [mapFocus, setMapFocus] = useState(null);             // { lat, lon, label, ts }
  const [showTopAreas, setShowTopAreas] = useState(true);     // Top-Areas overlay panel on the map
  // Top 10 city-level areas by located-user count (rolled up from the geo feed), for the map overlay.
  const topAreas = useMemo(() => {
    if (!geoData || !geoData.points) return [];
    return geoGroupPoints(geoData.points, 'city')
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [geoData]);
  const [liveUsers, setLiveUsers] = useState(null);           // { totals, users }
  // Page-based pagination for the Live Users roster (newest sign-ins on top, older pages fade away below).
  const [livePage, setLivePage] = useState(0);                 // 0-based current page
  const LIVE_PAGE_SIZE = 10;

  const [activeTab, setActiveTab] = useState('overview');
  // Which Overview sub-panel is revealed under the top button row (health | broadcast | globe).
  const [overviewView, setOverviewView] = useState('health');
  // Sidebar starts open on desktop, collapsed (off-canvas) on small screens.
  const [sidebarOpen, setSidebarOpen] = useState(() => (typeof window !== 'undefined' ? window.innerWidth > 900 : true));
  // Rolling server-health samples (last ~30) that drive the overview sparkline.
  const [healthHistory, setHealthHistory] = useState([]);
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
  const randomMessagesEndRef = useRef(null);
  const [unreadBotChats, setUnreadBotChats] = useState(new Set());
  const [botChatMessages, setBotChatMessages] = useState([]);
  const [botChatMessageInput, setBotChatMessageInput] = useState('');

  // ── Live Random page state ──
  const [liveQueue, setLiveQueue] = useState([]);            // waiting users board (max 10, newest first)
  const [liveStats, setLiveStats] = useState({ pairs: 0, inChat: 0, queue: 0, liveUsers: 0 }); // live stats row (pairs / in chat / queue / live on site)
  const [adminRightTab, setAdminRightTab] = useState('requests'); // requests | friends | chats
  const [showRightList, setShowRightList] = useState(false); // drawer open on the right pane
  const [conversations, setConversations] = useState([]);    // recent chats with previews
  const [drawerVisible, setDrawerVisible] = useState(10);     // Friends/Chats drawer pagination: 10 rows at a time (page was rendering every contact at once)
  const [identityForm, setIdentityForm] = useState(null);    // { botId, userId, requesterName, name, username, age, country, gender, bio }
  const [identitySaving, setIdentitySaving] = useState(false);
  const [liveTick, setLiveTick] = useState(Date.now());      // re-renders the "waiting Xs" labels every second
  const [requestToast, setRequestToast] = useState(null);    // transient toast when a new bot request arrives
  const [waitingAlert, setWaitingAlert] = useState(null);    // transient toast when a user joins the random-chat waiting queue
  const prevQueueCountRef = useRef(0);                        // edge-trigger the sound only when the queue actually grows
  // Same short beep the user app uses for message notifications.
  const playQueueBeep = () => {
    try {
      const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
      audio.play()?.catch(() => {});
    } catch (e) {}
  };

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

  // Auto-scroll the live-intercept chat to the newest message (no manual scrolling).
  useEffect(() => {
    if (randomMessagesEndRef.current) {
      randomMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [randomMessages]);

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
        fetchContacts(); // hydrate Connected/Requested/Blocked from the DB on (re)connect
      });
        
      newSocket.on('live_random_stats', (s) => {
        setLiveStats({ pairs: s?.pairs || 0, inChat: s?.inChat || 0, queue: s?.queue || 0, liveUsers: s?.liveUsers || 0 });
      });

      newSocket.on('admin_random_queue', (arr) => {
        const q = Array.isArray(arr) ? arr : [];
        setLiveQueue(q);
        // A user just joined the waiting queue (count grew) → beep once + toast, anywhere in the dashboard.
        const prev = prevQueueCountRef.current;
        prevQueueCountRef.current = q.length;
        if (q.length > prev && q.length > 0) {
          const newest = q[0];
          const uname = newest && newest.username ? newest.username : null;
          setWaitingAlert({
            count: q.length,
            username: uname,
            text: uname ? `@${uname} random chat ke liye wait kar raha hai — Intercept karo!` : `${q.length} user(s) random chat ke liye wait kar rahe hain — Intercept karo!`
          });
          playQueueBeep();
        }
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
        prevQueueCountRef.current = 0;
        newSocket.off('connect');
        newSocket.off('admin_random_queue');
        newSocket.off('live_random_stats');
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
        // Persist so a page refresh keeps the admin signed in until they tap "Exit Admin".
        sessionStorage.setItem('twelo_admin_key', password);
        setIsAuthenticated(true);
      } else {
        alert('Incorrect Developer Password');
      }
    } catch (err) {
      alert('Network Error. Is backend running?');
    }
  };

  // On mount, restore the admin session from sessionStorage (validating it once with
  // the server) so refreshing the dashboard no longer locks the user out.
  useEffect(() => {
    const saved = sessionStorage.getItem('twelo_admin_key');
    if (!saved || !API_URL) return;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/admin/stats`, { headers: { 'x-admin-pass': saved } });
        if (res.ok) { setPassword(saved); setIsAuthenticated(true); }
        else sessionStorage.removeItem('twelo_admin_key');
      } catch (err) { /* offline: stay logged out for now */ }
    })();
  }, [API_URL]);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/stats`, {
        headers: { 'x-admin-pass': password }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        if (data && data.serverHealth) {
          const sh = data.serverHealth;
          setHealthHistory(prev => [...prev, { ram: sh.ramUsage ?? 0, cpu: sh.cpuLoad ?? 0 }].slice(-30));
        }
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

  // Fetch the currently-online roster + totals for the Live Users panel.
  const fetchLiveUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/live-users`, {
        headers: { 'x-admin-pass': password }
      });
      if (res.ok) setLiveUsers(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch the IP-derived location clusters for the world-map panel.
  const fetchGeo = async () => {
    setGeoLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/geo`, { headers: { 'x-admin-pass': password } });
      if (res.ok) setGeoData(await res.json());
    } catch (err) { /* offline: keep last data */ }
    finally { setGeoLoading(false); }
  };

  // Look up a single user by username / ID and reveal their captured location on the map.
  const locateByQuery = async (rawQuery) => {
    const q = (rawQuery || '').trim();
    if (!q) { setLocError('Enter a username or ID first'); return; }
    setLocLoading(true); setLocError(''); setLocResult(null);
    try {
      const res = await fetch(`${API_URL}/api/admin/user-location?q=${encodeURIComponent(q)}`, { headers: { 'x-admin-pass': password } });
      const data = await res.json();
      if (!res.ok) { setLocError(data.error || data.message || 'Lookup failed'); return; }
      if (!data.found) { setLocError(`No user found for "${q}"`); return; }
      setLocResult(data);
      const u = data.user;
      if (typeof u.lat === 'number' && typeof u.lon === 'number') {
        setMapFocus({ lat: u.lat, lon: u.lon, label: `${u.username || u.name || u.uniqueId} — ${[u.city, u.region, u.country].filter(Boolean).join(', ') || 'located'}`, color: '#f59e0b', ts: Date.now() });
      }
    } catch (err) {
      setLocError('Network error while looking up user');
    } finally {
      setLocLoading(false);
    }
  };

  // Search-box submit on the User Map page.
  const handleLocateUser = async (e) => {
    e.preventDefault();
    await locateByQuery(locQuery);
  };

  // From the User Database: jump to the User Map page pre-loaded with this user's location + data.
  const openUserMap = (u) => {
    const q = u.username || u.uniqueId || u._id;
    setActiveTab('map');
    setLocQuery(q);
    locateByQuery(q);
  };

  // Load the geolocation feed when the User Map page is opened (and once on entry).
  useEffect(() => {
    if (isAuthenticated && activeTab === 'map' && !geoData) {
      fetchGeo();
    }
  }, [isAuthenticated, activeTab]);

  // While the Live Users panel is open, keep it fresh on a 5s heartbeat.
  useEffect(() => {
    if (isAuthenticated && activeTab === 'analytics' && analyticsView === 'live') {
      fetchLiveUsers();
      const id = setInterval(fetchLiveUsers, 5000);
      return () => clearInterval(id);
    }
  }, [isAuthenticated, activeTab, analyticsView]);

  // Build the shared query string for /api/admin/users (search text + location filters).
  const buildUsersQuery = ({ q = '', cursor = null } = {}) => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (userCountry) p.set('country', userCountry);
    if (userState) p.set('state', userState);
    if (userDistrict) p.set('district', userDistrict);
    if (userCity) p.set('city', userCity);
    p.set('limit', '10');
    if (cursor) p.set('cursor', cursor);
    return p.toString();
  };

  // Live search: fired from a 300ms debounce while typing — results arrive as the user
  // types, no need to press the Search button.
  const runLiveSearch = async (q) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/users?${buildUsersQuery({ q })}`, {
        headers: { 'x-admin-pass': password }
      });
      if (res.ok) {
        const data = await res.json();
        setIsSearchMode(true);
        setUsers(data.users || []);
        // Search results are paginated server-side too — keep scrolling through them.
        setUsersCursor(data.nextCursor || null);
        setHasMoreUsers(!!data.nextCursor);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Browse mode: (re)load the first page, narrowed by the selected location filters.
  const loadBrowse = async () => {
    try {
      setIsSearchMode(false);
      const res = await fetch(`${API_URL}/api/admin/users?${buildUsersQuery()}`, {
        headers: { 'x-admin-pass': password }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setUsersCursor(data.nextCursor || null);
        setHasMoreUsers(!!data.nextCursor);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Auto-refresh the list whenever a selector changes; debounce the text query so search
  // feels instant. With no query the tab simply browses (filtered) users on open.
  useEffect(() => {
    if (!isAuthenticated || activeTab !== 'users') return;
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (searchQuery.trim()) {
      searchDebounceRef.current = setTimeout(() => runLiveSearch(searchQuery.trim()), 300);
      return () => clearTimeout(searchDebounceRef.current);
    }
    loadBrowse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, activeTab, searchQuery, userCountry, userState, userDistrict, userCity]);

  // Facet options reload when the tab opens and cascade when country / state changes,
  // so every selector only ever shows places users actually signed up from.
  useEffect(() => {
    if (!isAuthenticated || activeTab !== 'users') return;
    const p = new URLSearchParams();
    if (userCountry) p.set('country', userCountry);
    if (userState) p.set('state', userState);
    fetch(`${API_URL}/api/admin/user-facets?${p.toString()}`, { headers: { 'x-admin-pass': password } })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!data) return;
        setFacetCountries(data.countries || []);
        setFacetStates(data.states || []);
        setFacetDistricts(data.districts || []);
        setFacetCities(data.cities || []);
      })
      .catch(err => console.error(err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, activeTab, userCountry, userState]);

  const handleSearch = (e) => {
    e.preventDefault();
    // Search now runs live as the user types; this submit just forces an immediate run.
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (searchQuery.trim()) runLiveSearch(searchQuery.trim());
    else loadBrowse();
  };

  const handleLoadAll = async () => {
    setSearchQuery('');
    await loadBrowse();
  };

  const clearUserFilters = () => {
    setUserCountry('');
    setUserState('');
    setUserDistrict('');
    setUserCity('');
    setSearchQuery('');
  };

  // Append the next page (works for BOTH browse and search results — the server pages
  // every mode with the same cursor). Typing a new query resets back to page 1.
  const loadMoreUsers = async () => {
    if (!usersCursor || loadingMoreUsers) return;
    setLoadingMoreUsers(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/users?${buildUsersQuery({ q: searchQuery.trim(), cursor: usersCursor })}`, {
        headers: { 'x-admin-pass': password }
      });
      if (res.ok) {
        const data = await res.json();
        const incoming = data.users || [];
        setUsers(prev => {
          const seen = new Set(prev.map(u => u._id));
          return [...prev, ...incoming.filter(u => !seen.has(u._id))];
        });
        setUsersCursor(data.nextCursor || null);
        setHasMoreUsers(!!data.nextCursor);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMoreUsers(false);
    }
  };

  // Infinite scroll: when the sentinel below the list enters view, load the next 10
  // (browse and search results alike).
  useEffect(() => {
    if (!hasMoreUsers) return;
    const el = usersSentinelRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) loadMoreUsers();
    }, { rootMargin: '200px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMoreUsers, usersCursor, loadingMoreUsers]);

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
    const audienceLabel = (BC_AUDIENCES.find(a => a.id === broadcastAudience) || {}).label || broadcastAudience;
    if (!window.confirm(`Send this broadcast to "${audienceLabel}" right now?`)) return;

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

    setBroadcastSending(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-pass': password },
        body: JSON.stringify({ message: finalMessage, alertType: broadcastType, audience: broadcastAudience })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Server error');
      setBroadcastMessage('');
      setBroadcastTopic('');
      setShowBroadcastModal(false);
      alert(`Broadcast delivered to ${data.sentCount ?? 0} ${audienceLabel.toLowerCase()} ✅`);
    } catch (err) {
      alert("Error sending broadcast: " + err.message);
    } finally {
      setBroadcastSending(false);
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
      // Deleted accounts carry a fresh archive _id — messages still reference the original one.
      const uid = user.originalUserId || user._id;
      const res = await fetch(`${API_URL}/api/admin/users/${uid}/chats`, {
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

  // Board "Cancel": hand this waiting user to a real AI-companion bot instead of intercepting.
  const releaseToBot = (userId) => {
    if (!userId || !adminSocket) return;
    adminSocket.emit('admin_release_to_bot', { targetUserId: userId });
  };

  const openLiveRandomPage = () => {
    fetchBotRequests();
    fetchBotChats();
    fetchConversations();
    fetchContacts();
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

  // Auto-dismiss the "waiting for random chat" alert (the persistent banner stays while users wait).
  useEffect(() => {
    if (!waitingAlert) return;
    const id = setTimeout(() => setWaitingAlert(null), 8000);
    return () => clearTimeout(id);
  }, [waitingAlert]);

  // Once the admin opens Live Random, the toast is no longer needed (banner still reflects the queue).
  useEffect(() => {
    if (activeTab === 'live-random') setWaitingAlert(null);
  }, [activeTab]);

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

  // Hydrate Connected / Requested / Blocked from the DB so they survive a page refresh.
  // (They used to be set only optimistically in-memory, which made friends look deleted
  //  after reload — the relationships were always in Mongo, the UI just forgot them.)
  const fetchContacts = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/bots/contacts`, { headers: { 'x-admin-pass': password } });
      if (res.ok) {
        const d = await res.json().catch(() => ({}));
        setFollowedIds(new Set(d.connected || []));
        setRequestedUserIds(new Set(d.requested || []));
        setBlockedIds(new Set(d.blocked || []));
      }
    } catch (err) { console.error(err); }
  };

  // Accepting a request opens the per-friend identity form first (how the admin will
  // appear to this user, since the admin was a stranger when the request was sent).
  const openIdentityForm = (req, mode = 'accept') => {
    // Prefill from the bot's existing persona so the admin doesn't retype it. But if the
    // persona is already dedicated to a DIFFERENT user, don't show their data — accepting
    // will clone a fresh bot for this requester, so start blank.
    const ownedByOther = req.bot.dedicatedTo && String(req.bot.dedicatedTo) !== String(req.requester._id);
    setIdentityForm({
      mode,
      botId: req.bot._id,
      userId: req.requester._id,
      requesterName: req.requester.username,
      name: ownedByOther ? '' : (req.bot.name || req.bot.username || ''),
      username: ownedByOther ? '' : (req.bot.username || ''),
      age: ownedByOther ? '' : (req.bot.age || ''),
      country: ownedByOther ? '' : (req.bot.country || ''),
      gender: ownedByOther ? 'male' : (req.bot.gender || 'male'),
      bio: ownedByOther ? '' : (req.bot.bio || '')
    });
  };

  // From the LIVE intercept chat: the admin wants to "add as friend" the user they're chatting
  // with. Open the same identity form first so the persona gets a real name BEFORE the request
  // is sent (mirrors how accepting an inbound request sets the admin's name).
  const openInterceptIdentity = () => {
    if (!activeRandomChat || !activeRandomChat.botAccount || !activeRandomChat.targetUser) return;
    const bot = activeRandomChat.botAccount;
    const target = activeRandomChat.targetUser;
    setIdentityForm({
      mode: 'send-request',
      botId: bot._id,
      userId: target._id,
      requesterName: target.username,
      name: bot.name || '',
      username: bot.username || '',
      age: bot.age || '',
      country: bot.country || '',
      gender: bot.gender || 'male',
      bio: bot.bio || ''
    });
  };

  // From a PERSISTENT bot chat the admin can also reach out to the user. This must go through
  // the SAME identity form (send-request mode) as the intercept — otherwise the request leaves
  // with no identity applied and the user sees the raw auto-generated persona name instead of
  // what the admin chose. submitIdentityForm then calls /bots/follow with the identity.
  const openBotChatIdentity = () => {
    if (!selectedBotChat || !selectedBotChat.bot || !selectedBotChat.user) return;
    const bot = selectedBotChat.bot;
    const target = selectedBotChat.user;
    // If this persona is already dedicated to a DIFFERENT user, don't prefill with their data —
    // the server clones a fresh dedicated persona for this user, so start blank.
    const ownedByOther = bot.dedicatedTo && String(bot.dedicatedTo) !== String(target._id);
    setIdentityForm({
      mode: 'send-request',
      botId: bot._id,
      userId: target._id,
      requesterName: target.username,
      name: ownedByOther ? '' : (bot.name || ''),
      username: ownedByOther ? '' : (bot.username || ''),
      age: ownedByOther ? '' : (bot.age || ''),
      country: ownedByOther ? '' : (bot.country || ''),
      gender: ownedByOther ? 'male' : (bot.gender || 'male'),
      bio: ownedByOther ? '' : (bot.bio || '')
    });
  };

  const submitIdentityForm = async (e) => {
    e.preventDefault();
    if (!identityForm || !identityForm.name.trim() || !identityForm.username.trim()) return;
    setIdentitySaving(true);
    try {
      const isSendRequest = identityForm.mode === 'send-request';
      const endpoint = isSendRequest ? 'follow' : 'accept';
      const res = await fetch(`${API_URL}/api/admin/bots/${endpoint}/${identityForm.botId}/${identityForm.userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-pass': password },
        body: JSON.stringify({ identity: { name: identityForm.name, username: identityForm.username, age: identityForm.age, country: identityForm.country, gender: identityForm.gender, bio: identityForm.bio } })
      });
      if (res.ok) {
        if (isSendRequest) {
          const data = await res.json().catch(() => ({}));
          const uid = String(identityForm.userId);
          if (data.connected) setFollowedIds(prev => new Set(prev).add(uid));
          else setRequestedUserIds(prev => new Set(prev).add(uid));
        } else {
          setBotRequests(prev => prev.filter(r => r.requester._id !== identityForm.userId || r.bot._id !== identityForm.botId));
        }
        setIdentityForm(null);
        fetchBotChats();
        fetchConversations();
        fetchContacts();
      } else {
        alert(isSendRequest ? 'Could not send the friend request.' : 'Could not accept the request.');
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

  // ── Block for the open bot chat ──
  // (Sending a friend request now goes through openBotChatIdentity → identity form → /bots/follow,
  //  so no admin-initiated request can leave without a set identity.)

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

  // Navigate to a section; on small screens a nav tap also closes the drawer.
  const goTab = (tab, after) => {
    setActiveTab(tab);
    if (typeof after === 'function') after();
    if (typeof window !== 'undefined' && window.innerWidth <= 900) setSidebarOpen(false);
  };

  // Shared sidebar navigation model (icon + label + optional live badge).
  const navItems = [
    { key: 'overview', label: 'Overview', icon: LayoutDashboard },
    { key: 'users', label: 'User Database', icon: Users },
    { key: 'reports', label: 'User Reports', icon: Flag, badge: reports.length, run: fetchReports },
    { key: 'live-random', label: 'Live Random', icon: Radio, badge: botRequests.length + liveQueue.length, run: openLiveRandomPage },
    { key: 'analytics', label: 'Analytics & Growth', icon: BarChart2 },
    { key: 'map', label: 'User Map', icon: MapIcon },
  ];

  return (
    <div className="dev-dashboard">
      <div className="dev-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="dev-hamburger" onClick={() => setSidebarOpen(o => !o)} title="Toggle menu" aria-label="Toggle menu">
            <Menu size={22} />
          </button>
          <AlertTriangle color="#ff4b4b" />
          <h2 style={{ color: '#fff', margin: 0 }}>Twelo Developer Admin</h2>
        </div>
        <button onClick={() => { sessionStorage.removeItem('twelo_admin_key'); setIsAuthenticated(false); navigate('/'); }} className="dev-btn-secondary">Exit Admin</button>
      </div>

      {/* Global "waiting for random chat" indication — visible on every tab while the queue is non-empty. */}
      {liveQueue.length > 0 && (
        <div
          onClick={() => goTab('live-random', openLiveRandomPage)}
          className={`dev-waiting-banner${waitingAlert ? ' dev-waiting-banner-alert' : ''}`}
          role="button"
        >
          <span className="dev-waiting-dot" />
          <span>
            <b>{waitingAlert && waitingAlert.username ? `@${waitingAlert.username}` : `${liveQueue.length} user${liveQueue.length > 1 ? 's' : ''}`}</b>
            {' '}random chat ke liye wait {' '}<b>Intercept karo ›</b>
          </span>
          <button className="dev-waiting-close" onClick={(e) => { e.stopPropagation(); setWaitingAlert(null); }} title="Dismiss">
            <X size={15} />
          </button>
        </div>
      )}

      <div className="dev-shell">
        {sidebarOpen && <div className="dev-sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}
        <aside className={`dev-sidebar${sidebarOpen ? '' : ' dev-sidebar-collapsed'}`}>
          <nav className="dev-nav">
            {navItems.map((it) => {
              const Icon = it.icon;
              return (
                <button
                  key={it.key}
                  className={`dev-nav-item${activeTab === it.key ? ' active' : ''}`}
                  onClick={() => goTab(it.key, it.run)}
                  title={it.label}
                >
                  <Icon size={18} />
                  <span className="dev-nav-label">{it.label}</span>
                  {it.badge > 0 && <span className="dev-nav-badge">{it.badge}</span>}
                </button>
              );
            })}
            <Link to="/admin/bot-training" className="dev-nav-item" style={{ textDecoration: 'none' }} title="Bot Training">
              <MessageSquare size={18} />
              <span className="dev-nav-label">Bot Training</span>
            </Link>
          </nav>
        </aside>

        <div className="dev-main-col">
          <div className={`dev-content${(activeTab === 'analytics' || activeTab === 'overview' || activeTab === 'map') ? ' dev-fit' : ''}`}>
            {/* ── OVERVIEW ── live health row + quick-control panels ── */}
            {activeTab === 'overview' && (
              <div className="dev-fit-content">
                {/* ── Top button row: each reveals its panel below ── */}
                <div className="dev-analytics-tabs">
                  <button className={`dev-analytics-tab${overviewView === 'health' ? ' active' : ''}`} onClick={() => setOverviewView('health')}><Activity size={16} /> Server Health</button>
                  <button className={`dev-analytics-tab${overviewView === 'broadcast' ? ' active' : ''}`} onClick={() => setOverviewView('broadcast')}><Send size={16} /> Broadcasts &amp; Stories</button>
                  <button className={`dev-analytics-tab${overviewView === 'globe' ? ' active' : ''}`} onClick={() => setOverviewView('globe')}><Globe size={16} /> Globe Control System</button>
                </div>

                {overviewView === 'health' && (
                <div className="dev-overview-hero">
                  <div className="dev-health-card">
                    <div className="dev-health-head">
                      <span className="dev-health-title"><Activity size={18} color="#10b981" /> Live Server Health</span>
                      {stats.serverHealth && (
                        <div className="dev-health-metrics">
                          <span style={{ color: stats.serverHealth.ramUsage > 90 ? '#ef4444' : '#10b981' }}>{stats.serverHealth.ramUsage}% RAM</span>
                          <span style={{ color: '#0095f6' }}>{stats.serverHealth.cpuLoad}% CPU</span>
                          <span style={{ color: '#8b5cf6' }}>{stats.serverHealth.dbStorageMB} MB DB</span>
                        </div>
                      )}
                    </div>
                    <HealthSparkline history={healthHistory} />
                    <div className="dev-spark-legend">
                      <span><i style={{ background: '#10b981' }} /> RAM</span>
                      <span><i style={{ background: '#0095f6' }} /> CPU</span>
                    </div>
                  </div>
                  <div className="dev-tile-row">
                    <div className="dev-tile">
                      <Users size={26} color="#0095f6" />
                      <div className="dev-tile-info"><h3>{stats.activeUsers}</h3><p>Active Users Online</p></div>
                    </div>
                    <div className="dev-tile">
                      <Globe size={26} color="#10b981" />
                      <div className="dev-tile-info"><h3>{stats.randomRooms}</h3><p>Active Random Rooms</p></div>
                    </div>
                    <div className="dev-tile">
                      <MessageSquare size={26} color="#f59e0b" />
                      <div className="dev-tile-info"><h3>{stats.queuedRandom}</h3><p>Users in Queue</p></div>
                      <button onClick={handleFlushQueue} className="dev-tile-action" title="Clear entire queue">
                        <RefreshCcw size={14} />
                      </button>
                    </div>
                  </div>
                </div>
                )}

        {/* Broadcasts & Stories (revealed by the top button) */}
        {overviewView === 'broadcast' && (
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
        </div>
        )}

        {/* Globe Control System (revealed by the top button) */}
        {overviewView === 'globe' && (
        <div className="dev-action-grid">
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

          </div>
        )}

              </div>
            )}

            {/* ── USER MAP: dedicated full page (sticky header + user search + drill-down map) ── */}
            {activeTab === 'map' && (
              <div className="dev-map-page">
                <div className="dev-map-topbar">
                  <div className="dev-map-title">
                    <h3 style={{ margin: 0 }}>User Map</h3>
                    <span className="dev-map-sub">Where users signed up / last logged in, by IP. Zoom in or tap a dot to drill country → state → city → district.</span>
                  </div>
                  <form className="dev-map-search" onSubmit={handleLocateUser}>
                    <Search size={16} />
                    <input
                      type="text"
                      placeholder="Username or ID to find their location…"
                      value={locQuery}
                      onChange={(e) => setLocQuery(e.target.value)}
                    />
                    <button type="submit" className="dev-btn" disabled={locLoading}>{locLoading ? 'Searching…' : 'Locate'}</button>
                  </form>
                </div>

                <div className="dev-map-toolbar">
                  <span><strong>{geoData ? geoData.totalGeoUsers.toLocaleString() : '—'}</strong> users located</span>
                  <span><strong>{geoData ? geoData.points.length : '—'}</strong> areas</span>
                  <button className={`dev-btn dev-btn-secondary${showTopAreas ? ' active' : ''}`} onClick={() => setShowTopAreas((s) => !s)}>
                    <MapIcon size={14} /> Top Areas
                  </button>
                  <button className="dev-btn dev-btn-secondary" onClick={fetchGeo} disabled={geoLoading}>
                    <RefreshCcw size={14} className={geoLoading ? 'dev-spin' : ''} /> {geoLoading ? 'Loading…' : 'Refresh'}
                  </button>
                </div>

                {locError && <div className="dev-map-msg dev-map-msg-err">{locError}</div>}

                {/* No search result → full-width map. After a search → split: left user card,
                    right a large square map box that flies to the user. */}
                <div className={`dev-map-body${locResult && locResult.user ? ' dev-map-body-split' : ''}`}>
                  {locResult && locResult.user && (() => {
                    const u = locResult.user;
                    const located = typeof u.lat === 'number' && typeof u.lon === 'number';
                    const nameOrId = u.username || u.name || u.uniqueId;
                    const placeOf = (o) => [o && o.city, o && o.region, o && o.country].filter(Boolean).join(', ') || 'located';
                    const focusPoint = (o, color, tag) => setMapFocus({ lat: o.lat, lon: o.lon, label: `${nameOrId}${tag ? ' · ' + tag : ''} — ${placeOf(o)}`, color, ts: Date.now() });
                    const signup = u.signup && typeof u.signup.lat === 'number' ? u.signup : null;
                    const history = Array.isArray(u.history) ? u.history.filter((h) => typeof h.lat === 'number') : [];
                    return (
                      <div className="dev-map-left">
                        <div className="dev-map-result">
                          <div className="dev-map-result-head">
                            <div>
                              <span className="dev-map-result-name">{u.name || '—'} <span className="dev-map-result-handle">@{u.username}</span></span>
                              <span className="dev-map-result-id">ID: {u.uniqueId}{u.isGuest ? ' · Guest' : ''}{u.isBlocked ? ' · Blocked' : ''}</span>
                            </div>
                            {located && <button className="dev-btn" onClick={() => focusPoint(u, '#f59e0b', 'current')}><MapIcon size={14} /> Show on map</button>}
                          </div>
                          {located ? (
                            <>
                              <div className="dev-map-sub-title">Current · last login</div>
                              <div className="dev-detail-grid">
                                <DetailItem label="Country" value={u.country} />
                                <DetailItem label="State / Region" value={u.region} />
                                <DetailItem label="City" value={u.city} />
                                <DetailItem label="District" value={u.district} />
                                <DetailItem label="Coordinates" value={`${u.lat.toFixed(3)}, ${u.lon.toFixed(3)}`} mono />
                                <DetailItem label="IP Address" value={u.lastIp} mono />
                                <DetailItem label="IP captured" value={fmtDateTime(u.lastIpAt)} />
                              </div>
                            </>
                          ) : (
                            <div className="dev-map-msg">No IP location stored for this user yet — it appears once they sign up or log in after location capture is live.</div>
                          )}

                          {signup && (
                            <div className="dev-map-signup">
                              <div className="dev-map-sub-title">
                                <span>Signup location · frozen</span>
                                <button className="dev-map-mini-btn" onClick={() => focusPoint(signup, '#3b82f6', 'signup')}><MapIcon size={12} /> Show</button>
                              </div>
                              <div className="dev-map-line">{placeOf(signup)}</div>
                              <div className="dev-map-line dev-map-muted">{fmtDateTime(signup.at)} · {signup.lat.toFixed(3)}, {signup.lon.toFixed(3)}</div>
                            </div>
                          )}

                          {history.length > 0 && (
                            <div className="dev-map-history">
                              <div className="dev-map-sub-title"><span>Login history · {history.length} place{history.length === 1 ? '' : 's'}</span></div>
                              <div className="dev-map-history-list">
                                {history.map((h, i) => (
                                  <button key={`${h.lat}-${h.lon}-${i}`} className="dev-map-history-row" onClick={() => focusPoint(h, '#22c55e', 'login')}>
                                    <span className="dev-map-history-place">{[h.city, h.region, h.country].filter(Boolean).join(', ') || 'Unknown'}</span>
                                    <span className="dev-map-history-time">{fmtDateTime(h.at)}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  <div className="dev-map-mapbox">
                    {showTopAreas && topAreas.length > 0 && (
                      <div className="dev-top-areas">
                        <div className="dev-top-areas-title">Top Areas · City</div>
                        {topAreas.map((a, i) => (
                          <button
                            key={`${a.name}-${i}`}
                            className="dev-top-area-row"
                            onClick={() => setMapFocus({ lat: a.lat, lon: a.lon, label: `${a.name} — ${a.count} ${a.count === 1 ? 'user' : 'users'}`, ts: Date.now() })}
                          >
                            <span className="dev-top-area-rank">{i + 1}</span>
                            <span className="dev-top-area-name">{a.name}</span>
                            <span className="dev-top-area-count">{a.count}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {geoLoading && !geoData ? (
                      <div className="dev-analytics-loading">Loading map data…</div>
                    ) : geoData && geoData.points && geoData.points.length ? (
                      <GeoWorldMap points={geoData.points} focus={mapFocus} />
                    ) : (
                      <div className="dev-analytics-loading">
                        No located users yet. Dots appear as users sign up or log in from now on (their IP gets geolocated).
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── DATA SECTIONS (open on the right when a sidebar item is active) ── */}
            {(activeTab === 'users' || activeTab === 'reports' || activeTab === 'live-random' || activeTab === 'analytics') && (
              <div className="dev-main">
                <h3 className="dev-section-title">{navItems.find(n => n.key === activeTab)?.label || 'Section'}</h3>

              {requestToast && (
                <div
                  onClick={() => { setActiveTab('live-random'); setAdminRightTab('requests'); setShowRightList(true); openLiveRandomPage(); setRequestToast(null); }}
                  style={{ position: 'fixed', top: '16px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: '#111827', color: '#fff', padding: '10px 16px', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.35)', border: '1px solid rgba(245,158,11,0.5)', cursor: 'pointer', fontSize: '0.9rem' }}
                >
                  {requestToast.text} · <b>View</b>
                </div>
              )}

              {activeTab === 'analytics' ? (
                <div className="dev-analytics-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                  {/* ── Top button row: each button reveals its panel below ── */}
                  <div className="dev-analytics-tabs">
                    <button className={`dev-analytics-tab${analyticsView === 'live' ? ' active' : ''}`} onClick={() => { setAnalyticsView('live'); setLivePage(0); }}><Users size={16} /> Live Users</button>
                    <button className={`dev-analytics-tab${analyticsView === 'growth' ? ' active' : ''}`} onClick={() => setAnalyticsView('growth')}><BarChart2 size={16} /> User Growth &amp; Acquisition</button>
                    <button className={`dev-analytics-tab${analyticsView === 'locations' ? ' active' : ''}`} onClick={() => setAnalyticsView('locations')}><Globe size={16} /> Top Locations</button>
                    <button className={`dev-analytics-tab${analyticsView === 'gender' ? ' active' : ''}`} onClick={() => setAnalyticsView('gender')}><Users size={16} /> Gender Distribution</button>
                    <button className={`dev-analytics-tab${analyticsView === 'peak' ? ' active' : ''}`} onClick={() => setAnalyticsView('peak')}><Activity size={16} /> Peak Activity (24 Hours)</button>
                  </div>

                  {/* ── LIVE USERS: totals + real-time sign-in roster (10 per page) ── */}
                  {analyticsView === 'live' && (
                    <div className="dev-live-panel">
                      <div className="dev-live-totals">
                        <MiniStat icon={UserCheck} label="Total Logins" value={liveUsers ? liveUsers.totals.totalLogins.toLocaleString() : '—'} grad="linear-gradient(135deg,#4f46e5,#7c3aed)" />
                        <MiniStat icon={Users} label="Total Users" value={liveUsers ? liveUsers.totals.totalUsers.toLocaleString() : '—'} grad="linear-gradient(135deg,#0ea5e9,#0284c7)" />
                        <MiniStat icon={UserPlus} label="Guest Users" value={liveUsers ? liveUsers.totals.guestUsers.toLocaleString() : '—'} grad="linear-gradient(135deg,#f59e0b,#d97706)" />
                        <MiniStat icon={Activity} label="Online Now" value={liveUsers ? liveUsers.totals.onlineNow.toLocaleString() : '—'} grad="linear-gradient(135deg,#10b981,#059669)" />
                        <MiniStat icon={Radio} label="Active Rooms" value={liveUsers ? liveUsers.totals.activeRooms.toLocaleString() : '—'} grad="linear-gradient(135deg,#ec4899,#be185d)" />
                        <MiniStat icon={Clock} label="In Queue" value={liveUsers ? liveUsers.totals.inQueue.toLocaleString() : '—'} grad="linear-gradient(135deg,#14b8a6,#0f766e)" />
                        {analyticsData && <MiniStat icon={Users} label="Daily Active (DAU)" value={analyticsData.dau} />}
                        {analyticsData && <MiniStat icon={Users} label="Monthly Active (MAU)" value={analyticsData.mau} />}
                        {analyticsData && <MiniStat icon={CheckCircle} label="Retention (Est.)" value={`${analyticsData.day1Retention}%`} />}
                        {analyticsData && <MiniStat icon={Clock} label="Avg Session" value={`${analyticsData.avgSessionMinutes}m`} />}
                        {analyticsData && <MiniStat icon={UserPlus} label="New Today" value={`+${analyticsData.todaySignups || 0}`} />}
                        <MiniStat icon={MessageSquare} label="Total Chats" value={totalChats} />
                        <MiniStat icon={Radio} label="Stories" value={totalStories} />
                      </div>
                      {(() => {
                        const all = liveUsers ? liveUsers.users : [];
                        const total = all.length;
                        const totalPages = Math.max(1, Math.ceil(total / LIVE_PAGE_SIZE));
                        const page = Math.min(livePage, totalPages - 1);
                        const start = page * LIVE_PAGE_SIZE;
                        const pageUsers = all.slice(start, start + LIVE_PAGE_SIZE);
                        return (
                          <>
                            <div className="dev-live-list">
                              {!liveUsers && <div className="dev-live-empty">Loading live users…</div>}
                              {liveUsers && total === 0 && <div className="dev-live-empty">No users are signed in right now.</div>}
                              {pageUsers.map((u) => (
                                <div key={u.userId} className="dev-live-row">
                                  <img className="dev-live-avatar" src={u.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.username || '?')}&background=random`} alt="" />
                                  <div className="dev-live-meta">
                                    <div className="dev-live-name">{u.name} <span>@{u.username}</span>{u.isGuest && <span className="dev-live-guest">guest</span>}</div>
                                    <div className="dev-live-sub">{u.country && u.country !== 'Earth' ? `📍 ${u.country}` : '🌍 Earth'} · {u.gender || '—'} · online since {new Date(u.since).toLocaleTimeString()}</div>
                                  </div>
                                  <div className="dev-live-activity">
                                    <span title="Messages sent"><MessageSquare size={13} /> {u.messagesSent}</span>
                                    <span title="Matches made"><Radio size={13} /> {u.matchesMade}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                            {liveUsers && totalPages > 1 && (
                              <div className="dev-live-pager">
                                <button className="dev-btn-secondary dev-live-pager-btn" disabled={page <= 0} onClick={() => setLivePage((p) => Math.max(0, p - 1))}>‹ Prev</button>
                                <span className="dev-live-pager-info">Page {page + 1} of {totalPages} · {total} online</span>
                                <button className="dev-btn-secondary dev-live-pager-btn" disabled={page >= totalPages - 1} onClick={() => setLivePage((p) => Math.min(totalPages - 1, p + 1))}>Next ›</button>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {/* ── USER GROWTH & ACQUISITION ── */}
                  {analyticsView === 'growth' && (analyticsData ? (
                    <>
                      <div className="dev-stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                        <div className="dev-stat-card" style={{ background: 'linear-gradient(135deg, #14b8a6, #0f766e)', border: 'none' }}>
                          <div className="stat-info"><h3 style={{ fontSize: '2rem' }}>+{analyticsData.todaySignups || 0}</h3><p style={{ color: '#ccfbf1' }}>New Users (Today)</p></div>
                        </div>
                        <div className="dev-stat-card" style={{ background: 'linear-gradient(135deg, #ec4899, #be185d)', border: 'none' }}>
                          <div className="stat-info"><h3 style={{ fontSize: '2rem' }}>+{growthTimeframe === 'monthly' ? (analyticsData.monthSignups || 0) : (analyticsData.yearSignups || 0)}</h3><p style={{ color: '#fbcfe8' }}>New Users ({growthTimeframe === 'monthly' ? 'Last 30 Days' : 'Last 12 Months'})</p></div>
                        </div>
                      </div>
                      {(analyticsData.growthData || analyticsData.yearlyGrowthData) && (
                        <div className="dev-panel">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                            <h4 style={{ margin: 0 }}>User Growth &amp; Acquisition ({growthTimeframe === 'monthly' ? 'Last 30 Days' : 'Last 12 Months'})</h4>
                            <div style={{ display: 'flex', gap: '10px' }}>
                              <button onClick={() => setGrowthTimeframe('monthly')} className={`dev-btn-${growthTimeframe === 'monthly' ? 'primary' : 'secondary'}`} style={{ padding: '5px 12px', fontSize: '0.8rem' }}>Monthly</button>
                              <button onClick={() => setGrowthTimeframe('yearly')} className={`dev-btn-${growthTimeframe === 'yearly' ? 'primary' : 'secondary'}`} style={{ padding: '5px 12px', fontSize: '0.8rem' }}>Yearly</button>
                            </div>
                          </div>
                          <div style={{ position: 'relative', height: 'calc(100vh - 430px)', minHeight: '220px', width: '100%' }}>
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
                                  tooltip: { backgroundColor: 'rgba(0,0,0,0.8)', titleColor: '#ec4899', bodyFont: { size: 14, weight: 'bold' }, padding: 12, displayColors: false }
                                }
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </>
                  ) : <div className="dev-analytics-loading">Loading analytics data…</div>)}

                  {/* ── TOP LOCATIONS ── */}
                  {analyticsView === 'locations' && (analyticsData && analyticsData.demographics ? (
                    <div className="dev-panel">
                      <h4 style={{ marginBottom: '15px' }}>Top Locations</h4>
                      <div className="dev-locations-grid">
                        <div style={{ position: 'relative', height: 'calc(100vh - 410px)', minHeight: '220px', width: '100%', maxWidth: '320px', margin: '0 auto' }}>
                          <Doughnut
                            data={{
                              labels: analyticsData.demographics.country.labels,
                              datasets: [{
                                data: analyticsData.demographics.country.counts,
                                backgroundColor: ['#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316', '#14b8a6', '#6366f1', '#eab308', '#d946ef'],
                                borderWidth: 0,
                                hoverOffset: 4
                              }]
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: { legend: { position: 'bottom', labels: { color: '#fff', boxWidth: 12, padding: 15 } }, tooltip: { backgroundColor: 'rgba(0,0,0,0.8)', titleColor: '#fff', padding: 12 } },
                              cutout: '60%'
                            }}
                          />
                        </div>
                        <div className="dev-locations-list">
                          {analyticsData.demographics.country.labels.map((label, i) => (
                            <div key={label} className="dev-location-row">
                              <span className="dev-location-rank">{i + 1}</span>
                              <span className="dev-location-name">{label}</span>
                              <span className="dev-location-count">{analyticsData.demographics.country.counts[i]}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : <div className="dev-analytics-loading">Loading analytics data…</div>)}

                  {/* ── GENDER DISTRIBUTION ── */}
                  {analyticsView === 'gender' && (analyticsData && analyticsData.demographics ? (
                    <div className="dev-panel">
                      <h4 style={{ marginBottom: '15px' }}>Gender Distribution</h4>
                      <div style={{ position: 'relative', height: 'calc(100vh - 430px)', minHeight: '200px', width: '100%', maxWidth: '340px', margin: '0 auto' }}>
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
                            plugins: { legend: { position: 'bottom', labels: { color: '#fff', font: { size: 14 } } }, tooltip: { backgroundColor: 'rgba(0,0,0,0.8)', titleColor: '#fff', padding: 12 } },
                            cutout: '70%'
                          }}
                        />
                      </div>
                      <div className="dev-live-totals" style={{ marginTop: '16px' }}>
                        <MiniStat icon={Users} label="Male" value={analyticsData.demographics.gender.male} grad="linear-gradient(135deg,#3b82f6,#2563eb)" />
                        <MiniStat icon={Users} label="Female" value={analyticsData.demographics.gender.female} grad="linear-gradient(135deg,#ec4899,#db2777)" />
                      </div>
                    </div>
                  ) : <div className="dev-analytics-loading">Loading analytics data…</div>)}

                  {/* ── PEAK ACTIVITY (24 HOURS) ── */}
                  {analyticsView === 'peak' && (analyticsData && analyticsData.peakHours ? (
                    <div className="dev-panel">
                      <h4 style={{ marginBottom: '15px' }}>Peak Activity Heatmap (24 Hours)</h4>
                      <div style={{ position: 'relative', height: 'calc(100vh - 350px)', minHeight: '240px', width: '100%' }}>
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
                            scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } }, x: { grid: { display: false } } },
                            plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(0,0,0,0.8)', titleColor: '#ec4899', padding: 12 } }
                          }}
                        />
                      </div>
                    </div>
                  ) : <div className="dev-analytics-loading">Loading analytics data…</div>)}

                </div>
              ) : activeTab === 'users' ? (
                <>
                  <form onSubmit={handleSearch} style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                    <input 
                      type="text" 
                      placeholder="Search database… (searches live as you type)"
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

                  {/* Cascading location filters: every option shows how many users signed up from there */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px', alignItems: 'center' }}>
                    <select
                      className="dev-input"
                      value={userCountry}
                      onChange={(e) => { setUserCountry(e.target.value); setUserState(''); setUserDistrict(''); setUserCity(''); }}
                      style={{ flex: '1 1 180px', minWidth: '160px' }}
                    >
                      <option value="">All Countries {facetCountries.length ? `(${facetCountries.reduce((s, c) => s + c.count, 0)})` : ''}</option>
                      {facetCountries.map(c => <option key={c._id} value={c._id}>{c._id} ({c.count})</option>)}
                    </select>
                    <select
                      className="dev-input"
                      value={userState}
                      onChange={(e) => { setUserState(e.target.value); setUserDistrict(''); setUserCity(''); }}
                      disabled={!userCountry}
                      style={{ flex: '1 1 150px', minWidth: '140px', opacity: userCountry ? 1 : 0.5 }}
                    >
                      <option value="">All States</option>
                      {facetStates.map(s => <option key={s._id} value={s._id}>{s._id} ({s.count})</option>)}
                    </select>
                    <select
                      className="dev-input"
                      value={userDistrict}
                      onChange={(e) => { setUserDistrict(e.target.value); setUserCity(''); }}
                      disabled={!userState}
                      style={{ flex: '1 1 150px', minWidth: '140px', opacity: userState ? 1 : 0.5 }}
                    >
                      <option value="">All Districts</option>
                      {facetDistricts.map(d => <option key={d._id} value={d._id}>{d._id} ({d.count})</option>)}
                    </select>
                    <select
                      className="dev-input"
                      value={userCity}
                      onChange={(e) => setUserCity(e.target.value)}
                      disabled={!userDistrict}
                      style={{ flex: '1 1 150px', minWidth: '140px', opacity: userDistrict ? 1 : 0.5 }}
                    >
                      <option value="">All Cities</option>
                      {facetCities.map(c => <option key={c._id} value={c._id}>{c._id} ({c.count})</option>)}
                    </select>
                    {(userCountry || userState || userDistrict || userCity || searchQuery) && (
                      <button type="button" onClick={clearUserFilters} className="dev-btn-secondary" style={{ backgroundColor: 'transparent', border: '1px solid #333' }} title="Clear country/state/district/city filters and search">
                        <X size={16} style={{ marginRight: '5px' }} />
                        Clear Filters
                      </button>
                    )}
                  </div>

                  <div className="dev-user-list">
                    {users.filter(u => showBlockedOnly ? u.isBlocked : true).map(u => (
                      <div key={u._id} className={`dev-user-card${expandedUserId === u._id ? ' dev-user-card-open' : ''}`}>
                        <div
                          className="dev-user-head"
                          role="button"
                          tabIndex={0}
                          aria-expanded={expandedUserId === u._id}
                          onClick={() => setExpandedUserId(expandedUserId === u._id ? null : u._id)}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedUserId(expandedUserId === u._id ? null : u._id); } }}
                        >
                          <img src={u.avatarUrl} alt="avatar" className="dev-avatar" />
                          <div className="dev-user-main">
                            <div className="dev-username">{u.name} <span className="dev-user-handle">@{u.username}</span>{u.isDeleted && <span style={{ color: '#ff4b4b', fontWeight: 700, fontSize: '0.82rem', marginLeft: '6px', whiteSpace: 'nowrap' }}>(deleted account)</span>}</div>
                            <div className="dev-user-idline">ID: {u.uniqueId}</div>
                          </div>
                          <div className="dev-user-chips">
                            {u.ownedByAdmin ? <span className="dev-chip dev-chip-bot">Bot</span> : null}
                            {u.isGuest ? <span className="dev-chip dev-chip-guest">Guest</span> : null}
                            {u.isDeleted
                              ? <span className="dev-chip" style={{ background: 'rgba(255,75,75,0.14)', color: '#ff4b4b', border: '1px solid rgba(255,75,75,0.4)' }}>Deleted</span>
                              : <span className={`dev-chip ${u.isBlocked ? 'dev-chip-blocked' : 'dev-chip-active'}`}>{u.isBlocked ? 'Blocked' : 'Active'}</span>}
                            {(u.resolvedLocation?.city || u.resolvedLocation?.district) && <span className="dev-chip" title={`Location: ${[u.resolvedLocation.city, u.resolvedLocation.district, u.resolvedLocation.region, u.resolvedLocation.country].filter(Boolean).join(', ')}`}>📍 {u.resolvedLocation.city || u.resolvedLocation.district}</span>}
                            <span className="dev-chip dev-chip-coins" title="Coins">{u.coins} coins</span>
                          </div>
                          <span className="dev-user-expand" aria-hidden="true">
                            {expandedUserId === u._id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </span>
                        </div>

                        {expandedUserId === u._id && (
                          <div className="dev-user-detail">
                            <div className="dev-detail-grid">
                              <DetailItem label="Email" value={u.email} />
                              <DetailItem label="Google ID" value={u.googleId} mono />
                              <DetailItem label="Mongo ID" value={u.originalUserId || u._id} mono />
                              {u.isDeleted && <DetailItem label="Deleted at" value={fmtDateTime(u.deletedAt)} />}
                              <DetailItem label="Account type" value={u.ownedByAdmin ? 'Admin bot' : (u.isGuest ? 'Guest' : 'Registered')} />
                              <DetailItem label="Gender" value={u.gender} />
                              <DetailItem label="Age" value={u.age} />
                              <DetailItem label="Country" value={`${u.country || '—'}${u.countryCode ? ` (${u.countryCode})` : ''}`} />
                              <DetailItem label="Location" value={u.resolvedLocation ? [u.resolvedLocation.city, u.resolvedLocation.district, u.resolvedLocation.region, u.resolvedLocation.country].filter(Boolean).join(', ') || '—' : '—'} />
                              <DetailItem label="Signup location" value={[u.signupCity, u.signupDistrict, u.signupRegion, u.signupCountry].filter(Boolean).join(', ') || '—'} />
                              <DetailItem label="Last seen at" value={[u.lastCity, u.lastDistrict, u.lastRegion].filter(Boolean).join(', ') || '—'} />
                              <DetailItem label="Private profile" value={u.isPrivate ? 'Yes' : 'No'} />
                              <DetailItem label="Joined" value={fmtDateTime(u.createdAt)} />
                              <DetailItem label="Last active" value={fmtDateTime(u.lastActive)} />
                              <DetailItem label="Followers" value={u.followers?.length || 0} />
                              <DetailItem label="Following" value={u.following?.length || 0} />
                              <DetailItem label="Pending requests" value={u.friendRequests?.length || 0} />
                              <DetailItem label="Blocked (by them)" value={u.blockedUsers?.length || 0} />
                              <DetailItem label="Notifications" value={u.notifications?.length || 0} />
                              <DetailItem label="Push (FCM)" value={u.fcmToken ? 'Enabled' : 'No'} />
                              <DetailItem label="Last coin refill" value={fmtDateTime(u.lastCoinReplenishDate)} />
                              <DetailItem label="IP Address" value={u.lastIp} mono />
                              <DetailItem label="IP captured" value={fmtDateTime(u.lastIpAt)} />
                              <DetailItem label="Last login" value={fmtDateTime(u.lastLoginAt)} />
                              <DetailItem label="Total logins" value={u.loginCount || 0} />
                              {/* Device metadata collected passively on app open (deviceInfo = latest snapshot) */}
                              <DetailItem label="Device" value={u.deviceInfo ? [u.deviceInfo.brand, u.deviceInfo.model].filter(Boolean).join(' ') || u.deviceInfo.model || '—' : '— (app never reported / old build)'} />
                              <DetailItem label="OS / Platform" value={u.deviceInfo ? `${u.deviceInfo.os || '—'} · ${u.deviceInfo.platform || '—'}` : '—'} />
                              <DetailItem label="App version" value={u.deviceInfo?.appVersion ? `${u.deviceInfo.app || 'Twelo'} v${u.deviceInfo.appVersion}` : '—'} />
                              <DetailItem label="Browser / WebView" value={u.deviceInfo?.browser || '—'} />
                              <DetailItem label="Screen" value={u.deviceInfo?.screen ? `${u.deviceInfo.screen} @${u.deviceInfo.dpr || 1}x` : '—'} />
                              <DetailItem label="Network" value={u.deviceInfo?.networkType || '—'} />
                              <DetailItem label="Timezone / Lang" value={u.deviceInfo ? `${u.deviceInfo.timezone || '—'} · ${u.deviceInfo.language || '—'}` : '—'} />
                              <DetailItem label="RAM / Cores" value={u.deviceInfo ? `${u.deviceInfo.memoryGB ?? '—'} GB / ${u.deviceInfo.cores ?? '—'}` : '—'} />
                              <DetailItem label="Device ID" value={u.deviceId || u.deviceInfo?.deviceId || '—'} mono />
                              <DetailItem label="Known devices" value={u.deviceHistory?.length ? `${u.deviceHistory.length} (last: ${fmtDateTime(u.deviceHistory[u.deviceHistory.length - 1].lastSeen || u.deviceHistory[u.deviceHistory.length - 1].firstSeen)})` : '—'} />
                              <DetailItem label="Bio" value={u.bio} full />
                            </div>
                            <div className="dev-user-actions">
                              {!u.isDeleted && (
                              <button
                                onClick={() => handlePersonalNotification(u._id, u.username)}
                                className="dev-btn-secondary"
                                style={{ background: '#222', color: '#fff', border: '1px solid #333' }}
                              >
                                <Send size={16} style={{ marginRight: '5px' }} />
                                Send Alert
                              </button>
                              )}
                              <button onClick={() => handleViewChats(u)} className="dev-btn-secondary">
                                <MessageSquare size={16} style={{ marginRight: '5px' }} />
                                View All Chats
                              </button>
                              <button onClick={() => openUserMap(u)} className="dev-btn-secondary" title="View this user's location on the User Map">
                                <MapIcon size={16} style={{ marginRight: '5px' }} />
                                Map
                              </button>
                              {!u.isDeleted && (
                              <>
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
                                style={{ background: '#ff4b4b', color: '#fff' }}
                                title="Permanently Delete User"
                              >
                                <Trash2 size={16} style={{ marginRight: '5px' }} />
                                Delete
                              </button>
                              </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {users.length === 0 && !loadingMoreUsers && (
                      <div style={{ textAlign: 'center', color: '#a8a8a8', marginTop: '20px' }}>
                        {searchQuery ? <>No users found for "{searchQuery}"{userCountry ? ` in ${userCountry}` : ''}</> : 'No users match the selected filters.'}
                      </div>
                    )}
                    {/* Infinite-scroll sentinel + manual fallback (browse and search) */}
                    {hasMoreUsers && (
                      <div ref={usersSentinelRef} style={{ textAlign: 'center', marginTop: '16px', color: '#a8a8a8' }}>
                        {loadingMoreUsers ? 'Loading…' : (
                          <button onClick={loadMoreUsers} className="dev-btn-secondary" style={{ backgroundColor: '#222' }}>
                            <RefreshCcw size={16} style={{ marginRight: '6px' }} />
                            Load 10 more
                          </button>
                        )}
                      </div>
                    )}
                    {!hasMoreUsers && users.length > 0 && (
                      <div style={{ textAlign: 'center', marginTop: '16px', color: '#666', fontSize: '0.85rem' }}>— {searchQuery ? 'End of results' : 'End of list'} —</div>
                    )}
                  </div>
                </>
              ) : activeTab === 'reports' ? (
                <div className="dev-reports-list">
                  {reports.length === 0 ? (
                    <div className="rp-empty">🎉 No pending reports — nothing to moderate right now.</div>
                  ) : (
                    reports.map(report => {
                      const repeat = report.reportsAgainstUser >= 2;
                      const av = `https://ui-avatars.com/api/?name=${encodeURIComponent(report.reportedUsername || '?')}&background=random&color=fff&size=96&bold=true`;
                      return (
                        <div key={report._id} className={`rp-card${repeat ? ' rp-card-repeat' : ''}`}>
                          <div className="rp-avatar"><img src={av} alt="" /></div>
                          <div className="rp-body">
                            <div className="rp-title-row">
                              <span className="rp-user">@{report.reportedUsername}</span>
                              <span className="rp-was">reported by</span>
                              <span className="rp-reporter">@{report.reporterUsername}</span>
                            </div>
                            <div className="rp-reason"><Flag size={13} /> <span>{report.reason}</span></div>
                            <div className="rp-foot">
                              <span className="rp-time" title={fmtDateTime(report.createdAt)}>🕒 {timeAgo(report.createdAt)}</span>
                              {report.warnSent && <span className="rp-warned">✓ Warning sent</span>}
                            </div>
                          </div>
                          <div className="rp-side">
                            {repeat
                              ? <span className="rp-badge rp-badge-repeat" title={`Total ${report.reportsAgainstUser} reports against this user`}>⚠ {report.reportsAgainstUser}× reports</span>
                              : <span className="rp-badge rp-badge-first">1st report</span>}
                            <button className="rp-btn" onClick={() => openInvestigate(report)}>
                              <Search size={15} /> Investigate
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : activeTab === 'live-random' ? (
                <>
                  {/* Top stats row: pairs currently chatting, users in chat, users queued */}
                  <div className="lr-stats-row">
                    <div className="lr-stat">
                      <span className="lr-stat-val">{liveStats.pairs}</span>
                      <span className="lr-stat-label">Pairs chatting</span>
                    </div>
                    <div className="lr-stat">
                      <span className="lr-stat-val">{liveStats.inChat}</span>
                      <span className="lr-stat-label">Users in chat</span>
                    </div>
                    <div className="lr-stat lr-stat-queue">
                      <span className="lr-stat-val">{liveStats.queue}</span>
                      <span className="lr-stat-label">In queue</span>
                    </div>
                    <div className="lr-stat lr-stat-live">
                      <span className="lr-stat-val">{liveStats.liveUsers}</span>
                      <span className="lr-stat-label">Live on site</span>
                    </div>
                  </div>
                  <div className="live-random-wrap">
                    {/* LEFT: live waiting board */}
                    <aside className="live-random-left">
                      <div className="lr-left-head">
                        <span className="lr-live-dot" />
                        <h3>Waiting Now</h3>
                        <span className="lr-count">{liveQueue.length}</span>
                      </div>
                      <div className="lr-left-sub">Users who pressed Match with no partner. Tap to intercept &amp; chat, or ✕ to hand them to a bot. Newest first (max 10).</div>
                      <div className="lr-list">
                        {liveQueue.length === 0 ? (
                          <div className="lr-empty">No one waiting right now. 🎉</div>
                        ) : liveQueue.map((u) => {
                          const secs = Math.max(0, Math.floor((liveTick - (u.waitingSince || liveTick)) / 1000));
                          return (
                            <div key={u.userId} role="button" tabIndex={0} className="lr-user-row" onClick={() => interceptUser(u.userId)}>
                              <div className="lr-avatar">
                                <img src={u.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.username || '?')}&background=random`} alt='' />
                              </div>
                              <div className="lr-user-meta">
                                <span className="lr-user-name">@{u.username}</span>
                                <span className="lr-user-sub">{u.country && u.country !== 'Earth' ? `📍 ${u.country}` : '🌍 Earth'} · {u.gender || '—'} · waiting {secs}s</span>
                              </div>
                              <button className="lr-row-cancel" title="Cancel — match them with a bot instead of intercepting" onClick={(e) => { e.stopPropagation(); releaseToBot(u.userId); }}>✕</button>
                              <span className="lr-intercept">Intercept ›</span>
                            </div>
                          );
                        })}
                      </div>
                    </aside>

                    {/* RIGHT: chat + top row */}
                    <section className="live-random-right">
                      <div className="lr-row">
                        <button className={`lr-row-btn ${adminRightTab === 'requests' && showRightList ? 'active' : ''}`} onClick={() => { setAdminRightTab('requests'); setDrawerVisible(10); setShowRightList(true); }}>
                          <UserPlus size={16} /> Requests {botRequests.length > 0 && <span className="lr-badge">{botRequests.length}</span>}
                        </button>
                        <button className={`lr-row-btn ${adminRightTab === 'friends' && showRightList ? 'active' : ''}`} onClick={() => { setAdminRightTab('friends'); setDrawerVisible(10); setShowRightList(true); }}>
                          <UserCheck size={16} /> Friends {botChats.length > 0 && <span className="lr-badge">{botChats.length}</span>}
                        </button>
                        <button className={`lr-row-btn ${adminRightTab === 'chats' && showRightList ? 'active' : ''}`} onClick={() => { setAdminRightTab('chats'); setDrawerVisible(10); setShowRightList(true); fetchConversations(); }}>
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
                              <div className="lr-chat-actions">
                                {(() => {
                                  const uid = String(activeRandomChat.targetUser?._id || '');
                                  if (uid && followedIds.has(uid)) return <span className="lr-act lr-act-static" title="Connected"><UserCheck size={18} /></span>;
                                  if (uid && requestedUserIds.has(uid)) return <span className="lr-act lr-act-static" title="Request sent — waiting for them to accept"><Clock size={18} /></span>;
                                  return <button className="lr-act" title="Add as friend (send request)" onClick={openInterceptIdentity}><UserPlus size={18} /></button>;
                                })()}
                                <button className="lr-leave" onClick={() => { if (adminSocket) { adminSocket.emit('send_anonymous_message', { roomId: activeRandomChat.roomId, messageText: 'bye' }); adminSocket.emit('leave_anonymous_chat', { roomId: activeRandomChat.roomId }); } setActiveRandomChat(null); }}>Leave</button>
                              </div>
                            </div>
                            <div className="lr-chat-body">
                              {randomMessages.map((msg, i) => (
                                <div key={i} className={`msg-wrapper ${msg.isMine ? 'sent' : 'received'}`}><div className="msg-bubble"><div>{msg.message}</div></div></div>
                              ))}
                              <div ref={randomMessagesEndRef} />
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
                                  : <button className="lr-act" title="Add as friend (set identity, then send request)" onClick={openBotChatIdentity}><UserPlus size={18} /></button>}
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
                              botChats.length === 0 ? <div className="lr-empty">No friends yet. Accept a request first.</div> : <>
                              {botChats.slice(0, drawerVisible).map((chat, i) => (
                                <div key={i} className="lr-drawer-item clickable" onClick={() => openBotChat(chat)}>
                                  <img className="lr-avatar-sm" src={chat.user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.user.username)}`} alt='' />
                                  <div className="lr-drawer-meta">
                                    <span className="lr-drawer-title">@{chat.user.username}</span>
                                    <span className="lr-drawer-sub">as @{chat.bot.username}</span>
                                  </div>
                                  <MessageSquare size={16} color="#10b981" />
                                </div>
                              ))}
                              {botChats.length > drawerVisible && (
                                <button className="lr-load-more" onClick={() => setDrawerVisible(v => v + 10)}>
                                  Load more ({botChats.length - drawerVisible} remaining)
                                </button>
                              )}
                              </>
                            )}
                            {adminRightTab === 'chats' && (
                              conversations.length === 0 ? <div className="lr-empty">No conversations yet.</div> : <>
                              {conversations.slice(0, drawerVisible).map((c, i) => (
                                <div key={i} className="lr-drawer-item clickable" onClick={() => openBotChat({ bot: c.bot, user: c.user })}>
                                  <img className="lr-avatar-sm" src={c.user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.user.username)}`} alt='' />
                                  <div className="lr-drawer-meta">
                                    <span className="lr-drawer-title">@{c.user.username}</span>
                                    <span className="lr-drawer-sub">{c.mine ? 'You: ' : ''}{c.lastMessage || '—'}</span>
                                  </div>
                                  {(unreadBotChats.has(String(c.userId || c.user._id))) && <span className="lr-unread" />}
                                </div>
                              ))}
                              {conversations.length > drawerVisible && (
                                <button className="lr-load-more" onClick={() => setDrawerVisible(v => v + 10)}>
                                  Load more ({conversations.length - drawerVisible} remaining)
                                </button>
                              )}
                              </>
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
                        <h3>{identityForm.mode === 'send-request' ? `Add @${identityForm.requesterName} as friend` : `Set your identity for @${identityForm.requesterName}`}</h3>
                        <p className="lr-modal-sub">{identityForm.mode === 'send-request' ? "Set the name/identity you want to appear with — it's saved before the request is sent." : "This is how you'll appear to them (you were a stranger when they requested)."}</p>
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
                          <button type="submit" className="dev-btn-primary" style={{ background: '#10b981' }} disabled={identitySaving}>{identitySaving ? 'Saving…' : (identityForm.mode === 'send-request' ? 'Send Request' : 'Accept & Save')}</button>
                        </div>
                      </form>
                    </div>
                  )}
                </>
              ) : null}
              </div>
            )}
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

      {selectedReport && (() => {
        const rep = selectedReport;
        const isRepeat = rep.reportsAgainstUser >= 2;
        let msgs = [];
        let parseFailed = false;
        if (rep.chatContext) {
          try { const p = JSON.parse(rep.chatContext); if (Array.isArray(p)) msgs = p; else parseFailed = true; }
          catch (e) { parseFailed = true; }
        }
        const av = `https://ui-avatars.com/api/?name=${encodeURIComponent(rep.reportedUsername || '?')}&background=random&color=fff&size=96&bold=true`;
        return (
        <div className="modal-overlay" onClick={() => setSelectedReport(null)}>
          <div className="inv-modal" onClick={e => e.stopPropagation()}>
            {/* Sticky header */}
            <div className="inv-head">
              <img className="inv-avatar" src={av} alt="" />
              <div className="inv-head-txt">
                <div className="inv-title">Report Investigation</div>
                <div className="inv-user">@{rep.reportedUsername}</div>
              </div>
              <button className="inv-close" onClick={() => setSelectedReport(null)}><X size={20} /></button>
            </div>

            {/* Scrollable body */}
            <div className="inv-body">
              <div className="inv-reason"><Flag size={14} /> <b>Reason:</b> <span>{rep.reason}</span></div>

              <div className="inv-facts">
                <span>Reporter: <b>@{rep.reporterUsername}</b></span>
                <span>Filed: <b>{fmtDateTime(rep.createdAt)}</b></span>
                {isRepeat
                  ? <span className="inv-badge inv-badge-repeat">⚠ {rep.reportsAgainstUser} reports — consider blocking</span>
                  : <span className="inv-badge inv-badge-first">First report</span>}
                {rep.warnSent && <span className="inv-badge inv-badge-warned">✓ Warning sent</span>}
              </div>

              <div className="inv-chat">
                <div className="inv-chat-label">🔒 Last 20 messages between them (server-decrypted for review)</div>
                {parseFailed && rep.chatContext
                  ? <pre className="inv-raw">{rep.chatContext}</pre>
                  : msgs.length === 0
                    ? <div className="inv-chat-empty">No chat context available.</div>
                    : msgs.map((m, i) => {
                        const isReported = m.from === rep.reportedUsername;
                        return (
                          <div key={i} className={`inv-msg${isReported ? ' inv-msg-left' : ' inv-msg-right'}`}>
                            <div className="inv-bubble">
                              <span className="inv-bubble-text">{m.type === 'image' ? '📷 Image' : m.type === 'audio' ? '🎵 Audio' : m.type === 'screenshot' ? '📸 Took a screenshot' : (m.message || '(empty)')}</span>
                              {m.deletedForEveryone && <span className={`inv-deleted${m.recovered ? ' inv-deleted-ok' : ''}`}>🗑️ {m.recovered ? 'deleted (original recovered)' : 'deleted — content gone'}</span>}
                            </div>
                            <div className="inv-msg-meta"><b>@{m.from}</b>{m.time ? ` · ${new Date(m.time).toLocaleString()}` : ''}</div>
                          </div>
                        );
                      })}
              </div>

              <div className="inv-warn">
                <label>Warning notice to @{rep.reportedUsername} <span>(built-in from the report reason — editable)</span></label>
                <textarea
                  value={warnNotice}
                  onChange={(e) => setWarnNotice(e.target.value)}
                  disabled={rep.warnSent}
                  rows={4}
                  className="dev-input inv-textarea"
                  placeholder="Enter the warning message to send to this user..."
                />
                <button type="button" className="inv-reset" onClick={() => setWarnNotice(buildWarning(rep.reason, rep.reportedUsername))} disabled={rep.warnSent}>Reset to built-in text</button>
              </div>
            </div>

            {/* Sticky footer actions */}
            <div className="inv-foot">
              <button className="inv-btn inv-btn-warn" onClick={() => handleSendReportWarning(rep)} disabled={rep.warnSent || sendingWarn}>
                <AlertTriangle size={16} /> {sendingWarn ? 'Sending…' : (rep.warnSent ? 'Warning Sent' : 'Send Warning')}
              </button>
              <button className="inv-btn inv-btn-block" onClick={() => handleBlockUser(rep.reportedUserId, false)}>
                <Ban size={16} /> Block User
              </button>
              <button className="inv-btn inv-btn-resolve" onClick={() => handleResolveReport(rep._id)} disabled={resolvingReport}>
                <CheckCircle size={16} /> {resolvingReport ? 'Resolving…' : 'Mark as Resolved'}
              </button>
            </div>
          </div>
        </div>
        );
      })()}

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
      {/* Broadcast Studio — right-side full-height drawer (replaces the old centered modal) */}
      {showBroadcastModal && (
        <div className="bc-overlay" onClick={() => setShowBroadcastModal(false)}>
          <div className="bc-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="bc-head">
              <div>
                <h2 className="bc-title"><Send size={20} color="#4f9cff" /> Broadcast Studio</h2>
                <div className="bc-sub">Craft and send an in-app notification to a targeted audience</div>
              </div>
              <button className="bc-close" onClick={() => setShowBroadcastModal(false)} title="Close"><X size={18} /></button>
            </div>

            <div className="bc-body">
              <div>
                <div className="bc-label">Quick Templates</div>
                <div className="bc-templates">
                  {BC_TEMPLATES.map((tpl) => (
                    <button key={tpl.id} type="button" className="bc-tpl" onClick={() => {
                      setBroadcastType(tpl.type);
                      setBroadcastTopic(tpl.topic);
                      setBroadcastMessage(tpl.body);
                    }}>{tpl.label}</button>
                  ))}
                </div>
              </div>

              <div>
                <div className="bc-label">Alert Type</div>
                <div className="bc-types">
                  {BC_TYPES.map((t) => (
                    <button key={t.id} type="button" onClick={() => setBroadcastType(t.id)}
                      className={`bc-opt${broadcastType === t.id ? ` on-${t.id}` : ''}`}>
                      <span className="bc-emoji">{t.emoji}</span>{t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="bc-label">Audience</div>
                <div className="bc-auds">
                  {BC_AUDIENCES.map((a) => (
                    <button key={a.id} type="button" onClick={() => setBroadcastAudience(a.id)}
                      className={`bc-opt${broadcastAudience === a.id ? ' on-neutral' : ''}`}>
                      <span className="bc-emoji">{a.emoji}</span>{a.label}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleBroadcast} style={{ display: 'contents' }}>
                <div>
                  <div className="bc-label">
                    <span>Topic / Subject</span>
                    <span className="bc-count">{broadcastTopic.length}/60</span>
                  </div>
                  <input
                    type="text"
                    value={broadcastTopic}
                    onChange={(e) => setBroadcastTopic(e.target.value)}
                    placeholder="e.g. SYSTEM MAINTENANCE"
                    className="bc-input"
                    maxLength={60}
                    required
                  />
                </div>

                <div style={{ marginTop: 20 }}>
                  <div className="bc-label">
                    <span>Message Body</span>
                    <span className="bc-count">{broadcastMessage.length}/500</span>
                  </div>
                  <textarea
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    placeholder="Enter multi-line message here…"
                    className="bc-textarea"
                    maxLength={500}
                    required
                  />
                  <div className="bc-hint">Line breaks are preserved exactly as typed.</div>
                </div>

                <div style={{ marginTop: 20 }}>
                  <div className="bc-label">How users will see it</div>
                  <div className="bc-preview-card" style={{ '--bc-accent': (BC_TYPES.find(t => t.id === broadcastType) || BC_TYPES[0]).accent }}>
                    <span className="bc-preview-icon">{{ info: 'ℹ️', warning: '⚠️', success: '✅', urgent: '🚨' }[broadcastType] || '📢'}</span>
                    <div style={{ minWidth: 0 }}>
                      <div className="bc-preview-title">{(broadcastTopic || 'YOUR TOPIC HERE').toUpperCase()}</div>
                      <div className="bc-preview-body">{broadcastMessage || 'Message body preview appears here…'}</div>
                      {autoFooter && <div className="bc-preview-foot">Thank you,<br />Twelo Administration</div>}
                    </div>
                  </div>
                </div>

                <div className="bc-footer-row" style={{ marginTop: 20 }}>
                  <input type="checkbox" id="autoFooter" checked={autoFooter} onChange={(e) => setAutoFooter(e.target.checked)} />
                  <label htmlFor="autoFooter" style={{ cursor: 'pointer' }}>Add professional footer ("Thank you, Twelo Administration")</label>
                </div>

                <div className="bc-foot">
                  <button type="button" className="bc-clear" onClick={() => { setBroadcastTopic(''); setBroadcastMessage(''); }}>Clear</button>
                  <button type="submit" className="bc-send" disabled={broadcastSending}>
                    {broadcastSending ? 'Sending…' : <><Send size={17} /> Send Broadcast</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

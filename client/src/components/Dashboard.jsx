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
  Layers,
  ChevronDown,
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
  Loader2,
  Share2,
  Lock,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  Users,
  Heart,
  Eye,
  Download,
  MessageCircle
} from 'lucide-react';
import Peer from 'simple-peer';
import Globe from 'react-globe.gl';
import * as THREE from 'three';

import { AuthContext, SocketContext } from '../App';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

const SAMPLE_SONGS = [
  { id: '1', name: 'Chill Vibes', url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3' },
  { id: '2', name: 'Upbeat Pop', url: 'https://cdn.pixabay.com/download/audio/2022/10/18/audio_31c2730e64.mp3?filename=good-night-160166.mp3' },
  { id: '3', name: 'Lofi Study', url: 'https://cdn.pixabay.com/download/audio/2022/03/09/audio_9ec14115eb.mp3?filename=lofi-chill-140858.mp3' }
];

const CoinSVG = ({ size = 18, style = {} }) => (
  <span style={{ fontSize: `${size}px`, lineHeight: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', ...style }}>🪙</span>
);
import { Capacitor } from '@capacitor/core';
import { AdMob, RewardAdPluginEvents, BannerAdSize, BannerAdPosition } from '@capacitor-community/admob';

const COUNTRY_DATA = {
  "India": { lat: 20.5937, lng: 78.9629, fact: "Did you know? India has the world's largest postal network." },
  "USA": { lat: 37.0902, lng: -95.7129, fact: "Did you know? The US has the world's largest economy." },
  "UK": { lat: 55.3781, lng: -3.4360, fact: "Did you know? London has over 170 museums." },
  "Canada": { lat: 56.1304, lng: -106.3468, fact: "Did you know? Canada has the longest coastline in the world." },
  "Australia": { lat: -25.2744, lng: 133.7751, fact: "Did you know? Australia is home to the Great Barrier Reef." },
  "Germany": { lat: 51.1657, lng: 10.4515, fact: "Did you know? Germany has over 20,000 castles." },
  "France": { lat: 46.2276, lng: 2.2137, fact: "Did you know? France is the most visited country in the world." },
  "Japan": { lat: 36.2048, lng: 138.2529, fact: "Did you know? Japan consists of over 6,800 islands." },
  "Brazil": { lat: -14.2350, lng: -51.9253, fact: "Did you know? Brazil is home to the Amazon Rainforest." },
  "Other": { lat: 0, lng: 0, fact: "Did you know? Earth has over 195 countries!" }
};


  const groupStoriesByDay = (stories) => {
    if (!stories || stories.length === 0) return [];
    const groups = {};
    stories.forEach(story => {
      const dateKey = new Date(story.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(story);
    });
    return Object.entries(groups).map(([date, st]) => ({ date, stories: st }));
  };

  const getFlagEmoji = (countryName, countryCode) => {
  if (countryCode && countryCode !== 'UN') {
    try {
      const codePoints = countryCode.toUpperCase().split('').map(char => 127397 + char.charCodeAt(0));
      return String.fromCodePoint(...codePoints);
    } catch (e) {}
  }
  if (!countryName) return '🌍';
  const flags = {
    'India': '🇮🇳', 'USA': '🇺🇸', 'UK': '🇬🇧', 'Canada': '🇨🇦',
    'Australia': '🇦🇺', 'Germany': '🇩🇪', 'France': '🇫🇷',
    'Japan': '🇯🇵', 'Brazil': '🇧🇷', 'Indonesia': '🇮🇩',
    'Pakistan': '🇵🇰', 'Bangladesh': '🇧🇩', 'Nepal': '🇳🇵',
    'Sri Lanka': '🇱🇰', 'Russia': '🇷🇺', 'China': '🇨🇳'
  };
  return flags[countryName] || '🌍';
};

const StorySlide = ({
  group, groupIdx, isActiveSlide, 
  currentStoryIndex, setCurrentStoryIndex,
  setStoryProgress, storyProgress,
  storyPaused, setStoryPaused, storyPausedRef,
  storyVideoRef, storyAudioRef,
  user, activeTab, fetchStories, API_URL, token,
  handleStoryLike, setShowShareModal, setShowStoryViewsModal, viewerStoriesLength,
  viewPublicProfile, setActiveTab, setShowCommentsModal
}) => {
  const story = group.stories[isActiveSlide ? currentStoryIndex : 0];
  if (!story) return null;

  const [touchStartX, setTouchStartX] = React.useState(null);
  const [touchEndX, setTouchEndX] = React.useState(null);

  const handlePointerDown = (clientX) => {
    storyPausedRef.current = true;
    setStoryPaused(true);
    if (storyVideoRef.current) storyVideoRef.current.pause();
    if (storyAudioRef.current) storyAudioRef.current.pause();
    setTouchStartX(clientX);
    setTouchEndX(null);
  };

  const handlePointerMove = (clientX) => {
    if (touchStartX !== null) setTouchEndX(clientX);
  };

  const handlePointerUp = () => {
    storyPausedRef.current = false;
    setStoryPaused(false);
    if (storyVideoRef.current) storyVideoRef.current.play().catch(() => {});
    if (storyAudioRef.current) storyAudioRef.current.play().catch(() => {});

    if (touchStartX !== null && touchEndX !== null) {
      const distanceX = touchStartX - touchEndX;
      const isLeftSwipe = distanceX > 50;
      const isRightSwipe = distanceX < -50;

      if (isLeftSwipe && (isActiveSlide ? currentStoryIndex : 0) < group.stories.length - 1) {
        setCurrentStoryIndex(prev => prev + 1); setStoryProgress(0);
      } else if (isRightSwipe && (isActiveSlide ? currentStoryIndex : 0) > 0) {
        setCurrentStoryIndex(prev => prev - 1); setStoryProgress(0);
      }
    }
    setTouchStartX(null);
    setTouchEndX(null);
  };

  return (
    <div 
      style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '15px 10px', boxSizing: 'border-box', touchAction: 'none' }}
      onPointerDown={(e) => handlePointerDown(e.touches ? e.touches[0].clientX : e.clientX)}
      onPointerMove={(e) => handlePointerMove(e.touches ? e.touches[0].clientX : e.clientX)}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onTouchStart={(e) => handlePointerDown(e.targetTouches[0].clientX)}
      onTouchMove={(e) => handlePointerMove(e.targetTouches[0].clientX)}
      onTouchEnd={handlePointerUp}
    >
      <div style={{
         width: '100%', maxWidth: '380px', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column',
         borderRadius: '20px', overflow: 'hidden', background: '#000', boxShadow: '0 10px 40px rgba(0,0,0,0.8)'
      }}>
      {/* Progress Bars */}
      <div style={{ display: 'flex', gap: '5px', padding: '15px 10px 5px', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
        {group.stories.map((s, i) => (
          <div key={s._id} style={{ height: '3px', background: 'rgba(255,255,255,0.3)', flex: 1, borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ 
              height: '100%', 
              background: '#fff', 
              width: i < (isActiveSlide ? currentStoryIndex : 0) ? '100%' : i === (isActiveSlide ? currentStoryIndex : 0) ? storyProgress + "%" : '0%',
              transition: i === (isActiveSlide ? currentStoryIndex : 0) && !storyPaused ? 'width 0.1s linear' : 'none'
            }}></div>
          </div>
        ))}
      </div>

      {/* User Info Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '25px 15px 15px', position: 'absolute', top: '10px', left: 0, right: 0, zIndex: 10, background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)' }}>
        <div 
          style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, cursor: 'pointer' }}
          onClick={(e) => {
            e.stopPropagation();
            window.history.back(); // close story viewer
            setTimeout(() => {
              if (group.user._id === user?.id) {
                setActiveTab('profile');
              } else if (viewPublicProfile && group.user._id) {
                viewPublicProfile(group.user._id);
              }
            }, 50);
          }}
        >
          <div className="user-avatar-small" style={{ width: '36px', height: '36px', border: '1px solid #fff' }}>
             {group.user.avatarUrl ? <img src={group.user.avatarUrl} alt="user" /> : group.user.username.charAt(0).toUpperCase()}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: '#fff', fontSize: '1rem', fontWeight: 'bold', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                {group.user.username}
              </span>
              {group.user.countryCode && (
                <span style={{ fontSize: '1rem', flexShrink: 0 }}>
                  {getFlagEmoji(group.user.country, group.user.countryCode)}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden' }}>
              <span style={{ color: '#ddd', fontSize: '0.8rem', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden', flexShrink: 1 }}>{group.user.country || 'Earth'}</span>
              <span style={{ color: '#aaa', fontSize: '0.8rem', flexShrink: 0 }}>•</span>
              <span style={{ color: '#aaa', fontSize: '0.8rem', flexShrink: 0, textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                {new Date(story.createdAt).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
              </span>
              <span style={{ color: '#aaa', fontSize: '0.8rem', flexShrink: 0 }}>•</span>
              <span style={{ 
                color: story.visibility === 'custom' ? '#1cf23b' : (story.visibility === 'followers' ? '#ff3366' : '#00ffff'), 
                fontSize: '0.7rem', 
                fontWeight: 'bold',
                flexShrink: 0,
                border: `1px solid ${story.visibility === 'custom' ? '#1cf23b' : (story.visibility === 'followers' ? '#ff3366' : '#00ffff')}`,
                borderRadius: '4px',
                padding: '1px 4px',
                textTransform: 'uppercase'
              }}>
                {story.visibility === 'custom' ? 'Close Friends' : (story.visibility === 'followers' ? 'Followers' : 'Global')}
              </span>
            </div>
          </div>
        </div>
        {group.user._id === user?.id && (
          <button style={{ background: 'transparent', border: 'none', color: '#fff', padding: '5px', marginLeft: '10px', cursor: 'pointer' }} onClick={(e) => {
            e.currentTarget.style.display = 'none';
            window.history.back();
            fetch(API_URL + "/api/stories/" + story._id, { method: 'DELETE', headers: { Authorization: "Bearer " + token }})
              .then(() => fetchStories())
              .catch(() => {});
          }}><Trash2 size={20}/></button>
        )}
        <button style={{ background: 'transparent', border: 'none', color: '#fff', padding: '5px', cursor: 'pointer' }} onClick={() => {
          window.history.back();
        }}><X size={28}/></button>
      </div>

      {/* Media Container */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {story.mediaType === 'video' ? (
          <video 
            ref={isActiveSlide ? storyVideoRef : null}
            src={story.mediaUrl} 
            autoPlay={isActiveSlide} 
            playsInline
            loop={activeTab === 'everyone-stories'}
            onEnded={() => {
              if (activeTab === 'everyone-stories') return; 
              if (currentStoryIndex < group.stories.length - 1) {
                setCurrentStoryIndex(prev => prev + 1);
                setStoryProgress(0);
              } else {
                window.history.back();
              }
            }}
            onTimeUpdate={(e) => {
              if (isActiveSlide) setStoryProgress((e.target.currentTime / e.target.duration) * 100);
            }}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        ) : (
          <img 
            src={story.mediaUrl} 
            alt="story" 
            style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
          />
        )}

        {/* Click Navigation Areas */}
        <div 
          style={{ position: 'absolute', top: 0, left: 0, width: '30%', height: '100%', zIndex: 5, cursor: 'w-resize' }} 
          onClick={(e) => {
            e.stopPropagation();
            if ((isActiveSlide ? currentStoryIndex : 0) > 0) {
              setCurrentStoryIndex(prev => prev - 1);
              setStoryProgress(0);
            }
          }}
        />
        <div 
          style={{ position: 'absolute', top: 0, right: 0, width: activeTab === 'everyone-stories' ? '50%' : '70%', height: '100%', zIndex: 5, cursor: 'e-resize' }} 
          onClick={(e) => {
            e.stopPropagation();
            if ((isActiveSlide ? currentStoryIndex : 0) < group.stories.length - 1) {
              setCurrentStoryIndex(prev => prev + 1);
              setStoryProgress(0);
            } else if (activeTab !== 'everyone-stories') {
              window.history.back();
            }
          }}
        />

        {/* Action Bar for Everyone Stories */}
        {activeTab === 'everyone-stories' && (
          <div style={{ position: 'absolute', right: '12px', bottom: '80px', zIndex: 15, display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
            {/* Like Button */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <button 
                style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '50%', width: '46px', height: '46px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', transition: 'transform 0.1s active' }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleStoryLike(story._id, groupIdx, (isActiveSlide ? currentStoryIndex : 0));
                }}
              >
                <Heart 
                  size={22} 
                  fill={story.likedBy?.some(u => u._id === (user?._id || user?.id) || u === (user?._id || user?.id)) ? '#ff2a2a' : 'transparent'} 
                  color={story.likedBy?.some(u => u._id === (user?._id || user?.id) || u === (user?._id || user?.id)) ? '#ff2a2a' : '#fff'} 
                />
              </button>
              <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: '600', marginTop: '4px', textShadow: '1px 1px 3px rgba(0,0,0,0.8)' }}>
                {story.likedBy?.length || 0}
              </span>
            </div>

            {/* Comment Button */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <button 
                style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '50%', width: '46px', height: '46px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}
                onClick={(e) => {
                  e.stopPropagation();
                  setStoryPaused(true);
                  setShowCommentsModal(true);
                }}
              >
                <MessageCircle size={22} color="#fff" />
              </button>
              <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: '600', marginTop: '4px', textShadow: '1px 1px 3px rgba(0,0,0,0.8)' }}>
                0
              </span>
            </div>

            {/* Share Button */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <button 
                style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '50%', width: '46px', height: '46px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowShareModal(true);
                }}
              >
                <Share2 size={22} color="#fff" />
              </button>
              <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: '600', marginTop: '4px', textShadow: '1px 1px 3px rgba(0,0,0,0.8)' }}>
                Share
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls (Only for normal stories) */}
      {activeTab !== 'everyone-stories' && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px', zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}>
          {group.user._id === (user?._id || user?.id) ? (
            <div 
              style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', background: 'rgba(255,255,255,0.2)', padding: '8px 15px', borderRadius: '20px' }}
              onClick={(e) => { e.stopPropagation(); setShowStoryViewsModal(true); }}
            >
              <Eye size={18} color="#fff" />
              <span style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 'bold' }}>
                {story.viewedBy?.length || 0}
              </span>
              <Heart size={16} color="#fff" style={{ marginLeft: '10px' }} />
              <span style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 'bold' }}>
                {story.likedBy?.length || 0}
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
              <button 
                style={{ background: 'none', border: 'none', cursor: 'pointer', zIndex: 15 }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleStoryLike(story._id, groupIdx, (isActiveSlide ? currentStoryIndex : 0));
                }}
              >
                <Heart 
                  size={32} 
                  fill={story.likedBy?.some(u => u._id === (user?._id || user?.id) || u === (user?._id || user?.id)) ? '#ff2a2a' : 'transparent'} 
                  color={story.likedBy?.some(u => u._id === (user?._id || user?.id) || u === (user?._id || user?.id)) ? '#ff2a2a' : '#fff'} 
                />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
    </div>
  );
};
export default function Dashboard() {
  const [activeTab, _setActiveTab] = useState('home');
  const [visibleeveryoneStories, setVisibleeveryoneStories] = useState(12);

  const observerRef = useRef(null);
  const timeoutRef = useRef(null);
  const loadMoreRef = useCallback((node) => {
    if (observerRef.current) observerRef.current.disconnect();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    if (node) {
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          timeoutRef.current = setTimeout(() => {
            setVisibleeveryoneStories(prev => prev + 12);
          }, 2000);
        } else {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
        }
      });
      observerRef.current.observe(node);
    }
  }, []);
  


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

  const { user, token, logout, login } = useContext(AuthContext);
  const API_URL = import.meta.env.VITE_API_URL || 'https://twelo-backend.onrender.com';
  const socket = useContext(SocketContext);
  const navigate = useNavigate();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchHistoryCache, setSearchHistoryCache] = useState(null);
  const [longPressTarget, setLongPressTarget] = useState(null);
  const pressTimer = useRef(null);
  const [coinPopup, setCoinPopup] = useState({ show: false, amount: 0 });

  const handleSearchHistoryTouchStart = (user) => {
    if (searchQuery) return; // Only on history
    pressTimer.current = setTimeout(() => {
      setLongPressTarget(user);
    }, 800);
  };

  const handleSearchHistoryTouchEnd = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

  const removeSearchHistoryItem = async (userId) => {
    try {
      const res = await fetch(`${API_URL}/api/users/search-history/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setSearchHistoryCache(prev => prev.filter(u => u._id !== userId));
        setSearchResults(prev => prev.filter(u => u._id !== userId));
        setLongPressTarget(null);
        showToastMsg("Removed from history", 'info');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const [longPressNotificationTarget, setLongPressNotificationTarget] = useState(null);
  const notifPressTimer = useRef(null);

  const handleNotificationTouchStart = (notif) => {
    notifPressTimer.current = setTimeout(() => {
      setLongPressNotificationTarget(notif);
    }, 800);
  };

  const handleNotificationTouchEnd = () => {
    if (notifPressTimer.current) clearTimeout(notifPressTimer.current);
  };

  const removeNotification = async (notifId) => {
    try {
      const res = await fetch(`${API_URL}/api/users/notifications/${notifId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n._id !== notifId));
        setLongPressNotificationTarget(null);
        showToastMsg("Notification removed", 'info');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const [searchLoading, setSearchLoading] = useState(false);
  const [searchPage, setSearchPage] = useState(1);
  const [hasMoreSearch, setHasMoreSearch] = useState(true);
  const [isFetchingSearchHistory, setIsFetchingSearchHistory] = useState(true);
  const [isFetchingMessages, setIsFetchingMessages] = useState(false);
  const [messagePage, setMessagePage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
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

  // Handle Banner Ad logic based on activeTab
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const manageBannerAd = async () => {
        try {
          if (activeTab === 'home') {
            await AdMob.showBanner({
              adId: 'ca-app-pub-7775487062260313/9254448143',
              adSize: BannerAdSize.BANNER,
              position: BannerAdPosition.TOP_CENTER,
              margin: 60, // margin to push it below the top header
              isTesting: true // Enabled test ads so it actually shows up
            });
          } else {
            await AdMob.hideBanner().catch(() => {});
          }
        } catch (e) {
          console.error("Banner ad error", e);
        }
      };
      manageBannerAd();
    }
  }, [activeTab]);

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
  


  // Settings & Profile Edit State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [editUsernameMode, setEditUsernameMode] = useState(false);
  const [newUsernameInput, setNewUsernameInput] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [pushNotifEnabled, setPushNotifEnabled] = useState(false);

  // Profile & Social State
  const [profileStats, setProfileStats] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [expandedAlerts, setExpandedAlerts] = useState(new Set());
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);
  const [publicProfileData, setPublicProfileData] = useState(null);
  const [connectionsModal, setConnectionsModal] = useState({ isOpen: false, title: '', users: [] });
  const [showAllGlobalStoriesPublic, setShowAllGlobalStoriesPublic] = useState(false);
  const [showAllGlobalStoriesMy, setShowAllGlobalStoriesMy] = useState(false);
  const [profileStoryGroups, setProfileStoryGroups] = useState(null);

  // User Global Stories Pagination State
  const [userGlobalStories, setUserGlobalStories] = useState([]);
  const [userGlobalStoriesPage, setUserGlobalStoriesPage] = useState(1);
  const [userGlobalStoriesLoading, setUserGlobalStoriesLoading] = useState(false);
  const [hasMoreUserGlobalStories, setHasMoreUserGlobalStories] = useState(true);
  const [userGlobalStoriesUserId, setUserGlobalStoriesUserId] = useState(null);
  const [userGlobalStoriesUserInfo, setUserGlobalStoriesUserInfo] = useState(null);

  // Anonymous Matchmaking & Economy State
  const [coins, setCoins] = useState(0);
  const [isSearchingRandom, setIsSearchingRandom] = useState(false);
  const [randomSearchTimer, setRandomSearchTimer] = useState(0);
  const [matchFailed, setMatchFailed] = useState(false);
  const [matchFoundData, setMatchFoundData] = useState(null);
  const [showMatchCard, setShowMatchCard] = useState(false);
  const [genderFilter, setGenderFilter] = useState('any');
  const [anonymousRoomId, setAnonymousRoomId] = useState(null);
  const [anonymousPartnerId, setAnonymousPartnerId] = useState(null);
  const [anonymousMessages, setAnonymousMessages] = useState([]);
  const [isAnonymousChatActive, setIsAnonymousChatActive] = useState(false);
  const [anonymousPartnerAvatar, setAnonymousPartnerAvatar] = useState('');
  const [anonymousPartnerCountry, setAnonymousPartnerCountry] = useState('');
  const [anonymousPartnerCountryCode, setAnonymousPartnerCountryCode] = useState('UN');
  const [anonymousPartnerFact, setAnonymousPartnerFact] = useState('');
  const [anonymousPartnerName, setAnonymousPartnerName] = useState('Stranger');
  const [isAiCompanion, setIsAiCompanion] = useState(false);
  const [anonymousPartnerTyping, setAnonymousPartnerTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  // Chat state
  const [recentChats, setRecentChats] = useState([]);
  const [chatsError, setChatsError] = useState(null);
  
  // Stories State
  const [groupedStories, setGroupedStories] = useState([]);
  const [everyoneStories, seteveryoneStories] = useState([]);
  const [storyViewerActive, setStoryViewerActive] = useState(false);
  const [currentStoryUserIndex, setCurrentStoryUserIndex] = useState(0);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  useEffect(() => {
    if (storyViewerActive && activeTab === 'everyone-stories') {
      setTimeout(() => {
        const container = document.getElementById('story-swiper-container');
        if (container) {
          container.scrollTo({ top: currentStoryUserIndex * container.clientHeight, behavior: 'instant' });
        }
      }, 50); // slight delay to ensure DOM is rendered
    }
  }, [storyViewerActive]); // Only run when viewer opens


  // Story Editor State
  const [storyEditorOpen, setStoryEditorOpen] = useState(false);
  const [storyCameraOpen, setStoryCameraOpen] = useState(false);
  const [storyCameraStream, setStoryCameraStream] = useState(null);
  const [storyCapturedImage, setStoryCapturedImage] = useState(null);
  const [storyCameraFacingMode, setStoryCameraFacingMode] = useState('user');
  const storyLiveCameraRef = useRef(null);
  const [storyFile, setStoryFile] = useState(null);
  const [storyPreviewUrl, setStoryPreviewUrl] = useState('');
  const [storyCrop, setStoryCrop] = useState({ unit: '%', width: 90, height: 90, x: 5, y: 5 });
  const [isCroppingStory, setIsCroppingStory] = useState(false);
  const [completedStoryCrop, setCompletedStoryCrop] = useState(null);
  const storyImgRef = useRef(null);
  const [storyVisibility, setStoryVisibility] = useState('everyone');
  const [showCloseFriendsModal, setShowCloseFriendsModal] = useState(false);
  const [selectedCloseFriends, setSelectedCloseFriends] = useState([]);
  const [userConnections, setUserConnections] = useState([]);
  const [selectedSongUrl, setSelectedSongUrl] = useState('');
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [musicPlayerRef, setMusicPlayerRef] = useState(null);
  
  // Swipe handling state
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [touchStartY, setTouchStartY] = useState(null);
  const [touchEndY, setTouchEndY] = useState(null);
  
  // Story Views Modal
  const [showStoryViewsModal, setShowStoryViewsModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareFollowers, setShareFollowers] = useState([]);
  const [isSharing, setIsSharing] = useState(false);
  
  useEffect(() => {
    if (showShareModal) {
      const fetchFollowers = async () => {
        try {
          const res = await fetch(`${API_URL}/api/users/connections/${user.id || user._id}`, { headers: { Authorization: `Bearer ${token}` } });
          const data = await res.json();
          if (res.ok) {
            setShareFollowers(data.followers || []);
          }
        } catch (err) { console.error(err); }
      };
      fetchFollowers();
    }
  }, [showShareModal, user, token, API_URL]);
  
  const handleShareStory = (targetUserId) => {
    if (!socket) return;
    setIsSharing(true);
    const storyId = viewerStories[currentStoryUserIndex].stories[currentStoryIndex]._id;
    const storyLink = `${window.location.origin}/stories/${storyId}`;
    const tempId = Date.now().toString();
    const msgData = {
      tempId,
      senderId: user.id || user._id,
      receiverId: targetUserId,
      messageText: `Check out this story: ${storyLink}`,
      messageType: 'text',
      fileUrl: null,
      replyTo: null
    };
    socket.emit('send_message', msgData);
    setTimeout(() => {
      setIsSharing(false);
      setShowShareModal(false);
      window.alert('Story shared successfully!');
    }, 500);
  };

  const [storyUploading, setStoryUploading] = useState(false);
  const storyFileInputRef = useRef(null);
  const [activeStoryTimeout, setActiveStoryTimeout] = useState(null);
  const [storyProgress, setStoryProgress] = useState(0);
  const [storyPaused, setStoryPaused] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  
  const updateCommentCount = (delta) => {
    const updatedViewerStories = [...viewerStories];
    if (updatedViewerStories[currentStoryUserIndex]?.stories[currentStoryIndex]) {
        let count = updatedViewerStories[currentStoryUserIndex].stories[currentStoryIndex].comment_count || 0;
        updatedViewerStories[currentStoryUserIndex].stories[currentStoryIndex].comment_count = Math.max(0, count + delta);
        
        if (profileStoryGroups) {
           setProfileStoryGroups([...updatedViewerStories]);
        } else if (activeTab === 'everyone-stories') {
           setEveryoneStories([...updatedViewerStories]);
        }
    }
  };


  return (
    <div className="dashboard-container">
      {/* Coin Deduction Popup */}
      {coinPopup.show && (
        <div className="coin-deduction-popup">
          <span className="coin-icon">🪙</span>
          -{coinPopup.amount} Coins (Filter Applied)
        </div>
      )}

      {/* Globe always mounted to prevent WebGL context loss / black screen */}
      <div style={{
        position: 'fixed', top: '-5vh', left: '0', width: '100%', height: '130vh', zIndex: 0,
        opacity: activeTab === 'home' ? 1 : 0,
        visibility: activeTab === 'home' ? 'visible' : 'hidden',
        pointerEvents: activeTab === 'home' && !activeChatUser ? 'auto' : 'none',
        transition: 'opacity 0.3s ease-in-out'
      }}>
        {globeComponent}
      </div>
      <aside className="sidebar">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: '20px' }}>
            <h1 className="sidebar-logo" onClick={() => setActiveTab('home')}>Twelo</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.5)', color: 'gold', padding: '4px 10px', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.85rem' }}>
              <CoinSVG size={16} />
              <span>{coins}</span>
            </div>
          </div>
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
            <div className={`nav-item ${activeTab === 'everyone-stories' ? 'active' : ''}`} onClick={() => setActiveTab('everyone-stories')}>
              <Layers size={24} color={activeTab === 'everyone-stories' ? '#fff' : '#00ffff'} /><span>Global Stories</span>
            </div>
            <div className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
              <UserIcon size={24} /><span>Profile</span>
            </div>
          </nav>
        </div>
        <div className="sidebar-footer">
          <div className="nav-item" onClick={() => setShowLogoutConfirm(true)} style={{ color: 'var(--brand-red)' }}><LogOut size={24} /><span>Logout</span></div>
        </div>
      </aside>

      <header className="mobile-header">
        <h1 className="mobile-logo">Twelo</h1>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.5)', color: 'gold', padding: '4px 8px', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.85rem' }}>
            <CoinSVG size={16} />
            <span>{coins}</span>
          </div>
          <button onClick={() => setActiveTab('notifications')} style={{ position: 'relative' }}>
            <Bell size={20} />
            {unreadNotifsCount > 0 && <span className="badge">{unreadNotifsCount}</span>}
          </button>
          <button onClick={() => setShowLogoutConfirm(true)} style={{ color: 'var(--brand-red)' }}><LogOut size={20} /></button>
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
        <div className={`nav-item ${activeTab === 'everyone-stories' ? 'active' : ''}`} onClick={() => setActiveTab('everyone-stories')}>
          <Layers size={24} color={activeTab === 'everyone-stories' ? '#fff' : '#00ffff'} />
        </div>
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
              
              <div className="settings-item-btn" onClick={handleToggleNotifications} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                <span>Push Notifications</span>
                <div style={{
                  width: '46px', height: '26px', borderRadius: '13px',
                  background: pushNotifEnabled ? '#2bd856' : 'rgba(255,255,255,0.15)',
                  position: 'relative', transition: 'background 0.3s ease',
                  flexShrink: 0
                }}>
                  <div style={{
                    width: '22px', height: '22px', borderRadius: '50%',
                    background: '#fff', position: 'absolute', top: '2px',
                    left: pushNotifEnabled ? '22px' : '2px',
                    transition: 'left 0.3s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                  }} />
                </div>
              </div>

              
              <button className="settings-item-btn" onClick={() => navigate('/about-us')}>
                About Us
              </button>
              
              <button className="settings-item-btn" onClick={() => navigate('/privacy-policy')}>
                Privacy Policy
              </button>
              
              <button className="settings-item-btn" onClick={() => navigate('/terms')}>
                Terms & Conditions
              </button>

              <button className="settings-item-btn" onClick={() => navigate('/contact-us')}>
                Contact Us
              </button>
              
              <button className="settings-item-btn logout-danger" onClick={() => { setShowSettingsModal(false); setShowLogoutConfirm(true); }}>
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
                    <span className="user-username">@{u.username?.length > 10 ? u.username.substring(0, 10) + '...' : u.username}</span>
                  </div>
                </div>
              ))}
              {connectionsModal.users.length === 0 && <p style={{ color: '#a8a8a8', textAlign: 'center' }}>No {connectionsModal.title.toLowerCase()} yet.</p>}
            </div>
          </div>
        </div>
      )}

      
      {/* Share Modal */}
      {showShareModal && (
        <div className="call-overlay" style={{ zIndex: 12000 }}>
          <div className="auth-card" style={{ maxWidth: '400px', width: '90%', background: '#121212', padding: '24px', borderRadius: '12px', position: 'relative' }}>
            <button 
              className="back-btn" 
              style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#f5f5f5' }} 
              onClick={() => setShowShareModal(false)}
            >
              <X size={24} />
            </button>
            <h2 style={{ marginBottom: '20px', borderBottom: '1px solid #333', paddingBottom: '12px', color: '#f5f5f5' }}>Share Story</h2>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {shareFollowers.map(u => (
                <div 
                  className="user-card-info" 
                  key={u._id} 
                  style={{ padding: '8px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', cursor: 'default' }} 
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="user-avatar-small">{u.avatarUrl ? <img src={u.avatarUrl} alt='avatar' /> : u.username.charAt(0).toUpperCase()}</div>
                    <div className="user-names">
                      <span className="user-username">@{u.username?.length > 10 ? u.username.substring(0, 10) + '...' : u.username}</span>
                    </div>
                  </div>
                  <button 
                    disabled={isSharing}
                    style={{ background: 'var(--brand-blue)', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}
                    onClick={() => handleShareStory(u._id)}
                  >
                    Send
                  </button>
                </div>
              ))}
              {shareFollowers.length === 0 && <p style={{ color: '#a8a8a8', textAlign: 'center' }}>No followers to share with.</p>}
            </div>
          </div>
        </div>
      )}
\n      {/* CALLING OVERLAYS */}
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
                      <video playsInline webkit-playsinline="true" muted ref={myVideoRef} autoPlay className="video-element" style={{ objectFit: 'cover', transform: currentFacingMode === 'user' ? 'scaleX(-1)' : 'none' }} />
                      {swapVideo && <div className="video-label">You</div>}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="remote-video-container">
                      <video playsInline webkit-playsinline="true" muted ref={myVideoRef} autoPlay className="video-element" style={{ objectFit: 'cover', transform: currentFacingMode === 'user' ? 'scaleX(-1)' : 'none' }} />
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
            {!fullScreenMedia.isViewOnce && (
              <button onClick={() => downloadMedia(fullScreenMedia.url)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              </button>
            )}
            <button onClick={() => setFullScreenMedia(null)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
              <X size={28} />
            </button>
          </div>
          <img src={fullScreenMedia.url} alt="Full Screen" style={{ maxWidth: '95%', maxHeight: '90%', objectFit: 'contain' }} />
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
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img src={URL.createObjectURL(previewImage)} alt="Preview" style={{ maxWidth: '90vw', maxHeight: '70vh', borderRadius: '10px', objectFit: 'contain' }} />
            <div style={{ 
              position: 'absolute', top: 10, left: 10, padding: '8px 16px', borderRadius: '30px', 
              fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px',
              background: previewSafety === 'checking' ? 'rgba(0,0,0,0.7)' : previewSafety === 'safe' ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.9)',
              color: 'white', backdropFilter: 'blur(5px)', border: '1px solid rgba(255,255,255,0.2)'
            }}>
              {previewSafety === 'checking' && '⏳ AI Scanning...'}
              {previewSafety === 'safe' && '✅ Image Safe'}
              {previewSafety === 'unsafe' && '⚠️ Nudity Detected (Cannot Send)'}
            </div>
          </div>
          
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
            <button onClick={confirmSendImage} disabled={isUploading || previewSafety === 'checking' || previewSafety === 'unsafe'} style={{ background: 'var(--brand-blue)', color: '#fff', padding: '15px 40px', borderRadius: '30px', border: 'none', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', opacity: (isUploading || previewSafety === 'checking' || previewSafety === 'unsafe') ? 0.5 : 1 }}>
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

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="settings-drawer-overlay" style={{ zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="settings-drawer" style={{ height: 'auto', maxHeight: '50%', borderRadius: '15px', width: '90%', maxWidth: '350px', padding: '24px', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '10px', color: 'var(--text-primary)' }}>Log Out</h2>
            <p style={{ color: '#a8a8a8', fontSize: '0.95rem', marginBottom: '24px' }}>
              Are you sure you want to log out of your account?
            </p>
            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
              <button 
                className="premium-btn primary" 
                onClick={() => setShowLogoutConfirm(false)}
                style={{ flex: 1, padding: '12px', background: '#333' }}
              >
                No
              </button>
              <button 
                className="premium-btn" 
                onClick={logout}
                style={{ flex: 1, padding: '12px', backgroundColor: '#ff4b4b', color: '#fff', border: 'none' }}
              >
                Yes, Log Out
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Globe Offline Modal */}
      {showGlobeOfflineModal && !globeStatus.isEnabled && (
        <div className="modal-overlay" onClick={() => setShowGlobeOfflineModal(false)}>
          <div className="modal-content" style={{ textAlign: 'center', padding: '35px 25px', maxWidth: '380px', background: '#18181b', border: '1px solid #27272a' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
               <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '15px', borderRadius: '50%' }}>
                 <Lock size={48} color="#ef4444" />
               </div>
            </div>
            <h2 style={{ fontSize: '1.6rem', marginBottom: '15px', color: '#fff', fontWeight: 'bold' }}>Globe is Offline</h2>
            <p style={{ color: '#a8a8a8', marginBottom: globeStatus.enableAt ? '10px' : '25px', fontSize: '1.05rem', lineHeight: '1.5' }}>
               {globeStatus.customMessage || "The matching globe is currently offline for maintenance."}
            </p>
            {globeStatus.enableAt && (
              <p style={{ color: '#f59e0b', fontSize: '0.95rem', marginBottom: '25px', fontWeight: '500' }}>
                 Expected to reopen at: {new Date(globeStatus.enableAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
            {globeStatus.enableAt && (
              <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.2)', marginBottom: '25px' }}>
                <p style={{ color: '#ef4444', fontWeight: 'bold', marginBottom: '8px', fontSize: '0.85rem', letterSpacing: '1px' }}>OPENS IN</p>
                <div style={{ fontSize: '2.8rem', fontWeight: '900', color: '#fff', letterSpacing: '3px', fontFamily: 'monospace' }}>
                   {globeOfflineTimerDisplay}
                </div>
              </div>
            )}
            <button 
               onClick={() => setShowGlobeOfflineModal(false)}
               className="premium-btn primary" 
               style={{ width: '100%', padding: '14px', fontSize: '1.1rem', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', border: 'none', color: '#fff', borderRadius: '12px', cursor: 'pointer' }}
            >
               Got it
            </button>
          </div>
        </div>
      )}

      {/* Gallery Permission Popup */}
      {showGalleryPermissionPopup && (
        <div className="modal-overlay" onClick={() => setShowGalleryPermissionPopup(false)} style={{ zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content" style={{ padding: '24px', maxWidth: '320px', width: '90%', background: 'linear-gradient(145deg, #1e1e1e, #111)', border: '1px solid #333', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
               <div style={{ background: 'var(--brand-blue)', padding: '10px', borderRadius: '10px', color: '#fff', display: 'flex' }}>
                  <ImageIcon size={24} />
               </div>
               <h2 style={{ fontSize: '1.2rem', margin: 0, color: '#fff', fontWeight: '600' }}>Gallery Access</h2>
            </div>
            <p style={{ color: '#a8a8a8', marginBottom: '24px', fontSize: '0.95rem', lineHeight: '1.4' }}>
              Allow Twelo to access your photos? You only need to do this once.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setShowGalleryPermissionPopup(false)}
                style={{ padding: '8px 16px', fontSize: '0.95rem', background: 'transparent', border: '1px solid #444', color: '#ccc', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s' }}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  localStorage.setItem('twelo_gallery_access_granted', 'true');
                  setShowGalleryPermissionPopup(false);
                  fileInputRef.current?.click();
                }}
                style={{ padding: '8px 16px', fontSize: '0.95rem', background: 'var(--brand-blue)', border: 'none', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', transition: 'background 0.2s' }}
              >
                Allow
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Match Found Overlay - placed at root for correct z-index and centering */}
      {showMatchCard && matchFoundData && (
        <div className="match-found-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9999 }}>
          <div className="match-found-card">
            <h2 className="match-found-title">🎉 Match Found!</h2>
            <div className="match-found-avatar-container" style={{ position: 'relative', display: 'inline-block', marginBottom: '15px' }}>
              <img src={matchFoundData.partnerAvatar || `https://api.dicebear.com/6.x/avataaars/svg?seed=${matchFoundData.partnerName || 'Stranger'}`} alt="Avatar" className="match-found-avatar" />
              {matchFoundData.partnerCountryCode && matchFoundData.partnerCountryCode !== 'UN' && (
                <img 
                  src={`https://flagcdn.com/w80/${matchFoundData.partnerCountryCode.toLowerCase()}.png`} 
                  alt={matchFoundData.partnerCountry}
                  className="match-found-flag"
                />
              )}
            </div>
            <div className="match-found-name">{matchFoundData.partnerName || 'Stranger'} {getFlagEmoji(matchFoundData.partnerCountry, matchFoundData.partnerCountryCode)}</div>
            <div className="match-found-country">📍 <strong>{matchFoundData.partnerCountry || 'Earth'}</strong></div>
            <div className="match-found-fact">
              {matchFoundData.partnerFact || 'A beautiful country with rich culture.'}
            </div>
            <button 
              onClick={() => {
                if (window.matchTimeoutId) clearTimeout(window.matchTimeoutId);
                setAnonymousRoomId(matchFoundData.roomId);
                setAnonymousPartnerId(matchFoundData.partnerId);
                setAnonymousPartnerAvatar(matchFoundData.partnerAvatar || '');
                setAnonymousPartnerCountry(matchFoundData.partnerCountry || 'Earth');
                setAnonymousPartnerCountryCode(matchFoundData.partnerCountryCode || 'UN');
                setAnonymousPartnerFact(matchFoundData.partnerFact || 'A beautiful country with rich culture.');
                setAnonymousPartnerName(matchFoundData.partnerName || 'Stranger');
                setIsAiCompanion(Boolean(matchFoundData.isAiCompanion));
                setAnonymousMessages([]);
                setIsAnonymousChatActive(true);
                setActiveTab('anonymousChat');
                setAnonymousPartnerTyping(false);
                setShowMatchCard(false);
              }}
              style={{
                marginTop: '20px', background: 'var(--brand-blue)', border: 'none', color: '#fff', 
                padding: '10px 24px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold',
                boxShadow: '0 4px 15px rgba(0, 255, 170, 0.3)'
              }}
            >
              Start Chat Now →
            </button>
          </div>
        </div>
      )}

      {/* Long Press Context Menu for Search History */}
      {longPressTarget && (
        <div 
          onClick={() => setLongPressTarget(null)} 
          style={{ 
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
            backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 10000, 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'fadeIn 0.2s ease' 
          }}
        >
          <div 
            onClick={e => e.stopPropagation()} 
            style={{ 
              background: '#18181b', border: '1px solid #27272a', borderRadius: '16px', 
              padding: '20px', width: '260px', boxShadow: '0 10px 25px rgba(0,0,0,0.8)',
              animation: 'scaleIn 0.2s ease', textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: '10px' }}>🗑️</div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', color: '#f8fafc' }}>Remove from history?</h3>
            <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginBottom: '20px', lineHeight: '1.4' }}>
              Remove <strong style={{color: '#fff'}}>@{longPressTarget.username}</strong> from your recent searches.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => setLongPressTarget(null)}
                style={{ flex: 1, padding: '10px', background: '#27272a', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '0.9rem', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={() => removeSearchHistoryItem(longPressTarget._id)}
                style={{ flex: 1, padding: '10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Remove
              </button>
            </div>
          </div>
          <style>{`
            @keyframes scaleIn {
              from { transform: scale(0.9); opacity: 0; }
              to { transform: scale(1); opacity: 1; }
            }
          `}</style>
        </div>
      )}

      {/* Long Press Context Menu for Notifications */}
      {longPressNotificationTarget && (
        <div 
          onClick={() => setLongPressNotificationTarget(null)} 
          style={{ 
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
            backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 10000, 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'fadeIn 0.2s ease' 
          }}
        >
          <div 
            onClick={e => e.stopPropagation()} 
            style={{ 
              background: '#18181b', border: '1px solid #27272a', borderRadius: '16px', 
              padding: '20px', width: '260px', boxShadow: '0 10px 25px rgba(0,0,0,0.8)',
              animation: 'scaleIn 0.2s ease', textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: '10px' }}>🗑️</div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', color: '#f8fafc' }}>Remove notification?</h3>
            <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginBottom: '20px', lineHeight: '1.4' }}>
              Delete this notification from your inbox.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => setLongPressNotificationTarget(null)}
                style={{ flex: 1, padding: '10px', background: '#27272a', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '0.9rem', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={() => removeNotification(longPressNotificationTarget._id)}
                style={{ flex: 1, padding: '10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 99999,
          background: toast.type === 'coin' ? 'linear-gradient(145deg, #1e1e1e, #111)' : toast.type === 'error' ? '#ef4444' : '#10b981',
          border: toast.type === 'coin' ? '1px solid #333' : 'none',
          color: '#fff',
          padding: '12px 24px',
          borderRadius: '30px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          animation: 'slideDownFadeOut 3s forwards'
        }}>
          {toast.type === 'coin' && <span style={{ fontSize: '1.2rem', animation: 'bounce 0.5s ease' }}>🪙 <strong style={{ color: '#ffb700', marginLeft: '5px' }}>-5 Coins</strong></span>}
          {toast.type === 'error' && <span style={{ fontSize: '1.2rem' }}>⚠️</span>}
          <span style={{ fontSize: '0.95rem', fontWeight: '500' }}>{toast.message}</span>
          
          <style>{`
            @keyframes slideDownFadeOut {
              0% { top: -50px; opacity: 0; }
              10% { top: 20px; opacity: 1; }
              80% { top: 20px; opacity: 1; }
              100% { top: -50px; opacity: 0; }
            }
          `}</style>
        </div>
      )}

      {/* Custom Story Camera Modal */}
      {storyCameraOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: '#000', zIndex: 12000, display: 'flex', flexDirection: 'column'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '15px', padding: '15px', position: 'absolute', top: 0, width: '100%', zIndex: 10 }}>
            {storyCapturedImage && (
              <a href={storyCapturedImage} download="twelo_capture.jpg" style={{ background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', borderRadius: '50%', padding: '8px', cursor: 'pointer', display: 'flex' }}>
                <Download size={24} />
              </a>
            )}
            <button onClick={() => window.history.back()} style={{ background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', borderRadius: '50%', padding: '8px', cursor: 'pointer', display: 'flex' }}>
              <X size={24} />
            </button>
          </div>

          {/* Main View Area */}
          <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <video 
              ref={storyLiveCameraRef} 
              autoPlay 
              playsInline 
              muted 
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover',
                transform: storyCameraFacingMode === 'user' ? 'rotateY(180deg)' : 'none',
                WebkitTransform: storyCameraFacingMode === 'user' ? 'rotateY(180deg)' : 'none'
              }} 
            />
            {storyCapturedImage && (
              <img src={storyCapturedImage} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain', background: '#000', zIndex: 5 }} alt="Captured" />
            )}
          </div>

          {/* Footer Controls */}
          <div style={{ height: '120px', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 30px' }}>
            {storyCapturedImage ? (
              <>
                <button onClick={() => setStoryCapturedImage(null)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={confirmStoryPhoto} style={{ background: '#10B981', color: '#fff', border: 'none', borderRadius: '30px', padding: '12px 30px', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer' }}>
                  Okay
                </button>
              </>
            ) : (
              <>
                <button onClick={() => { if (storyFileInputRef.current) storyFileInputRef.current.click(); }} style={{ background: 'transparent', border: 'none', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', cursor: 'pointer', width: '60px' }}>
                  <div style={{ border: '2px solid #fff', borderRadius: '8px', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <PlusCircle size={20} />
                  </div>
                  <span style={{ fontSize: '0.8rem' }}>Gallery</span>
                </button>
                <button onClick={captureStoryPhoto} style={{ width: '70px', height: '70px', borderRadius: '50%', border: '4px solid #fff', background: 'transparent', padding: '3px', cursor: 'pointer' }}>
                  <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#fff' }}></div>
                </button>
                <button onClick={switchStoryCamera} style={{ background: 'transparent', border: 'none', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', cursor: 'pointer', width: '60px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '50%', width: '45px', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <SwitchCamera size={24} />
                  </div>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Story Editor Overlay */}
      {storyEditorOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: '#000', zIndex: 11000, display: 'flex', flexDirection: 'column'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px', background: 'rgba(0,0,0,0.5)', zIndex: 10 }}>
            <button style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }} onClick={() => setStoryEditorOpen(false)}>
              <X size={28} />
            </button>
            <button style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }} onClick={() => setShowMusicPicker(!showMusicPicker)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: selectedSongUrl ? 'var(--brand-blue)' : 'rgba(255,255,255,0.2)', padding: '5px 10px', borderRadius: '20px' }}>
                <span style={{ fontSize: '1.2rem' }}>🎵</span>
                <span style={{ fontSize: '0.85rem' }}>{selectedSongUrl ? 'Song Added' : 'Music'}</span>
              </div>
            </button>
          </div>

          {/* Music Picker Drawer */}
          {showMusicPicker && (
            <div style={{ position: 'absolute', top: '70px', right: '15px', width: '200px', background: '#1a1a1a', borderRadius: '12px', padding: '10px', zIndex: 20, boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }}>
              <div style={{ color: '#888', fontSize: '0.8rem', marginBottom: '10px', paddingLeft: '5px' }}>Select a track</div>
              {SAMPLE_SONGS.map(song => (
                <div 
                  key={song.id}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 5px', cursor: 'pointer', borderRadius: '8px', background: selectedSongUrl === song.url ? 'rgba(59, 130, 246, 0.2)' : 'transparent' }}
                  onClick={() => {
                    setSelectedSongUrl(song.url);
                    setShowMusicPicker(false);
                  }}
                >
                  <span style={{ color: '#fff', fontSize: '0.9rem' }}>{song.name}</span>
                  {selectedSongUrl === song.url && <Check size={16} color="var(--brand-blue)" />}
                </div>
              ))}
              <div 
                style={{ padding: '10px 5px', cursor: 'pointer', color: '#ef4444', fontSize: '0.9rem', marginTop: '5px', borderTop: '1px solid #333' }}
                onClick={() => { setSelectedSongUrl(''); setShowMusicPicker(false); }}
              >
                None (Remove Music)
              </div>
            </div>
          )}

          {/* Media Preview Area */}
          <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0, overflow: 'hidden' }}>
            {storyFile?.type?.startsWith('video/') ? (
              <video src={storyPreviewUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} controls autoPlay loop />
            ) : isCroppingStory ? (
              <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', alignItems: 'center' }}>
                <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                  <ReactCrop 
                    crop={storyCrop} 
                    onChange={c => setStoryCrop(c)} 
                    onComplete={c => setCompletedStoryCrop(c)}
                    style={{ maxHeight: '100%', maxWidth: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <img src={storyPreviewUrl} ref={storyImgRef} style={{ maxHeight: '70vh', maxWidth: '100%', objectFit: 'contain' }} alt="Story Preview" />
                  </ReactCrop>
                </div>
                <button 
                  onClick={handleConfirmCrop}
                  style={{ padding: '10px 30px', margin: '15px', background: '#10B981', color: 'white', borderRadius: '30px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                  Done Cropping
                </button>
              </div>
            ) : (
              <>
                <img src={storyPreviewUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Story Preview" />
                <div style={{ 
                  position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', padding: '8px 16px', borderRadius: '30px', 
                  fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px',
                  background: storyPreviewSafety === 'checking' ? 'rgba(0,0,0,0.7)' : storyPreviewSafety === 'safe' ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.9)',
                  color: 'white', backdropFilter: 'blur(5px)', border: '1px solid rgba(255,255,255,0.2)'
                }}>
                  {storyPreviewSafety === 'checking' && '⏳ AI Scanning...'}
                  {storyPreviewSafety === 'safe' && '✅ Image Safe'}
                  {storyPreviewSafety === 'unsafe' && '🚫 Nudity Detected (Cannot Send)'}
                </div>
              </>
            )}
          </div>

          {/* Footer Controls */}
          {!isCroppingStory && (
            <div style={{ padding: '20px 15px', background: 'rgba(0,0,0,0.8)', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#222', padding: '10px 15px', borderRadius: '12px' }}>
              <span style={{ color: '#a8a8a8', fontSize: '0.9rem' }}>Who can see this?</span>
              <select 
                value={storyVisibility} 
                onChange={(e) => setStoryVisibility(e.target.value)}
                style={{ background: 'transparent', color: '#fff', border: 'none', outline: 'none', fontSize: '0.9rem', cursor: 'pointer' }}
              >
                <option value="global" style={{ color: '#000' }}>Global Story</option>
                <option value="followers" style={{ color: '#000' }}>Followers Only</option>
                <option value="custom" style={{ color: '#000' }}>Close Friends</option>
              </select>
            </div>
            
            {storyVisibility === 'custom' && (
              <div 
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#222', padding: '10px 15px', borderRadius: '12px', cursor: 'pointer', border: '1px solid #1cf23b' }}
                onClick={() => setShowCloseFriendsModal(true)}
              >
                <span style={{ color: '#1cf23b', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={16} /> Select Friends
                </span>
                <span style={{ color: '#fff', fontSize: '0.9rem' }}>{selectedCloseFriends.length} selected &gt;</span>
              </div>
            )}
            
            <button 
              onClick={handleStoryUpload}
              disabled={storyUploading || storyPreviewSafety === 'checking' || storyPreviewSafety === 'unsafe'}
              style={{ width: '100%', padding: '15px', background: storyUploading || storyPreviewSafety === 'checking' || storyPreviewSafety === 'unsafe' ? '#555' : 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)', color: '#fff', border: 'none', borderRadius: '30px', fontSize: '1rem', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', cursor: (storyUploading || storyPreviewSafety === 'checking' || storyPreviewSafety === 'unsafe') ? 'not-allowed' : 'pointer', opacity: (storyUploading || storyPreviewSafety === 'checking' || storyPreviewSafety === 'unsafe') ? 0.5 : 1 }}
            >
              {storyUploading ? <Loader2 className="rotating" size={20} /> : <Check size={20} />}
              {storyUploading ? 'Posting...' : 'Share to Status'}
            </button>
          </div>
          )}
        </div>
      )}

      {/* Close Friends Modal */}
      {showCloseFriendsModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', zIndex: 12000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: '500px', height: '70vh', background: '#121212', borderTopLeftRadius: '20px', borderTopRightRadius: '20px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #333' }}>
              <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem' }}>Close Friends</h3>
              <button onClick={() => setShowCloseFriendsModal(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
              {userConnections.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#888', marginTop: '40px' }}>No friends found to select.</div>
              ) : (
                userConnections.map(conn => {
                  const isSelected = selectedCloseFriends.includes(conn._id);
                  return (
                    <div 
                      key={conn._id} 
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 10px', cursor: 'pointer', borderRadius: '8px', background: isSelected ? 'rgba(28, 242, 59, 0.1)' : 'transparent' }}
                      onClick={() => {
                        setSelectedCloseFriends(prev => 
                          prev.includes(conn._id) ? prev.filter(id => id !== conn._id) : [...prev, conn._id]
                        );
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', background: '#333' }}>
                          {conn.avatarUrl ? <img src={conn.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>{conn.username.charAt(0).toUpperCase()}</div>}
                        </div>
                        <span style={{ color: '#fff', fontSize: '1rem' }}>{conn.username}</span>
                      </div>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: isSelected ? 'none' : '2px solid #555', background: isSelected ? '#1cf23b' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {isSelected && <Check size={16} color="#000" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div style={{ padding: '20px', borderTop: '1px solid #333' }}>
              <button onClick={() => setShowCloseFriendsModal(false)} style={{ width: '100%', padding: '14px', background: '#1cf23b', color: '#000', border: 'none', borderRadius: '30px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer' }}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

            {/* Story Viewer Overlay */}
      {storyViewerActive && viewerStories[currentStoryUserIndex] && (
        <div 
          id="story-swiper-container"
          style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: '#000', zIndex: 11000, 
            overflowY: 'hidden',
            scrollBehavior: 'smooth',
            touchAction: 'none'
          }}
          onWheel={handleStoryWheel}
          onTouchStart={handleStoryTouchStart}
          onTouchEnd={handleStoryTouchEnd}
        >
          {activeTab === 'everyone-stories' ? (
             viewerStories.map((group, groupIdx) => (
                <div key={group.user._id || groupIdx} style={{ height: '100vh', width: '100%', scrollSnapAlign: 'start', scrollSnapStop: 'always', position: 'relative', flexShrink: 0 }}>
                   {Math.abs(groupIdx - currentStoryUserIndex) <= 1 && (
                      <StorySlide 
                          group={group} 
                          groupIdx={groupIdx}
                          isActiveSlide={groupIdx === currentStoryUserIndex}
                          currentStoryIndex={currentStoryIndex}
                          setCurrentStoryIndex={setCurrentStoryIndex}
                          setStoryProgress={setStoryProgress}
                          storyProgress={storyProgress}
                          storyPaused={storyPaused}
                          setStoryPaused={setStoryPaused}
                          storyPausedRef={storyPausedRef}
                          storyVideoRef={storyVideoRef}
                          storyAudioRef={storyAudioRef}
                          user={user}
                          activeTab={activeTab}
                          fetchStories={fetchStories}
                          API_URL={API_URL}
                          token={token}
                          handleStoryLike={handleStoryLike}
                          setShowShareModal={setShowShareModal}
                          setShowStoryViewsModal={setShowStoryViewsModal}
                          viewerStoriesLength={viewerStories.length}
                          viewPublicProfile={viewPublicProfile}
                          setActiveTab={setActiveTab}
                          setShowCommentsModal={setShowCommentsModal}
                      />
                   )}
                </div>
             ))
          ) : (
             <div style={{ height: '100vh', width: '100%' }}>
                <StorySlide 
                   group={viewerStories[currentStoryUserIndex]}
                   groupIdx={currentStoryUserIndex}
                   isActiveSlide={true}
                   currentStoryIndex={currentStoryIndex}
                   setCurrentStoryIndex={setCurrentStoryIndex}
                   setStoryProgress={setStoryProgress}
                   storyProgress={storyProgress}
                   storyPaused={storyPaused}
                   setStoryPaused={setStoryPaused}
                   storyPausedRef={storyPausedRef}
                   storyVideoRef={storyVideoRef}
                   storyAudioRef={storyAudioRef}
                   user={user}
                   activeTab={activeTab}
                   fetchStories={fetchStories}
                   API_URL={API_URL}
                   token={token}
                   handleStoryLike={handleStoryLike}
                   setShowShareModal={setShowShareModal}
                   setShowStoryViewsModal={setShowStoryViewsModal}
                   viewerStoriesLength={viewerStories.length}
                   viewPublicProfile={viewPublicProfile}
                   setActiveTab={setActiveTab}
                          setShowCommentsModal={setShowCommentsModal}
                      />
             </div>
          )}
        </div>
      )}
{/* Story Views Modal */}
      {showStoryViewsModal && storyViewerActive && viewerStories[currentStoryUserIndex] && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', zIndex: 12000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: '500px', height: '60vh', background: '#121212', borderTopLeftRadius: '20px', borderTopRightRadius: '20px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #333' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Eye size={20} color="#fff" />
                <span style={{ color: '#fff', fontSize: '1rem', fontWeight: 'bold' }}>{viewerStories[currentStoryUserIndex].stories[currentStoryIndex].viewedBy?.length || 0} Views</span>
              </div>
              <button onClick={() => window.history.back()} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
              {(viewerStories[currentStoryUserIndex].stories[currentStoryIndex].viewedBy?.length || 0) === 0 ? (
                <div style={{ textAlign: 'center', color: '#888', marginTop: '40px' }}>No views yet.</div>
              ) : (
                viewerStories[currentStoryUserIndex].stories[currentStoryIndex].viewedBy.map(viewer => {
                  const hasLiked = viewerStories[currentStoryUserIndex].stories[currentStoryIndex].likedBy?.some(u => (u._id || u) === (viewer._id || viewer));
                  return (
                    <div key={viewer._id || viewer} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 10px', borderBottom: '1px solid #222' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="user-avatar-small" style={{ width: '40px', height: '40px', background: '#333', borderRadius: '50%', overflow: 'hidden' }}>
                          {viewer.avatarUrl ? <img src={viewer.avatarUrl} alt="avatar" style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : <div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'}}>{(viewer.username || '?').charAt(0).toUpperCase()}</div>}
                        </div>
                        <span style={{ color: '#fff', fontSize: '1rem' }}>{viewer.username || 'Unknown'}</span>
                      </div>
                      {hasLiked && <Heart size={20} fill="#ff2a2a" color="#ff2a2a" />}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Nudity Warning Modal */}
      {showNudityWarning && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999
        }}>
          <div style={{
            background: 'linear-gradient(145deg, #1e1e1e, #111)', border: '1px solid #ef4444', borderRadius: '24px',
            padding: '40px', maxWidth: '400px', width: '90%', textAlign: 'center',
            boxShadow: '0 20px 50px rgba(239, 68, 68, 0.25)',
            animation: 'popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '15px' }}>⚠️</div>
            <h2 style={{ color: '#ef4444', fontSize: '24px', fontWeight: '800', marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '1px' }}>Action Blocked</h2>
            <p style={{ color: '#cbd5e1', fontSize: '15px', lineHeight: '1.6', marginBottom: '30px' }}>
              Nudity or explicit content is strictly prohibited on Twelo. Continued violations will result in permanent account termination.
            </p>
            <button 
              onClick={() => setShowNudityWarning(false)}
              style={{
                background: 'linear-gradient(135deg, #ef4444, #b91c1c)', color: 'white',
                border: 'none', padding: '14px 32px', borderRadius: '30px', fontSize: '16px',
                fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 5px 15px rgba(239, 68, 68, 0.4)',
                transition: 'transform 0.2s'
              }}
              onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
              onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
            >
              I Understand
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


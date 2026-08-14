import React, { useState, useEffect, useContext, useRef, useMemo, useCallback, useLayoutEffect } from 'react';
import CommentsModal from './CommentsModal';
import { useNavigate } from 'react-router-dom';
import { 
  Home as HomeIcon, 
  Search as SearchIcon, 
  MessageSquare, 
  User as UserIcon,
  Settings as SettingsIcon,
  Edit, 
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
  MessageCircle,
  Info,
  Shield,
  FileText,
  Mail
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
  viewPublicProfile, setActiveTab, setShowCommentsModal,
  handleNextUser, handlePrevUser
}) => {
  const story = group.stories[isActiveSlide ? currentStoryIndex : 0];
  if (!story) return null;

  const formatCount = (count) => {
    if (!count) return 0;
    if (count >= 1000000) return (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'm';
    if (count >= 1000) return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return count;
  };

  const [touchStartX, setTouchStartX] = React.useState(null);
  const [touchEndX, setTouchEndX] = React.useState(null);
  const [touchStartY, setTouchStartY] = React.useState(null);
  const [touchEndY, setTouchEndY] = React.useState(null);

  const handlePointerDown = (clientX, clientY) => {
    storyPausedRef.current = true;
    setStoryPaused(true);
    if (storyVideoRef.current) storyVideoRef.current.pause();
    if (storyAudioRef.current) storyAudioRef.current.pause();
    setTouchStartX(clientX);
    setTouchStartY(clientY);
    setTouchEndX(null);
    setTouchEndY(null);
  };

  const handlePointerMove = (clientX, clientY) => {
    if (touchStartX !== null) {
      setTouchEndX(clientX);
      setTouchEndY(clientY);
    }
  };

  const handlePointerUp = (e) => {
    storyPausedRef.current = false;
    setStoryPaused(false);
    if (storyVideoRef.current) storyVideoRef.current.play()?.catch(() => {});
    if (storyAudioRef.current) storyAudioRef.current.play()?.catch(() => {});

    if (touchStartX !== null && touchEndX !== null && touchStartY !== null && touchEndY !== null) {
      const distanceX = touchStartX - touchEndX;
      const distanceY = touchStartY - touchEndY;
      const isLeftSwipe = distanceX > 50;
      const isRightSwipe = distanceX < -50;
      
      if (Math.abs(distanceX) > Math.abs(distanceY)) {
        if (isLeftSwipe) {
          if (handleNextUser) handleNextUser();
        } else if (isRightSwipe) {
          if (handlePrevUser) handlePrevUser();
        }
      }
    }
    setTouchStartX(null);
    setTouchEndX(null);
    setTouchStartY(null);
    setTouchEndY(null);
  };

  return (
    <div 
      style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '15px 10px', boxSizing: 'border-box', touchAction: 'none' }}
      onPointerDown={(e) => handlePointerDown(e.touches ? e.touches[0].clientX : e.clientX, e.touches ? e.touches[0].clientY : e.clientY)}
      onPointerMove={(e) => handlePointerMove(e.touches ? e.touches[0].clientX : e.clientX, e.touches ? e.touches[0].clientY : e.clientY)}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onTouchStart={(e) => handlePointerDown(e.targetTouches[0].clientX, e.targetTouches[0].clientY)}
      onTouchMove={(e) => handlePointerMove(e.targetTouches[0].clientX, e.targetTouches[0].clientY)}
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
              if (currentStoryIndex < group.stories.length - 1) {
                setCurrentStoryIndex(prev => prev + 1);
                setStoryProgress(0);
              } else if (handleNextUser) {
                handleNextUser();
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
            } else if (handlePrevUser) {
              handlePrevUser();
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
            } else if (handleNextUser) {
              handleNextUser();
            }
          }}
        />

        {/* Action Bar for Everyone Stories */}
        {(activeTab === 'everyone-stories' || story.visibility === 'global' || story.visibility === 'everyone') && (
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
                {story.comment_count ? formatCount(story.comment_count) : 0}
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

      {/* Bottom Controls (Only for normal stories or your own stories) */}
      {(!(activeTab === 'everyone-stories' || story.visibility === 'global' || story.visibility === 'everyone') || group.user._id === (user?._id || user?.id)) && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px', zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}>
          {group.user._id === (user?._id || user?.id) ? (
            <>
              <div 
                style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', background: 'rgba(255,255,255,0.2)', padding: '8px 15px', borderRadius: '20px' }}
                onClick={(e) => { e.stopPropagation(); setShowStoryViewsModal(true); }}
              >
                <Eye size={18} color="#fff" />
                <span style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 'bold' }}>
                  {Math.max(story.viewedBy?.length || 0, story.likedBy?.length || 0)}
                </span>
                <Heart size={16} color="#fff" style={{ marginLeft: '10px' }} />
                <span style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 'bold' }}>
                  {story.likedBy?.length ? formatCount(story.likedBy.length) : 0}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                {!(activeTab === 'everyone-stories' || story.visibility === 'global' || story.visibility === 'everyone') && (
                  <button 
                    style={{ background: 'none', border: 'none', cursor: 'pointer', zIndex: 15, display: 'flex', alignItems: 'center' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setStoryPaused(true);
                      setShowCommentsModal(true);
                    }}
                  >
                    <MessageCircle size={32} color="#fff" />
                    <span style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 'bold', marginLeft: '5px' }}>
                      {story.comment_count ? formatCount(story.comment_count) : 0}
                    </span>
                  </button>
                )}
              </div>
            </>
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
              <button 
                style={{ background: 'none', border: 'none', cursor: 'pointer', zIndex: 15, marginLeft: '15px' }}
                onClick={(e) => {
                  e.stopPropagation();
                  setStoryPaused(true);
                  setShowCommentsModal(true);
                }}
              >
                <MessageCircle size={32} color="#fff" />
              </button>
              <span style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 'bold', marginLeft: '5px' }}>
                {story.comment_count ? formatCount(story.comment_count) : 0}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
    </div>
  );
};
export default function Dashboard() {

  const [avatarCropperOpen, setAvatarCropperOpen] = useState(false);
  const [avatarImageSrc, setAvatarImageSrc] = useState(null);
  const [avatarCrop, setAvatarCrop] = useState({ unit: '%', width: 50, height: 50, x: 25, y: 25, aspect: 1 });
  const [avatarCompletedCrop, setAvatarCompletedCrop] = useState(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarImgRef = useRef(null);
  const avatarFileInputRef = useRef(null);

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
  const [showInnerSettingsModal, setShowInnerSettingsModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showChangeUsernameModal, setShowChangeUsernameModal] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null); // null, true, false
  const [checkingUsername, setCheckingUsername] = useState(false);
  const checkUsernameTimeout = useRef(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [editUsernameMode, setEditUsernameMode] = useState(false);
  const [newUsernameInput, setNewUsernameInput] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [pushNotifEnabled, setPushNotifEnabled] = useState(false);
  const pushNotifEnabledRef = useRef(pushNotifEnabled);
  useEffect(() => { pushNotifEnabledRef.current = pushNotifEnabled; }, [pushNotifEnabled]);
  const [notifPopEnabled, setNotifPopEnabled] = useState(() => localStorage.getItem('notifPop') !== 'false');
  const [notifSoundEnabled, setNotifSoundEnabled] = useState(() => localStorage.getItem('notifSound') !== 'false');
  const notifPopEnabledRef = useRef(notifPopEnabled);
  const notifSoundEnabledRef = useRef(notifSoundEnabled);
  useEffect(() => { notifPopEnabledRef.current = notifPopEnabled; localStorage.setItem('notifPop', notifPopEnabled); }, [notifPopEnabled]);
  useEffect(() => { notifSoundEnabledRef.current = notifSoundEnabled; localStorage.setItem('notifSound', notifSoundEnabled); }, [notifSoundEnabled]);

  // Profile & Social State
  const [profileStats, setProfileStats] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [expandedAlerts, setExpandedAlerts] = useState(new Set());
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);
  const [publicProfileData, setPublicProfileData] = useState(null);
  const [connectionsPage, setConnectionsPage] = useState({ title: '', users: [], returnTab: 'profile' });
  const [connectionsSearch, setConnectionsSearch] = useState('');
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
  const [showChatSettingsMenu, setShowChatSettingsMenu] = useState(false);
  
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

  const [cameraMode, setCameraMode] = useState('story');
  const [showAvatarLibrary, setShowAvatarLibrary] = useState(false);
  const [isProcessingLibraryAvatar, setIsProcessingLibraryAvatar] = useState(false);
  
  const openCamera = (mode) => {
    openStoryCamera('user', mode);
  };

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
    const storyUser = viewerStories[currentStoryUserIndex].user;
    const storyOwnerUsername = storyUser?.username || 'Unknown';
    const storyOwnerAvatar = storyUser?.avatar || '';
    const storyOwnerGender = storyUser?.gender || 'male';
    const tempId = Date.now().toString();
    const msgData = {
      tempId,
      senderId: user.id || user._id,
      receiverId: targetUserId,
      messageText: `Check out this story: ${storyLink}|:::|${storyOwnerUsername}|:::|${storyOwnerAvatar}|:::|${storyOwnerGender}`,
      messageType: 'text',
      fileUrl: null,
      replyTo: null
    };
    socket.emit('send_message', msgData);
    setTimeout(() => {
      setIsSharing(false);
      setShowShareModal(false);
      showToastMsg('Story shared successfully!', 'success');
    }, 500);
  };

  const [storyUploading, setStoryUploading] = useState(false);
  const storyFileInputRef = useRef(null);
  const [activeStoryTimeout, setActiveStoryTimeout] = useState(null);
  const [storyProgress, setStoryProgress] = useState(0);
  const [storyPaused, setStoryPaused] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  
  
  
  
  
  const storyPausedRef = useRef(false);
  const storyAudioRef = useRef(null); // Holds the current story background song

  const [isFetchingChats, setIsFetchingChats] = useState(true);
  const [activeChatUser, setActiveChatUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const chatTypingTimeoutRef = useRef(null);
  const [showNudityWarning, setShowNudityWarning] = useState(false);
  const [previewSafety, setPreviewSafety] = useState('safe');
  const [storyPreviewSafety, setStoryPreviewSafety] = useState('safe');
  const [timeTick, setTimeTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTimeTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);
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
  
  const [globeStatus, setGlobeStatus] = useState({ isEnabled: true, customMessage: 'Globe is currently offline.', enableAt: null });
  const [showGlobeOfflineModal, setShowGlobeOfflineModal] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
  const [globeOfflineTimerDisplay, setGlobeOfflineTimerDisplay] = useState('');

  const showToastMsg = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  const [msgToast, setMsgToast] = useState({ show: false, sender: null, messageText: '', senderId: null });
  const showMsgToast = (sender, messageText, senderId) => {
    setMsgToast({ show: true, sender, messageText, senderId });
    setTimeout(() => {
      setMsgToast(prev => ({ ...prev, show: false }));
    }, 4000);
  };

  // Call Details
  const [callerId, setCallerId] = useState('');
  const [callerName, setCallerName] = useState('');
  const [callerSignal, setCallerSignal] = useState(null);

  // Refs for media
  const myVideoRef = useRef(null);
  const storyVideoRef = useRef(null);
  const lastScrollTime = useRef(0);
  const touchStartYRef = useRef(0);
  const touchStartXRef = useRef(0);

  const handleNextUser = () => {
    if (currentStoryUserIndex < viewerStories.length - 1) {
      lastScrollTime.current = Date.now();
      const nextIndex = currentStoryUserIndex + 1;
      setCurrentStoryUserIndex(nextIndex);
      setCurrentStoryIndex(0);
      setStoryProgress(0);
      const container = document.getElementById('story-swiper-container');
      if (container) {
        container.scrollTo({ top: nextIndex * container.clientHeight, behavior: 'smooth' });
      }
    } else {
      setStoryViewerActive(false);
    }
  };

  const handlePrevUser = () => {
    if (currentStoryUserIndex > 0) {
      lastScrollTime.current = Date.now();
      const prevIndex = currentStoryUserIndex - 1;
      setCurrentStoryUserIndex(prevIndex);
      setCurrentStoryIndex(0);
      setStoryProgress(0);
      const container = document.getElementById('story-swiper-container');
      if (container) {
        container.scrollTo({ top: prevIndex * container.clientHeight, behavior: 'smooth' });
      }
    } else {
      setStoryViewerActive(false);
    }
  };

  const handleStoryWheel = (e) => {
    if (!storyViewerActive) return;
    const now = Date.now();
    if (now - lastScrollTime.current < 600) return;

    if (e.deltaY > 30) {
      handleNextUser();
    } else if (e.deltaY < -30) {
      handlePrevUser();
    }
  };

  const handleStoryTouchStart = (e) => {
    touchStartYRef.current = e.touches[0].clientY;
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleStoryTouchEnd = (e) => {
    if (!storyViewerActive) return;
    const now = Date.now();
    if (now - lastScrollTime.current < 600) return;

    const diffY = touchStartYRef.current - e.changedTouches[0].clientY;
    const diffX = touchStartXRef.current - e.changedTouches[0].clientX;
    
    if (Math.abs(diffY) > 40 && Math.abs(diffY) > Math.abs(diffX)) {
      if (diffY > 0) {
        handleNextUser();
      } else {
        handlePrevUser();
      }
    }
  };
  const userVideoRef = useRef(null);
  const connectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const callTimeoutRef = useRef(null);
  const [remoteStreamState, setRemoteStreamState] = useState(null);
  const ringtoneOutRef = useRef(null);
  const ringtoneInRef = useRef(null);
  const callerCandidatesRef = useRef([]);
  const messagesEndRef = useRef(null);
  const globeEl = useRef(null);

  // Swipe to reply state
  const [replyingTo, setReplyingTo] = useState(null);
  const swipeStartX = useRef(null);
  const swipeCurrentX = useRef(null);
  const [swipeMsgId, setSwipeMsgId] = useState(null);
  const [selectedMsgId, setSelectedMsgId] = useState(null);
  
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
  const [showGalleryPermissionPopup, setShowGalleryPermissionPopup] = useState(false);
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



  // Check push notification status on mount
  useEffect(() => {
    const checkPushStatus = async () => {
      try {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          setPushNotifEnabled(!!subscription && Notification.permission === 'granted');
          // Clear any lingering push notifications since user is now on the site
          if (registration.active) {
            registration.active.postMessage({ type: 'CLEAR_NOTIFICATIONS' });
          }
        }
      } catch (e) { console.log('Push check error:', e); }
    };
    checkPushStatus();

    // When user returns to the tab, clear any push notifications
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(reg => {
          if (reg.active) reg.active.postMessage({ type: 'CLEAR_NOTIFICATIONS' });
        }).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const handleToggleNotifications = async () => {
    if (pushNotifEnabled) {
      // Turn OFF immediately
      setPushNotifEnabled(false);
      // Async cleanup in background
      try {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          if (subscription) await subscription.unsubscribe();
        }
      } catch (e) { console.log('Unsubscribe error:', e); }
      showToastMsg('Push notifications disabled', 'info');
    } else {
      // Turn ON immediately (optimistic), then verify
      setPushNotifEnabled(true);
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
          const res = await fetch(`${API_URL}/api/users/subscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(subscription)
          });
          if (!res.ok) {
            setPushNotifEnabled(false);
            showToastMsg('Failed to enable notifications.', 'error');
          } else {
            showToastMsg('Push notifications enabled!', 'info');
          }
        } else if (permission === 'denied') {
          setPushNotifEnabled(false);
          showToastMsg('Notifications blocked by browser. Allow in browser settings.', 'error');
        } else {
          setPushNotifEnabled(false);
        }
      } catch (err) {
        setPushNotifEnabled(false);
        console.error('Push toggle error:', err);
        showToastMsg('Error toggling notifications.', 'error');
      }
    }
  };

  const handleUsernameChange = (e) => {
    if (checkUsernameTimeout.current) clearTimeout(checkUsernameTimeout.current);
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '');
    setNewUsernameInput(val);
    setUsernameAvailable(null);
    setUsernameError('');
    
    if (val.length < 3) {
      if (val.length > 0) setUsernameError('Username must be at least 3 characters');
      return;
    }
    if (val === user.username) {
      setUsernameAvailable(null);
      return;
    }
    
    if (user.pastUsernames && user.pastUsernames.includes(val)) {
      setUsernameAvailable(false);
      setUsernameError('This username already taken please choose another');
      setCheckingUsername(false);
      return;
    }
    
    setCheckingUsername(true);
    
    checkUsernameTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/api/users/check-username?username=${val}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await res.json();
        if (data.available === false) {
          setUsernameAvailable(false);
          setUsernameError('This username already exists please choose another');
        } else if (data.available === true) {
          setUsernameAvailable(true);
          setUsernameError('');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setCheckingUsername(false);
      }
    }, 500);
  };

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
            if (data.pastUsernames) {
              savedUser.pastUsernames = data.pastUsernames;
            }
            localStorage.setItem('user', JSON.stringify(savedUser));
            login(savedUser, data.token);
          }
          setEditUsernameMode(false);
        }
    } catch (err) {
      setUsernameError('An error occurred');
    }
  };

  
  const handleAvatarSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setAvatarImageSrc(reader.result);
        setAvatarCropperOpen(true);
        if (typeof closeStoryCamera === 'function') {
           closeStoryCamera();
        }
      });
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleAvatarUpload = async () => {
    if (!avatarCompletedCrop || !avatarImgRef.current) return;
    setIsUploadingAvatar(true);

    try {
      const image = avatarImgRef.current;
      const canvas = document.createElement('canvas');
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;
      canvas.width = avatarCompletedCrop.width;
      canvas.height = avatarCompletedCrop.height;
      const ctx = canvas.getContext('2d');

      ctx.drawImage(
        image,
        avatarCompletedCrop.x * scaleX,
        avatarCompletedCrop.y * scaleY,
        avatarCompletedCrop.width * scaleX,
        avatarCompletedCrop.height * scaleY,
        0,
        0,
        avatarCompletedCrop.width,
        avatarCompletedCrop.height
      );

      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg'));
      const formData = new FormData();
      formData.append('file', blob, 'avatar.jpg');

      const uploadRes = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const uploadData = await uploadRes.json();

      if (!uploadRes.ok) throw new Error(uploadData.message || 'Upload failed');

      const updateRes = await fetch(`${API_URL}/api/users/update_avatar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ avatarUrl: uploadData.url })
      });
      const updateData = await updateRes.json();

      if (!updateRes.ok) throw new Error(updateData.message || 'Update failed');

      login({ ...user, avatarUrl: uploadData.url }, token);
      setAvatarCropperOpen(false);
      setAvatarImageSrc(null);
    } catch (err) {
      console.error(err);
      alert('Failed to update avatar.');
    } finally {
      setIsUploadingAvatar(false);
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

  const fetchUserGlobalStories = async (userId, page = 1, append = false) => {
    if (!userId) return;
    setUserGlobalStoriesLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/users/${userId}/global_stories?page=${page}&limit=12`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) {
        if (append) {
          setUserGlobalStories(prev => [...prev, ...data.stories]);
        } else {
          setUserGlobalStories(data.stories);
        }
        setUserGlobalStoriesPage(data.page);
        setHasMoreUserGlobalStories(data.page < data.pages);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUserGlobalStoriesLoading(false);
    }
  };

  const userGlobalStoriesObserverRef = useRef(null);
  const loadMoreUserGlobalStoriesRef = useCallback((node) => {
    if (userGlobalStoriesObserverRef.current) userGlobalStoriesObserverRef.current.disconnect();
    if (node) {
      userGlobalStoriesObserverRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMoreUserGlobalStories && !userGlobalStoriesLoading) {
          fetchUserGlobalStories(userGlobalStoriesUserId, userGlobalStoriesPage + 1, true);
        }
      });
      userGlobalStoriesObserverRef.current.observe(node);
    }
  }, [hasMoreUserGlobalStories, userGlobalStoriesLoading, userGlobalStoriesUserId, userGlobalStoriesPage]);

  const fetchConnections = async () => {
    try {
      const res = await fetch(`${API_URL}/api/users/connections`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setUserConnections(data);
      }
    } catch (e) {
      console.error('Failed to fetch connections', e);
    }
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
      fetchConnections();
      fetchNotifications();
      fetchStories();
      fetcheveryoneStories();
    }
  }, [token]);

  const fetchStories = async () => {
    try {
      const res = await fetch(`${API_URL}/api/stories`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setGroupedStories(data);
      } else {
        const errData = await res.json();
        showToastMsg(`Failed to load stories: ${errData.message}`, 'error');
      }
    } catch (err) {
      console.error('Failed to fetch stories', err);
      showToastMsg('Network error loading stories', 'error');
    }
  };

  const fetcheveryoneStories = async () => {
    try {
      const res = await fetch(`${API_URL}/api/stories/everyone`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        seteveryoneStories(data);
      } else {
        const errData = await res.json();
        showToastMsg(`Failed to load everyone stories: ${errData.message}`, 'error');
      }
    } catch (err) {
      console.error('Failed to fetch everyone stories', err);
      showToastMsg('Network error loading everyone stories', 'error');
    }
  };

  useEffect(() => {
    const viewerStories = profileStoryGroups ? profileStoryGroups : (activeTab === 'everyone-stories' ? everyoneStories : groupedStories);
    if (storyViewerActive && viewerStories[currentStoryUserIndex]) {
      const currentStory = viewerStories[currentStoryUserIndex].stories[currentStoryIndex];
      const myId = user?._id || user?.id;
      const isOwner = viewerStories[currentStoryUserIndex].user._id === myId;
      if (currentStory && myId && !isOwner && (!currentStory.viewedBy || !currentStory.viewedBy.some(v => (v._id || v) === myId))) {
        // Optimistically update local state
        if (profileStoryGroups) {
          setProfileStoryGroups(prev => {
            const newGroups = [...prev];
            if (newGroups[currentStoryUserIndex] && newGroups[currentStoryUserIndex].stories[currentStoryIndex]) {
              if (!newGroups[currentStoryUserIndex].stories[currentStoryIndex].viewedBy) {
                newGroups[currentStoryUserIndex].stories[currentStoryIndex].viewedBy = [];
              }
              newGroups[currentStoryUserIndex].stories[currentStoryIndex].viewedBy.push({_id: myId, username: user.username, avatarUrl: user.avatarUrl });
            }
            return newGroups;
          });
        } else {
          const updateStories = prev => {
            const newGroups = [...prev];
            if (newGroups[currentStoryUserIndex] && newGroups[currentStoryUserIndex].stories[currentStoryIndex]) {
               if (!newGroups[currentStoryUserIndex].stories[currentStoryIndex].viewedBy) {
                  newGroups[currentStoryUserIndex].stories[currentStoryIndex].viewedBy = [];
               }
               newGroups[currentStoryUserIndex].stories[currentStoryIndex].viewedBy.push({_id: myId, username: user.username, avatarUrl: user.avatarUrl });
            }
            return newGroups;
          };
          if (activeTab === 'everyone-stories') {
            seteveryoneStories(updateStories);
          } else {
            setGroupedStories(updateStories);
          }
        }
        
        // Fire API call
        fetch(`${API_URL}/api/stories/${currentStory._id}/view`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(e => console.error("Error marking story viewed", e));
      }
    }
  }, [storyViewerActive, currentStoryUserIndex, currentStoryIndex, groupedStories, everyoneStories, activeTab, user, token, profileStoryGroups]);

  const handleStoryLike = async (storyId, userIndex, storyIndex) => {
    const myId = user?._id || user?.id;
    if (!myId) return;

    // Optimistic update
    const updateStories = prev => {
      const newGroups = [...prev];
      if (newGroups[userIndex] && newGroups[userIndex].stories[storyIndex]) {
        const story = newGroups[userIndex].stories[storyIndex];
        const likedBy = story.likedBy || [];
        const isLiked = likedBy.some(u => (u._id || u) === myId);
        
        if (isLiked) {
          story.likedBy = likedBy.filter(u => (u._id || u) !== myId);
        } else {
          story.likedBy = [...likedBy, { _id: myId, username: user.username, avatarUrl: user.avatarUrl }];
        }
      }
      return newGroups;
    };
    if (profileStoryGroups) {
      setProfileStoryGroups(updateStories);
    } else if (activeTab === 'everyone-stories') {
      seteveryoneStories(updateStories);
    } else {
      setGroupedStories(updateStories);
    }

    try {
      await fetch(`${API_URL}/api/stories/${storyId}/like`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (err) {
      console.error('Failed to toggle like', err);
    }
  };

  useEffect(() => {
    let interval;
    const viewerStories = profileStoryGroups ? profileStoryGroups : (activeTab === 'everyone-stories' ? everyoneStories : groupedStories);
    if (storyViewerActive && viewerStories[currentStoryUserIndex] && !showStoryViewsModal) {
      const currentStory = viewerStories[currentStoryUserIndex].stories[currentStoryIndex];
      if (currentStory && currentStory.mediaType === 'image') {
        interval = setInterval(() => {
          if (storyPausedRef.current || storyPaused) return; // Don't advance while held
          setStoryProgress(prev => {
            if (prev >= 100) {
              clearInterval(interval);
              // Auto advance
              if (currentStoryIndex < viewerStories[currentStoryUserIndex].stories.length - 1) {
                setCurrentStoryIndex(c => c + 1);
                return 0;
              } else if (currentStoryUserIndex < viewerStories.length - 1) {
                setCurrentStoryUserIndex(c => c + 1);
                setCurrentStoryIndex(0);
                return 0;
              } else {
                setStoryViewerActive(false);
                setProfileStoryGroups(null);
                window.history.back();
                return 100;
              }
            }
            return prev + 2; // 5 seconds to complete 100%
          });
        }, 100);
      }
    }
    return () => clearInterval(interval);
  }, [storyViewerActive, currentStoryUserIndex, currentStoryIndex, groupedStories, everyoneStories, activeTab, showStoryViewsModal, storyPaused]);

  useEffect(() => {
    if (storyVideoRef.current) {
      if (showStoryViewsModal) {
        storyVideoRef.current.pause();
      } else {
        const playPromise = storyVideoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(e => console.log('Auto-play prevented on resume', e));
        }
      }
    }
  }, [showStoryViewsModal, currentStoryIndex, currentStoryUserIndex]);

  useEffect(() => {
    let audioCtx = null;
    let sourceNode = null;
    let gainNode = null;
    let abortController = null;
    let stopped = false;

    const playWithWebAudio = async (url) => {
      try {
        abortController = new AbortController();
        // Fetch the audio file as ArrayBuffer (bypasses HTMLAudio/MediaSession)
        const response = await fetch(url, { signal: abortController.signal, referrerPolicy: 'no-referrer' });
        if (stopped) return;
        const arrayBuffer = await response.arrayBuffer();
        if (stopped) return;

        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        if (stopped) return;

        gainNode = audioCtx.createGain();
        gainNode.gain.value = 1;
        gainNode.connect(audioCtx.destination);

        const playLoop = () => {
          if (stopped) return;
          sourceNode = audioCtx.createBufferSource();
          sourceNode.buffer = audioBuffer;
          sourceNode.connect(gainNode);
          sourceNode.loop = false;
          sourceNode.onended = () => { if (!stopped) playLoop(); };
          sourceNode.start(0);
        };
        playLoop();

        // Expose pause/resume via storyAudioRef
        storyAudioRef.current = {
          pause: () => { if (audioCtx && audioCtx.state === 'running') audioCtx.suspend(); },
          play: () => { if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume(); },
        };
      } catch (e) {
        if (e.name !== 'AbortError') console.error('Web Audio playback error', e);
      }
    };

    const viewerStories = profileStoryGroups ? profileStoryGroups : (activeTab === 'everyone-stories' ? everyoneStories : groupedStories);
    if (storyViewerActive && viewerStories[currentStoryUserIndex]) {
      const currentStory = viewerStories[currentStoryUserIndex].stories[currentStoryIndex];
      if (currentStory && currentStory.songUrl) {
        playWithWebAudio(currentStory.songUrl);
      }
    }

    return () => {
      stopped = true;
      if (abortController) abortController.abort();
      if (sourceNode) { try { sourceNode.stop(); } catch(e) {} }
      if (audioCtx) { try { audioCtx.close(); } catch(e) {} }
      storyAudioRef.current = null;
    };
  }, [storyViewerActive, currentStoryUserIndex, currentStoryIndex, groupedStories, everyoneStories, activeTab]);


  useEffect(() => {
    if (token) {
      fetchRecentChats();
    }
  }, [token, activeTab]);

  useEffect(() => {
    if (!token) return;
    
    // Check if triggered from DeveloperAdmin for global story
    if (localStorage.getItem('admin_story_trigger') === 'true') {
      localStorage.removeItem('admin_story_trigger');
      setTimeout(() => {
        setStoryCameraOpen(true);
      }, 800);
    }
  }, [token]);

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
      // Only add messages from OTHER users here.
      // Own sent messages are already added optimistically in handleSendMessage
      // and are properly confirmed via the 'message_sent' event.
      if (String(msg.sender) !== String(user._id || user.id)) {

        if (activeChatUserRef.current && String(msg.sender) === String(activeChatUserRef.current._id)) {
          // Message from active chat partner - add to view and mark viewed (NO sound)
          setMessages((prev) => {
            // Prevent duplicates
            if (prev.some(m => String(m._id) === String(msg._id))) return prev;
            return [...prev, msg];
          });
          // Do NOT auto-mark view-once messages as viewed — user must click "View Photo" first
          if (!msg.isViewOnce) {
            socket.emit('mark_viewed', { messageId: msg._id, receiverId: user.id, senderId: msg.sender });
          }
        } else {
          // Message from someone else (not in active chat) - update unread
          if (pushNotifEnabledRef.current) {
            if (notifSoundEnabledRef.current) {
              try {
                const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
                audio.play()?.catch(e => console.log('Audio blocked', e));
              } catch (e) {}
            }
            if (notifPopEnabledRef.current) {
              showMsgToast(
                { username: msg.senderUsername || 'Someone', avatarUrl: msg.senderAvatarUrl || '' },
                msg.messageType === 'text' ? msg.message : `Sent a ${msg.messageType || 'file'}`,
                msg.sender
              );
            }
          }
          setUnreadMessages(prev => ({...prev, [msg.sender]: (prev[msg.sender] || 0) + 1}));
        }
        // Only fetch recent chats for incoming messages from others
        fetchRecentChats();
      }
    });


    socket.on('message_sent', ({ tempId, message }) => {
      // Replace the optimistic temp message with the confirmed server message
      setMessages(prev => prev.map(m => m._id === tempId ? message : m));
      // Update recent chats after message is confirmed
      fetchRecentChats();
    });

    socket.on('message_deleted', ({ messageId, type }) => {
      setMessages(prev => {
        if (type === 'everyone') {
          return prev.map(m => m._id === messageId ? { ...m, isDeletedForEveryone: true, message: '🚫 This message was deleted', messageType: 'text' } : m);
        } else {
          return prev.filter(m => m._id !== messageId);
        }
      });
      fetchRecentChats();
    });

    socket.on('new_notification', () => {
      fetchNotifications();
      fetchProfile();
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
      showToastMsg("Your follow request was rejected.", 'error');
      fetchProfile();
      if (activeTabRef.current === 'search') {
        handleSearch({ target: { value: searchQueryRef.current } });
      }
      if (activeTabRef.current === 'publicProfile' && publicProfileDataRef.current) {
        viewPublicProfile(publicProfileDataRef.current._id);
      }
    });

    socket.on('incoming_call', ({ from, fromUsername, signal, isVideo }) => {
      if (signal.type === 'offer') {
        setReceivingCall(true);
        setCallerId(from);
        setCallerName(fromUsername);
        setCallerSignal(signal);
        setIsVideoCall(isVideo);
        callerCandidatesRef.current = []; // reset for new call
        if (ringtoneInRef.current) {
          ringtoneInRef.current.currentTime = 0;
          ringtoneInRef.current.play()?.catch(e => console.log('Audio autoplay prevented'));
        }
      } else if (signal.candidate) {
        // It's a trickle ICE candidate
        if (connectionRef.current) {
          connectionRef.current.signal(signal);
        } else {
          callerCandidatesRef.current.push(signal);
        }
      }
    });

    socket.on('call_accepted', (signal) => {
      if (signal.type === 'answer') {
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
          ringtoneOutRef.current.src = '';
          setTimeout(() => { if (ringtoneOutRef.current) ringtoneOutRef.current.src = '/ringtone.wav'; }, 500);
        }
      }
      // Pass both the answer and any subsequent ICE candidates directly to the peer
      if (connectionRef.current) connectionRef.current.signal(signal);
    });

    socket.on('call_ended', () => {
      finalizeCallLog();
      handleEndCallQuietly();
    });

    socket.on('match_found', (data) => {
        setIsSearchingRandom(false);
        setMatchFoundData(data);
        setShowMatchCard(true);

        // Delay transition to chat by 2 seconds to show the Match Card
        const timeoutId = setTimeout(() => {
          setAnonymousRoomId(data.roomId);
          setAnonymousPartnerId(data.partnerId);
          setAnonymousPartnerAvatar(data.partnerAvatar || '');
          setAnonymousPartnerCountry(data.partnerCountry || 'Earth');
          setAnonymousPartnerCountryCode(data.partnerCountryCode || 'UN');
          setAnonymousPartnerFact(data.partnerFact || 'A beautiful country with rich culture.');
          setAnonymousPartnerName(data.partnerName || 'Stranger');
          setIsAiCompanion(Boolean(data.isAiCompanion));
          setAnonymousMessages([]);
          setIsAnonymousChatActive(true);
          setActiveTab('anonymousChat');
          setAnonymousPartnerTyping(false);
          setShowMatchCard(false);
          // Removed setMatchFoundData(null) to prevent react-globe.gl crash with empty ringsData
        }, 4000);
        
        // Save timeout ID to window so we can clear it if user skips
        window.matchTimeoutId = timeoutId;
      });

    socket.on('cancel_search', () => {
      setIsSearchingRandom(false);
      setRandomSearchTimer(3);
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
      setCoinPopup({ show: true, amount });
      setTimeout(() => setCoinPopup({ show: false, amount: 0 }), 3000);
    });

    socket.on('message_viewed', ({ messageId, viewedAt }) => {
      // Update the specific message to show 'seen' in real-time
      setMessages(prev => prev.map(msg =>
        msg._id === messageId ? { ...msg, isViewed: true, viewedAt } : msg
      ));
      // Also update the recent chats list to reflect seen status
      fetchRecentChats();
    });

    socket.on('messages_marked_read', ({ readerId, viewedAt }) => {
      if (activeChatUserRef.current && activeChatUserRef.current._id === readerId) {
        // Mark ALL messages in the active chat as seen
        setMessages(prev => prev.map(msg =>
          msg.sender === user.id ? { ...msg, isViewed: true, viewedAt } : msg
        ));
      }
      // Update the recent chats list
      fetchRecentChats();
    });

    socket.on('typing_status_received', ({ senderId, isTyping }) => {
      setTypingUsers(prev => ({ ...prev, [senderId]: isTyping }));
      if (activeChatUserRef.current && activeChatUserRef.current._id === senderId) {
        setPartnerTyping(isTyping);
      }
    });

    socket.on('globe_status_update', (status) => {
      setGlobeStatus(status);
    });

    socket.on('call_failed', ({ reason }) => {
      alert(`Call could not connect: ${reason}`);
      handleEndCallQuietly();
    });

    socket.on('new_story', () => {
      fetchStories();
      fetcheveryoneStories();
    });
    
    socket.on('story_interaction', () => {
      fetchStories();
      fetcheveryoneStories();
    });

    return () => {
      socket.off('online_users');
      socket.off('receive_message');
      socket.off('message_sent');
      socket.off('message_deleted');
      socket.off('new_notification');
      socket.off('new_story');
      socket.off('story_interaction');
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
      socket.off('globe_status_update');
      socket.off('call_failed');
    };
  }, [socket, user]);

  useEffect(() => {
    let interval;
    if (!globeStatus.isEnabled && globeStatus.enableAt) {
      const updateTimer = () => {
        const enableTime = new Date(globeStatus.enableAt).getTime();
        const now = Date.now();
        const diff = enableTime - now;

        if (diff <= 0) {
          setGlobeOfflineTimerDisplay('00:00:00');
          setShowGlobeOfflineModal(false);
          clearInterval(interval);
        } else {
          const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          
          let display = '';
          if (hours > 0) display += `${hours.toString().padStart(2, '0')}:`;
          display += `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
          setGlobeOfflineTimerDisplay(display);
        }
      };
      updateTimer();
      interval = setInterval(updateTimer, 1000);
    }
    return () => clearInterval(interval);
  }, [globeStatus.isEnabled, globeStatus.enableAt]);

  // SPA Back Button Handling for Overlays & Chats
  const openOverlaysCount = [
    showChangeUsernameModal, 
    showInnerSettingsModal, 
    showCommentsModal, 
    showSettingsModal, 
    !!activeChatUser, 
    isAnonymousChatActive, 
    storyViewerActive, 
    storyEditorOpen, 
    showCloseFriendsModal, 
    showStoryViewsModal, 
    storyCameraOpen, 
    showLogoutConfirm
  ].filter(Boolean).length;
  const prevOverlaysCount = useRef(0);

  useEffect(() => {
    if (openOverlaysCount > prevOverlaysCount.current) {
      window.history.pushState({ overlayOpen: true }, '');
    }
    prevOverlaysCount.current = openOverlaysCount;
  }, [openOverlaysCount]);

  useEffect(() => {
    const handlePopState = (e) => {
      if (showChangeUsernameModal) {
        setShowChangeUsernameModal(false);
      } else if (showInnerSettingsModal) {
        setShowInnerSettingsModal(false);
      } else if (showCommentsModal) {
        setShowCommentsModal(false);
      } else if (showStoryViewsModal) {
        setShowStoryViewsModal(false);
      } else if (showCloseFriendsModal) {
        setShowCloseFriendsModal(false);
      } else if (storyCameraOpen) {
        if (storyLiveCameraRef.current && storyLiveCameraRef.current.srcObject) {
           storyLiveCameraRef.current.srcObject.getTracks().forEach(t => t.stop());
        }
        setStoryCameraOpen(false);
        setStoryCapturedImage(null);
        setStoryCameraStream(null);
      } else if (storyEditorOpen) {
        setStoryEditorOpen(false);
      } else if (storyViewerActive) {
        setStoryViewerActive(false);
        setProfileStoryGroups(null);
        fetchStories();
        fetcheveryoneStories();
      } else if (showLogoutConfirm) {
        setShowLogoutConfirm(false);
      } else if (isAnonymousChatActive) {
        if (socket) {
           socket.emit('leave_anonymous_chat', { roomId: anonymousRoomId });
        }
        setIsAnonymousChatActive(false);
      } else if (activeChatUser) {
        if (activeTabRef.current === 'publicProfile') {
          _setActiveTab('messages');
        } else {
          setActiveChatUser(null);
        }
      } else if (showSettingsModal) {
        setShowSettingsModal(false);
      } else if (e.state && e.state.tab) {
        _setActiveTab(e.state.tab);
      } else {
        _setActiveTab('home');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [showChangeUsernameModal, showInnerSettingsModal, showCommentsModal, showSettingsModal, publicProfileData, activeChatUser, isAnonymousChatActive, showLogoutConfirm, storyViewerActive, storyEditorOpen, showCloseFriendsModal, showStoryViewsModal, storyCameraOpen]);

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
      // Don't auto-cancel on the frontend. The backend will ALWAYS send a match or bot within this time.
      // We just keep the UI in 'searching' state until the server responds, which should be instantaneous now.
    }
    return () => clearInterval(interval);
  }, [isSearchingRandom, randomSearchTimer, socket, user, activeTab]);

  // Removed redundant popstate handler

  const prevLastMessageId = useRef(null);
  const prevLastAnonId = useRef(null);
  const prevActiveChatId = useRef(null);
  const scrollHeightBeforeUpdate = useRef(0);

  useLayoutEffect(() => {
    if (messagesEndRef.current) {
      const parent = messagesEndRef.current.parentElement;
      if (parent) {
        if (scrollHeightBeforeUpdate.current > 0) {
          // Prevent infinite scroll flicker by adjusting scroll synchronously before paint
          parent.scrollTop = parent.scrollHeight - scrollHeightBeforeUpdate.current;
          scrollHeightBeforeUpdate.current = 0;
        } else {
          const currentLastMessage = messages.length > 0 ? messages[messages.length - 1]._id : null;
          const currentLastAnon = anonymousMessages.length > 0 ? anonymousMessages[anonymousMessages.length - 1].id : null;
          
          const isNewMessageAtBottom = prevLastMessageId.current !== currentLastMessage && currentLastMessage !== null;
          const isNewAnonAtBottom = prevLastAnonId.current !== currentLastAnon && currentLastAnon !== null;
          
          const isTyping = partnerTyping || anonymousPartnerTyping;
          const isNewChat = prevActiveChatId.current !== (activeChatUser?._id || null);

          if (isNewChat || isNewMessageAtBottom || isNewAnonAtBottom || isTyping) {
            parent.scrollTop = parent.scrollHeight;
            // Add a small delay to ensure DOM is painted, especially on mobile
            setTimeout(() => {
              if (parent) parent.scrollTop = parent.scrollHeight;
            }, 100);
          }
          
          prevLastMessageId.current = currentLastMessage;
          prevLastAnonId.current = currentLastAnon;
        }
      }
    }
    prevActiveChatId.current = activeChatUser?._id || null;
  }, [messages, anonymousMessages, partnerTyping, anonymousPartnerTyping, activeChatUser]);

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
    if (activeChatUser) {
      setMessagePage(1);
      setHasMoreMessages(true);
      fetchMessages(activeChatUser._id, 1);
    }
  }, [activeChatUser]);

  const fetchRecentChats = async () => {
    try {
      setChatsError(null);
      const res = await fetch(`${API_URL}/api/chats/recent`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) {
        setRecentChats(data);
        const unreads = {};
        data.forEach(chat => {
          unreads[chat._id] = chat.unreadCount || 0;
        });
        setUnreadMessages(unreads);
      } else {
        setChatsError(`API Error: ${data.message || res.status}`);
      }
    } catch (err) { 
      console.error(err); 
      setChatsError(`Network Error: ${err.message}`);
      setRecentChats([]); // Fallback
    } finally {
      setIsFetchingChats(false);
    }
  };

  const fetchMessages = async (otherId, page = 1) => {
    try {
      if (page === 1) setIsFetchingMessages(true);
      const res = await fetch(`${API_URL}/api/messages/${otherId}?page=${page}&limit=20`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) {
        if (page === 1) {
          setMessages(data.messages);
        } else {
          // Prepend older messages while maintaining the existing ones
          setMessages(prev => [...data.messages, ...prev]);
        }
        setHasMoreMessages(data.hasMore);
      }
    } catch (err) { console.error(err); } finally {
      if (page === 1) setIsFetchingMessages(false);
    }
  };

  const handleChatScroll = async (e) => {
    if (e.target.scrollTop === 0 && hasMoreMessages && !isFetchingMessages) {
      scrollHeightBeforeUpdate.current = e.target.scrollHeight;
      const nextPage = messagePage + 1;
      setMessagePage(nextPage);
      
      await fetchMessages(activeChatUser._id, nextPage);
    }
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
    if (searchHistoryCache) setSearchResults(searchHistoryCache);
    else setIsFetchingSearchHistory(true);
    try {
      const res = await fetch(`${API_URL}/api/users/search-history`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) {
        setSearchResults(data);
        setSearchHistoryCache(data);
      }
    } catch (e) { console.error("Search history error", e); } finally {
      setIsFetchingSearchHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'search' && !searchQuery.trim()) {
      fetchSearchHistory();
    }
  }, [activeTab, searchQuery]);

  const currentSearchId = useRef(0);

  const handleSearch = async (eOrValue, page = 1) => {
    let value = typeof eOrValue === 'string' ? eOrValue : eOrValue.target.value;
    
    if (page === 1) {
      setSearchQuery(value);
      setSearchPage(1);
      setHasMoreSearch(true);
    }

    if (!value.trim()) {
      fetchSearchHistory();
      return;
    }
    
    const searchId = ++currentSearchId.current;
    
    if (page === 1) setSearchLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/users/search?q=${value}&page=${page}&limit=20`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      
      if (searchId !== currentSearchId.current && page === 1) return; // Prevent race conditions on new searches
      
      if (res.ok) {
        if (page === 1) {
          setSearchResults(data.users);
        } else {
          setSearchResults(prev => [...prev, ...data.users]);
        }
        setHasMoreSearch(data.hasMore);
      }
    } catch (err) { console.error(err); } finally {
      if (page === 1 && searchId === currentSearchId.current) setSearchLoading(false);
    }
  };

  const handleSearchResultsScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    // When scrolled to near bottom
    if (scrollHeight - scrollTop - clientHeight < 50 && hasMoreSearch && !searchLoading) {
      const nextPage = searchPage + 1;
      setSearchPage(nextPage);
      handleSearch(searchQuery, nextPage);
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
    setNotifications(prev => prev.map(notif => 
      (['follow_request', 'anonymous_follow_request', 'follow_back_request'].includes(notif.type) && notif.user?._id === requesterId)
        ? { ...notif, type: 'started_following_you' }
        : notif
    ));

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
        setConnectionsSearch('');
        setConnectionsPage({
          title: type.charAt(0).toUpperCase() + type.slice(1),
          users: data[type] || [],
          returnTab: activeTab === 'publicProfile' ? 'publicProfile' : 'profile'
        });
        setActiveTab('connections');
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
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 400 && data.message && data.message.includes('Nudity')) {
          setShowNudityWarning(true);
        } else {
          showToastMsg(data.message || 'Upload blocked by moderation policy.', 'error');
        }
        return null;
      }
      return data.url;
    } catch (err) {
      console.error('Upload failed', err);
      showToastMsg('Upload failed. Please try again.', 'error');
      return null;
    }
  };

  const closeStoryCamera = () => {
    if (storyCameraStream) {
      storyCameraStream.getTracks().forEach(track => track.stop());
      setStoryCameraStream(null);
    }
    setStoryCameraOpen(false);
    setStoryCapturedImage(null);
  };
  const openSharedStory = async (storyId) => {
    try {
      const res = await fetch(`${API_URL}/api/stories/${storyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.stories && data.stories.length > 0) {
        setProfileStoryGroups([{
          user: data.user,
          stories: data.stories
        }]);
        setCurrentStoryUserIndex(0);
        setCurrentStoryIndex(data.storyIndex || 0);
        setStoryProgress(0);
        setStoryPaused(false);
        setStoryViewerActive(true);
        window.history.pushState({ page: 'story-viewer' }, 'Story Viewer', window.location.pathname);
      } else {
        showToastMsg('Story is no longer available', 'error');
      }
    } catch (err) {
      console.error(err);
      showToastMsg('Error loading story', 'error');
    }
  };


  const openStoryCamera = async (facing = 'user', captureMode = 'story') => {
    const mode = typeof facing === 'string' ? facing : 'user';
    setCameraMode(captureMode);
    try {
      if (storyCameraStream) {
        storyCameraStream.getTracks().forEach(track => track.stop());
        setStoryCameraStream(null);
      }
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: mode } } });
      } catch (e) {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode } });
      }
      
      // Read actual facing mode from track settings (most reliable on Android Chrome)
      const track = stream.getVideoTracks()[0];
      const settings = track && track.getSettings ? track.getSettings() : {};
      const actualFacing = settings.facingMode || mode;
      
      setStoryCameraStream(stream);
      setStoryCameraFacingMode(actualFacing);
      setStoryCameraOpen(true);
      setStoryCapturedImage(null);
    } catch (err) {
      console.error("Camera access denied or unavailable", err);
      const fallbackInput = captureMode === 'avatar' ? avatarFileInputRef.current : storyFileInputRef.current;
      if (fallbackInput) fallbackInput.click();
    }
  };

  const switchStoryCamera = async () => {
    const newMode = storyCameraFacingMode === 'user' ? 'environment' : 'user';
    try {
      if (storyCameraStream) {
        storyCameraStream.getTracks().forEach(track => track.stop());
      }
      
      // Wait for hardware to release the camera fully before requesting new one
      await new Promise(resolve => setTimeout(resolve, 300));
      
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: newMode } } });
      } catch (e) {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: newMode } });
      }
      
      // Read actual facing mode from track settings (most reliable on Android Chrome)
      const track = stream.getVideoTracks()[0];
      const settings = track && track.getSettings ? track.getSettings() : {};
      const actualFacing = settings.facingMode || newMode;
      
      setStoryCameraStream(stream);
      setStoryCameraFacingMode(actualFacing);
    } catch (err) {
      console.error("Camera switch failed", err);
    }
  };

  const captureStoryPhoto = () => {
    if (storyLiveCameraRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = storyLiveCameraRef.current.videoWidth;
      canvas.height = storyLiveCameraRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (storyCameraFacingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      
      ctx.drawImage(storyLiveCameraRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setStoryCapturedImage(dataUrl);
    }
  };

  const confirmStoryPhoto = () => {
    if (storyCapturedImage) {
      // Convert Data URL to File object
      const arr = storyCapturedImage.split(',');
      const mime = arr[0].match(/:(.*?);/)[1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while(n--){
          u8arr[n] = bstr.charCodeAt(n);
      }
      const file = new File([u8arr], `story_${Date.now()}.jpg`, {type:mime});
      
      const simulatedEvent = {
        target: {
          files: [file]
        }
      };
      
      handleStorySelect(simulatedEvent);
    }
  };

  const handleStorySelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (storyCameraOpen) {
        closeStoryCamera();
      }
      try {
        setStoryFile(file);
        setStoryPreviewUrl(URL.createObjectURL(file));
        setStoryEditorOpen(true);
        setStoryVisibility('everyone');
        setSelectedSongUrl('');
        setStoryCrop({ unit: '%', width: 90, height: 90, x: 5, y: 5 });
        setCompletedStoryCrop(null);
        setIsCroppingStory(true);
        
        const fileType = file.type || '';
        
        if (!fileType.startsWith('video/')) {
          setStoryPreviewSafety('checking');
          
          try {
            const compressedFile = await compressImage(file);
            const formData = new FormData();
            formData.append('file', compressedFile);
            
            const checkRes = await fetch(`${API_URL}/api/check?t=${Date.now()}`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
              body: formData
            });
            
            if (checkRes.ok) setStoryPreviewSafety('safe');
            else setStoryPreviewSafety('unsafe');
          } catch (err) {
            setStoryPreviewSafety('unsafe');
          }
        } else {
          setStoryPreviewSafety('safe');
        }
      } catch (err) {
        setStoryPreviewSafety('unsafe');
      }
    }
    e.target.value = '';
  };

  const handleConfirmCrop = async () => {
    if (completedStoryCrop?.width && completedStoryCrop?.height && storyImgRef.current) {
      const croppedFile = await getCroppedImg(storyImgRef.current, completedStoryCrop, storyFile.name);
      if (croppedFile) {
        setStoryFile(croppedFile);
        setStoryPreviewUrl(URL.createObjectURL(croppedFile));
      }
    }
    setIsCroppingStory(false);
  };

  const handleStoryUpload = async () => {
    setStoryUploading(true);
    let finalFile = storyFile;
    
    let mediaType = 'image';
    if (storyFile && storyFile.type && storyFile.type.startsWith('video/')) mediaType = 'video';
    
    if (mediaType === 'image') {
      try {
        finalFile = await compressImage(finalFile);
      } catch (err) {
        console.error('Compression failed, using original', err);
      }
    }
    
    const formData = new FormData();
    formData.append('file', finalFile);
    
    try {
      const res = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      
      if (!res.ok) {
        console.error('BACKEND UPLOAD ERROR:', data);
        if (res.status === 400 && data.message && data.message.includes('Nudity')) {
          setShowNudityWarning(true);
        } else {
          showToastMsg(data.message || 'Upload blocked by moderation policy.', 'error');
        }
        setStoryUploading(false);
        return;
      }
      
      if (res.ok && data.url) {
        const storyRes = await fetch(`${API_URL}/api/stories`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ 
            mediaUrl: data.url, 
            mediaType,
            visibility: storyVisibility,
            allowedUsers: storyVisibility === 'custom' ? selectedCloseFriends : [],
            songUrl: selectedSongUrl
          })
        });
        
        if (storyRes.ok) {
          fetchStories();
          fetcheveryoneStories();
          setStoryEditorOpen(false);
          setStoryFile(null);
          showToastMsg('Status added successfully!', 'success');
        } else {
          showToastMsg('Failed to save status on server', 'error');
        }
      } else {
        showToastMsg('Image upload failed', 'error');
      }
    } catch (err) {
      console.error('Story upload failed', err);
      showToastMsg('Status upload failed', 'error');
    } finally {
      setStoryUploading(false);
    }
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        // Safe image, show preview
        setPreviewImage(file);
        setIsViewOnce(false);
        setPreviewType('image');
        
        const fileType = file.type || '';
        
        if (!fileType.startsWith('video/')) {
          setPreviewSafety('checking');
          
          try {
            const compressedFile = await compressImage(file);
            const formData = new FormData();
            formData.append('file', compressedFile);
            
            const checkRes = await fetch(`${API_URL}/api/check?t=${Date.now()}`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
              body: formData
            });
            
            if (checkRes.ok) {
              setPreviewSafety('safe');
            } else {
              setPreviewSafety('unsafe');
            }
          } catch (err) {
            setPreviewSafety('unsafe');
          }
        } else {
          setPreviewSafety('safe');
        }
      } catch (err) {
        setPreviewSafety('unsafe');
      }
      
      // Clear inputs to allow re-selection
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const getCroppedImg = (image, crop, fileName) => {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = crop.width * scaleX;
    canvas.height = crop.height * scaleY;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width * scaleX,
      crop.height * scaleY
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          resolve(null);
          return;
        }
        blob.name = fileName;
        const file = new File([blob], fileName, { type: blob.type });
        resolve(file);
      }, 'image/jpeg', 0.95);
    });
  };
  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const fileType = file.type || '';
      // Don't compress small files or non-images (like gifs if they somehow bypass accept)
      if (file.size < 4000000 || !fileType.startsWith('image/') || fileType === 'image/gif') {
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
          const tempId = `temp-${Date.now()}`;
          socket.emit('send_message', { 
            tempId,
            senderId: user.id, 
            receiverId: activeChatUser._id, 
            messageText: '', 
            messageType: 'image', 
            fileUrl: url, 
            replyTo: replyingTo?._id || null,
            isViewOnce: isViewOnce
          });
          
          setMessages(prev => [...prev, { 
            _id: tempId,
            sender: user.id, 
            receiver: activeChatUser._id, 
            message: '', 
            messageType: 'image',
            fileUrl: url,
            replyTo: replyingTo ? {
              messageId: replyingTo._id,
              messageText: replyingTo.message,
              messageType: replyingTo.messageType,
              senderName: replyingTo.sender === user.id ? 'You' : activeChatUser.username
            } : null,
            isViewOnce: isViewOnce,
            isViewed: false,
            createdAt: new Date().toISOString() 
          }]);
          
          setReplyingTo(null);
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
          const tempId = `temp-${Date.now()}`;
          socket.emit('send_message', { tempId, senderId: user.id, receiverId: activeChatUser._id, messageText: '', messageType: 'audio', fileUrl: url, replyTo: null });
          setMessages(prev => [...prev, { 
            _id: tempId,
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
    
    // If reporting an AI companion, simulate success without sending to backend
    if (reportTarget.id && reportTarget.id.toString().startsWith('ai-companion-')) {
      setTimeout(() => {
        setIsSubmittingReport(false);
        setReportSuccess(true);
        setTimeout(() => {
          setShowReportModal(false);
          setReportTarget(null);
          setReportSuccess(false);
          setReportReason(''); // reset reason
        }, 2000);
      }, 500);
      return;
    }
    
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

  const handleSendMessage = (e, textOverride = null) => {
    e.preventDefault();
    const textToSend = textOverride !== null ? textOverride : newMessage;
    if (!textToSend.trim() || !activeChatUser || !socket) return;
    
    if (chatTypingTimeoutRef.current) clearTimeout(chatTypingTimeoutRef.current);
    socket.emit('typing_status', { senderId: user.id, receiverId: activeChatUser._id, isTyping: false });
    
    const replyToObj = replyingTo ? {
      messageId: replyingTo._id,
      messageText: replyingTo.message,
      messageType: replyingTo.messageType,
      senderName: replyingTo.sender === user.id ? 'You' : activeChatUser.username
    } : null;

    const tempId = `temp-${Date.now()}`;
    const msgData = { tempId, senderId: user.id, receiverId: activeChatUser._id, messageText: textToSend, messageType: 'text', fileUrl: null, replyTo: replyToObj };
    socket.emit('send_message', msgData);
    
    // Optimistic UI update
    setMessages(prev => [...prev, { 
      _id: tempId,
      sender: user.id, 
      receiver: activeChatUser._id, 
      message: textToSend, 
      replyTo: replyToObj,
      messageType: 'text',
      createdAt: new Date().toISOString()
    }]);
    
    // Optional: Only clear state if it's being used
    if (textOverride === null) setNewMessage('');
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
      
      // Optimistic UI update for instant feedback
      setMessages(prev => {
        if (type === 'everyone') {
          return prev.map(m => m._id === contextMenu.msgId ? { ...m, isDeletedForEveryone: true, message: '🚫 This message was deleted', messageType: 'text' } : m);
        } else {
          return prev.filter(m => m._id !== contextMenu.msgId);
        }
      });
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
    const tempId = `temp-call-${Date.now()}`;
    const msgData = {
      tempId,
      senderId: user.id,
      receiverId: targetId,
      messageText: messageText
    };
    socket.emit('send_message', msgData);
    
    if (activeChatUser && activeChatUser._id === targetId) {
      setMessages(prev => [...prev, {
        _id: tempId,
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
    if (diffInMinutes < 60) return diffInMinutes === 1 ? `Seen 1 minute ago` : `Seen ${diffInMinutes} minutes ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return diffInHours === 1 ? `Seen 1 hour ago` : `Seen ${diffInHours} hours ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return diffInDays === 1 ? `Seen 1 day ago` : `Seen ${diffInDays} days ago`;
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) return diffInWeeks === 1 ? `Seen 1 week ago` : `Seen ${diffInWeeks} weeks ago`;
    
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) return diffInMonths === 1 ? `Seen 1 month ago` : `Seen ${diffInMonths} months ago`;
    
    const diffInYears = Math.floor(diffInDays / 365);
    if (diffInYears === 1) return `Seen 1 year ago`;
    return `Seen ${diffInYears} years ago`;
  };

  const startChatWithUser = (targetUser) => {
    setActiveChatUser(targetUser);
    setMessages([]);
    setActiveTab('messages');
    setUnreadMessages(prev => ({...prev, [targetUser._id]: 0})); // Reset unread
    setPartnerTyping(false);
    fetchMessages(targetUser._id);
    if (socket) {
      socket.emit('mark_all_read', { senderId: targetUser._id, receiverId: user.id });
    }
    // Clear push notifications when entering a chat
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        if (reg.active) reg.active.postMessage({ type: 'CLEAR_NOTIFICATIONS' });
      }).catch(() => {});
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
      ringtoneOutRef.current.play()?.catch(e => console.log('Audio autoplay prevented'));
    }

    try {
      const stream = await requestMediaPermissions(isVideo);
      localStreamRef.current = stream;
      if (myVideoRef.current) {
        myVideoRef.current.srcObject = stream;
        myVideoRef.current.play()?.catch(e => console.error('Local video play error:', e));
      }

      const peer = new Peer({ 
        initiator: true, 
        trickle: true, 
        stream: stream,
        config: {
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
        }
      });

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
      });

      peer.on('close', () => {
        if (connectionRef.current) handleEndCallQuietly();
      });

      peer.on('error', (err) => {
        console.log('Peer event in callUser:', err?.message || err);
        if (connectionRef.current) handleEndCallQuietly();
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
        myVideoRef.current.play()?.catch(e => console.error('Local video play error:', e));
      }

      const peer = new Peer({ 
        initiator: false, 
        trickle: true, 
        stream: stream,
        config: {
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
        }
      });

      peer.on('signal', (data) => {
        socket.emit('answer_call', { to: callerId, signal: data });
      });

      peer.on('stream', (remoteStream) => {
        setRemoteStreamState(remoteStream);
      });

      peer.on('close', () => {
        if (connectionRef.current) handleEndCallQuietly();
      });

      peer.on('error', (err) => {
        console.log('Peer event in acceptCall:', err?.message || err);
        if (connectionRef.current) handleEndCallQuietly();
      });

      peer.signal(callerSignal);
      // Signal any ICE candidates that arrived before the call was accepted
      if (callerCandidatesRef.current) {
        callerCandidatesRef.current.forEach(c => peer.signal(c));
        callerCandidatesRef.current = [];
      }
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
    setCallerSignal(null);
    callerCandidatesRef.current = [];
    if (ringtoneInRef.current) { 
      ringtoneInRef.current.pause(); 
      ringtoneInRef.current.currentTime = 0; 
      ringtoneInRef.current.src = '';
      setTimeout(() => { if (ringtoneInRef.current) ringtoneInRef.current.src = '/incoming.wav'; }, 500);
    }
    if (ringtoneOutRef.current) { 
      ringtoneOutRef.current.pause(); 
      ringtoneOutRef.current.currentTime = 0; 
      ringtoneOutRef.current.src = '';
      setTimeout(() => { if (ringtoneOutRef.current) ringtoneOutRef.current.src = '/ringtone.wav'; }, 500);
    }
    // Destroy peer connection safely — grab ref first, null it, then destroy
    const peer = connectionRef.current;
    connectionRef.current = null;
    if (peer) { try { peer.destroy(); } catch(e) {} }
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

      // ✅ FIX: Pehle purana track stop karo, PHIR naya stream maango
      // Agar purana track chal raha hai to browser NotReadableError deta hai
      const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
      if (oldVideoTrack) {
        oldVideoTrack.stop(); // Hardware release karo pehle
        localStreamRef.current.removeTrack(oldVideoTrack);
      }

      // Hardware properly release ho sake isliye thoda wait karo
      await new Promise(resolve => setTimeout(resolve, 300));

      let newStream;
      try {
        // Pehle ideal facingMode ke saath try karo
        newStream = await navigator.mediaDevices.getUserMedia({
          audio: false, // Audio track pehle se hai, dobara mat lo
          video: { facingMode: { ideal: newMode } }
        });
      } catch (err) {
        // Agar ideal constraint fail ho to exact try karo
        try {
          newStream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { facingMode: { exact: newMode } }
          });
        } catch (err2) {
          // Last resort: bina facingMode ke maango
          newStream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: true
          });
        }
      }

      const newVideoTrack = newStream.getVideoTracks()[0];

      if (newVideoTrack) {
        // Naya track existing stream mein add karo
        localStreamRef.current.addTrack(newVideoTrack);

        // WebRTC connection mein track replace karo
        const sender = connectionRef.current._pc &&
          connectionRef.current._pc.getSenders &&
          connectionRef.current._pc.getSenders().find(s => s.track && s.track.kind === 'video');

        if (sender) {
          await sender.replaceTrack(newVideoTrack);
        } else {
          // Fallback: simple-peer replaceTrack
          try {
            connectionRef.current.replaceTrack(
              localStreamRef.current.getVideoTracks().find(t => t !== newVideoTrack) || newVideoTrack,
              newVideoTrack,
              localStreamRef.current
            );
          } catch (replaceErr) {
            console.warn('replaceTrack fallback also failed:', replaceErr);
          }
        }

        if (myVideoRef.current) {
          myVideoRef.current.srcObject = localStreamRef.current;
        }
        setCurrentFacingMode(newMode);
      }
    } catch (e) {
      console.error('Failed to switch camera:', e);
      // User ko friendly message dikhao sirf agar zaruri ho
      if (e.name === 'NotReadableError' || e.name === 'NotAllowedError') {
        alert(`Camera switch failed: ${e.name} — Please check camera permissions or try again.`);
      }
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
    if (storyCameraOpen && storyCameraStream && storyLiveCameraRef.current) {
      storyLiveCameraRef.current.srcObject = storyCameraStream;
    }
  }, [storyCameraOpen, storyCameraStream]);

  useEffect(() => {
    if (callActive) {
      if (myVideoRef.current && localStreamRef.current) {
        if (myVideoRef.current.srcObject !== localStreamRef.current) {
          myVideoRef.current.srcObject = localStreamRef.current;
        }
      }
      if (userVideoRef.current && remoteStreamState) {
        if (userVideoRef.current.srcObject !== remoteStreamState) {
          userVideoRef.current.srcObject = remoteStreamState;
        }
        if (userVideoRef.current.paused) {
          const playPromise = userVideoRef.current.play();
          if (playPromise !== undefined) {
            playPromise.catch(e => console.log('Remote play prevented:', e.message));
          }
        }
      }
    }
  }, [swapVideo, callActive, callAccepted, remoteStreamState]);

  const handleGlobeClick = useCallback(() => {
    // Add light haptic feedback (vibration) for mobile users
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(70); // 70ms light vibration (increased slightly)
    }

    if (!globeStatus.isEnabled) {
      const now = new Date();
      const enableTime = globeStatus.enableAt ? new Date(globeStatus.enableAt) : null;
      if (!enableTime || now < enableTime) {
         setShowGlobeOfflineModal(true);
         return;
      }
    }

    if (!isSearchingRandom) {
      if (genderFilter !== 'any' && coins < 2) {
        alert("Not enough coins! You need 2 coins to use the gender filter.");
        return;
      }
      setIsSearchingRandom(true);
      setRandomSearchTimer(3);
      setMatchFailed(false);
      if (socket) socket.emit('search_random', { userId: user.id, isBotEligible: false, genderFilter });
    } else {
      setIsSearchingRandom(false);
      if (socket) socket.emit('cancel_search', user.id);
    }
  }, [isSearchingRandom, genderFilter, coins, socket, user, globeStatus]);

  const handleGlobeClickRef = useRef(handleGlobeClick);
  useEffect(() => {
    handleGlobeClickRef.current = handleGlobeClick;
  }, [handleGlobeClick]);

  const handleSendAnonymousMessage = (e, textOverride = null) => {
    e.preventDefault();
    const textToSend = textOverride !== null ? textOverride : newMessage;
    if (!textToSend.trim() || !anonymousRoomId || !socket || !isAnonymousChatActive) return;
    
    const msg = {
      _id: `temp-${Date.now()}`,
      message: textToSend,
      senderSocket: socket.id,
      isMine: true,
      createdAt: new Date().toISOString()
    };
    
    socket.emit('send_anonymous_message', { roomId: anonymousRoomId, messageText: textToSend });
    socket.emit('send_anonymous_typing', { roomId: anonymousRoomId, isTyping: false });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    setAnonymousMessages(prev => [...prev, msg]);
    // Optional: Only clear state if it's being used
    if (textOverride === null) setNewMessage('');
  };

  const handleSendAnonymousFriendRequest = async () => {
    if (coins < 5) {
      showToastMsg("Not enough coins! You need 5 coins.", 'error');
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
        showToastMsg("Request Sent!", 'coin');
      } else {
        showToastMsg(data.message || "Could not send request.", 'error');
      }
    } catch (err) { 
      console.error(err); 
      showToastMsg("Error sending request. Please check your connection.", 'error');
    }
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

            {Capacitor.isNativePlatform() && (
              <div className="earn-card" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: '15px', padding: '20px', marginBottom: '20px' }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', color: '#FFD700' }}>Watch Video</h3>
                <p style={{ margin: '0 0 15px 0', color: '#aaa', fontSize: '0.9rem' }}>Watch a short ad to earn free coins immediately!</p>
                <button onClick={handleWatchAd} style={{ padding: '10px 20px', background: 'linear-gradient(45deg, #FFD700, #FFA500)', border: 'none', borderRadius: '8px', color: '#000', cursor: 'pointer', fontWeight: 'bold', width: '100%' }}>
                  Watch Ad & Earn
                </button>
              </div>
            )}

          </div>
        );
        case 'everyone-stories': {
          return (
            <div className="everyone-stories-container" style={{ padding: '15px', paddingBottom: '100px', maxWidth: '600px', margin: '0 auto' }}>
              <h2 style={{ textAlign: 'center', marginBottom: '20px', fontSize: '1.8rem', color: '#fff' }}>Global Stories</h2>
              {everyoneStories.length === 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
                    {[...Array(6)].map((_, i) => (
                      <div key={i} style={{ position: 'relative', paddingBottom: '150%', borderRadius: '15px', overflow: 'hidden', background: 'rgba(255,255,255,0.05)', animation: 'pulse 1.5s infinite ease-in-out' }}>
                        <div style={{ position: 'absolute', top: '8px', left: '8px', right: '8px', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 5, background: 'rgba(0,0,0,0.4)', padding: '6px 8px', borderRadius: '10px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
                          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <div style={{ width: '60%', height: '10px', borderRadius: '4px', background: 'rgba(255,255,255,0.2)' }}></div>
                              <div style={{ width: '16px', height: '10px', borderRadius: '2px', background: 'rgba(255,255,255,0.1)' }}></div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <div style={{ width: '40%', height: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)' }}></div>
                              <div style={{ width: '30%', height: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)' }}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
              ) : (
                <>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(2, 1fr)', 
                    gap: '15px' 
                  }}>
                    {everyoneStories.slice(0, visibleeveryoneStories).map((group, groupIdx) => {
                      const story = group.stories[0];
                      if (!story) return null;
                      if (!story.user || typeof story.user === 'string') {
                        story.user = { _id: group.userId, username: group.username, avatarUrl: group.avatarUrl, country: group.country, countryCode: group.countryCode };
                      }
                      return (
                      <div 
                        key={group.userId} 
                        style={{ 
                          position: 'relative', 
                          paddingBottom: '150%', 
                          borderRadius: '15px', 
                          overflow: 'hidden',
                          cursor: 'pointer',
                          background: '#111'
                        }}
                        onClick={() => {
                          setCurrentStoryUserIndex(groupIdx);
                          setCurrentStoryIndex(0);
                          setStoryViewerActive(true);
                        }}
                      >
                        {story.mediaType === 'video' ? (
                          <video src={story.mediaUrl} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} muted />
                        ) : (
                          <img src={story.mediaUrl} alt="Story" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                        )}
                        
                        <div style={{ position: 'absolute', top: '8px', left: '8px', right: '8px', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 5, background: 'rgba(0,0,0,0.4)', padding: '6px 8px', borderRadius: '10px' }}>
                          <img src={story.user?.avatarUrl || 'https://via.placeholder.com/30'} alt="avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 'bold', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                                {story.user?.username || 'user'}
                              </span>
                              <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>{getFlagEmoji(story.user?.country, story.user?.countryCode)}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden' }}>
                              <span style={{ color: '#ddd', fontSize: '0.75rem', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden', flexShrink: 1 }}>{story.user?.country || 'Earth'}</span>
                              <span style={{ color: '#aaa', fontSize: '0.75rem', flexShrink: 0 }}>•</span>
                              <span style={{ color: '#aaa', fontSize: '0.75rem', flexShrink: 0, textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>{timeSince(story.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                        {group.isAdminStory && (
                          <div style={{ position: 'absolute', top: '10px', right: '10px', background: '#ff3366', color: '#fff', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold' }}>Global</div>
                        )}
                      </div>
                    )})}
                  </div>
                  {visibleeveryoneStories < everyoneStories.length && (
                    <div ref={loadMoreRef} style={{ display: 'flex', justifyContent: 'center', padding: '30px 0' }}>
                      <button 
                        onClick={() => {
                          if (timeoutRef.current) clearTimeout(timeoutRef.current);
                          setVisibleeveryoneStories(prev => prev + 12);
                        }}
                        style={{
                          background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', 
                          width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                          cursor: 'pointer', color: '#fff', animation: 'bounce 2s infinite'
                        }}
                      >
                        <ChevronDown size={28} />
                      </button>
                    </div>
                  )}
                </>
              )}
        
      
    </div>
  );
}

      case 'home':
        return (
          <div className="space-container" style={{ overflow: 'hidden' }}>

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
                    onClick={(e) => { e.stopPropagation(); setIsSearchingRandom(false); setRandomSearchTimer(3); if (socket) socket.emit('cancel_search', user.id); }}
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
            
          </div>
        );

      case 'anonymousChat':
        return (
          <div className="chat-container">
            <div className="chat-area" style={{ position: 'relative' }}>
              <div className="chat-room-header">
                <div className="chat-header-info" style={{ display: 'flex', alignItems: 'center' }}>
                  <button 
                    className="back-btn" 
                    onClick={handleLeaveAnonymousChat}
                    style={{ border: 'none', background: 'transparent', fontSize: '1.5rem', cursor: 'pointer', marginRight: '12px' }}
                    title="Leave Chat"
                  >
                    {getFlagEmoji(anonymousPartnerCountry, anonymousPartnerCountryCode) || '🌍'}
                  </button>
                  
                  {anonymousPartnerAvatar ? (
                    <div className='user-avatar-small' style={{ width: '45px', height: '45px', minWidth: '45px', minHeight: '45px', flexShrink: 0, borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src={anonymousPartnerAvatar} alt='avatar' style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                    </div>
                  ) : (
                    <div className='user-avatar-small' style={{ width: '45px', height: '45px', minWidth: '45px', minHeight: '45px', flexShrink: 0, borderRadius: '50%', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#333' }}>
                      ?
                    </div>
                  )}

                  <div className="user-names" style={{ marginLeft: '12px', display: 'flex', flexDirection: 'column' }}>
                    <span className="user-username" style={{ fontSize: '1rem', fontWeight: 'bold' }}>
                      {anonymousPartnerName}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#a8a8a8' }}>
                      {anonymousPartnerCountry}
                    </span>
                  </div>
                </div>
                <div className="chat-actions">
                  <button
                    className="action-icon-btn" 
                    onClick={() => {
                      setReportTarget({ id: anonymousPartnerId, username: 'Anonymous User', isAnonymous: true });
                      setShowReportModal(true);
                    }} 
                    title="Report User"
                    style={{ color: '#ff4b4b' }}
                  >
                    <Flag size={20} />
                  </button>
                  <button
                      className="premium-btn primary" 
                      style={{ fontSize: '0.8rem', padding: '6px 12px', display: 'flex', alignItems: 'center' }}
                      onClick={handleSendAnonymousFriendRequest}
                      title="Send Friend Request (Costs 5 Coins)"
                    >
                      <UserPlus size={16} style={{ marginRight: '6px' }} /> Add Friend (5 <CoinSVG size={12} style={{marginLeft: '2px'}}/>)
                    </button>
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
                {anonymousPartnerTyping && (
                  <div className="msg-wrapper received">
                    <div className="msg-bubble" style={{ opacity: 0.7, padding: '8px 12px', fontSize: '0.85rem', color: '#a8a8a8', fontStyle: 'italic', background: 'rgba(255,255,255,0.05)' }}>
                      Stranger is typing...
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} style={{ height: '20px', flexShrink: 0 }} />
              </div>
              {isAnonymousChatActive ? (
                <form className="chat-input-area" onSubmit={handleSendAnonymousMessage}>
                  <div className="chat-input-wrapper">
                    <textarea
                      id="anonymous-chat-input"
                      autoComplete="off"
                      placeholder="Type a message..."
                      className="chat-text-input"
                      style={{ resize: 'none', minHeight: '44px', maxHeight: '120px', lineHeight: '24px', overflowY: 'auto' }}
                      rows={1}
                      onInput={(e) => {
                        e.target.style.height = 'auto';
                        e.target.style.height = `${e.target.scrollHeight}px`;
                        
                        const sendBtn = document.getElementById('anon-chat-send-btn');
                        if (e.target.value.trim()) {
                          if (sendBtn) sendBtn.style.display = 'block';
                        } else {
                          if (sendBtn) sendBtn.style.display = 'none';
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (e.target.value.trim()) {
                            handleSendAnonymousMessage(e, e.target.value);
                            e.target.value = '';
                            e.target.style.height = 'auto';
                            const sendBtn = document.getElementById('anon-chat-send-btn');
                            if (sendBtn) sendBtn.style.display = 'none';
                          }
                        }
                      }}
                      onChange={(e) => {
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
                    <button id="anon-chat-send-btn" type="button" className="chat-send-btn" style={{ display: 'none' }} onPointerDown={(e) => e.preventDefault()} onClick={(e) => { e.preventDefault(); const input = document.getElementById('anonymous-chat-input'); if(input.value.trim()){ handleSendAnonymousMessage(e, input.value); input.value = ''; input.style.height = 'auto'; e.currentTarget.style.display = 'none'; } }}><Send size={18} /></button>
                  </div>
                </form>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: '#a8a8a8', background: 'var(--bg-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                  <div>Chat has ended.</div>
                  {anonymousPartnerId && (
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
                      <div className="user-card" key={notif._id} style={{ 
                        border: '1px solid rgba(245, 158, 11, 0.3)', 
                        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(20, 20, 20, 0.8) 100%)', 
                        boxShadow: '0 4px 15px rgba(245, 158, 11, 0.1)',
                        backdropFilter: 'blur(10px)',
                        padding: '16px',
                        borderRadius: '12px',
                        marginBottom: '15px'
                      }}>
                        <div className="user-card-info" style={{ cursor: 'default', alignItems: 'flex-start', gap: '15px' }}>
                          <div className="user-avatar-small" style={{ 
                            background: 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: 'none',
                            width: '45px', height: '45px', borderRadius: '12px', flexShrink: 0
                          }}>
                             <img src="/icon-192.png" alt="Twelo" style={{ width: '40px', height: '40px', borderRadius: '10px' }} />
                          </div>
                          <div className="user-names">
                            <span className="user-username" style={{ 
                                color: '#fff', 
                                fontWeight: '800', 
                                letterSpacing: '1px',
                                textTransform: 'uppercase',
                                textShadow: '0 0 10px rgba(245, 158, 11, 0.5)'
                            }}>Twelo</span>
                            <span className="user-id" style={{ 
                                fontSize: '0.95rem', 
                                color: '#f8fafc', 
                                marginTop: '6px',
                                lineHeight: '1.5',
                                display: 'block',
                                wordBreak: 'break-word',
                                whiteSpace: 'pre-wrap'
                            }}>
                              {notif.message.length > 100 && !expandedAlerts.has(notif._id) 
                                ? notif.message.substring(0, 100) + '...' 
                                : notif.message}
                            </span>
                            {notif.message.length > 100 && (
                              <button 
                                onClick={() => {
                                  setExpandedAlerts(prev => {
                                    const next = new Set(prev);
                                    if (next.has(notif._id)) next.delete(notif._id);
                                    else next.add(notif._id);
                                    return next;
                                  });
                                }}
                                style={{ 
                                  background: 'none', border: 'none', color: 'var(--brand-blue)', 
                                  fontSize: '0.85rem', cursor: 'pointer', padding: 0, marginTop: '4px',
                                  fontWeight: 'bold'
                                }}
                              >
                                {expandedAlerts.has(notif._id) ? 'Show Less' : 'Read More'}
                              </button>
                            )}
                            <span style={{ fontSize: '0.75rem', color: 'rgba(245, 158, 11, 0.8)', marginTop: '8px', display: 'block', fontWeight: '500' }}>
                              {new Date(notif.createdAt).toLocaleString()}
                            </span>
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
                  
                  const textMap = {
                    request_accepted: 'accepted your follow request',
                    anonymous_request_accepted: 'Random room stranger has accepted your request',
                    follow_request: 'wants to follow you',
                    anonymous_follow_request: 'Random room stranger request',
                    follow_back_request: 'also wants to follow you',
                    started_following_you: 'started following you',
                    request_rejected: 'rejected your follow request'
                  };
                  const text = textMap[notif.type] || 'interacted with you';
                  
                  return (
                    <div 
                      className="user-card" 
                      key={notif._id}
                      onTouchStart={() => handleNotificationTouchStart(notif)}
                      onTouchEnd={handleNotificationTouchEnd}
                      onTouchMove={handleNotificationTouchEnd}
                      onMouseDown={() => handleNotificationTouchStart(notif)}
                      onMouseUp={handleNotificationTouchEnd}
                      onMouseLeave={handleNotificationTouchEnd}
                      onContextMenu={(e) => { e.preventDefault(); return false; }}
                      style={{ position: 'relative', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none', msUserSelect: 'none', MozUserSelect: 'none' }}
                    >
                      <div className="user-card-info" onClick={() => viewPublicProfile(reqUser._id)} style={{ cursor: 'pointer' }}>
                        <div className="user-avatar-small">{(notif.type === 'anonymous_follow_request' || notif.type === 'anonymous_request_accepted' ? null : reqUser.avatarUrl) ? <img src={reqUser.avatarUrl} alt='avatar' /> : reqUser.username.charAt(0).toUpperCase()}</div>
                        <div className="user-names">
                          <span className="user-username">@{reqUser.username?.length > 10 ? reqUser.username.substring(0, 10) + '...' : reqUser.username}</span>
                          <span className="user-id" style={{ fontSize: '0.8rem' }}>{text}</span>
                        </div>
                      </div>
                      {['request_accepted', 'anonymous_request_accepted'].includes(notif.type) ? (
                        <button className="chat-now-btn" style={{ background: 'var(--brand-blue)' }} onClick={() => startChatWithUser(reqUser)}>Chat</button>
                      ) : ['follow_request', 'anonymous_follow_request', 'follow_back_request'].includes(notif.type) ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="chat-now-btn accept-btn" style={{ flex: 1 }} onClick={() => acceptRequest(reqUser._id)}>Accept</button>
                          <button className="chat-now-btn" style={{ flex: 1, background: '#333' }} onClick={() => rejectRequest(reqUser._id)}>Reject</button>
                        </div>
                      ) : notif.type === 'started_following_you' ? (
                        isFollowingBack ? (
                          <button className="chat-now-btn" style={{ background: 'var(--brand-blue)' }} onClick={() => startChatWithUser(reqUser)}>Chat</button>
                        ) : hasSentFollowBack ? (
                          <button className="chat-now-btn" style={{ background: '#333', cursor: 'default' }} disabled>Request Sent</button>
                        ) : (
                          <button className="chat-now-btn" style={{ background: '#10b981' }} onClick={() => sendFollowRequest(reqUser._id)}>Follow Back</button>
                        )
                      ) : notif.type === 'request_rejected' ? (
                        <button className="chat-now-btn" style={{ background: '#333', cursor: 'default' }} disabled>Rejected</button>
                      ) : null}
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
            
            {isFetchingSearchHistory && !searchQuery && searchResults.length === 0 ? (
              <div className="chats-skeleton-loader" style={{ padding: '10px' }}>
                {[1, 2, 3].map(i => (
                  <div key={i} className="user-card" style={{ cursor: 'default', borderBottom: '1px solid #1a1a1a' }}>
                    <div className="user-card-info" style={{ width: '100%' }}>
                      <div className="skeleton-avatar shimmer"></div>
                      <div className="skeleton-details">
                        <div className="skeleton-name shimmer"></div>
                        <div className="skeleton-status shimmer" style={{ width: '30%' }}></div>
                      </div>
                    </div>
                  </div>
                ))}
                <div style={{ textAlign: 'center', marginTop: '15px', color: '#888', fontSize: '0.85rem' }}>Loading recent searches...</div>
              </div>
            ) : (
            <div className="search-results" onScroll={handleSearchResultsScroll}>
              {searchResults.map((searchUser) => {
                const isFollowing = profileStats?.following?.includes(searchUser._id);
                const hasRequested = searchUser.friendRequests?.includes(user.id);
                return (
                  <div 
                    className="user-card" 
                    key={searchUser._id}
                    onTouchStart={() => handleSearchHistoryTouchStart(searchUser)}
                    onTouchEnd={handleSearchHistoryTouchEnd}
                    onTouchMove={handleSearchHistoryTouchEnd}
                    onMouseDown={() => handleSearchHistoryTouchStart(searchUser)}
                    onMouseUp={handleSearchHistoryTouchEnd}
                    onMouseLeave={handleSearchHistoryTouchEnd}
                    onContextMenu={(e) => { e.preventDefault(); return false; }}
                    style={{ position: 'relative', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none', msUserSelect: 'none', MozUserSelect: 'none' }}
                  >
                    <div className="user-card-info" onClick={() => viewPublicProfile(searchUser._id)} style={{ cursor: 'pointer' }}>
                      <div className="user-avatar-small">
                        {searchUser.avatarUrl ? <img src={searchUser.avatarUrl} alt='avatar' /> : searchUser.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="user-names">
                        <span className="user-username">@{searchUser.username?.length > 10 ? searchUser.username.substring(0, 10) + '...' : searchUser.username}</span>
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
              
              {searchLoading && searchPage > 1 && (
                <div style={{ textAlign: 'center', padding: '15px', color: '#888', fontSize: '0.85rem' }}>Loading more...</div>
              )}
              
              {!searchLoading && searchQuery && searchResults.length === 0 && (
                <div style={{ textAlign: 'center', color: '#a8a8a8', marginTop: '20px' }}>No users found</div>
              )}
              {!searchLoading && !searchQuery && searchResults.length === 0 && (
                <div style={{ textAlign: 'center', color: '#a8a8a8', marginTop: '20px' }}>No recent searches.</div>
              )}
            </div>
            )}
          </div>
        );

      case 'connections': {
        const normalizedSearch = connectionsSearch.trim().toLowerCase();
        const visibleConnections = connectionsPage.users.filter(connection => {
          const username = (connection.username || '').toLowerCase();
          const name = (connection.name || '').toLowerCase();
          return !normalizedSearch || username.includes(normalizedSearch) || name.includes(normalizedSearch);
        });
        return (
          <div style={{ minHeight: '100%', width: '100%', boxSizing: 'border-box', padding: '20px', background: '#0b0b0d', color: '#f5f5f5' }}>
            <div style={{ maxWidth: '720px', margin: '0 auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '22px' }}>
                <button
                  aria-label="Back to profile"
                  onClick={() => setActiveTab(connectionsPage.returnTab)}
                  style={{ width: '42px', height: '42px', display: 'grid', placeItems: 'center', color: '#fff', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '50%', cursor: 'pointer' }}
                >
                  <ArrowLeft size={21} />
                </button>
                <div>
                  <h1 style={{ margin: 0, fontSize: '1.45rem', lineHeight: 1.2 }}>{connectionsPage.title}</h1>
                  <p style={{ margin: '4px 0 0', color: '#a8a8a8', fontSize: '0.9rem' }}>{connectionsPage.users.length} {connectionsPage.title.toLowerCase()}</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 14px', borderRadius: '14px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '18px' }}>
                <SearchIcon size={20} color="#a8a8a8" />
                <input
                  autoFocus
                  type="search"
                  value={connectionsSearch}
                  onChange={(event) => setConnectionsSearch(event.target.value)}
                  placeholder={`Search your ${connectionsPage.title.toLowerCase()}...`}
                  style={{ width: '100%', padding: '15px 0', outline: 'none', border: 'none', background: 'transparent', color: '#fff', fontSize: '1rem' }}
                />
                {connectionsSearch && <button onClick={() => setConnectionsSearch('')} aria-label="Clear search" style={{ color: '#a8a8a8', background: 'transparent', border: 'none', cursor: 'pointer', display: 'grid', placeItems: 'center' }}><X size={19} /></button>}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                {visibleConnections.map(connection => (
                  <button
                    key={connection._id}
                    onClick={() => viewPublicProfile(connection._id)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '13px', padding: '12px', textAlign: 'left', color: '#f5f5f5', background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '15px', cursor: 'pointer' }}
                  >
                    <div className="user-avatar-small" style={{ width: '48px', height: '48px', flexShrink: 0 }}>
                      {connection.avatarUrl ? <img src={connection.avatarUrl} alt="avatar" /> : (connection.username || '?').charAt(0).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: '650' }}>@{connection.username}</div>
                      {connection.name && <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '3px', color: '#a8a8a8', fontSize: '0.88rem' }}>{connection.name}</div>}
                    </div>
                  </button>
                ))}
              </div>
              {visibleConnections.length === 0 && (
                <div style={{ padding: '52px 20px', textAlign: 'center', color: '#a8a8a8' }}>
                  {connectionsSearch ? `No ${connectionsPage.title.toLowerCase()} match your search.` : `No ${connectionsPage.title.toLowerCase()} yet.`}
                </div>
              )}
            </div>
          </div>
        );
      }

      case 'publicProfile':
        if (!publicProfileData) return null;
        if (publicProfileData.isLoading) {
          return (
            <div className="profile-container">
              <div className="profile-card" style={{ padding: '30px 20px' }}>
                <div className="profile-avatar-large shimmer" style={{ background: '#333', border: 'none' }}></div>
                <div className="profile-info" style={{ marginTop: '20px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div className="shimmer" style={{ width: '150px', height: '24px', borderRadius: '4px', marginBottom: '10px' }}></div>
                  <div className="shimmer" style={{ width: '80px', height: '16px', borderRadius: '4px', marginBottom: '25px' }}></div>
                  
                  <div className="profile-stats" style={{ width: '100%', gap: '15px' }}>
                    <div className="stat-box shimmer" style={{ height: '70px', borderRadius: '12px', border: 'none' }}></div>
                    <div className="stat-box shimmer" style={{ height: '70px', borderRadius: '12px', border: 'none' }}></div>
                  </div>
                  
                  <div className="shimmer" style={{ width: '100%', height: '45px', borderRadius: '25px', marginTop: '25px' }}></div>
                  
                  <div style={{ marginTop: '20px', width: '100%' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '10px' }}>Global Stories</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                      <div className="shimmer" style={{ aspectRatio: '9/16', borderRadius: '10px', width: '100%' }}></div>
                      <div className="shimmer" style={{ aspectRatio: '9/16', borderRadius: '10px', width: '100%' }}></div>
                      <div className="shimmer" style={{ aspectRatio: '9/16', borderRadius: '10px', width: '100%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Earn Coins Section migrated to Profile */}
              <div className="earn-card" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: '15px', padding: '20px', marginTop: '20px', width: '100%' }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', color: '#FFD700' }}>Invite Friends & Earn</h3>
                <p style={{ margin: '0 0 15px 0', color: '#aaa', fontSize: '0.9rem' }}>Share your unique link. You earn 20 coins for every friend who signs up!</p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input type="text" readOnly value={`${window.location.origin}/login?ref=${user?.id}`} style={{ flex: 1, padding: '10px', background: 'rgba(0,0,0,0.5)', border: '1px solid #333', borderRadius: '8px', color: '#fff' }} />
                  <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/login?ref=${user?.id}`); alert('Link Copied!'); }} style={{ padding: '10px 20px', background: '#333', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>
                    Copy
                  </button>
                </div>
              </div>
              {Capacitor.isNativePlatform() && (
                <div className="earn-card" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: '15px', padding: '20px', marginTop: '20px', width: '100%' }}>
                  <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', color: '#FFD700' }}>Watch Video</h3>
                  <p style={{ margin: '0 0 15px 0', color: '#aaa', fontSize: '0.9rem' }}>Watch a short ad to earn free coins immediately!</p>
                  <button onClick={() => alert("Ad Mob integration goes here.")} style={{ padding: '10px 20px', background: 'linear-gradient(45deg, #FFD700, #FFA500)', border: 'none', borderRadius: '8px', color: '#000', cursor: 'pointer', fontWeight: 'bold', width: '100%' }}>
                    Watch Ad & Earn
                  </button>
                </div>
              )}
              
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
                    {getFlagEmoji(publicProfileData.country, publicProfileData.countryCode)}
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

                {publicProfileData.globalStories && publicProfileData.globalStories.length > 0 && (
                  <div style={{ marginTop: '20px', width: '100%' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '10px' }}>Global Stories</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                      {groupStoriesByDay(showAllGlobalStoriesPublic ? publicProfileData.globalStories : publicProfileData.globalStories).slice(0, showAllGlobalStoriesPublic ? 999 : 3).map((group, index, allGroups) => {
                        const firstStory = group.stories[0];
                        return (
                        <div key={group.date} style={{ aspectRatio: '9/16', borderRadius: '10px', overflow: 'hidden', background: '#333', cursor: 'pointer', position: 'relative' }} onClick={() => { 
                          const viewerGroups = allGroups.map(g => ({
                            user: { _id: publicProfileData._id, username: publicProfileData.username, avatarUrl: publicProfileData.avatarUrl },
                            stories: g.stories
                          }));
                          setProfileStoryGroups(viewerGroups); 
                          setCurrentStoryUserIndex(index); 
                          setCurrentStoryIndex(0); 
                          setStoryViewerActive(true); 
                        }}>
                          {firstStory.mediaType === 'video' ? (
                            <video src={firstStory.mediaUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                          ) : (
                            <img src={firstStory.mediaUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="global story" />
                          )}
                          <div style={{ position: 'absolute', bottom: '10px', left: '10px', right: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 5, background: 'rgba(0,0,0,0.5)', padding: '4px 8px', borderRadius: '6px' }}>
                            <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 'bold', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>{group.date}</span>
                            <span style={{ color: '#fff', fontSize: '0.75rem', flexShrink: 0 }}>{group.stories.length}</span>
                          </div>
                        </div>
                      )})}
                    </div>
                    {groupStoriesByDay(publicProfileData.globalStories).length > 3 && (
                      <button 
                        onClick={() => {
                          setUserGlobalStoriesUserId(publicProfileData._id);
                          setUserGlobalStoriesUserInfo({ username: publicProfileData.username, avatarUrl: publicProfileData.avatarUrl });
                          setUserGlobalStories([]);
                          fetchUserGlobalStories(publicProfileData._id, 1, false);
                          setActiveTab('user-global-stories');
                        }}
                        style={{ marginTop: '10px', background: 'transparent', border: '1px solid #333', borderRadius: '8px', color: 'var(--brand-blue)', cursor: 'pointer', width: '100%', textAlign: 'center', padding: '10px', fontSize: '0.9rem' }}
                      >
                        See More
                      </button>
                    )}
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
              <div className="chat-list-header" style={{
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                position: 'sticky',
                top: 0,
                zIndex: 20,
                background: '#121212',
                backdropFilter: 'blur(10px)'
              }}>
                <h2 style={{ 
                  margin: 0, 
                  fontSize: '1.5rem', 
                  fontWeight: '800', 
                  color: '#ffffff',
                  letterSpacing: '0.2px',
                  textShadow: 'none',
                  WebkitTextStroke: '0px'
                }}>Chats</h2>
                <div style={{ display: 'flex', gap: '15px' }}>
                  <SearchIcon size={20} color="#a8a8a8" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('search')} />
                  <Edit size={20} color="#a8a8a8" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('search')} />
                </div>
              </div>
              
              <div className="story-bar-container" style={{
                display: 'flex', gap: '15px', padding: '15px', 
                overflowX: 'auto', borderBottom: '1px solid #1a1a1a', 
                scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch'
              }}>
                <style>{`.story-bar-container::-webkit-scrollbar { display: none; }`}</style>
                <input type="file" accept="image/*,video/*" style={{ display: 'none' }} ref={storyFileInputRef} onChange={handleStorySelect} />
                
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', cursor: 'pointer', flexShrink: 0 }} onClick={openStoryCamera}>
                  <div style={{ position: 'relative' }}>
                    <div className="user-avatar-small" style={{ width: '56px', height: '56px', border: '2px solid #333' }}>
                      {storyUploading ? <Loader2 className="rotating" size={24} color="#fff" /> : (user.avatarUrl ? <img src={user.avatarUrl} alt='me' /> : user.username.charAt(0).toUpperCase())}
                    </div>
                    <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', background: 'var(--brand-blue)', borderRadius: '50%', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <PlusCircle size={14} color="#fff" />
                    </div>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#a8a8a8' }}>{storyUploading ? 'Posting...' : 'Your Story'}</span>
                </div>
                
                {groupedStories.map((group, idx) => {
                  const myId = user?._id || user?.id;
                  const unseenStories = group.stories.filter(s => !s.viewedBy || !s.viewedBy.some(v => (v._id || v) === myId));
                  const hasUnseen = unseenStories.length > 0;
                  const isCloseFriend = hasUnseen ? unseenStories.some(s => s.visibility === 'custom') : group.stories.some(s => s.visibility === 'custom');
                  
                  let ringBackground = '#444'; // grey for seen
                  if (hasUnseen) {
                    if (isCloseFriend) {
                      ringBackground = '#1cf23b'; // green for close friends
                    } else {
                      ringBackground = 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)';
                    }
                  }

                  return (
                  <div key={group.user._id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', cursor: 'pointer', flexShrink: 0 }} onClick={() => {
                    let firstUnseenIdx = group.stories.findIndex(s => !s.viewedBy || !s.viewedBy.some(v => (v._id || v) === myId));
                    if (firstUnseenIdx === -1) firstUnseenIdx = 0;
                    setProfileStoryGroups(null);
                    setCurrentStoryUserIndex(idx);
                    setCurrentStoryIndex(firstUnseenIdx);
                    setStoryProgress(0);
                    setStoryViewerActive(true);
                  }}>
                    <div className="user-avatar-small" style={{ 
                      width: '56px', height: '56px', 
                      background: ringBackground,
                      padding: '2px', // gap for border
                      borderRadius: '50%'
                    }}>
                      <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', border: '2px solid #000' }}>
                        {group.user.avatarUrl ? <img src={group.user.avatarUrl} alt='avatar' style={{width: '100%', height: '100%', objectFit: 'cover'}}/> : <div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#333'}}>{group.user.username.charAt(0).toUpperCase()}</div>}
                      </div>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#fff' }}>{group.user.username.length > 8 ? group.user.username.substring(0, 8) + '...' : group.user.username}</span>
                  </div>
                )})}
              </div>

              <div className="chat-users-scroll">
                {recentChats.map((chatUser) => {
                  const isOnline = onlineUsers.includes(chatUser._id);
                  const unreadCount = unreadMessages[chatUser._id] || 0;
                  
                  // Check if this chat user has a story
                  const chatUserStoryGroupIndex = groupedStories.findIndex(g => g.user._id === chatUser._id);
                  const chatUserStoryGroup = chatUserStoryGroupIndex !== -1 ? groupedStories[chatUserStoryGroupIndex] : null;
                  let ringBackground = 'transparent';
                  let hasRing = false;
                  if (chatUserStoryGroup) {
                    const myId = user?._id || user?.id;
                    const unseenStories = chatUserStoryGroup.stories.filter(s => !s.viewedBy || !s.viewedBy.some(v => (v._id || v) === myId));
                    const hasUnseen = unseenStories.length > 0;
                    const isCloseFriend = hasUnseen ? unseenStories.some(s => s.visibility === 'custom') : chatUserStoryGroup.stories.some(s => s.visibility === 'custom');
                    
                    hasRing = true;
                    if (hasUnseen) {
                      ringBackground = isCloseFriend ? '#1cf23b' : 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)';
                    } else {
                      ringBackground = '#444';
                    }
                  }

                  return (
                    <div 
                      key={chatUser._id} 
                      className={`chat-user-item ${activeChatUser?._id === chatUser._id ? 'active' : ''}`}
                      onClick={() => startChatWithUser(chatUser)}
                    >
                      <div 
                        className="user-avatar-small" 
                        style={{ background: ringBackground, padding: hasRing ? '2px' : '0', borderRadius: '50%', cursor: chatUserStoryGroup ? 'pointer' : 'default', WebkitTapHighlightColor: 'transparent' }}
                        onClick={(e) => {
                          if (chatUserStoryGroup) {
                            e.stopPropagation();
                            const myId = user?._id || user?.id;
                            let firstUnseenIdx = chatUserStoryGroup.stories.findIndex(s => !s.viewedBy || !s.viewedBy.some(v => (v._id || v) === myId));
                            if (firstUnseenIdx === -1) firstUnseenIdx = 0;
                            setProfileStoryGroups(null);
                            setCurrentStoryUserIndex(chatUserStoryGroupIndex);
                            setCurrentStoryIndex(firstUnseenIdx);
                            setStoryProgress(0);
                            setStoryViewerActive(true);
                          }
                        }}
                      >
                        <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', border: hasRing ? '2px solid #000' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#333' }}>
                          {chatUser.avatarUrl ? <img src={chatUser.avatarUrl} alt='avatar' style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : chatUser.username.charAt(0).toUpperCase()}
                        </div>
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
                {isFetchingChats && recentChats.length === 0 ? (
                  <div className="chats-skeleton-loader" style={{ padding: '10px' }}>
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="chat-list-item" style={{ cursor: 'default', borderBottom: '1px solid #333' }}>
                        <div className="skeleton-avatar shimmer"></div>
                        <div className="skeleton-details">
                          <div className="skeleton-name shimmer"></div>
                          <div className="skeleton-status shimmer"></div>
                        </div>
                      </div>
                    ))}
                    <div style={{ textAlign: 'center', marginTop: '15px', color: '#888', fontSize: '0.85rem' }}>Loading chats...</div>
                  </div>
                ) : chatsError ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#ff4444', fontSize: '0.9rem' }}>
                    {chatsError}
                  </div>
                ) : (
                  recentChats.length === 0 && (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#a8a8a8', fontSize: '0.9rem' }}>
                      No recent chats. Search and follow users to start chatting!
                    </div>
                  )
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
                      <div 
                        className="user-avatar-small" 
                        onClick={() => {
                          const chatUserStoryGroupIndex = groupedStories.findIndex(g => g.user._id === activeChatUser._id);
                          const chatUserStoryGroup = chatUserStoryGroupIndex !== -1 ? groupedStories[chatUserStoryGroupIndex] : null;
                          if (chatUserStoryGroup) {
                            const myId = user?._id || user?.id;
                            let firstUnseenIdx = chatUserStoryGroup.stories.findIndex(s => !s.viewedBy || !s.viewedBy.some(v => (v._id || v) === myId));
                            if (firstUnseenIdx === -1) firstUnseenIdx = 0;
                            setProfileStoryGroups(null);
                            setCurrentStoryUserIndex(chatUserStoryGroupIndex);
                            setCurrentStoryIndex(firstUnseenIdx);
                            setStoryProgress(0);
                            setStoryViewerActive(true);
                          } else {
                            viewPublicProfile(activeChatUser._id);
                          }
                        }}
                        style={(() => {
                          const chatUserStoryGroupIndex = groupedStories.findIndex(g => g.user._id === activeChatUser._id);
                          const chatUserStoryGroup = chatUserStoryGroupIndex !== -1 ? groupedStories[chatUserStoryGroupIndex] : null;
                          let ringBackground = 'transparent';
                          let hasRing = false;
                          if (chatUserStoryGroup) {
                            const myId = user?._id || user?.id;
                            const unseenStories = chatUserStoryGroup.stories.filter(s => !s.viewedBy || !s.viewedBy.some(v => (v._id || v) === myId));
                            const hasUnseen = unseenStories.length > 0;
                            const isCloseFriend = hasUnseen ? unseenStories.some(s => s.visibility === 'custom') : chatUserStoryGroup.stories.some(s => s.visibility === 'custom');
                            hasRing = true;
                            if (hasUnseen) {
                              ringBackground = isCloseFriend ? '#1cf23b' : 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)';
                            } else {
                              ringBackground = '#444';
                            }
                          }
                          return { background: ringBackground, padding: hasRing ? '2px' : '0', borderRadius: '50%', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' };
                        })()}
                      >
                        <div style={{ 
                          width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', 
                          border: (() => {
                            const chatUserStoryGroupIndex = groupedStories.findIndex(g => g.user._id === activeChatUser._id);
                            const hasRing = chatUserStoryGroupIndex !== -1;
                            return hasRing ? '2px solid #000' : 'none';
                          })(),
                          display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#333'
                        }}>
                          {activeChatUser.avatarUrl ? <img src={activeChatUser.avatarUrl} alt='avatar' style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : activeChatUser.username.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div className="user-names" onClick={() => viewPublicProfile(activeChatUser._id)} style={{ cursor: 'pointer' }}>
                        <span className="user-username">@{activeChatUser.username}</span>
                        <span style={{ fontSize: '0.75rem', color: onlineUsers.includes(activeChatUser._id) ? '#2bd856' : '#a8a8a8' }}>
                          {onlineUsers.includes(activeChatUser._id) ? 'Active now' : 'offline'}
                        </span>
                      </div>
                    </div>
                    <div className="chat-actions" style={{ position: 'relative' }}>
                      <button className="action-icon-btn call-audio" onClick={() => callUser(String(activeChatUser._id), activeChatUser.username, false)}><Phone size={22} /></button>
                      <button className="action-icon-btn call-video" onClick={() => callUser(String(activeChatUser._id), activeChatUser.username, true)}><Video size={22} /></button>
                      <button className="action-icon-btn" onClick={() => setShowChatSettingsMenu(!showChatSettingsMenu)}><MoreVertical size={22} /></button>
                      
                      {showChatSettingsMenu && (
                        <>
                          <div 
                            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }} 
                            onClick={() => setShowChatSettingsMenu(false)}
                          />
                          <div style={{
                            position: 'absolute',
                            top: '45px',
                            right: '0',
                            background: '#1a1a1a',
                            border: '1px solid #333',
                            borderRadius: '12px',
                            padding: '8px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '5px',
                            zIndex: 100,
                            minWidth: '200px',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                          }}>
                            <button 
                              onClick={() => {
                                setShowChatSettingsMenu(false);
                                handleDeleteChat();
                              }}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '10px',
                                background: 'transparent', border: 'none', color: '#ff4b4b',
                                padding: '10px', cursor: 'pointer', borderRadius: '8px',
                                fontSize: '0.9rem', fontWeight: 'bold', textAlign: 'left',
                                width: '100%'
                              }}
                              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 75, 75, 0.1)'}
                              onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                              <Trash2 size={18} /> Delete all chats
                            </button>
                            <button 
                              onClick={() => {
                                setShowChatSettingsMenu(false);
                                setReportTarget({ id: activeChatUser._id, username: activeChatUser.username, isAnonymous: false });
                                setShowReportModal(true);
                              }}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '10px',
                                background: 'transparent', border: 'none', color: '#ff4b4b',
                                padding: '10px', cursor: 'pointer', borderRadius: '8px',
                                fontSize: '0.9rem', fontWeight: 'bold', textAlign: 'left',
                                width: '100%'
                              }}
                              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 75, 75, 0.1)'}
                              onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                              <Flag size={18} /> Report user
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="chat-messages-area" onScroll={handleChatScroll}>
                    {isFetchingMessages && messages.length === 0 ? (
                      <div className="messages-skeleton-loader" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', boxSizing: 'border-box' }}>
                        <div className="msg-wrapper received" style={{ display: 'flex', justifyContent: 'flex-start' }}><div className="msg-bubble shimmer" style={{ width: '60%', height: '45px', borderRadius: '20px' }}></div></div>
                        <div className="msg-wrapper sent" style={{ display: 'flex', justifyContent: 'flex-end' }}><div className="msg-bubble shimmer" style={{ width: '40%', height: '45px', borderRadius: '20px' }}></div></div>
                        <div className="msg-wrapper received" style={{ display: 'flex', justifyContent: 'flex-start' }}><div className="msg-bubble shimmer" style={{ width: '75%', height: '60px', borderRadius: '20px' }}></div></div>
                        <div className="msg-wrapper sent" style={{ display: 'flex', justifyContent: 'flex-end' }}><div className="msg-bubble shimmer" style={{ width: '50%', height: '45px', borderRadius: '20px' }}></div></div>
                      </div>
                    ) : (
                      <>
                        {isFetchingMessages && messages.length > 0 && (
                          <div style={{ textAlign: 'center', padding: '10px', color: '#888', fontSize: '0.85rem' }}>Loading older messages...</div>
                        )}
                        {messages.map((msg, index) => (
                      <div key={msg._id} className={`msg-wrapper ${msg.sender === user.id ? 'sent' : 'received'}`} 
                        onTouchStart={(e) => handleTouchStart(e, msg)}
                        onTouchMove={(e) => handleTouchMove(e, msg, msg.sender === user.id)}
                        onTouchEnd={(e) => handleTouchEnd(e, msg, msg.sender === user.id)}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: msg.sender === user.id ? 'flex-end' : 'flex-start', width: '100%' }}>
                          <div 
                            id={`msg-bubble-${msg._id}`} 
                          className="msg-bubble"
                          onClick={() => setSelectedMsgId(prev => prev === msg._id ? null : msg._id)}
                        >
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

                          {msg.messageType === 'image' && msg.fileUrl && (
                            <div className="msg-image-container" style={{ marginTop: '5px', marginBottom: '5px' }}>
                              {msg.isViewOnce ? (
                                msg.isViewed ? (
                                  <div style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', color: '#a8a8a8' }}>
                                    <ImageIcon size={18} /> Opened
                                  </div>
                                ) : (
                                  <button onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    if (String(msg.sender) !== String(user._id || user.id)) {
                                      socket.emit('mark_viewed', { messageId: msg._id, receiverId: user.id || user._id, senderId: msg.sender });
                                      setMessages(prev => prev.map(m => m._id === msg._id ? { ...m, isViewed: true } : m));
                                    } else {
                                      // Sender can view their own view-once image as many times as they want
                                      // It will be locked when the receiver opens it and triggers a message_viewed socket event
                                    }
                                    setFullScreenMedia({ url: msg.fileUrl.startsWith('http') ? msg.fileUrl : `${API_URL}${msg.fileUrl}`, isViewOnce: true });
                                  }} style={{ padding: '10px 20px', background: 'var(--brand-blue)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', border: 'none', cursor: 'pointer' }}>
                                    <ImageIcon size={18} /> View Photo
                                  </button>
                                )
                              ) : (
                                <img 
                                  src={msg.fileUrl.startsWith('http') ? msg.fileUrl : `${API_URL}${msg.fileUrl}`} 
                                  alt="Sent Photo" 
                                  style={{ maxWidth: '100%', borderRadius: '10px', cursor: 'pointer' }} 
                                  onClick={() => setFullScreenMedia({ url: msg.fileUrl.startsWith('http') ? msg.fileUrl : `${API_URL}${msg.fileUrl}`, isViewOnce: false })}
                                />
                              )}
                            </div>
                          )}

                          {msg.messageType === 'audio' && (
                            <div className="msg-audio-container" style={{ marginTop: '5px', marginBottom: '5px' }}>
                              <audio controls src={msg.fileUrl.startsWith('http') ? msg.fileUrl : `${API_URL}${msg.fileUrl}`} style={{ width: '200px', height: '40px' }} />
                            </div>
                          )}
                          
                          <p className="msg-text" style={msg.isDeletedForEveryone ? { fontStyle: 'italic', color: 'rgba(255,255,255,0.6)' } : {}}>
                            {msg.isDeletedForEveryone 
                              ? (msg.sender === user.id ? '🚫 You deleted this message' : '🚫 This message was deleted') 
                              : (() => {
                              if (msg.message && msg.message.startsWith('Check out this story: ')) {
                                const parts = msg.message.split('|:::|');
                                const linkPart = parts[0];
                                const storyId = linkPart.split('/stories/')[1];
                                const storyOwnerUsername = parts[1] || 'Unknown';
                                const storyOwnerAvatar = parts[2] || '';
                                const storyOwnerGender = parts[3] || 'male';
                                
                                return (
                                  <div 
                                    onClick={() => {
                                      if (storyId) openSharedStory(storyId);
                                    }}
                                    style={{ 
                                      display: 'flex', alignItems: 'center', gap: '10px', 
                                      background: 'rgba(255,255,255,0.1)', padding: '10px', 
                                      borderRadius: '10px', cursor: 'pointer', marginTop: '5px',
                                      width: '240px', maxWidth: '100%'
                                    }}
                                  >
                                    <div style={{ position: 'relative', flexShrink: 0 }}>
                                      {storyOwnerAvatar ? (
                                        <img 
                                          src={storyOwnerAvatar.startsWith('http') ? storyOwnerAvatar : `${API_URL}${storyOwnerAvatar}`}
                                          alt="avatar"
                                          style={{ width: '45px', height: '45px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #0095f6' }}
                                        />
                                      ) : (
                                        <div style={{ width: '45px', height: '45px', borderRadius: '50%', border: '2px solid #0095f6', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#333', fontSize: '1.2rem', fontWeight: 'bold' }}>
                                          {storyOwnerUsername.charAt(0).toUpperCase()}
                                        </div>
                                      )}
                                      <div style={{ position: 'absolute', bottom: -2, right: -2, background: '#0095f6', borderRadius: '50%', padding: '4px', border: '2px solid #111' }}>
                                        <Play size={10} color="#fff" fill="#fff" />
                                      </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                      <span style={{ fontWeight: 'bold', fontSize: '0.95rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{storyOwnerUsername}'s Story</span>
                                      <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>Click to view story</span>
                                    </div>
                                  </div>
                                );
                              }
                              return msg.message;
                            })()}
                          </p>
                          {selectedMsgId === msg._id && (
                            <div className="msg-time" style={{ display: 'flex', alignItems: 'center', justifyContent: msg.sender === user.id ? 'flex-end' : 'flex-start', gap: '4px' }}>
                              <span>{formatTime(msg.createdAt)}</span>
                              {msg.sender === user.id && (
                                <span style={{ fontSize: '0.65rem', opacity: 0.8, fontWeight: 'bold' }}>
                                  {msg.isViewed ? `✓ ${formatSeenTime(msg.viewedAt)}` : '✓ Sent'}
                                </span>
                              )}
                            </div>
                          )}
                          </div>
                          {msg.sender === user.id && index === messages.length - 1 && (
                            <div style={{ fontSize: '0.7rem', color: '#a8a8a8', marginTop: '4px', textAlign: 'right', paddingRight: '12px' }}>
                              {msg.isViewed ? 'Seen just now' : 'Sent'}
                            </div>
                          )}
                        </div>
                        {swipeMsgId === msg._id && (
                          <div className={`swipe-reply-icon ${msg.sender === user.id ? 'sent-icon' : 'received-icon'}`}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7"></polyline><path d="M20 18v-2a4 4 0 0 0-4-4H4"></path></svg>
                          </div>
                        )}
                        
                        {/* Context Menu for Delete */}
                        {contextMenu.visible && contextMenu.msgId === msg._id && (
                          <div className={`msg-context-menu ${msg.sender === user.id ? 'sent-menu' : 'received-menu'}`}>
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
                    </>
                    )}
                    <div ref={messagesEndRef} style={{ height: '20px', flexShrink: 0 }} />
                  </div>

                  <form className="chat-input-area" onSubmit={handleSendMessage}>
                    {replyingTo && (
                      <div className="replying-to-banner">
                        <div className="reply-content">
                          <div className="reply-sender">{replyingTo.sender === user.id ? 'You' : activeChatUser.username}</div>
                          <div className="reply-text">{replyingTo.message || (replyingTo.messageType === 'image' ? '📷 Photo' : '🎤 Voice Note')}</div>
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
                          <button type="button" className="media-btn" onClick={() => window.alert('Our developers are currently working on these features. Once the bugs are fixed, they will be enabled again.')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', position: 'absolute', left: '10px', zIndex: 10 }}>
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
                            rows={1}
                            onInput={(e) => {
                              e.target.style.height = 'auto';
                              e.target.style.height = `${e.target.scrollHeight}px`;
                              
                              const sendBtn = document.getElementById('main-chat-send-btn');
                              const mediaActions = document.getElementById('main-chat-media-actions');
                              if (e.target.value.trim()) {
                                if (sendBtn) sendBtn.style.display = 'block';
                                if (mediaActions) mediaActions.style.display = 'none';
                              } else {
                                if (sendBtn) sendBtn.style.display = 'none';
                                if (mediaActions) mediaActions.style.display = 'flex';
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                if (e.target.value.trim()) {
                                  handleSendMessage(e, e.target.value);
                                  e.target.value = '';
                                  e.target.style.height = 'auto';
                                  
                                  const sendBtn = document.getElementById('main-chat-send-btn');
                                  const mediaActions = document.getElementById('main-chat-media-actions');
                                  if (sendBtn) sendBtn.style.display = 'none';
                                  if (mediaActions) mediaActions.style.display = 'flex';
                                }
                              }
                            }}
                            onChange={(e) => {
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

                      {!isRecording && (
                        <div id="main-chat-media-actions" className="media-actions" style={{ display: 'flex', gap: '10px', paddingRight: '10px', alignItems: 'center' }}>
                          <button type="button" className="media-btn" onClick={() => {
                            window.alert('Our developers are currently working on these features. Once the bugs are fixed, they will be enabled again.');
                          }} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
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

                      {!isRecording && (
                        <button id="main-chat-send-btn" type="submit" className="chat-send-btn" disabled={isUploading} onPointerDown={(e) => e.preventDefault()} onClick={(e) => { e.preventDefault(); const input = document.getElementById('chat-input'); if(input.value.trim()){ handleSendMessage(e, input.value); input.value = ''; input.style.height = 'auto'; e.currentTarget.style.display = 'none'; const mediaActions = document.getElementById('main-chat-media-actions'); if (mediaActions) mediaActions.style.display = 'flex'; } }} style={{ display: 'none' }}>
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
        if (!profileStats) {
          return (
            <div className="profile-container">
              <div className="profile-card" style={{ padding: '30px 20px' }}>
                <div className="profile-avatar-large shimmer" style={{ background: '#333', border: 'none' }}></div>
                <div className="profile-info" style={{ marginTop: '20px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div className="shimmer" style={{ width: '150px', height: '24px', borderRadius: '4px', marginBottom: '10px' }}></div>
                  <div className="shimmer" style={{ width: '80px', height: '16px', borderRadius: '4px', marginBottom: '25px' }}></div>
                  
                  <div className="profile-stats" style={{ width: '100%', gap: '15px' }}>
                    <div className="stat-box shimmer" style={{ height: '70px', borderRadius: '12px', border: 'none' }}></div>
                    <div className="stat-box shimmer" style={{ height: '70px', borderRadius: '12px', border: 'none' }}></div>
                  </div>
                  
                  <div className="shimmer" style={{ width: '100%', height: '45px', borderRadius: '25px', marginTop: '25px' }}></div>

                  <div style={{ marginTop: '20px', width: '100%' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '10px' }}>Global Stories</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                      <div className="shimmer" style={{ aspectRatio: '9/16', borderRadius: '10px', width: '100%' }}></div>
                      <div className="shimmer" style={{ aspectRatio: '9/16', borderRadius: '10px', width: '100%' }}></div>
                      <div className="shimmer" style={{ aspectRatio: '9/16', borderRadius: '10px', width: '100%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        }
        return (
          <div className="profile-container" style={{ position: 'relative' }}>
            <div className="profile-card">
              <div className="profile-header-actions" style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10 }}>
                <button className="icon-btn settings-btn" onClick={() => { setEditUsernameMode(false); setShowSettingsModal(true); }}>
                  <Menu size={24} />
                </button>
              </div>
              <div className="profile-avatar-large">
                <div className="profile-avatar-inner">
                  {(profileStats?.avatarUrl || user.avatarUrl) ? <img src={profileStats?.avatarUrl || user.avatarUrl} alt='avatar' /> : user.username.charAt(0).toUpperCase()}
                </div>
                {(profileStats?.country || user.country) && (
                  <div style={{ position: 'absolute', bottom: '0', right: '-10px', fontSize: '1.5rem', background: '#222', borderRadius: '50%', padding: '4px', border: '2px solid #000' }}>
                    {getFlagEmoji(profileStats?.country || user.country, profileStats?.countryCode || user.countryCode)}
                  </div>
                )}
              </div>
              
              <div className="profile-info">
                <span className="profile-username">@{user.username}</span>
                
                <div className="profile-stats">
                  <span onClick={() => handleConnectionsClick('followers', user.id)} style={{ cursor: 'pointer' }}>
                    <strong>{profileStats?.followers?.length || 0}</strong> followers
                  </span>
                  <span onClick={() => handleConnectionsClick('following', user.id)} style={{ cursor: 'pointer' }}>
                    <strong>{profileStats?.following?.length || 0}</strong> following
                  </span>
                </div>

                {(profileStats?.age || user.age) && (profileStats?.gender || user.gender) && (
                  <div className="profile-demographics">
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

                <div style={{ width: '100%', marginTop: '20px' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '12px', textAlign: 'center' }}>{user.name}</h3>
                  <div className="profile-id-strip" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.04)', padding: '10px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '0.85rem', color: '#a8a8a8' }}>ID:</span>
                      <span style={{ fontFamily: 'monospace', fontSize: '1rem', color: 'var(--brand-blue)', letterSpacing: '0.5px' }}>{user.uniqueId}</span>
                    </div>
                    <button 
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
                      <Share2 size={18} />
                    </button>
                  </div>
                </div>

                {profileStats?.globalStories && profileStats.globalStories.length > 0 && (
                  <div style={{ marginTop: '20px', width: '100%' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '10px' }}>Global Stories</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                      {groupStoriesByDay(showAllGlobalStoriesMy ? profileStats.globalStories : profileStats.globalStories).slice(0, showAllGlobalStoriesMy ? 999 : 3).map((group, index, allGroups) => {
                        const firstStory = group.stories[0];
                        return (
                        <div key={group.date} style={{ aspectRatio: '9/16', borderRadius: '10px', overflow: 'hidden', background: '#333', cursor: 'pointer', position: 'relative' }} onClick={() => { 
                          const viewerGroups = allGroups.map(g => ({
                            user: { _id: user.id || user._id, username: user.username, avatarUrl: profileStats?.avatarUrl || user.avatarUrl },
                            stories: g.stories
                          }));
                          setProfileStoryGroups(viewerGroups); 
                          setCurrentStoryUserIndex(index); 
                          setCurrentStoryIndex(0); 
                          setStoryViewerActive(true); 
                        }}>
                          {firstStory.mediaType === 'video' ? (
                            <video src={firstStory.mediaUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                          ) : (
                            <img src={firstStory.mediaUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="global story" />
                          )}
                          <div style={{ position: 'absolute', bottom: '10px', left: '10px', right: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 5, background: 'rgba(0,0,0,0.5)', padding: '4px 8px', borderRadius: '6px' }}>
                            <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 'bold', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>{group.date}</span>
                            <span style={{ color: '#fff', fontSize: '0.75rem', flexShrink: 0 }}>{group.stories.length}</span>
                          </div>
                        </div>
                      )})}
                    </div>
                    {groupStoriesByDay(profileStats.globalStories).length > 3 && (
                      <button 
                        onClick={() => {
                          setUserGlobalStoriesUserId(user.id || user._id);
                          setUserGlobalStoriesUserInfo({ username: user.username, avatarUrl: profileStats?.avatarUrl || user.avatarUrl });
                          setUserGlobalStories([]);
                          fetchUserGlobalStories(user.id || user._id, 1, false);
                          setActiveTab('user-global-stories');
                        }}
                        style={{ marginTop: '10px', background: 'transparent', border: '1px solid #333', borderRadius: '8px', color: 'var(--brand-blue)', cursor: 'pointer', width: '100%', textAlign: 'center', padding: '10px', fontSize: '0.9rem' }}
                      >
                        See More
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case 'user-global-stories':
        return (
          <div className="search-container">
            <div className="search-header" style={{ padding: '20px', borderBottom: '1px solid #333', display: 'flex', alignItems: 'center', gap: '15px' }}>
              <button 
                onClick={() => setActiveTab(userGlobalStoriesUserId === (user.id || user._id) ? 'profile' : 'publicProfile')}
                style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <ChevronLeft size={24} />
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', background: '#333' }}>
                  {userGlobalStoriesUserInfo?.avatarUrl ? (
                    <img src={userGlobalStoriesUserInfo.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                      {userGlobalStoriesUserInfo?.username?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Global Stories</div>
                  <div style={{ fontSize: '0.8rem', color: '#aaa' }}>@{userGlobalStoriesUserInfo?.username}</div>
                </div>
              </div>
            </div>
            
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {groupStoriesByDay(userGlobalStories).map((group, index, allGroups) => {
                  const firstStory = group.stories[0];
                  return (
                  <div 
                    key={group.date}
                    onClick={() => {
                      const viewerGroups = allGroups.map(g => ({
                        user: { _id: userGlobalStoriesUserId, username: userGlobalStoriesUserInfo?.username, avatarUrl: userGlobalStoriesUserInfo?.avatarUrl },
                        stories: g.stories
                      }));
                      setProfileStoryGroups(viewerGroups);
                      setCurrentStoryUserIndex(index);
                      setCurrentStoryIndex(0);
                      setStoryViewerActive(true);
                      window.history.pushState({ overlayOpen: true }, '');
                    }}
                    style={{ aspectRatio: '9/16', borderRadius: '10px', overflow: 'hidden', cursor: 'pointer', background: '#222', position: 'relative' }}
                  >
                    {firstStory.mediaType === 'video' ? (
                      <video src={firstStory.mediaUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                    ) : (
                      <img src={firstStory.mediaUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="global story" />
                    )}
                    <div style={{ position: 'absolute', bottom: '10px', left: '10px', right: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 5, background: 'rgba(0,0,0,0.5)', padding: '4px 8px', borderRadius: '6px' }}>
                      <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 'bold', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>{group.date}</span>
                      <span style={{ color: '#fff', fontSize: '0.75rem', flexShrink: 0 }}>{group.stories.length}</span>
                    </div>
                  </div>
                )})}
                
                {userGlobalStoriesLoading && [...Array(userGlobalStories.length === 0 ? 12 : 3)].map((_, i) => (
                  <div key={`skel-${i}`} style={{ 
                    aspectRatio: '9/16', 
                    borderRadius: '10px', 
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 100%)', 
                    backgroundSize: '200% 200%',
                    animation: 'shimmer 2s infinite linear',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <ImageIcon size={28} color="rgba(255,255,255,0.15)" />
                  </div>
                ))}
              </div>
              
              {hasMoreUserGlobalStories && !userGlobalStoriesLoading && (
                <div ref={loadMoreUserGlobalStoriesRef} style={{ height: '50px' }}></div>
              )}
              
              {!hasMoreUserGlobalStories && userGlobalStories.length > 0 && (
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#666', fontSize: '0.9rem' }}>
                  No more stories
                </div>
              )}
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  const totalUnreadUsers = Object.values(unreadMessages).filter(count => count > 0).length;
  const viewerStories = profileStoryGroups ? profileStoryGroups : (activeTab === 'everyone-stories' ? everyoneStories : groupedStories);

  
  
  const updateCommentCount = (delta) => {
    const updatedViewerStories = [...viewerStories];
    if (updatedViewerStories[currentStoryUserIndex]?.stories[currentStoryIndex]) {
        let count = updatedViewerStories[currentStoryUserIndex].stories[currentStoryIndex].comment_count || 0;
        updatedViewerStories[currentStoryUserIndex].stories[currentStoryIndex].comment_count = Math.max(0, count + delta);
        
        if (profileStoryGroups) {
           setProfileStoryGroups([...updatedViewerStories]);
        } else if (activeTab === 'everyone-stories') {
           seteveryoneStories([...updatedViewerStories]);
        }
    }
  };


  return (
    <div className="dashboard-container">
      <input
        type="file"
        accept="image/*"
        ref={avatarFileInputRef}
        style={{ display: 'none' }}
        onChange={handleAvatarSelect}
      />
      {/* Coin Deduction Popup */}
      {coinPopup.show && (
        <div className="coin-deduction-popup">
          <span className="coin-icon">🪙</span>
          -{coinPopup.amount} Coins (Filter Applied)
        </div>
      )}

      {/* Night Sky Background - only visible on home tab */}
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        background: 'linear-gradient(180deg, #0a0e27 0%, #141852 25%, #2a1b5e 50%, #4a2060 70%, #8b3a62 85%, #d4748a 95%, #f0a0b0 100%)',
        opacity: activeTab === 'home' ? 1 : 0,
        zIndex: activeTab === 'home' ? -1 : -1000,
        transition: 'opacity 0.4s ease-in-out',
        overflow: 'hidden'
      }}>
        {/* Stars */}
        <div className="night-sky-stars" />
        {/* Crescent Moon */}
        <div style={{
          position: 'absolute',
          top: '8%',
          right: '12%',
          width: '45px',
          height: '45px',
          borderRadius: '50%',
          background: 'transparent',
          boxShadow: '10px -2px 0 0 #fffde7, 10px -2px 12px 2px rgba(255,253,231,0.25)',
          filter: 'drop-shadow(0 0 15px rgba(255,253,231,0.4))',
          animation: 'moonGlow 4s ease-in-out infinite alternate'
        }} />
        <style>{`
          .night-sky-stars {
            position: absolute;
            top: 0; left: 0; width: 100%; height: 65%;
            background-image:
              radial-gradient(1px 1px at 10% 8%, rgba(255,255,255,0.9), transparent),
              radial-gradient(1px 1px at 25% 15%, rgba(255,255,255,0.7), transparent),
              radial-gradient(1.5px 1.5px at 40% 5%, rgba(255,255,255,1), transparent),
              radial-gradient(1px 1px at 55% 22%, rgba(255,255,255,0.6), transparent),
              radial-gradient(1px 1px at 70% 10%, rgba(255,255,255,0.8), transparent),
              radial-gradient(1.5px 1.5px at 85% 18%, rgba(255,255,255,0.9), transparent),
              radial-gradient(1px 1px at 15% 30%, rgba(255,255,255,0.5), transparent),
              radial-gradient(1px 1px at 30% 25%, rgba(255,255,255,0.7), transparent),
              radial-gradient(1.2px 1.2px at 50% 12%, rgba(255,255,255,0.8), transparent),
              radial-gradient(1px 1px at 65% 28%, rgba(255,255,255,0.6), transparent),
              radial-gradient(1px 1px at 80% 6%, rgba(255,255,255,0.7), transparent),
              radial-gradient(1px 1px at 90% 25%, rgba(255,255,255,0.5), transparent),
              radial-gradient(1.3px 1.3px at 5% 18%, rgba(255,255,255,0.9), transparent),
              radial-gradient(1px 1px at 20% 40%, rgba(255,255,255,0.4), transparent),
              radial-gradient(1px 1px at 35% 35%, rgba(255,255,255,0.6), transparent),
              radial-gradient(1px 1px at 48% 32%, rgba(255,255,255,0.5), transparent),
              radial-gradient(1.5px 1.5px at 60% 38%, rgba(255,255,255,0.7), transparent),
              radial-gradient(1px 1px at 75% 42%, rgba(255,255,255,0.4), transparent),
              radial-gradient(1px 1px at 88% 35%, rgba(255,255,255,0.6), transparent),
              radial-gradient(1px 1px at 95% 15%, rgba(255,255,255,0.5), transparent),
              radial-gradient(1px 1px at 12% 45%, rgba(255,255,255,0.3), transparent),
              radial-gradient(1.2px 1.2px at 42% 20%, rgba(255,255,255,0.8), transparent),
              radial-gradient(1px 1px at 78% 30%, rgba(255,255,255,0.5), transparent),
              radial-gradient(1px 1px at 3% 35%, rgba(255,255,255,0.6), transparent),
              radial-gradient(1px 1px at 58% 45%, rgba(255,255,255,0.3), transparent),
              radial-gradient(1.4px 1.4px at 22% 7%, rgba(255,255,255,0.9), transparent),
              radial-gradient(1px 1px at 68% 3%, rgba(255,255,255,0.7), transparent),
              radial-gradient(1px 1px at 33% 48%, rgba(255,255,255,0.3), transparent),
              radial-gradient(1px 1px at 92% 8%, rgba(255,255,255,0.8), transparent),
              radial-gradient(1px 1px at 45% 42%, rgba(255,255,255,0.4), transparent);
            animation: starsTwinkle 5s ease-in-out infinite alternate;
          }
          @keyframes starsTwinkle {
            0% { opacity: 0.7; }
            25% { opacity: 0.9; }
            50% { opacity: 0.6; }
            75% { opacity: 1; }
            100% { opacity: 0.75; }
          }
          @keyframes moonGlow {
            0% { filter: drop-shadow(0 0 12px rgba(255,253,231,0.3)); }
            100% { filter: drop-shadow(0 0 25px rgba(255,253,231,0.6)); }
          }
        `}</style>
      </div>

      {/* Globe always mounted to prevent WebGL context loss / black screen */}
      <div style={{
        position: 'fixed', top: '-5vh', left: '0', width: '100%', height: '130vh', /* zIndex handled below */
        opacity: activeTab === 'home' ? 1 : 0,
        zIndex: activeTab === 'home' ? 0 : -999, /* Prevent WebGL context loss by not using visibility: hidden */
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

              <div className="nav-item" onClick={() => openCamera('avatar')} style={{ color: '#00ffff' }}>
                <ImageIcon size={24} /><span>Change Avatar</span>
              </div>

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
      
      {/* Change Username Modal */}
      {showChangeUsernameModal && (
        <div className="settings-drawer-overlay" onClick={() => setShowChangeUsernameModal(false)} style={{ zIndex: 10002 }}>
          <div className="settings-drawer" onClick={e => e.stopPropagation()} style={{ height: '100%', maxHeight: '100%', width: '100%', maxWidth: '100%', top: '0', bottom: '0', left: '0', right: '0', borderRadius: '0', position: 'fixed', transform: 'none', transition: 'none' }}>
            <div className="modal-header">
              <h2>Change Username</h2>
              <button onClick={() => setShowChangeUsernameModal(false)} className="close-btn"><X size={24} /></button>
            </div>
            <div className="settings-options" style={{ padding: '20px' }}>
                <div className="settings-edit-username premium-username-edit">
                  <div className="input-wrapper" style={{ position: 'relative' }}>
                    <input 
                      type="text" 
                      value={newUsernameInput} 
                      onChange={handleUsernameChange} 
                      placeholder="New Username" 
                      className="premium-input"
                      style={{ 
                        border: usernameAvailable === false ? '2px solid var(--brand-red)' : (usernameAvailable === true ? '2px solid #2bd856' : ''),
                        paddingRight: '30px'
                      }}
                    />
                    {checkingUsername && <div className="spinner" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', width: '15px', height: '15px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>}
                  </div>
                  {usernameError && <p className="error-text" style={{fontSize: '0.85rem', marginTop: '6px', color: 'var(--brand-red)', fontWeight: 'bold'}}>{usernameError}</p>}
                  {usernameAvailable === true && <p style={{fontSize: '0.85rem', marginTop: '6px', color: '#2bd856', fontWeight: 'bold'}}>Username is perfect!</p>}
                  
                  {user.pastUsernames && user.pastUsernames.length > 0 && (
                    <div className="past-usernames-section" style={{ marginTop: '20px', textAlign: 'left' }}>
                      <h4 style={{ fontSize: '0.9rem', color: '#888', marginBottom: '8px', borderBottom: '1px solid #333', paddingBottom: '4px' }}>Previous Usernames</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                        {user.pastUsernames.slice().reverse().map((pu, i) => (
                          <div key={i} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', fontSize: '0.9rem', color: '#ccc' }}>
                            @{pu}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
                    <button className="premium-btn primary" onClick={async () => {
                        await handleUpdateUsername();
                        setShowChangeUsernameModal(false);
                    }} disabled={usernameAvailable === false || checkingUsername || newUsernameInput === user.username}>Save Changes</button>
                    <button className="premium-btn secondary" onClick={() => { setShowChangeUsernameModal(false); setUsernameAvailable(null); setUsernameError(''); }}>Cancel</button>
                  </div>
                </div>
            </div>
          </div>
        </div>
      )}

      {showInnerSettingsModal && (
        <div className="settings-drawer-overlay" onClick={() => setShowInnerSettingsModal(false)} style={{ zIndex: 10001 }}>
          <div className="settings-drawer" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Settings</h2>
              <button onClick={() => setShowInnerSettingsModal(false)} className="close-btn"><X size={24} /></button>
            </div>
            <div className="settings-options">
              <button className="settings-item-btn" onClick={() => {
                  setNewUsernameInput(user.username);
                  setShowChangeUsernameModal(true);
                  setUsernameAvailable(null);
                  setUsernameError('');
                }}>
                  Change Username
                </button>
              <button className="settings-item-btn" onClick={() => { setShowInnerSettingsModal(false); setShowSettingsModal(false); openCamera('avatar'); }}>
                Change Profile Avatar
              </button>
              <button className="settings-item-btn">My Profile</button>
              <button className="settings-item-btn">Account</button>
              <button className="settings-item-btn">Privacy</button>
              <button className="settings-item-btn" onClick={() => setShowNotificationsModal(true)}>Notifications</button>
              <button className="settings-item-btn">More Info</button>
              <button className="settings-item-btn">Invite Friend</button>
            </div>
          </div>
        </div>
      )}

      {showNotificationsModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10002, background: '#111', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #333', background: '#000' }}>
            <button onClick={() => setShowNotificationsModal(false)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ArrowLeft size={24} /></button>
            <h2 style={{ marginLeft: '20px', fontSize: '1.2rem', margin: '0 0 0 20px' }}>Notifications</h2>
          </div>
          <div style={{ padding: '20px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* Main push toggle */}
            {(() => {
              const ToggleSwitch = ({ enabled }) => (
                <div style={{ width: '50px', height: '28px', borderRadius: '14px', background: enabled ? '#2bd856' : 'rgba(255,255,255,0.15)', position: 'relative', transition: 'background 0.2s ease', flexShrink: 0 }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '2px', left: enabled ? '24px' : '2px', transition: 'left 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
                </div>
              );
              return (
                <>
                  <div onClick={handleToggleNotifications} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '16px', background: 'rgba(255,255,255,0.06)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.05rem', fontWeight: '600' }}><Bell size={22} /> Push Notifications</span>
                    <ToggleSwitch enabled={pushNotifEnabled} />
                  </div>

                  {/* Sub-options — only show when push is ON */}
                  {pushNotifEnabled && (
                    <div style={{ marginLeft: '12px', display: 'flex', flexDirection: 'column', gap: '10px', borderLeft: '2px solid rgba(255,255,255,0.1)', paddingLeft: '16px' }}>
                      {/* Pop-up toggle */}
                      <div onClick={() => setNotifPopEnabled(p => !p)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '14px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div>
                          <div style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '3px' }}>🔔 Notification Pop-up</div>
                          <div style={{ fontSize: '0.8rem', color: '#888' }}>Show message preview on screen</div>
                        </div>
                        <ToggleSwitch enabled={notifPopEnabled} />
                      </div>

                      {/* Sound toggle */}
                      <div onClick={() => setNotifSoundEnabled(s => !s)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '14px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div>
                          <div style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '3px' }}>🔊 Notification Sound</div>
                          <div style={{ fontSize: '0.8rem', color: '#888' }}>Play sound when message arrives</div>
                        </div>
                        <ToggleSwitch enabled={notifSoundEnabled} />
                      </div>
                    </div>
                  )}
                </>
              );
            })()}

            <p style={{ color: '#555', fontSize: '0.88rem', marginTop: '8px', lineHeight: '1.6' }}>
              Enable push notifications to stay updated. You can fine-tune whether to show a pop-up, play a sound, or both.
            </p>
          </div>
        </div>
      )}

      
      {showSettingsModal && (
        <div className="settings-drawer-overlay" onClick={() => setShowSettingsModal(false)}>
          <div className="settings-drawer" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Settings</h2>
              <button onClick={() => setShowSettingsModal(false)} className="close-btn"><X size={24} /></button>
            </div>
            <div className="settings-options">
              <button className="settings-item-btn" onClick={() => setShowInnerSettingsModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <SettingsIcon size={20} /> Settings
              </button>
              
              
              <button className="settings-item-btn" onClick={() => navigate('/about-us')} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Info size={20} /> About Us
              </button>
              
              
              

<button className="settings-item-btn" onClick={() => navigate('/privacy-policy')} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Shield size={20} /> Privacy Policy
              </button>
              
              <button className="settings-item-btn" onClick={() => navigate('/terms')} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText size={20} /> Terms & Conditions
              </button>

              <button className="settings-item-btn" onClick={() => navigate('/contact-us')} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Mail size={20} /> Contact Us
              </button>
              
              <button className="settings-item-btn logout-danger" onClick={() => { setShowSettingsModal(false); setShowLogoutConfirm(true); }} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <LogOut size={20} /> Log Out
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
                <button className="settings-item-btn logout-danger" onClick={() => setShowDeleteConfirm(true)} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '24px' }}>
                  <Trash2 size={20} /> Delete My Account
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <CommentsModal 
        key={viewerStories[currentStoryUserIndex]?.stories[currentStoryIndex]?._id}
        isOpen={showCommentsModal}
        onClose={() => {
          setShowCommentsModal(false);
          setStoryPaused(false);
        }}
        story={viewerStories[currentStoryUserIndex]?.stories[currentStoryIndex]}
        token={token}
        user={user}
        API_URL={API_URL}
        updateCommentCount={updateCommentCount}
      />
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

      {/* Rich Message Incoming Toast */}
      {msgToast.show && msgToast.sender && (
        <div
          onClick={() => {
            if (msgToast.senderId) {
              startChatWithUser({ _id: msgToast.senderId, username: msgToast.sender.username, avatarUrl: msgToast.sender.avatarUrl });
            }
            setMsgToast(prev => ({ ...prev, show: false }));
          }}
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 99999,
            background: 'rgba(20, 20, 20, 0.95)',
            border: '1px solid rgba(255,255,255,0.12)',
            backdropFilter: 'blur(20px)',
            color: '#fff',
            padding: '14px 18px',
            borderRadius: '18px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            animation: 'msgToastSlide 4s forwards',
            minWidth: '260px',
            maxWidth: '340px',
            cursor: 'pointer',
          }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366)', padding: '2px' }}>
            <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 'bold' }}>
              {msgToast.sender.avatarUrl
                ? <img src={msgToast.sender.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : msgToast.sender.username?.charAt(0)?.toUpperCase()}
            </div>
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#fff', marginBottom: '3px' }}>@{msgToast.sender.username}</div>
            <div style={{ fontSize: '0.88rem', color: '#ccc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{msgToast.messageText}</div>
          </div>
          <div style={{ fontSize: '0.7rem', color: '#666', flexShrink: 0 }}>Tap to open</div>
          <style>{`
            @keyframes msgToastSlide {
              0% { top: -80px; opacity: 0; }
              12% { top: 20px; opacity: 1; }
              80% { top: 20px; opacity: 1; }
              100% { top: -80px; opacity: 0; }
            }
          `}</style>
        </div>
      )}

      
      {/* Avatar Library Modal */}
      {showAvatarLibrary && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.85)', zIndex: 13000, display: 'flex', flexDirection: 'column',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 style={{ margin: 0, color: '#fff', fontSize: '1.2rem' }}>Choose 3D Avatar</h2>
            <button onClick={() => setShowAvatarLibrary(false)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
              <X size={28} />
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <div 
                  key={num} 
                  onClick={() => {
                    if (isProcessingLibraryAvatar) return;
                    setIsProcessingLibraryAvatar(true);
                    try {
                      const img = document.getElementById(`avatar-img-${num}`);
                      if (!img) throw new Error('Image not found in DOM');
                      
                      const canvas = document.createElement('canvas');
                      canvas.width = img.naturalWidth || 1024;
                      canvas.height = img.naturalHeight || 1024;
                      const ctx = canvas.getContext('2d');
                      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                      
                      canvas.toBlob((blob) => {
                        const file = new File([blob], `avatar_${num}.png`, { type: 'image/png' });
                        const simulatedEvent = { target: { files: [file] } };
                        setShowAvatarLibrary(false);
                        closeStoryCamera();
                        handleAvatarSelect(simulatedEvent);
                        setIsProcessingLibraryAvatar(false);
                      }, 'image/png');
                    } catch (error) {
                      console.error('Error loading library avatar:', error);
                      alert('Could not load this avatar yet.');
                      setIsProcessingLibraryAvatar(false);
                    }
                  }}
                  style={{ 
                    aspectRatio: '1', borderRadius: '15px', overflow: 'hidden', cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.3)', border: '2px solid transparent',
                    transition: 'transform 0.2s, border-color 0.2s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.borderColor = '#10B981'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.borderColor = 'transparent'; }}
                >
                  <img id={`avatar-img-${num}`} crossOrigin="anonymous" src={`/avatars/${user?.gender === 'female' ? 'female' : 'male'}/${num}.png`} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.src = 'https://via.placeholder.com/150?text=Pending' }} />
                </div>
              ))}
            </div>
            {isProcessingLibraryAvatar && (
              <div style={{ textAlign: 'center', color: '#10B981', marginTop: '20px' }}>Processing...</div>
            )}
          </div>
        </div>
      )}

{/* Custom Story Camera Modal */}
      {storyCameraOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: '#000', zIndex: 12000, display: 'flex', flexDirection: 'column'
        }}>
          
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', position: 'absolute', top: 0, width: '100%', zIndex: 10 }}>
            {cameraMode === 'avatar' ? (
              <button onClick={() => setShowAvatarLibrary(true)} style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: '20px', padding: '8px 15px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', backdropFilter: 'blur(5px)' }}>
                <UserIcon size={18} />
                <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>3D Avatars</span>
              </button>
            ) : <div />}
            <div style={{ display: 'flex', gap: '15px' }}>
              {storyCapturedImage && (
                <a href={storyCapturedImage} download="twelo_capture.jpg" style={{ background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', borderRadius: '50%', padding: '8px', cursor: 'pointer', display: 'flex' }}>
                  <Download size={24} />
                </a>
              )}
              <button onClick={closeStoryCamera} style={{ background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', borderRadius: '50%', padding: '8px', cursor: 'pointer', display: 'flex' }}>
                <X size={24} />
              </button>
            </div>
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
                <button onClick={() => {
    const targetInput = cameraMode === 'avatar'
      ? avatarFileInputRef.current
      : (storyFileInputRef.current || avatarFileInputRef.current);
    if (targetInput) targetInput.click();
  }} style={{ background: 'transparent', border: 'none', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', cursor: 'pointer', width: '60px' }}>
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
      
      {avatarCropperOpen && (
        <div className="modal-overlay" style={{ zIndex: 13000 }}>
          <div className="story-camera-container" style={{ background: '#111', padding: '20px', borderRadius: '15px', maxWidth: '400px', width: '90%' }}>
            <h3 style={{ color: '#fff', marginBottom: '15px' }}>Crop Avatar</h3>
            <ReactCrop
              crop={avatarCrop}
              onChange={(_, percentCrop) => setAvatarCrop(percentCrop)}
              onComplete={(c) => setAvatarCompletedCrop(c)}
              aspect={1}
              circularCrop
            >
              <img
                ref={avatarImgRef}
                src={avatarImageSrc}
                alt="Crop preview"
                style={{ maxHeight: '60vh', width: 'auto' }}
              />
            </ReactCrop>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button 
                className="chat-now-btn" 
                style={{ flex: 1, background: '#333' }}
                onClick={() => { setAvatarCropperOpen(false); setAvatarImageSrc(null); }}
              >
                Cancel
              </button>
              <button 
                className="chat-now-btn" 
                style={{ flex: 1, background: 'var(--brand-blue)' }}
                onClick={handleAvatarUpload}
                disabled={isUploadingAvatar}
              >
                {isUploadingAvatar ? 'Saving...' : 'Save Avatar'}
              </button>
            </div>
          </div>
        </div>
      )}

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
                          handleNextUser={handleNextUser}
                          handlePrevUser={handlePrevUser}
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
                           setShowCommentsModal={setShowCommentsModal}
                           handleNextUser={handleNextUser}
                           handlePrevUser={handlePrevUser}
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


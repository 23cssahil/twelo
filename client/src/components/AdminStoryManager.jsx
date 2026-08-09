import React, { useState, useEffect, useRef } from 'react';
import { X, Eye, Heart, Trash2, ArrowLeft, Loader2, ChevronUp, ChevronDown } from 'lucide-react';
import io from 'socket.io-client';
import './AdminStoryManager.css';

const AdminStoryManager = ({ onClose, adminPass, API_URL }) => {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStory, setSelectedStory] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showViewersList, setShowViewersList] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    fetchStories();
    
    // Setup socket for real-time updates
    const socket = io(API_URL);
    socketRef.current = socket;
    
    socket.on('admin_story_interaction', () => {
      // Re-fetch stories to get updated views and likes
      fetchStories(true);
    });
    
    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    // Hardware back button handling
    window.history.pushState({ adminStoryManager: true }, '');
    const handlePopState = (e) => {
      e.preventDefault();
      if (selectedStory) {
        setSelectedStory(null);
        window.history.pushState({ adminStoryManager: true }, ''); // Push state again to stay in manager
      } else {
        onClose();
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedStory, onClose]);

  const fetchStories = async (silentUpdate = false) => {
    if (!silentUpdate) setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/stories`, {
        headers: { 'x-admin-pass': adminPass }
      });
      if (res.ok) {
        const data = await res.json();
        setStories(data);
        
        // Update selected story if it's currently open
        if (selectedStory) {
          const updated = data.find(s => s._id === selectedStory._id);
          if (updated) setSelectedStory(updated);
        }
      }
    } catch (err) {
      console.error('Failed to fetch admin stories:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (storyId) => {
    if (!window.confirm('Are you sure you want to delete this global story?')) return;
    
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/stories/${storyId}`, {
        method: 'DELETE',
        headers: { 'x-admin-pass': adminPass }
      });
      
      if (res.ok) {
        setStories(stories.filter(s => s._id !== storyId));
        if (selectedStory?._id === storyId) {
          setSelectedStory(null);
        }
      } else {
        alert('Failed to delete story');
      }
    } catch (err) {
      alert('Error deleting story');
    } finally {
      setDeleting(false);
    }
  };

  const renderDetailModal = () => {
    if (!selectedStory) return null;
    
    const likedByIds = selectedStory.likedBy?.map(u => u._id) || [];

    return (
      <div className="admin-sm-detail-modal">
        <div className="admin-sm-detail-header" style={{ zIndex: 10 }}>
          <button className="admin-sm-close-btn" onClick={() => {
            setSelectedStory(null);
            setShowViewersList(false);
          }}>
            <ArrowLeft size={28} />
          </button>
          <button 
            className="admin-sm-delete-btn" 
            onClick={() => handleDelete(selectedStory._id)}
            disabled={deleting}
          >
            {deleting ? <Loader2 className="rotating" size={18} /> : <Trash2 size={18} />}
            Delete Story
          </button>
        </div>

        <div className="admin-sm-detail-body" style={{ position: 'relative', display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div className="admin-sm-media-container" style={{ flex: 1, height: '100%', position: 'absolute', inset: 0 }}>
            {selectedStory.mediaType === 'video' ? (
              <video src={selectedStory.mediaUrl} controls autoPlay loop muted playsInline style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <img src={selectedStory.mediaUrl} alt="Story" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            )}
          </div>
          
          {/* Floating Stats Button */}
          <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
            <button 
              onClick={() => setShowViewersList(!showViewersList)}
              style={{
                display: 'flex', alignItems: 'center', gap: '15px', padding: '12px 24px',
                background: 'rgba(0,0,0,0.8)', color: 'white', border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '30px', backdropFilter: 'blur(10px)', cursor: 'pointer',
                fontWeight: 'bold', fontSize: '1.1rem', boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Eye size={20} /> {selectedStory.viewedBy?.length || 0}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#ef4444' }}>
                <Heart size={20} fill="#ef4444" /> {selectedStory.likedBy?.length || 0}
              </span>
              {showViewersList ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
            </button>
          </div>

          {/* Viewers List Overlay */}
          {showViewersList && (
            <div className="admin-sm-viewers-panel" style={{ 
              position: 'absolute', bottom: 0, left: 0, width: '100%', height: '60%', 
              background: 'rgba(20,20,20,0.95)', backdropFilter: 'blur(15px)', zIndex: 20,
              borderTopLeftRadius: '20px', borderTopRightRadius: '20px',
              borderTop: '1px solid #333', boxShadow: '0 -5px 20px rgba(0,0,0,0.5)'
            }}>
              <div className="admin-sm-viewers-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '15px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Eye size={20} /> {selectedStory.viewedBy?.length || 0} Views
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#ef4444' }}>
                    <Heart size={20} /> {selectedStory.likedBy?.length || 0} Likes
                  </span>
                </div>
                <button onClick={() => setShowViewersList(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                  <X size={24} />
                </button>
              </div>
              <div className="admin-sm-viewers-list" style={{ flex: 1, overflowY: 'auto' }}>
                {(!selectedStory.viewedBy || selectedStory.viewedBy.length === 0) ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#888' }}>No views yet</div>
                ) : (
                  selectedStory.viewedBy.map(user => (
                    <div key={user._id} className="admin-sm-viewer-item">
                      <img 
                        src={user.avatarUrl || 'https://via.placeholder.com/40'} 
                        alt={user.username} 
                        className="admin-sm-viewer-avatar"
                        onError={(e) => { e.target.src = 'https://via.placeholder.com/40'; }}
                      />
                      <div className="admin-sm-viewer-info">
                        <span className="admin-sm-viewer-name">{user.name || user.username}</span>
                        <span className="admin-sm-viewer-username">@{user.uniqueId || user.username}</span>
                      </div>
                      {likedByIds.includes(user._id) && (
                        <Heart size={16} fill="#ef4444" className="admin-sm-viewer-liked" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="admin-sm-overlay">
      <div className="admin-sm-header">
        <h2>Global Stories</h2>
        <button className="admin-sm-close-btn" onClick={onClose}>
          <X size={24} />
        </button>
      </div>

      <div className="admin-sm-content">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Loader2 className="rotating" size={40} color="#3b82f6" />
          </div>
        ) : stories.length === 0 ? (
          <div className="admin-sm-empty">
            <h3>No Global Stories</h3>
            <p>You haven't posted any stories yet.</p>
          </div>
        ) : (
          <div className="admin-sm-grid">
            {stories.map(story => (
              <div key={story._id} className="admin-sm-card" onClick={() => setSelectedStory(story)}>
                {story.mediaType === 'video' ? (
                  <video src={story.mediaUrl} className="admin-sm-thumbnail" muted />
                ) : (
                  <img src={story.mediaUrl} className="admin-sm-thumbnail" alt="thumbnail" />
                )}
                <div className="admin-sm-stats">
                  <div className="admin-sm-stat-item">
                    <Eye size={16} /> {story.viewedBy?.length || 0}
                  </div>
                  <div className="admin-sm-stat-item" style={{ color: '#ef4444' }}>
                    <Heart size={16} fill="#ef4444" /> {story.likedBy?.length || 0}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {renderDetailModal()}
    </div>
  );
};

export default AdminStoryManager;

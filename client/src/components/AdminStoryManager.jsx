import React, { useState, useEffect } from 'react';
import { X, Eye, Heart, Trash2, ArrowLeft, Loader2 } from 'lucide-react';
import './AdminStoryManager.css';

const AdminStoryManager = ({ onClose, adminPass, API_URL }) => {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStory, setSelectedStory] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchStories();
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

  const fetchStories = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/stories`, {
        headers: { 'x-admin-pass': adminPass }
      });
      if (res.ok) {
        const data = await res.json();
        setStories(data);
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
        <div className="admin-sm-detail-header">
          <button className="admin-sm-close-btn" onClick={() => setSelectedStory(null)}>
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

        <div className="admin-sm-detail-body">
          <div className="admin-sm-media-container">
            {selectedStory.mediaType === 'video' ? (
              <video src={selectedStory.mediaUrl} controls autoPlay loop muted playsInline />
            ) : (
              <img src={selectedStory.mediaUrl} alt="Story" />
            )}
          </div>

          <div className="admin-sm-viewers-panel">
            <div className="admin-sm-viewers-header">
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Eye size={20} /> {selectedStory.viewedBy?.length || 0}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#ef4444' }}>
                <Heart size={20} /> {selectedStory.likedBy?.length || 0}
              </span>
            </div>
            <div className="admin-sm-viewers-list">
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

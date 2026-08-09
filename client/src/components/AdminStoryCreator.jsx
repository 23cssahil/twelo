import React, { useState, useRef, useEffect } from 'react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Camera, Image as ImageIcon, Type, X, Check, Music, RefreshCcw, Type as TypeIcon } from 'lucide-react';
import './AdminStoryCreator.css';

export default function AdminStoryCreator({ onClose, API_URL, adminPass }) {
  // Top level modes
  const [mode, setMode] = useState('camera'); // 'camera', 'gallery', 'text'
  
  // Camera Workflow Stages: 'live', 'review', 'scanning', 'editor'
  const [cameraStage, setCameraStage] = useState('live'); 
  
  // File & Preview
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  
  // Camera stream state
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);
  const [facingMode, setFacingMode] = useState('user');

  // Editor State
  const [overlayText, setOverlayText] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [textFont, setTextFont] = useState('Inter'); // 'Inter', 'Serif', 'Cursive'

  // Song state
  const [songs, setSongs] = useState([]);
  const [selectedSongUrl, setSelectedSongUrl] = useState('');
  const [showSongPicker, setShowSongPicker] = useState(false);

  // Upload State
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    // Fetch songs for admin
    setSongs([
      { name: 'TWELO Theme', url: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8b82431d1.mp3' },
      { name: 'Chill Vibes', url: 'https://cdn.pixabay.com/download/audio/2021/08/09/audio_13b5d25950.mp3' },
      { name: 'Epic Announcement', url: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3' }
    ]);
  }, [API_URL, adminPass]);

  useEffect(() => {
    if (mode === 'camera' && cameraStage === 'live') {
      openCamera(facingMode);
    } else {
      closeCamera();
    }
    
    return () => {
      closeCamera();
    };
  }, [mode, cameraStage]);

  const openCamera = async (modeOverride) => {
    if (stream) stream.getTracks().forEach(t => t.stop());
    try {
      let newStream;
      try {
        newStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: modeOverride } } });
      } catch (e) {
        newStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: modeOverride } });
      }
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err) {
      console.error('Camera access denied:', err);
    }
  };

  const closeCamera = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
  };

  const switchCamera = () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    openCamera(newMode);
  };

  const handleCapture = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(videoRef.current, 0, 0);
      canvas.toBlob(blob => {
        const file = new File([blob], 'camera_capture.jpg', { type: 'image/jpeg' });
        setFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setCameraStage('review');
      }, 'image/jpeg', 0.85);
    }
  };

  const handleReviewCancel = () => {
    setFile(null);
    setPreviewUrl(null);
    setCameraStage('live');
  };

  const handleReviewOkay = () => {
    setCameraStage('scanning');
    
    // Simulate AI Scanning for Nudity (In a real scenario, this happens during upload to /api/upload)
    // We will do a 2-second fake scan for UX, since the actual scan is backend-driven during publish
    setTimeout(() => {
      setCameraStage('editor');
    }, 2000);
  };

  const handlePublishFromEditor = async () => {
    setUploading(true);
    let finalFile = file;

    // If there is overlay text, render it onto a canvas
    if (overlayText.trim()) {
      finalFile = await renderTextOntoImage();
    }

    const formData = new FormData();
    formData.append('file', finalFile);

    try {
      const uploadRes = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        headers: { 'x-admin-pass': adminPass },
        body: formData
      });
      const uploadData = await uploadRes.json();

      if (!uploadRes.ok) {
        alert(uploadData.message || 'Upload blocked by AI Scanner.');
        setUploading(false);
        return;
      }

      const storyRes = await fetch(`${API_URL}/api/admin/stories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pass': adminPass
        },
        body: JSON.stringify({ 
          mediaUrl: uploadData.url, 
          mediaType: 'image',
          songUrl: selectedSongUrl
        })
      });

      if (storyRes.ok) {
        alert('Global Story Published Successfully!');
        onClose();
      } else {
        alert('Failed to add story.');
      }
    } catch (err) {
      alert('Network Error.');
    }
    setUploading(false);
  };

  const renderTextOntoImage = () => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        ctx.drawImage(img, 0, 0);
        
        // Draw Text
        ctx.fillStyle = '#ffffff';
        // Base font size on image width
        const fontSize = Math.floor(canvas.width * 0.1); 
        ctx.font = `bold ${fontSize}px ${textFont === 'Cursive' ? 'cursive' : textFont === 'Serif' ? 'serif' : 'sans-serif'}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Adding a slight text shadow for visibility
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 10;
        ctx.lineWidth = 5;
        
        ctx.fillText(overlayText, canvas.width / 2, canvas.height / 2);
        
        canvas.toBlob(blob => {
          resolve(new File([blob], 'edited_story.jpg', { type: 'image/jpeg' }));
        }, 'image/jpeg', 0.9);
      };
      img.src = previewUrl;
    });
  };

  return (
    <div className="admin-sc-overlay">
      <div className="admin-sc-container">
        
        {/* Header */}
        <div className="admin-sc-header">
          <h2>Global Story</h2>
          <button onClick={onClose} className="admin-sc-close-btn"><X size={24} /></button>
        </div>

        {/* Top Navigation Bar */}
        <div className="admin-sc-topbar">
          <button 
            className={`admin-sc-tab ${mode === 'camera' ? 'active' : ''}`}
            onClick={() => { setMode('camera'); setCameraStage('live'); }}
          >
            <Camera size={20} />
            <span>Camera</span>
          </button>
          
          <button 
            className={`admin-sc-tab ${mode === 'gallery' ? 'active' : ''}`}
            onClick={() => setMode('gallery')}
          >
            <ImageIcon size={20} />
            <span>Gallery</span>
          </button>
          
          <button 
            className={`admin-sc-tab ${mode === 'text' ? 'active' : ''}`}
            onClick={() => setMode('text')}
          >
            <Type size={20} />
            <span>Text</span>
          </button>
        </div>

        {/* Dynamic Workspace */}
        <div className="admin-sc-workspace">
          
          {mode === 'camera' && (
            <>
              {cameraStage === 'live' && (
                <div className="admin-sc-live-view">
                  <video ref={videoRef} autoPlay playsInline muted className="admin-sc-video" style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }} />
                  <div className="admin-sc-live-controls">
                    <button className="admin-sc-btn-switch" onClick={switchCamera}>
                      <RefreshCcw size={24} />
                    </button>
                    <button className="admin-sc-btn-capture" onClick={handleCapture}></button>
                    <div style={{ width: 44 }}></div> {/* Spacer for symmetry */}
                  </div>
                </div>
              )}

              {cameraStage === 'review' && (
                <div className="admin-sc-review-view">
                  <img src={previewUrl} alt="Review" className="admin-sc-preview-img" />
                  <div className="admin-sc-review-controls">
                    <button className="admin-sc-btn-cancel" onClick={handleReviewCancel}>
                      <X size={32} />
                    </button>
                    <button className="admin-sc-btn-okay" onClick={handleReviewOkay}>
                      <Check size={32} />
                    </button>
                  </div>
                </div>
              )}

              {cameraStage === 'scanning' && (
                <div className="admin-sc-scanning-view">
                  <div className="admin-sc-scanner-spinner"></div>
                  <h3>AI Scanning...</h3>
                  <p>Checking for safe content</p>
                </div>
              )}

              {cameraStage === 'editor' && (
                <div className="admin-sc-editor-view">
                  <div className="admin-sc-editor-preview">
                    <img src={previewUrl} alt="Editor" className="admin-sc-preview-img" />
                    {overlayText && (
                      <div className="admin-sc-text-overlay" style={{ fontFamily: textFont === 'Cursive' ? 'cursive' : textFont === 'Serif' ? 'serif' : 'sans-serif' }}>
                        {overlayText}
                      </div>
                    )}
                  </div>
                  
                  {showTextInput && (
                    <div className="admin-sc-text-input-panel">
                      <input 
                        type="text" 
                        placeholder="Type something..." 
                        value={overlayText} 
                        onChange={e => setOverlayText(e.target.value)}
                        autoFocus
                      />
                      <div className="admin-sc-font-picker">
                        <button onClick={() => setTextFont('Inter')} className={textFont === 'Inter' ? 'active' : ''}>Normal</button>
                        <button onClick={() => setTextFont('Serif')} className={textFont === 'Serif' ? 'active' : ''}>Serif</button>
                        <button onClick={() => setTextFont('Cursive')} className={textFont === 'Cursive' ? 'active' : ''}>Cursive</button>
                      </div>
                      <button className="admin-sc-done-btn" onClick={() => setShowTextInput(false)}>Done</button>
                    </div>
                  )}

                  <div className="admin-sc-editor-toolbar">
                    <div className="admin-sc-tools">
                      <button className="admin-sc-tool-btn" onClick={() => setShowTextInput(true)}>
                        <TypeIcon size={24} />
                        <span>Text</span>
                      </button>
                      <button className="admin-sc-tool-btn" onClick={() => setShowSongPicker(!showSongPicker)}>
                        <Music size={24} />
                        <span>{selectedSongUrl ? 'Song Added' : 'Music'}</span>
                      </button>
                    </div>
                    
                    {showSongPicker && (
                      <div className="admin-sc-song-picker">
                        <button onClick={() => { setSelectedSongUrl(''); setShowSongPicker(false); }}>No Music</button>
                        {songs.map((s, i) => (
                          <button key={i} onClick={() => { setSelectedSongUrl(s.url); setShowSongPicker(false); }}>
                            {s.name}
                          </button>
                        ))}
                      </div>
                    )}

                    <button className="admin-sc-publish-btn" onClick={handlePublishFromEditor} disabled={uploading}>
                      {uploading ? 'Publishing...' : 'Publish'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {mode === 'gallery' && (
            <div className="admin-sc-placeholder-view">
              <h3>Gallery Mode</h3>
              <p>Coming in next phase...</p>
            </div>
          )}

          {mode === 'text' && (
            <div className="admin-sc-placeholder-view">
              <h3>Text Mode</h3>
              <p>Coming in next phase...</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

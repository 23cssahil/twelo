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
  const [textFont, setTextFont] = useState('Inter'); // 'Inter', 'Serif', 'Cursive', 'Monospace', 'Impact', 'Comic Sans MS'
  const [textColor, setTextColor] = useState('#ffffff');
  const [textPos, setTextPos] = useState({ x: 50, y: 50 }); // Percentages
  const isDraggingText = useRef(false);

  // Gallery & Crop State
  const galleryInputRef = useRef(null);
  const [crop, setCrop] = useState({ unit: '%', width: 90, height: 90, x: 5, y: 5 });
  const [completedCrop, setCompletedCrop] = useState(null);
  const cropImgRef = useRef(null);

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
      { name: 'Epic Announcement', url: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3' },
      { name: 'Upbeat Pop', url: 'https://cdn.pixabay.com/download/audio/2022/10/14/audio_9939f792cb.mp3' },
      { name: 'Cinematic Intense', url: 'https://cdn.pixabay.com/download/audio/2022/11/22/audio_8bea3d35f0.mp3' },
      { name: 'Calm Acoustic', url: 'https://cdn.pixabay.com/download/audio/2021/11/25/audio_91b3cb39b6.mp3' },
      { name: 'Lofi Study', url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf7eb.mp3' },
      { name: 'Cyberpunk', url: 'https://cdn.pixabay.com/download/audio/2021/10/26/audio_9bc1fdb702.mp3' }
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

  useEffect(() => {
    // Add a dummy state to history so back button can be intercepted
    window.history.pushState({ adminStoryCreator: true }, '');

    const handlePopState = (e) => {
      e.preventDefault();
      onClose(); // Close the creator gracefully without leaving /admin
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [onClose]);

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

  const handleGallerySelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setCameraStage('cropping');
      setCrop({ unit: '%', width: 90, height: 90, x: 5, y: 5 });
      setCompletedCrop(null);
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
      canvas.toBlob(blob => {
        resolve(new File([blob], fileName, { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.9);
    });
  };

  const handleConfirmCrop = async () => {
    if (completedCrop?.width && completedCrop?.height && cropImgRef.current) {
      const croppedFile = await getCroppedImg(cropImgRef.current, completedCrop, 'gallery_crop.jpg');
      if (croppedFile) {
        setFile(croppedFile);
        setPreviewUrl(URL.createObjectURL(croppedFile));
      }
    }
    handleReviewOkay(); // Move to AI scanning and then editor
  };

  const handleReviewCancel = () => {
    setFile(null);
    setPreviewUrl(null);
    setCameraStage('live');
  };

  const handleReviewOkay = async () => {
    setCameraStage('scanning');
    
    // Real AI Scanning for Nudity using backend API
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const checkRes = await fetch(`${API_URL}/api/upload/check-nudity`, {
        method: 'POST',
        headers: {
          'x-admin-pass': adminPass // Although check-nudity might not require it, good to send
        },
        body: formData
      });
      
      const data = await checkRes.json();
      
      if (checkRes.ok) {
        setCameraStage('editor');
      } else {
        if (checkRes.status === 400 && data.message && data.message.includes('Nudity')) {
          alert('Action Blocked: Nudity or explicit content is strictly prohibited.');
          handleReviewCancel();
        } else {
          alert(data.message || 'Upload blocked by moderation policy.');
          handleReviewCancel();
        }
      }
    } catch (err) {
      alert('Failed to connect to moderation server.');
      handleReviewCancel();
    }
  };

  const handlePointerDown = (e) => {
    isDraggingText.current = true;
  };
  
  const handlePointerMove = (e) => {
    if (!isDraggingText.current) return;
    const container = document.getElementById('admin-sc-preview-container');
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    let x = ((clientX - rect.left) / rect.width) * 100;
    let y = ((clientY - rect.top) / rect.height) * 100;
    
    x = Math.max(5, Math.min(95, x));
    y = Math.max(5, Math.min(95, y));
    
    setTextPos({ x, y });
  };
  
  const handlePointerUp = () => {
    isDraggingText.current = false;
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
        const fontMap = { Inter: 'sans-serif', Serif: 'serif', Cursive: 'cursive', Monospace: 'monospace', Impact: 'Impact', 'Comic Sans MS': '"Comic Sans MS"' };
        ctx.font = `bold ${Math.floor(img.width * 0.08)}px ${fontMap[textFont] || 'sans-serif'}`;
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Draw text with outline for better visibility
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = Math.floor(img.width * 0.015);
        ctx.strokeText(overlayText, (canvas.width * textPos.x) / 100, (canvas.height * textPos.y) / 100);
        ctx.fillText(overlayText, (canvas.width * textPos.x) / 100, (canvas.height * textPos.y) / 100);
        
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
            onClick={() => {
              setMode('gallery');
              galleryInputRef.current?.click();
            }}
          >
            <ImageIcon size={20} />
            <span>Gallery</span>
          </button>
          <input 
            type="file" 
            ref={galleryInputRef} 
            onChange={handleGallerySelect} 
            accept="image/*" 
            style={{ display: 'none' }} 
          />
          
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
          
          {(mode === 'camera' || mode === 'gallery' || mode === 'text') && (
            <>
              {cameraStage === 'live' && mode === 'camera' && (
                <div className="admin-sc-live-view">
                  <div className="admin-sc-media-wrapper">
                    <video ref={videoRef} autoPlay playsInline muted className="admin-sc-video" style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }} />
                  </div>
                  <div className="admin-sc-bottom-controls" style={{ justifyContent: 'space-between', padding: '0 40px' }}>
                    <div style={{ width: 44 }}></div> {/* Spacer for center alignment */}
                    <button className="admin-sc-btn-capture" onClick={handleCapture}></button>
                    <button className="admin-sc-btn-switch" onClick={switchCamera}>
                      <RefreshCcw size={24} />
                    </button>
                  </div>
                </div>
              )}

              {cameraStage === 'review' && (
                <div className="admin-sc-review-view">
                  <div className="admin-sc-media-wrapper">
                    <img src={previewUrl} alt="Review" className="admin-sc-preview-img" />
                  </div>
                  <div className="admin-sc-bottom-controls" style={{ justifyContent: 'space-between', padding: '0 40px' }}>
                    <button className="admin-sc-btn-cancel" onClick={handleReviewCancel}>
                      <X size={32} />
                    </button>
                    <button className="admin-sc-btn-okay" onClick={handleReviewOkay}>
                      <Check size={32} />
                    </button>
                  </div>
                </div>
              )}

              {cameraStage === 'cropping' && (
                <div className="admin-sc-cropping-view" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', background: '#000' }}>
                    <ReactCrop 
                      crop={crop} 
                      onChange={c => setCrop(c)} 
                      onComplete={c => setCompletedCrop(c)}
                      style={{ maxHeight: '100%', maxWidth: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <img src={previewUrl} ref={cropImgRef} style={{ maxHeight: '60vh', maxWidth: '100%', objectFit: 'contain' }} alt="Crop Preview" />
                    </ReactCrop>
                  </div>
                  <div className="admin-sc-bottom-controls" style={{ justifyContent: 'center', padding: '15px' }}>
                    <button 
                      onClick={handleConfirmCrop}
                      style={{ padding: '10px 30px', background: '#10B981', color: 'white', borderRadius: '30px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                      Done Cropping
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
                  <div 
                    className="admin-sc-editor-preview" 
                    id="admin-sc-preview-container"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    style={{ touchAction: 'none' }}
                  >
                    <img src={previewUrl} alt="Editor" className="admin-sc-preview-img" draggable="false" />
                    {overlayText && (
                      <div 
                        className="admin-sc-text-overlay" 
                        style={{ 
                          fontFamily: textFont === 'Cursive' ? 'cursive' : textFont === 'Serif' ? 'serif' : 'sans-serif',
                          position: 'absolute',
                          left: `${textPos.x}%`,
                          top: `${textPos.y}%`,
                          transform: 'translate(-50%, -50%)',
                          cursor: 'move',
                          userSelect: 'none',
                          color: textColor,
                          textShadow: '0px 0px 10px rgba(0,0,0,0.8)',
                          fontSize: '2rem',
                          fontWeight: 'bold',
                          textAlign: 'center',
                          whiteSpace: 'pre-wrap',
                          width: '90%',
                          pointerEvents: 'none'
                        }}
                      >
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
                        {['Inter', 'Serif', 'Cursive', 'Monospace', 'Impact', 'Comic Sans MS'].map(f => (
                          <button key={f} onClick={() => setTextFont(f)} className={textFont === f ? 'active' : ''}>{f.split(' ')[0]}</button>
                        ))}
                      </div>
                      <div className="admin-sc-color-picker" style={{ display: 'flex', gap: '10px', marginTop: '10px', overflowX: 'auto', padding: '5px' }}>
                        {['#ffffff', '#000000', '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'].map(color => (
                          <div 
                            key={color} 
                            onClick={() => setTextColor(color)}
                            style={{ 
                              width: '30px', height: '30px', borderRadius: '50%', backgroundColor: color, 
                              border: textColor === color ? '3px solid #fff' : '2px solid rgba(255,255,255,0.3)',
                              cursor: 'pointer', flexShrink: 0,
                              boxShadow: textColor === color ? '0 0 10px rgba(255,255,255,0.5)' : 'none'
                            }} 
                          />
                        ))}
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

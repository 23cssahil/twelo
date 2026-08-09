import React, { useState, useRef, useEffect } from 'react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Camera, Image as ImageIcon, Type, X, Check, Music, RefreshCcw } from 'lucide-react';
import './AdminStoryCreator.css';

export default function AdminStoryCreator({ onClose, API_URL, adminPass }) {
  const [mode, setMode] = useState(null); // 'camera', 'gallery', 'text'
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  
  // Crop state
  const [crop, setCrop] = useState({ unit: '%', width: 90, height: 90, x: 5, y: 5 });
  const [completedCrop, setCompletedCrop] = useState(null);
  const [isCropping, setIsCropping] = useState(false);
  const imgRef = useRef(null);

  // Camera state
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);
  const [facingMode, setFacingMode] = useState('user');

  // Text state
  const [textContent, setTextContent] = useState('');
  const [textBg, setTextBg] = useState('linear-gradient(135deg, #FF6B6B 0%, #556270 100%)');
  
  // Upload State
  const [uploading, setUploading] = useState(false);

  // Song state
  const [songs, setSongs] = useState([]);
  const [selectedSongUrl, setSelectedSongUrl] = useState('');
  const [showSongPicker, setShowSongPicker] = useState(false);

  useEffect(() => {
    // Basic array of popular songs for admin or fetch if you have an endpoint
    setSongs([
      { name: 'TWELO Theme', url: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8b82431d1.mp3' },
      { name: 'Chill Vibes', url: 'https://cdn.pixabay.com/download/audio/2021/08/09/audio_13b5d25950.mp3' },
      { name: 'Epic Announcement', url: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3' }
    ]);
  }, [API_URL, adminPass]);

  useEffect(() => {
    if (mode === 'camera' && videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [mode, stream]);

  const openCamera = async (modeOverride = facingMode) => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
    }
    try {
      let newStream;
      try {
        newStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: modeOverride } } });
      } catch (e) {
        newStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: modeOverride } });
      }
      setStream(newStream);
      setMode('camera');
    } catch (err) {
      alert('Camera access denied or unavailable.');
    }
  };

  const closeCamera = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
  };

  const handleCapture = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      // Mirror if front camera
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(videoRef.current, 0, 0);
      canvas.toBlob(blob => {
        const file = new File([blob], 'camera_capture.jpg', { type: 'image/jpeg' });
        setFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        closeCamera();
        setMode('preview');
        setIsCropping(true);
      }, 'image/jpeg', 0.85);
    }
  };

  const switchCamera = () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    openCamera(newMode);
  };

  const handleFileSelect = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
      setMode('preview');
      if (selected.type.startsWith('image/')) {
        setIsCropping(true);
      }
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
        if (!blob) return resolve(null);
        resolve(new File([blob], fileName, { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.9);
    });
  };

  const handleConfirmCrop = async () => {
    if (completedCrop?.width && completedCrop?.height && imgRef.current) {
      const croppedFile = await getCroppedImg(imgRef.current, completedCrop, file.name);
      if (croppedFile) {
        setFile(croppedFile);
        setPreviewUrl(URL.createObjectURL(croppedFile));
      }
    }
    setIsCropping(false);
  };

  const handleTextToImage = async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');

    // Draw Gradient
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    if (textBg.includes('#FF6B6B')) {
      gradient.addColorStop(0, '#FF6B6B');
      gradient.addColorStop(1, '#556270');
    } else if (textBg.includes('#12c2e9')) {
      gradient.addColorStop(0, '#12c2e9');
      gradient.addColorStop(0.5, '#c471ed');
      gradient.addColorStop(1, '#f64f59');
    } else {
      gradient.addColorStop(0, '#0f2027');
      gradient.addColorStop(0.5, '#203a43');
      gradient.addColorStop(1, '#2c5364');
    }
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Text (Basic wrapping)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 80px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const words = textContent.split(' ');
    let line = '';
    const lines = [];
    
    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > canvas.width - 200 && i > 0) {
        lines.push(line);
        line = words[i] + ' ';
      } else {
        line = testLine;
      }
    }
    lines.push(line);
    
    const totalHeight = lines.length * 100;
    let y = (canvas.height - totalHeight) / 2;
    
    lines.forEach(l => {
      ctx.fillText(l, canvas.width / 2, y);
      y += 100;
    });

    return new Promise(resolve => {
      canvas.toBlob(blob => {
        resolve(new File([blob], 'text_story.jpg', { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.9);
    });
  };

  const handleUpload = async () => {
    setUploading(true);
    let finalFile = file;

    if (mode === 'text') {
      finalFile = await handleTextToImage();
    }

    if (!finalFile) {
      alert("No file generated.");
      setUploading(false);
      return;
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
        alert(uploadData.message || 'Upload failed');
        setUploading(false);
        return;
      }

      let mediaType = 'image';
      if (finalFile.type.startsWith('video/')) mediaType = 'video';

      const storyRes = await fetch(`${API_URL}/api/admin/stories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pass': adminPass
        },
        body: JSON.stringify({ 
          mediaUrl: uploadData.url, 
          mediaType,
          songUrl: selectedSongUrl
        })
      });

      if (storyRes.ok) {
        alert('Global Admin Story Added Successfully!');
        handleClose();
      } else {
        alert('Failed to add admin story.');
      }
    } catch (err) {
      console.error(err);
      alert('Network Error.');
    }
    setUploading(false);
  };

  const handleClose = () => {
    closeCamera();
    onClose();
  };

  return (
    <div className="admin-story-creator-overlay">
      <div className="admin-story-creator-container">
        <div className="admin-story-header">
          <h2>Create Global Story</h2>
          <button onClick={handleClose} className="admin-close-btn"><X size={24} /></button>
        </div>

        {!mode && (
          <div className="admin-story-options">
            <button onClick={() => openCamera()} className="admin-story-opt-btn camera">
              <Camera size={48} />
              <span>Camera</span>
            </button>
            <label className="admin-story-opt-btn gallery">
              <ImageIcon size={48} />
              <span>Gallery</span>
              <input type="file" accept="image/*,video/*" hidden onChange={handleFileSelect} />
            </label>
            <button onClick={() => setMode('text')} className="admin-story-opt-btn text">
              <Type size={48} />
              <span>Text</span>
            </button>
          </div>
        )}

        {mode === 'camera' && (
          <div className="admin-camera-view">
            <video ref={videoRef} autoPlay playsInline muted style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }} />
            <div className="admin-camera-controls">
              <button className="admin-cam-btn switch" onClick={switchCamera}><RefreshCcw size={28} /></button>
              <button className="admin-cam-btn capture" onClick={handleCapture}></button>
              <button className="admin-cam-btn cancel" onClick={() => { closeCamera(); setMode(null); }}><X size={28} /></button>
            </div>
          </div>
        )}

        {mode === 'preview' && (
          <div className="admin-preview-view">
            {isCropping ? (
              <div className="admin-cropper-wrapper">
                <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)}>
                  <img ref={imgRef} src={previewUrl} alt="Preview" />
                </ReactCrop>
                <button className="admin-crop-done-btn" onClick={handleConfirmCrop}>
                  <Check size={20} /> Done Cropping
                </button>
              </div>
            ) : (
              <div className="admin-preview-wrapper">
                {file?.type?.startsWith('video/') ? (
                   <video src={previewUrl} autoPlay loop playsInline className="admin-preview-media" />
                ) : (
                   <img src={previewUrl} className="admin-preview-media" alt="Final Preview" />
                )}
                
                {/* Song Selection */}
                <div className="admin-song-selector">
                  <button onClick={() => setShowSongPicker(!showSongPicker)} className="admin-song-btn">
                    <Music size={20} /> {selectedSongUrl ? 'Song Selected' : 'Add Music'}
                  </button>
                  {showSongPicker && (
                    <div className="admin-song-picker">
                      <button onClick={() => { setSelectedSongUrl(''); setShowSongPicker(false); }}>No Music</button>
                      {songs.map((s, i) => (
                        <button key={i} onClick={() => { setSelectedSongUrl(s.url); setShowSongPicker(false); }}>
                          {s.name || `Song ${i+1}`}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="admin-preview-controls">
                  <button className="admin-action-btn cancel" onClick={() => setMode(null)}>Cancel</button>
                  <button className="admin-action-btn upload" onClick={handleUpload} disabled={uploading}>
                    {uploading ? 'Publishing...' : 'Publish Global Story'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {mode === 'text' && (
          <div className="admin-text-view" style={{ background: textBg }}>
            <textarea 
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Type your announcement here..."
              autoFocus
            />
            
            <div className="admin-text-controls">
              <div className="admin-bg-selectors">
                <button onClick={() => setTextBg('linear-gradient(135deg, #FF6B6B 0%, #556270 100%)')} style={{ background: 'linear-gradient(135deg, #FF6B6B 0%, #556270 100%)' }} />
                <button onClick={() => setTextBg('linear-gradient(135deg, #12c2e9, #c471ed, #f64f59)')} style={{ background: 'linear-gradient(135deg, #12c2e9, #c471ed, #f64f59)' }} />
                <button onClick={() => setTextBg('linear-gradient(135deg, #0f2027, #203a43, #2c5364)')} style={{ background: 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)' }} />
              </div>
              
              <div className="admin-preview-controls">
                <button className="admin-action-btn cancel" onClick={() => setMode(null)}>Cancel</button>
                <button className="admin-action-btn upload" onClick={handleUpload} disabled={uploading || !textContent.trim()}>
                  {uploading ? 'Publishing...' : 'Publish Text Story'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

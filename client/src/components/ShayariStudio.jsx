import React, { useState, useRef, useEffect } from "react";
import * as htmlToImage from 'html-to-image';
import { X, Check, AlignLeft, AlignCenter, AlignRight, Type, Palette, Image as ImageIcon, Sparkles, Upload } from 'lucide-react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import "./ShayariStudio.css";

const GRADIENTS = [
  { name: "Midnight Purple", value: "linear-gradient(135deg, #2b5876 0%, #4e4376 100%)" },
  { name: "Royal Gold", value: "linear-gradient(135deg, #f7971e 0%, #ffd200 100%)" },
  { name: "Sunset Crimson", value: "linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)" },
  { name: "Deep Galaxy", value: "linear-gradient(135deg, #0f2027 0%, #203a43 200%, #2c5364 100%)" },
  { name: "Emerald Myst", value: "linear-gradient(135deg, #134e5e 0%, #71b280 100%)" },
  { name: "Rose Gold Dream", value: "linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%)" },
  { name: "Dark Velvet", value: "linear-gradient(135deg, #141e30 0%, #243b55 100%)" },
  { name: "Pure Black", value: "#000000" }
];

const TEXT_COLORS = [
  "#ffffff", "#f8fafc", "#fcd34d", "#fca5a5", "#93c5fd", "#86efac", "#d8b4fe", "#000000"
];

const FONTS = [
  { name: "Classic", value: "'Playfair Display', serif" },
  { name: "Poetic", value: "'Dancing Script', cursive" },
  { name: "Elegant", value: "'Cinzel', serif" },
  { name: "Modern", value: "'Inter', sans-serif" },
  { name: "Typewriter", value: "'Courier New', Courier, monospace" }
];

const TEMPLATES = [
  "Dil ki baat zubaan par aate aate ruk gayi...",
  "Raat bhar chand se teri baatein hoti rahi...",
  "Faasle mitane se kuch nahi hota, niyat saaf honi chahiye..."
];

export default function ShayariStudio({ onClose, onComplete }) {
  const [text, setText] = useState("");
  const [author, setAuthor] = useState("");
  
  // Style states
  const [bgGradient, setBgGradient] = useState(GRADIENTS[0].value);
  const [bgImage, setBgImage] = useState(null);
  const [textColor, setTextColor] = useState(TEXT_COLORS[0]);
  const [fontFamily, setFontFamily] = useState(FONTS[0].value);
  const [textAlign, setTextAlign] = useState("center");
  const [textEffect, setTextEffect] = useState("none"); // none, shadow, glow, neon
  const [fontSize, setFontSize] = useState(32);
  
  // UI states
  const [activeTab, setActiveTab] = useState("text"); // text, background, style, templates
  const [isFocused, setIsFocused] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const canvasRef = useRef(null);
  const textareaRef = useRef(null);
  const imageInputRef = useRef(null);
  const bgImgRef = useRef(null);

  // Crop states
  const [isCroppingImage, setIsCroppingImage] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [crop, setCrop] = useState({ unit: '%', width: 100, height: 100, aspect: 9 / 16 });
  const [completedCrop, setCompletedCrop] = useState(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCropImageSrc(URL.createObjectURL(file));
      setIsCroppingImage(true);
      // Reset input so the same file can be selected again
      e.target.value = '';
    }
  };

  const handleConfirmCrop = async () => {
    if (!completedCrop || !bgImgRef.current || !completedCrop.width || !completedCrop.height) return;
    
    const canvas = document.createElement('canvas');
    const scaleX = bgImgRef.current.naturalWidth / bgImgRef.current.width;
    const scaleY = bgImgRef.current.naturalHeight / bgImgRef.current.height;
    
    // Original crop dimensions in natural resolution
    const pixelWidth = completedCrop.width * scaleX;
    const pixelHeight = completedCrop.height * scaleY;
    
    // Constrain to max FHD to prevent massive base64 crashes/tiling bugs on mobile browsers
    const MAX_WIDTH = 1080;
    const MAX_HEIGHT = 1920;
    
    let drawWidth = pixelWidth;
    let drawHeight = pixelHeight;
    
    if (drawWidth > MAX_WIDTH) {
      const ratio = MAX_WIDTH / drawWidth;
      drawWidth = MAX_WIDTH;
      drawHeight = drawHeight * ratio;
    }
    if (drawHeight > MAX_HEIGHT) {
      const ratio = MAX_HEIGHT / drawHeight;
      drawHeight = MAX_HEIGHT;
      drawWidth = drawWidth * ratio;
    }
    
    canvas.width = drawWidth;
    canvas.height = drawHeight;
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(
      bgImgRef.current,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      pixelWidth,
      pixelHeight,
      0,
      0,
      drawWidth,
      drawHeight
    );
    
    const base64Image = canvas.toDataURL('image/jpeg', 0.85);
    setBgImage(base64Image);
    setBgGradient(null);
    setIsCroppingImage(false);
    setCropImageSrc(null);
  };

  useEffect(() => {
    // Focus textarea on load if empty
    if (!text && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // Auto-shrink text if it overflows the container
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    
    // Check if scroll height exceeds client height (meaning it's overflowing)
    if (el.scrollHeight > el.clientHeight && fontSize > 12) {
      setFontSize(prev => prev - 1);
    }
  }, [text, fontSize]);

  const handleDone = async () => {
    if (!canvasRef.current) return;
    if (!text.trim() && !author.trim()) {
      alert("Please write something first!");
      return;
    }

    try {
      setIsGenerating(true);
      // Generate image from the DOM node
      const dataUrl = await htmlToImage.toJpeg(canvasRef.current, { 
        quality: 0.95,
        pixelRatio: 2 // High resolution for mobile
      });
      
      // Pass the image and whether it uses a custom bg back to Dashboard
      onComplete(dataUrl, !!bgImage);
    } catch (err) {
      console.error("Error generating image:", err);
      alert("Failed to generate image. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const getEffectStyle = () => {
    switch(textEffect) {
      case "shadow": return { textShadow: "2px 4px 10px rgba(0,0,0,0.8)" };
      case "glow": return { textShadow: `0 0 10px ${textColor}, 0 0 20px ${textColor}` };
      case "neon": return { textShadow: "0 0 5px #fff, 0 0 10px #fff, 0 0 20px #ff00de, 0 0 30px #ff00de" };
      default: return {};
    }
  };

  return (
    <div className="shayari-studio-wrapper">
      {/* Top Navigation */}
      <div className="studio-top-nav">
        <button onClick={onClose}>
          <X size={28} />
        </button>
        <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>Shayari Creator</span>
        <button 
          className="nav-done-btn" 
          onClick={handleDone}
          disabled={isGenerating}
        >
          {isGenerating ? "Wait..." : "Done"}
        </button>
      </div>

      <div className="studio-main-area">
        {/* Canvas Preview Area */}
        <div className="canvas-container-wrapper" onClick={() => setActiveTab(null)}>
          <div 
            className="shayari-canvas" 
            ref={canvasRef}
            style={bgImage ? { 
              background: `url(${bgImage}) center/cover no-repeat`
            } : { 
              background: bgGradient 
            }}
          >
            <textarea
              ref={textareaRef}
              className="shayari-canvas-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={isFocused ? "" : "Dil ki baat yahan likhein..."}
              style={{
                '--shayari-text-color': textColor,
                fontFamily: fontFamily,
                textAlign: textAlign,
                fontSize: `${fontSize}px`,
                overflow: 'hidden',
                ...getEffectStyle()
              }}
            />
            {author && (
              <div 
                className="shayari-watermark"
                style={{ 
                  color: textColor, 
                  fontFamily: fontFamily,
                  ...getEffectStyle()
                }}
              >
                ~ {author}
              </div>
            )}
          </div>
        </div>

        {/* Controls Panel */}
        <div className="studio-controls-panel">
          <div className="control-tabs">
            <button className={`control-tab-btn ${activeTab === 'text' ? 'active' : ''}`} onClick={() => setActiveTab(activeTab === 'text' ? null : 'text')}>
              <Type size={16} style={{ display: 'inline', marginRight: '5px', verticalAlign: 'text-bottom' }} /> Text
            </button>
            <button className={`control-tab-btn ${activeTab === 'background' ? 'active' : ''}`} onClick={() => setActiveTab(activeTab === 'background' ? null : 'background')}>
              <ImageIcon size={16} style={{ display: 'inline', marginRight: '5px', verticalAlign: 'text-bottom' }} /> Background
            </button>
            <button className={`control-tab-btn ${activeTab === 'style' ? 'active' : ''}`} onClick={() => setActiveTab(activeTab === 'style' ? null : 'style')}>
              <Palette size={16} style={{ display: 'inline', marginRight: '5px', verticalAlign: 'text-bottom' }} /> Style
            </button>
            <button className={`control-tab-btn ${activeTab === 'templates' ? 'active' : ''}`} onClick={() => setActiveTab(activeTab === 'templates' ? null : 'templates')}>
              <Sparkles size={16} style={{ display: 'inline', marginRight: '5px', verticalAlign: 'text-bottom' }} /> Ideas
            </button>
          </div>

          {/* Tab Content: TEXT */}
          {activeTab === 'text' && (
            <div className="tab-content">
              <label style={{ display: 'block', marginBottom: '8px', color: '#cbd5e1', fontSize: '0.9rem' }}>Author / Pen Name</label>
              <input
                type="text"
                className="input-field"
                placeholder="Aapka Naam..."
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
              />
              <label style={{ display: 'block', margin: '15px 0 8px', color: '#cbd5e1', fontSize: '0.9rem' }}>Text Size</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '12px' }}>A</span>
                <input 
                  type="range" 
                  min="12" 
                  max="60" 
                  value={fontSize} 
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  style={{ flex: 1 }}
                />
                <span style={{ fontSize: '20px' }}>A</span>
              </div>
              
              <label style={{ display: 'block', margin: '15px 0 8px', color: '#cbd5e1', fontSize: '0.9rem' }}>Alignment</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className={`alignment-btn ${textAlign === 'left' ? 'active' : ''}`} onClick={() => setTextAlign('left')}>
                  <AlignLeft size={20} />
                </button>
                <button className={`alignment-btn ${textAlign === 'center' ? 'active' : ''}`} onClick={() => setTextAlign('center')}>
                  <AlignCenter size={20} />
                </button>
                <button className={`alignment-btn ${textAlign === 'right' ? 'active' : ''}`} onClick={() => setTextAlign('right')}>
                  <AlignRight size={20} />
                </button>
              </div>
            </div>
          )}

          {/* Tab Content: BACKGROUND */}
          {activeTab === 'background' && (
            <div className="tab-content">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <label style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>Background</label>
                <button 
                  onClick={() => imageInputRef.current?.click()}
                  style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '15px', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  <Upload size={14} /> Custom Image
                </button>
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={imageInputRef} 
                  style={{ display: 'none' }} 
                  onChange={handleImageUpload} 
                />
              </div>
              <div className="scroll-options-row">
                {GRADIENTS.map((grad, idx) => (
                  <div
                    key={idx}
                    className={`color-circle ${(bgGradient === grad.value && !bgImage) ? 'active' : ''}`}
                    style={{ background: grad.value }}
                    onClick={() => {
                      setBgGradient(grad.value);
                      setBgImage(null);
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Tab Content: STYLE */}
          {activeTab === 'style' && (
            <div className="tab-content">
              <label style={{ display: 'block', marginBottom: '10px', color: '#cbd5e1', fontSize: '0.9rem' }}>Font Style</label>
              <div className="scroll-options-row">
                {FONTS.map((font, idx) => (
                  <div
                    key={idx}
                    className={`font-preview-btn ${fontFamily === font.value ? 'active' : ''}`}
                    style={{ fontFamily: font.value }}
                    onClick={() => setFontFamily(font.value)}
                  >
                    <span style={{ fontSize: '1.2rem' }}>Aa</span>
                    <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>{font.name}</span>
                  </div>
                ))}
              </div>

              <label style={{ display: 'block', margin: '15px 0 10px', color: '#cbd5e1', fontSize: '0.9rem' }}>Text Color</label>
              <div className="scroll-options-row">
                {TEXT_COLORS.map((color, idx) => (
                  <div
                    key={idx}
                    className={`color-circle ${textColor === color ? 'active' : ''}`}
                    style={{ background: color, border: color === '#000000' ? '1px solid #475569' : '' }}
                    onClick={() => setTextColor(color)}
                  />
                ))}
              </div>

              <label style={{ display: 'block', margin: '15px 0 10px', color: '#cbd5e1', fontSize: '0.9rem' }}>Text Effects</label>
              <div className="scroll-options-row">
                {['none', 'shadow', 'glow', 'neon'].map((eff) => (
                  <button
                    key={eff}
                    className={`text-effect-btn ${textEffect === eff ? 'active' : ''}`}
                    onClick={() => setTextEffect(eff)}
                  >
                    {eff.charAt(0).toUpperCase() + eff.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tab Content: TEMPLATES */}
          {activeTab === 'templates' && (
            <div className="tab-content">
              <label style={{ display: 'block', marginBottom: '10px', color: '#cbd5e1', fontSize: '0.9rem' }}>Quick Ideas</label>
              <div>
                {TEMPLATES.map((tmpl, idx) => (
                  <div 
                    key={idx} 
                    className="template-chip"
                    onClick={() => setText(prev => prev ? prev + '\n' + tmpl : tmpl)}
                  >
                    {tmpl}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cropper Modal Overlay */}
      {isCroppingImage && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 14000, background: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ padding: '20px', background: '#1a1a1a', borderRadius: '20px', width: '90%', maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h3 style={{ color: '#fff', marginBottom: '15px' }}>Crop Background</h3>
            <div style={{ width: '100%', display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={9 / 16}
                style={{ maxHeight: '60vh' }}
              >
                <img
                  ref={bgImgRef}
                  src={cropImageSrc}
                  alt="Crop preview"
                  style={{ maxHeight: '60vh', maxWidth: '100%', display: 'block' }}
                />
              </ReactCrop>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', width: '100%' }}>
              <button 
                className="nav-done-btn" 
                style={{ flex: 1, background: '#333', color: '#fff' }}
                onClick={() => {
                  setIsCroppingImage(false);
                  setCropImageSrc(null);
                }}
              >
                Cancel
              </button>
              <button 
                className="nav-done-btn" 
                style={{ flex: 1 }}
                onClick={handleConfirmCrop}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

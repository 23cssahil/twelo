import React, { useState, useRef, useEffect } from "react";
import * as htmlToImage from 'html-to-image';
import { X, Check, AlignLeft, AlignCenter, AlignRight, Type, Palette, Image as ImageIcon, Sparkles } from 'lucide-react';
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
  const [textColor, setTextColor] = useState(TEXT_COLORS[0]);
  const [fontFamily, setFontFamily] = useState(FONTS[0].value);
  const [textAlign, setTextAlign] = useState("center");
  const [textEffect, setTextEffect] = useState("none"); // none, shadow, glow, neon
  
  // UI states
  const [activeTab, setActiveTab] = useState("text"); // text, background, style, templates
  const [isGenerating, setIsGenerating] = useState(false);
  
  const canvasRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    // Focus textarea on load if empty
    if (!text && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

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
      
      // Pass the image back to Dashboard
      onComplete(dataUrl);
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
        <div className="canvas-container-wrapper">
          <div 
            className="shayari-canvas" 
            ref={canvasRef}
            style={{ background: bgGradient }}
          >
            <textarea
              ref={textareaRef}
              className="shayari-canvas-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Dil ki baat yahan likhein..."
              style={{
                color: textColor,
                fontFamily: fontFamily,
                textAlign: textAlign,
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
          {/* Tabs */}
          <div className="control-tabs">
            <button className={`control-tab-btn ${activeTab === 'text' ? 'active' : ''}`} onClick={() => setActiveTab('text')}>
              <Type size={16} style={{ display: 'inline', marginRight: '5px', verticalAlign: 'text-bottom' }} /> Text
            </button>
            <button className={`control-tab-btn ${activeTab === 'background' ? 'active' : ''}`} onClick={() => setActiveTab('background')}>
              <ImageIcon size={16} style={{ display: 'inline', marginRight: '5px', verticalAlign: 'text-bottom' }} /> Background
            </button>
            <button className={`control-tab-btn ${activeTab === 'style' ? 'active' : ''}`} onClick={() => setActiveTab('style')}>
              <Palette size={16} style={{ display: 'inline', marginRight: '5px', verticalAlign: 'text-bottom' }} /> Style
            </button>
            <button className={`control-tab-btn ${activeTab === 'templates' ? 'active' : ''}`} onClick={() => setActiveTab('templates')}>
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
              <label style={{ display: 'block', marginBottom: '10px', color: '#cbd5e1', fontSize: '0.9rem' }}>Premium Gradients</label>
              <div className="scroll-options-row">
                {GRADIENTS.map((grad, idx) => (
                  <div
                    key={idx}
                    className={`color-circle ${bgGradient === grad.value ? 'active' : ''}`}
                    style={{ background: grad.value }}
                    onClick={() => setBgGradient(grad.value)}
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
    </div>
  );
}

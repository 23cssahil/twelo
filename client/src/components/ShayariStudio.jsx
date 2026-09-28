import React, { useState, useRef, useMemo } from "react";
import * as htmlToImage from 'html-to-image';
import {
  X, Check, AlignLeft, AlignCenter, AlignRight, Type, Palette,
  Image as ImageIcon, Sparkles, Upload, Trash2, Loader2,
  ArrowUp, Minus, ArrowDown
} from 'lucide-react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import "./ShayariStudio.css";

// Static presets (hoisted — never re-created per render).
const GRADIENTS = [
  { name: "Midnight Purple", value: "linear-gradient(135deg, #2b5876 0%, #4e4376 100%)" },
  { name: "Royal Gold", value: "linear-gradient(135deg, #f7971e 0%, #ffd200 100%)" },
  { name: "Sunset Crimson", value: "linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)" },
  { name: "Deep Galaxy", value: "linear-gradient(135deg, #0f2027 0%, #203a43 200%, #2c5364 100%)" },
  { name: "Emerald Myst", value: "linear-gradient(135deg, #134e5e 0%, #71b280 100%)" },
  { name: "Rose Gold Dream", value: "linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%)" },
  { name: "Dark Velvet", value: "linear-gradient(135deg, #141e30 0%, #243b55 100%)" },
  { name: "Brand Blue", value: "linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)" },
  { name: "Pure Black", value: "#000000" }
];

const TEXT_COLORS = [
  "#ffffff", "#f8fafc", "#fcd34d", "#fca5a5", "#93c5fd", "#86efac", "#d8b4fe", "#ff5fa2", "#000000"
];

const FONTS = [
  { name: "Classic", value: "'Playfair Display', serif" },
  { name: "Poetic", value: "'Dancing Script', cursive" },
  { name: "Elegant", value: "'Cinzel', serif" },
  { name: "Modern", value: "'Inter', sans-serif" },
  { name: "Typewriter", value: "'Courier New', Courier, monospace" }
];

const EFFECTS = ["none", "shadow", "glow", "neon"];
const VERTICALS = ["top", "middle", "bottom"];

const TEMPLATES = [
  "Dil ki baat zubaan par aate aate ruk gayi...",
  "Raat bhar chand se teri baatein hoti rahi...",
  "Faasle mitane se kuch nahi hota, niyat saaf honi chahiye...",
  "Khamoshi mein bhi ek shor hota hai, jo alfaz nahi de sakte.",
  "Waqt sab badal deta hai, bas kuch apne chhod jaata hai.",
  "Manzil unhi ko milti hai, jinke sapnon mein jaan hoti hai."
];

export default function ShayariStudio({ onClose, onComplete }) {
  // Content
  const [text, setText] = useState("");
  const [author, setAuthor] = useState("");

  // Style
  const [bgGradient, setBgGradient] = useState(GRADIENTS[0].value);
  const [bgImage, setBgImage] = useState(null);
  const [overlay, setOverlay] = useState(0); // readability dim, 0..80
  const [textColor, setTextColor] = useState(TEXT_COLORS[0]);
  const [fontFamily, setFontFamily] = useState(FONTS[0].value);
  const [textAlign, setTextAlign] = useState("center");
  const [vertical, setVertical] = useState("middle");
  const [textEffect, setTextEffect] = useState("none");
  const [fontSize, setFontSize] = useState(32);

  // UI
  const [activeTab, setActiveTab] = useState("text");
  const [isGenerating, setIsGenerating] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);

  // Refs
  const canvasRef = useRef(null);   // the export node (visible canvas)
  const editTextRef = useRef(null); // contenteditable surface
  const imageInputRef = useRef(null);
  const cropImgRef = useRef(null);  // <img> inside ReactCrop

  // Crop
  const [isCroppingImage, setIsCroppingImage] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [crop, setCrop] = useState({ unit: '%', width: 100, height: 100, aspect: 9 / 16 });
  const [completedCrop, setCompletedCrop] = useState(null);

  const effectStyle = useMemo(() => {
    switch (textEffect) {
      case "shadow": return { textShadow: "2px 4px 12px rgba(0,0,0,0.85)" };
      case "glow": return { textShadow: `0 0 8px ${textColor}, 0 0 18px ${textColor}, 0 0 32px ${textColor}66` };
      case "neon": return { textShadow: "0 0 4px #fff, 0 0 11px #fff, 0 0 19px #ff00de, 0 0 30px #ff00de" };
      default: return {};
    }
  }, [textEffect, textColor]);

  const justify = vertical === "top" ? "flex-start" : vertical === "bottom" ? "flex-end" : "center";

  // --- Editing helpers -------------------------------------------------------
  // We render text as a real contenteditable surface (not a <textarea>) so that
  // html-to-image captures the actual characters. State mirrors the DOM, but we
  // only push state -> DOM when the surface is NOT focused (avoids caret jumps).
  const pushToSurface = (value) => {
    const el = editTextRef.current;
    if (el && document.activeElement !== el) el.innerText = value;
  };

  const applyTemplate = (tmpl) => {
    const next = text ? text + '\n' + tmpl : tmpl;
    setText(next);
    pushToSurface(next);
  };

  const clearText = () => {
    setText("");
    if (editTextRef.current) editTextRef.current.innerText = "";
  };

  // --- Background image crop -------------------------------------------------
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setCropImageSrc(URL.createObjectURL(file));
      setIsCroppingImage(true);
      e.target.value = ''; // allow re-selecting the same file
    }
  };

  const handleConfirmCrop = () => {
    const img = cropImgRef.current;
    if (!completedCrop || !img || !completedCrop.width || !completedCrop.height) return;

    const dispW = img.width || 1;
    const dispH = img.height || 1;
    const scaleX = (img.naturalWidth || dispW) / dispW;
    const scaleY = (img.naturalHeight || dispH) / dispH;

    const pixelWidth = completedCrop.width * scaleX;
    const pixelHeight = completedCrop.height * scaleY;

    // Cap at FHD so we never build a giant base64 that crashes mobile browsers.
    const MAX_WIDTH = 1080, MAX_HEIGHT = 1920;
    let drawWidth = pixelWidth, drawHeight = pixelHeight;
    if (drawWidth > MAX_WIDTH) { const r = MAX_WIDTH / drawWidth; drawWidth = MAX_WIDTH; drawHeight *= r; }
    if (drawHeight > MAX_HEIGHT) { const r = MAX_HEIGHT / drawHeight; drawHeight = MAX_HEIGHT; drawWidth *= r; }

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, drawWidth);
    canvas.height = Math.max(1, drawHeight);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(
      img,
      completedCrop.x * scaleX, completedCrop.y * scaleY, pixelWidth, pixelHeight,
      0, 0, canvas.width, canvas.height
    );

    setBgImage(canvas.toDataURL('image/jpeg', 0.85));
    setBgGradient(null);
    setIsCroppingImage(false);
    setCropImageSrc(null);
    URL.revokeObjectURL(cropImageSrc);
  };

  // --- Export ----------------------------------------------------------------
  const handleDone = async () => {
    const node = canvasRef.current;
    if (!node) return;
    const current = editTextRef.current ? editTextRef.current.innerText : text;
    if (!current.trim() && !author.trim()) {
      alert("Please write something first!");
      return;
    }
    try {
      setIsGenerating(true);
      // Ensure web fonts are downloaded before capture so they render + embed.
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      const dataUrl = await htmlToImage.toJpeg(node, {
        quality: 0.92,
        pixelRatio: 2,       // ~2x for crisp mobile story output
        cacheBust: true,
        backgroundColor: '#000'
      });
      onComplete(dataUrl, !!bgImage);
    } catch (err) {
      console.error("ShayariStudio export failed:", err);
      alert("Failed to generate image. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="shayari-studio-wrapper">
      {/* Top bar */}
      <div className="studio-top-nav">
        <button className="icon-btn" onClick={onClose} aria-label="Close editor"><X size={26} /></button>
        <span className="studio-title">Shayari Creator</span>
        <button className="nav-done-btn" onClick={handleDone} disabled={isGenerating} aria-label="Done">
          {isGenerating ? <><Loader2 size={16} className="rotating" /> Wait</> : <><Check size={16} /> Done</>}
        </button>
      </div>

      <div className="studio-main-area">
        {/* Preview / export surface */}
        <div className="canvas-container-wrapper">
          <div
            className="shayari-canvas"
            ref={canvasRef}
            style={{
              background: bgImage ? `url(${bgImage}) center/cover no-repeat` : (bgGradient || '#000'),
              justifyContent: justify
            }}
          >
            {overlay > 0 && <div className="shayari-overlay" style={{ background: `rgba(0,0,0,${overlay / 100})` }} />}

            <div className="shayari-text-layer">
              {!text && <div className="shayari-placeholder" style={{ textAlign }}>Dil ki baat yahan likhein...</div>}
              <div
                ref={editTextRef}
                className="shayari-editable"
                contentEditable
                role="textbox"
                tabIndex={0}
                aria-label="Shayari text"
                inputMode="text"
                spellCheck={false}
                suppressContentEditableWarning
                onInput={(e) => setText(e.currentTarget.innerText)}
                onBlur={(e) => setText(e.currentTarget.innerText)}
                style={{
                  color: textColor,
                  fontFamily,
                  textAlign,
                  fontSize: `${fontSize}px`,
                  ...effectStyle
                }}
              />

              {/* Author sits in normal flow under the text (was absolute, so long
                  shayaris rendered right on top of the pen name). */}
              {author && (
                <div className="shayari-watermark" style={{ color: textColor, fontFamily, ...effectStyle }}>
                  ~ {author}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className={`studio-controls-panel ${panelCollapsed ? 'collapsed' : ''}`}>
          <div className="sheet-handle" onClick={() => setPanelCollapsed(v => !v)} aria-label="Minimize controls" title="Tap to minimize" />
          <div className="control-tabs">
            <button className={`control-tab-btn ${activeTab === 'text' ? 'active' : ''}`} onClick={() => setActiveTab('text')}>
              <Type size={16} /> Text
            </button>
            <button className={`control-tab-btn ${activeTab === 'background' ? 'active' : ''}`} onClick={() => setActiveTab('background')}>
              <ImageIcon size={16} /> Background
            </button>
            <button className={`control-tab-btn ${activeTab === 'style' ? 'active' : ''}`} onClick={() => setActiveTab('style')}>
              <Palette size={16} /> Style
            </button>
            <button className={`control-tab-btn ${activeTab === 'templates' ? 'active' : ''}`} onClick={() => setActiveTab('templates')}>
              <Sparkles size={16} /> Ideas
            </button>
          </div>

          {/* TEXT */}
          {activeTab === 'text' && (
            <div className="tab-content">
              <label className="field-label">Author / Pen Name</label>
              <input
                type="text"
                className="input-field"
                placeholder="Aapka Naam..."
                value={author}
                maxLength={40}
                onChange={(e) => setAuthor(e.target.value)}
              />

              <label className="field-label">Text Size <span className="field-value">{fontSize}px</span></label>
              <input
                type="range" className="range" min="14" max="64" value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
              />

              <label className="field-label">Alignment</label>
              <div className="seg-row">
                <button className={`seg-btn ${textAlign === 'left' ? 'active' : ''}`} onClick={() => setTextAlign('left')} aria-label="Align left"><AlignLeft size={20} /></button>
                <button className={`seg-btn ${textAlign === 'center' ? 'active' : ''}`} onClick={() => setTextAlign('center')} aria-label="Align center"><AlignCenter size={20} /></button>
                <button className={`seg-btn ${textAlign === 'right' ? 'active' : ''}`} onClick={() => setTextAlign('right')} aria-label="Align right"><AlignRight size={20} /></button>
              </div>

              <label className="field-label">Vertical Position</label>
              <div className="seg-row">
                <button className={`seg-btn ${vertical === 'top' ? 'active' : ''}`} onClick={() => setVertical('top')} aria-label="Top"><ArrowUp size={20} /></button>
                <button className={`seg-btn ${vertical === 'middle' ? 'active' : ''}`} onClick={() => setVertical('middle')} aria-label="Middle"><Minus size={20} /></button>
                <button className={`seg-btn ${vertical === 'bottom' ? 'active' : ''}`} onClick={() => setVertical('bottom')} aria-label="Bottom"><ArrowDown size={20} /></button>
              </div>

              <button className="ghost-btn" onClick={clearText}><Trash2 size={15} /> Clear text</button>
            </div>
          )}

          {/* BACKGROUND */}
          {activeTab === 'background' && (
            <div className="tab-content">
              <div className="row-between">
                <label className="field-label" style={{ margin: 0 }}>Background</label>
                <div className="inline-actions">
                  <button className="chip-btn" onClick={() => imageInputRef.current?.click()}><Upload size={14} /> Custom Image</button>
                  {bgImage && <button className="chip-btn danger" onClick={() => { setBgImage(null); setBgGradient(GRADIENTS[0].value); setOverlay(0); }}><Trash2 size={14} /> Remove</button>}
                </div>
              </div>
              <input type="file" accept="image/*" ref={imageInputRef} style={{ display: 'none' }} onChange={handleImageUpload} />

              <div className="scroll-options-row">
                {GRADIENTS.map((grad) => (
                  <div
                    key={grad.value}
                    title={grad.name}
                    className={`color-circle ${(!bgImage && bgGradient === grad.value) ? 'active' : ''}`}
                    style={{ background: grad.value }}
                    onClick={() => { setBgGradient(grad.value); setBgImage(null); }}
                  />
                ))}
              </div>

              <label className="field-label">Readability Shade <span className="field-value">{overlay}%</span></label>
              <input
                type="range" className="range" min="0" max="80" value={overlay}
                onChange={(e) => setOverlay(Number(e.target.value))}
              />
            </div>
          )}

          {/* STYLE */}
          {activeTab === 'style' && (
            <div className="tab-content">
              <label className="field-label">Font Style</label>
              <div className="scroll-options-row">
                {FONTS.map((font) => (
                  <div
                    key={font.value}
                    className={`font-preview-btn ${fontFamily === font.value ? 'active' : ''}`}
                    style={{ fontFamily: font.value }}
                    onClick={() => setFontFamily(font.value)}
                  >
                    <span style={{ fontSize: '1.2rem' }}>Aa</span>
                    <span style={{ fontSize: '0.78rem', opacity: 0.8 }}>{font.name}</span>
                  </div>
                ))}
              </div>

              <label className="field-label">Text Color</label>
              <div className="scroll-options-row">
                {TEXT_COLORS.map((color) => (
                  <div
                    key={color}
                    className={`color-circle ${textColor === color ? 'active' : ''}`}
                    style={{ background: color, border: color === '#000000' ? '1px solid #475569' : undefined }}
                    onClick={() => setTextColor(color)}
                  />
                ))}
              </div>

              <label className="field-label">Text Effects</label>
              <div className="scroll-options-row">
                {EFFECTS.map((eff) => (
                  <button key={eff} className={`text-effect-btn ${textEffect === eff ? 'active' : ''}`} onClick={() => setTextEffect(eff)}>
                    {eff.charAt(0).toUpperCase() + eff.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* IDEAS */}
          {activeTab === 'templates' && (
            <div className="tab-content">
              <label className="field-label">Quick Ideas — tap to add</label>
              {TEMPLATES.map((tmpl, idx) => (
                <div key={idx} className="template-chip" onClick={() => applyTemplate(tmpl)}>{tmpl}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Crop overlay */}
      {isCroppingImage && (
        <div className="crop-overlay">
          <div className="crop-card">
            <h3>Crop Background</h3>
            <div className="crop-stage">
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={9 / 16}
              >
                <img
                  ref={cropImgRef}
                  src={cropImageSrc}
                  alt="Crop preview"
                  style={{ maxHeight: '60vh', maxWidth: '100%', display: 'block' }}
                />
              </ReactCrop>
            </div>
            <div className="crop-actions">
              <button className="ghost-btn" onClick={() => { setIsCroppingImage(false); setCropImageSrc(null); URL.revokeObjectURL(cropImageSrc); }}>Cancel</button>
              <button className="nav-done-btn" onClick={handleConfirmCrop}><Check size={16} /> Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

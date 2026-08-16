import React, { useState } from "react";
import "./ShayariStudio.css";

const GRADIENTS = [
  { name: "Midnight Purple", value: "linear-gradient(135deg, #2b5876 0%, #4e4376 100%)" },
  { name: "Royal Gold", value: "linear-gradient(135deg, #f7971e 0%, #ffd200 100%)" },
  { name: "Sunset Crimson", value: "linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)" },
  { name: "Deep Galaxy", value: "linear-gradient(135deg, #0f2027 0%, #203a43 200%, #2c5364 100%)" },
  { name: "Emerald Myst", value: "linear-gradient(135deg, #134e5e 0%, #71b280 100%)" },
  { name: "Rose Gold Dream", value: "linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%)" }
];

const FONTS = [
  { name: "Classic Serif", value: "'Playfair Display', serif" },
  { name: "Poetic Handwriting", value: "'Dancing Script', cursive" },
  { name: "Modern Elegant", value: "'Cinzel', serif" },
  { name: "Clean Sans", value: "'Inter', sans-serif" }
];

const TEMPLATES = [
  "Dil ki baat zubaan par aate aate ruk gayi...",
  "Raat bhar chand se teri baatein hoti rahi...",
  "Faasle mitane se kuch nahi hota, niyat saaf honi chahiye..."
];

export default function ShayariStudio({ onClose }) {
  const [shayariText, setShayariText] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [selectedGradient, setSelectedGradient] = useState(GRADIENTS[0].value);
  const [selectedFont, setSelectedFont] = useState(FONTS[0].value);
  const [effect, setEffect] = useState("normal"); // glow, shadow, neon
  const [copied, setCopied] = useState(false);

  // Handle Copy
  const handleCopy = () => {
    const fullText = `${shayariText}\n\n~ ${authorName || "Anonymous"}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Insert Template
  const handleTemplateSelect = (template) => {
    setShayariText((prev) => (prev ? prev + "\n" + template : template));
  };

  return (
    <div className="shayari-studio-container">
      <header className="studio-header">
        <button className="close-btn-shayari" onClick={onClose}>&times;</button>
        <h1>✨ Shayari Creator Studio</h1>
        <p>Apne jazbaaton ko ek khoobsurat rang aur roop dein</p>
      </header>

      <div className="studio-workspace">
        {/* Left Side: Controls & Tools */}
        <div className="studio-controls">
          {/* Section 1: Unique Gradients */}
          <div className="control-group">
            <label>🎨 Choose Unique Background</label>
            <div className="gradient-options">
              {GRADIENTS.map((grad, idx) => (
                <button
                  key={idx}
                  style={{ background: grad.value }}
                  className={`grad-btn ${selectedGradient === grad.value ? "active" : ""}`}
                  onClick={() => setSelectedGradient(grad.value)}
                  title={grad.name}
                />
              ))}
            </div>
          </div>

          {/* Section 2: Font Selector */}
          <div className="control-group">
            <label>✍️ Typography / Font Style</label>
            <select
              value={selectedFont}
              onChange={(e) => setSelectedFont(e.target.value)}
              className="studio-select"
            >
              {FONTS.map((font, idx) => (
                <option key={idx} value={font.value}>
                  {font.name}
                </option>
              ))}
            </select>
          </div>

          {/* Section 3: Special Visual Effects */}
          <div className="control-group">
            <label>✨ Text Visual Effects</label>
            <div className="effect-buttons">
              <button
                className={effect === "normal" ? "active-eff" : ""}
                onClick={() => setEffect("normal")}
              >
                Normal
              </button>
              <button
                className={effect === "glow" ? "active-eff" : ""}
                onClick={() => setEffect("glow")}
              >
                Glow Effect
              </button>
              <button
                className={effect === "neon" ? "active-eff" : ""}
                onClick={() => setEffect("neon")}
              >
                Neon Touch
              </button>
            </div>
          </div>

          {/* Section 4: Quick Shayari Starters / Templates */}
          <div className="control-group">
            <label>💡 Quick Shayari Starters</label>
            <div className="template-chips">
              {TEMPLATES.map((tmpl, idx) => (
                <button key={idx} onClick={() => handleTemplateSelect(tmpl)} className="chip">
                  {tmpl.slice(0, 25)}...
                </button>
              ))}
            </div>
          </div>

          {/* Section 5: Author Watermark */}
          <div className="control-group">
            <label>🖋️ Author / Pen Name</label>
            <input
              type="text"
              placeholder="Aapka Naam ya Takhallus..."
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              className="studio-input"
            />
          </div>
          
          {/* Shayari Text Input */}
          <div className="control-group">
            <label>📜 Aapki Shayari</label>
            <textarea
              placeholder="Dil ki baat yahan likhein..."
              value={shayariText}
              onChange={(e) => setShayariText(e.target.value)}
              className="studio-input"
              style={{ minHeight: '100px', resize: 'vertical' }}
            />
          </div>
        </div>

        {/* Right Side: Live Preview Card */}
        <div className="studio-preview-pane">
          <div className="preview-label">Live Canvas Preview</div>
          <div
            className={`shayari-card effect-${effect}`}
            style={{ background: selectedGradient }}
          >
            <div
              className="shayari-text-content"
              style={{ fontFamily: selectedFont }}
            >
              {shayariText ? (
                shayariText.split("\n").map((line, i) => <p key={i}>{line || <br />}</p>)
              ) : (
                <span className="placeholder-text">Yahan aapki khubsoorat shayari dikhegi...</span>
              )}
            </div>
            {authorName && <div className="shayari-author" style={{ fontFamily: selectedFont }}>~ {authorName}</div>}
          </div>

          {/* Action Buttons */}
          <div className="studio-actions">
            <button className="action-btn primary" onClick={handleCopy}>
              {copied ? "✓ Copied!" : "📋 Copy Shayari"}
            </button>
            <button className="action-btn secondary" onClick={() => alert("Backend API integration pending (MERN DB saving)!")}>
              💾 Save to Database
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

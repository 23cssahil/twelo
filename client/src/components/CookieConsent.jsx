import React, { useState, useEffect } from 'react';

const CookieConsent = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('twelo_cookie_consent');
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('twelo_cookie_consent', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '80px', // slightly above mobile nav if any
      left: '50%',
      transform: 'translateX(-50%)',
      width: '90%',
      maxWidth: '600px',
      backgroundColor: '#121212',
      border: '1px solid #333',
      borderRadius: '12px',
      padding: '16px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      zIndex: 9999,
      boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
      fontFamily: 'var(--font-sans)',
      color: '#fff'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '15px' }}>
        <div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', color: '#fff' }}>We value your privacy</h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#a8a8a8', lineHeight: '1.5' }}>
            We use cookies to enhance your browsing experience, serve personalized ads or content, and analyze our traffic. By clicking "Accept", you consent to our use of cookies.
          </p>
        </div>
        <button 
          onClick={handleAccept}
          style={{
            background: 'var(--brand-blue)',
            color: '#fff',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '20px',
            fontWeight: '600',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'background 0.2s'
          }}
        >
          Accept
        </button>
      </div>
    </div>
  );
};

export default CookieConsent;

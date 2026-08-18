import React from 'react';

const AdBanner = () => {
  return (
    <div style={{ 
      margin: '10px 0 20px 0', 
      width: '100%', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      background: 'rgba(255,255,255,0.03)', 
      borderRadius: '15px', 
      overflow: 'hidden',
      maxHeight: '560px',
      minHeight: '260px',
      padding: '10px 0'
    }}>
      <iframe
        src="/ad.html"
        style={{ width: '300px', height: '250px', border: 'none', overflow: 'hidden' }}
        scrolling="no"
        frameBorder="0"
        title="Advertisement"
      ></iframe>
    </div>
  );
};

export default AdBanner;

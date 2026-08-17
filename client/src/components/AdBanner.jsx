import React, { useEffect, useRef } from 'react';

const AdBanner = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current && !containerRef.current.querySelector('script')) {
      const script = document.createElement('script');
      script.src = "https://pl30895199.effectivecpmnetwork.com/68a0807fea81fdc49bc8a49017e7e443/invoke.js";
      script.async = true;
      script.setAttribute('data-cfasync', 'false');
      containerRef.current.appendChild(script);
    }
  }, []);

  return (
    <div style={{ margin: '20px 0', width: '100%', display: 'flex', justifyContent: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: '15px', overflow: 'hidden' }}>
      <div ref={containerRef} id="container-68a0807fea81fdc49bc8a49017e7e443"></div>
    </div>
  );
};

export default AdBanner;

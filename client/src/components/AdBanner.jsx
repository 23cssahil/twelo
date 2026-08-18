import React from 'react';

const AdBanner = () => {
  const adHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; background: transparent; overflow: hidden; }
        </style>
      </head>
      <body>
        <script type="text/javascript">
          atOptions = {
            'key' : '68a0807fea81fdc49bc8a49017e7e443',
            'format' : 'iframe',
            'height' : 250,
            'width' : 300,
            'params' : {}
          };
        </script>
        <script type="text/javascript" src="https://pl30895199.effectivecpmnetwork.com/68a0807fea81fdc49bc8a49017e7e443/invoke.js"></script>
      </body>
    </html>
  `;

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
        srcDoc={adHtml}
        style={{ width: '300px', height: '250px', border: 'none', overflow: 'hidden' }}
        scrolling="no"
        frameBorder="0"
        title="Advertisement"
      ></iframe>
    </div>
  );
};

export default AdBanner;

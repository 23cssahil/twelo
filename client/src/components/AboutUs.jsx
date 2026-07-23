import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AboutUs() {
  const navigate = useNavigate();

  return (
    <div style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)', minHeight: '100vh', padding: '20px', fontFamily: 'var(--font-sans)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', position: 'sticky', top: 0, background: 'var(--bg-color)', zIndex: 10 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '8px', marginLeft: '-8px' }}>
          <ArrowLeft size={24} />
        </button>
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>About Us</h1>
      </div>
      
      <div style={{ maxWidth: '800px', margin: '0 auto', lineHeight: '1.6' }}>
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ color: 'var(--brand-blue)', marginBottom: '12px', fontSize: '1.2rem' }}>About The Developer</h2>
          <p style={{ color: '#ccc', marginBottom: '16px' }}>
            Twelo is crafted with passion by an independent developer dedicated to building seamless, real-time social experiences. We believe in creating platforms where people can connect easily and securely.
          </p>
        </div>

        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ color: 'var(--brand-blue)', marginBottom: '12px', fontSize: '1.2rem' }}>About This Website</h2>
          <p style={{ color: '#ccc', marginBottom: '16px' }}>
            Twelo is a modern platform that combines anonymous matchmaking and real-time chat with a dynamic social graph. Whether you want to talk to strangers around the globe or keep up with your followers, Twelo is built to keep you connected.
          </p>
        </div>

        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ color: '#fff', marginBottom: '16px', fontSize: '1.2rem', display: 'inline-block', borderBottom: '2px solid #2bd856', paddingBottom: '4px' }}>Special Thanks to Shivaling</h2>
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #00c6ff', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
            <p style={{ margin: 0, color: '#e0e0e0', fontSize: '1.05rem', lineHeight: '1.7' }}>
              A massive shoutout to our very 1st user, <strong style={{ color: '#fff' }}>Shivaling</strong> (<em>@shivalingbigaragaddi6429</em>). 
              <br/><br/>
              Thank you for your immense help in identifying bugs and improving the website! Your feedback has been invaluable to Twelo's journey and growth.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

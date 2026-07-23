import React from 'react';
import { ArrowLeft, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ContactUs() {
  const navigate = useNavigate();

  return (
    <div style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)', minHeight: '100vh', padding: '20px', fontFamily: 'var(--font-sans)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '8px', marginLeft: '-8px' }}>
          <ArrowLeft size={24} />
        </button>
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Contact Us</h1>
      </div>
      
      <div style={{ maxWidth: '800px', margin: '0 auto', lineHeight: '1.6', textAlign: 'center', marginTop: '40px' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>We'd love to hear from you!</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
          If you have any questions, feedback, or need support regarding our platform, please feel free to reach out to our team.
        </p>
        
        <a 
          href="mailto:admin@nexgenrewards.store" 
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '10px', 
            backgroundColor: 'var(--brand-blue)', 
            color: '#fff', 
            padding: '12px 24px', 
            borderRadius: '24px', 
            textDecoration: 'none',
            fontSize: '1.1rem',
            fontWeight: '600',
            transition: 'opacity 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
          onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
        >
          <Mail size={20} />
          Send us an Email
        </a>
        
        <div style={{ marginTop: '24px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          admin@nexgenrewards.store
        </div>
      </div>
    </div>
  );
}

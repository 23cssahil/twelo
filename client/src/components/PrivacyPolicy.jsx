import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)', minHeight: '100vh', padding: '20px', fontFamily: 'var(--font-sans)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '8px', marginLeft: '-8px' }}>
          <ArrowLeft size={24} />
        </button>
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Privacy Policy</h1>
      </div>
      
      <div style={{ maxWidth: '800px', margin: '0 auto', lineHeight: '1.6' }}>
        <p><strong>Effective Date:</strong> July 2026</p>
        
        <h2 style={{ marginTop: '24px', marginBottom: '12px', fontSize: '1.2rem', color: 'var(--brand-blue)' }}>1. Introduction</h2>
        <p>Welcome to Twelo. We value your privacy and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, and share your data when you use our platform.</p>

        <h2 style={{ marginTop: '24px', marginBottom: '12px', fontSize: '1.2rem', color: 'var(--brand-blue)' }}>2. Information We Collect</h2>
        <p>We collect the following types of information:</p>
        <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
          <li><strong>Account Data:</strong> Name, username, email address, age, gender, and country.</li>
          <li><strong>Content:</strong> Messages, follow requests, and connections you make on the platform.</li>
          <li><strong>Automatically Collected Data:</strong> IP addresses, device types, and usage statistics.</li>
        </ul>

        <h2 style={{ marginTop: '24px', marginBottom: '12px', fontSize: '1.2rem', color: 'var(--brand-blue)' }}>3. How We Use Your Information</h2>
        <p>We use your information to:</p>
        <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
          <li>Provide, maintain, and improve the Twelo platform.</li>
          <li>Facilitate real-time messaging, audio, and video calls.</li>
          <li>Personalize your experience (like assigning gender-based avatars).</li>
          <li>Ensure safety, security, and prevent fraudulent activities.</li>
        </ul>

        <h2 style={{ marginTop: '24px', marginBottom: '12px', fontSize: '1.2rem', color: 'var(--brand-blue)' }}>4. Account Deletion & Data Retention</h2>
        <p>You have the right to permanently delete your account at any time through the settings menu. When you delete your account:</p>
        <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
          <li>Your profile and personal data are removed from active databases.</li>
          <li>Your account will appear as "Deleted Account" to others you have interacted with.</li>
          <li>We may retain certain archived data for legal and security purposes.</li>
        </ul>

        <h2 style={{ marginTop: '24px', marginBottom: '12px', fontSize: '1.2rem', color: 'var(--brand-blue)' }}>5. Security</h2>
        <p>We implement industry-standard security measures to protect your data. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.</p>

        <h2 style={{ marginTop: '24px', marginBottom: '12px', fontSize: '1.2rem', color: 'var(--brand-blue)' }}>6. Contact Us</h2>
        <p>If you have any questions about this Privacy Policy, please contact our support team.</p>
        
        <div style={{ marginTop: '40px', paddingBottom: '40px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          &copy; {new Date().getFullYear()} Twelo. All rights reserved.
        </div>
      </div>
    </div>
  );
}

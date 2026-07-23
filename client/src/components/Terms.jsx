import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Terms() {
  const navigate = useNavigate();

  return (
    <div style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)', minHeight: '100vh', padding: '20px', fontFamily: 'var(--font-sans)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '8px', marginLeft: '-8px' }}>
          <ArrowLeft size={24} />
        </button>
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Terms & Conditions</h1>
      </div>
      
      <div style={{ maxWidth: '800px', margin: '0 auto', lineHeight: '1.6' }}>
        <p><strong>Effective Date:</strong> July 2026</p>
        
        <h2 style={{ marginTop: '24px', marginBottom: '12px', fontSize: '1.2rem', color: 'var(--brand-blue)' }}>1. Acceptance of Terms</h2>
        <p>By accessing or using our platform, you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you may not use our services.</p>

        <h2 style={{ marginTop: '24px', marginBottom: '12px', fontSize: '1.2rem', color: 'var(--brand-blue)' }}>2. User Guidelines & Acceptable Use</h2>
        <p>You agree to use our platform responsibly. You must not use our services to:</p>
        <ul style={{ marginLeft: '20px', marginBottom: '16px' }}>
          <li>Share illegal, harmful, or sexually explicit content.</li>
          <li>Harass, abuse, or threaten other users.</li>
          <li>Engage in spamming or unauthorized advertising.</li>
        </ul>
        <p>Violation of these guidelines may result in immediate termination of your account without notice.</p>

        <h2 style={{ marginTop: '24px', marginBottom: '12px', fontSize: '1.2rem', color: 'var(--brand-blue)' }}>3. Age Restrictions</h2>
        <p><strong>This application is strictly for users who are 18 years of age or older.</strong> By registering, you confirm that you meet this age requirement. Any accounts found to belong to minors will be permanently disabled.</p>

        <h2 style={{ marginTop: '24px', marginBottom: '12px', fontSize: '1.2rem', color: 'var(--brand-blue)' }}>4. Termination & Moderation</h2>
        <p>We reserve the right to suspend or terminate accounts that violate our terms or community guidelines. Moderation actions are final and non-negotiable.</p>

        <h2 style={{ marginTop: '24px', marginBottom: '12px', fontSize: '1.2rem', color: 'var(--brand-blue)' }}>5. Liability and Disclaimer</h2>
        <p>Our platform is provided "as is" without any warranties. We are not responsible for the content shared by users in anonymous or direct chats. You use the platform at your own risk.</p>
        
        <h2 style={{ marginTop: '24px', marginBottom: '12px', fontSize: '1.2rem', color: 'var(--brand-blue)' }}>6. Virtual Currency & Coins</h2>
        <p>Users receive 10 free coins daily for using the platform. These coins are provided solely as a promotional feature to enhance your experience and are strictly not linked to any ad engagement or external advertising mechanics.</p>

        <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid var(--border-color)', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          <p>If you have questions about these Terms, please contact our support team.</p>
        </div>
      </div>
    </div>
  );
}

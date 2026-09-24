import React, { useContext, useState } from 'react';
import { AuthContext } from '../App';
import { GoogleLogin } from '@react-oauth/google';

// Big-company style guest upsell: a lightweight, dismissible banner shown only to
// guest accounts, offering a one-tap upgrade to Google (which links the identity onto
// the SAME account, so all chats/friends/coins are preserved) and a recovery code that
// lets the guest restore their account on another device.
export default function GuestUpsell() {
  const { user, token, login, API_URL } = useContext(AuthContext);
  const [dismissed, setDismissed] = useState(false);
  const [modal, setModal] = useState(null); // 'signup' | 'code' | null
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  if (!user || !user.isGuest || dismissed) return null;

  const claimCode = localStorage.getItem('guestClaimCode') || '';

  const handleGoogleUpgrade = async (cred) => {
    setBusy(true);
    setMsg('');
    try {
      // Carry the guest token so the server promotes this exact account in place.
      const res = await fetch(`${API_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ token: cred.credential })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Upgrade failed');
      if (data.isNewUser) {
        // A brand-new Google account reached from inside the app — needs full onboarding.
        setMsg('Please finish sign-up from the login page.');
        return;
      }
      login(data.user, data.token); // isGuest now false → banner disappears
      localStorage.removeItem('guestClaimCode');
      setModal(null);
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  };

  const copyCode = () => { if (claimCode && navigator.clipboard) navigator.clipboard.writeText(claimCode); };

  return (
    <>
      {/* Floating banner (sits above the mobile bottom-nav) */}
      <div style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: '84px', zIndex: 9998, width: 'min(92%, 460px)', background: 'rgba(20,20,20,0.96)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '12px 14px', boxShadow: '0 12px 32px rgba(0,0,0,0.5)', color: '#fff', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ fontSize: '22px' }}>👻</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>You're browsing as a guest</div>
          <div style={{ fontSize: '0.78rem', color: '#a8a8a8' }}>Sign up to keep friends, chats & coins — takes a tap.</div>
        </div>
        <button onClick={() => setModal('signup')} style={{ background: 'linear-gradient(135deg,#00c6ff,#0072ff)', color: '#fff', border: 'none', borderRadius: '20px', padding: '8px 14px', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>Sign up</button>
        <button onClick={() => setDismissed(true)} aria-label="Dismiss" style={{ background: 'transparent', color: '#888', border: 'none', fontSize: '20px', cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}>×</button>
      </div>

      {/* Modal */}
      {modal && (
        <div onClick={() => setModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#151515', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '26px', width: '100%', maxWidth: '380px', color: '#fff', boxShadow: '0 20px 50px rgba(0,0,0,0.6)' }}>
            {modal === 'signup' && (
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ margin: '0 0 6px', fontSize: '1.3rem' }}>Save your account</h3>
                <p style={{ color: '#a8a8a8', fontSize: '0.9rem', marginTop: 0, marginBottom: '18px' }}>Link Google to keep everything. Your guest chats, friends & coins stay intact.</p>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px', minHeight: '44px' }}>
                  <GoogleLogin onSuccess={(c) => handleGoogleUpgrade(c)} onError={() => setMsg('Google sign-up failed. Please try again.')} useOneTap={false} theme="filled_black" shape="pill" size="large" text="continue_with" />
                </div>
                {busy && <p style={{ color: '#a8a8a8', fontSize: '0.85rem' }}>Linking your account…</p>}
                {msg && <p style={{ color: '#ff6b6b', fontSize: '0.85rem' }}>{msg}</p>}
                <button onClick={() => { setMsg(''); setModal('code'); }} style={{ background: 'none', border: 'none', color: 'var(--brand-blue)', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline', marginTop: '6px' }}>Or view my recovery code</button>
              </div>
            )}
            {modal === 'code' && (
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ margin: '0 0 6px', fontSize: '1.3rem' }}>Your recovery code</h3>
                <p style={{ color: '#a8a8a8', fontSize: '0.88rem', marginTop: 0, marginBottom: '16px' }}>Save this somewhere safe. It restores your guest account on any device — and you can still upgrade to Google later.</p>
                <div style={{ background: '#0d0d0d', border: '1px dashed #444', borderRadius: '12px', padding: '14px', fontSize: '1.15rem', letterSpacing: '2px', fontWeight: 700, marginBottom: '12px', wordBreak: 'break-all' }}>{claimCode || 'No code available'}</div>
                {claimCode && <button onClick={copyCode} style={{ background: '#262626', color: '#fff', border: '1px solid #444', borderRadius: '20px', padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>Copy code</button>}
                <div style={{ marginTop: '16px' }}><button onClick={() => { setMsg(''); setModal('signup'); }} style={{ background: 'none', border: 'none', color: 'var(--brand-blue)', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}>Back to Sign up</button></div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

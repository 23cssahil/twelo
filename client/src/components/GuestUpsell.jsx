import React, { useContext, useState } from 'react';
import { AuthContext } from '../App';
import { GoogleLogin } from '@react-oauth/google';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

const GOOGLE_CLIENT_ID = '440916901093-30lfk61qkml9b9bd6jb00bcot13csvsv.apps.googleusercontent.com';

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
  const [copied, setCopied] = useState(false);

  // First guest session after sign-up: show the recovery code immediately so it is
  // never missed (banner can be dismissed, and guests lose accounts without the code).
  // Declared above the early-return below to keep hook order stable.
  React.useEffect(() => {
    if (user?.isGuest && localStorage.getItem('guestClaimCode') && !localStorage.getItem('guestCodeSeen')) {
      localStorage.setItem('guestCodeSeen', '1');
      setModal('code');
    }
  }, [user?.isGuest]);

  if (!user || !user.isGuest || dismissed) return null;

  const claimCode = localStorage.getItem('guestClaimCode') || '';

  const handleGoogleUpgrade = async (idToken) => {
    setBusy(true);
    setMsg('');
    try {
      // Carry the guest token so the server promotes this exact account in place.
      const res = await fetch(`${API_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ token: idToken })
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

  // Native (Capacitor) upgrade: the web GIS popup is blocked in the WebView, so use
  // the GoogleAuth plugin (opens a real Chrome Custom Tab).
  const handleNativeGoogleUpgrade = async () => {
    setBusy(true);
    setMsg('');
    try {
      await GoogleAuth.initialize({ clientId: GOOGLE_CLIENT_ID, scopes: ['profile', 'email'], grantOfflineAccess: true });
      const googleUser = await GoogleAuth.signIn();
      const idToken = googleUser.authentication?.idToken;
      if (!idToken) throw new Error('Google sign-in returned no token.');
      await handleGoogleUpgrade(idToken);
    } catch (e) {
      setBusy(false);
      setMsg(e?.message && String(e.message).toLowerCase() !== 'cancelled login flow' ? e.message : 'Google link cancelled.');
    }
  };

  const copyCode = () => {
    if (!claimCode || !navigator.clipboard) return;
    navigator.clipboard.writeText(claimCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  // Save the code as a small .txt file so the guest keeps it even after uninstalling
  // the app (localStorage/claim code is wiped with the install).
  const downloadCode = () => {
    if (!claimCode) return;
    const lines = [
      'TWEO GUEST ACCOUNT RECOVERY CODE',
      '================================',
      '',
      `Username : @${user.username || 'guest'}`,
      `Code     : ${claimCode}`,
      `Saved on : ${new Date().toLocaleString()}`,
      '',
      'How to use: on the Twelo login screen tap "Have a guest recovery code?"',
      'and enter this code to restore the account on any device.',
      '',
      'WARNING: without this code the guest account and all its chats,',
      'friends and coins cannot be recovered if you log out or change phone.',
    ].join('\n');
    const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `twelo-recovery-code-${user.username || 'guest'}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  return (
    <>
      {/* Floating banner (sits above the mobile bottom-nav). Stacked layout: all text
          on top, actions in a full-width row below — reads like a premium card, not a toast. */}
      <div style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: '84px', zIndex: 9998, width: 'min(92%, 460px)', boxSizing: 'border-box', background: 'rgba(20,20,20,0.96)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '14px 16px', boxShadow: '0 12px 32px rgba(0,0,0,0.5)', color: '#fff' }}>
        <button onClick={() => setDismissed(true)} aria-label="Dismiss" style={{ position: 'absolute', top: '10px', right: '12px', background: 'transparent', color: '#888', border: 'none', fontSize: '20px', cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}>×</button>
        <div style={{ fontWeight: 700, fontSize: '0.95rem', paddingRight: '18px' }}>👻 You're browsing as a guest</div>
        <div style={{ fontSize: '0.8rem', color: '#a8a8a8', marginTop: '3px' }}>Sign up to keep friends, chats & coins — takes a tap.</div>
        {claimCode && <div style={{ fontSize: '0.76rem', color: '#fbbf24', marginTop: '6px' }}>⚠ Save your recovery code — without it your guest account can't be restored.</div>}
        <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
          <button onClick={() => setModal('signup')} style={{ flex: 1, background: 'var(--brand-blue, #0072ff)', color: '#fff', border: 'none', borderRadius: '12px', padding: '10px 14px', fontWeight: 700, fontSize: '0.86rem', cursor: 'pointer' }}>Sign up</button>
          {claimCode && <button onClick={() => { setMsg(''); setModal('code'); }} style={{ flex: 1, background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.35)', borderRadius: '12px', padding: '10px 14px', fontWeight: 600, fontSize: '0.86rem', cursor: 'pointer' }}>Recovery Code</button>}
        </div>
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
                  {Capacitor.isNativePlatform() ? (
                    <button
                      onClick={handleNativeGoogleUpgrade}
                      disabled={busy}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#1a1a1a', color: '#fff', border: '1px solid #333', borderRadius: '24px', padding: '11px 22px', fontSize: '1rem', fontWeight: 600, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}
                    >
                      <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="G" style={{ width: '20px', height: '20px' }} />
                      Continue with Google
                    </button>
                  ) : (
                    <GoogleLogin onSuccess={(c) => handleGoogleUpgrade(c.credential)} onError={() => setMsg('Google sign-up failed. Please try again.')} useOneTap={false} theme="filled_black" shape="pill" size="large" text="continue_with" />
                  )}
                </div>
                {busy && <p style={{ color: '#a8a8a8', fontSize: '0.85rem' }}>Linking your account…</p>}
                {msg && <p style={{ color: '#ff6b6b', fontSize: '0.85rem' }}>{msg}</p>}
                <button onClick={() => { setMsg(''); setModal('code'); }} style={{ background: 'none', border: 'none', color: 'var(--brand-blue)', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline', marginTop: '6px' }}>Or view my recovery code</button>
              </div>
            )}
            {modal === 'code' && (
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ margin: '0 0 6px', fontSize: '1.3rem' }}>Your recovery code</h3>
                <p style={{ color: '#a8a8a8', fontSize: '0.88rem', marginTop: 0, marginBottom: '10px' }}>This code is the <span style={{ color: '#fff', fontWeight: 600 }}>only way</span> to restore your guest account (@{user.username || 'guest'}) on any device — you can still upgrade to Google later.</p>
                <div style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.35)', color: '#fca5a5', borderRadius: '12px', padding: '10px 12px', fontSize: '0.82rem', marginBottom: '14px' }}>⚠ If you lose this code, your account, chats, friends & coins are gone forever.</div>
                <div style={{ background: '#0d0d0d', border: '1px dashed #444', borderRadius: '12px', padding: '14px', fontSize: '1.15rem', letterSpacing: '2px', fontWeight: 700, marginBottom: '12px', wordBreak: 'break-all' }}>{claimCode || 'No code available'}</div>
                {claimCode && (
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                    <button onClick={copyCode} style={{ background: copied ? 'rgba(34,197,94,0.15)' : '#262626', color: copied ? '#22c55e' : '#fff', border: `1px solid ${copied ? 'rgba(34,197,94,0.4)' : '#444'}`, borderRadius: '20px', padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s' }}>{copied ? '✓ Copied' : 'Copy code'}</button>
                    <button onClick={downloadCode} style={{ background: 'rgba(0,114,255,0.12)', color: '#4da3ff', border: '1px solid rgba(0,114,255,0.35)', borderRadius: '20px', padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>⬇ Download (.txt)</button>
                  </div>
                )}
                <div style={{ marginTop: '16px' }}><button onClick={() => { setMsg(''); setModal('signup'); }} style={{ background: 'none', border: 'none', color: 'var(--brand-blue)', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}>Back to Sign up</button></div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

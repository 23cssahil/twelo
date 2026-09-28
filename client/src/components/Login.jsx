import React, { useState, useRef, useContext } from 'react';
import { GoogleLogin, useGoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { AuthContext } from '../App';
import { useNavigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { WORLD_COUNTRIES } from '../utils/countries';

const getFlagEmoji = (countryCode) => {
  if (!countryCode) return '';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
};

export default function Login() {
  const { login, API_URL } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/';
  
  // Extract referral ID
  const queryParams = new URLSearchParams(location.search);
  const referredBy = queryParams.get('ref') || null;
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Onboarding state
  const [isNewUser, setIsNewUser] = useState(false);
  const [googleData, setGoogleData] = useState(null);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [country, setCountry] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [gender, setGender] = useState('');
  const [showRecover, setShowRecover] = useState(false);
  const [recoverCode, setRecoverCode] = useState('');
  const [guestMode, setGuestMode] = useState(false);
  // Username on the sign-up form: auto-suggested from the name (background availability
  // search), freely editable, with instant red/green feedback.
  const [username, setUsername] = useState('');
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState('idle'); // idle | checking | available | taken | invalid
  const usernameSeqRef = useRef(0);

  React.useEffect(() => {
    // Detect access_token returned in URL hash from direct Google OAuth redirect
    if (window.location.hash && window.location.hash.includes('access_token=')) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      if (accessToken) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
        verifyAccessToken(accessToken);
      }
    }
  }, []);

  // Pre-select the country from the device IP (guest + Google onboarding share this form).
  // Server resolves it with the same ip-api geo pipeline used when the account is created,
  // so the form value matches what gets stored. Never overrides a manual pick.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/geo`);
        if (!res.ok) return;
        const g = await res.json();
        if (cancelled || !g?.country) return;
        const match = WORLD_COUNTRIES.find(c => String(c.name).toLowerCase() === String(g.country).toLowerCase());
        if (match) setCountry(prev => prev || match.name);
      } catch (_) { /* fail-soft: user can still pick manually */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const verifyAccessToken = async (accessToken) => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`${API_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: accessToken })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to authenticate');

      if (data.isNewUser) {
        setGoogleData({ email: data.email, googleId: data.googleId });
        setIsNewUser(true);
      } else {
        login(data.user, data.token);
        navigate(from);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDirectGoogleLogin = () => {
    const clientId = '440916901093-30lfk61qkml9b9bd6jb00bcot13csvsv.apps.googleusercontent.com';
    const redirectUri = window.location.origin + window.location.pathname;
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=email%20profile&prompt=select_account`;
    window.location.href = googleAuthUrl;
  };

  const handleOAuthLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      verifyAccessToken(tokenResponse.access_token);
    },
    onError: (err) => {
      console.error('Google Popup Login Error:', err);
      handleDirectGoogleLogin();
    }
  });

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setLoading(true);
      setError('');
      const decoded = jwtDecode(credentialResponse.credential);
      
      const res = await fetch(`${API_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: credentialResponse.credential })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Failed to authenticate');
      }

      if (data.isNewUser) {
        setGoogleData({ email: data.email, googleId: data.googleId });
        setName(decoded.name || '');
        setIsNewUser(true);
      } else {
        login(data.user, data.token);
        navigate(from);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google Login Failed. Please try again.');
  };

  const handleNativeGoogleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Initialize before sign in (required on some devices/Capacitor versions)
      await GoogleAuth.initialize({
        clientId: '440916901093-30lfk61qkml9b9bd6jb00bcot13csvsv.apps.googleusercontent.com',
        scopes: ['profile', 'email'],
        grantOfflineAccess: true,
      });

      // Attempt native sign in
      const googleUser = await GoogleAuth.signIn();
      const idToken = googleUser.authentication.idToken;

      const res = await fetch(`${API_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: idToken })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Failed to authenticate');
      }

      if (data.isNewUser) {
        setGoogleData({ email: data.email, googleId: data.googleId });
        setName(googleUser.name || googleUser.displayName || '');
        setIsNewUser(true);
      } else {
        login(data.user, data.token);
        navigate(from);
      }
    } catch (err) {
      console.error(err);
      const errorMessage = err.message || JSON.stringify(err);
      alert('Native Google Login Error: ' + errorMessage);
      setError('Google Login Error: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteProfile = async (e) => {
    e.preventDefault();
    if (!name.trim() || !age || !country.trim() || !gender) {
      setError("Please fill out all fields");
      return;
    }
    if (!username.trim()) {
      setError("Please choose a username");
      return;
    }
    if (usernameStatus === 'taken') {
      setError("That username is already taken — pick another one");
      return;
    }
    if (usernameStatus === 'invalid' || !/^[a-z0-9_]{3,20}$/.test(username)) {
      setError("Username: 3–20 letters, numbers or underscore only");
      return;
    }
    
    try {
      setLoading(true);
      setError('');

      // Guest path: same form details, but create a guest account (no Google/email).
      if (guestMode) {
        const chosenCountryCode = WORLD_COUNTRIES.find(c => c.name === country)?.code || 'UN';
        const res = await fetch(`${API_URL}/api/auth/guest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, age, country, countryCode: chosenCountryCode, gender, username: slugifyUsername(username) })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Could not start guest session');
        if (data.claimCode) localStorage.setItem('guestClaimCode', data.claimCode);
        login(data.user, data.token);
        navigate(from);
        return;
      }

      const res = await fetch(`${API_URL}/api/auth/complete_profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email: googleData.email, googleId: googleData.googleId, age, country, gender, referredBy, username: slugifyUsername(username) })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        login(data.user, data.token);
        navigate(from);
      } else {
        setError(data.message || 'Failed to complete profile');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Guest sign-up now uses the same profile form as Google; this just opens it.
  const startGuestSignup = () => {
    setError('');
    setGuestMode(true);
    setIsNewUser(true);
  };

  // ── Username helpers ─────────────────────────────────────────────
  const slugifyUsername = (v) => String(v).toLowerCase().trim().replace(/[^a-z0-9_]+/g, '').slice(0, 20);
  const probeUsername = async (u) => {
    try {
      const r = await fetch(`${API_URL}/api/auth/check_username?username=${encodeURIComponent(u)}`);
      const d = await r.json();
      return d.available ? 'available' : (d.reason === 'invalid' ? 'invalid' : 'taken');
    } catch (_) { return 'idle'; }
  };

  // Auto-suggest: as the name is typed, derive a username from it and search the
  // background (name, name2, name3…) until a free one is found. Stops being smart
  // the moment the user edits the field themselves.
  React.useEffect(() => {
    if (usernameTouched) return;
    const seq = ++usernameSeqRef.current;
    const base = slugifyUsername(name);
    if (base.length < 3) { setUsername(''); setUsernameStatus('idle'); return; }
    setUsernameStatus('checking');
    (async () => {
      const candidates = [base];
      for (let i = 2; i <= 60 && candidates.length < 12; i++) candidates.push((base + i).slice(0, 20));
      for (const cand of candidates) {
        const st = await probeUsername(cand);
        if (seq !== usernameSeqRef.current) return; // a newer name keystroke superseded this run
        if (st === 'available') { setUsername(cand); setUsernameStatus('available'); return; }
        if (st === 'invalid') { setUsername(cand); setUsernameStatus('invalid'); return; }
      }
      setUsername(base); setUsernameStatus('taken');
    })();
  }, [name, usernameTouched]);

  // Manual edits: debounce a single availability probe → red/green hint.
  React.useEffect(() => {
    if (!usernameTouched) return;
    const seq = ++usernameSeqRef.current;
    if (!username) { setUsernameStatus('idle'); return; }
    if (!/^[a-z0-9_]{3,20}$/.test(username)) { setUsernameStatus('invalid'); return; }
    setUsernameStatus('checking');
    const t = setTimeout(async () => {
      const st = await probeUsername(username);
      if (seq === usernameSeqRef.current) setUsernameStatus(st);
    }, 350);
    return () => clearTimeout(t);
  }, [username, usernameTouched]);

  // Restore a previously-created guest account on this/new device via its claim code.
  const handleRecoverGuest = async (e) => {
    e.preventDefault();
    if (!recoverCode.trim()) { setError('Enter your recovery code'); return; }
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`${API_URL}/api/auth/guest/recover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimCode: recoverCode.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Invalid recovery code');
      localStorage.setItem('guestClaimCode', recoverCode.trim().toUpperCase());
      login(data.user, data.token);
      navigate(from);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card login-card">
        <h1 className="auth-logo">Twelo</h1>
        
        {error && <div className="auth-error">{error}</div>}
        
        {!isNewUser ? (
          <>
            <h2 style={{ textAlign: 'center', marginBottom: '6px', fontSize: '1.3rem', fontWeight: 600, color: '#ffffff' }}>
              Welcome to Twelo
            </h2>
            <p style={{ textAlign: 'center', color: '#8a8f98', marginBottom: '28px', fontSize: '0.88rem' }}>
              Log in with Google to continue.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', minHeight: '44px' }}>
              {Capacitor.isNativePlatform() ? (
                <button 
                  onClick={handleNativeGoogleLogin}
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#1f1f1f',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '12px 24px',
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    width: '280px',
                    justifyContent: 'center',
                    fontWeight: 600,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.35)'
                  }}
                >
                  <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="G" style={{ width: '20px', height: '20px' }} />
                  Continue with Google
                </button>
              ) : (
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  useOneTap={false}
                  theme="filled_black"
                  shape="pill"
                  size="large"
                  text="continue_with"
                  width="280"
                />
              )}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', marginTop: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '280px', color: '#565b63', fontSize: '0.75rem', margin: '4px 0 14px' }}>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }}></div>
                or
                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }}></div>
              </div>
              <button
                onClick={startGuestSignup}
                disabled={loading}
                style={{ width: '280px', padding: '12px 24px', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '12px', fontSize: '0.95rem', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                Continue as guest
              </button>
              <p style={{ color: '#6b7280', fontSize: '0.76rem', marginTop: '8px', textAlign: 'center', maxWidth: '280px' }}>
                No sign-up needed. Upgrade to Google anytime to keep your account.
              </p>
              {!showRecover ? (
                <span onClick={() => setShowRecover(true)} style={{ marginTop: '10px', fontSize: '0.82rem', color: 'var(--brand-blue, #0072ff)', cursor: 'pointer', fontWeight: 500 }}>Have a guest recovery code?</span>
              ) : (
                <form onSubmit={handleRecoverGuest} style={{ width: '280px', marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '14px' }}>
                  <label style={{ fontSize: '0.78rem', color: '#8a8f98', textAlign: 'left', fontWeight: 600, letterSpacing: '0.3px' }}>Enter your guest recovery code</label>
                  <input
                    type="text"
                    value={recoverCode}
                    onChange={(e) => setRecoverCode(e.target.value.toUpperCase())}
                    placeholder="TWG-XXXX-XXXX"
                    autoComplete="off"
                    spellCheck={false}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '11px 12px', borderRadius: '12px', background: '#0b0d10', border: '1px solid #26292f', color: '#ffffff', fontWeight: 700, fontSize: '1.05rem', letterSpacing: '2px', textTransform: 'uppercase', textAlign: 'center', outline: 'none' }}
                  />
                  <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px', borderRadius: '12px', border: 'none', background: 'var(--brand-blue, #0072ff)', color: '#fff', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer' }}>Restore Guest Account</button>
                </form>
              )}
            </div>

            <div style={{ marginTop: '22px', fontSize: '0.75rem', color: '#6b7280', textAlign: 'center', lineHeight: 1.7 }}>
              By logging in, you agree to our <br/>
              <span onClick={() => { window.scrollTo(0,0); navigate('/terms'); }} style={{ color: 'rgba(255,255,255,0.65)', cursor: 'pointer', textDecoration: 'underline' }}>Terms & Conditions</span> and <span onClick={() => { window.scrollTo(0,0); navigate('/privacy-policy'); }} style={{ color: 'rgba(255,255,255,0.65)', cursor: 'pointer', textDecoration: 'underline' }}>Privacy Policy</span>.<br/><br/>
              <span style={{ display: 'block', marginBottom: '12px', color: '#565b63', fontWeight: 500 }}>Twelo - Powered by NexGenRewards</span>
              Need help? <span onClick={() => { window.scrollTo(0,0); navigate('/contact-us'); }} style={{ color: 'rgba(255,255,255,0.65)', cursor: 'pointer', textDecoration: 'underline' }}>Contact Us</span>
            </div>
            {loading && <p style={{ textAlign: 'center', marginTop: '16px', color: '#8a8f98', fontSize: '0.85rem' }}>Please wait...</p>}
          </>
        ) : (
          <form onSubmit={handleCompleteProfile} className="onboarding-form">
            <div className="onboarding-header">
              {guestMode ? (
                <span
                  onClick={() => { setGuestMode(false); setIsNewUser(false); setName(''); setUsername(''); setUsernameTouched(false); setUsernameStatus('idle'); setError(''); }}
                  style={{ display: 'inline-block', color: 'var(--brand-blue)', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline', marginBottom: '8px' }}
                >
                  ← Back
                </span>
              ) : (
                <span className="step-badge">Final Step</span>
              )}
              <h2 style={{ textAlign: 'center', marginBottom: '8px', fontSize: '1.45rem', fontWeight: 700, color: '#ffffff' }}>
                Welcome to Twelo
              </h2>
              <p style={{ textAlign: 'center', color: '#8a8f98', marginBottom: '28px', fontSize: '0.92rem' }}>
                Let's set up your profile. What should we call you?
              </p>
            </div>
            
            <div className="form-group floating-group">
              <input
                id="guestName"
                name="guestName"
                type="text"
                className="auth-input floating-input"
                placeholder=" "
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
              <label className="floating-label">Your Full Name</label>
            </div>

            <div className="form-group floating-group">
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280', pointerEvents: 'none', fontSize: '1rem', zIndex: 1 }}>@</span>
                <input
                  id="guestUsername"
                  name="guestUsername"
                  type="text"
                  className="auth-input floating-input"
                  style={{ paddingLeft: '32px' }}
                  placeholder=" "
                  value={username}
                  onChange={(e) => { setUsernameTouched(true); setUsername(e.target.value.toLowerCase().replace(/\s+/g, '')); }}
                  required
                  maxLength={20}
                  autoComplete="off"
                  spellCheck={false}
                />
                <label className="floating-label" style={{ left: '32px' }}>Username</label>
              </div>
              {username && (
                <div style={{ marginTop: '6px', marginLeft: '4px', fontSize: '0.78rem', fontWeight: 500, color: usernameStatus === 'available' ? '#22c55e' : usernameStatus === 'taken' ? '#ef4444' : usernameStatus === 'invalid' ? '#ef4444' : '#8a8f98' }}>
                  {usernameStatus === 'available' && <>✓ @{username} is available</>}
                  {usernameStatus === 'taken' && <>✕ @{username} — account already exists, try another</>}
                  {usernameStatus === 'invalid' && <>Use 3–20 letters, numbers or underscore</>}
                  {usernameStatus === 'checking' && <>Checking availability…</>}
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '16px' }}>
              <div className="form-group floating-group" style={{ flex: 1 }}>
                <input
                  id="guestAge"
                  name="guestAge"
                  type="number"
                  className="auth-input floating-input"
                  placeholder=" "
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  required
                  min="13"
                  max="100"
                />
                <label className="floating-label">Age</label>
              </div>

              <div className="form-group floating-group" style={{ flex: 2, position: 'relative' }}>
                <div 
                  className="auth-input floating-input"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '12px 15px', color: country ? '#fff' : 'transparent' }}
                  onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                >
                  {country ? (
                    <>
                      <img 
                        src={`https://flagcdn.com/w20/${WORLD_COUNTRIES.find(c => c.name === country)?.code.toLowerCase() || 'un'}.png`} 
                        alt={country} 
                        style={{ borderRadius: '2px' }}
                      />
                      {country}
                    </>
                  ) : (
                    " "
                  )}
                </div>
                {showCountryDropdown && (
                  <div style={{ 
                    position: 'absolute', top: '100%', left: 0, right: 0, 
                    background: '#16181d', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', 
                    boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
                    maxHeight: '200px', overflowY: 'auto', zIndex: 10, marginTop: '5px' 
                  }}>
                    {WORLD_COUNTRIES.map((c) => (
                      <div 
                        key={c.code}
                        onClick={() => {
                          setCountry(c.name);
                          setShowCountryDropdown(false);
                        }}
                        style={{ padding: '10px 15px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#fff' }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#23262c'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <img src={`https://flagcdn.com/w20/${c.code.toLowerCase()}.png`} alt={c.code} style={{ borderRadius: '2px' }} />
                        {c.name}
                      </div>
                    ))}
                  </div>
                )}
                <label className="floating-label">Country</label>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: '#8a8f98', fontSize: '0.88rem', marginBottom: '8px', marginLeft: '4px' }}>Gender</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div 
                  onClick={() => setGender('male')}
                  style={{ flex: 1, padding: '12px', textAlign: 'center', borderRadius: '12px', cursor: 'pointer', border: gender === 'male' ? '1px solid var(--brand-blue, #0072ff)' : '1px solid #26292f', background: gender === 'male' ? 'rgba(0,114,255,0.12)' : 'transparent', color: gender === 'male' ? '#ffffff' : '#8a8f98', fontWeight: gender === 'male' ? 600 : 400, transition: 'all 0.25s' }}
                >
                  Male
                </div>
                <div 
                  onClick={() => setGender('female')}
                  style={{ flex: 1, padding: '12px', textAlign: 'center', borderRadius: '12px', cursor: 'pointer', border: gender === 'female' ? '1px solid var(--brand-blue, #0072ff)' : '1px solid #26292f', background: gender === 'female' ? 'rgba(0,114,255,0.12)' : 'transparent', color: gender === 'female' ? '#ffffff' : '#8a8f98', fontWeight: gender === 'female' ? 600 : 400, transition: 'all 0.25s' }}
                >
                  Female
                </div>
              </div>
            </div>
            
            <button 
              type="submit" 
              className="auth-button glow-btn" 
              disabled={loading}
              style={{ marginTop: '24px', position: 'relative', overflow: 'hidden' }}
            >
              {loading ? (
                <span className="spinner-text">Creating Account...</span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 600, fontSize: '1rem' }}>
                  Continue
                </span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

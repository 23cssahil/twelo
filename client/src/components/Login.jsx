import React, { useState, useContext } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { AuthContext } from '../App';
import { useNavigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

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
  const [gender, setGender] = useState('');

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
    
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`${API_URL}/api/auth/complete_profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email: googleData.email, googleId: googleData.googleId, age, country, gender, referredBy })
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

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-logo">Twelo</h1>
        
        {error && <div className="auth-error">{error}</div>}
        
        {!isNewUser ? (
          <>
            <h2 style={{ textAlign: 'center', marginBottom: '24px', fontSize: '1.2rem', color: '#f5f5f5' }}>
              Welcome to Twelo
            </h2>
            <p style={{ textAlign: 'center', color: '#a8a8a8', marginBottom: '32px', fontSize: '0.9rem' }}>
              Log in with Google to continue.
            </p>
            
            <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
              {Capacitor.isNativePlatform() ? (
                <button 
                  onClick={handleNativeGoogleLogin}
                  style={{
                    backgroundColor: '#1a1a1a',
                    color: '#fff',
                    border: '1px solid #333',
                    borderRadius: '24px',
                    padding: '12px 24px',
                    fontSize: '1rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    width: '280px',
                    justifyContent: 'center',
                    fontWeight: '500'
                  }}
                >
                  <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="G" style={{ width: '20px', height: '20px' }} />
                  Continue with Google
                </button>
              ) : (
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  theme="filled_black"
                  shape="pill"
                  size="large"
                  text="continue_with"
                  width="280"
                />
              )}
            </div>
            
            <div style={{ marginTop: '20px', fontSize: '0.8rem', color: '#a8a8a8', textAlign: 'center' }}>
              By logging in, you agree to our <br/>
              <span onClick={() => navigate('/terms')} style={{ color: 'var(--brand-blue)', cursor: 'pointer', textDecoration: 'underline' }}>Terms & Conditions</span> and <span onClick={() => navigate('/privacy-policy')} style={{ color: 'var(--brand-blue)', cursor: 'pointer', textDecoration: 'underline' }}>Privacy Policy</span>.<br/><br/>
              Need help? <span onClick={() => navigate('/contact-us')} style={{ color: 'var(--brand-blue)', cursor: 'pointer', textDecoration: 'underline' }}>Contact Us</span>
            </div>
            {loading && <p style={{ textAlign: 'center', marginTop: '16px', color: '#a8a8a8' }}>Please wait...</p>}
          </>
        ) : (
          <form onSubmit={handleCompleteProfile} className="onboarding-form">
            <div className="onboarding-header">
              <span className="step-badge">Final Step</span>
              <h2 className="gradient-text" style={{ textAlign: 'center', marginBottom: '8px', fontSize: '1.5rem', fontWeight: '700' }}>
                Welcome to Twelo
              </h2>
              <p style={{ textAlign: 'center', color: '#a8a8a8', marginBottom: '32px', fontSize: '0.95rem' }}>
                Let's set up your profile. What should we call you?
              </p>
            </div>
            
            <div className="form-group floating-group">
              <input
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
            
            <div style={{ display: 'flex', gap: '16px' }}>
              <div className="form-group floating-group" style={{ flex: 1 }}>
                <input
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

              <div className="form-group floating-group" style={{ flex: 2 }}>
                <select
                  className="auth-input floating-input"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  required
                  style={{ appearance: 'none', background: 'transparent' }}
                >
                  <option value="" disabled hidden></option>
                  <option value="India">🇮🇳 India</option>
                  <option value="USA">🇺🇸 USA</option>
                  <option value="UK">🇬🇧 UK</option>
                  <option value="Canada">🇨🇦 Canada</option>
                  <option value="Australia">🇦🇺 Australia</option>
                  <option value="Germany">🇩🇪 Germany</option>
                  <option value="France">🇫🇷 France</option>
                  <option value="Japan">🇯🇵 Japan</option>
                  <option value="Brazil">🇧🇷 Brazil</option>
                  <option value="Other">🌍 Other</option>
                </select>
                <label className="floating-label">Country</label>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: '#a8a8a8', fontSize: '0.9rem', marginBottom: '8px', marginLeft: '4px' }}>Gender</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div 
                  onClick={() => setGender('male')}
                  style={{ flex: 1, padding: '12px', textAlign: 'center', borderRadius: '12px', cursor: 'pointer', border: gender === 'male' ? '2px solid var(--brand-blue)' : '2px solid #333', background: gender === 'male' ? 'rgba(0,191,255,0.1)' : 'transparent', color: gender === 'male' ? 'var(--brand-blue)' : '#888', fontWeight: gender === 'male' ? 'bold' : 'normal', transition: 'all 0.3s' }}
                >
                  Male
                </div>
                <div 
                  onClick={() => setGender('female')}
                  style={{ flex: 1, padding: '12px', textAlign: 'center', borderRadius: '12px', cursor: 'pointer', border: gender === 'female' ? '2px solid var(--brand-blue)' : '2px solid #333', background: gender === 'female' ? 'rgba(0,191,255,0.1)' : 'transparent', color: gender === 'female' ? 'var(--brand-blue)' : '#888', fontWeight: gender === 'female' ? 'bold' : 'normal', transition: 'all 0.3s' }}
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
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 'bold', fontSize: '1rem' }}>
                  Join Twelo 🚀
                </span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

import React, { useState, useContext } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { AuthContext } from '../App';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const { login, API_URL } = useContext(AuthContext);
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Onboarding state
  const [isNewUser, setIsNewUser] = useState(false);
  const [googleData, setGoogleData] = useState(null);
  const [name, setName] = useState('');

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
        navigate('/');
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

  const handleCompleteProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`${API_URL}/api/auth/complete_profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email: googleData.email, googleId: googleData.googleId })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Failed to create profile');
      }

      login(data.user, data.token);
      navigate('/');
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
              Welcome back
            </h2>
            <p style={{ textAlign: 'center', color: '#a8a8a8', marginBottom: '32px', fontSize: '0.9rem' }}>
              Log in with Google to continue to Twelo.
            </p>
            
            <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                theme="filled_black"
                shape="pill"
                size="large"
                text="continue_with"
                width="280"
              />
            </div>
            {loading && <p style={{ textAlign: 'center', marginTop: '16px', color: '#a8a8a8' }}>Please wait...</p>}
          </>
        ) : (
          <form onSubmit={handleCompleteProfile}>
            <h2 style={{ textAlign: 'center', marginBottom: '16px', fontSize: '1.2rem', color: '#f5f5f5' }}>
              Just one more step
            </h2>
            <p style={{ textAlign: 'center', color: '#a8a8a8', marginBottom: '24px', fontSize: '0.9rem' }}>
              What should we call you?
            </p>
            
            <div className="form-group">
              <label>Your Name</label>
              <input
                type="text"
                className="auth-input"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>
            
            <button 
              type="submit" 
              className="auth-button" 
              disabled={loading}
              style={{ marginTop: '12px' }}
            >
              {loading ? 'Creating Account...' : 'Join Twelo'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

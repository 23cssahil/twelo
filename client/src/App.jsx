import React, { createContext, useState, useEffect, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import io from 'socket.io-client';
import { Capacitor } from '@capacitor/core';
import { AdMob } from '@capacitor-community/admob';
import { App as CapacitorApp } from '@capacitor/app';

import { GoogleOAuthProvider } from '@react-oauth/google';

const Login = React.lazy(() => import('./components/Login'));
const Signup = React.lazy(() => import('./components/Signup'));
const Dashboard = React.lazy(() => import('./components/Dashboard'));
const PrivacyPolicy = React.lazy(() => import('./components/PrivacyPolicy'));
const Terms = React.lazy(() => import('./components/Terms'));
const ContactUs = React.lazy(() => import('./components/ContactUs'));
const AboutUs = React.lazy(() => import('./components/AboutUs'));
const DeveloperAdmin = React.lazy(() => import('./components/DeveloperAdmin'));
const BotTrainingAdmin = React.lazy(() => import('./components/BotTrainingAdmin'));
const Landing = React.lazy(() => import('./components/Landing'));
const CookieConsent = React.lazy(() => import('./components/CookieConsent'));

export const AuthContext = createContext(null);
export const SocketContext = createContext(null);

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'https://twelo-backend.onrender.com';
  const GOOGLE_CLIENT_ID = '440916901093-30lfk61qkml9b9bd6jb00bcot13csvsv.apps.googleusercontent.com';

  useEffect(() => {
    // Handle Native Android Back Button
    const backButtonListener = CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        CapacitorApp.exitApp();
      }
    });

    return () => {
      backButtonListener.then(listener => listener.remove());
    };
  }, []);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser && token) {
      let parsedUser = JSON.parse(savedUser);
      if (parsedUser._id && !parsedUser.id) parsedUser.id = parsedUser._id;
      setUser(parsedUser);
    }
    
    // Initialize AdMob if running natively
    if (Capacitor.isNativePlatform()) {
      AdMob.initialize({
        initializeForTesting: false,
      }).catch(err => console.error("AdMob initialization failed", err));
    }

    setLoading(false);

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // setShowInstallPrompt(true); // Temporarily disabled as per user request
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [token]);

  // Handle socket connection
  useEffect(() => {
    if (user && token) {
      const newSocket = io(API_URL, { transports: ['websocket'] });
      setSocket(newSocket);

      newSocket.on('connect', () => {
        newSocket.emit('register', user.id);
      });

      newSocket.on('force_logout', (data) => {
        alert(data.message);
        logout();
      });

      return () => {
        newSocket.off('force_logout');
        newSocket.disconnect();
      };
    } else {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
    }
  }, [user, token]);

  const login = (userData, userToken) => {
    localStorage.setItem('token', userToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(userToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    let hasAlerted = false;
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
      try {
        const response = await originalFetch.apply(this, args);
        // If API returns 401 or 403, it means the token is expired/invalid
        if (response.status === 401 || response.status === 403) {
          const url = args[0] && typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url ? args[0].url : '');
          if (url.includes('/api/') && !url.includes('/api/auth/login')) {
            if (!hasAlerted) {
              hasAlerted = true;
              setSessionExpired(true);
            }
          }
        }
        return response;
      } catch (error) {
        throw error;
      }
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#000000', color: '#ffffff' }}>
        <h2>Loading...</h2>
      </div>
    );
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowInstallPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      {sessionExpired && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
          backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 999999, display: 'flex', 
          justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(8px)',
          fontFamily: "'Inter', sans-serif"
        }}>
          <div style={{
            background: '#151515', padding: '30px', borderRadius: '24px', 
            textAlign: 'center', color: '#fff', border: '1px solid rgba(255, 46, 99, 0.2)', 
            maxWidth: '320px', width: '85%', boxShadow: '0 20px 40px rgba(255, 46, 99, 0.15)',
            display: 'flex', flexDirection: 'column', alignItems: 'center'
          }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '30px', background: 'rgba(255, 46, 99, 0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '20px' }}>
              <span style={{ fontSize: '28px' }}>🔐</span>
            </div>
            <h2 style={{ color: '#ff2e63', marginBottom: '10px', fontSize: '22px', fontWeight: 'bold' }}>Session Expired</h2>
            <p style={{ marginBottom: '25px', color: '#aaaaaa', fontSize: '15px', lineHeight: '1.5' }}>
              For your security, you have been logged out. Please log in again to continue.
            </p>
            <button 
              onClick={() => {
                setSessionExpired(false);
                logout();
                window.location.href = '/login';
              }} 
              style={{
                background: 'linear-gradient(135deg, #ff2e63, #e5003f)', color: '#fff', border: 'none', 
                padding: '14px 25px', borderRadius: '14px', fontWeight: 'bold', fontSize: '16px',
                cursor: 'pointer', width: '100%', transition: 'all 0.3s ease'
              }}>
              Log In Again
            </button>
          </div>
        </div>
      )}
      <AuthContext.Provider value={{ user, token, login, logout, API_URL }}>
        <SocketContext.Provider value={socket}>
          <Router>
            <Suspense fallback={
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#000000', color: '#ffffff' }}>
                <h2>Loading...</h2>
              </div>
            }>
              <Routes>
                <Route path="/twelo-admin-6006390989" element={<DeveloperAdmin />} />
                <Route path="/admin" element={<DeveloperAdmin />} />
                <Route path="/admin/bot-training" element={<BotTrainingAdmin />} />
                <Route path="/login" element={!token ? <Login /> : <Navigate to="/" />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/contact-us" element={<ContactUs />} />
                <Route path="/about-us" element={<AboutUs />} />
                <Route path="/" element={!token ? <Landing /> : <Dashboard />} />
                <Route path="/*" element={token ? <Dashboard /> : <Navigate to="/login" state={{ from: window.location.pathname }} />} />
              </Routes>
            </Suspense>
            <CookieConsent />
          </Router>
        </SocketContext.Provider>
      </AuthContext.Provider>

      {showInstallPrompt && (
        <div style={{ position: 'fixed', bottom: '20px', left: 0, right: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none', zIndex: 99999 }}>
          <div style={{
            pointerEvents: 'auto',
            background: 'rgba(20, 20, 20, 0.95)',
            backdropFilter: 'blur(15px)',
            WebkitBackdropFilter: 'blur(15px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '20px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '15px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)',
            width: '90%',
            maxWidth: '380px',
            boxSizing: 'border-box',
            animation: 'pwaPopupSlideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}>
            <div style={{ width: '60px', height: '60px', background: 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)', borderRadius: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 10px 20px rgba(0, 114, 255, 0.3)' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            </div>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 5px 0', color: '#fff', fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.5px' }}>Install Twelo App</h3>
              <p style={{ margin: 0, color: '#a8a8a8', fontSize: '0.95rem', lineHeight: '1.4' }}>
                Add Twelo to your home screen for lightning-fast access and a better experience!
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '5px' }}>
              <button 
                onClick={() => setShowInstallPrompt(false)}
                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.95rem', transition: 'all 0.3s' }}
              >
                Later
              </button>
              <button 
                onClick={handleInstallClick}
                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)', color: '#fff', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.95rem', boxShadow: '0 8px 20px rgba(0, 114, 255, 0.4)', transition: 'all 0.3s' }}
              >
                Install Now
              </button>
            </div>
          </div>
        </div>
      )}
    </GoogleOAuthProvider>
  );
}

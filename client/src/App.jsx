import React, { createContext, useState, useEffect, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import io from 'socket.io-client';
import Login from './components/Login';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';
import PrivacyPolicy from './components/PrivacyPolicy';
import Terms from './components/Terms';
import ContactUs from './components/ContactUs';
import AboutUs from './components/AboutUs';
import DeveloperAdmin from './components/DeveloperAdmin';
import BotTrainingAdmin from './components/BotTrainingAdmin';
import Landing from './components/Landing';
import CookieConsent from './components/CookieConsent';
import { Capacitor } from '@capacitor/core';
import { AdMob } from '@capacitor-community/admob';
import { App as CapacitorApp } from '@capacitor/app';

import { GoogleOAuthProvider } from '@react-oauth/google';

export const AuthContext = createContext(null);
export const SocketContext = createContext(null);

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

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
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
      try {
        const response = await originalFetch.apply(this, args);
        // If API returns 401 or 403, it means the token is expired/invalid
        if (response.status === 401 || response.status === 403) {
          const url = args[0] && typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url ? args[0].url : '');
          if (url.includes('/api/')) {
            logout();
            alert("Your session has expired. Please log in again.");
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
      <AuthContext.Provider value={{ user, token, login, logout, API_URL }}>
        <SocketContext.Provider value={socket}>
          <Router>
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

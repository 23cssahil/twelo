import React, { createContext, useState, useEffect, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import io from 'socket.io-client';
import Login from './components/Login';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';
import PrivacyPolicy from './components/PrivacyPolicy';
import Terms from './components/Terms';
import AboutUs from './components/AboutUs';
import DeveloperAdmin from './components/DeveloperAdmin';
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
      setUser(JSON.parse(savedUser));
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
      setShowInstallPrompt(true);
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
              <Route path="/login" element={!token ? <Login /> : <Navigate to="/" />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/about-us" element={<AboutUs />} />
              <Route path="/*" element={token ? <Dashboard /> : <Navigate to="/login" state={{ from: window.location.pathname }} />} />
            </Routes>
          </Router>
        </SocketContext.Provider>
      </AuthContext.Provider>

      {showInstallPrompt && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '16px',
          right: '16px',
          margin: '0 auto',
          backgroundColor: '#111',
          border: '1px solid #333',
          borderRadius: '12px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          zIndex: 9999,
          width: '90%',
          maxWidth: '350px',
          boxSizing: 'border-box'
        }}>
          <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', textAlign: 'center' }}>Install Twelo App</h3>
          <p style={{ margin: 0, color: '#a8a8a8', fontSize: '0.9rem', textAlign: 'center' }}>
            Add Twelo to your home screen for a better experience!
          </p>
          <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
            <button 
              onClick={() => setShowInstallPrompt(false)}
              style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#333', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Later
            </button>
            <button 
              onClick={handleInstallClick}
              style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#0095f6', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Download Now
            </button>
          </div>
        </div>
      )}
    </GoogleOAuthProvider>
  );
}

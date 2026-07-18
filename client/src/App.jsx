import React, { createContext, useState, useEffect, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import io from 'socket.io-client';
import Login from './components/Login';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';

import { GoogleOAuthProvider } from '@react-oauth/google';

export const AuthContext = createContext(null);
export const SocketContext = createContext(null);

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || 'https://twelo-backend.onrender.com';
  const GOOGLE_CLIENT_ID = '860828724379-9cbabp7n5oa6dr15sm7k7rnvdu4meo9n.apps.googleusercontent.com';

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, [token]);

  // Handle socket connection
  useEffect(() => {
    if (user && token) {
      const newSocket = io(API_URL);
      setSocket(newSocket);

      newSocket.on('connect', () => {
        newSocket.emit('register', user.id);
      });

      return () => {
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

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthContext.Provider value={{ user, token, login, logout, API_URL }}>
        <SocketContext.Provider value={socket}>
          <Router>
            <Routes>
              <Route path="/login" element={!token ? <Login /> : <Navigate to="/" />} />
              <Route path="/*" element={token ? <Dashboard /> : <Navigate to="/login" />} />
            </Routes>
          </Router>
        </SocketContext.Provider>
      </AuthContext.Provider>
    </GoogleOAuthProvider>
  );
}

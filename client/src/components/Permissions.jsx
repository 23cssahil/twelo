import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import { useNavigate } from 'react-router-dom';
import { Camera, Mic, Bell, ChevronLeft, Check, AlertCircle } from 'lucide-react';

export default function Permissions() {
  const { token, API_URL } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [cameraState, setCameraState] = useState('prompt');
  const [micState, setMicState] = useState('prompt');
  const [pushState, setPushState] = useState('prompt');

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    // Notification
    if ('Notification' in window) {
      setPushState(Notification.permission);
    } else {
      setPushState('unsupported');
    }

    // Camera & Mic
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const camPerm = await navigator.permissions.query({ name: 'camera' });
        setCameraState(camPerm.state);
        camPerm.onchange = () => setCameraState(camPerm.state);

        const micPerm = await navigator.permissions.query({ name: 'microphone' });
        setMicState(micPerm.state);
        micPerm.onchange = () => setMicState(micPerm.state);
      }
    } catch (err) {
      console.log('Permissions API not fully supported for media', err);
    }
  };

  const requestCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      checkPermissions();
    } catch (err) {
      setCameraState('denied');
    }
  };

  const requestMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      checkPermissions();
    } catch (err) {
      setMicState('denied');
    }
  };

  const setupWebPush = async () => {
    try {
      const permission = await Notification.requestPermission();
      setPushState(permission);
      
      if (permission === 'granted' && 'serviceWorker' in navigator && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.ready;
        
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          const vapidPublicKey = 'BKZ4Be1x-eWdYF_3Rh5ATnXYspYye1t7XY0KeiGkNbPxY5QnF_Bwc7PUkrF69G5-SuyVQvd6myaSYv6m4WC5AxA';
          const convertedVapidKey = (base64String => {
            const padding = '='.repeat((4 - base64String.length % 4) % 4);
            const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
            const rawData = window.atob(base64);
            const outputArray = new Uint8Array(rawData.length);
            for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
            return outputArray;
          })(vapidPublicKey);

          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedVapidKey
          });
        }
        
        await fetch(`${API_URL}/api/users/subscribe`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(subscription)
        });
      }
    } catch (err) {
      console.error('Web Push Setup Error:', err);
    }
  };

  const renderStatus = (state) => {
    if (state === 'granted') return <span style={{ color: '#2bd856', display: 'flex', alignItems: 'center', gap: '5px' }}><Check size={16} /> Allowed</span>;
    if (state === 'denied') return <span style={{ color: '#ff4b4b', display: 'flex', alignItems: 'center', gap: '5px' }}><AlertCircle size={16} /> Blocked</span>;
    if (state === 'unsupported') return <span style={{ color: '#a8a8a8' }}>Unsupported</span>;
    return <span style={{ color: '#f5a623' }}>Not Requested</span>;
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-color)', color: '#fff', padding: '20px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <button 
          onClick={() => navigate('/')}
          style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', padding: '10px 0', marginBottom: '20px' }}
        >
          <ChevronLeft /> Back to Dashboard
        </button>

        <h1 style={{ fontSize: '2rem', marginBottom: '30px', fontWeight: '800' }}>Permissions</h1>
        
        <div style={{ background: '#1a1a1a', borderRadius: '15px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Notifications */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #333', paddingBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <div style={{ width: '40px', height: '40px', background: '#333', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bell size={20} color="#fff" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Push Notifications</h3>
                <p style={{ margin: '5px 0 0 0', fontSize: '0.85rem', color: '#a8a8a8' }}>Get alerts for new messages</p>
                <div style={{ marginTop: '5px', fontSize: '0.85rem' }}>{renderStatus(pushState)}</div>
              </div>
            </div>
            {pushState !== 'granted' && pushState !== 'denied' && pushState !== 'unsupported' && (
              <button onClick={setupWebPush} className="premium-btn primary" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
                Enable
              </button>
            )}
            {pushState === 'denied' && (
              <span style={{ fontSize: '0.8rem', color: '#a8a8a8' }}>Unblock in browser site settings</span>
            )}
          </div>

          {/* Camera */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #333', paddingBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <div style={{ width: '40px', height: '40px', background: '#333', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Camera size={20} color="#fff" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Camera Access</h3>
                <p style={{ margin: '5px 0 0 0', fontSize: '0.85rem', color: '#a8a8a8' }}>Take photos directly in chat</p>
                <div style={{ marginTop: '5px', fontSize: '0.85rem' }}>{renderStatus(cameraState)}</div>
              </div>
            </div>
            {cameraState !== 'granted' && cameraState !== 'denied' && (
              <button onClick={requestCamera} className="premium-btn primary" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
                Allow
              </button>
            )}
            {cameraState === 'denied' && (
              <span style={{ fontSize: '0.8rem', color: '#a8a8a8' }}>Unblock in browser site settings</span>
            )}
          </div>

          {/* Microphone */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <div style={{ width: '40px', height: '40px', background: '#333', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Mic size={20} color="#fff" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Microphone Access</h3>
                <p style={{ margin: '5px 0 0 0', fontSize: '0.85rem', color: '#a8a8a8' }}>Send voice notes</p>
                <div style={{ marginTop: '5px', fontSize: '0.85rem' }}>{renderStatus(micState)}</div>
              </div>
            </div>
            {micState !== 'granted' && micState !== 'denied' && (
              <button onClick={requestMic} className="premium-btn primary" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
                Allow
              </button>
            )}
            {micState === 'denied' && (
              <span style={{ fontSize: '0.8rem', color: '#a8a8a8' }}>Unblock in browser site settings</span>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

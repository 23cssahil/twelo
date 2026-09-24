// Native (Capacitor) push wiring. This is intentionally inert in the web/PWA build:
// every entry point first checks Capacitor.isNativePlatform(), so the browser keeps
// using the existing service-worker web-push path and nothing here runs or is bundled
// into behaviour on the web.
//
// On the packaged Android app it:
//   1. asks for the Android 13+ notification permission (system prompt),
//   2. registers with Firebase Cloud Messaging (needs google-services.json in the app),
//   3. forwards the FCM device token to the backend (/api/users/fcm-token) so the
//      server can deliver chat / like / comment / follow notifications while the app is
//      closed. The backend send path (sendToUserDevices) is already wired for this.
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

let wired = false;
// Latest API_URL / token so the (once-attached) FCM listeners always authenticate with
// the current session even after a re-login rotates the JWT.
let _API_URL = null;
let _authToken = null;
// Local user preference: an explicit opt-out ('false') survives app restarts so the
// mount-time auto-register does not silently undo a "notifications off" choice.
const PREF_KEY = 'twelo_native_push';

export function isNativeApp() {
  try {
    return Capacitor.isNativePlatform();
  } catch (e) {
    return false;
  }
}

function _sendToken(value) {
  if (!_API_URL || !_authToken) return Promise.resolve();
  return fetch(`${_API_URL}/api/users/fcm-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${_authToken}` },
    body: JSON.stringify({ token: value })
  }).catch((e) => {
    // Offline / transient - retried on next login or token refresh.
    console.warn('FCM token sync failed:', e);
  });
}

function _ensureWired() {
  if (wired) return;
  wired = true;
  PushNotifications.addListener('registration', (token) => { _sendToken(token.value); });
  PushNotifications.addListener('registrationError', (err) => {
    // Most common cause during development: google-services.json is missing.
    console.warn('FCM registration error (add android/app/google-services.json to enable push):', err);
  });
  // Token can rotate; keep the server copy fresh.
  PushNotifications.addListener('tokenRefresh', (token) => { _sendToken(token.value); });
}

// Register the device for push and sync its token to the backend. Safe to call on
// every login / token change; listeners are attached only once.
export function initNativePush(API_URL, authToken) {
  if (!isNativeApp() || !authToken) return;
  _API_URL = API_URL;
  _authToken = authToken;
  _ensureWired();
  // Honour an explicit opt-out made in the app's notification toggle.
  try { if (localStorage.getItem(PREF_KEY) === 'false') return; } catch (e) {}
  PushNotifications.requestPermissions().then((status) => {
    if (status.receive === 'granted') PushNotifications.register();
  }).catch(() => {});
}

// Request the OS permission and register for FCM. Returns the resulting permission
// state ('granted' | 'denied' | 'prompt' | 'error' | 'unsupported') so the caller can
// reflect it in the UI without ever touching the (unsupported) web-push service worker.
export async function enableNativePush(API_URL, authToken) {
  if (!isNativeApp()) return 'unsupported';
  _API_URL = API_URL;
  _authToken = authToken;
  _ensureWired();
  try {
    const status = await PushNotifications.requestPermissions();
    if (status.receive === 'granted') {
      try { localStorage.setItem(PREF_KEY, 'true'); } catch (e) {}
      PushNotifications.register();
      return 'granted';
    }
    return status.receive || 'denied';
  } catch (e) {
    return 'error';
  }
}

// Opt out: clear the stored FCM token server-side so pushes stop to this device, and
// remember the choice so the next launch does not re-register automatically.
export async function disableNativePush(API_URL, authToken) {
  if (!isNativeApp()) return;
  try { localStorage.setItem(PREF_KEY, 'false'); } catch (e) {}
  _API_URL = API_URL;
  _authToken = authToken;
  await _sendToken('');
}

// Current OS notification permission state for the toggle's initial reflection.
export async function getNativePushStatus() {
  if (!isNativeApp()) return 'unsupported';
  try {
    const p = await PushNotifications.checkPermissions();
    return p.receive; // 'granted' | 'denied' | 'prompt' | 'limited' | 'unknown'
  } catch (e) {
    return 'unknown';
  }
}

// Clear the stored token on logout so the server stops pushing to this device/user.
export async function clearNativePushToken(API_URL, authToken) {
  if (!isNativeApp() || !authToken) return;
  try {
    await fetch(`${API_URL}/api/users/fcm-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
      body: JSON.stringify({ token: '' })
    });
  } catch (e) {}
}

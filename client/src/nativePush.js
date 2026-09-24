// Native (Capacitor) push wiring. This is intentionally inert in the web/PWA build:
// every entry point first checks Capacitor.isNativePlatform(), so the browser keeps
// using the existing service-worker web-push path and nothing here runs or is bundled
// into behaviour on the web.
//
// On the packaged Android app it:
//   1. creates the "twelo_default" notification channel (Android 8+ drops pushes that
//      target a non-existent channel — this was why closed-app notifications never
//      appeared in the shade),
//   2. asks for the Android 13+ notification permission (system prompt),
//   3. registers with Firebase Cloud Messaging (needs google-services.json in the app),
//   4. forwards the FCM device token to the backend (/api/users/fcm-token) so the
//      server can deliver chat / like / comment / follow notifications while the app is
//      closed, and shows a tray notification when a push arrives in the foreground.
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';

// Must match the channelId the backend sends (sendToUserDevices -> android.notification.channelId).
const CHANNEL_ID = 'twelo_default';
let wired = false;
let channelReady = false;
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
    console.warn('FCM token sync failed:', e);
  });
}

// Create the high-importance channel so background/killed pushes are shown by the
// system in the notification shade with a heads-up + vibration.
async function _ensureChannel() {
  if (channelReady) return;
  try {
    if (Capacitor.getPlatform() === 'android') {
      await LocalNotifications.createChannel({
        id: CHANNEL_ID,
        name: 'Twelo',
        description: 'Chats, likes, comments and follow activity',
        importance: 5, // MAX -> heads-up
        visibility: 1,
        vibration: true,
        lights: true,
        audio: { critical: false }
      });
    }
    channelReady = true;
  } catch (e) {
    // Older/other platforms or already-created channel: safe to ignore.
    console.warn('Notification channel setup skipped:', e && e.message);
    channelReady = true;
  }
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
  // Foreground: the system does NOT auto-display a push while the app is open, so we
  // surface it ourselves in the shade (matches what the user expects from other apps).
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    try {
      LocalNotifications.schedule({
        notifications: [{
          id: Math.floor(Date.now() % 1000000000),
          title: notification.title || 'Twelo',
          body: notification.body || '',
          channel: CHANNEL_ID
        }]
      }).catch(() => {});
    } catch (e) {}
  });
}

// Register the device for push and sync its token to the backend. Safe to call on
// every login / token change; listeners are attached only once.
export async function initNativePush(API_URL, authToken) {
  if (!isNativeApp() || !authToken) return;
  _API_URL = API_URL;
  _authToken = authToken;
  await _ensureChannel();
  _ensureWired();
  // Honour an explicit opt-out made in the app's notification toggle.
  try { if (localStorage.getItem(PREF_KEY) === 'false') return; } catch (e) {}
  try {
    const status = await PushNotifications.requestPermissions();
    if (status.receive === 'granted') {
      PushNotifications.register();
      // Reflect the OS grant back into the stored preference so the toggle reads "on".
      if (localStorage.getItem(PREF_KEY) == null) { try { localStorage.setItem(PREF_KEY, 'true'); } catch (e) {} }
    }
  } catch (e) {}
}

// Request the OS permission and register for FCM. Returns the resulting permission
// state ('granted' | 'denied' | 'prompt' | 'error' | 'unsupported') so the caller can
// reflect it in the UI without ever touching the (unsupported) web-push service worker.
export async function enableNativePush(API_URL, authToken) {
  if (!isNativeApp()) return 'unsupported';
  _API_URL = API_URL;
  _authToken = authToken;
  await _ensureChannel();
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

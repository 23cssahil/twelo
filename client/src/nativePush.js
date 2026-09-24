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

export function isNativeApp() {
  try {
    return Capacitor.isNativePlatform();
  } catch (e) {
    return false;
  }
}

// Register the device for push and sync its token to the backend. Safe to call on
// every login / token change; listeners are attached only once.
export function initNativePush(API_URL, authToken) {
  if (!isNativeApp() || !authToken) return;

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`
  };

  const sendToken = async (value) => {
    try {
      await fetch(`${API_URL}/api/users/fcm-token`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ token: value })
      });
    } catch (e) {
      // Offline / transient - retried on next login or token refresh.
      console.warn('FCM token sync failed:', e);
    }
  };

  if (!wired) {
    wired = true;

    PushNotifications.addListener('registration', (token) => {
      sendToken(token.value);
    });

    PushNotifications.addListener('registrationError', (err) => {
      // Most common cause during development: google-services.json is missing.
      console.warn('FCM registration error (add android/app/google-services.json to enable push):', err);
    });

    // Token can rotate; keep the server copy fresh.
    PushNotifications.addListener('tokenRefresh', (token) => {
      sendToken(token.value);
    });
  }

  // Ask for permission, then register. requestPermission triggers the OS prompt.
  PushNotifications.requestPermissions().then((status) => {
    if (status.receive === 'granted') {
      PushNotifications.register();
    }
  }).catch(() => {});
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

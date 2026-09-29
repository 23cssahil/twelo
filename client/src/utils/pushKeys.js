// Shared web-push (VAPID) helpers. The public key is fetched from the backend so the
// browser subscribes with the SAME key pair the server signs payloads with — a key
// rotated in Render env then needs no client rebuild. The fallback constant matches
// the currently deployed VAPID_PUBLIC_KEY and is only used if the request fails.
const FALLBACK_VAPID_PUBLIC_KEY = 'BHHjikPJmo65telNYVDpol9W3V8-m11yVuPPjh1JSS5TjnSE8FxZK7IOlqY74h50ofgRjSsJf1d8qxM76jSoh7E';

export async function getVapidPublicKey(API_URL) {
  try {
    const r = await fetch(`${API_URL}/api/push/vapid_public_key`);
    const d = await r.json();
    if (d && d.publicKey) return d.publicKey;
  } catch (e) {}
  return FALLBACK_VAPID_PUBLIC_KEY;
}

// Web Push applicationServerKey expects a Uint8Array of the raw key; browsers are
// picky about URL-safe base64, so normalize before decoding.
export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

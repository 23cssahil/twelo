self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  // Drop any stale runtime caches so a fresh deploy is reflected immediately,
  // then take control of open tabs at once.
  e.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.map((n) => caches.delete(n))))
      .then(() => clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});

// --- Tiny IndexedDB store for the session token posted by the app (PUSH_AUTH), so an
// inline notification reply can call the API even after the worker was terminated. ---
function _idb(mode, value) {
  return new Promise((resolve, reject) => {
    const openReq = indexedDB.open('twelo_push', 1);
    openReq.onupgradeneeded = () => openReq.result.createObjectStore('auth');
    openReq.onerror = () => reject(openReq.error);
    openReq.onsuccess = () => {
      const db = openReq.result;
      const tx = db.transaction('auth', mode);
      const store = tx.objectStore('auth');
      // value === null in readwrite mode => delete the cached session (logout).
      const req = mode === 'readwrite' ? (value === null ? store.delete('session') : store.put(value, 'session')) : store.get('session');
      req.onsuccess = () => { resolve(req.result); db.close(); };
      req.onerror = () => { reject(req.error); db.close(); };
    };
  });
}

self.addEventListener('push', function(e) {
  let payload = { title: 'Notification', body: 'You have a new message', icon: '/icon-192.png' };
  
  if (e.data) {
    try {
      payload = e.data.json();
    } catch(err) {
      payload.body = e.data.text();
    }
  }

  e.waitUntil(
    // Check if any app window is currently focused (user is on the site)
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const isAppFocused = clientList.some(client => client.visibilityState === 'visible');
      
      // If user is actively on the site, DON'T show push notification
      // The in-app toast will handle it instead
      if (isAppFocused) {
        return;
      }

      // User is away — show the push notification
      const notificationTag = 'chat-' + payload.title;

      return self.registration.getNotifications({ tag: notificationTag }).then((notifications) => {
        let newBody = payload.body;
        
        if (notifications && notifications.length > 0) {
          const existingBody = notifications[0].body;
          const messages = existingBody.split('\n');
          const lastMessage = messages[messages.length - 1];
          
          if (lastMessage !== payload.body) {
            newBody = existingBody + '\n' + payload.body;
          } else {
            newBody = existingBody;
          }
          
          notifications[0].close();
        }

        const options = {
          body: newBody,
          icon: payload.icon || '/icon-192.png',
          badge: '/badge.png',
          tag: notificationTag,
          vibrate: [200, 100, 200, 100, 200, 100, 200],
          requireInteraction: true,
          renotify: true,
          data: {
            url: payload.url || '/'
          }
        };

        // Message pushes (url carries ?chat=<id>) get an inline text-reply box so the
        // user can answer straight from the notification shade.
        const chatMatch = String(payload.url || '').match(/chat=([^&]+)/);
        if (chatMatch) {
          options.data.chatId = chatMatch[1];
          options.actions = [{ action: 'reply', type: 'text', title: 'Reply', placeholder: 'Type a reply\u2026' }];
        }

        return self.registration.showNotification(payload.title, options);
      });
    })
  );
});

// When user clicks the notification, open/focus the app and hand it the target URL
// (e.g. "/?chat=<id>") so it can deep-link straight into the conversation.
self.addEventListener('notificationclick', function(e) {
  // Inline reply: send it through the API right here; do NOT open the app.
  if (e.action === 'reply') {
    e.notification.close();
    const text = String(e.reply || '').trim();
    const chatId = (e.notification.data && e.notification.data.chatId) || '';
    e.waitUntil(text && chatId ? _sendReply(chatId, text) : Promise.resolve());
    return;
  }
  e.notification.close();
  const targetUrl = e.notification.data?.url || '/';
  
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Try to focus an existing window and tell it where to go
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if ('focus' in client) {
          client.postMessage({ type: 'PUSH_NAVIGATE', url: targetUrl });
          return client.focus();
        }
      }
      // No window open — open one straight at the target
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Listen for messages from the app to clear notifications / cache reply credentials
self.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'CLEAR_NOTIFICATIONS') {
    e.waitUntil(
      self.registration.getNotifications().then((notifications) => {
        notifications.forEach(n => n.close());
      })
    );
  }
  if (e.data && e.data.type === 'PUSH_AUTH' && e.data.token) {
    e.waitUntil(_idb('readwrite', { token: e.data.token, apiBase: e.data.apiBase || '' }).catch(() => {}));
  }
  // Logout: drop the cached reply session and close any lingering notifications so a
  // logged-out device stops acting on (and replying to) pushes.
  if (e.data && e.data.type === 'CLEAR_PUSH_AUTH') {
    e.waitUntil(Promise.all([
      _idb('readwrite', null).catch(() => {}),
      self.registration.getNotifications().then(ns => ns.forEach(n => n.close())).catch(() => {})
    ]));
  }
});

// POST an inline reply using the cached session token; surface a small confirmation
// (or a "open the app" hint when the cached session has expired).
async function _sendReply(chatId, text) {
  try {
    const auth = await _idb('readonly');
    if (!auth || !auth.token) throw new Error('no cached session');
    const r = await fetch(`${auth.apiBase}/api/push/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth.token}` },
      body: JSON.stringify({ to: chatId, text })
    });
    if (r.ok) {
      await self.registration.showNotification('Reply sent', { body: text, icon: '/icon-192.png', tag: 'reply-sent' });
    } else {
      await self.registration.showNotification('Reply not sent', {
        body: r.status === 401 ? 'Your session expired \u2014 open Twelo and reply from the chat.' : 'Could not send your reply \u2014 open Twelo to try again.',
        icon: '/icon-192.png', tag: 'reply-failed'
      });
    }
  } catch (err) {
    await self.registration.showNotification('Reply not sent', { body: 'Open Twelo and reply from the chat.', icon: '/icon-192.png', tag: 'reply-failed' });
  }
}

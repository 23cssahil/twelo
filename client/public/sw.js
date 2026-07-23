self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});

self.addEventListener('push', function(e) {
  let payload = { title: 'Notification', body: 'You have a new message', icon: '/icon-192.png' };
  
  if (e.data) {
    try {
      payload = e.data.json();
    } catch(err) {
      payload.body = e.data.text();
    }
  }

  const options = {
    body: payload.body,
    icon: payload.icon || '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200, 100, 200, 100, 200],
    requireInteraction: true,
    data: {
      url: payload.url || '/'
    }
  };

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      let isFocused = false;
      for (let i = 0; i < clientList.length; i++) {
        if (clientList[i].focused) {
          isFocused = true;
          break;
        }
      }
      
      if (!isFocused) {
        return self.registration.showNotification(payload.title, options);
      }
    })
  );
});

self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(e.notification.data.url || '/');
      }
    })
  );
});

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
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

        return self.registration.showNotification(payload.title, options);
      });
    })
  );
});

// When user clicks the notification, open/focus the app
self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  const targetUrl = e.notification.data?.url || '/';
  
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Try to focus an existing window
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if ('focus' in client) {
          return client.focus();
        }
      }
      // No window open — open one
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Listen for messages from the app to clear notifications
self.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'CLEAR_NOTIFICATIONS') {
    e.waitUntil(
      self.registration.getNotifications().then((notifications) => {
        notifications.forEach(n => n.close());
      })
    );
  }
});

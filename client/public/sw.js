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

  // Use the title (Sender Name) as the tag to group notifications from the same person
  const notificationTag = 'chat-' + payload.title;

  e.waitUntil(
    self.registration.getNotifications({ tag: notificationTag }).then((notifications) => {
      let newBody = payload.body;
      
      // If there's already an unread notification from this person, append the message
      if (notifications && notifications.length > 0) {
        const existingBody = notifications[0].body;
        newBody = existingBody + '\n' + payload.body;
        notifications[0].close(); // Close old one to cleanly replace
      }

      const options = {
        body: newBody,
        icon: payload.icon || '/icon-192.png',
        badge: '/icon-192.png',
        tag: notificationTag,
        vibrate: [200, 100, 200, 100, 200, 100, 200],
        requireInteraction: true,
        renotify: true, // Alert the user again even if we are replacing an existing notification
        data: {
          url: '/dev'
        }
      };

      return self.registration.showNotification(payload.title, options);
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

const CACHE = 'auronix-shell-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('push', event => {
  let data = { title: 'Auronix Commerce', body: 'You have a new update.', href: '/seller/notifications' };
  try { data = { ...data, ...(event.data ? event.data.json() : {}) }; } catch {}
  event.waitUntil(self.registration.showNotification(data.title, { body: data.body, icon: '/auronix-mark.svg', badge: '/auronix-mark.svg', tag: 'auronix-partner-update', data: { href: data.href }, renotify: true }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const href = new URL(event.notification.data?.href || '/seller/notifications', self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => { const client = clients.find(item => item.url.startsWith(self.location.origin)); if (client) { client.navigate(href); return client.focus(); } return self.clients.openWindow(href); }));
});

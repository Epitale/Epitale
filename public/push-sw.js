// Réception des notifications push (importé par le service worker de la PWA).
self.addEventListener('push', (event) => {
  let payload = {}
  try { payload = event.data ? event.data.json() : {} } catch (e) { payload = { title: 'Epitale', body: event.data ? event.data.text() : '' } }
  // Message FCM « data » : les champs sont dans payload.data ; sinon dans payload.notification ou à la racine.
  const p = payload.data || payload.notification || payload
  event.waitUntil(self.registration.showNotification(p.title || 'Epitale', {
    body: p.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: p.tag || undefined,
    data: { url: p.url || '/' },
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) if ('focus' in c) return c.focus()
    return self.clients.openWindow(url)
  }))
})

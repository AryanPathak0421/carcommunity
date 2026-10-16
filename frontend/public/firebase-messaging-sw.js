/* eslint-disable no-undef */
// Firebase Cloud Messaging service worker — handles push notifications
// while the CarCommunity app/tab is closed or in the background.
// NOTE: service workers can't read Vite env vars, so the public web config
// is inlined here. Keep it in sync with src/lib/firebase.js.

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyD4iAyXjO4UXZqnXiZ7qYTi_WFF18NzjVA',
  authDomain: 'labourchowck.firebaseapp.com',
  projectId: 'labourchowck',
  storageBucket: 'labourchowck.firebasestorage.app',
  messagingSenderId: '894889908263',
  appId: '1:894889908263:web:2ce3fba6abc9476eba1602',
})

const messaging = firebase.messaging()

// Data-only messages (no `notification` payload) need to be displayed manually.
// Messages carrying a `notification` payload are displayed by the SDK automatically.
messaging.onBackgroundMessage((payload) => {
  if (payload.notification) return

  const title = payload.data?.title || 'CarCommunity'
  const body = payload.data?.body || 'You have a new notification'
  self.registration.showNotification(title, {
    body,
    icon: '/icon-192.png',
    badge: '/favicon-32.png',
    data: payload.data || {},
    tag: payload.data?.type || 'carcommunity',
  })
})

// Open (or focus) the app at the notification's deep link when clicked.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const link = event.notification?.data?.link || event.notification?.data?.FCM_MSG?.data?.link || '/'
  const url = new URL(link, self.location.origin).href

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === url && 'focus' in client) return client.focus()
      }
      for (const client of windowClients) {
        if ('navigate' in client && 'focus' in client) {
          return client.focus().then(() => client.navigate(url))
        }
      }
      return clients.openWindow(url)
    }),
  )
})

// ---- PWA: installable + offline shell ---------------------------------------
// Same worker as push so only one registration owns the "/" scope.
const SHELL_CACHE = 'cc-shell-v1'
const ASSET_CACHE = 'cc-assets-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((c) => c.add('/')).catch(() => {}))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL_CACHE && k !== ASSET_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  // Never cache live data.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io/')) return

  // Page loads: network first (always fresh), fall back to the cached shell offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(SHELL_CACHE).then((c) => c.put('/', copy))
          return res
        })
        .catch(() => caches.match('/')),
    )
    return
  }

  // Hashed build files and images never change under the same URL: cache first.
  if (url.pathname.startsWith('/assets/') || /\.(png|webp|jpg|svg|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone()
              caches.open(ASSET_CACHE).then((c) => c.put(req, copy))
            }
            return res
          }),
      ),
    )
  }
})

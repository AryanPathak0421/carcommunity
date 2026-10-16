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

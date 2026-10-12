import { initializeApp } from 'firebase/app'
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging'

// Public web config — safe to expose; env vars allow per-environment overrides.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyD4iAyXjO4UXZqnXiZ7qYTi_WFF18NzjVA',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'labourchowck.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'labourchowck',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'labourchowck.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '894889908263',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:894889908263:web:2ce3fba6abc9476eba1602',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-VME8E5BZDB',
}

const VAPID_KEY =
  import.meta.env.VITE_FIREBASE_VAPID_KEY ||
  'BDE-_LLOF5d7gJqjuCJniWWHNgEiBmAEy1ONqGtXQbrxag1Ur9Z3vj9H28cJvSXHvbWwJid_6zWEzvbDKgaCybA'

export const firebaseApp = initializeApp(firebaseConfig)

let messagingPromise = null

/** Messaging instance, or null when the browser doesn't support web push (e.g. iOS Safari < 16.4, http origins). */
export const getMessagingIfSupported = () => {
  if (!messagingPromise) {
    messagingPromise = isSupported()
      .then((supported) => (supported ? getMessaging(firebaseApp) : null))
      .catch(() => null)
  }
  return messagingPromise
}

/**
 * Full push setup: register the service worker, ask permission, fetch the FCM token.
 * Returns the token string, or null if unsupported / permission denied.
 */
export const requestFcmToken = async () => {
  const messaging = await getMessagingIfSupported()
  if (!messaging) return null
  if (typeof Notification === 'undefined' || !('serviceWorker' in navigator)) return null

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return null

  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')

  try {
    return await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    })
  } catch (error) {
    console.warn('[push] Failed to get FCM token:', error)
    return null
  }
}

/** Subscribe to foreground FCM messages. Returns an unsubscribe function. */
export const onForegroundMessage = async (callback) => {
  const messaging = await getMessagingIfSupported()
  if (!messaging) return () => {}
  return onMessage(messaging, callback)
}

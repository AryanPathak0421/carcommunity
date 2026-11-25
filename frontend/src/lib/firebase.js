import { initializeApp } from 'firebase/app'
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging'

// Public web config — safe to expose; env vars allow per-environment overrides.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyB361jNGJb2cKYF1ja5CAsC3o8lXY8KDo8',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'carcommunity-bdedd.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'carcommunity-bdedd',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'carcommunity-bdedd.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '114298702775',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:114298702775:web:e5d65462f7513b1e9a3632',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-4FZ7ELMVSZ',
}

const VAPID_KEY =
  import.meta.env.VITE_FIREBASE_VAPID_KEY ||
  'BO4iKh1hdnK9ZFFdlVvsA-tBQO4iFih4TEKhbnr-GLgqvqrhpZwtMCFQIJc36t-UIibhjTu6rBxHuncRkZ_wyRM'

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
  if (Notification.permission === 'denied') return null

  let permission = Notification.permission
  if (permission !== 'granted') {
    try {
      permission = await Notification.requestPermission()
    } catch {
      return null
    }
  }
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

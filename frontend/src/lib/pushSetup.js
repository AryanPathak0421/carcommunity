import { requestFcmTokenDetailed, onForegroundMessage } from './firebase.js'
import { registerFcmToken } from '../api/notificationsApi.js'

const FCM_TOKEN_STORAGE_KEY = 'lc_fcm_token'

/** localStorage key that remembers which token this browser last registered for a user. */
export const pushTokenStorageKey = (userId) => `${FCM_TOKEN_STORAGE_KEY}_${userId}`

let stopForeground = () => {}

/** Stop listening for foreground messages (call when the user signs out / switches account). */
export function stopPushForeground() {
  stopForeground()
  stopForeground = () => {}
}

/** What the page can tell right now, without asking the browser for anything. */
export function getPushStatus(userId) {
  const supported = typeof Notification !== 'undefined' && 'serviceWorker' in navigator
  const permission = supported ? Notification.permission : 'unsupported'
  const registered = (() => {
    try {
      return Boolean(userId) && Boolean(localStorage.getItem(pushTokenStorageKey(userId)))
    } catch {
      return false
    }
  })()
  return { supported, permission, registered }
}

/** Show a foreground push as a system notification (the SDK does not do this itself). */
async function showForegroundNotification(payload) {
  console.info('[push] Foreground FCM message received:', payload?.data?.type, payload)
  const title = payload.notification?.title || payload.data?.title || 'CarCommunity'
  const body = payload.notification?.body || payload.data?.body || ''
  const options = {
    body,
    icon: '/icon-192.png',
    badge: '/favicon-32.png',
    data: payload.data || {},
    tag: payload.data?.type || 'carcommunity',
  }
  try {
    const registration =
      (await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js')) ||
      (await navigator.serviceWorker.ready)
    if (registration) {
      await registration.showNotification(title, options)
    } else if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      // Last-resort fallback when no service worker registration is available
      new Notification(title, options)
    } else {
      console.warn('[push] No service worker registration — notification not displayed')
    }
  } catch (error) {
    console.warn('[push] Failed to display foreground notification:', error)
  }
}

/**
 * Register this browser for push: ask permission if needed, get the FCM token, save it on the server
 * and start showing foreground messages. Used both automatically after sign-in and by the
 * "Turn on notifications" button (which, being a tap, is allowed to show the permission prompt).
 *
 * @param {string} userId
 * @returns {Promise<{ ok: boolean, reason: string|null, error?: string }>}
 *   reason when not ok: 'unsupported' | 'denied' | 'dismissed' | 'service-worker' | 'token' | 'server'
 */
export async function enablePush(userId) {
  const { token, reason, error } = await requestFcmTokenDetailed()
  if (!token) return { ok: false, reason, error }

  try {
    await registerFcmToken(token, 'web')
    localStorage.setItem(pushTokenStorageKey(userId), token)
    console.info('[push] FCM token registered for user:', userId)
  } catch (err) {
    console.warn('[push] Could not save the FCM token on the server:', err)
    return { ok: false, reason: 'server', error: err?.message || String(err) }
  }

  stopForeground()
  try {
    stopForeground = await onForegroundMessage(showForegroundNotification)
  } catch (err) {
    console.warn('[push] Could not listen for foreground messages:', err)
  }
  return { ok: true, reason: null }
}

/** Plain-language explanation for a failed enablePush result. */
export function describePushFailure({ reason, error } = {}) {
  switch (reason) {
    case 'unsupported':
      return "This browser can't show push notifications. On iPhone, first add the app to your Home Screen and open it from there."
    case 'denied':
      return 'Notifications are blocked for this site. Open your browser’s site settings, set Notifications to Allow, then reload the app.'
    case 'dismissed':
      return 'Permission was not given. Tap the button again and choose Allow when your browser asks.'
    case 'service-worker':
      return `Could not start the notification service${error ? ` (${error})` : ''}. Reload the app and try again.`
    case 'token':
      return `Could not get a notification token${error ? ` (${error})` : ''}. Please try again in a moment.`
    case 'server':
      return `Notifications are allowed, but saving this device failed${error ? ` (${error})` : ''}. Please try again.`
    default:
      return 'Could not turn on notifications. Please try again.'
  }
}

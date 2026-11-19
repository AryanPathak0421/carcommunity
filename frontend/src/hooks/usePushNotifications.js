import { useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import { requestFcmToken, onForegroundMessage } from '../lib/firebase.js'
import { registerFcmToken } from '../api/notificationsApi.js'

const FCM_TOKEN_STORAGE_KEY = 'lc_fcm_token'

/**
 * Registers this device for push notifications once the user is logged in,
 * and surfaces foreground FCM messages as system notifications.
 * Mount once (see <PushNotificationManager /> in App.jsx).
 */
export function usePushNotifications() {
  const authToken = useSelector((s) => s.auth.token)
  const user = useSelector((s) => s.auth.user)
  const userId = user?._id || user?.id
  const setupDoneRef = useRef(null)

  useEffect(() => {
    if (!authToken || !userId) {
      setupDoneRef.current = null
      return
    }
    if (setupDoneRef.current === userId) return
    setupDoneRef.current = userId

    let unsubscribe = () => {}
    let cancelled = false

    const setup = async () => {
      try {
        const fcmToken = await requestFcmToken()
        if (cancelled || !fcmToken) return

        // Track per-user so switching accounts on the same browser always registers
        const userKey = `${FCM_TOKEN_STORAGE_KEY}_${userId}`
        const previous = localStorage.getItem(userKey)
        if (previous !== fcmToken) {
          await registerFcmToken(fcmToken, 'web')
          localStorage.setItem(userKey, fcmToken)
          console.info('[push] FCM token registered for user:', userId)
        } else {
          registerFcmToken(fcmToken, 'web').catch(() => {})
        }

        // Foreground messages are not auto-displayed by the SDK — show them ourselves
        unsubscribe = await onForegroundMessage(async (payload) => {
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
        })
      } catch (error) {
        console.warn('[push] Push notification setup failed:', error)
      }
    }

    setup()

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [authToken])
}

export function PushNotificationManager() {
  usePushNotifications()
  return null
}

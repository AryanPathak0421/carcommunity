import { useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import { enablePush, stopPushForeground } from '../lib/pushSetup.js'

/**
 * Registers this device for push notifications once the user is logged in,
 * and surfaces foreground FCM messages as system notifications.
 * Mount once (see <PushNotificationManager /> in App.jsx).
 *
 * This runs automatically, so browsers that block permission prompts that were not triggered by a
 * tap (Chrome on Android often does) will not show it. The "Turn on notifications" button
 * (PushNotificationToggle) covers that case with the same enablePush() call.
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

    let cancelled = false
    enablePush(userId).then((result) => {
      // Signed out / switched account while this was still running: do not keep listening.
      if (cancelled) {
        stopPushForeground()
        return
      }
      if (!result.ok) console.info('[push] Automatic setup did not complete:', result.reason, result.error || '')
    })

    return () => {
      cancelled = true
      stopPushForeground()
    }
    // userId must be a dependency: for an already signed-in user the stored token is there on the
    // first render but the profile (and so userId) arrives a moment later from /auth/me. With only
    // authToken here the effect had already returned early and never ran again, so push was never
    // registered for anyone who just opened the app with an existing session.
  }, [authToken, userId])
}

export function PushNotificationManager() {
  usePushNotifications()
  return null
}

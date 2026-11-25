import { useCallback, useEffect, useState } from 'react'
import { BellOff, BellRing, CheckCircle2, Loader2, Send } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth.js'
import { describePushFailure, enablePush, getPushStatus } from '../../lib/pushSetup.js'
import { sendTestNotification } from '../../api/notificationsApi.js'

/**
 * "Turn on notifications" control with a plain status.
 *
 * Why this exists: the app also tries to set push up on its own after sign-in, but browsers such as
 * Chrome on Android quietly ignore a permission request that was not triggered by a tap, which left
 * no sign of what went wrong. Here the permission prompt comes from the user's own tap, and any
 * failure is shown in words.
 *
 * variant="card"    full card for the profile page (status, enable, send a test)
 * variant="banner"  slim strip for the bell dropdown; renders nothing once push is on
 */
export function PushNotificationToggle({ variant = 'card' }) {
  const { user } = useAuth()
  const userId = user?._id || user?.id
  const [status, setStatus] = useState(() => getPushStatus(userId))
  const [busy, setBusy] = useState(null) // 'enable' | 'test' | null
  const [message, setMessage] = useState(null) // { tone: 'ok' | 'error', text }

  const refresh = useCallback(() => setStatus(getPushStatus(userId)), [userId])

  // Someone may change the permission in the browser's site settings and come back to the app.
  useEffect(() => {
    const onBack = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', onBack)
    window.addEventListener('focus', onBack)
    queueMicrotask(refresh)
    return () => {
      document.removeEventListener('visibilitychange', onBack)
      window.removeEventListener('focus', onBack)
    }
  }, [refresh])

  const handleEnable = async () => {
    if (!userId || busy) return
    setBusy('enable')
    setMessage(null)
    const result = await enablePush(userId)
    refresh()
    setBusy(null)
    setMessage(
      result.ok
        ? { tone: 'ok', kind: 'enable', text: 'Notifications are on for this device.' }
        : { tone: 'error', kind: 'enable', text: describePushFailure(result) },
    )
  }

  const handleTest = async () => {
    if (busy) return
    setBusy('test')
    setMessage(null)
    try {
      await sendTestNotification()
      setMessage({ tone: 'ok', kind: 'test', text: 'Test sent. It should appear in a few seconds.' })
    } catch (err) {
      setMessage({ tone: 'error', kind: 'test', text: err?.message || 'Could not send the test notification.' })
    } finally {
      setBusy(null)
    }
  }

  if (!userId) return null

  const isOn = status.supported && status.permission === 'granted' && status.registered
  const isBlocked = status.supported && status.permission === 'denied'
  // A failure to turn notifications on is stale once they are on (e.g. the user fixed the browser
  // setting and came back), so only show it while it is still true.
  const visibleMessage = message && !(message.kind === 'enable' && message.tone === 'error' && isOn) ? message : null

  if (variant === 'banner') {
    if (isOn || !status.supported) return null
    return (
      <div className="border-b border-amber-100 bg-amber-50 px-4 py-3">
        <div className="flex items-start gap-3">
          <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-amber-900">Get alerts on this device</p>
            <p className="mt-0.5 text-[11px] leading-snug text-amber-800">
              {isBlocked
                ? 'Notifications are blocked for this site. Allow them in your browser’s site settings, then reload.'
                : 'Turn on push notifications so you do not miss job offers and booking updates.'}
            </p>
            {!isBlocked ? (
              <button
                type="button"
                onClick={handleEnable}
                disabled={busy === 'enable'}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-60"
              >
                {busy === 'enable' ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
                Turn on notifications
              </button>
            ) : null}
            {visibleMessage ? (
              <p className={`mt-2 text-[11px] font-medium ${visibleMessage.tone === 'ok' ? 'text-emerald-700' : 'text-rose-700'}`}>
                {visibleMessage.text}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  return (
    <section aria-label="Push notifications" className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            isOn ? 'bg-emerald-50 text-emerald-600' : isBlocked || !status.supported ? 'bg-rose-50 text-rose-600' : 'bg-orange-50 text-brand'
          }`}
        >
          {isOn ? <CheckCircle2 className="h-5 w-5" aria-hidden /> : isBlocked || !status.supported ? <BellOff className="h-5 w-5" aria-hidden /> : <BellRing className="h-5 w-5" aria-hidden />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900">Push notifications</p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
            {!status.supported
              ? describePushFailure({ reason: 'unsupported' })
              : isBlocked
                ? describePushFailure({ reason: 'denied' })
                : isOn
                  ? 'On for this device. You will get job offers and booking updates even when the app is closed.'
                  : status.permission === 'granted'
                    ? 'Allowed in your browser, but this device is not registered yet. Tap the button to finish setup.'
                    : 'Off. Turn them on to get job offers and booking updates even when the app is closed.'}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {status.supported && !isBlocked && !isOn ? (
              <button
                type="button"
                onClick={handleEnable}
                disabled={busy !== null}
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white shadow-sm transition active:scale-95 disabled:opacity-60"
              >
                {busy === 'enable' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <BellRing className="h-4 w-4" aria-hidden />}
                Turn on notifications
              </button>
            ) : null}
            {isOn ? (
              <button
                type="button"
                onClick={handleTest}
                disabled={busy !== null}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition active:scale-95 disabled:opacity-60"
              >
                {busy === 'test' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
                Send a test notification
              </button>
            ) : null}
          </div>

          {visibleMessage ? (
            <p role="status" className={`mt-3 text-xs font-semibold ${visibleMessage.tone === 'ok' ? 'text-emerald-700' : 'text-rose-700'}`}>
              {visibleMessage.text}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  )
}

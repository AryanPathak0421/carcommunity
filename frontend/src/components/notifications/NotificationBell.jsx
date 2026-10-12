import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Bell, CheckCheck, Loader2 } from 'lucide-react'
import { GlassPanel } from '../ui/GlassPanel.jsx'
import { useNotificationInbox } from '../../hooks/useNotificationInbox.js'
import { formatRelativeTime } from '../../lib/formatRelativeTime.js'

const DEFAULT_BUTTON_CLASS =
  'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200/70 bg-white text-slate-600 shadow-sm transition hover:border-brand/25 hover:text-brand hover:shadow-md'

/** Shared notification bell + dropdown inbox, reused across every panel's header. */
export function NotificationBell({ buttonClassName, iconClassName = 'h-5 w-5', align = 'right', popupRightOffset = 'right-0' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  const { notifications, unreadCount, loading, refresh, markRead, markAllRead } = useNotificationInbox({
    limit: 20,
  })

  useEffect(() => {
    function onPointerDown(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  function handleToggle() {
    setOpen((wasOpen) => {
      if (!wasOpen) refresh()
      return !wasOpen
    })
  }

  function handleItemClick(n) {
    if (!n.read) markRead(n._id)
    setOpen(false)
    if (n.data?.link) navigate(n.data.link)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={handleToggle}
        className={buttonClassName || DEFAULT_BUTTON_CLASS}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
      >
        <Bell className={iconClassName} aria-hidden />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white shadow-md ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className={`absolute ${align === 'right' ? popupRightOffset : 'left-0'} top-[calc(100%+0.5rem)] z-50 w-[min(calc(100vw-2rem),22rem)] origin-top-right`}
          >
            <GlassPanel className="max-h-[70vh] overflow-hidden p-0 shadow-xl ring-1 ring-slate-200/60">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <p className="text-sm font-bold text-slate-900">Notifications</p>
                {unreadCount > 0 ? (
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline"
                  >
                    <CheckCheck className="h-3.5 w-3.5" aria-hidden />
                    Mark all read
                  </button>
                ) : null}
              </div>
              <div className="max-h-[55vh] overflow-y-auto">
                {loading && notifications.length === 0 ? (
                  <div className="flex items-center justify-center gap-2 px-4 py-8 text-xs font-medium text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Loading…
                  </div>
                ) : notifications.length === 0 ? (
                  <p className="px-4 py-8 text-center text-xs leading-relaxed text-slate-500">
                    No notifications yet. Updates about your bookings and account will appear here.
                  </p>
                ) : (
                  <ul>
                    {notifications.map((n) => (
                      <li key={n._id}>
                        <button
                          type="button"
                          onClick={() => handleItemClick(n)}
                          className={`flex w-full items-start gap-2.5 border-b border-slate-50 px-4 py-3 text-left transition hover:bg-slate-50 ${
                            n.read ? '' : 'bg-brand/5'
                          }`}
                        >
                          <span
                            className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-brand'}`}
                            aria-hidden
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-bold text-slate-900">{n.title}</span>
                            {n.body ? (
                              <span className="mt-0.5 block line-clamp-2 text-xs leading-snug text-slate-500">
                                {n.body}
                              </span>
                            ) : null}
                            <span className="mt-1 block text-[10px] font-medium uppercase tracking-wide text-slate-400">
                              {formatRelativeTime(n.createdAt)}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </GlassPanel>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

import { useCallback, useEffect, useState } from 'react'
import { useSocket } from '../context/SocketContext.jsx'
import { useAuth } from './useAuth.js'
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../api/notificationsApi.js'

/**
 * Shared notification inbox — backs the NotificationBell dropdown in every panel.
 * Fetches the persisted inbox on demand and stays live via the 'NOTIFICATION' socket event.
 */
export function useNotificationInbox({ limit = 20 } = {}) {
  const { token } = useAuth()
  const socket = useSocket()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await getNotifications({ page: 1, limit })
      setNotifications(res.data?.notifications ?? [])
      setUnreadCount(res.data?.unreadCount ?? 0)
    } catch {
      // best-effort — keep whatever was already loaded
    } finally {
      setLoading(false)
    }
  }, [token, limit])

  useEffect(() => {
    if (!token) {
      queueMicrotask(() => {
        setNotifications([])
        setUnreadCount(0)
      })
      return
    }
    queueMicrotask(() => refresh())
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh() intentionally re-runs only when the token itself changes (login/logout), not on every `limit` identity change.
  }, [token])

  useEffect(() => {
    if (!socket) return undefined
    const handleNew = (payload) => {
      setNotifications((prev) => {
        if (payload?._id && prev.some((n) => n._id === payload._id)) return prev
        return [{ ...payload, read: false }, ...prev].slice(0, limit)
      })
      setUnreadCount((c) => c + 1)
    }
    socket.on('NOTIFICATION', handleNew)
    return () => socket.off('NOTIFICATION', handleNew)
  }, [socket, limit])

  const markRead = useCallback((id) => {
    setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)))
    setUnreadCount((c) => Math.max(0, c - 1))
    markNotificationRead(id).catch(() => {})
  }, [])

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
    markAllNotificationsRead().catch(() => {})
  }, [])

  return { notifications, unreadCount, loading, refresh, markRead, markAllRead }
}

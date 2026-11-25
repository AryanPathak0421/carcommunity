import { useCallback, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { useSelector } from 'react-redux'
import { broadcastsApi } from '../api/broadcastsApi.js'

const BACKEND_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5005/api/v1').replace('/api/v1', '')

/** Safety net while the app is open: picks up offers the socket missed (flaky mobile connection). */
const POLL_MS = 15000
/** A socket offer this fresh is kept even if the next fetch has not seen it yet. */
const FRESH_SOCKET_OFFER_MS = 5000

export function useLabourSocket() {
  const { token, user } = useSelector((state) => state.auth)
  const isMechanic = user?.role === 'mechanic'
  const [socketStatus, setSocketStatus] = useState('disconnected')
  const [liveOffers, setLiveOffers] = useState([])
  const socketRef = useRef(null)

  /**
   * Offers only arrive over the socket when it is connected at that exact moment. A mechanic who had
   * the app closed or in the background got the push notification but then saw nothing here, so the
   * server's list of still-open offers is loaded as well and treated as the source of truth.
   */
  const syncOffers = useCallback(async () => {
    try {
      const res = await broadcastsApi.listOpenOffers()
      const serverOffers = res?.data?.offers || []
      const now = Date.now()
      setLiveOffers((prev) => {
        const serverIds = new Set(serverOffers.map((o) => String(o.bookingId)))
        const justReceived = prev.filter(
          (o) => !serverIds.has(String(o.bookingId)) && o.receivedAt && now - o.receivedAt < FRESH_SOCKET_OFFER_MS,
        )
        const known = new Map(prev.map((o) => [String(o.bookingId), o]))
        const merged = serverOffers.map((o) => ({
          ...o,
          receivedAt: known.get(String(o.bookingId))?.receivedAt ?? now,
        }))
        return [...merged, ...justReceived]
      })
    } catch {
      // Offline or a temporary server error: the socket and the next poll will catch up.
    }
  }, [])

  useEffect(() => {
    if (!token) return

    const socket = io(BACKEND_URL, {
      auth: { token },
      transports: ['websocket'],
    })

    socketRef.current = socket

    socket.on('connect', () => {
      setSocketStatus('connected')
      // (Re)connected: anything broadcast while we were away is still open on the server.
      if (isMechanic) syncOffers()
    })
    socket.on('disconnect', () => setSocketStatus('disconnected'))
    socket.on('connect_error', (err) => console.error('Socket error:', err))

    // Flash Broadcast Received
    socket.on('BOOKING_RECEIVED', (data) => {
      // Add a timestamp so we can track the 60s timeout locally if needed,
      // though the server will also send an EXPIRED event.
      setLiveOffers((prev) => {
        // Prevent duplicates just in case
        if (prev.find(o => o.bookingId === data.bookingId)) return prev
        return [...prev, { ...data, receivedAt: Date.now() }]
      })
    })

    // Broadcast expired or accepted by someone else
    socket.on('BOOKING_EXPIRED', (data) => {
      setLiveOffers((prev) => prev.filter(o => o.bookingId !== data.bookingId))
    })

    return () => {
      socket.disconnect()
    }
  }, [token, isMechanic, syncOffers])

  // Load on open, when the app returns to the foreground (e.g. after tapping the push), and poll lightly.
  useEffect(() => {
    if (!token || !isMechanic) return undefined

    queueMicrotask(syncOffers)
    const onVisible = () => {
      if (document.visibilityState === 'visible') syncOffers()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    window.addEventListener('online', onVisible)
    const timer = setInterval(onVisible, POLL_MS)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
      window.removeEventListener('online', onVisible)
      clearInterval(timer)
    }
  }, [token, isMechanic, syncOffers])

  const removeOfferLocal = (bookingId) => {
    setLiveOffers((prev) => prev.filter(o => o.bookingId !== bookingId))
  }

  return { socketStatus, liveOffers, removeOfferLocal }
}

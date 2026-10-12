import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { useSelector } from 'react-redux'

const BACKEND_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5005/api/v1').replace('/api/v1', '')

export function useLabourSocket() {
  const { token } = useSelector((state) => state.auth)
  const [socketStatus, setSocketStatus] = useState('disconnected')
  const [liveOffers, setLiveOffers] = useState([])
  const socketRef = useRef(null)

  useEffect(() => {
    if (!token) return

    const socket = io(BACKEND_URL, {
      auth: { token },
      transports: ['websocket'],
    })
    
    socketRef.current = socket

    socket.on('connect', () => setSocketStatus('connected'))
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
  }, [token])

  const removeOfferLocal = (bookingId) => {
    setLiveOffers((prev) => prev.filter(o => o.bookingId !== bookingId))
  }

  return { socketStatus, liveOffers, removeOfferLocal }
}

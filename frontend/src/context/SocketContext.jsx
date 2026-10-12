import { createContext, useContext, useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { io } from 'socket.io-client'

const SocketContext = createContext(null)

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5005/api/v1').replace('/api/v1', '')

export function SocketProvider({ children }) {
  const token = useSelector((s) => s.auth.token)
  const [socket, setSocket] = useState(null)

  useEffect(() => {
    if (!token) {
      setSocket(null)
      return
    }

    const newSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    })

    newSocket.on('connect', () => {
      console.log('[Socket] Connected:', newSocket.id)
    })

    newSocket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message)
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [token])

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  return useContext(SocketContext)
}

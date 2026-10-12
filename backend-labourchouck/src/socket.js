import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import { User } from './models/User.js'
import { Booking } from './models/Booking.js'
import { corsOriginCheck } from './config/security.js'

let io

// Mechanic position is only accepted/forwarded while a job is live, and at most every 2s per booking.
const LIVE_TRACKING_STATUSES = ['ACCEPTED', 'ASSIGNED', 'EN_ROUTE', 'STARTED']
const MIN_LOCATION_INTERVAL_MS = 2000

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: corsOriginCheck,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  })

  // Middleware to authenticate socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token
      if (!token) return next(new Error('Authentication error: Token missing'))

      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      const user = await User.findById(decoded.sub)
      
      if (!user || !user.isActive) return next(new Error('Authentication error: User not found'))
      
      socket.user = user
      next()
    } catch (error) {
      next(new Error('Authentication error: Invalid token'))
    }
  })

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} (User: ${socket.user._id})`)
    
    // Join a room specific to this user ID so we can emit directly to them
    socket.join(socket.user._id.toString())

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`)
    })

    // Live location from the assigned mechanic. The client only supplies the booking id and
    // coordinates: who may send it and who receives it is decided here, from the booking.
    const lastSentAt = new Map() // bookingId -> ts (throttle)
    socket.on('LABOUR_LOCATION_UPDATE', async (data) => {
      try {
        if (socket.user.role !== 'mechanic' || !data || typeof data !== 'object') return

        const { bookingId } = data
        const lat = Number(data.lat)
        const lng = Number(data.lng)
        if (!bookingId || !/^[a-f0-9]{24}$/i.test(String(bookingId))) return
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return

        const key = String(bookingId)
        const now = Date.now()
        if (now - (lastSentAt.get(key) || 0) < MIN_LOCATION_INTERVAL_MS) return
        lastSentAt.set(key, now)
        if (lastSentAt.size > 50) lastSentAt.delete(lastSentAt.keys().next().value)

        const point = {
          lat,
          lng,
          heading: Number.isFinite(Number(data.heading)) ? Number(data.heading) : undefined,
          speed: Number.isFinite(Number(data.speed)) ? Number(data.speed) : undefined,
          at: new Date(),
        }

        // Only the mechanic assigned to a live booking may publish its location.
        const booking = await Booking.findOneAndUpdate(
          { _id: key, laborId: socket.user._id, status: { $in: LIVE_TRACKING_STATUSES } },
          { $set: { liveLocation: point } },
          { new: true, projection: { userId: 1 } },
        )
        if (!booking) return

        emitToUser(booking.userId, 'LABOUR_LOCATION_UPDATE', {
          bookingId: key,
          lat,
          lng,
          heading: point.heading,
          speed: point.speed,
          at: point.at,
        })
      } catch (err) {
        console.error('[socket] location update failed:', err?.message || err)
      }
    })
  })

  return io
}

export const getIo = () => {
  if (!io) {
    throw new Error('Socket.io has not been initialized!')
  }
  return io
}

export const emitToUser = (userId, eventName, payload) => {
  if (io) {
    io.to(userId.toString()).emit(eventName, payload)
  }
}

import { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Loader2, Sparkles } from 'lucide-react'
import { B2cBookingCard } from '../../components/app/B2cBookingCard.jsx'
import { bookingsApi } from '../../api/bookingsApi.js'
import { ApiError } from '../../api/http.js'
import { useAuth } from '../../hooks/useAuth.js'
import { USER_ROLES } from '../../constants/userRoles.js'
import { AppStackScreenHeader } from '../../components/app/AppStackScreenHeader.jsx'
import { GlassPanel } from '../../components/ui/GlassPanel.jsx'

const CLOSED_STATUSES = new Set(['COMPLETED', 'CANCELLED', 'REFUNDED', 'FAILED'])

export function MyBookings() {
  const { user } = useAuth()
  const isLabour = user?.role === USER_ROLES.MECHANIC
  const reduce = useReducedMotion()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('active')

  useEffect(() => {
    let cancelled = false
    bookingsApi.getMyBookings()
      .then((res) => {
        if (cancelled) return
        setBookings(res.data?.bookings ?? [])
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Failed to load bookings')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const { activeBookings, pastBookings } = useMemo(() => {
    const active = []
    const past = []
    for (const b of bookings) {
      const s = (b.status || '').toUpperCase()
      if (CLOSED_STATUSES.has(s)) past.push(b)
      else active.push(b)
    }
    return { activeBookings: active, pastBookings: past }
  }, [bookings])

  const displayed = tab === 'active' ? activeBookings : pastBookings

  return (
    <div className="space-y-4 pb-8">
      <AppStackScreenHeader variant="brand" title="My bookings" subtitle="Track ongoing jobs and past bookings">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-white/15 p-1" role="tablist" aria-label="Booking status">
          {[
            { id: 'active', label: 'Active', count: activeBookings.length },
            { id: 'past', label: 'Past', count: pastBookings.length },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
                tab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-white/90 hover:bg-white/10'
              }`}
            >
              {t.label}
              <span
                className={`min-w-[1.25rem] rounded-full px-1.5 py-px text-[10px] font-black ${
                  tab === t.id ? 'bg-brand text-white' : 'bg-white/20 text-white'
                }`}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>
      </AppStackScreenHeader>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
        </div>
      ) : error ? (
        <GlassPanel className="p-6 text-center">
          <p className="text-sm font-semibold text-rose-700">{error}</p>
        </GlassPanel>
      ) : displayed.length === 0 ? (
        <GlassPanel className="p-8 text-center">
          <Sparkles className="mx-auto h-10 w-10 text-slate-300" aria-hidden />
          <p className="mt-3 text-sm font-semibold text-slate-600">
            {tab === 'active' ? 'No active bookings' : 'No past bookings'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {tab === 'active' ? 'Book a service to get started!' : 'Your completed bookings will appear here.'}
          </p>
        </GlassPanel>
      ) : (
        <div className="space-y-3">
          {displayed.map((booking, i) => (
            <motion.div
              key={booking._id}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <B2cBookingCard booking={booking} isLabour={isLabour} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

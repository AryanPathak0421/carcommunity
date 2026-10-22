import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, Check, ChevronUp, MapPin, Phone, ShieldCheck, Star, Wrench } from 'lucide-react'
import { bookingsApi } from '../../../api/bookingsApi.js'
import { useSocket } from '../../../context/SocketContext.jsx'
import { formatAgo, formatDistance, haversineKm } from '../../../lib/geo.js'
import { LiveTrackingMap } from './LiveTrackingMap.jsx'

const STEPS = ['Accepted', 'On the way', 'Working', 'Done']
const STEP_INDEX = { ACCEPTED: 0, ASSIGNED: 0, EN_ROUTE: 1, STARTED: 2, COMPLETED: 3 }
const NEARBY_KM = 0.08
const STALE_MS = 25_000

const initials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('') || 'M'

function destinationOf(booking) {
  const c = booking?.address?.coordinates?.coordinates
  if (!Array.isArray(c) || c.length < 2) return null
  const [lng, lat] = c
  return Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0) ? { lat, lng } : null
}

/**
 * Rapido-style live tracking: full-bleed map with the mechanic moving towards the customer and a
 * bottom sheet with ETA, progress, mechanic card, call, security PIN and a cancel option.
 */
export function LiveTrackingScreen({ bookingId, onBack, onCancelled }) {
  const socket = useSocket()
  const [booking, setBooking] = useState(null)
  const [stats, setStats] = useState(null)
  const [mechanic, setMechanic] = useState(null) // { lat, lng, at }
  const [eta, setEta] = useState(null)
  const [expanded, setExpanded] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState('')
  const [now, setNow] = useState(() => Date.now())

  const load = useCallback(async () => {
    try {
      const res = await bookingsApi.getBookingStatus(bookingId)
      const b = res.data?.booking
      if (b) {
        setBooking(b)
        setStats(res.data?.mechanicStats || null)
        const ll = b.liveLocation
        if (ll?.lat != null && ll?.lng != null) {
          setMechanic((prev) => (prev && new Date(prev.at) > new Date(ll.at) ? prev : { lat: ll.lat, lng: ll.lng, at: ll.at }))
        }
      }
    } catch (e) {
      setError(e?.message || 'Could not load your booking')
    }
  }, [bookingId])

  useEffect(() => {
    queueMicrotask(load)
  }, [load])

  // live position + status over the shared socket
  useEffect(() => {
    if (!socket) return undefined
    const onLocation = (d) => {
      if (String(d?.bookingId) !== String(bookingId)) return
      setMechanic({ lat: d.lat, lng: d.lng, at: d.at || new Date().toISOString() })
    }
    const onStatus = (d) => {
      if (String(d?.bookingId) !== String(bookingId)) return
      setBooking((prev) => (prev ? { ...prev, status: d.status } : prev))
      load()
    }
    socket.on('LABOUR_LOCATION_UPDATE', onLocation)
    socket.on('BOOKING_STATUS_UPDATE', onStatus)
    socket.on('BOOKING_ACCEPTED', onStatus)
    return () => {
      socket.off('LABOUR_LOCATION_UPDATE', onLocation)
      socket.off('BOOKING_STATUS_UPDATE', onStatus)
      socket.off('BOOKING_ACCEPTED', onStatus)
    }
  }, [socket, bookingId, load])

  // clock for "updated Xs ago" + a REST fallback when the socket has been silent
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [])
  useEffect(() => {
    const t = window.setInterval(() => {
      const live = booking && ['ACCEPTED', 'ASSIGNED', 'EN_ROUTE', 'STARTED'].includes(booking.status)
      if (!live) return
      const age = mechanic ? Date.now() - new Date(mechanic.at).getTime() : Infinity
      if (age > 12_000) {
        bookingsApi
          .getBookingLocation(bookingId)
          .then((res) => {
            const l = res.data?.location
            if (l?.lat != null) setMechanic({ lat: l.lat, lng: l.lng, at: l.at })
          })
          .catch(() => {})
      }
    }, 8000)
    return () => window.clearInterval(t)
  }, [booking, mechanic, bookingId])

  const destination = useMemo(() => destinationOf(booking), [booking])
  const status = booking?.status
  const stepIdx = STEP_INDEX[status] ?? 0
  const worker = booking?.laborId && typeof booking.laborId === 'object' ? booking.laborId : null
  const mechanicPoint = mechanic ? { lat: mechanic.lat, lng: mechanic.lng } : null
  const distanceKm = mechanicPoint && destination ? haversineKm(mechanicPoint, destination) : null
  const isFresh = mechanic ? now - new Date(mechanic.at).getTime() < STALE_MS : false
  const nearby = status === 'EN_ROUTE' && distanceKm != null && distanceKm < NEARBY_KM

  const headline = (() => {
    if (status === 'STARTED') return 'Work in progress'
    if (status === 'ACCEPTED' || status === 'ASSIGNED') return 'Mechanic accepted your request'
    if (nearby) return 'Your mechanic is arriving'
    if (eta) return `Arriving in ${eta.minutes} min`
    return 'Mechanic is on the way'
  })()
  const subline = (() => {
    if (status === 'STARTED') return 'Share the completion PIN once you are happy with the work'
    if (status === 'ACCEPTED' || status === 'ASSIGNED') return 'They will start the journey shortly'
    if (!mechanic) return 'Waiting for the mechanic’s live location…'
    const parts = []
    if (distanceKm != null) parts.push(`${formatDistance(eta?.km ?? distanceKm)} away`)
    parts.push(isFresh ? 'live' : `updated ${formatAgo(mechanic.at, now)}`)
    return parts.join(' · ')
  })()

  const pinLabel = status === 'STARTED' ? 'Completion PIN' : 'Start PIN'
  const pin = status === 'STARTED' ? booking?.completionOtp : booking?.startOtp
  const pinHint =
    status === 'STARTED' ? 'Tell this PIN to the mechanic when the job is finished' : 'Tell this PIN to the mechanic when they arrive'

  const cancel = async () => {
    setCancelling(true)
    setError('')
    try {
      await bookingsApi.updateBookingStatus(bookingId, 'CANCELLED')
      onCancelled?.()
    } catch (e) {
      setError(e?.message || 'Could not cancel this booking')
      setCancelling(false)
      setConfirmCancel(false)
    }
  }

  const canCancel = ['ACCEPTED', 'ASSIGNED', 'EN_ROUTE'].includes(status)

  // Portalled to <body>: the app shell creates its own stacking context, which would otherwise
  // leave the bottom tab bar drawn on top of this full-screen view.
  return createPortal(
    <div className="fixed inset-0 z-[60] flex flex-col bg-white" aria-label="Live tracking">
      {/* map (the sheet overlaps it by 24px via -mt-6, so only a small inset is needed) */}
      <div className="relative min-h-0 flex-1">
        {destination ? (
          <LiveTrackingMap destination={destination} mechanic={mechanicPoint} onEta={setEta} bottomInset={28} />
        ) : (
          <div className="flex h-full items-center justify-center bg-slate-50 text-sm font-semibold text-slate-500">
            Loading map…
          </div>
        )}

        <button
          type="button"
          onClick={onBack}
          className="absolute left-4 top-[max(1rem,0px)] flex h-11 w-11 items-center justify-center rounded-full bg-white text-navy shadow-lg ring-1 ring-slate-200 transition active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </button>

        {mechanic && status === 'EN_ROUTE' ? (
          <span className="absolute left-1/2 top-[max(1.25rem,0px)] flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-extrabold text-navy shadow-lg ring-1 ring-slate-200">
            <span className="relative flex h-2 w-2">
              <span className={`absolute inline-flex h-full w-full rounded-full ${isFresh ? 'animate-ping bg-emerald-400' : 'bg-amber-400'} opacity-75`} />
              <span className={`relative inline-flex h-2 w-2 rounded-full ${isFresh ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            </span>
            {isFresh ? 'Live' : 'Last seen ' + formatAgo(mechanic.at, now)}
          </span>
        ) : null}
      </div>

      {/* bottom sheet */}
      <div
        className="relative z-10 -mt-6 rounded-t-[28px] bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-16px_40px_-18px_rgba(15,23,42,0.35)]"
      >
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mx-auto flex w-full flex-col items-center py-1"
          aria-expanded={expanded}
          aria-label={expanded ? 'Show less' : 'Show more'}
        >
          <span className="h-1.5 w-10 rounded-full bg-slate-200" />
        </button>

        {/* headline + eta */}
        <div className="mt-1 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[19px] font-black leading-tight tracking-tight text-navy">{headline}</h2>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">{subline}</p>
          </div>
          {status === 'EN_ROUTE' && eta && !nearby ? (
            <div className="shrink-0 rounded-2xl bg-brand px-3 py-1.5 text-center text-white shadow-md shadow-brand/30">
              <p className="text-xl font-black leading-none">{eta.minutes}</p>
              <p className="text-[10px] font-bold uppercase tracking-wide">min</p>
            </div>
          ) : null}
        </div>

        {/* progress */}
        <ol className="mt-3 grid grid-cols-4 gap-1.5" aria-label="Progress">
          {STEPS.map((label, i) => {
            const done = i < stepIdx
            const current = i === stepIdx
            return (
              <li key={label} className="min-w-0">
                <span className={`block h-1.5 rounded-full ${done || current ? 'bg-brand' : 'bg-slate-200'} ${current ? 'animate-pulse' : ''}`} />
                <span
                  className={`mt-1 flex items-center gap-1 truncate text-[10px] font-bold ${
                    done || current ? 'text-navy' : 'text-slate-400'
                  }`}
                >
                  {done ? <Check className="h-3 w-3 text-brand" aria-hidden /> : null}
                  {label}
                </span>
              </li>
            )
          })}
        </ol>

        {/* mechanic */}
        {worker ? (
          <div className="mt-3 flex items-center gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
            {worker.profileImageUrl ? (
              <img src={worker.profileImageUrl} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-white" />
            ) : (
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-navy text-sm font-black text-white ring-2 ring-white">
                {initials(worker.fullName)}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-extrabold text-navy">{worker.fullName || 'Your mechanic'}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] font-semibold text-slate-500">
                <span className="inline-flex items-center gap-0.5 text-amber-600">
                  <Star className="h-3 w-3 fill-current" aria-hidden />
                  {stats?.rating != null ? stats.rating.toFixed(1) : 'New'}
                  {stats?.ratingCount ? <span className="text-slate-400">({stats.ratingCount})</span> : null}
                </span>
                {stats?.completedJobs ? <span>{stats.completedJobs} jobs</span> : null}
                <span className="inline-flex items-center gap-0.5 text-emerald-600">
                  <ShieldCheck className="h-3 w-3" aria-hidden />
                  Verified
                </span>
              </p>
            </div>
            {worker.phone ? (
              <a
                href={`tel:${worker.phone}`}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-md shadow-brand/30 transition active:scale-95"
                aria-label={`Call ${worker.fullName || 'mechanic'}`}
              >
                <Phone className="h-5 w-5" aria-hidden />
              </a>
            ) : null}
          </div>
        ) : null}

        {/* PIN */}
        {pin && status !== 'COMPLETED' ? (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-3">
            <div className="min-w-0">
              <p className="text-[11px] font-extrabold uppercase tracking-wide text-orange-700">{pinLabel}</p>
              <p className="mt-0.5 text-[11px] font-medium leading-snug text-slate-600">{pinHint}</p>
            </div>
            <div className="flex gap-1.5" aria-label={`${pinLabel} ${pin}`}>
              {String(pin)
                .split('')
                .map((d, i) => (
                  <span
                    key={i}
                    className="flex h-10 w-8 items-center justify-center rounded-lg bg-white text-lg font-black text-navy shadow-sm ring-1 ring-orange-200"
                  >
                    {d}
                  </span>
                ))}
            </div>
          </div>
        ) : null}

        {/* details */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 flex w-full items-center justify-between text-xs font-extrabold text-slate-500"
        >
          Booking details
          <ChevronUp className={`h-4 w-4 transition ${expanded ? '' : 'rotate-180'}`} aria-hidden />
        </button>
        {expanded && booking ? (
          <div className="mt-2 space-y-2 rounded-2xl bg-slate-50 p-3 text-sm ring-1 ring-slate-100">
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
              <span className="font-semibold text-navy">{booking.address?.locationText}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Wrench className="h-4 w-4 shrink-0 text-brand" aria-hidden />
              <span className="font-semibold">
                {booking.serviceId?.name || booking.subcategoryId?.name || 'Service'}
              </span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 font-extrabold text-navy">
              <span>
                Total · {booking.paymentMethod === 'ONLINE' ? 'Pay online' : 'Pay cash to mechanic'}
              </span>
              <span>₹{Number(booking.payableAmount || booking.totalAmount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        ) : null}

        {error ? <p className="mt-2 text-xs font-semibold text-red-600">{error}</p> : null}

        {canCancel ? (
          confirmCancel ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setConfirmCancel(false)}
                className="rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-700"
              >
                Keep booking
              </button>
              <button
                type="button"
                disabled={cancelling}
                onClick={cancel}
                className="rounded-xl bg-red-600 py-3 text-sm font-extrabold text-white disabled:opacity-60"
              >
                {cancelling ? 'Cancelling…' : 'Yes, cancel'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmCancel(true)}
              className="mt-3 w-full rounded-xl py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-50"
            >
              Cancel booking
            </button>
          )
        ) : null}
      </div>
    </div>,
    document.body,
  )
}

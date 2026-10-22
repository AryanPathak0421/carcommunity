import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  Clock,
  IndianRupee,
  Loader2,
  MapPin,
  Navigation,
  Phone,
  Play,
  X,
} from 'lucide-react'
import { useSocket } from '../../../context/SocketContext.jsx'
import { updateLabourLocation } from '../../../api/locationApi.js'
import { formatDistance, haversineKm } from '../../../lib/geo.js'
import { LiveTrackingMap } from './LiveTrackingMap.jsx'

const STEPS = ['Accepted', 'On the way', 'Working', 'Done']
const STEP_INDEX = { ACCEPTED: 0, ASSIGNED: 0, EN_ROUTE: 1, STARTED: 2, COMPLETED: 3 }
const NEARBY_KM = 0.1
const EMIT_EVERY_MS = 3000
const PROFILE_SYNC_EVERY_MS = 30_000

const initials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('') || 'C'

function destinationOf(booking) {
  const c = booking?.address?.coordinates?.coordinates
  if (!Array.isArray(c) || c.length < 2) return null
  const [lng, lat] = c
  return Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0) ? { lat, lng } : null
}

/**
 * The mechanic's own GPS. While the job is being travelled to, every fix is sent over the socket
 * (the server forwards it to the customer only) and now and then saved to the profile so job
 * matching knows where this mechanic is.
 */
function useMechanicPosition({ enabled, emit, bookingId }) {
  const socket = useSocket()
  const [fix, setFix] = useState(null)
  const [gpsState, setGpsState] = useState('starting') // starting | ok | denied | unavailable
  const lastEmit = useRef(0)
  const lastSync = useRef(0)

  useEffect(() => {
    if (!enabled) return undefined
    if (!('geolocation' in navigator)) {
      queueMicrotask(() => setGpsState('unavailable'))
      return undefined
    }
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, heading, speed } = pos.coords
        setFix({ lat, lng, at: new Date().toISOString() })
        setGpsState('ok')
        const now = Date.now()
        if (emit && socket && now - lastEmit.current >= EMIT_EVERY_MS) {
          lastEmit.current = now
          socket.emit('LABOUR_LOCATION_UPDATE', {
            bookingId,
            lat,
            lng,
            heading: heading ?? undefined,
            speed: speed ?? undefined,
          })
        }
        if (now - lastSync.current >= PROFILE_SYNC_EVERY_MS) {
          lastSync.current = now
          updateLabourLocation(lat, lng).catch(() => {})
        }
      },
      (err) => setGpsState(err.code === 1 ? 'denied' : 'unavailable'),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [enabled, emit, socket, bookingId])

  return { fix, gpsState }
}

function PhotoCapture({ label, image, uploading, onFile, onClear }) {
  return image ? (
    <div className="relative h-28 w-full overflow-hidden rounded-xl ring-1 ring-slate-200">
      <img src={image} alt={label} className="h-full w-full object-cover" />
      <button
        type="button"
        onClick={onClear}
        className="absolute right-2 top-2 rounded-full bg-slate-900/60 p-1.5 text-white"
        aria-label="Remove photo"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  ) : (
    <label className="flex h-20 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 bg-white text-slate-500 transition hover:border-brand hover:text-brand">
      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} disabled={uploading} />
      {uploading ? (
        <Loader2 className="h-5 w-5 animate-spin text-brand" />
      ) : (
        <>
          <Camera className="h-5 w-5" aria-hidden />
          <span className="text-xs font-bold">{label}</span>
        </>
      )}
    </label>
  )
}

/**
 * Captain-style navigation for the assigned mechanic: map with the route to the customer, ETA,
 * the customer's details and one big action for the current step (start journey → arrived/start
 * job with photo + PIN → finish job with photo + PIN).
 *
 * All job logic (OTP, uploads, cash confirmation, multi-day) stays in ActiveJob; this is the view.
 */
export function MechanicNavigationScreen({
  booking,
  fallbackPosition,
  isTooEarly,
  multiDay, // { required: boolean, type: 'start' | 'end', dayNumber, isFinalDay }
  otp,
  setOtp,
  jobImage,
  setJobImage,
  uploadingImage,
  onImageFile,
  updating,
  updateError,
  onAdvance, // (nextStatus, requireOtp)
  onDaily, // (type, dayNumber, requireImage)
  onCancel,
  onBack,
}) {
  const status = (booking.status || 'ACCEPTED').toUpperCase()
  const stepIdx = STEP_INDEX[status] ?? 0
  const customer = booking.userId && typeof booking.userId === 'object' ? booking.userId : null
  const destination = useMemo(() => destinationOf(booking), [booking])
  const travelling = status === 'ACCEPTED' || status === 'ASSIGNED' || status === 'EN_ROUTE'

  const { fix, gpsState } = useMechanicPosition({
    enabled: travelling,
    emit: travelling,
    bookingId: booking._id,
  })
  const [arrivedOpen, setArrivedOpen] = useState(false)
  const [eta, setEta] = useState(null)

  const live = booking.liveLocation?.lat != null ? { lat: booking.liveLocation.lat, lng: booking.liveLocation.lng } : null
  const here = fix ? { lat: fix.lat, lng: fix.lng } : live || fallbackPosition || null
  const usingFallback = !fix
  const distanceKm = here && destination ? haversineKm(here, destination) : null
  const nearby = distanceKm != null && distanceKm < NEARBY_KM

  const navUrl = destination
    ? `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}&travelmode=driving`
    : null

  const collect =
    booking.paymentMethod === 'CASH'
      ? { label: 'Collect cash', amount: booking.payableAmount ?? booking.totalAmount }
      : { label: 'Paid online', amount: booking.totalAmount }

  const headline =
    status === 'STARTED'
      ? 'Job in progress'
      : travelling && status === 'EN_ROUTE'
        ? nearby
          ? 'You have reached the location'
          : eta
            ? `${eta.minutes} min to customer`
            : 'Heading to the customer'
        : 'Customer is waiting'
  const subline =
    status === 'STARTED'
      ? 'Take an after-work photo and ask for the completion PIN'
      : status === 'EN_ROUTE'
        ? distanceKm != null
          ? `${formatDistance(eta?.km ?? distanceKm)} away${usingFallback ? ' · last known position' : ' · live'}`
          : 'Waiting for GPS…'
        : 'Tap “Start journey” when you leave'

  const showStartForm = status === 'EN_ROUTE' && !multiDay.required && (arrivedOpen || nearby)
  const showDayForm = multiDay.required
  const showFinishForm = status === 'STARTED' && !multiDay.required

  const primary = (() => {
    if (isTooEarly) return null
    if (showDayForm || showStartForm || showFinishForm) return null
    if (status === 'ACCEPTED' || status === 'ASSIGNED') {
      return { label: 'Start journey', icon: Navigation, run: () => onAdvance('EN_ROUTE', false) }
    }
    if (status === 'EN_ROUTE') {
      return { label: 'I’ve arrived · Start job', icon: Play, run: () => setArrivedOpen(true) }
    }
    return null
  })()

  const pinOk = otp.length === 4 && !!jobImage && !uploadingImage
  const gpsNote =
    travelling && gpsState === 'denied'
      ? 'Location permission is off — the customer cannot see you moving. Allow location in the browser/app settings.'
      : travelling && gpsState === 'unavailable'
        ? 'GPS is not available on this connection (needs HTTPS or the app). Showing your last known position.'
        : null

  return createPortal(
    <div className="fixed inset-0 z-[60] flex flex-col bg-white" aria-label="Job navigation">
      <div className="relative min-h-0 flex-1">
        {destination ? (
          <LiveTrackingMap destination={destination} mechanic={here} onEta={setEta} bottomInset={28} />
        ) : (
          <div className="flex h-full items-center justify-center bg-slate-50 text-sm font-semibold text-slate-500">
            Customer location unavailable
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

        <span className="absolute right-4 top-[max(1.25rem,0px)] flex items-center gap-1 rounded-full bg-navy px-3 py-1.5 text-[11px] font-extrabold text-white shadow-lg">
          <IndianRupee className="h-3.5 w-3.5" aria-hidden />
          You earn ₹{(Number(booking.laborShare || 0) + Number(booking.partsTotal || 0)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
        </span>

        {gpsNote ? (
          <p className="absolute inset-x-4 top-[4.5rem] rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-semibold leading-snug text-amber-900 shadow ring-1 ring-amber-200">
            {gpsNote}
          </p>
        ) : null}
      </div>

      <div className="relative z-10 -mt-6 max-h-[68vh] overflow-y-auto rounded-t-[28px] bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-16px_40px_-18px_rgba(15,23,42,0.35)]">
        <span className="mx-auto mb-2 block h-1.5 w-10 rounded-full bg-slate-200" />

        <div className="flex items-start justify-between gap-3">
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

        <ol className="mt-3 grid grid-cols-4 gap-1.5" aria-label="Progress">
          {STEPS.map((label, i) => (
            <li key={label} className="min-w-0">
              <span
                className={`block h-1.5 rounded-full ${i <= stepIdx ? 'bg-brand' : 'bg-slate-200'} ${i === stepIdx ? 'animate-pulse' : ''}`}
              />
              <span className={`mt-1 block truncate text-[10px] font-bold ${i <= stepIdx ? 'text-navy' : 'text-slate-400'}`}>
                {label}
              </span>
            </li>
          ))}
        </ol>

        {/* customer */}
        <div className="mt-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-navy text-sm font-black text-white">
              {initials(customer?.fullName || customer?.name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-extrabold text-navy">{customer?.fullName || customer?.name || 'Customer'}</p>
              <p className="mt-0.5 flex items-start gap-1 text-[11px] font-semibold leading-snug text-slate-500">
                <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-brand" aria-hidden />
                <span className="line-clamp-2">{booking.address?.locationText}</span>
              </p>
            </div>
            {customer?.phone ? (
              <a
                href={`tel:${customer.phone}`}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-md shadow-brand/30 transition active:scale-95"
                aria-label="Call customer"
              >
                <Phone className="h-5 w-5" aria-hidden />
              </a>
            ) : null}
          </div>
          <div className="mt-2.5 flex items-center justify-between border-t border-slate-200 pt-2 text-xs font-bold">
            <span className="text-slate-500">
              {booking.serviceId?.name || booking.subcategoryId?.name || 'Service'}
              {booking.type === 'SCHEDULED' && booking.timeSlot ? ` · ${booking.timeSlot}` : ''}
            </span>
            <span className="text-navy">
              {collect.label} ₹{Number(collect.amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </span>
          </div>
          {booking.parts?.length > 0 ? (
            <div className="mt-2.5 rounded-xl bg-orange-50 p-2.5 text-xs ring-1 ring-orange-100">
              <p className="font-extrabold text-orange-700">Parts to bring (₹{booking.partsTotal} is yours)</p>
              <ul className="mt-1 space-y-0.5 font-semibold text-slate-700">
                {booking.parts.map((p) => (
                  <li key={p.partId || p.name}>
                    {p.name} × {p.quantity}
                    {p.brand ? <span className="font-medium text-slate-500"> · {p.brand}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        {updateError ? (
          <p className="mt-3 flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-800">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
            {updateError}
          </p>
        ) : null}

        {isTooEarly ? (
          <div className="mt-3 rounded-2xl bg-amber-50 p-3 text-center ring-1 ring-amber-200">
            <Clock className="mx-auto h-6 w-6 text-amber-600" aria-hidden />
            <p className="mt-1 text-sm font-extrabold text-slate-800">Scheduled for later</p>
            <p className="text-xs text-slate-600">You can start the journey 30 minutes before the scheduled time.</p>
          </div>
        ) : null}

        {/* start / finish forms */}
        {showDayForm || showStartForm || showFinishForm ? (
          <div className="mt-3 space-y-2.5 rounded-2xl border border-orange-200 bg-orange-50/60 p-3">
            <p className="text-xs font-extrabold text-navy">
              {showDayForm
                ? `Day ${multiDay.dayNumber} · ${multiDay.type === 'start' ? 'start' : 'end'} of shift`
                : showStartForm
                  ? 'Start the job'
                  : 'Finish the job'}
            </p>
            <PhotoCapture
              label={showFinishForm || (showDayForm && multiDay.type === 'end') ? 'Take after-work photo' : 'Take before-work photo'}
              image={jobImage}
              uploading={uploadingImage}
              onFile={onImageFile}
              onClear={() => setJobImage(null)}
            />
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder={showFinishForm || (showDayForm && multiDay.type === 'end') ? 'Enter completion PIN' : 'Enter start PIN'}
              value={otp}
              maxLength={4}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className={`w-full rounded-xl border border-slate-200 bg-white p-3 text-center font-black text-navy outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 ${
                otp ? 'text-lg tracking-[0.5em]' : 'text-sm font-bold tracking-normal'
              }`}
            />
            <button
              type="button"
              disabled={updating || !pinOk}
              onClick={() => {
                if (showDayForm) onDaily(multiDay.type, multiDay.dayNumber, true)
                else onAdvance(showStartForm ? 'STARTED' : 'COMPLETED', true)
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 text-sm font-extrabold text-white shadow-lg shadow-brand/30 transition active:scale-[0.98] disabled:opacity-50"
            >
              {updating ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5" aria-hidden />
                  {showDayForm
                    ? multiDay.type === 'start'
                      ? 'Start shift'
                      : multiDay.isFinalDay
                        ? 'Complete job'
                        : 'End shift'
                    : showStartForm
                      ? 'Start job'
                      : 'Complete job'}
                </>
              )}
            </button>
          </div>
        ) : null}

        {/* primary action */}
        {primary ? (
          <div className="mt-3 grid grid-cols-[auto_1fr] gap-2">
            {navUrl ? (
              <a
                href={navUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 rounded-2xl bg-navy px-4 text-sm font-extrabold text-white transition active:scale-[0.98]"
              >
                <Navigation className="h-4 w-4" aria-hidden />
                Navigate
              </a>
            ) : (
              <span />
            )}
            <button
              type="button"
              disabled={updating}
              onClick={primary.run}
              className="flex items-center justify-center gap-2 rounded-2xl bg-brand py-4 text-base font-extrabold text-white shadow-lg shadow-brand/30 transition active:scale-[0.98] disabled:opacity-50"
            >
              {updating ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                <>
                  <primary.icon className="h-5 w-5" aria-hidden />
                  {primary.label}
                </>
              )}
            </button>
          </div>
        ) : null}

        {(showStartForm || showFinishForm) && navUrl && status === 'EN_ROUTE' ? (
          <a
            href={navUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-500"
          >
            <Navigation className="h-3.5 w-3.5" aria-hidden />
            Open in Google Maps
          </a>
        ) : null}

        {status === 'ACCEPTED' || status === 'ASSIGNED' ? (
          <button
            type="button"
            disabled={updating}
            onClick={onCancel}
            className="mt-2 w-full rounded-xl py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
          >
            Cancel booking
          </button>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}

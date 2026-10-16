import { Link } from 'react-router-dom'
import { CalendarClock, ChevronRight, Hammer, Radar, Truck, UserCheck } from 'lucide-react'

const STATUS_UI = {
  CREATED: { label: 'Booking placed', icon: CalendarClock, tone: 'bg-slate-100 text-slate-700' },
  BROADCASTING: { label: 'Finding a mechanic', icon: Radar, tone: 'bg-amber-100 text-amber-800', pulse: true },
  ACCEPTED: { label: 'Mechanic assigned', icon: UserCheck, tone: 'bg-emerald-100 text-emerald-800' },
  ASSIGNED: { label: 'Mechanic assigned', icon: UserCheck, tone: 'bg-emerald-100 text-emerald-800' },
  EN_ROUTE: { label: 'Mechanic on the way', icon: Truck, tone: 'bg-sky-100 text-sky-800', pulse: true },
  STARTED: { label: 'Work in progress', icon: Hammer, tone: 'bg-violet-100 text-violet-800' },
}

export function HomeActiveBookingCard({ booking, extraCount = 0, formatDay }) {
  const ui = STATUS_UI[booking.status] || STATUS_UI.CREATED
  const Icon = ui.icon
  const name = booking.serviceId?.name || booking.subcategoryId?.name || 'Your booking'
  const isScheduled = booking.type === 'SCHEDULED'
  // Scheduled jobs show their booked day and time; instant ones show the search window.
  const when = isScheduled
    ? `${formatDay(booking.scheduledAt || booking.createdAt)}${booking.timeSlot ? ' · ' + booking.timeSlot : ''}`
    : booking.status === 'BROADCASTING' || booking.status === 'CREATED'
      ? 'Searching up to 5 min'
      : formatDay(booking.createdAt)

  return (
    <section aria-label="Ongoing booking">
      <Link
        to={`/app/tracking/${booking._id}`}
        className="flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-[0_10px_28px_-16px_rgba(15,23,42,0.35)] ring-1 ring-slate-100 transition active:scale-[0.99]"
      >
        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
          <Icon className="h-5 w-5" aria-hidden />
          {ui.pulse ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand/60" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-brand ring-2 ring-white" />
            </span>
          ) : null}
        </span>
        <span className="min-w-0 flex-1">
          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${ui.tone}`}>{ui.label}</span>
          <span className="mt-1 block truncate text-sm font-extrabold text-slate-900">{name}</span>
          <span className="block truncate text-[11px] font-medium text-slate-500">
            {when} · {isScheduled ? 'Scheduled' : 'Instant'}
            {extraCount > 0 ? ` · +${extraCount} more active` : ''}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-0.5 rounded-xl bg-brand px-3 py-2 text-xs font-extrabold text-white shadow-sm shadow-brand/30">
          Track
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </span>
      </Link>
    </section>
  )
}

import { useState, useCallback, useMemo } from 'react'
import { useLocation, useNavigate, Navigate } from 'react-router-dom'
import { ArrowLeft, Wrench, Clock, ShieldCheck, BadgeCheck, ChevronDown, Zap } from 'lucide-react'
import { getCategoryImageUrl } from '../../lib/labourCategoryDisplay.js'
import { BookingTypeSheet } from '../../components/app/booking/BookingTypeSheet.jsx'
import { readBookingDraft, writeBookingDraft } from '../../lib/individualBookingDraft.js'
import { buildBookingFlowPath } from '../../lib/bookingFlowNavigation.js'

const rupees = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`

function formatDuration(mins) {
  const m = Number(mins)
  if (!m) return null
  if (m < 60) return `~${m} min`
  const h = m / 60
  return `~${Number.isInteger(h) ? h : h.toFixed(1)} hr`
}

function ServiceRow({ service, fallbackImage, expanded, onToggle, onBook }) {
  const duration = formatDuration(service.estimatedDurationMins)
  const description = String(service.description || '').trim()

  return (
    <article className="overflow-hidden rounded-2xl bg-white shadow-[0_8px_24px_-18px_rgba(15,23,42,0.45)] ring-1 ring-slate-200/70">
      <div className="flex gap-3 p-3">
        <div className="relative h-[88px] w-[88px] shrink-0 overflow-hidden rounded-xl bg-slate-100">
          <img
            src={getCategoryImageUrl({ name: service.name, imageUrl: service.iconUrl || fallbackImage })}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="line-clamp-2 text-[15px] font-extrabold leading-snug tracking-tight text-slate-900">
            {service.name}
          </h3>
          {description ? (
            <p className={`mt-0.5 text-xs leading-relaxed text-slate-500 ${expanded ? '' : 'line-clamp-2'}`}>
              {description}
            </p>
          ) : null}

          <div className="mt-auto flex items-end justify-between gap-2 pt-2">
            <div>
              <p className="text-[17px] font-black leading-none text-slate-900">
                {rupees(service.basePrice)}
                <span className="ml-1 text-[11px] font-semibold text-slate-400">onwards</span>
              </p>
              {duration ? (
                <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-slate-500">
                  <Clock className="h-3 w-3" aria-hidden />
                  {duration} job
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => onBook(service)}
              className="shrink-0 rounded-xl border border-brand bg-white px-4 py-1.5 text-xs font-black tracking-wide text-brand shadow-[0_4px_12px_-6px_rgba(15,23,42,0.45)] transition hover:bg-brand hover:text-white active:scale-95"
              aria-label={`Book ${service.name}`}
            >
              BOOK
            </button>
          </div>
        </div>
      </div>

      {description.length > 70 ? (
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-center justify-center gap-1 border-t border-slate-100 py-1.5 text-[11px] font-bold text-slate-500 transition hover:bg-slate-50"
          aria-expanded={expanded}
        >
          {expanded ? 'Show less' : 'View details'}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden />
        </button>
      ) : null}
    </article>
  )
}

export function AppSubCategoryServicePage() {
  const location = useLocation()
  const navigate = useNavigate()

  const [expandedServiceId, setExpandedServiceId] = useState(null)
  const [bookingTypeOpen, setBookingTypeOpen] = useState(false)
  const [bookingService, setBookingService] = useState(null)

  const [cat] = useState(() => location.state?.cat)

  const services = useMemo(() => (cat?.services || []).filter((s) => s?.isActive !== false), [cat])
  const minPrice = useMemo(() => {
    const prices = services.map((s) => Number(s.basePrice)).filter((n) => n > 0)
    return prices.length ? Math.min(...prices) : null
  }, [services])

  const handleQuickBookType = useCallback(
    (bookingType) => {
      if (!bookingService || !cat) return
      const prev = readBookingDraft() || {}
      writeBookingDraft({
        ...prev,
        entryPoint: 'category',
        groupId: String(cat.groupId || ''),
        groupName: cat.groupName || '',
        categoryId: String(cat._id),
        categoryName: cat.name || '',
        serviceId: String(bookingService._id),
        serviceName: bookingService.name || '',
        bookingType,
        matchMode: 'smart',
        selectedWorkers: [],
      })
      setBookingTypeOpen(false)
      setBookingService(null)
      navigate(buildBookingFlowPath('details', { categoryId: cat._id }))
    },
    [navigate, cat, bookingService]
  )

  if (!cat) {
    // If user refreshes or visits directly, redirect back
    return <Navigate to="/app" replace />
  }

  const heroImage = getCategoryImageUrl(cat)
  const openBooking = (service) => {
    setBookingService(service)
    setBookingTypeOpen(true)
  }

  return (
    <div className="-mx-4 -mt-2 flex min-h-screen flex-col bg-slate-50">
      {/* Hero */}
      <header className="relative h-56 overflow-hidden">
        <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-linear-to-t from-slate-950/90 via-slate-950/45 to-slate-950/10" />

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="absolute left-4 top-[max(0.75rem,env(safe-area-inset-top,0px))] flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-slate-800 shadow-md transition active:scale-95"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="absolute inset-x-0 bottom-0 px-4 pb-5 text-white">
          {cat.groupName ? (
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/70">{cat.groupName}</p>
          ) : null}
          <h1 className="mt-0.5 text-2xl font-black leading-tight tracking-tight">{cat.name}</h1>
          <p className="mt-1 text-xs font-semibold text-white/85">
            {services.length} {services.length === 1 ? 'service' : 'services'}
            {minPrice ? ` · from ${rupees(minPrice)}` : ''}
          </p>
        </div>
      </header>

      <div className="relative -mt-3 flex-1 space-y-5 rounded-t-3xl bg-slate-50 px-4 pt-5">
        {cat.subtitle ? <p className="text-sm leading-relaxed text-slate-600">{cat.subtitle}</p> : null}

        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: BadgeCheck, label: 'Verified mechanics' },
            { icon: Zap, label: 'Quick matching' },
            { icon: ShieldCheck, label: 'Clear pricing' },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-1 rounded-xl bg-white px-1 py-2.5 text-center ring-1 ring-slate-200/70"
            >
              <Icon className="h-4 w-4 text-brand" aria-hidden />
              <span className="text-[10px] font-bold leading-tight text-slate-600">{label}</span>
            </div>
          ))}
        </div>

        <section className="space-y-3">
          <h2 className="text-base font-extrabold tracking-tight text-slate-900">Choose a service</h2>

          {services.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
              <Wrench className="mx-auto mb-3 h-8 w-8 text-slate-300" />
              <p className="text-sm font-medium text-slate-600">No services found.</p>
              <p className="mt-1 text-xs text-slate-400">Check back later.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {services.map((service) => (
                <ServiceRow
                  key={service._id}
                  service={service}
                  fallbackImage={cat.imageUrl}
                  expanded={expandedServiceId === service._id}
                  onToggle={() => setExpandedServiceId((prev) => (prev === service._id ? null : service._id))}
                  onBook={openBooking}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <BookingTypeSheet
        open={bookingTypeOpen}
        onClose={() => {
          setBookingTypeOpen(false)
          setBookingService(null)
        }}
        value={null}
        categoryLabel={bookingService?.name || cat?.name}
        onSelect={handleQuickBookType}
      />
    </div>
  )
}

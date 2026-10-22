import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Bike,
  CalendarClock,
  CarFront,
  Camera,
  CheckCircle2,
  Clock,
  Droplets,
  MapPin,
  ShieldCheck,
  Sparkles,
  Truck,
} from 'lucide-react'
import { useServiceUiConfig } from '../../../hooks/useServiceUiConfig.js'
import { fetchLabourCategoriesGrouped } from '../../../api/labourCategoriesApi.js'
import { BookingTypeSheet } from '../../../components/app/booking/BookingTypeSheet.jsx'
import { readBookingDraft, writeBookingDraft } from '../../../lib/individualBookingDraft.js'
import { buildBookingFlowPath } from '../../../lib/bookingFlowNavigation.js'

const SIZE_ICON = { hatchback: CarFront, sedan: CarFront, suv: Truck, bike: Bike }
const STEP_ICON = { calendar: CalendarClock, map: MapPin, camera: Camera, check: CheckCircle2, clock: Clock, shield: ShieldCheck }
const PACKAGE_ICON = [Droplets, Sparkles, CarFront, CheckCircle2, Sparkles]

const rupees = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`
const duration = (m) => {
  const n = Number(m)
  if (!n) return ''
  if (n < 60) return `~${n} min`
  const h = n / 60
  return `~${Number.isInteger(h) ? h : h.toFixed(1)} hr`
}

/** Customer car-wash screen: choose car size, then a package priced for that size. */
export function CarWashPage() {
  const navigate = useNavigate()
  const ui = useServiceUiConfig().carWash
  const [group, setGroup] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [size, setSize] = useState('')
  const [picked, setPicked] = useState(null)

  useEffect(() => {
    let alive = true
    fetchLabourCategoriesGrouped()
      .then((res) => {
        if (!alive) return
        const groups = res?.data?.groups || []
        const wash = groups.find((g) => /wash/i.test(g.name) && !/bike/i.test(g.name))
        setGroup(wash || null)
      })
      .catch((e) => alive && setError(e.message || 'Could not load car wash packages'))
      .finally(() => alive && setLoaded(true))
    return () => {
      alive = false
    }
  }, [])

  // packages = services named "<Package> - <Size>", grouped by package name
  const { packages, sizes } = useMemo(() => {
    const configured = (ui.sizes || []).filter((s) => s.isActive !== false)
    const byName = new Map()
    const sizeSet = new Set()
    for (const cat of group?.categories || []) {
      for (const svc of cat.services || []) {
        if (svc.isActive === false) continue
        const name = String(svc.name || '')
        const sz = configured.find((s) => name.toLowerCase().endsWith(` - ${s.label.toLowerCase()}`))
        if (!sz) continue
        const pkg = name.slice(0, name.length - sz.label.length).replace(/\s+-\s*$/, '').trim()
        if (!pkg) continue
        sizeSet.add(sz.label)
        if (!byName.has(pkg)) byName.set(pkg, { name: pkg, description: svc.description || '', sizes: {}, order: Number(svc.basePrice) || 0 })
        byName.get(pkg).sizes[sz.label] = { service: svc, cat }
      }
    }
    const list = [...byName.values()].sort((a, b) => a.order - b.order)
    return { packages: list, sizes: configured.filter((s) => sizeSet.has(s.label)) }
  }, [group, ui.sizes])

  const activeSize = sizes.some((s) => s.label === size) ? size : sizes[0]?.label || ''
  const visible = packages.filter((p) => p.sizes[activeSize])
  const minPrice = visible.length ? Math.min(...visible.map((p) => Number(p.sizes[activeSize].service.basePrice))) : null

  const book = useCallback(
    (bookingType) => {
      if (!picked || !group) return
      const { service, cat } = picked
      writeBookingDraft({
        ...(readBookingDraft() || {}),
        entryPoint: 'category',
        groupId: String(group._id),
        groupName: group.name || '',
        categoryId: String(cat._id),
        categoryName: cat.name || '',
        serviceId: String(service._id),
        serviceName: service.name || '',
        bookingType,
        matchMode: 'smart',
        selectedWorkers: [],
      })
      setPicked(null)
      navigate(buildBookingFlowPath('details', { categoryId: cat._id }))
    },
    [picked, group, navigate],
  )

  return (
    <div className="-mx-4 pb-28">
      <div className="bg-linear-to-br from-sky-600 via-sky-500 to-cyan-400 px-4 pb-6 pt-[max(0.75rem,0px)] text-white">
        <button
          type="button"
          onClick={() => navigate('/app')}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-widest text-white/80">Doorstep service</p>
            <h1 className="text-[26px] font-black leading-tight">{ui.headline}</h1>
            <p className="mt-1 text-sm font-semibold text-white/90">
              {minPrice ? `Starting at ${rupees(minPrice)}` : ui.tagline}
            </p>
          </div>
          <Droplets className="h-14 w-14 shrink-0 text-white/30" aria-hidden />
        </div>
      </div>

      <div className="-mt-3 space-y-5 rounded-t-3xl bg-slate-50 px-4 pt-5">
        {!loaded ? (
          <div className="space-y-3" aria-busy="true">
            <div className="h-24 animate-pulse rounded-2xl bg-slate-200" />
            <div className="h-32 animate-pulse rounded-2xl bg-slate-200" />
          </div>
        ) : error ? (
          <p className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>
        ) : packages.length === 0 ? (
          <p className="rounded-2xl bg-white p-6 text-center text-sm font-bold text-slate-600 ring-1 ring-slate-200">
            Car wash packages are not available right now.
          </p>
        ) : (
          <>
            <section aria-label="Car size">
              <h2 className="text-[15px] font-black text-navy">1. Select your car size</h2>
              <div className="mt-2 grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(3, Math.max(1, sizes.length))}, minmax(0, 1fr))` }} role="radiogroup" aria-label="Car size">
                {sizes.map((sz) => {
                  const Icon = SIZE_ICON[sz.icon] || CarFront
                  const s = sz.label
                  const hint = sz.hint
                  const on = s === activeSize
                  return (
                    <button
                      key={s}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setSize(s)}
                      className={`flex flex-col items-center rounded-2xl px-2 py-3 text-center ring-2 transition active:scale-95 ${
                        on ? 'bg-sky-50 ring-sky-500' : 'bg-white ring-slate-200'
                      }`}
                    >
                      <Icon className={`h-7 w-7 ${on ? 'text-sky-600' : 'text-slate-500'}`} aria-hidden />
                      <span className={`mt-1 text-sm font-black ${on ? 'text-sky-700' : 'text-navy'}`}>{s}</span>
                      <span className="mt-0.5 text-[10px] font-semibold leading-tight text-slate-500">{hint}</span>
                    </button>
                  )
                })}
              </div>
            </section>

            <section aria-label="Wash packages">
              <h2 className="text-[15px] font-black text-navy">2. Choose a package</h2>
              <div className="mt-2 space-y-3">
                {visible.map((p, i) => {
                  const { service, cat } = p.sizes[activeSize]
                  const Icon = PACKAGE_ICON[i % PACKAGE_ICON.length]
                  const bullets = String(service.description || p.description)
                    .split(/[,.]/)
                    .map((t) => t.trim())
                    .filter(Boolean)
                    .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
                  return (
                    <div key={p.name} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                      <div className="flex items-start gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                          <Icon className="h-5 w-5" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-[15px] font-black text-navy">{p.name}</h3>
                            <span className="shrink-0 text-lg font-black text-brand">{rupees(service.basePrice)}</span>
                          </div>
                          {service.estimatedDurationMins ? (
                            <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-slate-500">
                              <Clock className="h-3.5 w-3.5" aria-hidden />
                              {duration(service.estimatedDurationMins)} · for {activeSize}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      {bullets.length > 0 ? (
                        <ul className="mt-3 space-y-1.5">
                          {bullets.map((b) => (
                            <li key={b} className="flex items-start gap-2 text-[13px] font-medium text-slate-600">
                              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
                              {b}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setPicked({ service, cat })}
                        className="mt-4 w-full rounded-xl bg-brand py-3 text-sm font-black text-white shadow-md shadow-brand/30 transition active:scale-[0.98]"
                      >
                        Book {p.name}
                      </button>
                    </div>
                  )
                })}
              </div>
            </section>

            <section aria-label="How it works" className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
              <h2 className="text-[15px] font-black text-navy">How it works</h2>
              <ol className="mt-3 grid grid-cols-2 gap-3">
                {(ui.steps || []).map(({ icon, title, text }, i) => {
                  const Icon = STEP_ICON[icon] || CheckCircle2
                  return (
                  <li key={title} className="flex items-start gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-600">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-extrabold text-navy">
                        {i + 1}. {title}
                      </span>
                      <span className="block text-[11px] font-medium leading-snug text-slate-500">{text}</span>
                    </span>
                  </li>
                  )
                })}
              </ol>
            </section>
          </>
        )}
      </div>

      <BookingTypeSheet
        open={Boolean(picked)}
        onClose={() => setPicked(null)}
        value={null}
        categoryLabel={picked?.service?.name}
        onSelect={book}
      />
    </div>
  )
}

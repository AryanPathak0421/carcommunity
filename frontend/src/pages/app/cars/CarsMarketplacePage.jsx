import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, CarFront, ChevronDown, Heart, MapPin, MessageSquare, Plus, Search, X } from 'lucide-react'
import { carsApi } from '../../../api/carsApi.js'
import { useCarFavourites } from '../../../lib/carFavourites.js'
import { FUEL_LABEL, formatCarPrice, formatKm, timeAgo } from '../../../lib/carFormat.js'

/* ---------- shared bits (also used by the detail / sell / my-cars pages) ---------- */

export function CarImage({ src, alt = '', className = '' }) {
  const [broken, setBroken] = useState(false)
  const url = !src || broken ? '/assets/images/buy-car.webp' : src
  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setBroken(true)}
      className={className}
    />
  )
}

export function FavouriteButton({ id, className = '' }) {
  const { has, toggle } = useCarFavourites()
  const on = has(id)
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggle(id)
      }}
      aria-label={on ? 'Remove from saved cars' : 'Save this car'}
      aria-pressed={on}
      className={`flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow-md transition active:scale-90 ${className}`}
    >
      <Heart className={`h-[18px] w-[18px] ${on ? 'fill-rose-500 text-rose-500' : 'text-slate-600'}`} aria-hidden />
    </button>
  )
}

/** OLX-style listing card: big photo, price first, then title, key specs and place / age. */
export function CarCard({ car, to }) {
  return (
    <Link
      to={to || `/app/cars/${car._id}`}
      className="group block overflow-hidden rounded-xl bg-white shadow-[0_1px_6px_rgba(15,23,42,0.12)] transition active:scale-[0.985]"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
        <CarImage src={car.images?.[0]} alt={car.title} className="h-full w-full object-cover" />
        {car.isFeatured ? (
          <span className="absolute left-0 top-2.5 rounded-r bg-amber-400 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-900">
            Featured
          </span>
        ) : null}
        {car.images?.length > 1 ? (
          <span className="absolute bottom-2 left-2 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {car.images.length} photos
          </span>
        ) : null}
        <FavouriteButton id={car._id} className="absolute right-2 top-2" />
      </div>
      <div className="px-3 pb-3 pt-2.5">
        <p className="text-[17px] font-black leading-tight text-navy">{formatCarPrice(car.price)}</p>
        <p className="mt-1 line-clamp-1 text-[13px] font-semibold text-slate-700">{car.title}</p>
        <p className="mt-0.5 line-clamp-1 text-[12px] font-medium text-slate-500">
          {formatKm(car.kmDriven)} · {FUEL_LABEL[car.fuelType] || car.fuelType}
        </p>
        <div className="mt-2 flex items-center justify-between gap-2 text-[11px] font-medium text-slate-400">
          <span className="flex min-w-0 items-center gap-1">
            <MapPin className="h-3 w-3 shrink-0" aria-hidden />
            <span className="truncate">{car.city}</span>
          </span>
          <span className="shrink-0">{timeAgo(car.createdAt)}</span>
        </div>
      </div>
    </Link>
  )
}

export function CarCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-[0_1px_6px_rgba(15,23,42,0.12)]">
      <div className="aspect-[4/3] animate-pulse bg-slate-200" />
      <div className="space-y-2 p-3">
        <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-slate-200" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200" />
      </div>
    </div>
  )
}

/* ---------- filters ---------- */

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'km_asc', label: 'Fewest km driven' },
  { value: 'year_desc', label: 'Newest model year' },
]

const BUDGET_OPTIONS = [
  { value: '', label: 'Any budget' },
  { value: ':300000', label: 'Under ₹3 Lakh' },
  { value: '300000:600000', label: '₹3 – 6 Lakh' },
  { value: '600000:1000000', label: '₹6 – 10 Lakh' },
  { value: '1000000:', label: 'Above ₹10 Lakh' },
]

const YEAR_OPTIONS = [
  { value: '', label: 'Any year' },
  ...[2022, 2020, 2018, 2015, 2012].map((y) => ({ value: String(y), label: `${y} & newer` })),
]

const KM_OPTIONS = [
  { value: '', label: 'Any distance' },
  ...[20000, 50000, 80000, 120000].map((k) => ({ value: String(k), label: `Under ${k.toLocaleString('en-IN')} km` })),
]

// fuel / transmission choices come from the admin-managed catalogue (GET /cars/filters)
const withAny = (anyLabel, list) => [{ value: '', label: anyLabel }, ...(list || [])]

const EMPTY = { make: '', city: '', budget: '', fuelType: '', transmission: '', minYear: '', maxKm: '', sort: 'newest' }

function OptionSheet({ title, options, value, onPick, onClose }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/50" onClick={onClose}>
      <div
        role="dialog"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[75dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white pb-6 shadow-2xl"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
          <h2 className="text-base font-black text-navy">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <ul className="px-2 pt-1">
          {options.map((o) => {
            const on = o.value === value
            return (
              <li key={o.value || 'any'}>
                <button
                  type="button"
                  onClick={() => onPick(o.value)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-3.5 text-left text-[15px] font-semibold ${
                    on ? 'bg-orange-50 text-brand' : 'text-slate-800'
                  }`}
                >
                  {o.label}
                  <span
                    className={`h-5 w-5 rounded-full border-2 ${on ? 'border-brand bg-brand ring-2 ring-inset ring-white' : 'border-slate-300'}`}
                    aria-hidden
                  />
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

function Pill({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-bold ring-1 transition active:scale-95 ${
        active ? 'bg-navy text-white ring-navy' : 'bg-white text-slate-700 ring-slate-300'
      }`}
    >
      {label}
      <ChevronDown className="h-3.5 w-3.5" aria-hidden />
    </button>
  )
}

export function CarsMarketplacePage() {
  const navigate = useNavigate()
  const fav = useCarFavourites()
  const [q, setQ] = useState('')
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState(EMPTY)
  const [sheet, setSheet] = useState(null)
  const [saved, setSaved] = useState(false)
  const [page, setPage] = useState(1)
  const [options, setOptions] = useState({ makes: [], cities: [], fuelTypes: [], transmissions: [] })
  const [rows, setRows] = useState([])
  const [state, setState] = useState({ key: '', total: 0, totalPages: 1, error: '' })
  const [savedRows, setSavedRows] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(q.trim())
      setPage(1)
    }, 350)
    return () => clearTimeout(t)
  }, [q])

  useEffect(() => {
    let alive = true
    carsApi
      .filters()
      .then(
        (res) =>
          alive &&
          setOptions({
            makes: res.data?.makes || [],
            cities: res.data?.cities || [],
            fuelTypes: res.data?.fuelTypes || [],
            transmissions: res.data?.transmissions || [],
          }),
      )
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const params = useMemo(() => {
    const [minPrice = '', maxPrice = ''] = filters.budget.split(':')
    return {
      q: query,
      make: filters.make,
      city: filters.city,
      fuelType: filters.fuelType,
      transmission: filters.transmission,
      minPrice,
      maxPrice,
      minYear: filters.minYear,
      maxKm: filters.maxKm,
      sort: filters.sort,
      limit: 12,
    }
  }, [query, filters])
  const key = JSON.stringify({ ...params, page })

  useEffect(() => {
    if (saved) return undefined
    let alive = true
    carsApi
      .list({ ...params, page })
      .then((res) => {
        if (!alive) return
        const d = res.data || {}
        setRows((prev) => (page === 1 ? d.listings || [] : [...prev, ...(d.listings || [])]))
        setState({ key, total: d.total || 0, totalPages: d.totalPages || 1, error: '' })
      })
      .catch((e) => alive && setState({ key, total: 0, totalPages: 1, error: e.message || 'Could not load cars' }))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` already captures params + page
  }, [key, saved])

  // "Saved" view: resolve the favourite ids to listings (ones that are gone simply drop out)
  const favKey = fav.ids.join(',')
  useEffect(() => {
    if (!saved) return undefined
    let alive = true
    Promise.all(fav.ids.slice(0, 30).map((id) => carsApi.get(id).then((r) => r.data?.listing).catch(() => null))).then(
      (list) => alive && setSavedRows(list.filter((l) => l && l.status === 'APPROVED')),
    )
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- favKey is the stable form of fav.ids
  }, [saved, favKey])

  const loading = !saved && state.key !== key
  const show = saved ? savedRows : rows
  const hasFilter = Object.entries(filters).some(([k, v]) => k !== 'sort' && v)

  const setFilter = (k, v) => {
    setFilters((f) => ({ ...f, [k]: v }))
    setPage(1)
    setSheet(null)
  }

  const makeChips = options.makes
  const FUEL_OPTIONS = withAny('Any fuel', options.fuelTypes)
  const TRANSMISSION_OPTIONS = withAny('Any transmission', options.transmissions)
  const label = (opts, value, fallback) => (value ? opts.find((o) => o.value === value)?.label || fallback : fallback)

  return (
    <div className="-mx-4">
      {/* sticky search header */}
      <div className="sticky top-0 z-40 border-b border-slate-200 bg-white px-4 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top,0px))] shadow-sm">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/app')}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-navy hover:bg-slate-100"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border-2 border-navy bg-white px-3 py-2">
            <Search className="h-[18px] w-[18px] shrink-0 text-navy" aria-hidden />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Find cars, brands and more…"
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:font-medium placeholder:text-slate-400"
            />
            {q ? (
              <button type="button" onClick={() => setQ('')} aria-label="Clear search" className="text-slate-400">
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </label>
          <Link
            to="/app/cars/enquiries"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-navy hover:bg-slate-100"
            aria-label="My enquiries"
          >
            <MessageSquare className="h-5 w-5" />
          </Link>
          <button
            type="button"
            onClick={() => setSaved((s) => !s)}
            className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              saved ? 'bg-rose-50' : 'hover:bg-slate-100'
            }`}
            aria-label="Saved cars"
            aria-pressed={saved}
          >
            <Heart className={`h-5 w-5 ${saved ? 'fill-rose-500 text-rose-500' : 'text-navy'}`} />
            {fav.ids.length > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white">
                {fav.ids.length}
              </span>
            ) : null}
          </button>
        </div>

      </div>

      <div className="space-y-4 px-4 pb-28 pt-3">
        {!saved ? (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filters">
            <Pill label={label(SORT_OPTIONS, filters.sort === 'newest' ? '' : filters.sort, 'Sort')} active={filters.sort !== 'newest'} onClick={() => setSheet('sort')} />
            <Pill label={label(BUDGET_OPTIONS, filters.budget, 'Budget')} active={!!filters.budget} onClick={() => setSheet('budget')} />
            <Pill label={filters.city || 'City'} active={!!filters.city} onClick={() => setSheet('city')} />
            <Pill label={label(FUEL_OPTIONS, filters.fuelType, 'Fuel')} active={!!filters.fuelType} onClick={() => setSheet('fuel')} />
            <Pill label={label(TRANSMISSION_OPTIONS, filters.transmission, 'Transmission')} active={!!filters.transmission} onClick={() => setSheet('transmission')} />
            <Pill label={label(YEAR_OPTIONS, filters.minYear, 'Year')} active={!!filters.minYear} onClick={() => setSheet('year')} />
            <Pill label={label(KM_OPTIONS, filters.maxKm, 'Km driven')} active={!!filters.maxKm} onClick={() => setSheet('km')} />
          </div>
        ) : null}

        {!saved && makeChips.length > 0 ? (
          <section aria-label="Browse by brand">
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [mask-image:linear-gradient(to_right,#000_88%,transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {[{ name: '', all: true }, ...makeChips.map((m) => ({ name: m }))].map((m) => {
                const on = filters.make === m.name
                return (
                  <button
                    key={m.name || 'all'}
                    type="button"
                    onClick={() => setFilter('make', m.name)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-extrabold transition active:scale-95 ${
                      on ? 'bg-orange-50 text-brand ring-2 ring-brand' : 'bg-slate-100 text-navy ring-2 ring-transparent'
                    }`}
                  >
                    {m.all ? <CarFront className="h-4 w-4" aria-hidden /> : null}
                    {m.all ? 'All cars' : m.name}
                  </button>
                )
              })}
            </div>
          </section>
        ) : null}

        <div className="flex items-end justify-between">
          <h1 className="text-[17px] font-black text-navy">
            {saved ? 'Saved cars' : query || hasFilter ? 'Search results' : 'Fresh recommendations'}
          </h1>
          {!saved && state.key === key ? (
            <span className="text-xs font-semibold text-slate-500">{state.total} ads</span>
          ) : null}
        </div>

        {!saved && hasFilter ? (
          <button
            type="button"
            onClick={() => {
              setFilters((f) => ({ ...EMPTY, sort: f.sort }))
              setPage(1)
            }}
            className="text-xs font-extrabold text-brand underline"
          >
            Clear all filters
          </button>
        ) : null}

        {state.error && !saved ? (
          <p className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm font-semibold text-rose-700">{state.error}</p>
        ) : null}

        {show === null || (loading && rows.length === 0) ? (
          <div className="grid grid-cols-2 gap-3" aria-busy="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <CarCardSkeleton key={i} />
            ))}
          </div>
        ) : show.length === 0 && !state.error ? (
          <div className="rounded-2xl bg-white px-6 py-12 text-center shadow-sm ring-1 ring-slate-200">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              {saved ? <Heart className="h-7 w-7 text-slate-400" aria-hidden /> : <CarFront className="h-7 w-7 text-slate-400" aria-hidden />}
            </span>
            <p className="mt-4 text-base font-black text-navy">{saved ? 'No saved cars yet' : 'No cars found'}</p>
            <p className="mx-auto mt-1 max-w-[16rem] text-sm font-medium text-slate-500">
              {saved ? 'Tap the heart on a car to save it here.' : 'Try removing a filter or searching for something else.'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {show.map((c) => (
                <CarCard key={c._id} car={c} />
              ))}
            </div>
            {!saved && page < state.totalPages ? (
              <button
                type="button"
                disabled={loading}
                onClick={() => setPage((p) => p + 1)}
                className="w-full rounded-xl border-2 border-navy bg-white py-3 text-sm font-black text-navy transition active:scale-[0.98] disabled:opacity-60"
              >
                {loading ? 'Loading…' : 'Load more'}
              </button>
            ) : null}
          </>
        )}
      </div>

      {/* floating SELL */}
      <Link
        to="/app/cars/sell"
        className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom,0px))] right-4 z-40 flex items-center gap-1.5 rounded-full bg-brand px-5 py-3 text-sm font-black tracking-wide text-white shadow-xl shadow-brand/40 ring-4 ring-white transition active:scale-95"
      >
        <Plus className="h-5 w-5" aria-hidden />
        SELL
      </Link>

      {sheet === 'sort' ? (
        <OptionSheet title="Sort by" options={SORT_OPTIONS} value={filters.sort} onPick={(v) => setFilter('sort', v)} onClose={() => setSheet(null)} />
      ) : null}
      {sheet === 'budget' ? (
        <OptionSheet title="Budget" options={BUDGET_OPTIONS} value={filters.budget} onPick={(v) => setFilter('budget', v)} onClose={() => setSheet(null)} />
      ) : null}
      {sheet === 'city' ? (
        <OptionSheet
          title="City"
          options={[{ value: '', label: 'All cities' }, ...options.cities.map((c) => ({ value: c, label: c }))]}
          value={filters.city}
          onPick={(v) => setFilter('city', v)}
          onClose={() => setSheet(null)}
        />
      ) : null}
      {sheet === 'fuel' ? (
        <OptionSheet title="Fuel type" options={FUEL_OPTIONS} value={filters.fuelType} onPick={(v) => setFilter('fuelType', v)} onClose={() => setSheet(null)} />
      ) : null}
      {sheet === 'transmission' ? (
        <OptionSheet title="Transmission" options={TRANSMISSION_OPTIONS} value={filters.transmission} onPick={(v) => setFilter('transmission', v)} onClose={() => setSheet(null)} />
      ) : null}
      {sheet === 'year' ? (
        <OptionSheet title="Model year" options={YEAR_OPTIONS} value={filters.minYear} onPick={(v) => setFilter('minYear', v)} onClose={() => setSheet(null)} />
      ) : null}
      {sheet === 'km' ? (
        <OptionSheet title="Kilometres driven" options={KM_OPTIONS} value={filters.maxKm} onPick={(v) => setFilter('maxKm', v)} onClose={() => setSheet(null)} />
      ) : null}
    </div>
  )
}

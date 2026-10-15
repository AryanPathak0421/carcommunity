import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ClipboardList, PackageSearch, Search, X } from 'lucide-react'
import { accessoriesApi } from '../../../api/accessoriesApi.js'
import { discountPct, formatCarPrice } from '../../../lib/carFormat.js'
import { CarImage } from '../cars/CarsMarketplacePage.jsx'

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
]

export function ProductCard({ product: p }) {
  const off = discountPct(p.price, p.mrp)
  return (
    <Link
      to={`/app/accessories/${p._id}`}
      className="block overflow-hidden rounded-xl bg-white shadow-[0_1px_6px_rgba(15,23,42,0.12)] transition active:scale-[0.985]"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-slate-100">
        <CarImage src={p.images?.[0]} alt={p.name} className="h-full w-full object-cover" />
        {p.isFeatured ? (
          <span className="absolute left-0 top-2.5 rounded-r bg-amber-400 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-900">
            Featured
          </span>
        ) : null}
        {!p.inStock ? (
          <span className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm font-black text-slate-700">
            Out of stock
          </span>
        ) : null}
      </div>
      <div className="px-3 pb-3 pt-2.5">
        <p className="line-clamp-2 min-h-[2.4rem] text-[13px] font-bold leading-snug text-slate-800">{p.name}</p>
        {p.brand ? <p className="mt-0.5 line-clamp-1 text-[11px] font-semibold text-slate-400">{p.brand}</p> : null}
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5">
          <span className="text-[16px] font-black text-navy">{formatCarPrice(p.price)}</span>
          {p.mrp && p.mrp > p.price ? (
            <>
              <span className="text-[11px] font-semibold text-slate-400 line-through">{formatCarPrice(p.mrp)}</span>
              <span className="text-[11px] font-black text-emerald-600">{off}% off</span>
            </>
          ) : null}
        </div>
        <p className="mt-1 line-clamp-1 text-[11px] font-medium text-slate-500">{p.compatibility || 'Universal'}</p>
      </div>
    </Link>
  )
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-[0_1px_6px_rgba(15,23,42,0.12)]">
      <div className="aspect-square animate-pulse bg-slate-200" />
      <div className="space-y-2 p-3">
        <div className="h-3 w-5/6 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200" />
      </div>
    </div>
  )
}

export function AccessoriesPage() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(1)
  const [categories, setCategories] = useState([])
  const [rows, setRows] = useState([])
  const [state, setState] = useState({ key: '', total: 0, totalPages: 1, error: '' })

  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(q.trim())
      setPage(1)
    }, 350)
    return () => clearTimeout(t)
  }, [q])

  useEffect(() => {
    let alive = true
    accessoriesApi
      .categories()
      .then((res) => alive && setCategories(res.data?.categories || []))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const params = useMemo(() => ({ q: query, category, sort, limit: 12 }), [query, category, sort])
  const key = JSON.stringify({ ...params, page })

  useEffect(() => {
    let alive = true
    accessoriesApi
      .list({ ...params, page })
      .then((res) => {
        if (!alive) return
        const d = res.data || {}
        setRows((prev) => (page === 1 ? d.products || [] : [...prev, ...(d.products || [])]))
        setState({ key, total: d.total || 0, totalPages: d.totalPages || 1, error: '' })
      })
      .catch((e) => alive && setState({ key, total: 0, totalPages: 1, error: e.message || 'Could not load products' }))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` captures params + page
  }, [key])

  const loading = state.key !== key
  const shownCats = categories.filter((c) => c.count > 0 || c._id === category)

  return (
    <div className="-mx-4">
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
              placeholder="Search car accessories…"
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:font-medium placeholder:text-slate-400"
            />
            {q ? (
              <button type="button" onClick={() => setQ('')} aria-label="Clear search" className="text-slate-400">
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </label>
          <Link
            to="/app/accessories/requests"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-navy hover:bg-slate-100"
            aria-label="My requests"
          >
            <ClipboardList className="h-5 w-5" />
          </Link>
        </div>
      </div>

      <div className="space-y-4 px-4 pb-28 pt-3">
        {shownCats.length > 0 ? (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [mask-image:linear-gradient(to_right,#000_88%,transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[{ _id: '', name: 'All' }, ...shownCats].map((c) => {
              const on = category === c._id
              return (
                <button
                  key={c._id || 'all'}
                  type="button"
                  onClick={() => {
                    setCategory(c._id)
                    setPage(1)
                  }}
                  className={`shrink-0 rounded-lg px-3.5 py-2 text-[13px] font-extrabold ring-2 transition active:scale-95 ${
                    on ? 'bg-orange-50 text-brand ring-brand' : 'bg-slate-100 text-navy ring-transparent'
                  }`}
                >
                  {c.name}
                </button>
              )
            })}
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <h1 className="text-[17px] font-black text-navy">Car Accessories</h1>
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value)
              setPage(1)
            }}
            aria-label="Sort"
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {state.error ? <p className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm font-semibold text-rose-700">{state.error}</p> : null}

        {loading && rows.length === 0 ? (
          <div className="grid grid-cols-2 gap-3" aria-busy="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : rows.length === 0 && !state.error ? (
          <div className="rounded-2xl bg-white px-6 py-12 text-center shadow-sm ring-1 ring-slate-200">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <PackageSearch className="h-7 w-7 text-slate-400" aria-hidden />
            </span>
            <p className="mt-4 text-base font-black text-navy">No products found</p>
            <p className="mx-auto mt-1 max-w-[16rem] text-sm font-medium text-slate-500">
              Try another category or search term.
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs font-semibold text-slate-500">{state.total} products</p>
            <div className="grid grid-cols-2 gap-3">
              {rows.map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
            {page < state.totalPages ? (
              <button
                type="button"
                disabled={loading}
                onClick={() => setPage((n) => n + 1)}
                className="w-full rounded-xl border-2 border-navy bg-white py-3 text-sm font-black text-navy transition active:scale-[0.98] disabled:opacity-60"
              >
                {loading ? 'Loading…' : 'Load more'}
              </button>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}

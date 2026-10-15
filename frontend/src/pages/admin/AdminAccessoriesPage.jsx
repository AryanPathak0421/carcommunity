import { useCallback, useEffect, useState } from 'react'
import { Check, Eye, Loader2, Plus, RefreshCw, Search, Star, Trash2, X } from 'lucide-react'
import { adminAccessoriesApi } from '../../api/adminAccessoriesApi.js'
import { GlassPanel } from '../../components/ui/GlassPanel.jsx'
import { INQUIRY_STATUS, formatCarPrice, timeAgo } from '../../lib/carFormat.js'

const STATUS = {
  PENDING: { label: 'Pending review', tone: 'bg-amber-50 text-amber-700 ring-amber-200' },
  APPROVED: { label: 'Live', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  REJECTED: { label: 'Rejected', tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
}
const STATUS_TABS = [
  { id: '', label: 'All' },
  { id: 'PENDING', label: 'Pending review' },
  { id: 'APPROVED', label: 'Live' },
  { id: 'REJECTED', label: 'Rejected' },
]
const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20'

const Badge = ({ meta }) =>
  meta ? <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ${meta.tone}`}>{meta.label}</span> : null

const Thumb = ({ src, className = 'h-14 w-14' }) =>
  src ? <img src={src} alt="" loading="lazy" className={`${className} shrink-0 rounded-lg object-cover`} /> : <div className={`${className} shrink-0 rounded-lg bg-slate-100`} />

function DetailModal({ product: p, onClose }) {
  const [active, setActive] = useState(0)
  const rows = [
    ['Mechanic', `${p.seller?.name || '—'} · ${p.seller?.phone || '—'}`],
    ['Category', p.category?.name || '—'],
    ['Brand', p.brand || '—'],
    ['Price / MRP', `${formatCarPrice(p.price)}${p.mrp ? ` / ${formatCarPrice(p.mrp)}` : ''}`],
    ['Stock', p.stock],
    ['Condition', p.condition],
    ['Fits', p.compatibility || '—'],
    ['Warranty', p.warranty || '—'],
    ['Views / requests', `${p.views} / ${p.inquiryCount}`],
    ['Submitted', new Date(p.createdAt).toLocaleString()],
  ]
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Product details" className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-900">{p.name}</h2>
            <div className="mt-1 flex items-center gap-2">
              <Badge meta={STATUS[p.status]} />
              {p.isFeatured ? <span className="text-xs font-bold text-amber-600">★ Featured</span> : null}
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <div className="aspect-square overflow-hidden rounded-xl bg-slate-100">
              {p.images?.[active] ? <img src={p.images[active]} alt="" className="h-full w-full object-cover" /> : null}
            </div>
            {p.images?.length > 1 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {p.images.map((src, i) => (
                  <button key={src + i} type="button" onClick={() => setActive(i)} className={`rounded-lg ring-2 ${i === active ? 'ring-orange-500' : 'ring-transparent'}`}>
                    <Thumb src={src} className="h-12 w-12" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <dl className="space-y-1.5 text-sm">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 border-b border-slate-100 pb-1.5">
                <dt className="font-semibold text-slate-500">{k}</dt>
                <dd className="text-right font-bold text-slate-900">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        {p.description ? <p className="mt-4 whitespace-pre-line rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{p.description}</p> : null}
        {p.adminNote ? <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">Review note: {p.adminNote}</p> : null}
      </div>
    </div>
  )
}

function RejectModal({ product, onClose, onConfirm }) {
  const [note, setNote] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <h2 className="text-base font-black text-slate-900">Reject “{product.name}”</h2>
        <p className="mt-1 text-sm text-slate-500">The mechanic sees this reason and can edit and resubmit.</p>
        <textarea autoFocus rows={4} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Photo is blurry / price looks wrong" className="mt-3 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20" />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100">Cancel</button>
          <button type="button" disabled={!note.trim()} onClick={() => onConfirm(note.trim())} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Reject product</button>
        </div>
      </div>
    </div>
  )
}

function CategoriesPanel() {
  const [cats, setCats] = useState(null)
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await adminAccessoriesApi.categories()
      setCats(res.data?.categories || [])
      setError('')
    } catch (e) {
      setError(e.message || 'Could not load categories')
    }
  }, [])

  useEffect(() => {
    let alive = true
    adminAccessoriesApi
      .categories()
      .then((res) => alive && setCats(res.data?.categories || []))
      .catch((e) => alive && setError(e.message || 'Could not load categories'))
    return () => {
      alive = false
    }
  }, [])

  const run = async (fn) => {
    try {
      await fn()
      await load()
    } catch (e) {
      setError(e.message || 'Action failed')
    }
  }

  return (
    <div className="space-y-4">
      {error ? <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p> : null}
      <GlassPanel className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
          <div>
            <h2 className="text-base font-black text-slate-900">Product categories</h2>
            <p className="text-xs font-medium text-slate-500">Mechanics pick one when listing a product. Inactive categories are hidden.</p>
          </div>
          <div className="flex gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && name.trim() && run(async () => { await adminAccessoriesApi.createCategory(name.trim()); setName('') })} placeholder="New category" className={`${inputCls} w-52`} />
            <button type="button" disabled={!name.trim()} onClick={() => run(async () => { await adminAccessoriesApi.createCategory(name.trim()); setName('') })} className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-3.5 py-2 text-sm font-extrabold text-white disabled:opacity-50">
              <Plus className="h-4 w-4" aria-hidden /> Add
            </button>
          </div>
        </div>
        {cats === null ? (
          <p className="flex items-center gap-2 p-6 text-sm font-semibold text-slate-500"><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading…</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {cats.map((c) => (
              <li key={c._id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <input
                  defaultValue={c.name}
                  onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== c.name && run(() => adminAccessoriesApi.updateCategory(c._id, { name: e.target.value.trim() }))}
                  className="min-w-0 flex-1 rounded-lg bg-transparent px-2 py-1.5 text-sm font-bold outline-none focus:bg-slate-50 focus:ring-2 focus:ring-orange-500/20"
                  aria-label="Category name"
                />
                <span className="text-xs font-semibold text-slate-400">{c.productCount} products</span>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  <input type="checkbox" checked={c.isActive} onChange={(e) => run(() => adminAccessoriesApi.updateCategory(c._id, { isActive: e.target.checked }))} className="h-4 w-4 accent-orange-500" />
                  Active
                </label>
                <button
                  type="button"
                  onClick={() => window.confirm(`Delete “${c.name}”?`) && run(() => adminAccessoriesApi.deleteCategory(c._id))}
                  className="rounded-lg p-2 text-rose-600 ring-1 ring-rose-100 hover:bg-rose-50"
                  aria-label={`Delete ${c.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </GlassPanel>
    </div>
  )
}

export function AdminAccessoriesPage() {
  const [tab, setTab] = useState('products')
  const [status, setStatus] = useState('PENDING')
  const [q, setQ] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState([])
  const [inqRows, setInqRows] = useState([])
  const [inqStatus, setInqStatus] = useState('')
  const [counts, setCounts] = useState({})
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [view, setView] = useState(null)
  const [reject, setReject] = useState(null)
  const [busyId, setBusyId] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(q.trim())
      setPage(1)
    }, 350)
    return () => clearTimeout(t)
  }, [q])

  useEffect(() => {
    if (tab === 'categories') return undefined
    let alive = true
    const run = async () => {
      setLoading(true)
      try {
        if (tab === 'products') {
          const res = await adminAccessoriesApi.list({ status, q: query, page, limit: 15 })
          if (!alive) return
          setRows(res.data?.products || [])
          setCounts(res.data?.counts || {})
          setMeta({ total: res.data?.total || 0, totalPages: res.data?.totalPages || 1 })
        } else {
          const res = await adminAccessoriesApi.inquiries({ status: inqStatus, page, limit: 20 })
          if (!alive) return
          setInqRows(res.data?.inquiries || [])
          setMeta({ total: res.data?.total || 0, totalPages: res.data?.totalPages || 1 })
        }
        setError('')
      } catch (e) {
        if (alive) setError(e.message || 'Could not load')
      } finally {
        if (alive) setLoading(false)
      }
    }
    run()
    return () => {
      alive = false
    }
  }, [tab, status, query, page, inqStatus, reloadKey])

  const act = async (id, fn) => {
    try {
      setBusyId(id)
      await fn()
      setReloadKey((k) => k + 1)
    } catch (e) {
      setError(e.message || 'Action failed')
    } finally {
      setBusyId('')
    }
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Car Accessories</h1>
          <p className="text-sm font-medium text-slate-500">Approve products listed by mechanics before customers can see them.</p>
        </div>
        <button type="button" onClick={() => setReloadKey((k) => k + 1)} className="flex items-center gap-2 rounded-xl bg-white px-3.5 py-2 text-sm font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden /> Refresh
        </button>
      </div>

      <div className="flex gap-1 rounded-xl bg-slate-100 p-1 sm:w-fit">
        {[['products', 'Products'], ['inquiries', 'Requests'], ['categories', 'Categories']].map(([id, label]) => (
          <button key={id} type="button" onClick={() => { setTab(id); setPage(1) }} className={`flex-1 rounded-lg px-5 py-2 text-sm font-bold transition sm:flex-none ${tab === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
            {label}
          </button>
        ))}
      </div>

      {error ? <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p> : null}

      {tab === 'categories' ? <CategoriesPanel /> : null}

      {tab === 'products' ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-2">
              {STATUS_TABS.map((t) => {
                const n = t.id ? counts[t.id] : total
                return (
                  <button key={t.id || 'all'} type="button" onClick={() => { setStatus(t.id); setPage(1) }} className={`rounded-full px-3.5 py-1.5 text-xs font-extrabold ring-1 transition ${status === t.id ? 'bg-orange-500 text-white ring-orange-500' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'}`}>
                    {t.label}
                    {n != null ? <span className="ml-1.5 opacity-80">{n}</span> : null}
                  </button>
                )
              })}
            </div>
            <label className="ml-auto flex w-full items-center gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200 sm:w-72">
              <Search className="h-4 w-4 text-slate-400" aria-hidden />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or brand" className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none" />
            </label>
          </div>
          <GlassPanel className="overflow-hidden p-0">
            {loading && rows.length === 0 ? (
              <p className="flex items-center justify-center gap-2 p-10 text-sm font-semibold text-slate-500"><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading…</p>
            ) : rows.length === 0 ? (
              <p className="p-10 text-center text-sm font-semibold text-slate-500">No products here.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {rows.map((p) => (
                  <li key={p._id} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <Thumb src={p.images?.[0]} className="h-16 w-16" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold text-slate-900">
                          {p.name} {p.isFeatured ? <Star className="inline h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-label="Featured" /> : null}
                        </p>
                        <p className="text-sm font-black text-orange-600">{formatCarPrice(p.price)}</p>
                        <p className="truncate text-xs font-semibold text-slate-500">{p.category?.name || '—'} · stock {p.stock}</p>
                      </div>
                    </div>
                    <div className="min-w-0 text-xs font-semibold text-slate-500 lg:w-48">
                      <p className="truncate text-slate-800">{p.seller?.name || '—'}</p>
                      <p>{p.seller?.phone || ''}</p>
                      <p>{timeAgo(p.createdAt)}</p>
                    </div>
                    <div className="lg:w-28"><Badge meta={STATUS[p.status]} /></div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" onClick={() => setView(p)} className="rounded-lg p-2 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50" aria-label="View details"><Eye className="h-4 w-4" /></button>
                      {p.status !== 'APPROVED' ? (
                        <button type="button" disabled={busyId === p._id} onClick={() => act(p._id, () => adminAccessoriesApi.review(p._id, 'approve'))} className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-extrabold text-white disabled:opacity-50">
                          <Check className="h-3.5 w-3.5" aria-hidden /> Approve
                        </button>
                      ) : null}
                      {p.status !== 'REJECTED' ? (
                        <button type="button" disabled={busyId === p._id} onClick={() => setReject(p)} className="flex items-center gap-1 rounded-lg bg-rose-50 px-3 py-2 text-xs font-extrabold text-rose-700 ring-1 ring-rose-200 disabled:opacity-50">
                          <X className="h-3.5 w-3.5" aria-hidden /> Reject
                        </button>
                      ) : null}
                      {p.status === 'APPROVED' ? (
                        <button type="button" disabled={busyId === p._id} onClick={() => act(p._id, () => adminAccessoriesApi.setFeatured(p._id, !p.isFeatured))} className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-extrabold text-amber-700 ring-1 ring-amber-200 hover:bg-amber-50 disabled:opacity-50">
                          <Star className="h-3.5 w-3.5" aria-hidden /> {p.isFeatured ? 'Unfeature' : 'Feature'}
                        </button>
                      ) : null}
                      <button type="button" disabled={busyId === p._id} onClick={() => window.confirm(`Delete “${p.name}” and its requests?`) && act(p._id, () => adminAccessoriesApi.remove(p._id))} className="rounded-lg p-2 text-rose-600 ring-1 ring-rose-100 hover:bg-rose-50 disabled:opacity-50" aria-label="Delete product"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </GlassPanel>
        </>
      ) : null}

      {tab === 'inquiries' ? (
        <>
          <div className="flex flex-wrap gap-2">
            {[{ id: '', label: 'All' }, { id: 'NEW', label: 'New' }, { id: 'CONTACTED', label: 'Contacted' }, { id: 'CLOSED', label: 'Closed' }].map((t) => (
              <button key={t.id || 'all'} type="button" onClick={() => { setInqStatus(t.id); setPage(1) }} className={`rounded-full px-3.5 py-1.5 text-xs font-extrabold ring-1 transition ${inqStatus === t.id ? 'bg-orange-500 text-white ring-orange-500' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'}`}>
                {t.label}
              </button>
            ))}
          </div>
          <GlassPanel className="overflow-x-auto p-0">
            {inqRows.length === 0 ? (
              <p className="p-10 text-center text-sm font-semibold text-slate-500">{loading ? 'Loading…' : 'No requests yet.'}</p>
            ) : (
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                  <tr><th className="px-4 py-3">Product</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Mechanic</th><th className="px-4 py-3">Qty / message</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">When</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inqRows.map((i) => (
                    <tr key={i._id} className="align-top">
                      <td className="px-4 py-3"><div className="flex items-center gap-2"><Thumb src={i.product?.image} className="h-10 w-10" /><div><p className="font-bold text-slate-900">{i.product?.name || 'Removed product'}</p><p className="text-xs font-semibold text-orange-600">{i.product ? formatCarPrice(i.product.price) : ''}</p></div></div></td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{i.buyerName || '—'}<p className="text-xs text-slate-500">{i.buyerPhone}</p></td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{i.seller?.name || '—'}<p className="text-xs text-slate-500">{i.seller?.phone}</p></td>
                      <td className="max-w-xs px-4 py-3 text-slate-700"><p className="font-bold">× {i.quantity}</p><p className="text-xs">{i.message || '—'}</p></td>
                      <td className="px-4 py-3">
                        <select value={i.status} onChange={(e) => act(i._id, () => adminAccessoriesApi.setInquiryStatus(i._id, e.target.value))} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold" aria-label="Request status">
                          {Object.entries(INQUIRY_STATUS).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
                        </select>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs font-semibold text-slate-500">{timeAgo(i.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </GlassPanel>
        </>
      ) : null}

      {tab !== 'categories' && meta.totalPages > 1 ? (
        <div className="flex items-center justify-center gap-3">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg px-3 py-1.5 text-sm font-bold ring-1 ring-slate-200 disabled:opacity-40">Previous</button>
          <span className="text-sm font-semibold text-slate-600">Page {page} of {meta.totalPages}</span>
          <button type="button" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg px-3 py-1.5 text-sm font-bold ring-1 ring-slate-200 disabled:opacity-40">Next</button>
        </div>
      ) : null}

      {view ? <DetailModal product={view} onClose={() => setView(null)} /> : null}
      {reject ? (
        <RejectModal
          product={reject}
          onClose={() => setReject(null)}
          onConfirm={(note) => {
            const p = reject
            setReject(null)
            act(p._id, () => adminAccessoriesApi.review(p._id, 'reject', note))
          }}
        />
      ) : null}
    </div>
  )
}

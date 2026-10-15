import { useCallback, useEffect, useState } from 'react'
import { Check, ExternalLink, Eye, Loader2, RefreshCw, Search, Star, Trash2, X } from 'lucide-react'
import { adminCarsApi } from '../../api/adminCarsApi.js'
import { GlassPanel } from '../../components/ui/GlassPanel.jsx'
import { AdminCarCatalogPanel } from './AdminCarCatalogPanel.jsx'
import {
  FUEL_LABEL,
  INQUIRY_STATUS,
  LISTING_STATUS,
  TRANSMISSION_LABEL,
  formatCarPrice,
  formatKm,
  timeAgo,
} from '../../lib/carFormat.js'

const STATUS_TABS = [
  { id: '', label: 'All' },
  { id: 'PENDING', label: 'Pending review' },
  { id: 'APPROVED', label: 'Live' },
  { id: 'REJECTED', label: 'Rejected' },
  { id: 'SOLD', label: 'Sold' },
]

const INQUIRY_TABS = [
  { id: '', label: 'All' },
  { id: 'NEW', label: 'New' },
  { id: 'CONTACTED', label: 'Contacted' },
  { id: 'CLOSED', label: 'Closed' },
]

function Badge({ meta }) {
  if (!meta) return null
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ${meta.tone}`}>{meta.label}</span>
}

function Thumb({ src, className = 'h-12 w-16' }) {
  return src ? (
    <img src={src} alt="" className={`${className} shrink-0 rounded-lg object-cover`} loading="lazy" />
  ) : (
    <div className={`${className} shrink-0 rounded-lg bg-slate-100`} />
  )
}

function DetailModal({ listing, onClose }) {
  const [active, setActive] = useState(0)
  const imgs = listing.images || []
  const rows = [
    ['Seller', `${listing.seller?.name || '—'} · ${listing.seller?.phone || '—'}`],
    ['Email', listing.seller?.email || '—'],
    ['Make / model', [listing.make, listing.model, listing.variant].filter(Boolean).join(' ')],
    ['Year', listing.year],
    ['Fuel', FUEL_LABEL[listing.fuelType] || listing.fuelType],
    ['Transmission', TRANSMISSION_LABEL[listing.transmission] || listing.transmission],
    ['Driven', formatKm(listing.kmDriven)],
    ['Owners', listing.owners],
    ['Price', `${formatCarPrice(listing.price)} (${listing.negotiable ? 'negotiable' : 'fixed'})`],
    ['City', [listing.city, listing.locationText].filter(Boolean).join(' · ')],
    ['Views / enquiries', `${listing.views} / ${listing.inquiryCount}`],
    ['Submitted', new Date(listing.createdAt).toLocaleString()],
  ]
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Listing details"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-900">{listing.title}</h2>
            <div className="mt-1 flex items-center gap-2">
              <Badge meta={LISTING_STATUS[listing.status]} />
              {listing.isFeatured ? <span className="text-xs font-bold text-amber-600">★ Featured</span> : null}
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <div className="aspect-[4/3] overflow-hidden rounded-xl bg-slate-100">
              {imgs[active] ? <img src={imgs[active]} alt="" className="h-full w-full object-cover" /> : null}
            </div>
            {imgs.length > 1 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {imgs.map((src, i) => (
                  <button
                    key={src + i}
                    type="button"
                    onClick={() => setActive(i)}
                    className={`overflow-hidden rounded-lg ring-2 ${i === active ? 'ring-orange-500' : 'ring-transparent'}`}
                  >
                    <Thumb src={src} className="h-12 w-16" />
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

        {listing.description ? (
          <p className="mt-4 whitespace-pre-line rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{listing.description}</p>
        ) : null}
        {listing.adminNote ? (
          <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">Review note: {listing.adminNote}</p>
        ) : null}
      </div>
    </div>
  )
}

function RejectModal({ listing, onClose, onConfirm, busy }) {
  const [note, setNote] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <h2 className="text-base font-black text-slate-900">Reject “{listing.title}”</h2>
        <p className="mt-1 text-sm text-slate-500">The seller sees this reason and can edit and resubmit.</p>
        <textarea
          autoFocus
          rows={4}
          maxLength={500}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Photos are unclear / price looks incorrect"
          className="mt-3 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100">
            Cancel
          </button>
          <button
            type="button"
            disabled={!note.trim() || busy}
            onClick={() => onConfirm(note.trim())}
            className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            Reject listing
          </button>
        </div>
      </div>
    </div>
  )
}

export function AdminCarListingsPage() {
  const [tab, setTab] = useState('listings')
  const [status, setStatus] = useState('PENDING')
  const [q, setQ] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState([])
  const [counts, setCounts] = useState({})
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [view, setView] = useState(null)
  const [reject, setReject] = useState(null)
  const [busyId, setBusyId] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const [inqStatus, setInqStatus] = useState('')
  const [inqRows, setInqRows] = useState([])

  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(q.trim())
      setPage(1)
    }, 350)
    return () => clearTimeout(t)
  }, [q])

  const refresh = useCallback(() => setReloadKey((k) => k + 1), [])

  useEffect(() => {
    let alive = true
    const run = async () => {
      setLoading(true)
      try {
        if (tab === 'catalog') {
          // the catalogue panel loads its own data
        } else if (tab === 'listings') {
          const res = await adminCarsApi.list({ status, q: query, page, limit: 15 })
          if (!alive) return
          setRows(res.data?.listings || [])
          setCounts(res.data?.counts || {})
          setMeta({ total: res.data?.total || 0, totalPages: res.data?.totalPages || 1 })
        } else {
          const res = await adminCarsApi.inquiries({ status: inqStatus, page, limit: 20 })
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
      refresh()
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
          <h1 className="text-2xl font-black text-slate-900">Buy / Sell Cars</h1>
          <p className="text-sm font-medium text-slate-500">
            Review seller listings before they go live and follow up on buyer enquiries.
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="flex items-center gap-2 rounded-xl bg-white px-3.5 py-2 text-sm font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden />
          Refresh
        </button>
      </div>

      <div className="flex gap-1 rounded-xl bg-slate-100 p-1 sm:w-fit">
        {[
          ['listings', 'Listings'],
          ['inquiries', 'Enquiries'],
          ['catalog', 'Catalogue'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setTab(id)
              setPage(1)
            }}
            className={`flex-1 rounded-lg px-5 py-2 text-sm font-bold transition sm:flex-none ${
              tab === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p> : null}

      {tab === 'catalog' ? <AdminCarCatalogPanel /> : null}

      {tab === 'catalog' ? null : tab === 'listings' ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-2">
              {STATUS_TABS.map((t) => {
                const n = t.id ? counts[t.id] : total
                return (
                  <button
                    key={t.id || 'all'}
                    type="button"
                    onClick={() => {
                      setStatus(t.id)
                      setPage(1)
                    }}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-extrabold ring-1 transition ${
                      status === t.id
                        ? 'bg-orange-500 text-white ring-orange-500'
                        : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {t.label}
                    {n != null ? <span className="ml-1.5 opacity-80">{n}</span> : null}
                  </button>
                )
              })}
            </div>
            <label className="ml-auto flex w-full items-center gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200 sm:w-72">
              <Search className="h-4 w-4 text-slate-400" aria-hidden />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search title, make, model, city"
                className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none"
              />
            </label>
          </div>

          <GlassPanel className="overflow-hidden p-0">
            {loading && rows.length === 0 ? (
              <div className="flex items-center justify-center gap-2 p-10 text-sm font-semibold text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading…
              </div>
            ) : rows.length === 0 ? (
              <p className="p-10 text-center text-sm font-semibold text-slate-500">No listings here.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {rows.map((l) => (
                  <li key={l._id} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <Thumb src={l.images?.[0]} className="h-16 w-24" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold text-slate-900">
                          {l.title} {l.isFeatured ? <Star className="inline h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-label="Featured" /> : null}
                        </p>
                        <p className="text-sm font-black text-orange-600">{formatCarPrice(l.price)}</p>
                        <p className="truncate text-xs font-semibold text-slate-500">
                          {l.year} · {formatKm(l.kmDriven)} · {FUEL_LABEL[l.fuelType]} · {l.city}
                        </p>
                      </div>
                    </div>
                    <div className="min-w-0 text-xs font-semibold text-slate-500 lg:w-52">
                      <p className="truncate text-slate-800">{l.seller?.name || '—'}</p>
                      <p>{l.seller?.phone || ''}</p>
                      <p>{timeAgo(l.createdAt)}</p>
                    </div>
                    <div className="lg:w-28">
                      <Badge meta={LISTING_STATUS[l.status]} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setView(l)}
                        className="rounded-lg p-2 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                        aria-label="View details"
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {l.status !== 'SOLD' && l.status !== 'APPROVED' ? (
                        <button
                          type="button"
                          disabled={busyId === l._id}
                          onClick={() => act(l._id, () => adminCarsApi.review(l._id, 'approve'))}
                          className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-extrabold text-white disabled:opacity-50"
                        >
                          <Check className="h-3.5 w-3.5" aria-hidden /> Approve
                        </button>
                      ) : null}
                      {l.status !== 'SOLD' && l.status !== 'REJECTED' ? (
                        <button
                          type="button"
                          disabled={busyId === l._id}
                          onClick={() => setReject(l)}
                          className="flex items-center gap-1 rounded-lg bg-rose-50 px-3 py-2 text-xs font-extrabold text-rose-700 ring-1 ring-rose-200 disabled:opacity-50"
                        >
                          <X className="h-3.5 w-3.5" aria-hidden /> Reject
                        </button>
                      ) : null}
                      {l.status === 'APPROVED' ? (
                        <button
                          type="button"
                          disabled={busyId === l._id}
                          onClick={() => act(l._id, () => adminCarsApi.setFeatured(l._id, !l.isFeatured))}
                          className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-extrabold text-amber-700 ring-1 ring-amber-200 hover:bg-amber-50 disabled:opacity-50"
                        >
                          <Star className="h-3.5 w-3.5" aria-hidden /> {l.isFeatured ? 'Unfeature' : 'Feature'}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={busyId === l._id}
                        onClick={() => {
                          if (window.confirm(`Delete “${l.title}” and its enquiries permanently?`)) {
                            act(l._id, () => adminCarsApi.remove(l._id))
                          }
                        }}
                        className="rounded-lg p-2 text-rose-600 ring-1 ring-rose-100 hover:bg-rose-50 disabled:opacity-50"
                        aria-label="Delete listing"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </GlassPanel>
        </>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {INQUIRY_TABS.map((t) => (
              <button
                key={t.id || 'all'}
                type="button"
                onClick={() => {
                  setInqStatus(t.id)
                  setPage(1)
                }}
                className={`rounded-full px-3.5 py-1.5 text-xs font-extrabold ring-1 transition ${
                  inqStatus === t.id
                    ? 'bg-orange-500 text-white ring-orange-500'
                    : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <GlassPanel className="overflow-x-auto p-0">
            {inqRows.length === 0 ? (
              <p className="p-10 text-center text-sm font-semibold text-slate-500">{loading ? 'Loading…' : 'No enquiries yet.'}</p>
            ) : (
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Car</th>
                    <th className="px-4 py-3">Buyer</th>
                    <th className="px-4 py-3">Seller</th>
                    <th className="px-4 py-3">Offer / message</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inqRows.map((i) => (
                    <tr key={i._id} className="align-top">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Thumb src={i.listing?.image} className="h-10 w-14" />
                          <div>
                            <p className="font-bold text-slate-900">{i.listing?.title || 'Removed listing'}</p>
                            <p className="text-xs font-semibold text-orange-600">{i.listing ? formatCarPrice(i.listing.price) : ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {i.buyerName || '—'}
                        <p className="text-xs text-slate-500">{i.buyerPhone}</p>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {i.seller?.name || '—'}
                        <p className="text-xs text-slate-500">{i.seller?.phone}</p>
                      </td>
                      <td className="max-w-xs px-4 py-3 text-slate-700">
                        {i.offerPrice ? <p className="font-bold text-orange-600">{formatCarPrice(i.offerPrice)}</p> : null}
                        <p className="text-xs">{i.message || '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={i.status}
                          onChange={(e) =>
                            act(i._id, () => adminCarsApi.setInquiryStatus(i._id, e.target.value))
                          }
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold"
                          aria-label="Enquiry status"
                        >
                          {Object.entries(INQUIRY_STATUS).map(([v, m]) => (
                            <option key={v} value={v}>
                              {m.label}
                            </option>
                          ))}
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
      )}

      {tab !== 'catalog' && meta.totalPages > 1 ? (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg px-3 py-1.5 text-sm font-bold ring-1 ring-slate-200 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm font-semibold text-slate-600">
            Page {page} of {meta.totalPages}
          </span>
          <button
            type="button"
            disabled={page >= meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg px-3 py-1.5 text-sm font-bold ring-1 ring-slate-200 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      ) : null}

      <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        Customers browse live cars at /app/cars.
      </p>

      {view ? <DetailModal listing={view} onClose={() => setView(null)} /> : null}
      {reject ? (
        <RejectModal
          listing={reject}
          busy={busyId === reject._id}
          onClose={() => setReject(null)}
          onConfirm={(note) => {
            const l = reject
            setReject(null)
            act(l._id, () => adminCarsApi.review(l._id, 'reject', note))
          }}
        />
      ) : null}
    </div>
  )
}

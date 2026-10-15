import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, MessageSquare, Phone } from 'lucide-react'
import { accessoriesApi } from '../../../api/accessoriesApi.js'
import { INQUIRY_STATUS, formatCarPrice, timeAgo } from '../../../lib/carFormat.js'
import { CarImage } from '../cars/CarsMarketplacePage.jsx'

function Header({ title, sub, back }) {
  const navigate = useNavigate()
  return (
    <div className="flex items-center gap-2 pt-2">
      <button
        type="button"
        onClick={() => navigate(back)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-navy shadow-sm ring-1 ring-slate-200"
        aria-label="Back"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      <div className="min-w-0">
        <h1 className="text-lg font-black leading-tight text-navy">{title}</h1>
        <p className="text-xs font-semibold text-slate-500">{sub}</p>
      </div>
    </div>
  )
}

function Pill({ status }) {
  const m = INQUIRY_STATUS[status]
  return m ? <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold ring-1 ${m.tone}`}>{m.label}</span> : null
}

function Empty({ title, children }) {
  return (
    <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
      <MessageSquare className="mx-auto h-10 w-10 text-slate-300" aria-hidden />
      <p className="mt-3 text-sm font-extrabold text-navy">{title}</p>
      <div className="mt-1 text-xs font-semibold text-slate-500">{children}</div>
    </div>
  )
}

/** Mechanic panel: customers who asked for the mechanic's products. */
export function AccessoryLeadsPage() {
  const [rows, setRows] = useState(null)
  const [filter, setFilter] = useState('ALL')
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    accessoriesApi
      .leads()
      .then((res) => alive && setRows(res.data?.inquiries || []))
      .catch((e) => {
        if (!alive) return
        setError(e.message || 'Could not load requests')
        setRows([])
      })
    return () => {
      alive = false
    }
  }, [])

  const setStatus = async (lead, status) => {
    try {
      await accessoriesApi.setLeadStatus(lead._id, status)
      setRows((list) => list.map((x) => (x._id === lead._id ? { ...x, status } : x)))
    } catch (e) {
      setError(e.message)
    }
  }

  const shown = (rows || []).filter((r) => filter === 'ALL' || r.status === filter)

  return (
    <div className="space-y-4 pb-4">
      <Header title="Customer requests" sub="People who want your products" back="/app/accessories/mine" />
      {rows?.length ? (
        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {['ALL', 'NEW', 'CONTACTED', 'CLOSED'].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-extrabold ring-1 transition ${
                filter === f ? 'bg-navy text-white ring-navy' : 'bg-white text-slate-600 ring-slate-300'
              }`}
            >
              {f === 'ALL' ? 'All' : INQUIRY_STATUS[f].label}
            </button>
          ))}
        </div>
      ) : null}
      {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p> : null}

      {rows === null ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-200/70" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Empty title="No requests yet">Customers who ask for your products will show up here.</Empty>
      ) : shown.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-center text-sm font-semibold text-slate-500 ring-1 ring-slate-200">Nothing in this view.</p>
      ) : (
        <div className="space-y-3">
          {shown.map((l) => (
            <div
              key={l._id}
              className={`rounded-2xl bg-white p-3 shadow-sm ${l.status === 'NEW' ? 'ring-2 ring-brand/60' : 'ring-1 ring-slate-200'}`}
            >
              <div className="flex gap-3">
                <CarImage src={l.product?.image} className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-1 text-sm font-extrabold text-navy">{l.product?.name || 'Removed product'}</p>
                    <Pill status={l.status} />
                  </div>
                  <p className="text-xs font-bold text-slate-500">
                    {l.quantity} × {l.product ? formatCarPrice(l.product.price) : '—'}
                    <span className="font-medium text-slate-400"> · {timeAgo(l.createdAt)}</span>
                  </p>
                </div>
              </div>
              <div className="mt-3 rounded-xl bg-slate-50 p-3">
                <p className="text-sm font-bold text-slate-900">{l.buyerName || 'Customer'}</p>
                {l.message ? <p className="mt-1 text-[13px] font-medium text-slate-600">“{l.message}”</p> : null}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <a
                  href={`tel:${l.buyerPhone}`}
                  onClick={() => l.status === 'NEW' && setStatus(l, 'CONTACTED')}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-extrabold text-white active:scale-95"
                >
                  <Phone className="h-3.5 w-3.5" aria-hidden />
                  Call {l.buyerPhone}
                </a>
                <button
                  type="button"
                  onClick={() => setStatus(l, l.status === 'CLOSED' ? 'NEW' : 'CLOSED')}
                  className="rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-extrabold text-slate-600 active:scale-95"
                >
                  {l.status === 'CLOSED' ? 'Reopen' : 'Close'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** Customer: product requests I sent. */
export function AccessoryRequestsPage() {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [calling, setCalling] = useState('')

  useEffect(() => {
    let alive = true
    accessoriesApi
      .sentRequests()
      .then((res) => alive && setRows(res.data?.inquiries || []))
      .catch((e) => {
        if (!alive) return
        setError(e.message || 'Could not load your requests')
        setRows([])
      })
    return () => {
      alive = false
    }
  }, [])

  const call = async (productId) => {
    try {
      setCalling(productId)
      const res = await accessoriesApi.sellerContact(productId)
      if (res.data?.seller?.phone) window.location.assign(`tel:${res.data.seller.phone}`)
      else setError('Seller number is not available')
    } catch (e) {
      setError(e.message || 'Could not get the seller number')
    } finally {
      setCalling('')
    }
  }

  return (
    <div className="space-y-4 pb-4">
      <Header title="My product requests" sub="Accessories you asked sellers for" back="/app/accessories" />
      {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p> : null}
      {rows === null ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-200/70" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Empty title="You have not requested any product">
          <Link to="/app/accessories" className="font-extrabold text-brand">
            Browse accessories
          </Link>
        </Empty>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const live = r.product && r.product.status === 'APPROVED'
            return (
              <div key={r._id} className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
                <Link to={r.product ? `/app/accessories/${r.product._id}` : '/app/accessories'} className="flex gap-3">
                  <CarImage src={r.product?.image} className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-extrabold text-navy">{r.product?.name || 'Removed product'}</p>
                    <p className="text-xs font-bold text-slate-500">
                      {r.quantity} × {r.product ? formatCarPrice(r.product.price) : '—'}
                    </p>
                    <p className="text-[11px] font-semibold text-slate-400">Sent {timeAgo(r.createdAt)}</p>
                  </div>
                </Link>
                {live ? (
                  <button
                    type="button"
                    disabled={calling === r.product._id}
                    onClick={() => call(r.product._id)}
                    className="mt-3 flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-extrabold text-white active:scale-95 disabled:opacity-60"
                  >
                    <Phone className="h-3.5 w-3.5" aria-hidden />
                    {calling === r.product._id ? 'Getting number…' : 'Call seller'}
                  </button>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

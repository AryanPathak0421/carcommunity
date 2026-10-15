import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, BadgeCheck, CheckCircle2, Minus, Pencil, Phone, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { accessoriesApi } from '../../../api/accessoriesApi.js'
import { useAuth } from '../../../hooks/useAuth.js'
import { discountPct, formatCarPrice, timeAgo } from '../../../lib/carFormat.js'
import { CarImage } from '../cars/CarsMarketplacePage.jsx'

const STATUS = {
  PENDING: { label: 'Under review', tone: 'bg-amber-50 text-amber-700 ring-amber-200' },
  APPROVED: { label: 'Live', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  REJECTED: { label: 'Needs changes', tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
}

function Row({ label, value }) {
  if (!value) return null
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-3 last:border-0">
      <dt className="text-[13px] font-medium text-slate-500">{label}</dt>
      <dd className="text-right text-[14px] font-bold text-slate-900">{value}</dd>
    </div>
  )
}

export function AccessoryDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { isGuest, user } = useAuth()
  const isCustomer = !isGuest && user?.role === 'individual'

  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [slide, setSlide] = useState(0)
  const [sheet, setSheet] = useState({ open: false, qty: 1, message: '' })
  const [sending, setSending] = useState(false)
  const [formError, setFormError] = useState('')
  const [seller, setSeller] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    accessoriesApi
      .get(id)
      .then((res) => alive && setData(res.data))
      .catch((e) => alive && setError(e.status === 404 ? 'This product is no longer available.' : e.message))
    return () => {
      alive = false
    }
  }, [id])

  const p = data?.product
  const isOwner = Boolean(data?.isOwner)
  const requested = Boolean(data?.myInquiry)

  useEffect(() => {
    if (!requested || !isCustomer) return undefined
    let alive = true
    accessoriesApi
      .sellerContact(id)
      .then((res) => alive && setSeller(res.data?.seller || null))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [requested, isCustomer, id])

  const openSheet = () => {
    if (!isCustomer) {
      navigate('/b2c/auth', { state: { from: location.pathname } })
      return
    }
    setFormError('')
    setSheet((s) => ({ ...s, open: true }))
  }

  const send = async () => {
    try {
      setSending(true)
      setFormError('')
      const res = await accessoriesApi.request(id, { quantity: sheet.qty, message: sheet.message })
      setSeller(res.data?.seller || null)
      setData((d) => ({ ...d, myInquiry: { status: 'NEW', quantity: sheet.qty } }))
      setSheet({ open: false, qty: 1, message: '' })
    } catch (e) {
      setFormError(e.message || 'Could not send your request')
    } finally {
      setSending(false)
    }
  }

  const ownerAct = async (fn, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return
    try {
      setBusy(true)
      await fn()
    } catch (e) {
      setError(e.message || 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  if (error && !p) {
    return (
      <div className="space-y-4 pt-10 text-center">
        <p className="rounded-2xl bg-white p-6 text-sm font-bold text-slate-600 shadow-sm ring-1 ring-slate-200">{error}</p>
        <Link to="/app/accessories" className="inline-block rounded-xl bg-navy px-6 py-3 text-sm font-black text-white">
          Browse accessories
        </Link>
      </div>
    )
  }
  if (!p) return <div className="-mx-4 mt-2 h-80 animate-pulse bg-slate-200" aria-busy="true" />

  const images = p.images?.length ? p.images : ['']
  const off = discountPct(p.price, p.mrp)
  const status = isOwner ? STATUS[p.status] : null
  const live = p.status === 'APPROVED'

  return (
    <div className="-mx-4 pb-32">
      <div className="relative bg-white">
        <div
          className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onScroll={(e) => setSlide(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        >
          {images.map((src, i) => (
            <div key={i} className="aspect-square w-full shrink-0 snap-center bg-slate-100">
              <CarImage src={src} alt={`${p.name} photo ${i + 1}`} className="h-full w-full object-contain" />
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="absolute left-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-navy shadow-md"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        {images.length > 1 ? (
          <span className="absolute bottom-3 right-3 rounded-full bg-black/65 px-2.5 py-1 text-[11px] font-bold text-white">
            {Math.min(slide, images.length - 1) + 1} / {images.length}
          </span>
        ) : null}
      </div>

      <div className="space-y-2 bg-white px-4 pb-4 pt-4">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-[17px] font-bold leading-snug text-slate-900">{p.name}</h1>
          {status ? (
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-extrabold ring-1 ${status.tone}`}>{status.label}</span>
          ) : null}
        </div>
        {p.brand ? <p className="text-[13px] font-semibold text-slate-500">by {p.brand}</p> : null}
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-[26px] font-black leading-none text-navy">{formatCarPrice(p.price)}</span>
          {p.mrp && p.mrp > p.price ? (
            <>
              <span className="text-sm font-semibold text-slate-400 line-through">{formatCarPrice(p.mrp)}</span>
              <span className="text-sm font-black text-emerald-600">{off}% off</span>
            </>
          ) : null}
        </div>
        <p className={`text-[13px] font-bold ${p.inStock ? 'text-emerald-600' : 'text-rose-600'}`}>
          {p.inStock ? (p.stock <= 5 ? `Only ${p.stock} left` : 'In stock') : 'Out of stock'}
        </p>
      </div>

      {isOwner && p.status === 'REJECTED' && p.adminNote ? (
        <p className="mx-4 mt-3 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">Changes needed: {p.adminNote}</p>
      ) : null}
      {isOwner && p.status === 'PENDING' ? (
        <p className="mx-4 mt-3 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-700">
          Our team is reviewing this product. It goes live once approved.
        </p>
      ) : null}

      <section className="mt-2 bg-white px-4 py-4">
        <h2 className="text-[15px] font-black text-navy">Details</h2>
        <dl className="mt-1">
          <Row label="Category" value={p.category?.name} />
          <Row label="Brand" value={p.brand} />
          <Row label="Condition" value={p.condition === 'USED' ? 'Used' : 'New'} />
          <Row label="Fits" value={p.compatibility} />
          <Row label="Warranty" value={p.warranty} />
        </dl>
      </section>

      {p.description ? (
        <section className="mt-2 bg-white px-4 py-4">
          <h2 className="text-[15px] font-black text-navy">Description</h2>
          <p className="mt-2 whitespace-pre-line text-[14px] font-medium leading-relaxed text-slate-700">{p.description}</p>
        </section>
      ) : null}

      <section className="mt-2 bg-white px-4 py-4">
        <h2 className="text-[15px] font-black text-navy">Sold by</h2>
        <div className="mt-3 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-navy text-lg font-black text-white">
            {(p.seller?.name || 'M')[0].toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold text-slate-900">{p.seller?.name || 'Mechanic'}</p>
            <p className="flex items-center gap-1 text-xs font-medium text-slate-500">
              <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
              Verified CarCommunity mechanic · listed {timeAgo(p.createdAt)}
            </p>
          </div>
        </div>
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs font-medium leading-relaxed text-slate-600">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
          Reviewed by the CarCommunity team. Pay only after you have seen and checked the product.
        </p>
      </section>

      {error ? <p className="mx-4 mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p> : null}

      <div className="fixed inset-x-0 bottom-[calc(4.6rem+env(safe-area-inset-bottom,0px))] z-40 mx-auto w-full max-w-lg border-t border-slate-200 bg-white px-4 py-3 shadow-[0_-4px_16px_rgba(15,23,42,0.08)]">
        {isOwner ? (
          <div className="grid grid-cols-2 gap-3">
            <Link
              to={`/app/accessories/edit/${p._id}`}
              className="flex items-center justify-center gap-2 rounded-lg border-2 border-navy py-3 text-sm font-black text-navy"
            >
              <Pencil className="h-4 w-4" aria-hidden />
              Edit product
            </Link>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                ownerAct(async () => {
                  await accessoriesApi.remove(p._id)
                  navigate('/app/accessories/mine', { replace: true })
                }, 'Delete this product permanently?')
              }
              className="flex items-center justify-center gap-2 rounded-lg bg-rose-50 py-3 text-sm font-black text-rose-700 ring-1 ring-rose-200 disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Delete
            </button>
          </div>
        ) : !live ? (
          <p className="py-2 text-center text-sm font-bold text-slate-500">This product is no longer available</p>
        ) : requested && seller?.phone ? (
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-extrabold text-navy">{seller.name || 'Seller'}</p>
              <p className="text-xs font-medium text-slate-500">Request sent · {seller.phone}</p>
            </div>
            <a
              href={`tel:${seller.phone}`}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-black text-white active:scale-95"
            >
              <Phone className="h-4 w-4" aria-hidden />
              Call
            </a>
          </div>
        ) : (
          <button
            type="button"
            disabled={!p.inStock}
            onClick={openSheet}
            className="w-full rounded-lg bg-navy py-3.5 text-base font-black text-white transition active:scale-[0.98] disabled:bg-slate-300"
          >
            {p.inStock ? 'Request this product' : 'Out of stock'}
          </button>
        )}
      </div>

      {sheet.open ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/50" onClick={() => setSheet((s) => ({ ...s, open: false }))}>
          <div
            role="dialog"
            aria-label="Request product"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-t-3xl bg-white p-5 pb-7 shadow-2xl"
          >
            <h2 className="text-base font-black text-navy">Request this product</h2>
            <p className="mt-0.5 text-xs font-medium text-slate-500">
              The mechanic gets your name and number, and you get theirs straight away.
            </p>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
              <span className="text-sm font-bold text-slate-700">Quantity</span>
              <span className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSheet((s) => ({ ...s, qty: Math.max(1, s.qty - 1) }))}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow ring-1 ring-slate-200"
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-6 text-center text-base font-black text-navy">{sheet.qty}</span>
                <button
                  type="button"
                  onClick={() => setSheet((s) => ({ ...s, qty: Math.min(p.stock, s.qty + 1) }))}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow ring-1 ring-slate-200"
                  aria-label="Increase quantity"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </span>
            </div>
            <p className="mt-2 text-right text-sm font-black text-navy">Total ≈ {formatCarPrice(p.price * sheet.qty)}</p>
            <label className="mt-2 block text-xs font-bold text-slate-600">
              Message <span className="font-medium text-slate-400">(optional)</span>
              <textarea
                rows={3}
                maxLength={500}
                value={sheet.message}
                onChange={(e) => setSheet((s) => ({ ...s, message: e.target.value }))}
                placeholder="Which car is it for? When do you need it?"
                className="mt-1 w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-semibold outline-none focus:border-navy focus:ring-2 focus:ring-navy/15"
              />
            </label>
            {formError ? <p className="mt-2 text-sm font-semibold text-rose-600">{formError}</p> : null}
            <button
              type="button"
              disabled={sending}
              onClick={send}
              className="mt-4 w-full rounded-lg bg-navy py-3.5 text-base font-black text-white active:scale-[0.98] disabled:opacity-60"
            >
              {sending ? 'Sending…' : 'Send request'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

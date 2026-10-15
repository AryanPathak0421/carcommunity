import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  Clock,
  MapPin,
  Pencil,
  Phone,
  ShieldAlert,
  Share2,
  Trash2,
} from 'lucide-react'
import { carsApi } from '../../../api/carsApi.js'
import { useAuth } from '../../../hooks/useAuth.js'
import {
  FUEL_LABEL,
  LISTING_STATUS,
  TRANSMISSION_LABEL,
  formatCarPrice,
  formatKm,
  timeAgo,
} from '../../../lib/carFormat.js'
import { CarCard, CarImage, FavouriteButton } from './CarsMarketplacePage.jsx'

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-3 last:border-0">
      <dt className="text-[13px] font-medium text-slate-500">{label}</dt>
      <dd className="text-right text-[14px] font-bold text-slate-900">{value}</dd>
    </div>
  )
}

export function CarDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { isGuest, user } = useAuth()
  const isCustomer = !isGuest && user?.role === 'individual'

  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [slide, setSlide] = useState(0)
  const [form, setForm] = useState({ open: false, message: '', offer: '' })
  const [sending, setSending] = useState(false)
  const [formError, setFormError] = useState('')
  const [seller, setSeller] = useState(null)
  const [busy, setBusy] = useState(false)
  const [similar, setSimilar] = useState([])
  const [copied, setCopied] = useState(false)
  const offerRef = useRef(null)

  useEffect(() => {
    let alive = true
    carsApi
      .get(id)
      .then((res) => alive && setData(res.data))
      .catch((e) => alive && setError(e.status === 404 ? 'This ad is no longer available.' : e.message))
    return () => {
      alive = false
    }
  }, [id])

  const listing = data?.listing
  const isOwner = Boolean(data?.isOwner)
  const enquired = Boolean(data?.myInquiry)

  useEffect(() => {
    if (!enquired || !isCustomer) return undefined
    let alive = true
    carsApi
      .sellerContact(id)
      .then((res) => alive && setSeller(res.data?.seller || null))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [enquired, isCustomer, id])

  const make = listing?.make
  useEffect(() => {
    if (!make || listing?.status !== 'APPROVED') return undefined
    let alive = true
    carsApi
      .list({ make, limit: 7 })
      .then((res) => alive && setSimilar((res.data?.listings || []).filter((c) => c._id !== id).slice(0, 6)))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [make, id, listing?.status])

  const openSheet = (focusOffer) => {
    if (!isCustomer) {
      navigate('/b2c/auth', { state: { from: location.pathname } })
      return
    }
    setFormError('')
    setForm((f) => ({ ...f, open: true }))
    if (focusOffer) setTimeout(() => offerRef.current?.focus(), 120)
  }

  const sendEnquiry = async () => {
    const offer = form.offer.trim() ? Number(form.offer.replace(/,/g, '')) : null
    if (offer != null && (!Number.isFinite(offer) || offer <= 0)) {
      setFormError('Enter a valid offer amount')
      return
    }
    try {
      setSending(true)
      setFormError('')
      const res = await carsApi.enquire(id, { message: form.message, offerPrice: offer })
      setSeller(res.data?.seller || null)
      setData((d) => ({ ...d, myInquiry: { status: 'NEW', message: form.message, offerPrice: offer } }))
      setForm({ open: false, message: '', offer: '' })
    } catch (e) {
      setFormError(e.message || 'Could not send your enquiry')
    } finally {
      setSending(false)
    }
  }

  const share = async () => {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: listing.title, text: `${listing.title} · ${formatCarPrice(listing.price)}`, url })
        return
      }
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* share cancelled */
    }
  }

  const ownerAction = async (fn, confirmText) => {
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

  if (error && !listing) {
    return (
      <div className="space-y-4 pt-10 text-center">
        <p className="rounded-2xl bg-white p-6 text-sm font-bold text-slate-600 shadow-sm ring-1 ring-slate-200">{error}</p>
        <Link to="/app/cars" className="inline-block rounded-xl bg-navy px-6 py-3 text-sm font-black text-white">
          Browse cars
        </Link>
      </div>
    )
  }
  if (!listing) {
    return <div className="-mx-4 mt-2 h-80 animate-pulse bg-slate-200" aria-busy="true" />
  }

  const images = listing.images?.length ? listing.images : ['']
  const status = isOwner ? LISTING_STATUS[listing.status] : null
  const live = listing.status === 'APPROVED'

  return (
    <div className="-mx-4 pb-32">
      {/* gallery */}
      <div className="relative bg-black">
        <div
          className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onScroll={(e) => setSlide(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        >
          {images.map((src, i) => (
            <div key={i} className="aspect-[4/3] w-full shrink-0 snap-center">
              <CarImage src={src} alt={`${listing.title} photo ${i + 1}`} className="h-full w-full object-cover" />
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
        <div className="absolute right-3 top-3 flex gap-2">
          <button
            type="button"
            onClick={share}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-navy shadow-md"
            aria-label="Share"
          >
            <Share2 className="h-[18px] w-[18px]" />
          </button>
          <FavouriteButton id={listing._id} className="!h-10 !w-10" />
        </div>
        {listing.isFeatured ? (
          <span className="absolute left-0 top-16 rounded-r bg-amber-400 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-slate-900">
            Featured
          </span>
        ) : null}
        {images.length > 1 ? (
          <span className="absolute bottom-3 right-3 rounded-full bg-black/65 px-2.5 py-1 text-[11px] font-bold text-white">
            {Math.min(slide, images.length - 1) + 1} / {images.length}
          </span>
        ) : null}
        {copied ? (
          <span className="absolute bottom-3 left-3 rounded-full bg-black/75 px-3 py-1 text-xs font-bold text-white">
            Link copied
          </span>
        ) : null}
      </div>

      <div className="space-y-2.5 bg-white px-4 pb-4 pt-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[26px] font-black leading-none text-navy">{formatCarPrice(listing.price)}</p>
          {status ? (
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-extrabold ring-1 ${status.tone}`}>
              {status.label}
            </span>
          ) : null}
        </div>
        <p className="text-[13px] font-medium text-slate-500">
          {formatKm(listing.kmDriven)} · {FUEL_LABEL[listing.fuelType]} · {listing.year}
          {listing.negotiable ? ' · Negotiable' : ''}
        </p>
        <h1 className="text-[17px] font-bold leading-snug text-slate-900">{listing.title}</h1>
        <div className="flex items-center justify-between pt-1 text-[12px] font-medium text-slate-500">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            {[listing.locationText, listing.city].filter(Boolean).join(', ')}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {timeAgo(listing.createdAt)}
          </span>
        </div>
      </div>

      {isOwner && listing.status === 'REJECTED' && listing.adminNote ? (
        <p className="mx-4 mt-3 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">
          Changes needed: {listing.adminNote}
        </p>
      ) : null}
      {isOwner && listing.status === 'PENDING' ? (
        <p className="mx-4 mt-3 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-700">
          Our team is reviewing this ad. It goes live once approved.
        </p>
      ) : null}

      <section className="mt-2 bg-white px-4 py-4">
        <h2 className="text-[15px] font-black text-navy">Details</h2>
        <dl className="mt-1">
          <Row label="Brand" value={listing.make} />
          <Row label="Model" value={listing.model} />
          {listing.variant ? <Row label="Variant" value={listing.variant} /> : null}
          <Row label="Year" value={listing.year} />
          <Row label="Fuel" value={FUEL_LABEL[listing.fuelType] || listing.fuelType} />
          <Row label="Transmission" value={TRANSMISSION_LABEL[listing.transmission] || listing.transmission} />
          <Row label="KM driven" value={formatKm(listing.kmDriven)} />
          <Row label="No. of owners" value={listing.owners} />
        </dl>
      </section>

      {listing.description ? (
        <section className="mt-2 bg-white px-4 py-4">
          <h2 className="text-[15px] font-black text-navy">Description</h2>
          <p className="mt-2 whitespace-pre-line text-[14px] font-medium leading-relaxed text-slate-700">
            {listing.description}
          </p>
        </section>
      ) : null}

      <section className="mt-2 bg-white px-4 py-4">
        <h2 className="text-[15px] font-black text-navy">Posted by</h2>
        <div className="mt-3 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-navy text-lg font-black text-white">
            {(listing.seller?.name || 'S')[0].toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold text-slate-900">{listing.seller?.name || 'Owner'}</p>
            <p className="flex items-center gap-1 text-xs font-medium text-slate-500">
              <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
              CarCommunity member
            </p>
          </div>
        </div>
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs font-medium leading-relaxed text-slate-600">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
          Meet in a public place, check the papers and take a test drive. Never pay in advance.
        </p>
      </section>

      {similar.length > 0 ? (
        <section className="mt-2 bg-white py-4">
          <h2 className="px-4 text-[15px] font-black text-navy">More {listing.make} cars</h2>
          <div className="mt-3 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {similar.map((c) => (
              <div key={c._id} className="w-44 shrink-0">
                <CarCard car={c} />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {error ? <p className="mx-4 mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p> : null}

      {/* sticky action bar */}
      <div className="fixed inset-x-0 bottom-[calc(4.6rem+env(safe-area-inset-bottom,0px))] z-40 mx-auto w-full max-w-lg border-t border-slate-200 bg-white px-4 py-3 shadow-[0_-4px_16px_rgba(15,23,42,0.08)]">
        {isOwner ? (
          <div className="grid grid-cols-2 gap-3">
            <Link
              to={`/app/cars/sell/${listing._id}`}
              className="flex items-center justify-center gap-2 rounded-lg border-2 border-navy py-3 text-sm font-black text-navy"
            >
              <Pencil className="h-4 w-4" aria-hidden />
              Edit ad
            </Link>
            {live ? (
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  ownerAction(async () => {
                    const res = await carsApi.markSold(listing._id)
                    setData((d) => ({ ...d, listing: { ...d.listing, ...res.data.listing } }))
                  }, 'Mark this car as sold? It will be removed from the buy list.')
                }
                className="rounded-lg bg-emerald-600 py-3 text-sm font-black text-white disabled:opacity-60"
              >
                Mark as sold
              </button>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  ownerAction(async () => {
                    await carsApi.remove(listing._id)
                    navigate('/app/cars/my', { replace: true })
                  }, 'Delete this ad permanently?')
                }
                className="flex items-center justify-center gap-2 rounded-lg bg-rose-50 py-3 text-sm font-black text-rose-700 ring-1 ring-rose-200 disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                Delete
              </button>
            )}
          </div>
        ) : live ? (
          enquired && seller?.phone ? (
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-extrabold text-navy">{seller.name || 'Seller'}</p>
                <p className="text-xs font-medium text-slate-500">Enquiry sent · {seller.phone}</p>
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
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => openSheet(true)}
                className="rounded-lg border-2 border-navy py-3 text-sm font-black text-navy active:scale-[0.98]"
              >
                Make offer
              </button>
              <button
                type="button"
                onClick={() => openSheet(false)}
                className="rounded-lg bg-navy py-3 text-sm font-black text-white active:scale-[0.98]"
              >
                Contact seller
              </button>
            </div>
          )
        ) : (
          <p className="py-2 text-center text-sm font-bold text-slate-500">This car is no longer available</p>
        )}
      </div>

      {form.open ? (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/50"
          onClick={() => setForm((f) => ({ ...f, open: false }))}
        >
          <div
            role="dialog"
            aria-label="Contact seller"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-t-3xl bg-white p-5 pb-7 shadow-2xl"
          >
            <h2 className="text-base font-black text-navy">Contact the seller</h2>
            <p className="mt-0.5 text-xs font-medium text-slate-500">
              Your name and number are shared with the seller, and you get theirs straight away.
            </p>
            <label className="mt-4 block text-xs font-bold text-slate-600">
              Your offer <span className="font-medium text-slate-400">(optional)</span>
              <input
                ref={offerRef}
                inputMode="numeric"
                value={form.offer}
                onChange={(e) => setForm({ ...form, offer: e.target.value.replace(/[^\d]/g, '').slice(0, 9) })}
                placeholder={`Asking ₹${listing.price.toLocaleString('en-IN')}`}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-semibold outline-none focus:border-navy focus:ring-2 focus:ring-navy/15"
              />
            </label>
            <label className="mt-3 block text-xs font-bold text-slate-600">
              Message <span className="font-medium text-slate-400">(optional)</span>
              <textarea
                rows={3}
                maxLength={500}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Is the car still available? When can I see it?"
                className="mt-1 w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-semibold outline-none focus:border-navy focus:ring-2 focus:ring-navy/15"
              />
            </label>
            {formError ? <p className="mt-2 text-sm font-semibold text-rose-600">{formError}</p> : null}
            <button
              type="button"
              disabled={sending}
              onClick={sendEnquiry}
              className="mt-4 w-full rounded-lg bg-navy py-3.5 text-base font-black text-white active:scale-[0.98] disabled:opacity-60"
            >
              {sending ? 'Sending…' : 'Send enquiry'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

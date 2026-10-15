import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CarFront, MessageSquare, Phone } from 'lucide-react'
import { carsApi } from '../../../api/carsApi.js'
import { INQUIRY_STATUS, formatCarPrice, timeAgo } from '../../../lib/carFormat.js'
import { CarImage } from './CarsMarketplacePage.jsx'

export function StatusPill({ meta }) {
  if (!meta) return null
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold ring-1 ${meta.tone}`}>{meta.label}</span>
}

export function EmptyState({ icon: Icon = CarFront, title, children }) {
  return (
    <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
      <Icon className="mx-auto h-10 w-10 text-slate-300" aria-hidden />
      <p className="mt-3 text-sm font-extrabold text-navy">{title}</p>
      <div className="mt-1 text-xs font-semibold text-slate-500">{children}</div>
    </div>
  )
}

export function EnquiriesEmpty({ kind }) {
  return kind === 'received' ? (
    <EmptyState icon={MessageSquare} title="No enquiries yet">
      Buyers who contact you about your cars will show up here.
    </EmptyState>
  ) : (
    <EmptyState icon={MessageSquare} title="You have not contacted any seller">
      <Link to="/app/cars" className="font-extrabold text-brand">
        Browse cars
      </Link>
    </EmptyState>
  )
}

/** An enquiry a buyer sent on one of the seller's cars. */
export function ReceivedEnquiryCard({ inquiry: i, onStatus }) {
  const isNew = i.status === 'NEW'
  return (
    <div
      className={`rounded-2xl bg-white p-3 shadow-sm ring-1 ${isNew ? 'ring-2 ring-brand/60' : 'ring-slate-200'}`}
    >
      <div className="flex gap-3">
        <CarImage src={i.listing?.image} className="h-14 w-[4.5rem] shrink-0 rounded-xl object-cover" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-1 text-sm font-extrabold text-navy">{i.listing?.title || 'Removed listing'}</p>
            <StatusPill meta={INQUIRY_STATUS[i.status]} />
          </div>
          <p className="text-xs font-bold text-slate-500">
            Asking {i.listing ? formatCarPrice(i.listing.price) : '—'}
            <span className="font-medium text-slate-400"> · {timeAgo(i.createdAt)}</span>
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-xl bg-slate-50 p-3">
        <p className="text-sm font-bold text-slate-900">
          {i.buyerName || 'Buyer'}
          {i.offerPrice ? <span className="text-brand"> · offers {formatCarPrice(i.offerPrice)}</span> : null}
        </p>
        {i.message ? <p className="mt-1 text-[13px] font-medium text-slate-600">“{i.message}”</p> : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <a
          href={`tel:${i.buyerPhone}`}
          onClick={() => isNew && onStatus(i, 'CONTACTED')}
          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-extrabold text-white active:scale-95"
        >
          <Phone className="h-3.5 w-3.5" aria-hidden />
          Call {i.buyerPhone}
        </a>
        {i.status === 'CLOSED' ? (
          <button
            type="button"
            onClick={() => onStatus(i, 'NEW')}
            className="rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-extrabold text-slate-600 active:scale-95"
          >
            Reopen
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onStatus(i, 'CLOSED')}
            className="rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-extrabold text-slate-600 active:scale-95"
          >
            Close
          </button>
        )}
        {i.listing ? (
          <Link to={`/app/cars/${i.listing._id}`} className="ml-auto text-xs font-extrabold text-navy underline">
            View car
          </Link>
        ) : null}
      </div>
    </div>
  )
}

/** An enquiry the current user sent to a seller. */
export function SentEnquiryCard({ inquiry: i }) {
  const [calling, setCalling] = useState(false)
  const [error, setError] = useState('')
  const soldOrGone = !i.listing || i.listing.status !== 'APPROVED'

  const call = async () => {
    try {
      setCalling(true)
      setError('')
      const res = await carsApi.sellerContact(i.listing._id)
      const phone = res.data?.seller?.phone
      if (phone) window.location.assign(`tel:${phone}`)
      else setError('Seller number is not available')
    } catch (e) {
      setError(e.message || 'Could not get the seller number')
    } finally {
      setCalling(false)
    }
  }

  return (
    <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
      <Link to={i.listing ? `/app/cars/${i.listing._id}` : '/app/cars'} className="flex gap-3">
        <CarImage src={i.listing?.image} className="h-14 w-[4.5rem] shrink-0 rounded-xl object-cover" />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 text-sm font-extrabold text-navy">{i.listing?.title || 'Removed listing'}</p>
          <p className="text-xs font-bold text-brand">{i.listing ? formatCarPrice(i.listing.price) : ''}</p>
          <p className="text-[11px] font-semibold text-slate-400">
            Sent {timeAgo(i.createdAt)}
            {i.listing?.status === 'SOLD' ? ' · Sold' : !i.listing ? ' · No longer available' : ''}
          </p>
        </div>
      </Link>
      {i.offerPrice || i.message ? (
        <div className="mt-2 rounded-xl bg-slate-50 p-2.5 text-[13px] font-medium text-slate-600">
          {i.offerPrice ? <span className="font-bold text-brand">Your offer {formatCarPrice(i.offerPrice)}</span> : null}
          {i.offerPrice && i.message ? ' · ' : ''}
          {i.message ? `“${i.message}”` : ''}
        </div>
      ) : null}
      {!soldOrGone ? (
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            disabled={calling}
            onClick={call}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-extrabold text-white active:scale-95 disabled:opacity-60"
          >
            <Phone className="h-3.5 w-3.5" aria-hidden />
            {calling ? 'Getting number…' : 'Call seller'}
          </button>
          {error ? <span className="text-xs font-semibold text-rose-600">{error}</span> : null}
        </div>
      ) : null}
    </div>
  )
}

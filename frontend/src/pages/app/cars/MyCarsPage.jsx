import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, CarFront, ChevronRight, MessageSquare, Plus } from 'lucide-react'
import { carsApi } from '../../../api/carsApi.js'
import { useAuth } from '../../../hooks/useAuth.js'
import { LISTING_STATUS, formatCarPrice } from '../../../lib/carFormat.js'
import { CarImage } from './CarsMarketplacePage.jsx'
import { EmptyState, StatusPill } from './CarEnquiryCards.jsx'

/** The seller's own ads. Enquiries live in their own section (/app/cars/enquiries). */
export function MyCarsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isGuest, user } = useAuth()
  const [rows, setRows] = useState(null)
  const [newEnquiries, setNewEnquiries] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isGuest || (user && user.role !== 'individual')) {
      navigate('/b2c/auth', { replace: true, state: { from: location.pathname } })
    }
  }, [isGuest, user, navigate, location.pathname])

  useEffect(() => {
    if (isGuest) return undefined
    let alive = true
    carsApi
      .mine()
      .then((res) => alive && setRows(res.data?.listings || []))
      .catch((e) => {
        if (!alive) return
        setError(e.message || 'Could not load your cars')
        setRows([])
      })
    carsApi
      .received()
      .then((res) => alive && setNewEnquiries((res.data?.inquiries || []).filter((i) => i.status === 'NEW').length))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [isGuest])

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center gap-2 pt-2">
        <button
          type="button"
          onClick={() => navigate('/app/cars')}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-navy shadow-sm ring-1 ring-slate-200"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 text-lg font-black text-navy">My cars</h1>
        <Link
          to="/app/cars/sell"
          className="flex items-center gap-1.5 rounded-2xl bg-brand px-3.5 py-2.5 text-sm font-extrabold text-white shadow-md shadow-brand/30 active:scale-95"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Sell
        </Link>
      </div>

      <Link
        to="/app/cars/enquiries"
        className="flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-slate-200 transition active:scale-[0.98]"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-brand">
          <MessageSquare className="h-5 w-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black text-navy">Enquiries</span>
          <span className="block text-xs font-semibold text-slate-500">Buyers on your cars &amp; cars you contacted</span>
        </span>
        {newEnquiries > 0 ? (
          <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] font-black text-white">{newEnquiries} new</span>
        ) : null}
        <ChevronRight className="h-5 w-5 text-slate-400" aria-hidden />
      </Link>

      {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p> : null}

      {rows === null ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-200/70" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={CarFront} title="You have not listed a car yet">
          <Link to="/app/cars/sell" className="font-extrabold text-brand">
            Sell your first car
          </Link>
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {rows.map((l) => (
            <Link
              key={l._id}
              to={`/app/cars/${l._id}`}
              className="flex gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200 transition active:scale-[0.98]"
            >
              <CarImage src={l.images?.[0]} className="h-20 w-24 shrink-0 rounded-xl object-cover" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="line-clamp-1 text-sm font-extrabold text-navy">{l.title}</p>
                  <StatusPill meta={LISTING_STATUS[l.status]} />
                </div>
                <p className="text-sm font-black text-brand">{formatCarPrice(l.price)}</p>
                <p className="text-[11px] font-semibold text-slate-500">
                  {l.inquiryCount} enquir{l.inquiryCount === 1 ? 'y' : 'ies'} · {l.views} views
                </p>
                {l.status === 'REJECTED' && l.adminNote ? (
                  <p className="mt-1 line-clamp-2 text-[11px] font-semibold text-rose-600">{l.adminNote}</p>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

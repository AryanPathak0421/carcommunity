import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { carsApi } from '../../../api/carsApi.js'
import { useAuth } from '../../../hooks/useAuth.js'
import { EnquiriesEmpty, ReceivedEnquiryCard, SentEnquiryCard } from './CarEnquiryCards.jsx'

/** Customer "Enquiries" section: leads on my cars (received) and cars I contacted (sent). */
export function CarEnquiriesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isGuest, user } = useAuth()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'sent' ? 'sent' : 'received'

  const [received, setReceived] = useState(null)
  const [sent, setSent] = useState(null)
  const [filter, setFilter] = useState('ALL')
  const [error, setError] = useState('')

  useEffect(() => {
    if (isGuest || (user && user.role !== 'individual')) {
      navigate('/b2c/auth', { replace: true, state: { from: location.pathname } })
    }
  }, [isGuest, user, navigate, location.pathname])

  useEffect(() => {
    if (isGuest) return undefined
    let alive = true
    Promise.all([carsApi.received(), carsApi.sent()])
      .then(([r, s]) => {
        if (!alive) return
        setReceived(r.data?.inquiries || [])
        setSent(s.data?.inquiries || [])
      })
      .catch((e) => {
        if (!alive) return
        setError(e.message || 'Could not load your enquiries')
        setReceived([])
        setSent([])
      })
    return () => {
      alive = false
    }
  }, [isGuest])

  const setStatus = async (inq, status) => {
    try {
      await carsApi.setInquiryStatus(inq._id, status)
      setReceived((list) => list.map((x) => (x._id === inq._id ? { ...x, status } : x)))
    } catch (e) {
      setError(e.message)
    }
  }

  const newCount = (received || []).filter((i) => i.status === 'NEW').length
  const FILTERS = [
    { id: 'ALL', label: 'All' },
    { id: 'NEW', label: 'New' },
    { id: 'CONTACTED', label: 'Contacted' },
    { id: 'CLOSED', label: 'Closed' },
  ]
  const shownReceived = (received || []).filter((i) => filter === 'ALL' || i.status === filter)

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
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-black leading-tight text-navy">Enquiries</h1>
          <p className="text-xs font-semibold text-slate-500">Buyers on your cars and cars you contacted</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1" role="tablist">
        {[
          { id: 'received', label: 'Received', count: received?.length, badge: newCount },
          { id: 'sent', label: 'Sent', count: sent?.length, badge: 0 },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setParams({ tab: t.id }, { replace: true })}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-extrabold transition ${
              tab === t.id ? 'bg-white text-navy shadow-sm' : 'text-slate-500'
            }`}
          >
            {t.label}
            {t.count != null ? <span className="text-xs font-bold text-slate-400">{t.count}</span> : null}
            {t.badge > 0 ? (
              <span className="rounded-full bg-brand px-1.5 text-[10px] font-black text-white">{t.badge} new</span>
            ) : null}
          </button>
        ))}
      </div>

      {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p> : null}

      {received === null ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-2xl bg-slate-200/70" />
          ))}
        </div>
      ) : tab === 'received' ? (
        <>
          {received.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-extrabold ring-1 transition ${
                    filter === f.id ? 'bg-navy text-white ring-navy' : 'bg-white text-slate-600 ring-slate-300'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          ) : null}
          {received.length === 0 ? (
            <EnquiriesEmpty kind="received" />
          ) : shownReceived.length === 0 ? (
            <p className="rounded-2xl bg-white p-6 text-center text-sm font-semibold text-slate-500 ring-1 ring-slate-200">
              Nothing in this view.
            </p>
          ) : (
            <div className="space-y-3">
              {shownReceived.map((i) => (
                <ReceivedEnquiryCard key={i._id} inquiry={i} onStatus={setStatus} />
              ))}
            </div>
          )}
        </>
      ) : sent.length === 0 ? (
        <EnquiriesEmpty kind="sent" />
      ) : (
        <div className="space-y-3">
          {sent.map((i) => (
            <SentEnquiryCard key={i._id} inquiry={i} />
          ))}
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronRight, MessageSquare, PackagePlus, Plus } from 'lucide-react'
import { accessoriesApi } from '../../../api/accessoriesApi.js'
import { useAuth } from '../../../hooks/useAuth.js'
import { formatCarPrice } from '../../../lib/carFormat.js'
import { CarImage } from '../cars/CarsMarketplacePage.jsx'

const STATUS = {
  PENDING: { label: 'Under review', tone: 'bg-amber-50 text-amber-700 ring-amber-200' },
  APPROVED: { label: 'Live', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  REJECTED: { label: 'Needs changes', tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
}

/** Mechanic panel: products the mechanic sells (needs admin approval before customers see them). */
export function MyAccessoriesPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const kycOk = user?.labourProfile?.kycStatus === 'verified'
  const [rows, setRows] = useState(null)
  const [newLeads, setNewLeads] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    accessoriesApi
      .mine()
      .then((res) => alive && setRows(res.data?.products || []))
      .catch((e) => {
        if (!alive) return
        setError(e.message || 'Could not load your products')
        setRows([])
      })
    accessoriesApi
      .leads()
      .then((res) => alive && setNewLeads((res.data?.inquiries || []).filter((i) => i.status === 'NEW').length))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const live = (rows || []).filter((r) => r.status === 'APPROVED').length

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center gap-2 pt-2">
        <button
          type="button"
          onClick={() => navigate('/app/profile')}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-navy shadow-sm ring-1 ring-slate-200"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-black leading-tight text-navy">My products</h1>
          <p className="text-xs font-semibold text-slate-500">
            {rows ? `${rows.length} listed · ${live} live` : 'Sell car accessories to customers'}
          </p>
        </div>
        {kycOk ? (
          <Link
            to="/app/accessories/new"
            className="flex items-center gap-1.5 rounded-2xl bg-brand px-3.5 py-2.5 text-sm font-extrabold text-white shadow-md shadow-brand/30 active:scale-95"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add
          </Link>
        ) : null}
      </div>

      {!kycOk ? (
        <p className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">
          Complete your KYC verification to start listing products.{' '}
          <Link to="/app/kyc" className="font-extrabold underline">
            Open KYC
          </Link>
        </p>
      ) : null}

      <Link
        to="/app/accessories/leads"
        className="flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-slate-200 transition active:scale-[0.98]"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-brand">
          <MessageSquare className="h-5 w-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black text-navy">Customer requests</span>
          <span className="block text-xs font-semibold text-slate-500">People who want your products</span>
        </span>
        {newLeads > 0 ? (
          <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] font-black text-white">{newLeads} new</span>
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
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
          <PackagePlus className="mx-auto h-10 w-10 text-slate-300" aria-hidden />
          <p className="mt-3 text-sm font-extrabold text-navy">You have not listed a product yet</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Add seat covers, mats, lights and more. Products go live after our team approves them.
          </p>
          {kycOk ? (
            <Link to="/app/accessories/new" className="mt-3 inline-block text-sm font-extrabold text-brand">
              Add your first product
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((p) => (
            <Link
              key={p._id}
              to={`/app/accessories/${p._id}`}
              className="flex gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200 transition active:scale-[0.98]"
            >
              <CarImage src={p.images?.[0]} className="h-20 w-20 shrink-0 rounded-xl object-cover" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="line-clamp-2 text-sm font-extrabold leading-snug text-navy">{p.name}</p>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold ring-1 ${STATUS[p.status]?.tone}`}>
                    {STATUS[p.status]?.label}
                  </span>
                </div>
                <p className="text-sm font-black text-brand">{formatCarPrice(p.price)}</p>
                <p className="text-[11px] font-semibold text-slate-500">
                  Stock {p.stock} · {p.inquiryCount} request{p.inquiryCount === 1 ? '' : 's'} · {p.views} views
                </p>
                {p.status === 'REJECTED' && p.adminNote ? (
                  <p className="mt-1 line-clamp-2 text-[11px] font-semibold text-rose-600">{p.adminNote}</p>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

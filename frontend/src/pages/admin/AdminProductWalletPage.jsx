import { useCallback, useEffect, useState } from 'react'

import { adminProductWalletApi } from '../../api/adminProductWalletApi.js'

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`

const TABS = ['', 'PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED']
const TONE = {
  PENDING: 'bg-amber-50 text-amber-700 ring-amber-200',
  APPROVED: 'bg-sky-50 text-sky-700 ring-sky-200',
  PROCESSING: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  REJECTED: 'bg-rose-50 text-rose-700 ring-rose-200',
}

// Which actions are offered for a request in a given status.
const ACTIONS = {
  PENDING: [['APPROVED', 'Approve', 'bg-sky-600'], ['REJECTED', 'Reject', 'bg-rose-600']],
  APPROVED: [['PROCESSING', 'Mark processing', 'bg-indigo-600'], ['REJECTED', 'Reject', 'bg-rose-600']],
  PROCESSING: [['COMPLETED', 'Mark completed', 'bg-emerald-600'], ['REJECTED', 'Reject', 'bg-rose-600']],
}

export function AdminProductWalletPage() {
  const [status, setStatus] = useState('')
  const [rows, setRows] = useState([])
  const [totals, setTotals] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    adminProductWalletApi
      .listWithdrawals(status)
      .then((r) => {
        setRows(r.data?.requests || [])
        setTotals(r.data?.totals || {})
        setError('')
      })
      .catch((e) => setError(e.message || 'Could not load requests'))
      .finally(() => setLoading(false))
  }, [status])
  useEffect(load, [load])

  const act = async (row, next) => {
    let remarks = ''
    if (next === 'REJECTED') {
      remarks = window.prompt('Reason for rejecting this withdrawal?') || ''
      if (!remarks.trim()) return
    }
    try {
      setBusyId(row._id)
      await adminProductWalletApi.updateStatus(row._id, next, remarks)
      load()
    } catch (e) {
      alert(e.message || 'Could not update the request')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-black text-slate-900">Product Wallet — Withdrawals</h1>
        <p className="text-sm font-medium text-slate-500">Mechanic payouts from accessory sales. Pay the bank account, then mark completed.</p>
      </div>

      <div className="flex flex-wrap gap-4">
        {['PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED'].map((s) => (
          <div key={s} className="rounded-xl bg-white px-4 py-2 shadow-sm ring-1 ring-slate-200">
            <p className="text-[11px] font-bold uppercase text-slate-500">{s}</p>
            <p className="text-lg font-black text-slate-900">{inr(totals[s])}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t || 'all'}
            type="button"
            onClick={() => setStatus(t)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-extrabold ring-1 transition ${status === t ? 'bg-orange-500 text-white ring-orange-500' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'}`}
          >
            {t || 'All'}
          </button>
        ))}
      </div>

      {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p> : null}

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        {rows.length === 0 ? (
          <p className="p-10 text-center text-sm font-semibold text-slate-500">{loading ? 'Loading…' : 'No withdrawal requests.'}</p>
        ) : (
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-extrabold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Mechanic</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Available</th>
                <th className="px-4 py-3">Bank details</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r._id} className="align-top">
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-900">{r.mechanic?.name || '—'}</p>
                    <p className="text-xs text-slate-500">{r.mechanic?.phone}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{new Date(r.createdAt).toLocaleDateString('en-IN')}</p>
                  </td>
                  <td className="px-4 py-3 font-black text-slate-900">{inr(r.amount)}</td>
                  <td className="px-4 py-3 font-semibold text-slate-700">{inr(r.availableBalance)}</td>
                  <td className="px-4 py-3 text-xs text-slate-700">
                    <p className="font-bold">{r.bankDetails?.accountHolderName}</p>
                    <p>A/C {r.bankDetails?.accountNumber}</p>
                    <p>{r.bankDetails?.ifscCode} · {r.bankDetails?.bankName}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${TONE[r.status] || 'bg-slate-100 text-slate-600 ring-slate-200'}`}>{r.status}</span>
                    {r.adminRemarks ? <p className="mt-1 max-w-[12rem] text-xs text-slate-500">“{r.adminRemarks}”</p> : null}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {(ACTIONS[r.status] || []).map(([next, label, color]) => (
                        <button
                          key={next}
                          type="button"
                          disabled={busyId === r._id}
                          onClick={() => act(r, next)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-black text-white active:scale-95 disabled:opacity-50 ${color}`}
                        >
                          {label}
                        </button>
                      ))}
                      {!ACTIONS[r.status] ? <span className="text-xs text-slate-400">—</span> : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

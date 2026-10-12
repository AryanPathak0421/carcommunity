import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Banknote,
  CheckCircle2,
  Clock3,
  IndianRupee,
  Loader2,
  XCircle,
} from 'lucide-react'
import { GlassPanel } from '../../components/ui/GlassPanel.jsx'
import { ApiError } from '../../api/http.js'
import { adminWalletsApi } from '../../api/adminWalletsApi.js'

const STATUS_STYLES = {
  APPROVED: 'bg-emerald-100 text-emerald-700',
  PENDING: 'bg-amber-100 text-amber-700',
  REJECTED: 'bg-rose-100 text-rose-700',
}

function formatInr(amount) {
  return `₹${Number(amount || 0).toLocaleString('en-IN')}`
}

function Toast({ toast }) {
  return (
    <AnimatePresence>
      {toast ? (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className={`fixed right-6 top-6 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold shadow-lg ${
            toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
          }`}
        >
          {toast.type === 'error' ? (
            <XCircle className="h-4 w-4" aria-hidden />
          ) : (
            <CheckCircle2 className="h-4 w-4" aria-hidden />
          )}
          {toast.message}
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

function KpiCard({ icon: Icon, label, value, tone = 'brand' }) {
  const tones = {
    brand: 'bg-brand/10 text-brand',
    amber: 'bg-amber-100 text-amber-700',
    emerald: 'bg-emerald-100 text-emerald-700',
  }
  return (
    <GlassPanel className="flex items-center gap-3 p-4">
      <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tones[tone]}`}>
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div>
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="text-xl font-extrabold text-slate-900">{value}</p>
      </div>
    </GlassPanel>
  )
}

/** Admin review queue for customer wallet payouts. */
export function AdminUserWalletPage() {
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState([])
  const [summary, setSummary] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [busyId, setBusyId] = useState('')
  const [rejectingId, setRejectingId] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [toast, setToast] = useState(null)

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
    window.setTimeout(() => setToast(null), 3000)
  }, [])

  const load = useCallback(
    async (status) => {
      const res = await adminWalletsApi.getUserWithdrawals(status || undefined)
      setRequests(res.data?.requests || [])
      setSummary(res.data?.summary || null)
    },
    [],
  )

  useEffect(() => {
    let cancelled = false
    load('')
      .catch((err) => {
        if (!cancelled) {
          showToast(err instanceof ApiError ? err.message : 'Failed to load withdrawals', 'error')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [load, showToast])

  const decide = async (id, status, remarks = '') => {
    setBusyId(id)
    try {
      await adminWalletsApi.updateWithdrawalStatus(id, status, remarks)
      showToast(status === 'APPROVED' ? 'Withdrawal approved' : 'Withdrawal rejected and refunded')
      setRejectingId('')
      setRejectReason('')
      await load(statusFilter)
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Could not update the request', 'error')
    } finally {
      setBusyId('')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand" aria-hidden />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Toast toast={toast} />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          icon={Clock3}
          label="Awaiting approval"
          value={summary?.pending ?? 0}
          tone="amber"
        />
        <KpiCard icon={IndianRupee} label="Amount on hold" value={formatInr(summary?.pendingAmount)} />
        <KpiCard
          icon={Banknote}
          label="Paid out"
          value={formatInr(summary?.paidOut)}
          tone="emerald"
        />
      </div>

      <GlassPanel className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Customer withdrawals</h2>
            <p className="text-xs text-slate-500">
              Rejecting a request returns the amount to the customer&apos;s wallet.
            </p>
          </div>
          <select
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              load(e.target.value).catch(() => showToast('Failed to load withdrawals', 'error'))
            }}
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Customer</th>
                <th className="px-5 py-3 font-semibold">Amount</th>
                <th className="px-5 py-3 font-semibold">Bank details</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Requested</th>
                <th className="px-5 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.length ? (
                requests.map((r) => (
                  <tr key={r._id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-slate-900">
                        {r.userId?.fullName || 'Unknown'}
                      </p>
                      <p className="text-xs text-slate-500">{r.userId?.phone}</p>
                    </td>
                    <td className="px-5 py-3 font-extrabold text-slate-900">
                      {formatInr(r.amount)}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-600">
                      <p className="font-semibold text-slate-800">
                        {r.bankDetails?.accountHolderName}
                      </p>
                      <p>
                        {r.bankDetails?.bankName} · {r.bankDetails?.accountNumber}
                      </p>
                      <p className="uppercase">{r.bankDetails?.ifscCode}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          STATUS_STYLES[r.status] || STATUS_STYLES.PENDING
                        }`}
                      >
                        {r.status}
                      </span>
                      {r.adminRemarks ? (
                        <p className="mt-1 max-w-[16rem] text-[11px] text-slate-500">
                          {r.adminRemarks}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500">
                      {new Date(r.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-5 py-3">
                      {r.status !== 'PENDING' ? (
                        <span className="text-xs text-slate-400">—</span>
                      ) : rejectingId === r._id ? (
                        <div className="flex w-56 flex-col gap-2">
                          <input
                            type="text"
                            autoFocus
                            placeholder="Reason shown to the customer"
                            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={busyId === r._id}
                              onClick={() => decide(r._id, 'REJECTED', rejectReason.trim())}
                              className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
                            >
                              Confirm reject
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRejectingId('')
                                setRejectReason('')
                              }}
                              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={busyId === r._id}
                            onClick={() => decide(r._id, 'APPROVED')}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={busyId === r._id}
                            onClick={() => setRejectingId(r._id)}
                            className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-500">
                    No customer withdrawals yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassPanel>
    </div>
  )
}

import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Gift, IndianRupee, Loader2, Users, XCircle } from 'lucide-react'
import { GlassPanel } from '../../components/ui/GlassPanel.jsx'
import { AppPrimaryButton } from '../../components/app/AppPrimaryButton.jsx'
import { ApiError } from '../../api/http.js'
import { adminSettingsApi } from '../../api/adminSettingsApi.js'
import { adminReferralsApi } from '../../api/adminReferralsApi.js'

const labelClass = 'mb-1.5 block text-xs font-semibold text-slate-600'
const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20'

const STATUS_STYLES = {
  REWARDED: 'bg-emerald-100 text-emerald-700',
  QUALIFIED: 'bg-sky-100 text-sky-700',
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
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
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

export function AdminReferralsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  // Settings form
  const [isActive, setIsActive] = useState(false)
  const [rewardTrigger, setRewardTrigger] = useState('FIRST_BOOKING')
  const [referrerReward, setReferrerReward] = useState(100)
  const [refereeReward, setRefereeReward] = useState(0)
  const [minBookingAmount, setMinBookingAmount] = useState(0)
  const [maxRewardsPerReferrer, setMaxRewardsPerReferrer] = useState(0)

  // Table
  const [items, setItems] = useState([])
  const [summary, setSummary] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
    window.setTimeout(() => setToast(null), 3000)
  }, [])

  const loadReferrals = useCallback(
    async (status) => {
      try {
        const res = await adminReferralsApi.list({ status: status || undefined, limit: 50 })
        setItems(res.data?.items || [])
        setSummary(res.data?.summary || null)
      } catch (err) {
        showToast(err instanceof ApiError ? err.message : 'Failed to load referrals', 'error')
      }
    },
    [showToast],
  )

  useEffect(() => {
    let cancelled = false
    Promise.all([adminSettingsApi.getSettings(), adminReferralsApi.list({ limit: 50 })])
      .then(([settingsRes, listRes]) => {
        if (cancelled) return
        const referral = settingsRes.data?.settings?.referral || {}
        setIsActive(Boolean(referral.isActive))
        setRewardTrigger(referral.rewardTrigger || 'FIRST_BOOKING')
        setReferrerReward(referral.referrerReward ?? 100)
        setRefereeReward(referral.refereeReward ?? 0)
        setMinBookingAmount(referral.minBookingAmount ?? 0)
        setMaxRewardsPerReferrer(referral.maxRewardsPerReferrer ?? 0)
        setItems(listRes.data?.items || [])
        setSummary(listRes.data?.summary || null)
      })
      .catch((err) => {
        if (cancelled) return
        showToast(err instanceof ApiError ? err.message : 'Failed to load page', 'error')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [showToast])

  const handleSave = async () => {
    setSaving(true)
    try {
      await adminSettingsApi.updateReferral({
        isActive,
        rewardTrigger,
        referrerReward: Number(referrerReward),
        refereeReward: Number(refereeReward),
        minBookingAmount: Number(minBookingAmount),
        maxRewardsPerReferrer: Number(maxRewardsPerReferrer),
      })
      showToast('Referral settings saved')
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to save settings', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleReject = async (id) => {
    try {
      await adminReferralsApi.reject(id, 'Rejected by admin')
      showToast('Referral rejected')
      await loadReferrals(statusFilter)
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Could not reject referral', 'error')
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
        <KpiCard icon={Users} label="Total referrals" value={summary?.totalReferrals ?? 0} />
        <KpiCard
          icon={CheckCircle2}
          label="Rewarded"
          value={summary?.counts?.REWARDED ?? 0}
          tone="emerald"
        />
        <KpiCard
          icon={IndianRupee}
          label="Total paid out"
          value={formatInr(summary?.totalPaid)}
          tone="amber"
        />
      </div>

      <GlassPanel className="p-5">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <Gift className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-base font-bold text-slate-900">Refer &amp; Earn settings</h2>
            <p className="text-xs text-slate-500">
              Reward amounts are credited to the user&apos;s wallet.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={labelClass} htmlFor="referral-trigger">
              When to reward
            </label>
            <select
              id="referral-trigger"
              className={inputClass}
              value={rewardTrigger}
              onChange={(e) => setRewardTrigger(e.target.value)}
            >
              <option value="FIRST_BOOKING">After friend&apos;s first completed booking</option>
              <option value="SIGNUP">Immediately on signup</option>
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="referrer-reward">
              Referrer reward (₹)
            </label>
            <input
              id="referrer-reward"
              type="number"
              min="0"
              className={inputClass}
              value={referrerReward}
              onChange={(e) => setReferrerReward(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="referee-reward">
              Joining bonus for new user (₹)
            </label>
            <input
              id="referee-reward"
              type="number"
              min="0"
              className={inputClass}
              value={refereeReward}
              onChange={(e) => setRefereeReward(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="min-booking">
              Minimum booking amount (₹)
            </label>
            <input
              id="min-booking"
              type="number"
              min="0"
              className={inputClass}
              value={minBookingAmount}
              onChange={(e) => setMinBookingAmount(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="max-rewards">
              Max rewards per referrer (0 = unlimited)
            </label>
            <input
              id="max-rewards"
              type="number"
              min="0"
              className={inputClass}
              value={maxRewardsPerReferrer}
              onChange={(e) => setMaxRewardsPerReferrer(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <label className="flex w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[#F97316]"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <span className="text-sm font-semibold text-slate-800">
                Referral programme active
              </span>
            </label>
          </div>
        </div>

        <div className="mt-5">
          <AppPrimaryButton onClick={handleSave} loading={saving} className="!w-auto !px-6">
            Save settings
          </AppPrimaryButton>
        </div>
      </GlassPanel>

      <GlassPanel className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 px-5 py-4">
          <h2 className="text-base font-bold text-slate-900">Referrals</h2>
          <select
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              loadReferrals(e.target.value)
            }}
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="QUALIFIED">Qualified</option>
            <option value="REWARDED">Rewarded</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Referrer</th>
                <th className="px-5 py-3 font-semibold">New user</th>
                <th className="px-5 py-3 font-semibold">Code</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Reward</th>
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length ? (
                items.map((row) => (
                  <tr key={row._id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-slate-900">
                        {row.referrerId?.fullName || 'Unknown'}
                      </p>
                      <p className="text-xs text-slate-500">{row.referrerId?.phone}</p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-semibold text-slate-900">
                        {row.refereeId?.fullName || 'Unknown'}
                      </p>
                      <p className="text-xs text-slate-500">{row.refereeId?.phone}</p>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-700">{row.code}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          STATUS_STYLES[row.status] || STATUS_STYLES.PENDING
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-semibold text-slate-900">
                      {row.status === 'REWARDED' ? formatInr(row.referrerReward) : '—'}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500">
                      {new Date(row.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-5 py-3">
                      {row.status === 'PENDING' || row.status === 'QUALIFIED' ? (
                        <button
                          type="button"
                          onClick={() => handleReject(row._id)}
                          className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                        >
                          Reject
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-500">
                    No referrals yet.
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

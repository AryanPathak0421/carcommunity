import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  CheckCircle2,
  Clock3,
  Copy,
  Gift,
  Loader2,
  Share2,
  Users,
  Wallet,
} from 'lucide-react'
import { AppStackScreenHeader } from '../../components/app/AppStackScreenHeader.jsx'
import { AppEmptyState } from '../../components/app/AppEmptyState.jsx'
import { AppPrimaryButton } from '../../components/app/AppPrimaryButton.jsx'
import { GlassPanel } from '../../components/ui/GlassPanel'
import { ApiError } from '../../api/http.js'
import { referralsApi } from '../../api/referralsApi.js'
import { buildReferralLink } from '../../lib/referralCapture.js'

function formatInr(amount) {
  return `₹${Number(amount || 0).toLocaleString('en-IN')}`
}

const STATUS_STYLES = {
  REWARDED: { label: 'Rewarded', cls: 'bg-emerald-100 text-emerald-700' },
  QUALIFIED: { label: 'Processing', cls: 'bg-sky-100 text-sky-700' },
  PENDING: { label: 'Pending', cls: 'bg-amber-100 text-amber-700' },
  REJECTED: { label: 'Rejected', cls: 'bg-rose-100 text-rose-700' },
}

function StatTile({ icon: Icon, label, value }) {
  return (
    <GlassPanel className="p-3.5 text-center">
      <span className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <p className="text-xl font-extrabold text-slate-900">{value}</p>
      <p className="mt-0.5 text-[11px] font-medium text-slate-500">{label}</p>
    </GlassPanel>
  )
}

export function ReferAndEarnPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')

  useEffect(() => {
    let cancelled = false
    referralsApi
      .getMyReferrals()
      .then((res) => {
        if (cancelled) return
        setData(res.data || null)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof ApiError ? err.message : 'Could not load your referral details')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const code = data?.code || ''
  const link = code ? buildReferralLink(code) : ''
  const reward = data?.config?.referrerReward ?? 0
  const joiningBonus = data?.config?.refereeReward ?? 0
  const onBooking = data?.config?.rewardTrigger === 'FIRST_BOOKING'

  const shareMessage = `Book verified car and bike mechanics on CarCommunity. Use my code ${code} when you sign up${
    joiningBonus > 0 ? ` and get ${formatInr(joiningBonus)} in your wallet` : ''
  }. ${link}`

  const copy = async (value, what) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(what)
      window.setTimeout(() => setCopied(''), 2000)
    } catch {
      setError('Could not copy. Please select and copy manually.')
    }
  }

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'CarCommunity', text: shareMessage, url: link })
        return
      } catch {
        // User dismissed the sheet; fall through to WhatsApp.
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`, '_blank', 'noopener')
  }

  if (loading) {
    return (
      <>
        <AppStackScreenHeader title="Refer & Earn" backTo="/app/profile" />
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand" aria-hidden />
        </div>
      </>
    )
  }

  return (
    <>
      <AppStackScreenHeader title="Refer & Earn" backTo="/app/profile" />

      <div className="space-y-4 pt-4">
        {error ? (
          <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">{error}</p>
        ) : null}

        {data && data.config?.isActive === false ? (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            Referrals are paused right now. Your code will start earning again once the programme is back on.
          </p>
        ) : null}

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand via-orange-500 to-amber-600 p-5 text-white shadow-lg"
        >
          <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold ring-1 ring-white/25">
            <Gift className="h-3.5 w-3.5" aria-hidden />
            Invite friends
          </span>
          <p className="mt-3 text-2xl font-extrabold leading-tight">
            Earn {formatInr(reward)} for every friend who joins
          </p>
          <p className="mt-1.5 text-sm text-white/85">
            {onBooking
              ? 'Your reward is credited once your friend completes their first booking.'
              : 'Your reward is credited as soon as your friend signs up.'}
          </p>

          <div className="mt-4 rounded-2xl bg-white/12 p-3 ring-1 ring-white/20">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
              Your code
            </p>
            <div className="mt-1 flex items-center justify-between gap-3">
              <p className="font-mono text-2xl font-black tracking-[0.15em]">{code || '--------'}</p>
              <button
                type="button"
                onClick={() => copy(code, 'code')}
                className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-900 active:scale-95"
              >
                {copied === 'code' ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-brand" aria-hidden />
                ) : (
                  <Copy className="h-3.5 w-3.5" aria-hidden />
                )}
                {copied === 'code' ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-3 gap-2.5">
          <StatTile icon={Users} label="Invited" value={data?.stats?.invited ?? 0} />
          <StatTile icon={CheckCircle2} label="Rewarded" value={data?.stats?.rewarded ?? 0} />
          <StatTile icon={Wallet} label="Earned" value={formatInr(data?.stats?.totalEarned)} />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <AppPrimaryButton onClick={share}>
            <Share2 className="h-4 w-4" aria-hidden />
            Share
          </AppPrimaryButton>
          <button
            type="button"
            onClick={() => copy(link, 'link')}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm active:scale-[0.99]"
          >
            {copied === 'link' ? 'Link copied' : 'Copy link'}
          </button>
        </div>

        <GlassPanel className="p-4">
          <h2 className="text-sm font-bold text-slate-900">How it works</h2>
          <ol className="mt-3 space-y-2.5 text-xs leading-relaxed text-slate-600">
            <li className="flex gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/10 text-[10px] font-bold text-brand">
                1
              </span>
              Share your code or link with friends.
            </li>
            <li className="flex gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/10 text-[10px] font-bold text-brand">
                2
              </span>
              They enter the code while signing up
              {joiningBonus > 0 ? ` and get ${formatInr(joiningBonus)} instantly.` : '.'}
            </li>
            <li className="flex gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/10 text-[10px] font-bold text-brand">
                3
              </span>
              {onBooking
                ? `Once they finish their first booking, ${formatInr(reward)} lands in your wallet.`
                : `${formatInr(reward)} lands in your wallet straight away.`}
            </li>
          </ol>
          <Link
            to="/app/wallet"
            className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white"
          >
            <Wallet className="h-3.5 w-3.5" aria-hidden />
            Open my wallet
          </Link>
        </GlassPanel>

        <div>
          <h2 className="mb-2.5 text-sm font-bold text-slate-900">Your invites</h2>
          {data?.referrals?.length ? (
            <ul className="space-y-2">
              {data.referrals.map((r) => {
                const status = STATUS_STYLES[r.status] ?? STATUS_STYLES.PENDING
                return (
                  <li key={r._id}>
                    <GlassPanel className="flex items-center justify-between gap-3 p-3.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">
                          {r.referee?.fullName || 'New user'}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {r.referee?.phone} · {new Date(r.createdAt).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span
                          className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-bold ${status.cls}`}
                        >
                          {status.label}
                        </span>
                        {r.status === 'REWARDED' ? (
                          <p className="mt-1 text-sm font-extrabold text-emerald-700">
                            +{formatInr(r.referrerReward)}
                          </p>
                        ) : r.status === 'REJECTED' ? (
                          <p className="mt-1 text-[10px] text-slate-400">Not eligible</p>
                        ) : (
                          <p className="mt-1 flex items-center justify-end gap-1 text-[10px] text-slate-400">
                            <Clock3 className="h-3 w-3" aria-hidden />
                            {onBooking ? 'After 1st booking' : 'Processing'}
                          </p>
                        )}
                      </div>
                    </GlassPanel>
                  </li>
                )
              })}
            </ul>
          ) : (
            <AppEmptyState
              icon={Users}
              title="No invites yet"
              subtitle="Share your code to start earning wallet credit."
            />
          )}
        </div>
      </div>
    </>
  )
}

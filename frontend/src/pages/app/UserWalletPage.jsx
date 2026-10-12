import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  CheckCircle2,
  Gift,
  Loader2,
  Receipt,
  Wallet as WalletIcon,
} from 'lucide-react'
import { AppStackScreenHeader } from '../../components/app/AppStackScreenHeader.jsx'
import { AppEmptyState } from '../../components/app/AppEmptyState.jsx'
import { AppPrimaryButton } from '../../components/app/AppPrimaryButton.jsx'
import { GlassPanel } from '../../components/ui/GlassPanel.jsx'
import { ApiError } from '../../api/http.js'
import { walletsApi } from '../../api/walletsApi.js'
import { withdrawalsApi } from '../../api/withdrawalsApi.js'

/** Mirrors MIN_USER_WITHDRAWAL on the server. */
const MIN_WITHDRAWAL = 100

function formatInr(amount) {
  return `₹${Number(amount || 0).toLocaleString('en-IN')}`
}

const CONTEXT_LABELS = {
  REFERRAL: 'Referral reward',
  BOOKING: 'Booking',
  PAYOUT: 'Payout',
  CLEARANCE: 'Dues cleared',
  INCENTIVE: 'Incentive',
  PENALTY: 'Penalty',
  WITHDRAWAL: 'Withdrawal',
  MANUAL: 'Adjustment',
}

const STATUS_STYLES = {
  APPROVED: 'bg-emerald-100 text-emerald-700',
  PENDING: 'bg-amber-100 text-amber-700',
  REJECTED: 'bg-rose-100 text-rose-700',
}

const inputClass =
  'w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20'
const labelClass = 'mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400'

function TransactionRow({ tx }) {
  const isCredit = tx.type === 'CREDIT'
  return (
    <GlassPanel className="flex items-center gap-3 p-3.5">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          isCredit ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
        }`}
      >
        {isCredit ? (
          <ArrowDownLeft className="h-4 w-4" aria-hidden />
        ) : (
          <ArrowUpRight className="h-4 w-4" aria-hidden />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-slate-900">
          {tx.description || CONTEXT_LABELS[tx.context] || 'Wallet activity'}
        </p>
        <p className="mt-0.5 text-[11px] text-slate-500">
          {CONTEXT_LABELS[tx.context] || tx.context} ·{' '}
          {new Date(tx.createdAt).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}
        </p>
      </div>
      <p
        className={`shrink-0 text-sm font-extrabold ${
          isCredit ? 'text-emerald-700' : 'text-slate-700'
        }`}
      >
        {isCredit ? '+' : '-'}
        {formatInr(tx.amount)}
      </p>
    </GlassPanel>
  )
}

/**
 * Wallet screen for customers: referral credit, the ledger that explains it,
 * and a bank payout request.
 */
export function UserWalletPage() {
  const [wallet, setWallet] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [withdrawals, setWithdrawals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [accountHolderName, setAccountHolderName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [ifscCode, setIfscCode] = useState('')
  const [bankName, setBankName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [success, setSuccess] = useState('')

  const balance = Number(wallet?.selfBalance) || 0
  const hasPending = withdrawals.some((w) => w.status === 'PENDING')

  /** Pure fetch — the caller decides what to do with the result. */
  const fetchAll = useCallback(async () => {
    const [walletRes, txRes, wdRes] = await Promise.all([
      walletsApi.getMyWallet(),
      walletsApi.getTransactions({ limit: 50 }).catch(() => ({ data: { transactions: [] } })),
      withdrawalsApi.getWithdrawals().catch(() => ({ data: { requests: [] } })),
    ])
    return {
      wallet: walletRes.data?.wallet || {},
      transactions: txRes.data?.transactions || [],
      withdrawals: wdRes.data?.requests || [],
    }
  }, [])

  const applyData = useCallback((data) => {
    setWallet(data.wallet)
    setTransactions(data.transactions)
    setWithdrawals(data.withdrawals)
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchAll()
      .then((data) => {
        if (!cancelled) applyData(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Could not load your wallet')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [fetchAll, applyData])

  const handleWithdraw = async () => {
    const value = Number(amount)
    setFormError('')

    if (!Number.isFinite(value) || value <= 0) {
      setFormError('Enter a valid amount')
      return
    }
    if (value < MIN_WITHDRAWAL) {
      setFormError(`Minimum withdrawal is ${formatInr(MIN_WITHDRAWAL)}`)
      return
    }
    if (value > balance) {
      setFormError(`You only have ${formatInr(balance)} in your wallet`)
      return
    }
    if (!accountHolderName.trim() || !accountNumber.trim() || !ifscCode.trim() || !bankName.trim()) {
      setFormError('Please fill in all bank details')
      return
    }

    setSubmitting(true)
    try {
      await withdrawalsApi.createWithdrawal({
        amount: value,
        bankDetails: {
          accountHolderName: accountHolderName.trim(),
          accountNumber: accountNumber.trim(),
          ifscCode: ifscCode.trim().toUpperCase(),
          bankName: bankName.trim(),
        },
      })
      setSuccess('Withdrawal requested. Our team will transfer it to your bank shortly.')
      setFormOpen(false)
      setAmount('')
      applyData(await fetchAll())
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not submit your request')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <>
        <AppStackScreenHeader title="My Wallet" backTo="/app" />
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand" aria-hidden />
        </div>
      </>
    )
  }

  return (
    <>
      <AppStackScreenHeader title="My Wallet" backTo="/app" />

      <div className="space-y-4 pt-4">
        {error ? (
          <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">{error}</p>
        ) : null}
        {success ? (
          <p className="flex items-start gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {success}
          </p>
        ) : null}

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-5 text-white shadow-lg"
        >
          <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-brand/25 blur-3xl" />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold ring-1 ring-white/20">
            <WalletIcon className="h-3.5 w-3.5" aria-hidden />
            Wallet balance
          </span>
          <p className="mt-3 text-4xl font-black tracking-tight">{formatInr(balance)}</p>
          <p className="mt-1.5 text-xs text-white/70">
            Spend it on a booking, or move it to your bank.
          </p>
        </motion.div>

        {/* Withdraw */}
        {hasPending ? (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
            You have a withdrawal awaiting approval. You can raise the next one after it is processed.
          </p>
        ) : balance >= MIN_WITHDRAWAL ? (
          <AppPrimaryButton onClick={() => setFormOpen((v) => !v)}>
            <Banknote className="h-4 w-4" aria-hidden />
            {formOpen ? 'Cancel withdrawal' : 'Withdraw to bank'}
          </AppPrimaryButton>
        ) : (
          <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs font-medium text-slate-600">
            Withdraw to your bank once your balance reaches {formatInr(MIN_WITHDRAWAL)}.
          </p>
        )}

        {formOpen ? (
          <GlassPanel className="space-y-3 p-4">
            <div>
              <label className={labelClass} htmlFor="wd-amount">
                Amount
              </label>
              <input
                id="wd-amount"
                type="number"
                min={MIN_WITHDRAWAL}
                max={balance}
                inputMode="numeric"
                className={inputClass}
                placeholder={`Min ${MIN_WITHDRAWAL}`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setAmount(String(balance))}
                className="mt-1.5 text-[11px] font-bold text-brand"
              >
                Withdraw full balance ({formatInr(balance)})
              </button>
            </div>
            <div>
              <label className={labelClass} htmlFor="wd-name">
                Account holder name
              </label>
              <input
                id="wd-name"
                type="text"
                className={inputClass}
                value={accountHolderName}
                onChange={(e) => setAccountHolderName(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="wd-account">
                Account number
              </label>
              <input
                id="wd-account"
                type="text"
                inputMode="numeric"
                className={inputClass}
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass} htmlFor="wd-ifsc">
                  IFSC code
                </label>
                <input
                  id="wd-ifsc"
                  type="text"
                  className={`${inputClass} uppercase`}
                  value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="wd-bank">
                  Bank name
                </label>
                <input
                  id="wd-bank"
                  type="text"
                  className={inputClass}
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                />
              </div>
            </div>

            {formError ? (
              <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800">
                {formError}
              </p>
            ) : null}

            <AppPrimaryButton onClick={handleWithdraw} loading={submitting}>
              Request withdrawal
            </AppPrimaryButton>
            <p className="text-center text-[11px] text-slate-500">
              The amount is held from your balance while an admin reviews it.
            </p>
          </GlassPanel>
        ) : null}

        <Link
          to="/app/refer"
          className="flex items-center gap-3 rounded-2xl border border-brand/25 bg-brand/5 p-4 transition hover:border-brand/40 active:scale-[0.99]"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand text-white">
            <Gift className="h-5 w-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-slate-900">Refer friends, earn more</span>
            <span className="block text-xs text-slate-600">
              Share your code and top up this balance.
            </span>
          </span>
        </Link>

        {withdrawals.length ? (
          <div>
            <h2 className="mb-2.5 flex items-center gap-2 text-sm font-bold text-slate-900">
              <Banknote className="h-4 w-4 text-slate-400" aria-hidden />
              Withdrawal requests
            </h2>
            <ul className="space-y-2">
              {withdrawals.map((w) => (
                <li key={w._id}>
                  <GlassPanel className="flex items-center justify-between gap-3 p-3.5">
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold text-slate-900">{formatInr(w.amount)}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {w.bankDetails?.bankName} ·{' '}
                        {new Date(w.createdAt).toLocaleDateString('en-IN')}
                      </p>
                      {w.adminRemarks ? (
                        <p className="mt-1 text-[11px] text-slate-500">{w.adminRemarks}</p>
                      ) : null}
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                        STATUS_STYLES[w.status] || STATUS_STYLES.PENDING
                      }`}
                    >
                      {w.status}
                    </span>
                  </GlassPanel>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div>
          <h2 className="mb-2.5 flex items-center gap-2 text-sm font-bold text-slate-900">
            <Receipt className="h-4 w-4 text-slate-400" aria-hidden />
            Transaction history
          </h2>
          {transactions.length ? (
            <ul className="space-y-2">
              {transactions.map((tx) => (
                <li key={tx._id}>
                  <TransactionRow tx={tx} />
                </li>
              ))}
            </ul>
          ) : (
            <AppEmptyState
              icon={Receipt}
              title="No transactions yet"
              subtitle="Refer a friend to get your first wallet credit."
            />
          )}
        </div>
      </div>
    </>
  )
}

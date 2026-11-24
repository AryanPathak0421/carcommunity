import { useEffect, useState } from 'react'
import { ArrowDownToLine, Clock, CheckCircle2, Wallet as WalletIcon, Package } from 'lucide-react'
import { productWalletApi } from '../../api/productWalletApi.js'

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`

const STATUS_TONE = {
  PENDING: 'bg-amber-50 text-amber-700 ring-amber-200',
  APPROVED: 'bg-sky-50 text-sky-700 ring-sky-200',
  PROCESSING: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  REJECTED: 'bg-rose-50 text-rose-700 ring-rose-200',
}

function StatTile({ icon: Icon, label, value, tone }) {
  return (
    <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
      <Icon className={`h-4 w-4 ${tone}`} aria-hidden />
      <p className="mt-1 text-[11px] font-bold text-slate-500">{label}</p>
      <p className="text-[15px] font-black text-slate-900">{value}</p>
    </div>
  )
}

export function ProductWalletPage() {
  const [data, setData] = useState(null)
  const [withdrawals, setWithdrawals] = useState([])
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ amount: '', accountHolderName: '', accountNumber: '', ifscCode: '', bankName: '' })
  const [formError, setFormError] = useState('')
  const [ok, setOk] = useState('')

  const load = () => {
    productWalletApi.getWallet().then((r) => setData(r.data)).catch((e) => setError(e.message || 'Could not load wallet'))
    productWalletApi.getWithdrawals().then((r) => setWithdrawals(r.data?.requests || [])).catch(() => {})
  }
  useEffect(load, [])

  const submit = async () => {
    setFormError('')
    const amount = Number(form.amount)
    if (!amount || amount < (data?.minWithdrawal || 100)) {
      setFormError(`Enter at least ${inr(data?.minWithdrawal || 100)}`)
      return
    }
    if (amount > (data?.availableBalance || 0)) {
      setFormError('Amount is more than your available balance')
      return
    }
    if (!form.accountHolderName || !form.accountNumber || !form.ifscCode || !form.bankName) {
      setFormError('Please fill all bank details')
      return
    }
    try {
      setBusy(true)
      await productWalletApi.requestWithdrawal({
        amount,
        bankDetails: {
          accountHolderName: form.accountHolderName,
          accountNumber: form.accountNumber,
          ifscCode: form.ifscCode,
          bankName: form.bankName,
        },
      })
      setOk('Withdrawal request submitted. The admin will process it.')
      setOpen(false)
      setForm({ amount: '', accountHolderName: '', accountNumber: '', ifscCode: '', bankName: '' })
      load()
    } catch (e) {
      setFormError(e.message || 'Could not submit the request')
    } finally {
      setBusy(false)
    }
  }

  const inputCls =
    'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-semibold outline-none focus:border-navy focus:ring-2 focus:ring-navy/15'

  return (
    <div className="space-y-4 pb-10">
      <div className="flex items-center gap-2">
        <Package className="h-5 w-5 text-navy" aria-hidden />
        <h1 className="text-lg font-black text-navy">Product Wallet</h1>
      </div>
      <p className="-mt-2 text-xs font-medium text-slate-500">
        Earnings from accessory sales. Separate from your service earnings.
      </p>

      {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p> : null}
      {ok ? <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{ok}</p> : null}

      {/* Balance */}
      <div className="rounded-3xl bg-navy p-5 text-white shadow-lg">
        <p className="text-xs font-bold text-white/70">Available balance</p>
        <p className="mt-1 text-3xl font-black">{inr(data?.availableBalance)}</p>
        <button
          type="button"
          onClick={() => { setOpen((v) => !v); setOk('') }}
          disabled={!data || data.availableBalance < (data?.minWithdrawal || 100)}
          className="mt-4 flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-navy active:scale-95 disabled:opacity-50"
        >
          <ArrowDownToLine className="h-4 w-4" aria-hidden />
          Withdraw
        </button>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-3 gap-2">
        <StatTile icon={WalletIcon} label="Total earned" value={inr(data?.totalEarned)} tone="text-navy" />
        <StatTile icon={Clock} label="In process" value={inr(data?.pendingWithdrawal)} tone="text-amber-600" />
        <StatTile icon={CheckCircle2} label="Withdrawn" value={inr(data?.completedWithdrawal)} tone="text-emerald-600" />
      </div>

      {/* Withdraw form */}
      {open ? (
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-sm font-black text-navy">Request a withdrawal</h2>
          <label className="mt-3 block text-xs font-bold text-slate-600">
            Amount
            <input type="number" inputMode="numeric" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder={`Min ${inr(data?.minWithdrawal || 100)}`} className={inputCls} />
          </label>
          <label className="mt-2 block text-xs font-bold text-slate-600">
            Account holder name
            <input value={form.accountHolderName} onChange={(e) => setForm((f) => ({ ...f, accountHolderName: e.target.value }))} className={inputCls} />
          </label>
          <label className="mt-2 block text-xs font-bold text-slate-600">
            Account number
            <input value={form.accountNumber} onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))} className={inputCls} />
          </label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <label className="block text-xs font-bold text-slate-600">
              IFSC
              <input value={form.ifscCode} onChange={(e) => setForm((f) => ({ ...f, ifscCode: e.target.value.toUpperCase() }))} className={inputCls} />
            </label>
            <label className="block text-xs font-bold text-slate-600">
              Bank name
              <input value={form.bankName} onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))} className={inputCls} />
            </label>
          </div>
          {formError ? <p className="mt-2 text-sm font-semibold text-rose-600">{formError}</p> : null}
          <button type="button" disabled={busy} onClick={submit} className="mt-4 w-full rounded-lg bg-navy py-3 text-sm font-black text-white active:scale-[0.98] disabled:opacity-60">
            {busy ? 'Submitting…' : 'Submit request'}
          </button>
        </div>
      ) : null}

      {/* Withdrawal history */}
      <div>
        <h2 className="mb-2 text-sm font-black text-navy">Withdrawals</h2>
        {withdrawals.length === 0 ? (
          <p className="rounded-xl bg-white p-4 text-center text-sm font-semibold text-slate-500 ring-1 ring-slate-200">No withdrawals yet.</p>
        ) : (
          <div className="space-y-2">
            {withdrawals.map((w) => (
              <div key={w._id} className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-900">{inr(w.amount)}</p>
                  <p className="text-xs font-medium text-slate-500">{new Date(w.createdAt).toLocaleDateString('en-IN')}</p>
                  {w.adminRemarks ? <p className="mt-0.5 text-xs font-medium text-slate-600">“{w.adminRemarks}”</p> : null}
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${STATUS_TONE[w.status] || 'bg-slate-100 text-slate-600 ring-slate-200'}`}>{w.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transactions */}
      <div>
        <h2 className="mb-2 text-sm font-black text-navy">Recent transactions</h2>
        {!data?.transactions?.length ? (
          <p className="rounded-xl bg-white p-4 text-center text-sm font-semibold text-slate-500 ring-1 ring-slate-200">No transactions yet.</p>
        ) : (
          <div className="space-y-2">
            {data.transactions.map((t) => (
              <div key={t._id} className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-800">{t.description || t.context}</p>
                  <p className="text-xs font-medium text-slate-500">{new Date(t.createdAt).toLocaleDateString('en-IN')}</p>
                </div>
                <p className={`shrink-0 text-sm font-black ${t.type === 'CREDIT' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {t.type === 'CREDIT' ? '+' : '−'}{inr(t.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

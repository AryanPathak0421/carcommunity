import { useEffect, useMemo, useRef, useState } from 'react'
import { Minus, PackageCheck, Plus, Wrench } from 'lucide-react'
import { carPartsApi } from '../../../api/carPartsApi.js'
import { formatInr } from '../../../lib/individualBookings.js'

const MAX_QTY = 10

const STATUS_LABEL = {
  IN_STOCK: { text: 'In stock', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  LOW_STOCK: { text: 'Few left', cls: 'bg-amber-50 text-amber-800 ring-amber-200' },
  OUT_OF_STOCK: { text: 'Out of stock', cls: 'bg-rose-50 text-rose-700 ring-rose-200' },
}

/**
 * Optional "Need car parts?" section of the booking details step.
 * `value` is `[{ partId, quantity }]`; parts that no longer exist for the service are dropped.
 */
export function BookingPartsPicker({ serviceId, value = [], onChange }) {
  // Result is tagged with the service it belongs to, so a stale answer is never shown for a new service.
  const [result, setResult] = useState({ serviceId: null, parts: [], failed: false })
  const current = result.serviceId === serviceId
  const parts = useMemo(() => (current ? result.parts : []), [current, result.parts])
  const failed = current && result.failed
  const loading = Boolean(serviceId) && !current

  // always-fresh copies for the async load below (avoids acting on a stale selection)
  const latest = useRef({ value, onChange })
  useEffect(() => {
    latest.current = { value, onChange }
  })

  useEffect(() => {
    if (!serviceId) return undefined
    let cancelled = false
    carPartsApi
      .listForService(serviceId)
      .then((res) => {
        if (cancelled) return
        const list = res.data?.parts ?? []
        setResult({ serviceId, parts: list, failed: false })
        // drop selections that are gone / out of stock / belong to a previously chosen service
        // Read the *latest* selection: the customer may have tapped "Add" while this request was in flight.
        const current = latest.current.value
        const byId = new Map(list.map((p) => [p._id, p]))
        const kept = current
          .filter((v) => byId.get(v.partId)?.available)
          .map((v) => ({ partId: v.partId, quantity: Math.min(v.quantity, byId.get(v.partId).stock, MAX_QTY) }))
        if (kept.length !== current.length || kept.some((k, i) => k.quantity !== current[i].quantity)) {
          latest.current.onChange(kept)
        }
      })
      .catch(() => !cancelled && setResult({ serviceId, parts: [], failed: true }))
    return () => {
      cancelled = true
    }
  }, [serviceId])

  const qtyOf = (id) => value.find((v) => v.partId === id)?.quantity ?? 0

  const setQty = (part, qty) => {
    const next = Math.max(0, Math.min(qty, part.stock, MAX_QTY))
    const rest = value.filter((v) => v.partId !== part._id)
    onChange(next > 0 ? [...rest, { partId: part._id, quantity: next }] : rest)
  }

  const subtotal = useMemo(
    () => value.reduce((s, v) => s + (parts.find((p) => p._id === v.partId)?.price ?? 0) * v.quantity, 0),
    [value, parts],
  )

  if (!serviceId || failed || (!loading && parts.length === 0)) return null

  return (
    <section className="space-y-2" aria-label="Car parts">
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-extrabold text-slate-900">
            <Wrench className="h-4 w-4 text-brand" aria-hidden /> Need car parts?{' '}
            <span className="font-medium text-slate-400">(optional)</span>
          </p>
          <p className="text-[11px] font-medium text-slate-500">Your mechanic brings the parts you pick. Price is added to the bill.</p>
        </div>
        {subtotal > 0 ? <p className="shrink-0 text-xs font-extrabold text-brand">{formatInr(subtotal)}</p> : null}
      </div>

      {loading ? (
        <div className="h-16 animate-pulse rounded-2xl bg-slate-100" aria-hidden />
      ) : (
        <ul className="space-y-2">
          {parts.map((p) => {
            const qty = qtyOf(p._id)
            const st = STATUS_LABEL[p.status] ?? STATUS_LABEL.IN_STOCK
            return (
              <li
                key={p._id}
                className={`flex items-center gap-3 rounded-2xl border p-3 ${
                  qty > 0 ? 'border-brand/40 bg-orange-50/60' : 'border-slate-200 bg-white'
                } ${p.available ? '' : 'opacity-60'}`}
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-slate-400">
                  {p.imageUrl ? <img src={p.imageUrl} alt="" className="h-full w-full object-cover" /> : <PackageCheck className="h-5 w-5" aria-hidden />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-extrabold text-slate-900">{p.name}</p>
                  <p className="truncate text-[11px] font-medium text-slate-500">
                    {[p.brand, p.partNumber].filter(Boolean).join(' · ') || 'Genuine quality part'}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    <span className="text-[13px] font-black text-slate-900">{formatInr(p.price)}</span>
                    {p.mrp > p.price ? <span className="text-[11px] font-medium text-slate-400 line-through">{formatInr(p.mrp)}</span> : null}
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${st.cls}`}>
                      {p.status === 'LOW_STOCK' ? `Only ${p.stock} left` : st.text}
                    </span>
                  </p>
                </div>
                {p.available ? (
                  qty === 0 ? (
                    <button
                      type="button"
                      onClick={() => setQty(p, 1)}
                      className="shrink-0 rounded-xl bg-brand px-3 py-2 text-xs font-extrabold text-white active:scale-95"
                    >
                      Add
                    </button>
                  ) : (
                    <div className="flex shrink-0 items-center gap-1.5 rounded-xl bg-white p-1 ring-1 ring-slate-200">
                      <button type="button" onClick={() => setQty(p, qty - 1)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-700 active:bg-slate-100" aria-label={`Remove one ${p.name}`}>
                        <Minus className="h-4 w-4" aria-hidden />
                      </button>
                      <span className="w-5 text-center text-sm font-black tabular-nums">{qty}</span>
                      <button
                        type="button"
                        onClick={() => setQty(p, qty + 1)}
                        disabled={qty >= Math.min(p.stock, MAX_QTY)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-700 active:bg-slate-100 disabled:opacity-30"
                        aria-label={`Add one more ${p.name}`}
                      >
                        <Plus className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  )
                ) : (
                  <span className="shrink-0 text-[11px] font-bold text-slate-400">Unavailable</span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

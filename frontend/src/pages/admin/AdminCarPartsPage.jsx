import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Minus, PackageCheck, Pencil, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react'
import { adminCarPartsApi } from '../../api/adminCarPartsApi.js'
import { fetchLabourCategoriesGrouped } from '../../api/labourCategoriesApi.js'
import { assetUrlFromUpload, uploadMedia } from '../../api/uploadApi.js'
import { ApiError } from '../../api/http.js'
import { GlassPanel } from '../../components/ui/GlassPanel.jsx'

const STATUS = {
  IN_STOCK: { label: 'In stock', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  LOW_STOCK: { label: 'Low stock', tone: 'bg-amber-50 text-amber-700 ring-amber-200' },
  OUT_OF_STOCK: { label: 'Out of stock', tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
}
const TABS = [
  { id: '', label: 'All' },
  { id: 'IN_STOCK', label: 'In stock' },
  { id: 'LOW_STOCK', label: 'Low stock' },
  { id: 'OUT_OF_STOCK', label: 'Out of stock' },
]
const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20'
const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`
const EMPTY = { name: '', brand: '', partNumber: '', description: '', price: '', mrp: '', stock: '0', imageUrl: '', subcategoryIds: [], isActive: true }

function PartModal({ part, subcategories, onClose, onSaved }) {
  const [form, setForm] = useState(() =>
    part
      ? {
          name: part.name,
          brand: part.brand || '',
          partNumber: part.partNumber || '',
          description: part.description || '',
          price: String(part.price ?? ''),
          mrp: part.mrp ? String(part.mrp) : '',
          stock: String(part.stock ?? 0),
          imageUrl: part.imageUrl || '',
          subcategoryIds: (part.subcategoryIds || []).map((s) => (typeof s === 'object' ? s._id : s)),
          isActive: part.isActive,
        }
      : EMPTY,
  )
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const toggleSub = (id) =>
    setForm((f) => ({
      ...f,
      subcategoryIds: f.subcategoryIds.includes(id) ? f.subcategoryIds.filter((x) => x !== id) : [...f.subcategoryIds, id],
    }))

  async function onImage(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const res = await uploadMedia(file, 'general-media')
      setForm((f) => ({ ...f, imageUrl: assetUrlFromUpload(res) }))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Image upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function save(e) {
    e.preventDefault()
    setError('')
    const payload = {
      name: form.name,
      brand: form.brand,
      partNumber: form.partNumber,
      description: form.description,
      price: Number(form.price),
      mrp: form.mrp === '' ? null : Number(form.mrp),
      imageUrl: form.imageUrl,
      subcategoryIds: form.subcategoryIds,
      isActive: form.isActive,
    }
    // Stock is edited from the list for existing parts (atomic +/-), so it is only set when creating.
    if (!part) payload.stock = Number(form.stock)
    setBusy(true)
    try {
      if (part) await adminCarPartsApi.update(part._id, payload)
      else await adminCarPartsApi.create(payload)
      onSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the part')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" aria-label={part ? 'Edit part' : 'Add part'}>
      <form onSubmit={save} className="max-h-[92vh] w-full max-w-xl space-y-4 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-lg font-extrabold text-slate-900">{part ? 'Edit part' : 'Add car part'}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-rose-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="sm:col-span-2 text-xs font-bold text-slate-600">
            Part name
            <input className={`${inputCls} mt-1`} value={form.name} onChange={set('name')} required maxLength={120} placeholder="Brake Pad Set (Front)" />
          </label>
          <label className="text-xs font-bold text-slate-600">
            Brand
            <input className={`${inputCls} mt-1`} value={form.brand} onChange={set('brand')} maxLength={60} placeholder="Bosch" />
          </label>
          <label className="text-xs font-bold text-slate-600">
            Part number
            <input className={`${inputCls} mt-1`} value={form.partNumber} onChange={set('partNumber')} maxLength={60} placeholder="BP-1042" />
          </label>
          <label className="text-xs font-bold text-slate-600">
            Selling price (₹)
            <input className={`${inputCls} mt-1`} type="number" min="1" step="0.01" value={form.price} onChange={set('price')} required />
          </label>
          <label className="text-xs font-bold text-slate-600">
            MRP (₹) <span className="font-medium text-slate-400">optional</span>
            <input className={`${inputCls} mt-1`} type="number" min="0" step="0.01" value={form.mrp} onChange={set('mrp')} />
          </label>
          {!part ? (
            <label className="text-xs font-bold text-slate-600">
              Opening stock
              <input className={`${inputCls} mt-1`} type="number" min="0" step="1" value={form.stock} onChange={set('stock')} required />
            </label>
          ) : null}
          <label className="sm:col-span-2 text-xs font-bold text-slate-600">
            Description <span className="font-medium text-slate-400">optional</span>
            <textarea className={`${inputCls} mt-1 resize-none`} rows={2} maxLength={1000} value={form.description} onChange={set('description')} />
          </label>
        </div>

        <div>
          <p className="text-xs font-bold text-slate-600">Photo</p>
          <div className="mt-1 flex items-center gap-3">
            <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-slate-400">
              {form.imageUrl ? <img src={form.imageUrl} alt="" className="h-full w-full object-cover" /> : <PackageCheck className="h-6 w-6" />}
            </span>
            <label className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
              {uploading ? 'Uploading…' : form.imageUrl ? 'Replace' : 'Upload photo'}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onImage} disabled={uploading} />
            </label>
            {form.imageUrl ? (
              <button type="button" className="text-xs font-bold text-rose-600" onClick={() => setForm((f) => ({ ...f, imageUrl: '' }))}>
                Remove
              </button>
            ) : null}
          </div>
        </div>

        <div>
          <p className="text-xs font-bold text-slate-600">
            Offered with services <span className="font-medium text-slate-400">— leave empty to offer with every service</span>
          </p>
          <div className="mt-1 flex max-h-32 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-slate-200 p-2">
            {subcategories.length === 0 ? <span className="text-xs text-slate-400">No service categories loaded</span> : null}
            {subcategories.map((s) => {
              const on = form.subcategoryIds.includes(s._id)
              return (
                <button
                  key={s._id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleSub(s._id)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${on ? 'bg-orange-500 text-white ring-orange-500' : 'bg-white text-slate-600 ring-slate-200 hover:ring-orange-300'}`}
                >
                  {s.name}
                </button>
              )
            })}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <input type="checkbox" className="h-4 w-4 accent-orange-500" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
          Visible to customers
        </label>

        {error ? <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p> : null}

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100">
            Cancel
          </button>
          <button type="submit" disabled={busy || uploading} className="flex items-center gap-2 rounded-lg bg-orange-500 px-5 py-2 text-sm font-bold text-white disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {part ? 'Save changes' : 'Add part'}
          </button>
        </div>
      </form>
    </div>
  )
}

export function AdminCarPartsPage() {
  const [parts, setParts] = useState([])
  const [counts, setCounts] = useState({ outOfStock: 0, lowStock: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('')
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [editing, setEditing] = useState(null) // null | 'new' | part
  const [subcategories, setSubcategories] = useState([])
  const [busyId, setBusyId] = useState('')
  const [rowError, setRowError] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    fetchLabourCategoriesGrouped()
      .then((res) => {
        const subs = []
        // The grouped API names things from the customer's point of view: a "group" is e.g. Car Repair
        // and its "categories" (e.g. Brakes) are the subcategories bookings and parts are matched on.
        for (const g of res.data?.groups ?? []) {
          for (const c of g.categories ?? []) subs.push({ _id: c._id, name: `${g.name} › ${c.name}` })
        }
        setSubcategories(subs)
      })
      .catch(() => {})
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await adminCarPartsApi.list({ status: tab, search: debounced, limit: 100 })
      setParts(res.data?.parts ?? [])
      setCounts(res.data?.counts ?? { outOfStock: 0, lowStock: 0 })
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load parts')
    } finally {
      setLoading(false)
    }
  }, [tab, debounced])

  useEffect(() => {
    load()
  }, [load])

  async function adjust(part, payload) {
    setBusyId(part._id)
    setRowError('')
    try {
      const res = await adminCarPartsApi.adjustStock(part._id, payload)
      const updated = res.data?.part
      if (updated) setParts((list) => list.map((p) => (p._id === part._id ? { ...p, stock: updated.stock, status: updated.status } : p)))
      load()
    } catch (e) {
      setRowError(`${part.name}: ${e instanceof ApiError ? e.message : 'could not update stock'}`)
    } finally {
      setBusyId('')
    }
  }

  async function remove(part) {
    if (!window.confirm(`Delete "${part.name}"? Past bookings keep their own copy of this part.`)) return
    setBusyId(part._id)
    try {
      await adminCarPartsApi.remove(part._id)
      load()
    } catch (e) {
      setRowError(e instanceof ApiError ? e.message : 'Could not delete the part')
    } finally {
      setBusyId('')
    }
  }

  const tiles = useMemo(
    () => [
      { label: 'Parts listed', value: parts.length, tone: 'text-slate-900' },
      { label: 'Low stock', value: counts.lowStock, tone: 'text-amber-600' },
      { label: 'Out of stock', value: counts.outOfStock, tone: 'text-rose-600' },
    ],
    [parts.length, counts],
  )

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 md:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Car Parts &amp; Stock</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Parts customers can add to a booking. Stock drops when a booking is made and comes back if it is cancelled. The part price goes
            to the mechanic — no commission or GST is added on it.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={load} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button type="button" onClick={() => setEditing('new')} className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-sm font-bold text-white">
            <Plus className="h-4 w-4" /> Add part
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {tiles.map((t) => (
          <GlassPanel key={t.label} className="p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{t.label}</p>
            <p className={`mt-1 text-2xl font-black ${t.tone}`}>{t.value}</p>
          </GlassPanel>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition ${tab === t.id ? 'bg-orange-500 text-white ring-orange-500' : 'bg-white text-slate-600 ring-slate-200 hover:ring-orange-300'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <label className="relative ml-auto w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" aria-hidden />
          <input className={`${inputCls} pl-9`} placeholder="Search name, brand, part no." value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search parts" />
        </label>
      </div>

      {rowError ? <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{rowError}</p> : null}
      {error ? <GlassPanel className="border-rose-200 p-5 text-sm font-semibold text-rose-800">{error}</GlassPanel> : null}

      {loading && parts.length === 0 ? (
        <GlassPanel className="p-6 text-sm text-slate-500">Loading parts…</GlassPanel>
      ) : !loading && !error && parts.length === 0 ? (
        <GlassPanel className="p-10 text-center">
          <PackageCheck className="mx-auto h-8 w-8 text-slate-300" aria-hidden />
          <p className="mt-3 text-sm font-semibold text-slate-700">{debounced || tab ? 'No parts match this filter.' : 'No parts yet — add your first one.'}</p>
        </GlassPanel>
      ) : (
        <ul className="space-y-3">
          {parts.map((p) => {
            const st = STATUS[p.status] ?? STATUS.IN_STOCK
            const busy = busyId === p._id
            return (
              <li key={p._id}>
                <GlassPanel className={`flex flex-wrap items-center gap-4 p-4 ${p.isActive ? '' : 'opacity-60'}`}>
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-slate-400">
                    {p.imageUrl ? <img src={p.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" /> : <PackageCheck className="h-6 w-6" />}
                  </span>
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="truncate text-sm font-black text-slate-900">
                      {p.name} {!p.isActive ? <span className="ml-1 text-[10px] font-bold uppercase text-slate-400">hidden</span> : null}
                    </p>
                    <p className="truncate text-xs text-slate-500">{[p.brand, p.partNumber].filter(Boolean).join(' · ') || '—'}</p>
                    <p className="mt-1 text-sm font-extrabold text-slate-900">
                      {inr(p.price)} {p.mrp > p.price ? <span className="text-xs font-medium text-slate-400 line-through">{inr(p.mrp)}</span> : null}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-slate-400">
                      {p.subcategoryIds?.length ? `For: ${p.subcategoryIds.map((s) => s.name || '').filter(Boolean).join(', ')}` : 'Offered with every service'}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1.5">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ${st.tone}`}>{st.label}</span>
                    <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
                      <button type="button" disabled={busy || p.stock === 0} onClick={() => adjust(p, { delta: -1 })} aria-label={`Remove one ${p.name}`} className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-slate-100 disabled:opacity-30">
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-12 text-center text-sm font-black tabular-nums" aria-label={`${p.stock} in stock`}>{busy ? '…' : p.stock}</span>
                      <button type="button" disabled={busy} onClick={() => adjust(p, { delta: 1 })} aria-label={`Add one ${p.name}`} className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-slate-100 disabled:opacity-30">
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          const raw = window.prompt(`Add how many units of "${p.name}"? (use a negative number to remove)`, '10')
                          const d = Number.parseInt(raw ?? '', 10)
                          if (Number.isInteger(d) && d !== 0) adjust(p, { delta: d })
                        }}
                        className="rounded-md px-2 py-1 text-[11px] font-bold text-orange-600 hover:bg-orange-50"
                      >
                        Restock
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-1.5">
                    <button type="button" onClick={() => setEditing(p)} aria-label={`Edit ${p.name}`} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" disabled={busy} onClick={() => remove(p)} aria-label={`Delete ${p.name}`} className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-rose-600 hover:bg-rose-100">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </GlassPanel>
              </li>
            )
          })}
        </ul>
      )}

      {editing ? (
        <PartModal
          part={editing === 'new' ? null : editing}
          subcategories={subcategories}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            load()
          }}
        />
      ) : null}
    </div>
  )
}

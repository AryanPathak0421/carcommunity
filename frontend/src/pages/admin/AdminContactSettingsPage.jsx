import { useEffect, useState } from 'react'
import { ExternalLink, Loader2, Plus, Save, Trash2 } from 'lucide-react'
import { contactApi } from '../../api/contactApi.js'
import { GlassPanel } from '../../components/ui/GlassPanel.jsx'

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20'

function Field({ label, hint, children }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-bold text-slate-600">{label}</span>
      {children}
      {hint ? <span className="block text-[11px] font-medium text-slate-400">{hint}</span> : null}
    </label>
  )
}

/** Admin → Contact us: edits what the public `/contact` page shows. */
export function AdminContactSettingsPage() {
  const [audience, setAudience] = useState('customer')
  const [cfg, setCfg] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let alive = true
    setCfg(null)
    setError('')
    setNotice('')
    contactApi
      .adminGet(audience)
      .then((res) => alive && setCfg(res.data.contact))
      .catch((e) => alive && setError(e.message || 'Could not load contact details'))
    return () => {
      alive = false
    }
  }, [audience])

  if (!cfg) {
    return (
      <p className="flex items-center gap-2 p-6 text-sm font-semibold text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {error || 'Loading…'}
      </p>
    )
  }

  const set = (patch) => setCfg((c) => ({ ...c, ...patch }))
  const setLink = (i, patch) => set({ links: cfg.links.map((l, j) => (j === i ? { ...l, ...patch } : l)) })

  const save = async () => {
    try {
      setSaving(true)
      setError('')
      setNotice('')
      const res = await contactApi.adminSave(cfg, audience)
      setCfg(res.data.contact)
      setNotice('Saved. The public Contact us page shows these details now.')
    } catch (e) {
      setError(e.message || 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-24">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900">Contact us</h1>
          <p className="text-xs font-medium text-slate-500">
            Shown on the public Contact us page. Leave a field empty to hide it.
          </p>
        </div>
        <a
          href={audience === 'mechanic' ? '/mechanic/contact' : '/contact'}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700 hover:border-orange-400"
        >
          View page <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </a>
      </div>

      <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-extrabold" role="tablist" aria-label="App">
        {[['customer', 'Customer app'], ['mechanic', 'Mechanic app']].map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={audience === id}
            onClick={() => setAudience(id)}
            className={`rounded-lg px-4 py-2 transition ${audience === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p> : null}
      {notice ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{notice}</p> : null}

      <GlassPanel className="space-y-4 p-5">
        <h2 className="text-base font-black text-slate-900">Page text</h2>
        <Field label="Heading">
          <input className={inputCls} maxLength={60} value={cfg.heading} onChange={(e) => set({ heading: e.target.value })} />
        </Field>
        <Field label="Intro text">
          <textarea className={inputCls} rows={3} maxLength={300} value={cfg.intro} onChange={(e) => set({ intro: e.target.value })} />
        </Field>
      </GlassPanel>

      <GlassPanel className="space-y-4 p-5">
        <h2 className="text-base font-black text-slate-900">Ways to reach you</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone" hint="Opens the dialler">
            <input className={inputCls} inputMode="tel" maxLength={20} value={cfg.phone} onChange={(e) => set({ phone: e.target.value })} />
          </Field>
          <Field label="WhatsApp number" hint="10 digits (India) or with country code">
            <input className={inputCls} inputMode="tel" maxLength={20} value={cfg.whatsapp} onChange={(e) => set({ whatsapp: e.target.value })} />
          </Field>
          <Field label="Email">
            <input className={inputCls} type="email" maxLength={120} value={cfg.email} onChange={(e) => set({ email: e.target.value })} />
          </Field>
          <Field label="Support hours">
            <input className={inputCls} maxLength={120} value={cfg.hours} onChange={(e) => set({ hours: e.target.value })} />
          </Field>
        </div>
        <Field label="Office address">
          <textarea className={inputCls} rows={2} maxLength={300} value={cfg.address} onChange={(e) => set({ address: e.target.value })} />
        </Field>
        <Field label="Google Maps link" hint="Optional. Makes the address tappable (must start with https://)">
          <input className={inputCls} maxLength={300} value={cfg.mapUrl} onChange={(e) => set({ mapUrl: e.target.value })} />
        </Field>
      </GlassPanel>

      <GlassPanel className="space-y-3 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-slate-900">Online links</h2>
            <p className="text-xs font-medium text-slate-500">Instagram, Facebook, YouTube… (up to 8)</p>
          </div>
          <button
            type="button"
            disabled={cfg.links.length >= 8}
            onClick={() => set({ links: [...cfg.links, { label: '', url: '' }] })}
            className="flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-extrabold text-white disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden /> Add
          </button>
        </div>
        {cfg.links.map((l, i) => (
          <div key={i} className="flex items-center gap-2">
            <input className={`${inputCls} max-w-[9rem]`} placeholder="Label" maxLength={30} value={l.label} onChange={(e) => setLink(i, { label: e.target.value })} />
            <input className={inputCls} placeholder="https://…" maxLength={300} value={l.url} onChange={(e) => setLink(i, { url: e.target.value })} />
            <button
              type="button"
              aria-label="Remove link"
              onClick={() => set({ links: cfg.links.filter((_, j) => j !== i) })}
              className="shrink-0 rounded-lg p-2 text-rose-600 hover:bg-rose-50"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ))}
      </GlassPanel>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:left-auto md:right-6 md:bottom-6 md:w-auto md:rounded-2xl md:border md:shadow-xl">
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-black text-white disabled:opacity-50 md:w-auto"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
          Save contact details
        </button>
      </div>
    </div>
  )
}

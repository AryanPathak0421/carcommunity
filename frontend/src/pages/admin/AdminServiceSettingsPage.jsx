import { useEffect, useState } from 'react'
import { Loader2, Plus, RotateCcw, Save, Trash2 } from 'lucide-react'
import { serviceConfigApi } from '../../api/serviceConfigApi.js'
import { resetServiceUiConfigCache } from '../../hooks/useServiceUiConfig.js'
import { GlassPanel } from '../../components/ui/GlassPanel.jsx'

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20'

const SIZE_ICONS = [
  ['hatchback', 'Hatchback'],
  ['sedan', 'Sedan'],
  ['suv', 'SUV / MUV'],
  ['bike', 'Bike'],
]
const STEP_ICONS = [
  ['calendar', 'Calendar'],
  ['map', 'Location'],
  ['camera', 'Camera'],
  ['check', 'Tick'],
  ['clock', 'Clock'],
  ['shield', 'Shield'],
]
const CHIP_ICONS = [
  ['badge', 'Verified badge'],
  ['zap', 'Lightning'],
  ['shield', 'Shield'],
  ['clock', 'Clock'],
  ['wallet', 'Wallet'],
]

function Section({ title, hint, children }) {
  return (
    <GlassPanel className="space-y-4 p-5">
      <div>
        <h2 className="text-base font-black text-slate-900">{title}</h2>
        {hint ? <p className="text-xs font-medium text-slate-500">{hint}</p> : null}
      </div>
      {children}
    </GlassPanel>
  )
}

const Active = ({ checked, onChange }) => (
  <label className="flex shrink-0 items-center gap-1.5 text-xs font-bold text-slate-600">
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-orange-500" />
    Active
  </label>
)

const move = (arr, i, d) => {
  const j = i + d
  if (j < 0 || j >= arr.length) return arr
  const next = [...arr]
  ;[next[i], next[j]] = [next[j], next[i]]
  return next
}

export function AdminServiceSettingsPage() {
  const [cfg, setCfg] = useState(null)
  const [defaults, setDefaults] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let alive = true
    serviceConfigApi
      .adminGet()
      .then((res) => {
        if (!alive) return
        setCfg(res.data.config)
        setDefaults(res.data.defaults)
      })
      .catch((e) => alive && setError(e.message || 'Could not load settings'))
    return () => {
      alive = false
    }
  }, [])

  if (!cfg) {
    return (
      <p className="flex items-center gap-2 p-6 text-sm font-semibold text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {error || 'Loading…'}
      </p>
    )
  }

  const setCarWash = (patch) => setCfg((c) => ({ ...c, carWash: { ...c.carWash, ...patch } }))

  const save = async () => {
    try {
      setSaving(true)
      setError('')
      setNotice('')
      const res = await serviceConfigApi.adminSave({
        carWash: cfg.carWash,
        trustChips: cfg.trustChips,
        paymentMethods: cfg.paymentMethods,
        durationOptions: cfg.durationOptions,
      })
      setCfg(res.data.config)
      resetServiceUiConfigCache()
      setNotice('Saved. The customer app uses these values the next time it loads.')
    } catch (e) {
      setError(e.message || 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  const cw = cfg.carWash

  return (
    <div className="space-y-5 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Service app settings</h1>
          <p className="text-sm font-medium text-slate-500">
            Car sizes, steps, labels, payment methods and duration options shown in the customer app.
          </p>
        </div>
        <button
          type="button"
          onClick={() => defaults && setCfg(defaults)}
          className="flex items-center gap-2 rounded-xl bg-white px-3.5 py-2 text-sm font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
        >
          <RotateCcw className="h-4 w-4" aria-hidden /> Reset to defaults
        </button>
      </div>

      {error ? <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p> : null}
      {notice ? <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{notice}</p> : null}

      <Section title="Car wash screen" hint="Heading and tagline on the car wash page.">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-xs font-bold text-slate-600">
            Headline
            <input value={cw.headline} onChange={(e) => setCarWash({ headline: e.target.value })} maxLength={60} className={`${inputCls} mt-1`} />
          </label>
          <label className="text-xs font-bold text-slate-600">
            Tagline
            <input value={cw.tagline} onChange={(e) => setCarWash({ tagline: e.target.value })} maxLength={80} className={`${inputCls} mt-1`} />
          </label>
        </div>
      </Section>

      <Section
        title="Car sizes"
        hint='A wash service belongs to a size when its name ends with " - <size>", e.g. “Foam Wash - Hatchback”. Add the services under Services after adding a size.'
      >
        <ul className="space-y-2">
          {cw.sizes.map((s, i) => (
            <li key={i} className="grid items-center gap-2 rounded-xl bg-slate-50 p-3 md:grid-cols-[10rem_1fr_9rem_auto_auto]">
              <input value={s.label} maxLength={30} onChange={(e) => setCarWash({ sizes: cw.sizes.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} placeholder="Size name" className={inputCls} aria-label="Size name" />
              <input value={s.hint} maxLength={80} onChange={(e) => setCarWash({ sizes: cw.sizes.map((x, j) => (j === i ? { ...x, hint: e.target.value } : x)) })} placeholder="Example cars" className={inputCls} aria-label="Example cars" />
              <select value={s.icon} onChange={(e) => setCarWash({ sizes: cw.sizes.map((x, j) => (j === i ? { ...x, icon: e.target.value } : x)) })} className={inputCls} aria-label="Icon">
                {SIZE_ICONS.map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              <Active checked={s.isActive !== false} onChange={(v) => setCarWash({ sizes: cw.sizes.map((x, j) => (j === i ? { ...x, isActive: v } : x)) })} />
              <span className="flex items-center gap-1">
                <button type="button" onClick={() => setCarWash({ sizes: move(cw.sizes, i, -1) })} className="rounded px-2 py-1 text-xs font-bold text-slate-500 ring-1 ring-slate-200" aria-label="Move up">↑</button>
                <button type="button" onClick={() => setCarWash({ sizes: move(cw.sizes, i, 1) })} className="rounded px-2 py-1 text-xs font-bold text-slate-500 ring-1 ring-slate-200" aria-label="Move down">↓</button>
                <button type="button" onClick={() => setCarWash({ sizes: cw.sizes.filter((_, j) => j !== i) })} className="rounded p-1.5 text-rose-600 hover:bg-rose-50" aria-label="Remove size"><Trash2 className="h-4 w-4" /></button>
              </span>
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => setCarWash({ sizes: [...cw.sizes, { label: '', hint: '', icon: 'sedan', isActive: true }] })} className="flex items-center gap-1.5 text-sm font-extrabold text-orange-600">
          <Plus className="h-4 w-4" aria-hidden /> Add size
        </button>
      </Section>

      <Section title="How it works" hint='The steps on the car wash page (up to 6).'>
        <ul className="space-y-2">
          {cw.steps.map((s, i) => (
            <li key={i} className="grid items-center gap-2 rounded-xl bg-slate-50 p-3 md:grid-cols-[8rem_12rem_1fr_auto]">
              <select value={s.icon} onChange={(e) => setCarWash({ steps: cw.steps.map((x, j) => (j === i ? { ...x, icon: e.target.value } : x)) })} className={inputCls} aria-label="Icon">
                {STEP_ICONS.map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              <input value={s.title} maxLength={40} onChange={(e) => setCarWash({ steps: cw.steps.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} placeholder="Title" className={inputCls} aria-label="Step title" />
              <input value={s.text} maxLength={80} onChange={(e) => setCarWash({ steps: cw.steps.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })} placeholder="Short description" className={inputCls} aria-label="Step text" />
              <span className="flex items-center gap-1">
                <button type="button" onClick={() => setCarWash({ steps: move(cw.steps, i, -1) })} className="rounded px-2 py-1 text-xs font-bold text-slate-500 ring-1 ring-slate-200" aria-label="Move up">↑</button>
                <button type="button" onClick={() => setCarWash({ steps: move(cw.steps, i, 1) })} className="rounded px-2 py-1 text-xs font-bold text-slate-500 ring-1 ring-slate-200" aria-label="Move down">↓</button>
                <button type="button" onClick={() => setCarWash({ steps: cw.steps.filter((_, j) => j !== i) })} className="rounded p-1.5 text-rose-600 hover:bg-rose-50" aria-label="Remove step"><Trash2 className="h-4 w-4" /></button>
              </span>
            </li>
          ))}
        </ul>
        {cw.steps.length < 6 ? (
          <button type="button" onClick={() => setCarWash({ steps: [...cw.steps, { icon: 'check', title: '', text: '' }] })} className="flex items-center gap-1.5 text-sm font-extrabold text-orange-600">
            <Plus className="h-4 w-4" aria-hidden /> Add step
          </button>
        ) : null}
      </Section>

      <Section title="Trust chips" hint="The three small badges on every service list page (max 3).">
        <ul className="grid gap-2 md:grid-cols-3">
          {cfg.trustChips.map((c, i) => (
            <li key={i} className="space-y-2 rounded-xl bg-slate-50 p-3">
              <select value={c.icon} onChange={(e) => setCfg((x) => ({ ...x, trustChips: x.trustChips.map((y, j) => (j === i ? { ...y, icon: e.target.value } : y)) }))} className={inputCls} aria-label="Icon">
                {CHIP_ICONS.map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              <input value={c.label} maxLength={30} onChange={(e) => setCfg((x) => ({ ...x, trustChips: x.trustChips.map((y, j) => (j === i ? { ...y, label: e.target.value } : y)) }))} className={inputCls} aria-label="Chip text" />
            </li>
          ))}
        </ul>
      </Section>

      <div className="grid gap-5 md:grid-cols-2">
        <Section title="Payment methods" hint="Switch a method off to stop customers choosing it. At least one must stay on.">
          <ul className="space-y-2">
            {cfg.paymentMethods.map((m, i) => (
              <li key={m.id} className="flex items-center gap-2 rounded-xl bg-slate-50 p-3">
                <span className="w-16 text-xs font-extrabold uppercase text-slate-500">{m.id}</span>
                <input value={m.label} maxLength={30} onChange={(e) => setCfg((x) => ({ ...x, paymentMethods: x.paymentMethods.map((y, j) => (j === i ? { ...y, label: e.target.value } : y)) }))} className={inputCls} aria-label={`${m.id} label`} />
                <Active checked={m.isActive !== false} onChange={(v) => setCfg((x) => ({ ...x, paymentMethods: x.paymentMethods.map((y, j) => (j === i ? { ...y, isActive: v } : y)) }))} />
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Working duration" hint="Labels and availability of the duration choices for scheduled bookings.">
          <ul className="space-y-2">
            {cfg.durationOptions.map((d, i) => (
              <li key={d.id} className="flex items-center gap-2 rounded-xl bg-slate-50 p-3">
                <span className="w-20 text-xs font-extrabold uppercase text-slate-500">{d.id.replace('_', ' ')}</span>
                <input value={d.label} maxLength={30} onChange={(e) => setCfg((x) => ({ ...x, durationOptions: x.durationOptions.map((y, j) => (j === i ? { ...y, label: e.target.value } : y)) }))} className={inputCls} aria-label={`${d.id} label`} />
                <Active checked={d.isActive !== false} onChange={(v) => setCfg((x) => ({ ...x, durationOptions: x.durationOptions.map((y, j) => (j === i ? { ...y, isActive: v } : y)) }))} />
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:left-auto md:right-6 md:bottom-6 md:w-auto md:rounded-2xl md:border md:shadow-xl">
        <button type="button" disabled={saving} onClick={save} className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-black text-white disabled:opacity-50 md:w-auto">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
          Save settings
        </button>
      </div>
    </div>
  )
}

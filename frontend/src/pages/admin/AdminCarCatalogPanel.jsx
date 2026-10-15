import { useCallback, useEffect, useState } from 'react'
import { ChevronDown, Loader2, Plus, Save, Trash2 } from 'lucide-react'
import { adminCarsApi } from '../../api/adminCarsApi.js'
import { GlassPanel } from '../../components/ui/GlassPanel.jsx'

/** "Swift: VXi, ZXi" per line  <->  [{ name, variants }] */
const parseModels = (text) =>
  String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, rest = ''] = line.split(':')
      return {
        name: name.trim(),
        variants: rest
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean),
      }
    })

const modelsToText = (models = []) =>
  models.map((m) => (m.variants?.length ? `${m.name}: ${m.variants.join(', ')}` : m.name)).join('\n')

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20'

function MakeRow({ make, onChanged, onError }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(make.name)
  const [models, setModels] = useState(modelsToText(make.models))
  const [saving, setSaving] = useState(false)

  const dirty = name.trim() !== make.name || models.trim() !== modelsToText(make.models).trim()

  const save = async () => {
    try {
      setSaving(true)
      await adminCarsApi.updateMake(make._id, { name: name.trim(), models: parseModels(models) })
      await onChanged()
    } catch (e) {
      onError(e.message || 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <li className="p-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          aria-expanded={open}
        >
          <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`} aria-hidden />
          <span className={`truncate text-sm font-extrabold ${make.isActive ? 'text-slate-900' : 'text-slate-400 line-through'}`}>
            {make.name}
          </span>
          <span className="shrink-0 text-xs font-semibold text-slate-400">{make.models.length} models</span>
        </button>
        <label className="flex shrink-0 items-center gap-2 text-xs font-bold text-slate-600">
          <input
            type="checkbox"
            checked={make.isActive}
            onChange={async (e) => {
              try {
                await adminCarsApi.updateMake(make._id, { isActive: e.target.checked })
                await onChanged()
              } catch (err) {
                onError(err.message)
              }
            }}
            className="h-4 w-4 accent-orange-500"
          />
          Active
        </label>
        <button
          type="button"
          onClick={async () => {
            if (!window.confirm(`Remove ${make.name} and its models from the catalogue?`)) return
            try {
              await adminCarsApi.deleteMake(make._id)
              await onChanged()
            } catch (err) {
              onError(err.message)
            }
          }}
          className="rounded-lg p-2 text-rose-600 ring-1 ring-rose-100 hover:bg-rose-50"
          aria-label={`Delete ${make.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {open ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-[14rem_1fr]">
          <label className="text-xs font-bold text-slate-600">
            Make name
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className={`${inputCls} mt-1`} />
          </label>
          <label className="text-xs font-bold text-slate-600">
            Models <span className="font-medium text-slate-400">(one per line; add variants after a colon: “Swift: VXi, ZXi”)</span>
            <textarea
              value={models}
              onChange={(e) => setModels(e.target.value)}
              rows={Math.min(12, Math.max(4, make.models.length + 1))}
              className={`${inputCls} mt-1 font-mono`}
            />
          </label>
          <div className="sm:col-span-2">
            <button
              type="button"
              disabled={!dirty || saving}
              onClick={save}
              className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-sm font-extrabold text-white disabled:opacity-40"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
              Save changes
            </button>
          </div>
        </div>
      ) : null}
    </li>
  )
}

function OptionList({ title, items, onChange }) {
  const [label, setLabel] = useState('')
  const add = () => {
    const l = label.trim()
    if (!l) return
    onChange([...items, { value: l.toUpperCase().replace(/[^A-Z0-9]+/g, '_'), label: l, isActive: true }])
    setLabel('')
  }
  return (
    <div>
      <h3 className="text-sm font-black text-slate-900">{title}</h3>
      <ul className="mt-2 space-y-1.5">
        {items.map((o, i) => (
          <li key={o.value} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
            <input
              value={o.label}
              onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
              className="min-w-0 flex-1 bg-transparent text-sm font-bold outline-none"
              aria-label={`${title} label`}
            />
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
              <input
                type="checkbox"
                checked={o.isActive !== false}
                onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, isActive: e.target.checked } : x)))}
                className="h-4 w-4 accent-orange-500"
              />
              Active
            </label>
            <button
              type="button"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="rounded p-1 text-rose-600 hover:bg-rose-50"
              aria-label="Remove"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex gap-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder="Add new…"
          className={inputCls}
        />
        <button type="button" onClick={add} className="rounded-lg bg-slate-900 px-3 text-white" aria-label="Add">
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export function AdminCarCatalogPanel() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [newMake, setNewMake] = useState('')
  const [fuel, setFuel] = useState([])
  const [trans, setTrans] = useState([])
  const [cities, setCities] = useState('')
  const [maxPhotos, setMaxPhotos] = useState('8')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await adminCarsApi.catalog()
      setData(res.data)
      const o = res.data.options || {}
      setFuel(o.fuelTypes || [])
      setTrans(o.transmissions || [])
      setCities((o.cities || []).join('\n'))
      setMaxPhotos(String(o.maxPhotos || 8))
      setError('')
    } catch (e) {
      setError(e.message || 'Could not load the catalogue')
    }
  }, [])

  useEffect(() => {
    let alive = true
    adminCarsApi
      .catalog()
      .then((res) => {
        if (!alive) return
        setData(res.data)
        const o = res.data.options || {}
        setFuel(o.fuelTypes || [])
        setTrans(o.transmissions || [])
        setCities((o.cities || []).join('\n'))
        setMaxPhotos(String(o.maxPhotos || 8))
      })
      .catch((e) => alive && setError(e.message || 'Could not load the catalogue'))
    return () => {
      alive = false
    }
  }, [])

  const addMake = async () => {
    const name = newMake.trim()
    if (!name) return
    try {
      await adminCarsApi.createMake({ name, models: [] })
      setNewMake('')
      await load()
      setNotice(`${name} added. Open it to add models.`)
    } catch (e) {
      setError(e.message || 'Could not add the make')
    }
  }

  const saveOptions = async () => {
    try {
      setSaving(true)
      setError('')
      await adminCarsApi.saveOptions({
        fuelTypes: fuel,
        transmissions: trans,
        cities: cities
          .split(/[\n,]/)
          .map((c) => c.trim())
          .filter(Boolean),
        maxPhotos: Number(maxPhotos),
      })
      await load()
      setNotice('Options saved. The sell form and filters use them immediately.')
    } catch (e) {
      setError(e.message || 'Could not save the options')
    } finally {
      setSaving(false)
    }
  }

  if (!data) {
    return (
      <p className="flex items-center gap-2 p-6 text-sm font-semibold text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {error || 'Loading catalogue…'}
      </p>
    )
  }

  return (
    <div className="space-y-6">
      {error ? <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p> : null}
      {notice ? <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{notice}</p> : null}

      <GlassPanel className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
          <div>
            <h2 className="text-base font-black text-slate-900">Makes &amp; models</h2>
            <p className="text-xs font-medium text-slate-500">
              Sellers pick from these in the sell form. Inactive makes are hidden from new ads.
            </p>
          </div>
          <div className="flex gap-2">
            <input
              value={newMake}
              onChange={(e) => setNewMake(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMake())}
              placeholder="New make, e.g. Citroen"
              className={`${inputCls} w-52`}
            />
            <button
              type="button"
              onClick={addMake}
              className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-3.5 py-2 text-sm font-extrabold text-white"
            >
              <Plus className="h-4 w-4" aria-hidden /> Add
            </button>
          </div>
        </div>
        <ul className="divide-y divide-slate-100">
          {data.makes.map((m) => (
            <MakeRow key={m._id} make={m} onChanged={load} onError={setError} />
          ))}
          {data.makes.length === 0 ? <li className="p-6 text-center text-sm font-semibold text-slate-500">No makes yet.</li> : null}
        </ul>
      </GlassPanel>

      <GlassPanel className="space-y-6 p-4">
        <div>
          <h2 className="text-base font-black text-slate-900">Dropdown options</h2>
          <p className="text-xs font-medium text-slate-500">Used by the sell form and the buy filters.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <OptionList title="Fuel types" items={fuel} onChange={setFuel} />
          <OptionList title="Transmissions" items={trans} onChange={setTrans} />
        </div>
        <div className="grid gap-6 md:grid-cols-[1fr_12rem]">
          <label className="text-sm font-black text-slate-900">
            Cities <span className="text-xs font-medium text-slate-400">(one per line)</span>
            <textarea
              value={cities}
              onChange={(e) => setCities(e.target.value)}
              rows={6}
              className={`${inputCls} mt-2 font-medium`}
            />
          </label>
          <label className="text-sm font-black text-slate-900">
            Max photos per ad
            <input
              inputMode="numeric"
              value={maxPhotos}
              onChange={(e) => setMaxPhotos(e.target.value.replace(/[^\d]/g, '').slice(0, 2))}
              className={`${inputCls} mt-2`}
            />
          </label>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={saveOptions}
          className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-extrabold text-white disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
          Save options
        </button>
      </GlassPanel>
    </div>
  )
}

import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bike, CarFront, Plus, Trash2, Wrench, X } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth.js'

const MAX_VEHICLES = 10

function storageKey(userId) {
  return `cc-vehicles:${userId || 'guest'}`
}

function readVehicles(userId) {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function writeVehicles(userId, list) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(list))
  } catch {
    /* storage unavailable — the list simply stays in memory for this session */
  }
}

const EMPTY_FORM = { type: 'car', name: '', plate: '' }

/**
 * Saved cars and bikes for quick booking.
 * Stored on this device for now (per user); the booking flow does not read it yet.
 */
export function MyVehiclesPage() {
  const { user } = useAuth()
  const userId = user?._id || user?.id
  const [vehicles, setVehicles] = useState(() => readVehicles(userId))
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')

  const plateOk = useMemo(() => /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{1,4}$/.test(form.plate), [form.plate])

  const save = useCallback(
    (next) => {
      setVehicles(next)
      writeVehicles(userId, next)
    },
    [userId],
  )

  const onSubmit = (e) => {
    e.preventDefault()
    const name = form.name.trim()
    if (!name) return setError('Enter the make and model, e.g. Maruti Swift')
    if (form.plate && !plateOk) return setError('Enter a valid registration number, e.g. MP09AB1234')
    if (vehicles.length >= MAX_VEHICLES) return setError(`You can save up to ${MAX_VEHICLES} vehicles`)
    save([{ id: `${Date.now()}`, type: form.type, name, plate: form.plate }, ...vehicles])
    setForm(EMPTY_FORM)
    setError('')
    setAdding(false)
  }

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black tracking-tight text-navy">My Vehicles</h1>
          <p className="text-xs font-medium text-slate-500">Save your car or bike for faster bookings</p>
        </div>
        {!adding ? (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 rounded-2xl bg-brand px-3.5 py-2.5 text-sm font-extrabold text-white shadow-md shadow-brand/30 transition active:scale-95"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add
          </button>
        ) : null}
      </div>

      {adding ? (
        <form onSubmit={onSubmit} className="space-y-3 rounded-2xl bg-orange-50 p-4 ring-1 ring-orange-100">
          <div className="flex items-center justify-between">
            <p className="text-sm font-extrabold text-navy">Add a vehicle</p>
            <button
              type="button"
              onClick={() => {
                setAdding(false)
                setError('')
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-white"
              aria-label="Cancel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Vehicle type">
            {[
              { id: 'car', label: 'Car', Icon: CarFront },
              { id: 'bike', label: 'Bike', Icon: Bike },
            ].map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={form.type === id}
                onClick={() => setForm((f) => ({ ...f, type: id }))}
                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition ${
                  form.type === id ? 'bg-brand text-white shadow-md shadow-brand/25' : 'bg-white text-slate-700 ring-1 ring-slate-200'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </button>
            ))}
          </div>

          <label className="block text-xs font-bold text-slate-600">
            Make &amp; model
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              maxLength={60}
              placeholder={form.type === 'car' ? 'Maruti Swift' : 'Honda Activa'}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </label>
          <label className="block text-xs font-bold text-slate-600">
            Registration number <span className="font-medium text-slate-400">(optional)</span>
            <input
              value={form.plate}
              onChange={(e) => setForm((f) => ({ ...f, plate: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12) }))}
              placeholder="MP09AB1234"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold uppercase tracking-wider text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </label>

          {error ? <p className="text-xs font-semibold text-red-600">{error}</p> : null}

          <button
            type="submit"
            className="w-full rounded-xl bg-brand py-3 text-sm font-extrabold text-white shadow-md shadow-brand/25 transition active:scale-[0.98]"
          >
            Save vehicle
          </button>
        </form>
      ) : null}

      {vehicles.length === 0 && !adding ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-brand">
            <CarFront className="h-7 w-7" aria-hidden />
          </span>
          <p className="mt-3 text-sm font-extrabold text-navy">No vehicles yet</p>
          <p className="mt-1 text-xs text-slate-500">Add your car or bike so mechanics know what they are working on.</p>
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="mt-4 rounded-xl bg-brand px-5 py-2.5 text-sm font-extrabold text-white shadow-md shadow-brand/25"
          >
            Add your first vehicle
          </button>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {vehicles.map((v) => {
            const Icon = v.type === 'bike' ? Bike : CarFront
            return (
              <li key={v.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-brand">
                  <Icon className="h-6 w-6" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold text-navy">{v.name}</p>
                  <p className="truncate text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {v.plate || (v.type === 'bike' ? 'Bike' : 'Car')}
                  </p>
                </div>
                <Link
                  to="/app/services"
                  className="flex shrink-0 items-center gap-1 rounded-xl bg-brand/10 px-2.5 py-2 text-[11px] font-extrabold text-brand"
                >
                  <Wrench className="h-3.5 w-3.5" aria-hidden />
                  Book
                </Link>
                <button
                  type="button"
                  onClick={() => save(vehicles.filter((x) => x.id !== v.id))}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                  aria-label={`Remove ${v.name}`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

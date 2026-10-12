import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Briefcase, Home as HomeIcon, Loader2, MapPin, Navigation, Plus, Trash2 } from 'lucide-react'
import { userAddressesApi } from '../../api/userAddressesApi.js'
import { ApiError } from '../../api/http.js'
import { AppStackScreenHeader } from '../../components/app/AppStackScreenHeader.jsx'
import { AppModal } from '../../components/app-ui/feedback/AppModal.jsx'
import { AppTextInput } from '../../components/app-ui/inputs/AppTextInput.jsx'
import { AppButton } from '../../components/app-ui/buttons/AppButton.jsx'

const LABEL_ICONS = { home: HomeIcon, office: Briefcase }
const LABEL_OPTIONS = ['Home', 'Office', 'Other']

function labelIconFor(label) {
  return LABEL_ICONS[label?.trim().toLowerCase()] || MapPin
}

/** Haversine distance in km between two lat/lng points. */
function distanceKm(lat1, lng1, lat2, lng2) {
  if ([lat1, lng1, lat2, lng2].some((v) => v == null || !Number.isFinite(v))) return null
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function AppAddressBookPage() {
  const reduce = useReducedMotion()
  const inputRef = useRef(null)

  const [addresses, setAddresses] = useState([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [removingId, setRemovingId] = useState(null)
  const [here, setHere] = useState({ lat: null, lng: null })
  const [locating, setLocating] = useState(false)

  const [addOpen, setAddOpen] = useState(false)
  const [newLabel, setNewLabel] = useState('Home')
  const [newAddress, setNewAddress] = useState('')
  const [newLat, setNewLat] = useState(null)
  const [newLng, setNewLng] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await userAddressesApi.list()
      setAddresses(res?.data?.addresses ?? [])
      setListError('')
    } catch (err) {
      setListError(err instanceof ApiError ? err.message : 'Could not load your addresses.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    queueMicrotask(() => void load())
  }, [load])

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setHere({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 8_000, maximumAge: 120_000 },
    )
  }, [])

  // Google Places Autocomplete on the address field, same loader pattern as checkout.
  useEffect(() => {
    if (!addOpen) return
    function initAutocomplete() {
      if (!inputRef.current || !window.google?.maps?.places) return
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        fields: ['formatted_address', 'geometry', 'name'],
        types: ['geocode', 'establishment'],
      })
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace()
        if (place.geometry?.location) {
          setNewLat(place.geometry.location.lat())
          setNewLng(place.geometry.location.lng())
          setNewAddress(place.formatted_address || place.name || '')
        }
      })
    }

    if (window.google?.maps?.places) {
      initAutocomplete()
      return
    }
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    if (!apiKey) return
    const existing = document.querySelector('#google-maps-script')
    if (existing) {
      existing.addEventListener('load', initAutocomplete)
      return
    }
    const script = document.createElement('script')
    script.id = 'google-maps-script'
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.onload = initAutocomplete
    document.head.appendChild(script)
  }, [addOpen])

  const openAdd = useCallback(() => {
    setNewLabel('Home')
    setNewAddress('')
    setNewLat(null)
    setNewLng(null)
    setSaveError('')
    setAddOpen(true)
  }, [])

  const useCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const la = pos.coords.latitude
        const ln = pos.coords.longitude
        setHere({ lat: la, lng: ln })
        let addr = ''
        try {
          const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
          if (apiKey) {
            const res = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${la},${ln}&key=${apiKey}`,
            )
            const data = await res.json()
            if (data.status === 'OK' && data.results?.[0]) addr = data.results[0].formatted_address
          }
        } catch {
          /* reverse geocode is best-effort; user can still type the address */
        }
        setLocating(false)
        setNewLabel('Home')
        setNewAddress(addr)
        setNewLat(la)
        setNewLng(ln)
        setSaveError('')
        setAddOpen(true)
      },
      () => setLocating(false),
      { enableHighAccuracy: false, timeout: 14_000, maximumAge: 60_000 },
    )
  }, [])

  const saveNewAddress = useCallback(
    async (e) => {
      e.preventDefault()
      if (!newAddress.trim()) return
      setSaving(true)
      setSaveError('')
      try {
        await userAddressesApi.create({ label: newLabel, address: newAddress.trim(), lat: newLat, lng: newLng })
        setAddOpen(false)
        await load()
      } catch (err) {
        setSaveError(err instanceof ApiError ? err.message : 'Could not save this address.')
      } finally {
        setSaving(false)
      }
    },
    [newLabel, newAddress, newLat, newLng, load],
  )

  const removeAddress = useCallback(
    async (id) => {
      setRemovingId(id)
      try {
        await userAddressesApi.remove(id)
        setAddresses((list) => list.filter((a) => a._id !== id))
      } catch (err) {
        setListError(err instanceof ApiError ? err.message : 'Could not remove this address.')
      } finally {
        setRemovingId(null)
      }
    },
    [],
  )

  return (
    <motion.div
      className="space-y-5 pb-6"
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <AppStackScreenHeader title="Address book" backTo="/app/profile" />

      <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
        <button
          type="button"
          onClick={openAdd}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50 active:bg-slate-100"
        >
          <Plus className="h-4 w-4 text-brand" aria-hidden />
          <span className="text-sm font-bold text-brand">Add address</span>
        </button>
        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={locating}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50 active:bg-slate-100 disabled:opacity-60"
        >
          {locating ? (
            <Loader2 className="h-4 w-4 animate-spin text-brand" aria-hidden />
          ) : (
            <Navigation className="h-4 w-4 text-brand" aria-hidden />
          )}
          <span className="text-sm font-bold text-brand">Use current location</span>
        </button>
      </div>

      <section>
        <p className="mb-2 px-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
          Saved addresses
        </p>
        {listError ? (
          <p className="mb-3 rounded-xl bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-700">{listError}</p>
        ) : null}
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-brand" aria-hidden />
          </div>
        ) : addresses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200/90 bg-white/60 p-6 text-center">
            <MapPin className="mx-auto h-6 w-6 text-slate-300" aria-hidden />
            <p className="mt-2 text-sm font-semibold text-slate-700">No saved addresses yet</p>
            <p className="mt-1 text-xs text-slate-500">Add your home or office so booking is faster next time.</p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {addresses.map((a) => {
              const Icon = labelIconFor(a.label)
              const km = distanceKm(here.lat, here.lng, a.lat, a.lng)
              const removing = removingId === a._id
              return (
                <li
                  key={a._id}
                  className="flex items-start gap-3 rounded-2xl border border-slate-200/90 bg-white px-4 py-3.5 shadow-sm"
                >
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand ring-1 ring-brand/15">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900">{a.label}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs font-medium leading-snug text-slate-500">
                      {a.address}
                    </p>
                    {km != null ? (
                      <p className="mt-1 text-[11px] font-bold text-slate-400">{km.toFixed(1)} km away</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAddress(a._id)}
                    disabled={removing}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                    aria-label={`Remove ${a.label}`}
                  >
                    {removing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Trash2 className="h-4 w-4" aria-hidden />}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <AppModal open={addOpen} onClose={() => !saving && setAddOpen(false)} title="Add address">
        <form onSubmit={saveNewAddress} className="space-y-4">
          <div>
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-600">Label</p>
            <div className="flex gap-2">
              {LABEL_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setNewLabel(opt)}
                  className={`rounded-xl border px-3.5 py-2 text-xs font-bold transition ${
                    newLabel === opt
                      ? 'border-brand bg-brand/10 text-brand'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-brand/30'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="addr-text" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600">
              Address
            </label>
            <AppTextInput
              id="addr-text"
              ref={inputRef}
              placeholder="Search locality, sector, area"
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              disabled={saving}
              autoFocus
            />
          </div>
          {saveError ? <p className="text-xs font-medium text-rose-600">{saveError}</p> : null}
          <div className="flex gap-3 pt-2">
            <AppButton type="button" variant="secondary" onClick={() => setAddOpen(false)} disabled={saving}>
              Cancel
            </AppButton>
            <AppButton type="submit" loading={saving} disabled={!newAddress.trim()}>
              Save address
            </AppButton>
          </div>
        </form>
      </AppModal>
    </motion.div>
  )
}

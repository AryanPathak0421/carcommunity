import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Briefcase, ChevronRight, Clock, Home as HomeIcon, Loader2, MapPin, Settings2 } from 'lucide-react'
import { AppModal } from '../app-ui/feedback/AppModal.jsx'
import { userAddressesApi } from '../../api/userAddressesApi.js'
import { readAppUserLocation } from '../../lib/appUserLocationStorage.js'

const LABEL_ICONS = { home: HomeIcon, office: Briefcase }

function iconFor(label) {
  return LABEL_ICONS[String(label || '').trim().toLowerCase()] || MapPin
}

/**
 * Bottom-sheet style chooser for the user's saved addresses.
 * `onSelect` receives `{ address, lat, lng }`.
 */
export function SavedAddressPicker({ open, onClose, onSelect }) {
  const [addresses, setAddresses] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      setLoading(true)
      setError('')
    })
    userAddressesApi
      .list()
      .then((res) => {
        if (!cancelled) setAddresses(res?.data?.addresses ?? [])
      })
      .catch(() => {
        if (!cancelled) setError('Could not load your saved addresses.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open])

  const lastUsed = open ? readAppUserLocation() : null
  const showLastUsed =
    lastUsed?.address && !addresses.some((a) => a.address === lastUsed.address)

  const pick = (entry) => {
    onSelect?.({ address: entry.address, lat: entry.lat ?? null, lng: entry.lng ?? null })
    onClose?.()
  }

  return (
    <AppModal open={open} onClose={onClose} title="Choose an address">
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-brand" aria-hidden />
        </div>
      ) : error ? (
        <p className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-700">{error}</p>
      ) : (
        <div className="space-y-3">
          {addresses.length === 0 && !showLastUsed ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-5 text-center">
              <MapPin className="mx-auto h-6 w-6 text-slate-300" aria-hidden />
              <p className="mt-2 text-sm font-semibold text-slate-700">No saved addresses yet</p>
              <p className="mt-1 text-xs text-slate-500">Save your home or office once and pick it here next time.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/90">
              {showLastUsed ? (
                <li>
                  <button
                    type="button"
                    onClick={() => pick(lastUsed)}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50 active:bg-slate-100"
                  >
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                      <Clock className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-slate-900">Last used</span>
                      <span className="mt-0.5 line-clamp-2 block text-xs font-medium leading-snug text-slate-500">
                        {lastUsed.address}
                      </span>
                    </span>
                    <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                  </button>
                </li>
              ) : null}
              {addresses.map((a) => {
                const Icon = iconFor(a.label)
                return (
                  <li key={a._id}>
                    <button
                      type="button"
                      onClick={() => pick(a)}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50 active:bg-slate-100"
                    >
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand ring-1 ring-brand/15">
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-slate-900">{a.label}</span>
                        <span className="mt-0.5 line-clamp-2 block text-xs font-medium leading-snug text-slate-500">
                          {a.address}
                        </span>
                      </span>
                      <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          <Link
            to="/app/addresses"
            className="flex items-center justify-center gap-1.5 rounded-xl border border-brand/25 bg-brand/5 py-2.5 text-sm font-bold text-brand transition hover:bg-brand/10"
          >
            <Settings2 className="h-4 w-4" aria-hidden />
            Manage addresses
          </Link>
        </div>
      )}
    </AppModal>
  )
}

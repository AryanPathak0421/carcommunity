import { useState } from 'react'
import { Loader2, XCircle } from 'lucide-react'
import { bookingsApi } from '../../../api/bookingsApi.js'

/**
 * "Cancel booking" for the searching screens (customer only, before a mechanic accepts).
 * Asks for confirmation, then moves the booking to CANCELLED; the server releases any wallet discount / parts.
 *
 * @param {{ bookingId?: string, onCancelled?: () => void, className?: string }} props
 */
export function CancelSearchButton({ bookingId, onCancelled, className = '' }) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!bookingId) return null

  const cancel = async () => {
    setBusy(true)
    setError('')
    try {
      await bookingsApi.updateBookingStatus(bookingId, 'CANCELLED')
      onCancelled?.()
    } catch (e) {
      // A mechanic may have accepted in the meantime: the server then refuses and the screen refreshes itself.
      setError(e?.message || 'Could not cancel this booking. Please try again.')
      setBusy(false)
      setConfirming(false)
    }
  }

  return (
    <div className={`px-4 ${className}`}>
      {error ? (
        <p className="mb-2 rounded-xl bg-rose-50 px-3 py-2 text-center text-xs font-semibold text-rose-700" role="alert">
          {error}
        </p>
      ) : null}

      {confirming ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-3 text-center">
          <p className="text-sm font-bold text-slate-900">Cancel this booking?</p>
          <p className="mt-0.5 text-xs text-slate-600">We will stop looking for a mechanic.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={busy}
              className="rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-bold text-slate-700 disabled:opacity-60"
            >
              Keep searching
            </button>
            <button
              type="button"
              onClick={cancel}
              disabled={busy}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 py-2.5 text-sm font-bold text-white disabled:opacity-70"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              Yes, cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white py-3 text-sm font-bold text-rose-700 shadow-sm transition active:scale-[0.99]"
        >
          <XCircle className="h-4 w-4" aria-hidden />
          Cancel booking
        </button>
      )}
    </div>
  )
}

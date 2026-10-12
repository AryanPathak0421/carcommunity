import { Link } from 'react-router-dom'
import { ChevronRight, Gift } from 'lucide-react'
import { formatRupees } from './homeBooking.js'

export function HomeReferCard({ reward }) {
  return (
    <Link
      to="/app/refer"
      className="relative flex items-center gap-3 overflow-hidden rounded-2xl bg-linear-to-r from-amber-50 to-orange-50 p-4 ring-1 ring-amber-200/70 transition active:scale-[0.99]"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-amber-600 shadow-sm ring-1 ring-amber-200/80">
        <Gift className="h-6 w-6" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-extrabold text-slate-900">
          Refer a friend{reward ? `, earn ${formatRupees(reward)}` : ''}
        </span>
        <span className="mt-0.5 block text-[11px] font-medium text-slate-600">
          Reward lands in your wallet — use it on your next booking.
        </span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-amber-600" aria-hidden />
    </Link>
  )
}

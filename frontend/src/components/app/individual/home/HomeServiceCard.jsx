import { Clock } from 'lucide-react'
import { getCategoryImageUrl } from '../../../../lib/labourCategoryDisplay.js'
import { formatRupees } from './homeBooking.js'
import { pastelAt } from './homeTheme.js'

/** Product-card style service tile with an overlaid BOOK button, à la quick-commerce apps. */
export function HomeServiceCard({ item, index = 0, onBook, className = '' }) {
  const { cat, service } = item
  const price = Number(service.basePrice)
  const mins = Number(service.estimatedDurationMins)

  return (
    <div className={`flex flex-col ${className}`}>
      <div className={`relative aspect-square w-full overflow-hidden rounded-2xl ${pastelAt(index)}`}>
        <img
          src={getCategoryImageUrl({ name: service.name, imageUrl: service.iconUrl || cat.imageUrl })}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
        <button
          type="button"
          onClick={() => onBook(item)}
          className="absolute bottom-2 right-2 rounded-lg border border-brand bg-white px-3 py-1 text-[11px] font-black tracking-wide text-brand shadow-[0_4px_10px_-4px_rgba(15,23,42,0.4)] transition hover:bg-brand hover:text-white active:scale-95"
          aria-label={`Book ${service.name}`}
        >
          BOOK
        </button>
      </div>
      {price > 0 ? (
        <p className="mt-2 text-[15px] font-black leading-none text-slate-900">
          {formatRupees(price)}
          <span className="ml-1 text-[10px] font-semibold text-slate-400">onwards</span>
        </p>
      ) : null}
      <p className="mt-1 line-clamp-2 text-[12px] font-semibold leading-snug text-slate-800">{service.name}</p>
      <p className="mt-auto flex items-center gap-1 pt-1 text-[10px] font-medium text-slate-500">
        {mins > 0 ? (
          <>
            <Clock className="h-3 w-3" aria-hidden />
            ~{mins >= 60 ? `${Math.round(mins / 60)} hr` : `${mins} min`} job
          </>
        ) : (
          <span className="truncate">{cat.name}</span>
        )}
      </p>
    </div>
  )
}

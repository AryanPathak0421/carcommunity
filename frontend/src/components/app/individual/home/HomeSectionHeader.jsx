import { ChevronRight } from 'lucide-react'

export function HomeSectionHeader({ title, subtitle, actionLabel, onAction, id }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 id={id} className="text-[17px] font-extrabold leading-tight tracking-tight text-slate-900">
          {title}
        </h2>
        {subtitle ? <p className="mt-0.5 text-xs font-medium text-slate-500">{subtitle}</p> : null}
      </div>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="flex shrink-0 items-center gap-0.5 rounded-full px-1 text-xs font-bold text-brand transition active:scale-95"
        >
          {actionLabel}
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
    </div>
  )
}

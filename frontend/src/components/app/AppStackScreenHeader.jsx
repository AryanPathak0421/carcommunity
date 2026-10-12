import { Link } from 'react-router-dom'
import { ArrowLeft, Menu } from 'lucide-react'
import { GlassPanel } from '../ui/GlassPanel.jsx'

function openAppDrawer() {
  window.dispatchEvent(new Event('lc-open-app-drawer'))
}

/**
 * Standard header for full-screen app routes without AppShell chrome (bookings, search, etc.).
 * `variant="brand"` renders the green tab-style bar (menu + title, optional subtitle and
 * extra content such as a segmented switch) used by the main bottom-nav screens.
 */
export function AppStackScreenHeader({ title, backTo = '/app', onBack, variant, subtitle, children }) {
  if (variant === 'brand') {
    return (
      <header className="sticky top-0 z-30 -mx-4 -mt-2 bg-brand px-4 pb-3.5 pt-[max(0.75rem,env(safe-area-inset-top,0px))] shadow-[0_8px_20px_-14px_rgba(15,23,42,0.6)]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openAppDrawer}
            className="-ml-1.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white transition hover:bg-white/10"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" aria-hidden />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-black leading-tight tracking-tight text-white">{title}</h1>
            {subtitle ? <p className="truncate text-xs font-medium text-white/80">{subtitle}</p> : null}
          </div>
        </div>
        {children ? <div className="mt-3">{children}</div> : null}
      </header>
    )
  }

  return (
    <header className="sticky top-0 z-30 pb-3 pt-[max(0.25rem,env(safe-area-inset-top))]">
      <GlassPanel className="flex items-center gap-3 px-3 py-2.5">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200/70 bg-white/90 text-slate-700 shadow-sm transition hover:border-brand/30 hover:text-slate-900 active:scale-95"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </button>
        ) : (
          <Link
            to={backTo}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200/70 bg-white/90 text-slate-700 shadow-sm transition hover:border-brand/30 hover:text-slate-900 active:scale-95"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </Link>
        )}
        <h1 className="min-w-0 flex-1 text-lg font-extrabold tracking-tight text-slate-900 truncate">{title}</h1>
        <button
          type="button"
          onClick={openAppDrawer}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200/70 bg-white/90 text-slate-700 shadow-sm transition hover:border-brand/30 hover:text-slate-900 active:scale-95"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
      </GlassPanel>
    </header>
  )
}

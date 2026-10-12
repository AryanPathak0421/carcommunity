import { NavLink } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'

/**
 * Bottom tab bar — solid surface, brand active states (no glass).
 * @param {{ items: { id: string, to: string, end?: boolean, label: string, icon: import('lucide-react').LucideIcon, premium?: boolean, center?: boolean }[] }} props
 */
export function AppBottomNav({ items }) {
  const reduce = useReducedMotion()

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 bg-white shadow-[0_-12px_32px_-16px_rgba(15,23,42,0.16)] print:hidden"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      aria-label="Bottom navigation"
    >
      <div className="mx-auto flex w-full max-w-lg items-stretch justify-around px-1 pt-1.5">
        {items.map(({ id, to, end, label, icon: Icon, premium, center }) => (
          <NavLink
            key={`${id}-${to}`}
            to={to}
            end={Boolean(end)}
            className={`relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 outline-none transition active:scale-95 ${
              center ? '-mt-6 max-w-[4.5rem] flex-[1.15]' : ''
            }`}
          >
            {({ isActive }) =>
              center ? (
                <>
                  <span
                    className={`flex h-14 w-14 items-center justify-center rounded-full bg-linear-to-br from-brand-bright to-brand text-white shadow-lg shadow-brand/40 ring-4 ring-white transition ${
                      isActive ? 'scale-105' : ''
                    }`}
                  >
                    <Icon className="h-6 w-6" strokeWidth={2.25} aria-hidden />
                  </span>
                  <span
                    className={`truncate px-0.5 text-[10px] font-bold ${isActive ? 'text-brand' : 'text-slate-500'}`}
                  >
                    {label}
                  </span>
                </>
              ) : premium ? (
                <>
                  <span className="relative flex h-9 w-9 items-center justify-center">
                    {isActive && !reduce ? (
                      <motion.span
                        layoutId="app-tab-bm"
                        className="absolute inset-0 rounded-xl bg-bm-terracotta/15 ring-2 ring-bm-terracotta/30"
                        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      />
                    ) : null}
                    {isActive && reduce ? (
                      <span className="absolute inset-0 rounded-xl bg-bm-terracotta/15 ring-2 ring-bm-terracotta/30" />
                    ) : null}
                    <Icon
                      className={`relative z-10 h-[22px] w-[22px] ${isActive ? 'text-bm-terracotta' : 'text-slate-400'}`}
                      aria-hidden
                    />
                  </span>
                  <span
                    className={`truncate px-0.5 text-[10px] font-bold ${isActive ? 'text-bm-terracotta' : 'text-slate-500'}`}
                  >
                    {label}
                  </span>
                </>
              ) : (
                <>
                  <span className="relative flex h-9 w-9 items-center justify-center">
                    {isActive && !reduce ? (
                      <motion.span
                        layoutId="app-tab-pill"
                        className="absolute inset-0 rounded-xl bg-brand-muted"
                        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      />
                    ) : null}
                    {isActive && reduce ? (
                      <span className="absolute inset-0 rounded-xl bg-brand-muted" />
                    ) : null}
                    <Icon
                      className={`relative z-10 h-[22px] w-[22px] ${isActive ? 'text-brand' : 'text-slate-400'}`}
                      strokeWidth={isActive ? 2.25 : 2}
                      aria-hidden
                    />
                  </span>
                  <span
                    className={`truncate px-0.5 text-[10px] font-bold ${isActive ? 'text-brand' : 'text-slate-500'}`}
                  >
                    {label}
                  </span>
                  {isActive ? (
                    <span className="h-0.5 w-4 rounded-full bg-brand" aria-hidden />
                  ) : (
                    <span className="h-0.5 w-4" aria-hidden />
                  )}
                </>
              )
            }
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

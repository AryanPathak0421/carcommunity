/**
 * CarCommunity wordmark: shield logo + "Car" (navy) "Community" (orange) + optional tagline.
 * The shield is /logo-icon.png (transparent); the light variant sits on a white chip for dark backgrounds.
 *
 * @param {{ variant?: 'color' | 'light', size?: 'sm' | 'md' | 'lg', tagline?: boolean, className?: string }} props
 */
export function CarCommunityLogo({ variant = 'color', size = 'md', tagline = true, className = '' }) {
  const light = variant === 'light'
  const dims = {
    sm: { badge: 'h-9 w-9', icon: 'h-4 w-4', wrench: 'h-2.5 w-2.5', text: 'text-[15px]', tag: 'text-[7px]' },
    md: { badge: 'h-12 w-12', icon: 'h-5 w-5', wrench: 'h-3 w-3', text: 'text-[19px]', tag: 'text-[8px]' },
    lg: { badge: 'h-16 w-16', icon: 'h-7 w-7', wrench: 'h-4 w-4', text: 'text-[28px]', tag: 'text-[10px]' },
  }[size]

  return (
    <span className={`inline-flex shrink-0 items-center gap-2 ${className}`} aria-label="CarCommunity">
      <span
        className={`flex ${dims.badge} shrink-0 items-center justify-center ${
          light ? 'rounded-xl bg-white p-1 shadow-sm' : ''
        }`}
        aria-hidden
      >
        <img src="/logo-icon.png?v=2" alt="" className="h-full w-full object-contain" draggable={false} />
      </span>
      <span className="flex min-w-0 flex-col leading-none">
        <span className={`${dims.text} font-black tracking-tight`}>
          <span className={light ? 'text-white' : 'text-navy'}>Car</span>
          <span className={light ? 'text-white/90' : 'text-brand'}>Community</span>
        </span>
        {tagline ? (
          <span
            className={`mt-1 whitespace-nowrap ${dims.tag} font-extrabold uppercase tracking-[0.1em] ${
              light ? 'text-white/80' : 'text-slate-500'
            }`}
          >
            Instant Mechanic Hiring
          </span>
        ) : null}
      </span>
    </span>
  )
}

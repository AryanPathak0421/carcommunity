import { CarFront, Wrench } from 'lucide-react'

/**
 * CarCommunity wordmark: car badge + "Car" (navy) "Community" (orange) + optional tagline.
 * Pure SVG/CSS so it scales and works on any background without a raster logo.
 *
 * @param {{ variant?: 'color' | 'light', size?: 'sm' | 'md' | 'lg', tagline?: boolean, className?: string }} props
 */
export function CarCommunityLogo({ variant = 'color', size = 'md', tagline = true, className = '' }) {
  const light = variant === 'light'
  const dims = {
    sm: { badge: 'h-8 w-8', icon: 'h-4 w-4', wrench: 'h-2.5 w-2.5', text: 'text-[15px]', tag: 'text-[7px]' },
    md: { badge: 'h-10 w-10', icon: 'h-5 w-5', wrench: 'h-3 w-3', text: 'text-[19px]', tag: 'text-[8px]' },
    lg: { badge: 'h-14 w-14', icon: 'h-7 w-7', wrench: 'h-4 w-4', text: 'text-[28px]', tag: 'text-[10px]' },
  }[size]

  return (
    <span className={`inline-flex shrink-0 items-center gap-2 ${className}`} aria-label="CarCommunity">
      <span
        className={`relative flex ${dims.badge} shrink-0 items-center justify-center rounded-xl ${
          light ? 'bg-white text-brand' : 'bg-linear-to-br from-brand-bright to-brand text-white'
        } shadow-sm`}
        aria-hidden
      >
        <CarFront className={dims.icon} strokeWidth={2.4} />
        <span
          className={`absolute -bottom-1 -right-1 flex h-[46%] w-[46%] items-center justify-center rounded-full ring-2 ${
            light ? 'bg-navy text-white ring-transparent' : 'bg-navy text-white ring-white'
          }`}
        >
          <Wrench className={dims.wrench} strokeWidth={2.6} />
        </span>
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

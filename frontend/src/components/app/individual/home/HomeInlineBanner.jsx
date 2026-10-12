import { useNavigate } from 'react-router-dom'
import { openBannerTarget } from './homeBooking.js'

/** One promo banner dropped between feed sections. Banner art is 3:1. */
export function HomeInlineBanner({ banner }) {
  const navigate = useNavigate()
  const hasTarget = Boolean(String(banner?.targetUrl || '').trim())

  return (
    <section aria-label="Offer">
      <div
        className={`relative aspect-[3/1] w-full overflow-hidden rounded-2xl bg-slate-100 shadow-[0_12px_28px_-16px_rgba(15,23,42,0.4)] ${
          hasTarget ? 'cursor-pointer transition active:scale-[0.99]' : ''
        }`}
        onClick={hasTarget ? () => openBannerTarget(navigate, banner.targetUrl) : undefined}
        role={hasTarget ? 'link' : undefined}
      >
        <img src={banner.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
      </div>
    </section>
  )
}

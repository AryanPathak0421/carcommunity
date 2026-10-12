import { useState } from 'react'
import { ArrowRight, CarFront, MapPin, ShieldCheck, Wrench, Zap } from 'lucide-react'

/**
 * Hero photo (transparent WebP/PNG). Replace the file in public/assets/images to change it;
 * set to null to fall back to the built-in illustration.
 */
const HERO_IMAGE = '/assets/images/home-hero-mechanic.webp'

const BADGES = [
  { Icon: ShieldCheck, label: 'Verified Mechanics' },
  { Icon: Zap, label: 'Quick Response' },
  { Icon: MapPin, label: 'On Your Location' },
]

function Illustration() {
  return (
    <div className="relative flex h-full w-full items-end justify-center" aria-hidden>
      <span className="absolute bottom-3 right-2 h-32 w-32 rounded-full bg-white/70" />
      <span className="absolute right-6 top-3 h-3 w-3 rounded-full bg-brand/40" />
      <span className="absolute left-2 top-10 h-2 w-2 rounded-full bg-navy/20" />
      <CarFront className="relative h-24 w-24 text-navy" strokeWidth={1.6} />
      <span className="absolute bottom-2 right-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-white shadow-lg shadow-brand/30">
        <Wrench className="h-6 w-6" strokeWidth={2.4} />
      </span>
    </div>
  )
}

/** "Car trouble?" hero with a single Book Now call to action (opens the instant booking picker). */
export function HomeHeroBanner({ onBook }) {
  const [imageOk, setImageOk] = useState(Boolean(HERO_IMAGE))

  return (
    <section
      className="relative overflow-hidden rounded-3xl bg-linear-to-br from-[#FFF4E8] via-[#FFE9D2] to-[#FFF8EF] px-4 py-3 ring-1 ring-orange-100"
      aria-label="Get a mechanic at your location"
    >
      <div className="relative z-10 w-[60%]">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-700">Car trouble?</p>
        <h1 className="mt-0.5 text-[23px] font-black leading-[1.08] tracking-tight text-navy">
          Get a <span className="text-brand">Mechanic</span> at Your Location
        </h1>

        <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {BADGES.map(({ Icon, label }) => (
            <li key={label} className="flex items-center gap-1 text-[10px] font-bold leading-tight text-slate-700">
              <Icon className="h-3.5 w-3.5 shrink-0 text-brand" aria-hidden />
              {label}
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={onBook}
          className="mt-3 inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-brand-bright to-brand px-4 py-2.5 text-[13px] font-extrabold text-white shadow-[0_14px_30px_-14px_rgba(249,115,22,0.9)] transition active:scale-95"
        >
          Book Now
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="pointer-events-none absolute inset-y-0 -right-1 w-[46%]">
        {imageOk ? (
          <img
            src={HERO_IMAGE}
            alt=""
            className="absolute bottom-0 right-0 h-[96%] w-full object-contain object-bottom drop-shadow-[0_10px_14px_rgba(15,23,42,0.18)]"
            fetchPriority="high"
            decoding="async"
            onError={() => setImageOk(false)}
          />
        ) : (
          <Illustration />
        )}
      </div>
    </section>
  )
}

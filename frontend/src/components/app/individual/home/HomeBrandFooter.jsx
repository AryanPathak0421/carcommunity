import { useMemo } from 'react'
import { flattenServices } from './homeBooking.js'
import workerImg from '../../../../assets/user_home_images/carcommunity_worker.webp'

/** One side of a laurel wreath; mirrored for the right side. */
function LaurelBranch({ flip = false }) {
  return (
    <svg
      viewBox="0 0 28 64"
      className={`h-14 w-6 shrink-0 text-slate-300 ${flip ? '-scale-x-100' : ''}`}
      fill="currentColor"
      aria-hidden
    >
      <path d="M22 62C10 54 5 40 7 24 8 16 11 9 15 3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <ellipse cx="17" cy="5" rx="2.6" ry="5" transform="rotate(30 17 5)" />
      <ellipse cx="9" cy="12" rx="2.6" ry="5.4" transform="rotate(-35 9 12)" />
      <ellipse cx="14" cy="16" rx="2.6" ry="5.4" transform="rotate(40 14 16)" />
      <ellipse cx="5" cy="23" rx="2.6" ry="5.6" transform="rotate(-50 5 23)" />
      <ellipse cx="12" cy="28" rx="2.6" ry="5.6" transform="rotate(50 12 28)" />
      <ellipse cx="5" cy="35" rx="2.6" ry="5.6" transform="rotate(-62 5 35)" />
      <ellipse cx="12" cy="40" rx="2.6" ry="5.6" transform="rotate(62 12 40)" />
      <ellipse cx="9" cy="47" rx="2.6" ry="5.6" transform="rotate(-72 9 47)" />
      <ellipse cx="16" cy="51" rx="2.6" ry="5.4" transform="rotate(75 16 51)" />
    </svg>
  )
}

function Stat({ label, value, caption }) {
  return (
    <div className="flex items-center justify-center gap-1">
      <LaurelBranch />
      <div className="min-w-[84px] text-center">
        <p className="text-[11px] font-medium text-slate-500">{label}</p>
        <p className="text-[22px] font-black leading-tight tracking-tight text-slate-900">{value}</p>
        <p className="text-[11px] font-medium text-slate-500">{caption}</p>
      </div>
      <LaurelBranch flip />
    </div>
  )
}

/** Line-art city skyline behind the worker photo. */
function Skyline() {
  return (
    <svg
      viewBox="0 0 360 170"
      preserveAspectRatio="xMidYMax slice"
      className="absolute inset-x-0 bottom-0 h-[170px] w-full text-slate-300"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      aria-hidden
    >
      {/* left cluster */}
      <path d="M0 170V96h26v74M6 104h4m6 0h4M6 116h4m6 0h4M6 128h4m6 0h4M6 140h4m6 0h4" />
      <path d="M26 170V58h30v112M32 68h4m6 0h4m-14 12h4m6 0h4m-14 12h4m6 0h4m-14 12h4m6 0h4m-14 12h4m6 0h4m-14 12h4m6 0h4" />
      <path d="M41 58V40M56 170V108h24v62M62 118h12M62 130h12M62 142h12M62 154h12" />
      <path d="M80 170V82l14-10 14 10v88M86 92h4m6 0h4m-14 12h4m6 0h4m-14 12h4m6 0h4m-14 12h4m6 0h4m-14 12h4m6 0h4" />
      {/* right cluster */}
      <path d="M252 170V88l16-12 16 12v82M258 98h4m8 0h4m-16 12h4m8 0h4m-16 12h4m8 0h4m-16 12h4m8 0h4m-16 12h4m8 0h4" />
      <path d="M284 170V50h30v120M290 60h4m6 0h4m-14 12h4m6 0h4m-14 12h4m6 0h4m-14 12h4m6 0h4m-14 12h4m6 0h4m-14 12h4m6 0h4m-14 12h4m6 0h4" />
      <path d="M299 50V32M314 170V100h24v70M320 110h12M320 122h12M320 134h12M320 146h12" />
      <path d="M338 170V76h22v94M343 86h4m4 0h4m-12 12h4m4 0h4m-12 12h4m4 0h4m-12 12h4m4 0h4" />
      {/* low middle rooftops */}
      <path d="M108 170v-40h30v40M222 170v-46h30v46" />
      <path d="M0 169.5h360" />
    </svg>
  )
}

/** Closing brand moment at the very bottom of the home feed. Stats come from the live catalogue. */
export function HomeBrandFooter({ tradeGroups }) {
  const serviceCount = useMemo(() => flattenServices(tradeGroups).length, [tradeGroups])
  const tradeCount = tradeGroups?.length || 0

  return (
    <section aria-label="About CarCommunity" className="relative mt-4 -mb-[72px] overflow-hidden bg-white pt-10">
      {/* scalloped divider */}
      <svg viewBox="0 0 360 10" preserveAspectRatio="none" className="absolute inset-x-0 top-0 h-2.5 w-full text-slate-100" aria-hidden>
        <path d="M0 0h360v4c-7.5 0-7.5 6-15 6s-7.5-6-15-6-7.5 6-15 6-7.5-6-15-6-7.5 6-15 6-7.5-6-15-6-7.5 6-15 6-7.5-6-15-6-7.5 6-15 6-7.5-6-15-6-7.5 6-15 6-7.5-6-15-6-7.5 6-15 6-7.5-6-15-6-7.5 6-15 6-7.5-6-15-6-7.5 6-15 6-7.5-6-15-6-7.5 6-15 6-7.5-6-15-6-7.5 6-15 6-7.5-6-15-6-7.5 6-15 6-7.5-6-15-6-7.5 6-15 6-7.5-6-15-6z" fill="currentColor" />
      </svg>

      <h2 className="mx-auto max-w-[260px] px-4 text-center text-[19px] font-extrabold leading-snug tracking-tight text-slate-800">
        Relax, your work is in professional hands
      </h2>

      {serviceCount > 0 ? (
        <div className="mt-6 grid grid-cols-2 gap-2 px-3">
          <Stat label="Book from" value={`${serviceCount}+`} caption="Services" />
          <Stat label="Experts across" value={tradeCount} caption="Trades" />
        </div>
      ) : null}

      <div className="relative mt-6 h-[300px]">
        <Skyline />
        <img
          src={workerImg}
          alt=""
          className="absolute bottom-0 left-1/2 h-[300px] w-auto max-w-none -translate-x-1/2 object-contain"
          loading="lazy"
          decoding="async"
        />
      </div>
    </section>
  )
}

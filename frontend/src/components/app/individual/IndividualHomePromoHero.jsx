import { ArrowRight, Sparkles } from 'lucide-react'

export function IndividualHomePromoHero({ onBook }) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-brand p-5 text-white shadow-[0_16px_40px_-16px_rgba(249,115,22,0.45)]">
      <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/15" aria-hidden />
      <div className="pointer-events-none absolute -bottom-10 right-8 h-24 w-24 rounded-full bg-white/10" aria-hidden />

      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/85">Verified mechanics</p>
      <h2 className="mt-1.5 max-w-[14rem] text-xl font-black leading-snug tracking-tight">
        Expert mechanics, at your doorstep
      </h2>
      <p className="mt-2 max-w-[16rem] text-sm font-medium leading-relaxed text-white/85">
        Book car and bike mechanics, instant or scheduled.
      </p>

      <button
        type="button"
        onClick={onBook}
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-brand shadow-md transition active:scale-[0.98] hover:brightness-[1.02]"
      >
        <Sparkles className="h-4 w-4" aria-hidden />
        Book now
        <ArrowRight className="h-4 w-4" aria-hidden />
      </button>
    </div>
  )
}

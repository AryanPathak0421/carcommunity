import { BadgeCheck, GraduationCap, ShieldCheck } from 'lucide-react'

const POINTS = [
  { icon: BadgeCheck, title: 'Verified', body: 'Professionals you can trust' },
  { icon: GraduationCap, title: 'Well trained', body: 'To deliver great service' },
  { icon: ShieldCheck, title: 'Safe & reliable', body: 'Efficient every single time' },
]

export function HomeTrustStrip() {
  return (
    <section aria-labelledby="home-trust-title" className="rounded-2xl bg-[#EAF6EF] p-3.5">
      <h2 id="home-trust-title" className="text-[13px] font-extrabold text-emerald-900">
        Reliable &amp; Trustworthy
        <span className="ml-1.5 font-semibold text-emerald-800/70">· verified standards</span>
      </h2>
      <ul className="mt-2.5 grid grid-cols-3 gap-2">
        {POINTS.map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex flex-col items-center rounded-xl bg-white px-1.5 py-2.5 text-center">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 text-brand">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <span className="mt-1.5 text-[11px] font-extrabold leading-tight text-slate-900">{title}</span>
            <span className="mt-0.5 text-[9.5px] font-medium leading-tight text-slate-500">{body}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

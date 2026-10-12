import { ArrowRight, CalendarClock, CarFront, Wrench } from 'lucide-react'

const MODES = [
  {
    id: 'instant',
    title: 'Instant Car Mechanic',
    desc: 'Get help right away',
    image: '/assets/images/instant-mechanic.webp',
    tone: 'bg-linear-to-br from-[#E8F8EF] to-[#CDEFDB]',
    button: 'bg-emerald-500 shadow-emerald-500/30',
    art: 'text-emerald-600',
  },
  {
    id: 'scheduled',
    title: 'Schedule Car Service',
    desc: 'Pick date & time',
    image: '/assets/images/schedule-calendar.webp',
    tone: 'bg-linear-to-br from-[#F2ECFF] to-[#E2D6FF]',
    button: 'bg-violet-500 shadow-violet-500/30',
    art: 'text-violet-600',
  },
]

export function HomeModeCards({ onPickMode }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {MODES.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => onPickMode(m.id)}
          className={`relative flex min-h-[124px] flex-col items-start justify-between overflow-hidden rounded-2xl p-3.5 text-left transition active:scale-[0.97] ${m.tone}`}
          aria-label={`${m.title}: ${m.desc}`}
        >
          <span className={`relative z-10 ${m.image ? 'max-w-[88%]' : 'max-w-[78%]'}`}>
            <span className="block text-[15px] font-black leading-tight tracking-tight text-navy">{m.title}</span>
            <span className="mt-1 block text-[11px] font-medium leading-snug text-slate-600">{m.desc}</span>
          </span>

          <span className="pointer-events-none absolute bottom-0 right-0" aria-hidden>
            {m.image ? (
              <img
                src={m.image}
                alt=""
                className={`w-auto object-contain object-bottom ${m.id === 'scheduled' ? 'mb-1.5 mr-1.5 h-[58px]' : 'h-[62px] max-w-[94px]'} drop-shadow-[0_6px_8px_rgba(15,23,42,0.18)]`}
                loading="lazy"
                decoding="async"
              />
            ) : m.id === 'instant' ? (
              <span className="relative flex">
                <CarFront className={`h-14 w-14 ${m.art}`} strokeWidth={1.5} />
                <Wrench className={`absolute -right-1 -top-1 h-6 w-6 ${m.art}`} strokeWidth={2.2} />
              </span>
            ) : (
              <CalendarClock className={`h-14 w-14 ${m.art}`} strokeWidth={1.5} />
            )}
          </span>

          <span
            className={`relative z-10 mt-3 flex h-8 w-8 items-center justify-center rounded-full text-white shadow-md ${m.button}`}
          >
            <ArrowRight className="h-4 w-4" aria-hidden />
          </span>
        </button>
      ))}
    </div>
  )
}

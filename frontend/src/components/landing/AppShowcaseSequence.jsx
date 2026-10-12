import { useEffect, useRef, useState } from 'react'
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion'
import { ArrowRight, BadgeCheck, CalendarCheck, Search, Smartphone } from 'lucide-react'
import { ButtonLink } from '../ui/ButtonLink'
import { Container } from '../ui/Container'
import { useLandingCta } from '../../hooks/useLandingCta.js'
import { useFrameSequence, useNearViewport } from '../../hooks/useFrameSequence.js'

const FRAME_COUNT = 120
const FRAME_W = 1280
const FRAME_H = 720

const frameSrc = (i) => `/assets/frames/app/frame-${String(i + 1).padStart(3, '0')}.jpg`

const steps = [
  {
    id: 'search',
    Icon: Search,
    title: 'Search the service you need',
    text: 'Pick car service, bike repair, battery, tyres or any of 60+ services and see who is available near you.',
    badge: 'Browsing mechanics near you',
  },
  {
    id: 'verify',
    Icon: BadgeCheck,
    title: 'Check the profile before you commit',
    text: 'Aadhaar-linked KYC, skill tags, day rate and past ratings sit on every mechanic card.',
    badge: 'Aadhaar verified profile',
  },
  {
    id: 'book',
    Icon: CalendarCheck,
    title: 'Confirm the booking in seconds',
    text: 'Lock the slot, share your location, and track the mechanic from assignment to arrival.',
    badge: 'Booking confirmed',
  },
]

function StepRow({ step, index, activeIndex, reduce }) {
  const active = index === activeIndex
  const done = index < activeIndex

  return (
    <motion.li
      className={`relative flex gap-3 rounded-2xl border p-3.5 transition-colors duration-500 ${
        active
          ? 'border-brand/40 bg-white shadow-[0_18px_45px_-28px_rgba(249,115,22,0.6)]'
          : 'border-slate-200/80 bg-white/60'
      }`}
      animate={reduce ? undefined : { scale: active ? 1 : 0.985, opacity: active || done ? 1 : 0.6 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-500 ${
          active ? 'bg-brand text-white' : 'bg-brand/10 text-brand'
        }`}
      >
        <step.Icon className="h-5 w-5" strokeWidth={1.9} aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-bold text-slate-900">
          <span className="mr-1.5 text-xs font-black text-brand">0{index + 1}</span>
          {step.title}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">{step.text}</p>
      </div>
    </motion.li>
  )
}

/**
 * Scroll-scrubbed sequence of a customer booking a mechanic in the
 * CarCommunity app. Frames advance with scroll while the step list beside the
 * screen highlights the matching stage.
 */
export function AppShowcaseSequence() {
  const reduce = useReducedMotion()
  const cta = useLandingCta()
  const sectionRef = useRef(null)
  const near = useNearViewport(sectionRef, '800px')
  const [activeIndex, setActiveIndex] = useState(0)

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] })
  const smooth = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 })

  const { canvasRef, draw, loaded } = useFrameSequence({
    frameSrc,
    frameCount: FRAME_COUNT,
    active: near && !reduce,
  })

  const frameIndex = useTransform(smooth, [0, 1], [0, FRAME_COUNT - 1])
  useMotionValueEvent(frameIndex, 'change', (v) => draw(v))
  useMotionValueEvent(smooth, 'change', (v) => {
    const next = v < 0.34 ? 0 : v < 0.67 ? 1 : 2
    setActiveIndex((prev) => (prev === next ? prev : next))
  })

  const cardScale = useTransform(smooth, [0, 0.14], [0.92, 1])
  const cardY = useTransform(smooth, [0, 0.14], [48, 0])
  const glowOpacity = useTransform(smooth, [0, 0.2, 0.85, 1], [0, 1, 1, 0.3])
  const progressWidth = useTransform(smooth, [0, 1], ['0%', '100%'])

  // Paint as soon as the first frames decode, before any scrolling happens.
  useEffect(() => {
    if (loaded > 0) draw(frameIndex.get())
  }, [loaded, draw, frameIndex])

  if (reduce) {
    return (
      <section id="app" className="bg-white py-20" aria-labelledby="app-heading">
        <Container className="grid gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)] lg:items-center">
          <img
            src={frameSrc(FRAME_COUNT - 1)}
            alt="Customer booking a verified mechanic in the CarCommunity app"
            className="w-full rounded-[2rem] object-cover"
          />
          <div>
            <h2 id="app-heading" className="text-3xl font-extrabold tracking-tight text-slate-900">
              Search, verify, book, all from your phone
            </h2>
            <ul className="mt-6 space-y-3">
              {steps.map((s, i) => (
                <StepRow key={s.id} step={s} index={i} activeIndex={i} reduce />
              ))}
            </ul>
          </div>
        </Container>
      </section>
    )
  }

  return (
    <section
      id="app"
      ref={sectionRef}
      className="relative bg-gradient-to-b from-white via-slate-50 to-white"
      style={{ height: '300vh' }}
      aria-labelledby="app-heading"
    >
      <div className="sticky top-0 flex h-screen items-center overflow-hidden py-16">
        <motion.div
          aria-hidden
          style={{ opacity: glowOpacity }}
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_25%_50%,rgba(249,115,22,0.14),transparent)]"
        />

        <Container className="relative grid w-full grid-cols-[minmax(0,1fr)] items-center gap-6 lg:grid-cols-[minmax(0,1.32fr)_minmax(0,0.68fr)] lg:gap-10">
          <motion.div style={{ scale: cardScale, y: cardY }} className="relative">
            <div className="relative overflow-hidden rounded-[1.75rem] bg-slate-900 shadow-[0_50px_100px_-45px_rgba(15,23,42,0.7)] ring-1 ring-slate-900/10 sm:rounded-[2rem]">
              <canvas
                ref={canvasRef}
                width={FRAME_W}
                height={FRAME_H}
                className="block aspect-video w-full"
                aria-hidden
              />
              {loaded === 0 ? (
                <img
                  src={frameSrc(0)}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  decoding="async"
                />
              ) : null}

              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-slate-950/70 to-transparent" />

              <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/45 px-3 py-1.5 text-[11px] font-semibold text-white ring-1 ring-white/20 backdrop-blur sm:left-5 sm:top-5">
                <Smartphone className="h-3.5 w-3.5 text-brand-bright" aria-hidden />
                CarCommunity app
              </div>

              <motion.div
                key={steps[activeIndex].id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45 }}
                className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-bold text-slate-900 shadow-lg backdrop-blur sm:bottom-5 sm:left-5"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
                </span>
                {steps[activeIndex].badge}
              </motion.div>

              <div className="absolute inset-x-4 bottom-0 h-[3px] overflow-hidden rounded-full bg-white/20 sm:inset-x-5">
                <motion.div
                  style={{ width: progressWidth }}
                  className="h-full bg-gradient-to-r from-brand to-brand-bright"
                />
              </div>
            </div>
          </motion.div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">In the app</p>
            <h2
              id="app-heading"
              className="mt-2 text-2xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-3xl lg:text-[2.1rem]"
            >
              Search, verify, book, right from your phone
            </h2>
            <p className="mt-3 hidden text-sm leading-relaxed text-slate-600 sm:block">
              Scroll through a real booking: the customer finds a service, opens a verified profile,
              and confirms the slot without a single phone call.
            </p>

            <ul className="mt-5 space-y-2.5">
              {steps.map((s, i) => (
                <StepRow key={s.id} step={s} index={i} activeIndex={activeIndex} reduce={reduce} />
              ))}
            </ul>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <ButtonLink href="/app" variant="primary" className="group" onClick={cta.bookMechanic}>
                Try it now
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
              </ButtonLink>
              <button
                type="button"
                onClick={cta.registerMechanic}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
              >
                Register as a Mechanic
              </button>
            </div>
          </div>
        </Container>
      </div>
    </section>
  )
}

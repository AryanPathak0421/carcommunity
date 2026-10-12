import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { ArrowRight, Car, CircleCheck, ShieldCheck, Star, Wallet, Wrench } from 'lucide-react'
import { ButtonLink } from '../ui/ButtonLink'
import { Container } from '../ui/Container'
import { useLandingCta } from '../../hooks/useLandingCta.js'
import { optimizeImage } from '../../lib/imageUrl.js'

const HERO_IMG = '/assets/images/home-hero-mechanic.webp'

const pillars = [
  { id: 'labour', label: 'Book Mechanic', hint: 'Cars & bikes', Icon: Car, href: '#labour' },
  { id: 'how', label: 'How it works', hint: 'Book in minutes', Icon: CircleCheck, href: '#how-it-works' },
  { id: 'mechanic', label: 'For Mechanics', hint: 'Earn nearby', Icon: Wrench, href: '#ecosystem' },
  { id: 'faq', label: 'FAQ', hint: 'Quick answers', Icon: ShieldCheck, href: '#faq' },
]

function FloatCard({ className, children, delay = 0, reduce }) {
  return (
    <motion.div
      className={`absolute z-20 rounded-2xl border border-white/70 bg-white/95 p-3 shadow-[0_18px_50px_-20px_rgba(15,23,42,0.35)] backdrop-blur ${className}`}
      initial={reduce ? false : { opacity: 0, y: 18, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        animate={reduce ? undefined : { y: [0, -6, 0] }}
        transition={{ duration: 4.5 + delay, repeat: Infinity, ease: 'easeInOut' }}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}

function CatalogueStrip({ groups, reduce }) {
  const items = groups.filter((g) => g.imageUrl).slice(0, 12)
  if (!items.length) return null
  const loop = [...items, ...items]

  return (
    <div className="relative mt-4 w-full max-w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 p-2 backdrop-blur" aria-hidden>
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-white to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-white to-transparent" />
      <motion.div
        className="flex w-max gap-2"
        animate={reduce ? undefined : { x: ['0%', '-50%'] }}
        transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
      >
        {loop.map((g, i) => (
          <div key={`${g._id}-${i}`} className="flex items-center gap-2 rounded-xl bg-slate-50 py-1.5 pl-1.5 pr-3 ring-1 ring-slate-200/80">
            <img
              src={optimizeImage(g.imageUrl, { w: 96, h: 96, crop: 'fill' })}
              alt=""
              className="h-8 w-8 rounded-lg object-cover"
              loading="lazy"
              decoding="async"
            />
            <span className="whitespace-nowrap text-xs font-semibold text-slate-700">{g.name}</span>
          </div>
        ))}
      </motion.div>
    </div>
  )
}

export function Hero({ groups = [], stats }) {
  const reduce = useReducedMotion()
  const cta = useLandingCta()
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const imgY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 90])
  const bgY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -60])
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, reduce ? 1 : 0.15])

  const serviceCount = stats?.services || 0
  const groupCount = stats?.groups || 0

  return (
    <section
      id="hero"
      ref={ref}
      className="relative overflow-hidden bg-[radial-gradient(ellipse_80%_60%_at_80%_-10%,rgba(249,115,22,0.16),transparent),radial-gradient(ellipse_50%_40%_at_0%_100%,rgba(251,146,60,0.12),transparent)] pt-28 pb-14 md:pt-32 md:pb-20"
      aria-labelledby="hero-heading"
    >
      <motion.div
        aria-hidden
        style={{ y: bgY }}
        className="pointer-events-none absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2248%22%20height=%2248%22%3E%3Cpath%20d=%22M0%2048h48V0%22%20fill=%22none%22%20stroke=%22%230f172a%22%20stroke-opacity=%22.05%22/%3E%3C/svg%3E')] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_30%,#000,transparent)]"
      />

      <Container className="relative grid grid-cols-[minmax(0,1fr)] gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center">
        <div className="min-w-0 space-y-7">
          <motion.div
            className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
            </span>
            Cars · Bikes · Verified mechanics · Doorstep service
          </motion.div>

          <div className="space-y-4">
            <motion.h1
              id="hero-heading"
              className="text-4xl font-extrabold leading-[1.06] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.5rem]"
              initial={reduce ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
            >
              Hire verified mechanics for your car or bike{' '}
              <span className="bg-gradient-to-r from-brand via-emerald-600 to-teal-600 bg-clip-text text-transparent">
                in minutes
              </span>
            </motion.h1>
            <motion.p
              className="max-w-xl text-lg leading-relaxed text-slate-600"
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.12 }}
            >
              Book an Aadhaar-verified mechanic for servicing, repairs, battery, tyres or breakdown help. CarCommunity keeps every step tracked, priced, and paid digitally.
            </motion.p>
          </div>

          <motion.div
            className="flex flex-col gap-3 sm:flex-row sm:items-center"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18 }}
          >
            <ButtonLink href="/app" variant="primary" className="group !px-6 !py-3.5" onClick={cta.bookMechanic}>
              Book a mechanic now
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
            </ButtonLink>
            <ButtonLink href="/app" variant="secondary" className="!px-6 !py-3.5" onClick={cta.registerMechanic}>
              <Wrench className="h-4 w-4 text-brand" aria-hidden />
              Join as a mechanic
            </ButtonLink>
          </motion.div>

          <motion.ul
            className="grid grid-cols-2 gap-2 sm:grid-cols-4"
            aria-label="What you can do on CarCommunity"
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.28 } } }}
          >
            {pillars.map((p) => (
              <motion.li
                key={p.id}
                variants={{ hidden: reduce ? {} : { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
              >
                <a
                  href={p.href}
                  className="group flex items-center gap-2.5 rounded-2xl border border-slate-200/90 bg-white px-3 py-2.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-md"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/12 text-brand transition group-hover:bg-brand group-hover:text-white">
                    <p.Icon className="h-4.5 w-4.5" strokeWidth={1.9} aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold leading-tight text-slate-900">{p.label}</span>
                    <span className="block text-[11px] text-slate-500">{p.hint}</span>
                  </span>
                </a>
              </motion.li>
            ))}
          </motion.ul>

          <motion.div
            className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-slate-600"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-brand" aria-hidden /> Aadhaar-verified mechanics
            </span>
            <span className="flex items-center gap-1.5">
              <Wallet className="h-4 w-4 text-brand" aria-hidden /> UPI &amp; card payments
            </span>
            <span className="flex items-center gap-1.5">
              <Star className="h-4 w-4 fill-brand text-brand" aria-hidden /> 4.8 average rating
            </span>
          </motion.div>
        </div>

        <motion.div
          className="relative mx-auto w-full min-w-0 max-w-[34rem]"
          style={{ opacity: fade }}
          initial={reduce ? false : { opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
        >
          <div className="relative aspect-[4/4.4] overflow-visible">
            <div className="absolute inset-x-6 top-10 bottom-0 rounded-[2.5rem] bg-gradient-to-br from-brand via-orange-500 to-amber-600 shadow-[0_40px_80px_-30px_rgba(249,115,22,0.55)]" />
            <div className="absolute inset-x-6 top-10 bottom-0 rounded-[2.5rem] bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2232%22%20height=%2232%22%3E%3Ccircle%20cx=%222%22%20cy=%222%22%20r=%221.2%22%20fill=%22%23ffffff%22%20fill-opacity=%22.16%22/%3E%3C/svg%3E')]" />
            <motion.img
              src={HERO_IMG}
              alt="CarCommunity mechanic with tools"
              className="absolute bottom-0 left-1/2 z-10 h-[96%] w-auto -translate-x-1/2 object-contain drop-shadow-[0_30px_40px_rgba(0,0,0,0.35)]"
              style={{ y: imgY }}
              fetchPriority="high"
              decoding="async"
            />

            <FloatCard className="left-0 top-16 w-44" delay={0.45} reduce={reduce}>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand/15 text-brand">
                  <CircleCheck className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <p className="text-[11px] font-semibold text-slate-500">Booking confirmed</p>
                  <p className="text-xs font-bold text-slate-900">Car service · 9:00 AM</p>
                </div>
              </div>
            </FloatCard>

            <FloatCard className="right-0 top-36 w-40" delay={0.6} reduce={reduce}>
              <p className="text-[11px] font-semibold text-slate-500">Live catalogue</p>
              <p className="text-lg font-black leading-tight text-slate-900">
                {serviceCount ? `${serviceCount}+` : '60+'} <span className="text-xs font-semibold text-slate-500">services</span>
              </p>
              <p className="text-[11px] text-slate-500">across {groupCount || 9} categories</p>
            </FloatCard>

            <FloatCard className="bottom-8 left-2 w-48" delay={0.75} reduce={reduce}>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <Wallet className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <p className="text-[11px] font-semibold text-slate-500">Payout released</p>
                  <p className="text-xs font-bold text-slate-900">₹ 4,800 · UPI</p>
                </div>
              </div>
            </FloatCard>
          </div>

          <CatalogueStrip groups={groups} reduce={reduce} />
        </motion.div>
      </Container>
    </section>
  )
}

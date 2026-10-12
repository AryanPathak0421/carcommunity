import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Layers } from 'lucide-react'
import { ButtonLink } from '../ui/ButtonLink'
import { Container } from '../ui/Container'
import { Reveal } from '../ui/Reveal'
import { SectionHeading } from '../ui/SectionHeading'
import { services as staticServices } from '../../data/landingContent'
import { useLandingCta } from '../../hooks/useLandingCta.js'
import { optimizeImage } from '../../lib/imageUrl.js'

const FALLBACK_TILES = [
  'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800&q=70',
  'https://images.unsplash.com/photo-1530046339160-ce3e530c7d2f?w=800&q=70',
  'https://images.unsplash.com/photo-1625047509248-ec889cbff17f?w=800&q=70',
  'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&q=70',
  'https://images.unsplash.com/photo-1632823471565-1ecdf5c6da05?w=800&q=70',
  'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=800&q=70',
]

function formatInr(n) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)
}

function SkeletonCard() {
  return (
    <div className="h-72 animate-pulse rounded-[1.75rem] bg-slate-100 ring-1 ring-slate-200/70" aria-hidden />
  )
}

function GroupCard({ group, index, onHire, reduce }) {
  const image = group.imageUrl || FALLBACK_TILES[index % FALLBACK_TILES.length]
  const subs = group.categories.slice(0, 3)
  const extra = group.categories.length - subs.length

  return (
    <motion.a
      href="/app"
      onClick={onHire}
      className="group relative flex h-72 flex-col justify-end overflow-hidden rounded-[1.75rem] bg-slate-900 text-white shadow-sm ring-1 ring-slate-200/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      whileHover={reduce ? undefined : { y: -6 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      aria-label={`Book ${group.name} mechanics`}
    >
      <motion.img
        src={optimizeImage(image, { w: 720, h: 560, crop: 'fill' })}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
        decoding="async"
        whileHover={reduce ? undefined : { scale: 1.08 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/55 to-slate-950/5 transition group-hover:via-slate-950/65" />

      <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
        <Layers className="h-3.5 w-3.5" aria-hidden />
        {group.serviceCount} services
      </div>

      <div className="relative p-5">
        <h3 className="text-xl font-extrabold tracking-tight">{group.name}</h3>
        {group.description ? (
          <p className="mt-1 line-clamp-2 text-xs text-zinc-300">{group.description}</p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {subs.map((c) => (
            <span key={c._id} className="rounded-lg bg-white/12 px-2 py-0.5 text-[11px] font-medium text-zinc-100 ring-1 ring-white/15">
              {c.name}
            </span>
          ))}
          {extra > 0 ? (
            <span className="rounded-lg bg-white/12 px-2 py-0.5 text-[11px] font-medium text-zinc-200 ring-1 ring-white/15">
              +{extra} more
            </span>
          ) : null}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-white/15 pt-3">
          <p className="text-xs text-zinc-300">
            {group.minPrice ? (
              <>
                From <span className="text-base font-extrabold text-white">₹{formatInr(group.minPrice)}</span>
                
              </>
            ) : (
              'Quote on request'
            )}
          </p>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-bright">
            Book <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" aria-hidden />
          </span>
        </div>
      </div>
    </motion.a>
  )
}

export function LabourCategoriesSection({ groups = [], loading = false }) {
  const reduce = useReducedMotion()
  const cta = useLandingCta()

  const serviceCount = groups.reduce((a, g) => a + g.serviceCount, 0)
  const popular = groups
    .flatMap((g) => g.categories.flatMap((c) => c.services))
    .filter((s) => s.basePrice > 0)
    .sort((a, b) => a.basePrice - b.basePrice)
    .filter((s, i, arr) => arr.findIndex((x) => x.name === s.name) === i)
    .slice(0, 16)
  const chips = popular.length
    ? popular
    : staticServices.map((s) => ({ _id: s.id, name: s.title, basePrice: s.priceFrom }))

  return (
    <section id="labour" className="relative bg-slate-50/70 py-20" aria-labelledby="labour-heading">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_10%_0%,rgba(249,115,22,0.10),transparent)]" />
      <Container className="relative">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <SectionHeading
            titleId="labour-heading"
            eyebrow="Book a mechanic"
            title={
              groups.length
                ? `${groups.length} categories, ${serviceCount}+ services, one booking flow`
                : 'Every service your car or bike needs'
            }
            subtitle="These tiles come straight from our live catalogue. Pick a category, choose the exact service, set your slot, and we match a verified mechanic near your location."
          />
          <Reveal className="mb-10 md:mb-14">
            <ButtonLink href="/app" variant="primary" onClick={cta.bookMechanic} className="group">
              Start booking
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
            </ButtonLink>
          </Reveal>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {loading && !groups.length
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            : groups.map((g, i) => (
                <Reveal key={g._id} delay={(i % 3) * 0.06}>
                  <GroupCard group={g} index={i} onHire={cta.bookMechanic} reduce={reduce} />
                </Reveal>
              ))}
        </div>

        <Reveal className="mt-12">
          <div className="rounded-[1.75rem] border border-slate-200/90 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Popular services</p>
                <p className="mt-1 text-sm text-slate-600">Indicative starting rates. Final quote depends on your vehicle and city.</p>
              </div>
              <button
                type="button"
                onClick={cta.registerMechanic}
                className="rounded-xl border border-brand/30 bg-brand-muted/60 px-4 py-2 text-xs font-semibold text-slate-800 transition hover:bg-brand-muted"
              >
                I’m a mechanic, register free
              </button>
            </div>
            <ul className="mt-5 flex flex-wrap gap-2">
              {chips.map((s, i) => (
                <motion.li
                  key={s._id}
                  // Animate transform only — if the entrance never runs (throttled
                  // tab, blocked observer) the chip is still readable, never blank.
                  initial={reduce ? false : { y: 10, scale: 0.96 }}
                  whileInView={{ y: 0, scale: 1 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.35, delay: Math.min(i * 0.03, 0.4) }}
                  className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-1.5 pl-3 pr-1.5 text-xs font-medium text-slate-700"
                >
                  {s.name}
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-brand ring-1 ring-brand/20">
                    ₹{formatInr(s.basePrice)}
                  </span>
                </motion.li>
              ))}
            </ul>
          </div>
        </Reveal>
      </Container>
    </section>
  )
}

import { CarCommunityLogo } from '../../components/brand/CarCommunityLogo.jsx'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Car, Menu, Wrench, X } from 'lucide-react'
import { ButtonLink } from '../ui/ButtonLink'
import { Container } from '../ui/Container'
import { useLandingCta } from '../../hooks/useLandingCta.js'

const links = [
  { href: '#labour', label: 'Book Mechanic', Icon: Car },
  { href: '#ecosystem', label: 'For Mechanics', Icon: Wrench },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#faq', label: 'FAQ' },
]

const SECTION_IDS = ['labour', 'ecosystem', 'how-it-works', 'faq']

export function Navbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [active, setActive] = useState('')
  const reduce = useReducedMotion()
  const cta = useLandingCta()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined
    const els = SECTION_IDS.map((id) => document.getElementById(id)).filter(Boolean)
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible[0]) setActive(visible[0].target.id)
      },
      { rootMargin: '-40% 0px -50% 0px', threshold: [0, 0.2, 0.5] },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const linkClass = (href) => {
    const isActive = active && href === `#${active}`
    if (isActive) return 'bg-brand/10 text-brand'
    return scrolled
      ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      : 'text-slate-700 hover:bg-white/70 hover:text-slate-900'
  }

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background,box-shadow] duration-300 ${
        scrolled
          ? 'border-b border-slate-200/90 bg-white/90 shadow-sm shadow-slate-200/50 backdrop-blur-xl'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <Container className="flex h-16 items-center justify-between gap-4 md:h-[4.25rem]">
        <a
          href="#hero"
          className="flex items-center gap-2 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <CarCommunityLogo size="md" />
        </a>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition ${linkClass(l.href)}`}
              aria-current={active && l.href === `#${active}` ? 'true' : undefined}
            >
              {l.Icon ? <l.Icon className="h-4 w-4 opacity-80" aria-hidden /> : null}
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Link to="/b2c/auth" className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
            Sign in
          </Link>
          <ButtonLink href="/app" variant="primary" className="!py-2.5 !text-xs" onClick={cta.bookMechanic}>
            Book a Mechanic
          </ButtonLink>
        </div>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-sm lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          <span className="sr-only">Toggle menu</span>
        </button>
      </Container>

      <AnimatePresence>
        {open ? (
          <motion.div
            id="mobile-menu"
            className="max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-slate-200 bg-white shadow-lg backdrop-blur-xl lg:hidden"
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28 }}
          >
            <Container className="flex flex-col gap-1 py-4 pb-6">
              {links.map((l, i) => (
                <motion.a
                  key={l.href}
                  href={l.href}
                  className="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() => setOpen(false)}
                  initial={reduce ? false : { opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.04 * i }}
                >
                  {l.Icon ? <l.Icon className="h-4 w-4 text-brand" aria-hidden /> : null}
                  {l.label}
                </motion.a>
              ))}
              <div className="mt-3 flex flex-col gap-2">
                <ButtonLink
                  href="/app"
                  variant="primary"
                  onClick={(e) => {
                    setOpen(false)
                    cta.bookMechanic(e)
                  }}
                >
                  Book a Mechanic
                </ButtonLink>
                <ButtonLink
                  href="/app"
                  variant="secondary"
                  onClick={(e) => {
                    setOpen(false)
                    cta.registerMechanic(e)
                  }}
                >
                  Register as a Mechanic
                </ButtonLink>
                <div className="grid grid-cols-1 gap-2">
                  <Link
                    to="/b2c/auth"
                    className="rounded-2xl border border-slate-200 py-3 text-center text-sm font-semibold text-slate-800"
                    onClick={() => setOpen(false)}
                  >
                    Sign in
                  </Link>
                </div>
              </div>
            </Container>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  )
}

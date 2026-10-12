import { motion, useReducedMotion, useScroll, useSpring } from 'framer-motion'

/** Thin brand-coloured bar at the very top that fills as the page scrolls. */
export function ScrollProgress() {
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.3 })

  if (reduce) return null

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px] origin-left bg-gradient-to-r from-brand via-brand-bright to-emerald-400"
      style={{ scaleX }}
    />
  )
}

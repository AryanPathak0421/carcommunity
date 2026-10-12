import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { GlassPanel } from '../ui/GlassPanel.jsx'
import { ChevronRight } from 'lucide-react'

export function AppPressableLinkCard({ to, title, subtitle, icon: Icon, delay = 0 }) {
  const reduce = useReducedMotion()

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link to={to} className="group block outline-none">
        <GlassPanel className="relative overflow-hidden p-4 transition duration-300 hover:border-brand/30 hover:shadow-[0_20px_50px_-20px_rgba(249,115,22,0.22)] active:scale-[0.985]">
          <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-brand/10 blur-2xl transition duration-500 group-hover:bg-brand/18" />
          <div className="relative flex items-start gap-3.5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand/20 via-white to-brand-muted/90 text-brand shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] ring-1 ring-brand/20 transition duration-300 group-hover:ring-brand/35">
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1 pt-0.5">
              <span className="flex items-start justify-between gap-2">
                <span className="text-[15px] font-semibold leading-snug text-slate-900">{title}</span>
                <ChevronRight
                  className="mt-0.5 h-5 w-5 shrink-0 text-slate-300 transition duration-300 group-hover:translate-x-0.5 group-hover:text-brand"
                  aria-hidden
                />
              </span>
              {subtitle ? (
                <span className="mt-1 block text-xs leading-relaxed text-slate-500">{subtitle}</span>
              ) : null}
            </span>
          </div>
        </GlassPanel>
      </Link>
    </motion.div>
  )
}

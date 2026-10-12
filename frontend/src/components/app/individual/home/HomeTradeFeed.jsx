import { useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { getGroupImageUrl } from '../../../../lib/labourCategoryDisplay.js'
import { HomeSectionHeader } from './HomeSectionHeader.jsx'
import { HomeSkillGrid } from './HomeSkillGrid.jsx'
import { HomeServiceCard } from './HomeServiceCard.jsx'
import { flattenServices, formatRupees } from './homeBooking.js'

/** Feed shown when a trade tab is selected: that trade's skills, then all its services. */
export function HomeTradeFeed({ group, onOpenSkill, onBook }) {
  const reduce = useReducedMotion()
  const items = useMemo(() => flattenServices([group]), [group])
  const minPrice = useMemo(() => {
    const prices = items.map((x) => Number(x.service.basePrice)).filter((n) => n > 0)
    return prices.length ? Math.min(...prices) : null
  }, [items])

  return (
    <motion.div
      key={String(group._id)}
      className="space-y-6"
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
    >
      <div className="relative h-28 overflow-hidden rounded-2xl">
        <img src={getGroupImageUrl(group)} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-linear-to-r from-slate-950/85 via-slate-950/50 to-transparent" />
        <div className="relative flex h-full flex-col justify-center px-4 text-white">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/70">Trade</p>
          <h2 className="text-xl font-black tracking-tight">{group.name}</h2>
          <p className="mt-0.5 text-[12px] font-medium text-white/85">
            {(group.categories || []).length} skills · {items.length} services
            {minPrice ? ` · from ${formatRupees(minPrice)}` : ''}
          </p>
        </div>
      </div>

      <section aria-label={`${group.name} skills`}>
        <HomeSectionHeader title="Choose a skill" />
        <HomeSkillGrid group={group} skills={group.categories || []} onOpenSkill={onOpenSkill} />
      </section>

      {items.length ? (
        <section aria-label={`${group.name} services`}>
          <HomeSectionHeader title="All services" subtitle={`${items.length} options · tap BOOK to start in seconds`} />
          <div className="grid grid-cols-3 gap-x-3 gap-y-5">
            {items.map((item, i) => (
              <HomeServiceCard key={String(item.service._id)} item={item} index={i} onBook={onBook} />
            ))}
          </div>
        </section>
      ) : null}
    </motion.div>
  )
}

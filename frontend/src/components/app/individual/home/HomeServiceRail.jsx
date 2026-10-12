import { HomeSectionHeader } from './HomeSectionHeader.jsx'
import { HomeServiceCard } from './HomeServiceCard.jsx'

export function HomeServiceRail({ title, subtitle, items, onBook, actionLabel, onAction }) {
  if (!items?.length) return null
  return (
    <section aria-label={title}>
      <HomeSectionHeader title={title} subtitle={subtitle} actionLabel={actionLabel} onAction={onAction} />
      <div className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item, i) => (
          <HomeServiceCard
            key={String(item.service._id)}
            item={item}
            index={i}
            onBook={onBook}
            className="w-[128px] shrink-0 snap-start"
          />
        ))}
      </div>
    </section>
  )
}

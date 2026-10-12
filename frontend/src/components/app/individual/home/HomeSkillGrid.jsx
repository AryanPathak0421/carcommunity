import { ArrowRight } from 'lucide-react'
import { getCategoryImageUrl } from '../../../../lib/labourCategoryDisplay.js'
import { fallbackArtDataUrl } from '../../../../lib/fallbackArt.js'
import { pastelAt } from './homeTheme.js'
import { flattenServices } from './homeBooking.js'

const COLS = 4

/**
 * Services used to top up the last row so every row has four tiles. Prefers
 * services whose photo isn't already on screen in this grid.
 */
function fillerServices(group, skills, count) {
  if (count <= 0) return []
  const used = new Set(skills.map((cat) => getCategoryImageUrl(cat)))
  const withImage = flattenServices([group]).map((item) => ({
    item,
    image: getCategoryImageUrl({ name: item.service.name, imageUrl: item.service.iconUrl || item.cat.imageUrl }),
  }))
  const fresh = withImage.filter((x) => !used.has(x.image))
  const rest = withImage.filter((x) => used.has(x.image))
  const picked = []
  for (const x of [...fresh, ...rest]) {
    if (picked.length >= count) break
    if (fresh.includes(x)) used.add(x.image)
    picked.push(x)
  }
  return picked
}

function Tile({ onClick, tone, image, label, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-center text-center transition active:scale-95"
    >
      <span className={`relative block aspect-square w-full overflow-hidden rounded-2xl ${tone}`}>
        {image ? (
          <img
            src={image}
            alt=""
            className={`h-full w-full transition duration-300 group-hover:scale-105 ${
              String(image).startsWith('/assets/') ? 'object-contain p-1.5 drop-shadow-[0_6px_6px_rgba(15,23,42,0.15)]' : 'object-cover'
            }`}
            loading="lazy"
            decoding="async"
            onError={(e) => {
              e.currentTarget.onerror = null
              e.currentTarget.src = fallbackArtDataUrl(label)
            }}
          />
        ) : null}
        {children}
      </span>
      <span className="mt-1.5 line-clamp-2 text-[11px] font-semibold leading-tight text-slate-800">{label}</span>
    </button>
  )
}

/**
 * Zepto-style 4-column tile grid: soft tile with the photo, label underneath.
 * With `onBook`, a short last row is topped up with the trade's services, then a
 * "See all" tile (via `onSeeAll`) if services run out.
 */
export function HomeSkillGrid({ group, skills, onOpenSkill, onBook, onSeeAll, colorOffset = 0 }) {
  const gap = onBook ? (COLS - (skills.length % COLS)) % COLS : 0
  const fillers = fillerServices(group, skills, gap)
  const showSeeAll = onSeeAll && gap > fillers.length

  return (
    <div className="grid grid-cols-4 gap-x-2.5 gap-y-3.5">
      {skills.map((cat, i) => (
        <Tile
          key={String(cat._id)}
          onClick={() => onOpenSkill(group, cat)}
          tone={pastelAt(i + colorOffset)}
          image={getCategoryImageUrl(cat)}
          label={cat.name}
        />
      ))}
      {fillers.map(({ item, image }, i) => (
        <Tile
          key={String(item.service._id)}
          onClick={() => onBook(item)}
          tone={pastelAt(skills.length + i + colorOffset)}
          image={image}
          label={item.service.name}
        >
          <span className="absolute bottom-1 right-1 rounded-md bg-white/95 px-1.5 py-0.5 text-[9px] font-extrabold tracking-wide text-brand shadow-sm">
            BOOK
          </span>
        </Tile>
      ))}
      {showSeeAll ? (
        <Tile onClick={onSeeAll} tone="bg-brand-muted" label="See all">
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-brand shadow-sm">
              <ArrowRight className="h-4 w-4" aria-hidden />
            </span>
          </span>
        </Tile>
      ) : null}
    </div>
  )
}

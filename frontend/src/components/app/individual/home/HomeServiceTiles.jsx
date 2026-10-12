import { serviceVisual } from './homeTheme.js'
import { fallbackArtDataUrl } from '../../../../lib/fallbackArt.js'

/**
 * Four-up grid of soft coloured tiles: icon (or the admin's photo when one is set) + label.
 * @param {{ items: { key: string, label: string, imageUrl?: string, onClick: () => void }[] }} props
 */
export function HomeServiceTiles({ items }) {
  return (
    <div className="grid grid-cols-4 gap-2.5">
      {items.map((item, i) => {
        const { Icon, tone, fg } = serviceVisual(item.label, i)
        return (
          <button
            key={item.key}
            type="button"
            onClick={item.onClick}
            className="group flex flex-col items-center text-center transition active:scale-95"
          >
            <span className={`relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl ${tone}`}>
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt=""
                  className="h-full w-full object-contain p-1.5 drop-shadow-[0_6px_6px_rgba(15,23,42,0.15)]"
                  decoding="async"
                  onError={(e) => {
                    e.currentTarget.onerror = null
                    e.currentTarget.src = fallbackArtDataUrl(item.label)
                  }}
                />
              ) : (
                <Icon className={`h-9 w-9 ${fg} transition group-hover:scale-110`} strokeWidth={1.9} aria-hidden />
              )}
            </span>
            <span className="mt-1.5 line-clamp-2 text-[11px] font-bold leading-tight text-slate-800">{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}

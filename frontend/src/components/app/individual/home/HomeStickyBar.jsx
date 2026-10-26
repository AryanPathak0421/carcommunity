import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { LayoutGrid, Mic, Search } from 'lucide-react'
import { serviceVisual } from './homeTheme.js'
import { useVoiceSearch } from './useVoiceSearch.js'

function RotatingHint({ words }) {
  const reduce = useReducedMotion()
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (words.length < 2) return undefined
    const id = window.setInterval(() => setIndex((i) => (i + 1) % words.length), 2600)
    return () => window.clearInterval(id)
  }, [words.length])

  const word = words[index % Math.max(words.length, 1)] || 'Car Mechanic'

  return (
    <span className="relative inline-flex min-w-0 overflow-hidden">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={word}
          className="truncate font-semibold text-slate-500"
          initial={reduce ? false : { y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduce ? undefined : { y: -12, opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          &lsquo;{word}&rsquo;
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

/**
 * Search + service chips; sticks to the top once the header scrolls away.
 * `activeId` null means the "All" feed.
 */
export function HomeStickyBar({ tradeGroups, activeId, onSelect, searchHints, onSearch, onVoiceSearch }) {
  const tabsRef = useRef(null)
  const voice = useVoiceSearch(onVoiceSearch)
  // Voice search is switched off for now (mic not accurate). To bring it back:
  // const showMic = voice.supported && Boolean(onVoiceSearch)
  const showMic = false

  useEffect(() => {
    const el = tabsRef.current?.querySelector('[aria-selected="true"]')
    el?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [activeId])

  const tabs = [{ _id: null, name: 'All' }, ...tradeGroups]

  return (
    <div className="sticky top-0 z-30 bg-white px-4 pb-1 pt-1.5 shadow-[0_6px_14px_-12px_rgba(15,23,42,0.35)]">
      <div
        className={`flex h-12 w-full items-center rounded-2xl bg-white text-sm shadow-sm ring-2 transition ${
          voice.listening ? 'ring-red-300' : 'ring-orange-200'
        }`}
      >
        <button
          type="button"
          onClick={onSearch}
          className="flex h-full min-w-0 flex-1 items-center gap-2.5 pl-3.5 text-left transition active:scale-[0.99]"
          aria-label="Search for a service"
        >
          <Search className="h-[18px] w-[18px] shrink-0 text-brand" aria-hidden />
          {voice.listening ? (
            <span className="font-semibold text-red-500">Listening… speak now</span>
          ) : (
            <span className="flex min-w-0 items-center gap-1 text-slate-400">
              <span className="shrink-0">Search for</span>
              <RotatingHint words={searchHints} />
            </span>
          )}
        </button>
        {showMic ? (
          <button
            type="button"
            onClick={voice.start}
            className={`mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${
              voice.listening ? 'animate-pulse bg-red-500 text-white' : 'text-brand hover:bg-orange-50'
            }`}
            aria-label={voice.listening ? 'Stop voice search' : 'Search by voice'}
            aria-pressed={voice.listening}
          >
            <Mic className="h-5 w-5" aria-hidden />
          </button>
        ) : null}
      </div>
      {voice.error ? <p className="mt-1 px-1 text-[11px] font-semibold text-red-500">{voice.error}</p> : null}

      <div
        ref={tabsRef}
        className="-mx-4 mt-2.5 flex gap-1 overflow-x-auto px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Services"
      >
        {tabs.map((g, i) => {
          const id = g._id == null ? null : String(g._id)
          const active = id === activeId
          const { Icon, tone, fg } = serviceVisual(g.name, i)
          return (
            <button
              key={id ?? 'all'}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSelect(id)}
              className="relative flex w-[66px] shrink-0 flex-col items-center gap-1 px-0.5 pb-2 pt-1"
            >
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-2xl transition ${
                  id == null
                    ? `bg-brand text-white shadow-md shadow-brand/30 ${active ? 'ring-2 ring-orange-200' : ''}`
                    : `${tone} ${active ? 'ring-2 ring-brand' : ''}`
                }`}
              >
                {id == null ? (
                  <LayoutGrid className="h-5 w-5" aria-hidden />
                ) : (
                  <Icon className={`h-6 w-6 ${fg}`} strokeWidth={2} aria-hidden />
                )}
              </span>
              <span
                className={`line-clamp-1 w-full text-center text-[11px] leading-tight ${
                  active ? 'font-extrabold text-brand' : 'font-semibold text-slate-700'
                }`}
              >
                {g.name}
              </span>
              {active ? (
                <motion.span
                  layoutId="home-trade-tab-underline"
                  className="absolute inset-x-3 bottom-0 h-[3px] rounded-t-full bg-brand"
                />
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

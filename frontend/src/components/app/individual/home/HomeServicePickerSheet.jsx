import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, CalendarClock, ChevronRight, Search, X, Zap } from 'lucide-react'
import {
  AppBottomSheetBackdrop,
  AppBottomSheetChrome,
  AppBottomSheetPanel,
} from '../../../app-ui/feedback/AppBottomSheet.jsx'
import { appSpring } from '../../appMotion.js'
import { getCategoryImageUrl, getGroupImageUrl } from '../../../../lib/labourCategoryDisplay.js'
import { flattenServices, formatRupees } from './homeBooking.js'

const MODE_COPY = {
  instant: { title: 'Instant booking', subtitle: 'We match an available mechanic near you', icon: Zap },
  scheduled: { title: 'Schedule a booking', subtitle: 'Choose your date & time after picking a service', icon: CalendarClock },
}

function activeServices(cat) {
  return (cat?.services || []).filter((s) => s.isActive !== false)
}

function lowestPrice(services) {
  const prices = services.map((s) => Number(s.basePrice)).filter((n) => n > 0)
  return prices.length ? Math.min(...prices) : null
}

function Row({ image, title, meta, price, onClick }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-3 bg-white px-3 py-2.5 text-left transition hover:bg-slate-50 active:bg-slate-100"
      >
        <img src={image} alt="" className="h-12 w-12 shrink-0 rounded-xl bg-slate-100 object-cover" loading="lazy" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-slate-900">{title}</span>
          {meta ? <span className="block truncate text-[11px] font-medium text-slate-500">{meta}</span> : null}
        </span>
        {price ? (
          <span className="shrink-0 text-right">
            <span className="block text-[9px] font-bold uppercase text-slate-400">From</span>
            <span className="block text-sm font-extrabold text-slate-900">{formatRupees(price)}</span>
          </span>
        ) : null}
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" aria-hidden />
      </button>
    </li>
  )
}

function List({ children }) {
  return <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl ring-1 ring-slate-100">{children}</ul>
}

/** Instant/Schedule picker: category → skill → service, with search as a shortcut. */
export function HomeServicePickerSheet({ open, mode, tradeGroups, onClose, onPick }) {
  const reduce = useReducedMotion()
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState(null)
  const [skill, setSkill] = useState(null)
  const copy = MODE_COPY[mode] || MODE_COPY.instant
  const ModeIcon = copy.icon

  const groups = useMemo(
    () => (tradeGroups || []).filter((g) => (g.categories || []).some((c) => activeServices(c).length > 0)),
    [tradeGroups],
  )

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return flattenServices(groups).filter(({ group: g, cat, service }) =>
      [service.name, cat.name, g.name].some((v) => String(v || '').toLowerCase().includes(q)),
    )
  }, [groups, query])

  useEffect(() => {
    if (!open) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const reset = () => {
    setQuery('')
    setGroup(null)
    setSkill(null)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const pick = (item) => {
    reset()
    onPick(item)
  }

  const chooseGroup = (g) => {
    setGroup(g)
    const skills = (g.categories || []).filter((c) => activeServices(c).length > 0)
    setSkill(skills.length === 1 ? skills[0] : null)
  }

  const goBack = () => {
    const skills = (group?.categories || []).filter((c) => activeServices(c).length > 0)
    if (skill && skills.length > 1) setSkill(null)
    else {
      setSkill(null)
      setGroup(null)
    }
  }

  const searching = query.trim().length > 0
  const step = searching ? 'search' : skill ? 'service' : group ? 'skill' : 'category'
  const stepTitle = { category: 'Choose a category', skill: 'Choose a skill', service: 'Choose a service' }[step]

  let body
  if (step === 'search') {
    body = searchResults.length ? (
      <List>
        {searchResults.map((item) => (
          <Row
            key={String(item.service._id)}
            image={getCategoryImageUrl({ name: item.service.name, imageUrl: item.service.iconUrl || item.cat.imageUrl })}
            title={item.service.name}
            meta={`${item.group.name} › ${item.cat.name}`}
            price={Number(item.service.basePrice) > 0 ? item.service.basePrice : null}
            onClick={() => pick(item)}
          />
        ))}
      </List>
    ) : (
      <p className="py-10 text-center text-sm font-medium text-slate-500">No services match &ldquo;{query}&rdquo;</p>
    )
  } else if (step === 'category') {
    body = (
      <div className="grid grid-cols-3 gap-2.5">
        {groups.map((g) => {
          const skillCount = (g.categories || []).filter((c) => activeServices(c).length > 0).length
          return (
            <button
              key={String(g._id)}
              type="button"
              onClick={() => chooseGroup(g)}
              className="flex flex-col items-center text-center transition active:scale-95"
            >
              <span className="block aspect-square w-full overflow-hidden rounded-2xl bg-slate-100">
                <img src={getGroupImageUrl(g)} alt="" className="h-full w-full object-cover" loading="lazy" />
              </span>
              <span className="mt-1.5 line-clamp-2 text-[12px] font-bold leading-tight text-slate-900">{g.name}</span>
              <span className="text-[10px] font-medium text-slate-500">
                {skillCount} {skillCount === 1 ? 'skill' : 'skills'}
              </span>
            </button>
          )
        })}
      </div>
    )
  } else if (step === 'skill') {
    body = (
      <List>
        {(group.categories || [])
          .filter((c) => activeServices(c).length > 0)
          .map((c) => {
            const services = activeServices(c)
            return (
              <Row
                key={String(c._id)}
                image={getCategoryImageUrl(c)}
                title={c.name}
                meta={`${services.length} ${services.length === 1 ? 'service' : 'services'}`}
                price={lowestPrice(services)}
                onClick={() => setSkill(c)}
              />
            )
          })}
      </List>
    )
  } else {
    body = (
      <List>
        {activeServices(skill).map((service) => (
          <Row
            key={String(service._id)}
            image={getCategoryImageUrl({ name: service.name, imageUrl: service.iconUrl || skill.imageUrl })}
            title={service.name}
            meta={service.description || skill.name}
            price={Number(service.basePrice) > 0 ? service.basePrice : null}
            onClick={() => pick({ group, cat: skill, service })}
          />
        ))}
      </List>
    )
  }

  const sheet = (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[210] flex items-end justify-center sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <AppBottomSheetBackdrop onClose={handleClose} />
          <motion.div
            className="relative z-10 w-full max-w-md"
            initial={reduce ? false : { y: 40 }}
            animate={{ y: 0 }}
            exit={reduce ? undefined : { y: 28 }}
            transition={reduce ? { duration: 0.2 } : appSpring}
          >
            <AppBottomSheetPanel>
              <AppBottomSheetChrome
                onClose={handleClose}
                title={
                  <h2 className="flex items-center gap-2 text-base font-black text-slate-900">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand">
                      <ModeIcon className="h-4 w-4" aria-hidden />
                    </span>
                    {copy.title}
                  </h2>
                }
                subtitle={<p className="mt-1 text-xs text-slate-500">{copy.subtitle}</p>}
              />

              <div className="border-b border-slate-100 px-4 py-3">
                <label className="flex h-11 items-center gap-2 rounded-xl bg-slate-100 px-3 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand/30">
                  <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search car service, bike repair, battery…"
                    className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
                    autoComplete="off"
                    enterKeyHint="search"
                  />
                  {query ? (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-slate-600"
                      aria-label="Clear search"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  ) : null}
                </label>
              </div>

              <div className="flex items-center gap-2 px-4 pb-1 pt-3">
                {step === 'skill' || step === 'service' ? (
                  <button
                    type="button"
                    onClick={goBack}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-slate-200"
                    aria-label="Back"
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden />
                  </button>
                ) : null}
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {step === 'search' ? `${searchResults.length} results` : stepTitle}
                  </p>
                  {group && step !== 'search' ? (
                    <p className="truncate text-sm font-extrabold text-slate-900">
                      {group.name}
                      {skill ? <span className="text-slate-400"> › </span> : null}
                      {skill ? skill.name : null}
                    </p>
                  ) : null}
                </div>
              </div>

              <div
                key={`${step}-${group?._id ?? ''}-${skill?._id ?? ''}`}
                className="max-h-[52vh] overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2"
              >
                {body}
              </div>
            </AppBottomSheetPanel>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )

  if (typeof document === 'undefined') return null
  return createPortal(sheet, document.body)
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2, Menu, Mic, Search, SearchX, X, Clock, TrendingUp } from 'lucide-react'
import {
  flattenTradeSubcategories,
  getCategoryImageUrl,
  getGroupImageUrl,
} from '../../../lib/labourCategoryDisplay.js'
import { readBookingDraft } from '../../../lib/individualBookingDraft.js'
import { BookingTypeSheet } from '../booking/BookingTypeSheet.jsx'
import { flattenServices, formatRupees, startServiceBooking } from './home/homeBooking.js'
import { useVoiceSearch } from './home/useVoiceSearch.js'
import { fallbackArtDataUrl } from '../../../lib/fallbackArt.js'

const ALL_TILE_IMAGE = fallbackArtDataUrl('Car')

const POPULAR_SEARCHES = ['Car service', 'Bike service', 'Battery', 'Tyre', 'Brake repair', 'AC repair', 'Puncture', 'Oil change']

function SwiggyGroupTile({ label, imageSrc, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="lc-swiggy-cat-tile shrink-0 snap-start"
      data-active={active ? 'true' : 'false'}
    >
      <span className="lc-swiggy-cat-img">
        <img
          src={imageSrc}
          alt=""
          className="lc-img-reveal h-full w-full object-cover scale-[1.15]"
          loading="lazy"
          decoding="async"
          onLoad={(e) => e.currentTarget.classList.add('lc-img-loaded')}
        />
      </span>
      <span className="lc-swiggy-cat-label">{label}</span>
    </button>
  )
}

function SkillCard({ category, active, showGroupName, onClick }) {
  const img = getCategoryImageUrl(category)
  return (
    <button
      type="button"
      onClick={onClick}
      className="lc-search-skill-card"
      data-active={active ? 'true' : 'false'}
    >
      <div className="relative aspect-[4/3] bg-white overflow-hidden">
        <img src={img} alt="" className="h-full w-full object-cover scale-[1.15] transition-transform duration-300 group-hover:scale-[1.20]" loading="lazy" decoding="async" />
      </div>
      <div className="px-2.5 py-2">
        <p className="line-clamp-2 text-xs font-bold leading-snug text-slate-900">{category.name}</p>
        {showGroupName && category.groupName ? (
          <p className="mt-0.5 line-clamp-1 text-[10px] font-medium text-slate-500">{category.groupName}</p>
        ) : null}
      </div>
    </button>
  )
}

/** Bold the part of `text` that matches the query. */
function Highlight({ text, query }) {
  const q = query.trim()
  const i = q ? String(text).toLowerCase().indexOf(q.toLowerCase()) : -1
  if (i < 0) return text
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-transparent font-black text-brand">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  )
}

function ServiceResult({ item, query, onBook }) {
  const { group, cat, service } = item
  const mins = Number(service.estimatedDurationMins)
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-2.5 ring-1 ring-slate-200/70">
      <img
        src={getCategoryImageUrl({ name: service.name, imageUrl: service.iconUrl || cat.imageUrl })}
        alt=""
        className="h-14 w-14 shrink-0 rounded-xl object-cover"
        loading="lazy"
        decoding="async"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-slate-900">
          <Highlight text={service.name} query={query} />
        </p>
        <p className="truncate text-[11px] font-medium text-slate-500">
          {cat.name} · {group.name}
        </p>
        <p className="mt-0.5 flex items-center gap-2 text-[11px]">
          {Number(service.basePrice) > 0 ? (
            <span className="font-black text-slate-900">
              {formatRupees(service.basePrice)} <span className="font-semibold text-slate-400">onwards</span>
            </span>
          ) : null}
          {mins > 0 ? (
            <span className="flex items-center gap-0.5 text-slate-500">
              <Clock className="h-3 w-3" aria-hidden />~{mins >= 60 ? `${Math.round(mins / 60)} hr` : `${mins} min`}
            </span>
          ) : null}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onBook(item)}
        className="shrink-0 rounded-lg border border-brand bg-white px-3 py-1.5 text-[11px] font-black tracking-wide text-brand transition hover:bg-brand hover:text-white active:scale-95"
        aria-label={`Book ${service.name}`}
      >
        BOOK
      </button>
    </div>
  )
}

/**
 * Full Search tab — find a service (book directly) or a skill (opens its page).
 */
export function IndividualCategorySearchPanel({ tradeGroups, groupsLoading }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const searchRef = useRef(null)

  // `?q=` pre-fills the box (e.g. a voice search started on the home screen).
  const [query, setQuery] = useState(() => searchParams.get('q') || '')
  const [groupId, setGroupId] = useState(searchParams.get('groupId') || null)
  const [categoryId, setCategoryId] = useState(null)
  const [bookItem, setBookItem] = useState(null)

  const voice = useVoiceSearch(setQuery)

  const allCategories = useMemo(() => flattenTradeSubcategories(tradeGroups), [tradeGroups])
  const allServices = useMemo(() => flattenServices(tradeGroups), [tradeGroups])

  const selectedGroup = useMemo(() => {
    if (!groupId) return null
    return tradeGroups.find((g) => String(g._id) === groupId) ?? null
  }, [tradeGroups, groupId])

  const q = query.trim().toLowerCase()
  const isSearching = q.length > 0

  const filteredCategories = useMemo(() => {
    if (!q) return allCategories
    return allCategories.filter(
      (c) =>
        String(c.name || '').toLowerCase().includes(q) ||
        String(c.subtitle || '').toLowerCase().includes(q) ||
        String(c.groupName || '').toLowerCase().includes(q) ||
        String(c.serviceNames || '').toLowerCase().includes(q),
    )
  }, [allCategories, q])

  /** Services whose own name matches first, then ones matched by skill/trade name. */
  const filteredServices = useMemo(() => {
    if (!q) return []
    const byName = []
    const byContext = []
    for (const item of allServices) {
      if (String(item.service.name || '').toLowerCase().includes(q)) byName.push(item)
      else if (
        String(item.cat.name || '').toLowerCase().includes(q) ||
        String(item.group.name || '').toLowerCase().includes(q)
      )
        byContext.push(item)
    }
    return [...byName, ...byContext].slice(0, 12)
  }, [allServices, q])

  useEffect(() => {
    const draft = readBookingDraft()
    queueMicrotask(() => {
      const urlGroupId = searchParams.get('groupId')
      if (urlGroupId) {
        setGroupId(urlGroupId)
      } else if (draft?.groupId) {
        setGroupId(String(draft.groupId))
      }
      if (draft?.categoryId && !urlGroupId) setCategoryId(String(draft.categoryId))
    })
  }, [searchParams])

  useEffect(() => {
    const t = window.setTimeout(() => searchRef.current?.focus(), 200)
    return () => window.clearTimeout(t)
  }, [])

  const pickGroup = (gid) => {
    setGroupId(gid == null ? null : String(gid))
    setCategoryId(null)
    if (!gid) setQuery('')
  }

  const pickCategory = (cat) => {
    navigate(`/app/sub-category/${cat._id}`, { state: { cat } })
  }

  const renderCategoryGrid = (items, showGroupName) => (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
      {items.map((c) => (
        <SkillCard
          key={`${c.groupId}-${c._id}`}
          category={c}
          active={categoryId === String(c._id)}
          showGroupName={showGroupName}
          onClick={() => pickCategory(c)}
        />
      ))}
    </div>
  )

  const noResults = isSearching && filteredCategories.length === 0 && filteredServices.length === 0

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 bg-brand px-4 pb-3.5 pt-[max(0.75rem,0px)] shadow-[0_8px_20px_-14px_rgba(15,23,42,0.6)]">
        <div className="mb-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('lc-open-app-drawer'))}
            className="-ml-1.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white transition hover:bg-white/10"
            aria-label="Menu"
          >
            <Menu className="h-6 w-6" aria-hidden />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-black leading-tight tracking-tight text-white">Search</h1>
            <p className="truncate text-xs font-medium text-white/80">Find a verified mechanic for your car or bike</p>
          </div>
        </div>
        <div
          className={`flex h-12 items-center gap-2.5 rounded-xl bg-white pl-3.5 pr-1.5 shadow-sm ring-2 transition ${
            voice.listening ? 'ring-red-300' : 'ring-transparent focus-within:ring-white/60'
          }`}
        >
          <Search className="h-5 w-5 shrink-0 text-brand" aria-hidden />
          <input
            ref={searchRef}
            id="lc-search-input"
            type="text"
            inputMode="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={voice.listening ? 'Listening… speak now' : 'Search car service, bike repair, battery…'}
            autoComplete="off"
            enterKeyHint="search"
            aria-label="Search services and skills"
            className="h-full min-w-0 flex-1 bg-transparent text-[15px] font-medium text-slate-900 outline-none placeholder:text-slate-400"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery('')
                searchRef.current?.focus()
              }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
          {voice.supported ? (
            <button
              type="button"
              onClick={voice.start}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${
                voice.listening ? 'animate-pulse bg-red-500 text-white' : 'bg-emerald-50 text-brand hover:bg-emerald-100'
              }`}
              aria-label={voice.listening ? 'Stop voice search' : 'Search by voice'}
              aria-pressed={voice.listening}
            >
              <Mic className="h-[18px] w-[18px]" aria-hidden />
            </button>
          ) : null}
        </div>
        {voice.error ? <p className="mt-1.5 px-1 text-[11px] font-semibold text-white">{voice.error}</p> : null}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-10 pt-4">
        {groupsLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-brand" aria-hidden />
          </div>
        ) : null}

        {!groupsLoading && !isSearching ? (
          <>
            <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-900">
              <TrendingUp className="h-4 w-4 text-brand" aria-hidden />
              Popular searches
            </p>
            <div className="mb-5 flex flex-wrap gap-2">
              {POPULAR_SEARCHES.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => setQuery(term)}
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:ring-brand/40 active:scale-95"
                >
                  {term}
                </button>
              ))}
            </div>

            <p className="mb-2 text-sm font-bold text-slate-900">Main categories</p>
            <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 scrollbar-none [&::-webkit-scrollbar]:hidden">
              <SwiggyGroupTile
                label="All"
                imageSrc={ALL_TILE_IMAGE}
                active={groupId == null}
                onClick={() => pickGroup(null)}
              />
              {tradeGroups.map((g) => (
                <SwiggyGroupTile
                  key={String(g._id)}
                  label={g.name}
                  imageSrc={getGroupImageUrl(g)}
                  active={groupId === String(g._id)}
                  onClick={() => pickGroup(String(g._id))}
                />
              ))}
            </div>
          </>
        ) : null}

        {!groupsLoading && isSearching && !noResults ? (
          <p className="text-xs font-semibold text-slate-500">
            {filteredServices.length} service{filteredServices.length === 1 ? '' : 's'} · {filteredCategories.length}{' '}
            skill{filteredCategories.length === 1 ? '' : 's'} for “{query.trim()}”
          </p>
        ) : null}

        {!groupsLoading && filteredServices.length > 0 ? (
          <section className="mt-3">
            <p className="mb-2 text-sm font-extrabold text-slate-900">Services</p>
            <div className="space-y-2">
              {filteredServices.map((item) => (
                <ServiceResult key={String(item.service._id)} item={item} query={query} onBook={setBookItem} />
              ))}
            </div>
          </section>
        ) : null}

        {!groupsLoading && isSearching && filteredCategories.length > 0 ? (
          <section className="mt-6">
            <p className="mb-2 text-sm font-extrabold text-slate-900">Skills</p>
            {renderCategoryGrid(filteredCategories, true)}
          </section>
        ) : null}

        {!groupsLoading && noResults ? (
          <div className="mt-12 flex flex-col items-center text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <SearchX className="h-6 w-6 text-slate-400" aria-hidden />
            </span>
            <p className="mt-3 text-sm font-bold text-slate-800">No results for “{query.trim()}”</p>
            <p className="mt-1 text-xs text-slate-500">Try a different word, like one of these:</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {POPULAR_SEARCHES.slice(0, 5).map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => setQuery(term)}
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {!groupsLoading && !isSearching && selectedGroup ? (
          <section className="mt-6">
            <p className="mb-2 text-sm font-bold text-slate-900">{selectedGroup.name}</p>
            {renderCategoryGrid(
              (selectedGroup.categories || []).map((c) => ({
                ...c,
                groupId: selectedGroup._id,
                groupName: selectedGroup.name,
              })),
              false,
            )}
          </section>
        ) : null}

        {!groupsLoading && !isSearching && !groupId ? (
          <div className="mt-6 space-y-5">
            {tradeGroups.map((g) => {
              const cats = (g.categories || []).map((c) => ({
                ...c,
                groupId: g._id,
                groupName: g.name,
              }))
              if (!cats.length) return null
              return (
                <section key={String(g._id)}>
                  <p className="mb-2 text-sm font-bold text-slate-900">{g.name}</p>
                  {renderCategoryGrid(cats, false)}
                </section>
              )
            })}
            {allCategories.length === 0 ? (
              <p className="text-center text-sm text-slate-500">No skills available yet.</p>
            ) : null}
          </div>
        ) : null}

        {!groupsLoading && !isSearching && groupId && selectedGroup && !(selectedGroup.categories?.length) ? (
          <p className="mt-12 text-center text-sm text-slate-500">No skills in this area yet.</p>
        ) : null}
      </div>

      <BookingTypeSheet
        open={Boolean(bookItem)}
        onClose={() => setBookItem(null)}
        value={null}
        categoryLabel={bookItem?.service?.name}
        onSelect={(bookingType) => {
          const item = bookItem
          setBookItem(null)
          if (item) startServiceBooking(navigate, { ...item, bookingType })
        }}
      />
    </div>
  )
}

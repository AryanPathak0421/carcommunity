import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight, Shield } from 'lucide-react'
import { fetchLabourCategoriesGrouped } from '../../../api/labourCategoriesApi.js'
import { IndividualHomeHeroCarousel } from '../../../components/app/individual/IndividualHomeHeroCarousel.jsx'
import { IndividualHomeWorkerCarousel } from '../../../components/app/individual/IndividualHomeWorkerCarousel.jsx'
import { HomeStickyBar } from '../../../components/app/individual/home/HomeStickyBar.jsx'
import { HomeModeCards } from '../../../components/app/individual/home/HomeModeCards.jsx'
import { HomeHeroBanner } from '../../../components/app/individual/home/HomeHeroBanner.jsx'
import { HomeServiceTiles } from '../../../components/app/individual/home/HomeServiceTiles.jsx'
import { HomeSectionHeader } from '../../../components/app/individual/home/HomeSectionHeader.jsx'
import { HomeSkillGrid } from '../../../components/app/individual/home/HomeSkillGrid.jsx'
import { HomeTradeFeed } from '../../../components/app/individual/home/HomeTradeFeed.jsx'
import { HomeTrustStrip } from '../../../components/app/individual/home/HomeTrustStrip.jsx'
import { HomeServicePickerSheet } from '../../../components/app/individual/home/HomeServicePickerSheet.jsx'
import { HomeActiveBookingCard } from '../../../components/app/individual/home/HomeActiveBookingCard.jsx'
import { HomeReferCard } from '../../../components/app/individual/home/HomeReferCard.jsx'
import { HomeFaqSection } from '../../../components/app/individual/home/HomeFaqSection.jsx'
import { HomeInlineBanner } from '../../../components/app/individual/home/HomeInlineBanner.jsx'
import { HomeBrandFooter } from '../../../components/app/individual/home/HomeBrandFooter.jsx'
import { fetchActiveBanners } from '../../../api/bannersApi.js'
import { startServiceBooking, subcategoryRouteState } from '../../../components/app/individual/home/homeBooking.js'
import { BookingTypeSheet } from '../../../components/app/booking/BookingTypeSheet.jsx'
import { fetchDiscoverLabour, fetchDiscoverLabours } from '../../../api/discoverLaboursApi.js'
import { bookingsApi } from '../../../api/bookingsApi.js'
import { referralsApi } from '../../../api/referralsApi.js'
import { ApiError } from '../../../api/http.js'
import { userSubscriptionApi } from '../../../api/userSubscriptionApi.js'
import { useAuth } from '../../../hooks/useAuth.js'
import { LabourPublicDetailSheet } from '../labour/LabourPublicDetailSheet.jsx'
import { enrichDiscoverLabourUi } from '../../../lib/discoverLabourDummyUi.js'
import { getCategoryImageUrl, getGroupImageUrl } from '../../../lib/labourCategoryDisplay.js'

const ACTIVE_STATUSES = ['CREATED', 'BROADCASTING', 'ACCEPTED', 'ASSIGNED', 'EN_ROUTE', 'STARTED']

/** Trade-section indexes followed by an in-feed promo banner (alternating with the rails at 3, 5). */
const INLINE_BANNER_AFTER = [2, 4]

/** `?book=` values (e.g. from an admin banner link `/app?book=scheduled`) that open the service picker. */
const BOOK_MODES = ['instant', 'scheduled']

function formatBookingDay(serviceDate) {
  if (!serviceDate) return 'Soon'
  const d = new Date(serviceDate)
  if (Number.isNaN(d.getTime())) return 'Soon'

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diffDays = Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/**
 * Up to `perTrade` bookable services from each trade, so rails span the whole
 * catalogue. Services without their own photo inherit their skill's photo, so
 * a service whose image was already picked is skipped for the next one.
 */
function pickAcrossTrades(tradeGroups, perTrade, limit) {
  const picks = []
  const usedImages = new Set()
  for (const group of tradeGroups) {
    let taken = 0
    for (const cat of group.categories || []) {
      for (const service of cat.services || []) {
        if (service.isActive === false) continue
        const image = getCategoryImageUrl({ name: service.name, imageUrl: service.iconUrl || cat.imageUrl })
        if (usedImages.has(image)) continue
        usedImages.add(image)
        picks.push({ group, cat, service })
        taken += 1
        if (taken >= perTrade) break
      }
      if (taken >= perTrade) break
    }
    if (picks.length >= limit) break
  }
  return picks.slice(0, limit)
}

function ActivePlanCard({ subscription, onManage }) {
  const [open, setOpen] = useState(false)
  const planName = subscription.snapshotPlanDetails?.name || subscription.plan?.name
  const allowed = subscription.snapshotPlanDetails?.allowedBookings || subscription.plan?.allowedBookings || 1
  const used = subscription.bookingsUsed || 0
  const progress = Math.min(100, Math.round((used / allowed) * 100))

  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-100">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between p-3.5">
        <span className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <Shield className="h-5 w-5" aria-hidden />
          </span>
          <span className="text-left">
            <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">Active plan</span>
            <span className="line-clamp-1 block text-sm font-black leading-tight text-slate-900">{planName}</span>
          </span>
        </span>
        <span className="flex items-center gap-2">
          <span className="text-sm font-black tracking-tighter text-brand">
            {used}
            <span className="text-xs font-bold text-slate-300">/{allowed}</span>
          </span>
          <ChevronRight className={`h-5 w-5 text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`} aria-hidden />
        </span>
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 pb-4"
          >
            <div className="border-t border-slate-100 pt-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Bookings used</span>
                <span className="text-[10px] font-bold text-brand">{progress}%</span>
              </div>
              <div className="relative mb-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="absolute left-0 top-0 h-full rounded-full bg-brand" style={{ width: `${progress}%` }} />
              </div>
              <button
                type="button"
                onClick={onManage}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-50 py-2.5 text-xs font-bold text-slate-700 ring-1 ring-slate-100 transition hover:bg-slate-100"
              >
                Manage subscription
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" aria-hidden />
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

/**
 * Home for homeowners / individuals, laid out like a quick-commerce app:
 * sticky search + trade tabs, then a mixed feed of tile grids and rails.
 */
export function IndividualHomeScreen({ user }) {
  const navigate = useNavigate()
  const { isGuest } = useAuth()
  const signedIn = Boolean(user) && !isGuest

  const [tradeGroups, setTradeGroups] = useState([])
  const [groupsLoading, setGroupsLoading] = useState(true)
  const [activeTradeId, setActiveTradeId] = useState(null)

  const [labours, setLabours] = useState([])
  const [laboursLoading, setLaboursLoading] = useState(true)
  const [laboursErr, setLaboursErr] = useState('')
  const [detailId, setDetailId] = useState(null)
  const [detailLabour, setDetailLabour] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const [bookings, setBookings] = useState([])
  const [activeSubscription, setActiveSubscription] = useState(null)
  const [referralReward, setReferralReward] = useState(0)

  const [banners, setBanners] = useState([])
  const [bannersLoading, setBannersLoading] = useState(true)

  const [chosenPickerMode, setChosenPickerMode] = useState(null)
  const [quickBookItem, setQuickBookItem] = useState(null)

  const activeTrade = tradeGroups.find((g) => String(g._id) === activeTradeId) || null

  const searchHints = useMemo(() => {
    const names = pickAcrossTrades(tradeGroups, 1, 8).map((x) => x.service.name)
    return names.length ? names : ['Car service', 'Bike service', 'Battery', 'Tyres']
  }, [tradeGroups])

  // "Popular services": one tile per headline service type, in the order customers expect them.
  const popularGroups = useMemo(() => {
    const wanted = [/car repair|repair/i, /tyre|puncture|wheel/i, /battery|electrical/i, /roadside|tow/i]
    const nonBike = tradeGroups.filter((g) => !/bike/i.test(g.name))
    const picked = []
    for (const re of wanted) {
      const g = nonBike.find((x) => re.test(x.name) && !picked.includes(x))
      if (g) picked.push(g)
    }
    for (const g of nonBike) {
      if (picked.length >= 4) break
      if (!picked.includes(g)) picked.push(g)
    }
    return picked.slice(0, 4)
  }, [tradeGroups])

  const bikeGroup = useMemo(() => tradeGroups.find((g) => /bike/i.test(g.name)) || null, [tradeGroups])

  // Deep link into the picker: admin banners can point at /app?book=instant|scheduled.
  const [searchParams, setSearchParams] = useSearchParams()
  const bookParam = searchParams.get('book')
  const pickerMode = chosenPickerMode || (BOOK_MODES.includes(bookParam) ? bookParam : null)
  const setPickerMode = useCallback(
    (mode) => {
      setChosenPickerMode(mode)
      if (bookParam) {
        const next = new URLSearchParams(searchParams)
        next.delete('book')
        setSearchParams(next, { replace: true })
      }
    },
    [bookParam, searchParams, setSearchParams],
  )

  const ongoingBookings = useMemo(() => {
    return [...bookings]
      .filter((b) => ACTIVE_STATUSES.includes(b?.status))
      .sort((a, b) => String(b?.updatedAt || b?.createdAt || '').localeCompare(String(a?.updatedAt || a?.createdAt || '')))
  }, [bookings])

  const nearbyLabours = useMemo(() => {
    const enriched = labours.map((l) => ({ ...l, _ui: enrichDiscoverLabourUi(l) }))
    const available = enriched.filter((l) => String(l?._ui?.workHoursLabel || '').toLowerCase().includes('available'))
    return (available.length ? available : enriched).slice(0, 5)
  }, [labours])

  useEffect(() => {
    let cancelled = false
    fetchLabourCategoriesGrouped()
      .then((res) => {
        if (cancelled) return
        const groups = res.data?.groups ?? []
        const tradeKind = res.data?.meta?.tradeKind ?? 'trade'
        setTradeGroups(groups.filter((g) => g.kind === tradeKind && (g.categories?.length ?? 0) > 0))
      })
      .catch(() => {
        if (!cancelled) setTradeGroups([])
      })
      .finally(() => {
        if (!cancelled) setGroupsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchDiscoverLabours({ limit: 36 })
      .then((res) => {
        if (!cancelled) setLabours(res.data?.items ?? [])
      })
      .catch((e) => {
        if (!cancelled) setLaboursErr(e instanceof ApiError ? e.message : 'Could not load mechanics.')
      })
      .finally(() => {
        if (!cancelled) setLaboursLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      window.dispatchEvent(new CustomEvent('lc-individual-home-layout'))
    })
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    if (!signedIn) return undefined
    let cancelled = false
    bookingsApi
      .getMyBookings()
      .then((res) => {
        if (!cancelled) setBookings(res.data?.bookings || [])
      })
      .catch(() => {})
    userSubscriptionApi
      .getMySubscription()
      .then((res) => {
        if (!cancelled && res?.data?.subscription) setActiveSubscription(res.data.subscription)
      })
      .catch(() => {})
    referralsApi
      .getMyReferrals()
      .then((res) => {
        const cfg = res?.data?.config
        if (!cancelled && cfg?.isActive && cfg.referrerReward > 0) setReferralReward(cfg.referrerReward)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [signedIn])

  useEffect(() => {
    let cancelled = false
    fetchActiveBanners()
      .then((res) => {
        if (!cancelled) setBanners(res.data?.banners ?? [])
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setBannersLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const selectTrade = useCallback((id) => {
    setActiveTradeId(id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const goSearch = useCallback(() => navigate('/app/search'), [navigate])
  const goVoiceSearch = useCallback(
    (text) => navigate(`/app/search?q=${encodeURIComponent(text)}`),
    [navigate],
  )
  const openSkill = useCallback(
    (group, cat) => navigate(`/app/sub-category/${cat._id}`, { state: subcategoryRouteState(group, cat) }),
    [navigate],
  )

  const openDetail = useCallback((id) => {
    setDetailId(id)
    setDetailLabour(null)
    setDetailLoading(true)
    fetchDiscoverLabour(id)
      .then((res) => setDetailLabour(res.data?.labour ?? null))
      .catch(() => setDetailLabour(null))
      .finally(() => setDetailLoading(false))
  }, [])

  const closeDetail = useCallback(() => {
    setDetailId(null)
    setDetailLabour(null)
    setDetailLoading(false)
  }, [])

  const tradeSection = (group, index) => (
    <section aria-label={group.name}>
      <HomeSectionHeader
        title={group.name}
        subtitle={group.subtitle || undefined}
        actionLabel="See all"
        onAction={() => selectTrade(String(group._id))}
      />
      <HomeSkillGrid
        group={group}
        skills={group.categories || []}
        onOpenSkill={openSkill}
        onBook={setQuickBookItem}
        onSeeAll={() => selectTrade(String(group._id))}
        colorOffset={index}
      />
    </section>
  )

  return (
    <div className="-mx-4 flex flex-col bg-white pb-8" aria-label="Home">
      <HomeStickyBar
        tradeGroups={tradeGroups}
        activeId={activeTradeId}
        onSelect={selectTrade}
        searchHints={searchHints}
        onSearch={goSearch}
        onVoiceSearch={goVoiceSearch}
      />

      <div className="space-y-6 px-4 pt-4">
        {activeTrade ? (
          <HomeTradeFeed group={activeTrade} onOpenSkill={openSkill} onBook={setQuickBookItem} />
        ) : (
          <>
            <HomeHeroBanner onBook={() => setPickerMode('instant')} />

            <HomeModeCards onPickMode={setPickerMode} />

            {ongoingBookings.length > 0 || activeSubscription ? (
              <div className="space-y-3">
                {ongoingBookings.length > 0 ? (
                  <HomeActiveBookingCard
                    booking={ongoingBookings[0]}
                    extraCount={ongoingBookings.length - 1}
                    formatDay={formatBookingDay}
                  />
                ) : null}
                {activeSubscription ? (
                  <ActivePlanCard subscription={activeSubscription} onManage={() => navigate('/app/subscriptions')} />
                ) : null}
              </div>
            ) : null}

            <IndividualHomeHeroCarousel banners={banners} loading={bannersLoading} />

            {groupsLoading ? (
              <div className="grid grid-cols-4 gap-2.5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="aspect-square animate-pulse rounded-2xl bg-slate-100" />
                ))}
              </div>
            ) : null}

            {popularGroups.length > 0 ? (
              <section aria-label="Popular services">
                <HomeSectionHeader title="Popular Services" actionLabel="See all" onAction={() => navigate('/app/services')} />
                <HomeServiceTiles
                  items={popularGroups.map((g) => ({
                    key: String(g._id),
                    label: g.name,
                    imageUrl: getGroupImageUrl(g),
                    onClick: () => selectTrade(String(g._id)),
                  }))}
                />
              </section>
            ) : null}

            {bikeGroup && (bikeGroup.categories?.length ?? 0) > 0 ? (
              <section aria-label="Bike services">
                <HomeSectionHeader
                  title="Bike Services"
                  actionLabel="See all"
                  onAction={() => selectTrade(String(bikeGroup._id))}
                />
                <HomeServiceTiles
                  items={bikeGroup.categories.slice(0, 4).map((cat) => ({
                    key: String(cat._id),
                    label: cat.name,
                    imageUrl: getCategoryImageUrl(cat),
                    onClick: () => openSkill(bikeGroup, cat),
                  }))}
                />
              </section>
            ) : null}

            {tradeGroups.length > 0 ? (
              <HomeSectionHeader title="All services" subtitle="Everything your car or bike might need" />
            ) : null}

            {tradeGroups.map((group, index) => (
              <Fragment key={String(group._id)}>
                {tradeSection(group, index)}
                {INLINE_BANNER_AFTER.indexOf(index) !== -1 && INLINE_BANNER_AFTER.indexOf(index) < banners.length ? (
                  <HomeInlineBanner
                    banner={banners[(INLINE_BANNER_AFTER.indexOf(index) + 2) % banners.length]}
                  />
                ) : null}
                {index === 3 ? <HomeTrustStrip /> : null}
              </Fragment>
            ))}

            <IndividualHomeWorkerCarousel
              title="Top mechanics near you"
              workers={nearbyLabours}
              loading={laboursLoading}
              error={laboursErr}
              emptyAction="Find a skill"
              onSelectWorker={openDetail}
              onEmptyAction={goSearch}
            />

            {signedIn ? <HomeReferCard reward={referralReward} /> : null}

            <HomeFaqSection />
          </>
        )}
      </div>

      {activeTrade ? null : <HomeBrandFooter tradeGroups={tradeGroups} />}

      <HomeServicePickerSheet
        open={Boolean(pickerMode)}
        mode={pickerMode}
        tradeGroups={tradeGroups}
        onClose={() => setPickerMode(null)}
        onPick={(item) => {
          const mode = pickerMode
          setPickerMode(null)
          startServiceBooking(navigate, { ...item, bookingType: mode })
        }}
      />

      <BookingTypeSheet
        open={Boolean(quickBookItem)}
        onClose={() => setQuickBookItem(null)}
        value={null}
        categoryLabel={quickBookItem?.service?.name}
        onSelect={(bookingType) => {
          const item = quickBookItem
          setQuickBookItem(null)
          if (item) startServiceBooking(navigate, { ...item, bookingType })
        }}
      />

      <AnimatePresence>
        {detailId ? (
          <LabourPublicDetailSheet labour={detailLabour} loading={detailLoading} onClose={closeDetail} />
        ) : null}
      </AnimatePresence>
    </div>
  )
}

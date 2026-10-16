import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useDispatch } from 'react-redux'
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  HardHat,
  Layers,
  Sparkles,
  Wrench,
} from 'lucide-react'
import { AppSearchBar } from '../app-ui/inputs/AppSearchBar.jsx'
import { AppPrimaryButton } from '../app/AppPrimaryButton.jsx'
import { GlassPanel } from '../ui/GlassPanel.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import { setUser } from '../../store/slices/authSlice.js'
import { fetchLabourCategoriesGrouped } from '../../api/labourCategoriesApi.js'
import { updateMyLabourCategories } from '../../api/userLabourApi.js'
import { ApiError } from '../../api/http.js'

/** A mechanic can offer up to this many services (matching still works per service). */
export const MAX_SKILLS = 15

function categoryId(c) {
  return String(c._id)
}

function SelectRow({ label, subtitle, selected, onToggle, pricing, onUpdatePrice }) {
  return (
    <div className={`flex w-full flex-col overflow-hidden rounded-2xl border transition ${
      selected
        ? 'border-brand/30 bg-linear-to-r from-brand/10 via-white to-orange-50/50 shadow-sm ring-2 ring-brand/20'
        : 'border-slate-200/90 bg-white hover:border-brand/20'
    }`}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-3.5 py-3.5 text-left active:scale-[0.99]"
      >
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
            selected ? 'border-brand bg-brand text-white' : 'border-slate-200 bg-white'
          }`}
          aria-hidden
        >
          {selected ? <Check className="h-4 w-4 stroke-[3]" /> : null}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-slate-900">{label}</span>
          {subtitle ? <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{subtitle}</span> : null}
        </span>
      </button>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-brand/10 bg-white/50 px-3.5 py-3"
          >
            <p className="mb-2 text-xs font-bold text-slate-600">Set your price range for this service</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">₹</span>
                <input
                  type="number"
                  min="0"
                  value={pricing?.minPrice || ''}
                  onChange={(e) => onUpdatePrice('minPrice', e.target.value)}
                  placeholder="Min price"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-7 pr-3 text-sm font-bold text-slate-800 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>
              <span className="text-sm font-bold text-slate-400">to</span>
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">₹</span>
                <input
                  type="number"
                  min="0"
                  value={pricing?.maxPrice || ''}
                  onChange={(e) => onUpdatePrice('maxPrice', e.target.value)}
                  placeholder="Max price"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-7 pr-3 text-sm font-bold text-slate-800 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function AreaCard({ group, selectedInGroup, onOpen }) {
  const initial = group.name.replace(/[^a-zA-Z0-9]/g, '').charAt(0).toUpperCase() || '?'
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-stretch gap-3 rounded-2xl border border-slate-200/90 bg-white p-3.5 text-left shadow-sm transition hover:border-brand/25 hover:shadow-md active:scale-[0.99]"
    >
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-brand/15 via-emerald-50 to-white text-lg font-black text-brand ring-1 ring-brand/15">
        {initial}
      </div>
      <div className="min-w-0 flex-1 py-0.5">
        <p className="font-bold leading-snug text-slate-900">{group.name}</p>
        {group.description ? (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{group.description}</p>
        ) : null}
        <p className="mt-2 text-[11px] font-semibold text-brand">
          {(group.categories || []).length} skills · tap to choose
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end justify-center gap-1 pl-1">
        {selectedInGroup > 0 ? (
          <span className="rounded-full bg-brand px-2.5 py-0.5 text-[11px] font-black text-white">
            {selectedInGroup}
          </span>
        ) : (
          <ChevronRight className="h-5 w-5 text-slate-300" aria-hidden />
        )}
      </div>
    </button>
  )
}

/**
 * Mechanic skill picker (onboarding or profile update).
 * @param {{ variant?: 'auth' | 'app', onComplete?: () => void }} props
 */
export function LabourCategorySetup({ variant = 'app', onComplete }) {
  const reduce = useReducedMotion()
  const dispatch = useDispatch()
  const { user } = useAuth()

  const [groups, setGroups] = useState([])
  const [meta, setMeta] = useState({ profileKind: 'profile', tradeKind: 'trade' })
  const [selected, setSelected] = useState(() => new Map())
  const [hubSearch, setHubSearch] = useState('')
  const [roleSearch, setRoleSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [optionalOpen, setOptionalOpen] = useState(false)
  const [step, setStep] = useState('areas')
  const [activeGroupId, setActiveGroupId] = useState(null)

  const tradeCategoryIds = useMemo(() => {
    const s = new Set()
    for (const g of groups) {
      if (g.kind !== meta.tradeKind) continue
      for (const c of g.categories || []) s.add(categoryId(c))
    }
    return s
  }, [groups, meta.tradeKind])

  const tradeSelectedCount = useMemo(
    () => [...selected.keys()].filter((id) => tradeCategoryIds.has(id)).length,
    [selected, tradeCategoryIds],
  )

  const hasTradeSelected = tradeSelectedCount > 0
  const hasExistingCategories = (user?.labourProfile?.subcategoryIds?.length ?? user?.labourProfile?.categoryIds?.length ?? 0) > 0
  const profileGroups = useMemo(() => groups.filter((g) => g.kind === meta.profileKind), [groups, meta.profileKind])
  const tradeGroups = useMemo(() => groups.filter((g) => g.kind === meta.tradeKind), [groups, meta.tradeKind])

  const activeGroup = useMemo(
    () => tradeGroups.find((g) => String(g._id) === String(activeGroupId)),
    [tradeGroups, activeGroupId],
  )

  const countInGroup = useCallback(
    (g) => {
      let n = 0
      for (const c of g.categories || []) {
        if (selected.has(categoryId(c))) n += 1
      }
      return n
    },
    [selected],
  )

  const areasWithPicks = useMemo(() => tradeGroups.filter((g) => countInGroup(g) > 0).length, [tradeGroups, countInGroup])

  const filteredTradeGroups = useMemo(() => {
    const q = hubSearch.trim().toLowerCase()
    if (!q) return tradeGroups
    return tradeGroups.filter((g) => {
      if (g.name.toLowerCase().includes(q) || (g.description || '').toLowerCase().includes(q)) return true
      return (g.categories || []).some((c) => `${c.name} ${c.subtitle || ''}`.toLowerCase().includes(q))
    })
  }, [tradeGroups, hubSearch])

  const syncFromUser = useCallback(() => {
    let raw = user?.labourProfile?.serviceIds
    if (!raw || raw.length === 0) {
      raw = user?.labourProfile?.subcategoryIds
      if (!raw || raw.length === 0) raw = user?.labourProfile?.categoryIds ?? []
    }
    const m = new Map()
    const pricings = user?.labourProfile?.servicePricing || []
    
    raw.forEach((x) => {
      const id = typeof x === 'object' && x?._id ? String(x._id) : String(x)
      // First try to match by serviceId, fallback to subcategoryId for legacy profiles
      const pricing = pricings.find(p => String(p.serviceId) === id || String(p.subcategoryId) === id)
      m.set(id, { minPrice: pricing?.minPrice || '', maxPrice: pricing?.maxPrice || '' })
    })
    setSelected(m)
  }, [user])

  useEffect(() => {
    queueMicrotask(() => syncFromUser())
  }, [syncFromUser])

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) setLoading(true)
    })
    fetchLabourCategoriesGrouped()
      .then((res) => {
        if (!cancelled) {
          const rawGroups = res.data?.groups ?? []
          
          // Flatten subcategories to services for Labour UI
          const modifiedGroups = rawGroups.map(group => {
            const flattenedServices = []
            for (const sub of group.categories || []) {
              for (const srv of sub.services || []) {
                flattenedServices.push({
                  _id: srv._id,
                  name: srv.name,
                  subtitle: sub.name, // Display subcategory name as subtitle
                  subcategoryId: sub._id
                })
              }
            }
            return {
              ...group,
              categories: flattenedServices
            }
          })
          
          setGroups(modifiedGroups)
          if (res.data?.meta) setMeta((m) => ({ ...m, ...res.data.meta }))
        }
      })
      .catch(() => {
        if (!cancelled) setError('Could not load service categories. Pull to refresh or try again.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (step !== 'roles' || !activeGroupId || activeGroup) return
    queueMicrotask(() => {
      setStep('areas')
      setActiveGroupId(null)
    })
  }, [step, activeGroupId, activeGroup])

  function toggle(id) {
    const key = String(id)
    if (!selected.has(key) && selected.size >= MAX_SKILLS) {
      setError(`You can choose up to ${MAX_SKILLS} skills. Remove one to add another.`)
      return
    }
    setError('')
    setSelected((prev) => {
      const next = new Map(prev)
      if (next.has(key)) next.delete(key)
      else next.set(key, { minPrice: '', maxPrice: '' })
      return next
    })
  }

  function updatePrice(id, field, value) {
    setSelected((prev) => {
      const next = new Map(prev)
      const current = next.get(id)
      if (current) {
        next.set(id, { ...current, [field]: value })
      }
      return next
    })
  }

  function openGroup(g) {
    setActiveGroupId(String(g._id))
    setRoleSearch('')
    setStep('roles')
  }

  function closeRoles() {
    setStep('areas')
    setActiveGroupId(null)
    setRoleSearch('')
  }

  async function handleSave() {
    setError('')
    if (!hasTradeSelected) {
      setError('Choose at least one skill in any category.')
      return
    }
    
    const servicesPayload = []
    for (const [id, pricing] of selected.entries()) {
      if (!pricing.minPrice || !pricing.maxPrice) {
        setError('Please enter both minimum and maximum price for all selected roles.')
        return
      }
      if (Number(pricing.minPrice) > Number(pricing.maxPrice)) {
        setError('Maximum price must be greater than or equal to minimum price.')
        return
      }
      
      // Look up the subcategoryId from the active groups
      let subcategoryId = id
      for (const group of tradeGroups) {
        for (const cat of group.categories || []) {
          if (String(cat._id) === id) {
            if (cat.subcategoryId) subcategoryId = String(cat.subcategoryId)
          }
        }
      }

      servicesPayload.push({
        serviceId: id,
        subcategoryId: subcategoryId,
        minPrice: Number(pricing.minPrice),
        maxPrice: Number(pricing.maxPrice)
      })
    }

    setSaving(true)
    try {
      const res = await updateMyLabourCategories(servicesPayload)
      dispatch(setUser(res.data.user))
      onComplete?.()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save your skills')
    } finally {
      setSaving(false)
    }
  }

  const roleQ = roleSearch.trim().toLowerCase()
  const visibleRoles =
    activeGroup?.categories?.filter((c) => {
      if (!roleQ) return true
      return `${c.name} ${c.subtitle || ''}`.toLowerCase().includes(roleQ)
    }) ?? []

  const showBack = variant === 'app' && hasExistingCategories && step === 'areas'

  return (
    <div className="flex min-h-0 flex-1 flex-col pb-24">
      <header className="mb-4">
        <div className="flex items-center gap-2">
          {step === 'roles' ? (
            <button
              type="button"
              onClick={closeRoles}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200/90 bg-white text-slate-800 shadow-sm transition hover:border-brand/35"
              aria-label="Back to categories"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden />
            </button>
          ) : showBack ? (
            <Link
              to="/app"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200/90 bg-white text-slate-800 shadow-sm transition hover:border-brand/35"
              aria-label="Back to app"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden />
            </Link>
          ) : (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand ring-1 ring-brand/20">
              <Wrench className="h-5 w-5" aria-hidden />
            </span>
          )}

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand">
              {variant === 'auth' ? 'Mechanic setup' : 'My skills'}
            </p>
            <h2 className="text-lg font-black tracking-tight text-slate-900">
              {step === 'areas' ? 'Select your skills' : activeGroup?.name}
            </h2>
          </div>

          <span className="shrink-0 rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-black text-brand ring-1 ring-brand/20">
            {tradeSelectedCount}/{MAX_SKILLS}
          </span>
        </div>

        <div className="mt-3 flex items-center gap-1.5">
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
              step === 'areas' ? 'bg-brand text-white' : 'bg-slate-100 text-slate-500'
            }`}
          >
            1 · Category
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-slate-300" aria-hidden />
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
              step === 'roles' ? 'bg-brand text-white' : 'bg-slate-100 text-slate-500'
            }`}
          >
            2 · Skills
          </span>
        </div>

        {step === 'areas' ? (
          <p className="mt-2 text-xs leading-relaxed text-slate-600">
            {variant === 'auth'
              ? `Pick the services you offer (up to ${MAX_SKILLS}). We use these to match you to nearby car and bike jobs.`
              : `Open a category and tick every service you offer — up to ${MAX_SKILLS} in total.`}
          </p>
        ) : activeGroup?.description ? (
          <p className="mt-2 text-xs leading-relaxed text-slate-600">{activeGroup.description}</p>
        ) : null}
      </header>

      {variant === 'auth' ? (
        <GlassPanel className="mb-4 flex items-start gap-2.5 border-brand/20 bg-brand/5 p-3 ring-1 ring-brand/15">
          <HardHat className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
          <p className="text-[11px] leading-relaxed text-slate-700">
            <span className="font-bold text-slate-900">Almost done.</span> Select your skill so car and bike owners
            can find you.
          </p>
        </GlassPanel>
      ) : null}

      {loading ? (
        <p className="py-12 text-center text-sm font-medium text-slate-500">Loading service categories…</p>
      ) : (
        <AnimatePresence mode="wait">
          {step === 'areas' ? (
            <motion.div
              key="areas"
              initial={reduce ? false : { opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? false : { opacity: 0, x: 12 }}
              className="space-y-4"
            >
              <AppSearchBar
                value={hubSearch}
                onChange={(e) => setHubSearch(e.target.value)}
                placeholder="Search categories or skills…"
                className="border-slate-200/90 shadow-sm ring-1 ring-slate-200/80"
              />

              {areasWithPicks > 0 ? (
                <p className="text-center text-[11px] font-semibold text-slate-500">
                  {areasWithPicks} area{areasWithPicks === 1 ? '' : 's'} with selected roles
                </p>
              ) : null}

              <div className="space-y-2.5">
                {filteredTradeGroups.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-500">No areas match your search.</p>
                ) : (
                  filteredTradeGroups.map((g) => {
                    if ((g.categories || []).length === 0) return null
                    return (
                      <AreaCard
                        key={g._id}
                        group={g}
                        selectedInGroup={countInGroup(g)}
                        onOpen={() => openGroup(g)}
                      />
                    )
                  })
                )}
              </div>


            </motion.div>
          ) : (
            <motion.div
              key="roles"
              initial={reduce ? false : { opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? false : { opacity: 0, x: -12 }}
              className="space-y-3"
            >
              <AppSearchBar
                value={roleSearch}
                onChange={(e) => setRoleSearch(e.target.value)}
                placeholder="Filter roles in this area…"
                className="border-slate-200/90 shadow-sm ring-1 ring-slate-200/80"
              />
              <ul className="space-y-2">
                {visibleRoles.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-500">No roles match.</p>
                ) : (
                  visibleRoles.map((c) => {
                    const id = categoryId(c)
                    return (
                      <li key={id}>
                        <SelectRow
                          label={c.name}
                          subtitle={c.subtitle || undefined}
                          selected={selected.has(id)}
                          onToggle={() => toggle(id)}
                          pricing={selected.get(id)}
                          onUpdatePrice={(field, val) => updatePrice(id, field, val)}
                        />
                      </li>
                    )
                  })
                )}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200/80 bg-white/90 px-4 pt-3 shadow-[0_-12px_40px_-12px_rgba(15,23,42,0.12)] backdrop-blur-xl pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto w-full max-w-lg">
          {error ? <p className="mb-2 text-center text-xs font-semibold text-rose-700">{error}</p> : null}
          {step === 'areas' ? (
            <AppPrimaryButton
              type="button"
              disabled={saving || loading || !hasTradeSelected}
              className="w-full py-3.5 text-[15px]"
              onClick={() => void handleSave()}
            >
              {saving ? 'Saving…' : variant === 'auth' ? 'Finish & enter app' : 'Save & continue'}
              <Sparkles className="h-4 w-4" aria-hidden />
            </AppPrimaryButton>
          ) : (
            <button
              type="button"
              onClick={closeRoles}
              className="w-full rounded-2xl border border-slate-200/90 bg-white py-3.5 text-sm font-bold text-slate-800 shadow-sm transition hover:border-brand/30"
            >
              Done — choose another area
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

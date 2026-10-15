import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ChevronRight, Loader2, Search, Sparkles } from 'lucide-react'
import { fetchLabourCategoriesGrouped } from '../../api/labourCategoriesApi.js'
import { ApiError } from '../../api/http.js'
import { AppStackScreenHeader } from '../../components/app/AppStackScreenHeader.jsx'
import { GlassPanel } from '../../components/ui/GlassPanel.jsx'

export function ServiceCatalog() {
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedGroup, setExpandedGroup] = useState(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    fetchLabourCategoriesGrouped()
      .then((res) => {
        if (cancelled) return
        setGroups(res.data?.groups ?? [])
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Failed to load services')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const handleCategorySelect = useCallback((category) => {
    navigate(`/app/sub-category/${category._id}`, { state: { cat: category } })
  }, [navigate])

  const q = query.trim().toLowerCase()
  const visibleGroups = useMemo(() => {
    if (!q) return groups
    const hit = (t) => String(t || '').toLowerCase().includes(q)
    return groups
      .map((g) => {
        if (hit(g.name)) return g
        const categories = (g.categories || [])
          .map((c) => {
            if (hit(c.name)) return c
            const subcategories = (c.subcategories || []).filter((s) => hit(s.name))
            return subcategories.length ? { ...c, subcategories } : null
          })
          .filter(Boolean)
        return categories.length ? { ...g, categories } : null
      })
      .filter(Boolean)
  }, [groups, q])

  if (loading) {
    return (
      <div className="space-y-4">
        <AppStackScreenHeader title="Services" backTo="/app" />
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <AppStackScreenHeader title="Services" backTo="/app" />
        <GlassPanel className="p-6 text-center">
          <p className="text-sm font-semibold text-rose-700">{error}</p>
        </GlassPanel>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-8">
      <AppStackScreenHeader title="Book a Service" backTo="/app" />

      <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
        <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search services, e.g. wash, AC, tyre"
          className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
        />
      </label>

      {visibleGroups.length === 0 ? (
        <GlassPanel className="p-8 text-center">
          <Sparkles className="mx-auto h-10 w-10 text-slate-300" aria-hidden />
          <p className="mt-3 text-sm font-semibold text-slate-600">{q ? 'No services match your search' : 'No services available yet'}</p>
        </GlassPanel>
      ) : (
        <div className="space-y-3">
          {visibleGroups.map((group, gi) => (
            <motion.div
              key={group._id}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: gi * 0.05 }}
            >
              <GlassPanel className="overflow-hidden p-0">
                <button
                  type="button"
                  onClick={() => setExpandedGroup(expandedGroup === group._id ? null : group._id)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
                      <Sparkles className="h-5 w-5" aria-hidden />
                    </span>
                    <div>
                      <p className="text-sm font-extrabold text-slate-900">{group.name}</p>
                      <p className="text-xs text-slate-500">
                        {(group.categories || []).length} categories
                      </p>
                    </div>
                  </div>
                  <ChevronRight
                    className={`h-5 w-5 text-slate-400 transition ${expandedGroup === group._id ? 'rotate-90' : ''}`}
                    aria-hidden
                  />
                </button>

                {(q || expandedGroup === group._id) && (
                  <div className="border-t border-slate-100 bg-slate-50/50">
                    {(group.categories || []).map((category) => {
                      const svcs = (category.services || []).filter((x) => x.isActive !== false)
                      const from = svcs.length ? Math.min(...svcs.map((x) => Number(x.basePrice) || 0)) : null
                      return (
                        <button
                          key={category._id}
                          type="button"
                          onClick={() => handleCategorySelect(category, group)}
                          className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 text-left transition last:border-b-0 hover:bg-white"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-800">{category.name}</p>
                            <p className="text-xs text-slate-500">
                              {svcs.length} {svcs.length === 1 ? 'service' : 'services'}
                            </p>
                          </div>
                          <span className="flex shrink-0 items-center gap-2">
                            {from != null && (
                              <span className="rounded-lg bg-brand/10 px-2.5 py-1 text-xs font-bold text-brand">
                                from ₹{from}
                              </span>
                            )}
                            <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden />
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </GlassPanel>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { fetchLabourCategoriesGrouped } from '../../api/labourCategoriesApi.js'
import { IndividualCategorySearchPanel } from '../../components/app/individual/IndividualCategorySearchPanel.jsx'

export function AppIndividualSearchPage() {
  const [tradeGroups, setTradeGroups] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchLabourCategoriesGrouped()
      .then((res) => {
        if (cancelled) return
        const groups = res.data?.groups ?? []
        const meta = res.data?.meta ?? {}
        const tradeKind = meta.tradeKind ?? 'trade'
        setTradeGroups(groups.filter((g) => g.kind === tradeKind && (g.categories?.length ?? 0) > 0))
      })
      .catch(() => {
        if (!cancelled) setTradeGroups([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="-mx-4 -mt-2 flex h-[calc(100dvh-8.5rem)] flex-col">
      <div className="flex-1 min-h-0">
        <IndividualCategorySearchPanel tradeGroups={tradeGroups} groupsLoading={loading} />
      </div>
    </div>
  )
}

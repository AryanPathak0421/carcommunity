import { useEffect, useState } from 'react'
import { fetchLandingBanners, fetchLandingLabourCatalogue } from '../api/landingApi.js'

function normaliseGroups(payload) {
  const groups = payload?.data?.groups ?? payload?.groups ?? []
  return groups
    .map((g) => {
      const categories = (g.categories ?? []).map((c) => ({
        _id: c._id,
        name: c.name,
        slug: c.slug,
        subtitle: c.subtitle || '',
        imageUrl: c.imageUrl || '',
        services: (c.services ?? []).map((s) => ({
          _id: s._id,
          name: s.name,
          basePrice: Number(s.basePrice) || 0,
          iconUrl: s.iconUrl || '',
        })),
      }))
      const services = categories.flatMap((c) => c.services)
      const prices = services.map((s) => s.basePrice).filter((p) => p > 0)
      return {
        _id: g._id,
        name: g.name,
        slug: g.slug,
        description: g.description || '',
        imageUrl: g.imageUrl || categories.find((c) => c.imageUrl)?.imageUrl || '',
        sortOrder: g.sortOrder ?? 0,
        categories,
        serviceCount: services.length,
        minPrice: prices.length ? Math.min(...prices) : 0,
      }
    })
    .filter((g) => g.serviceCount > 0 || g.categories.length > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
}

function normaliseBanners(payload) {
  const list = payload?.data?.banners ?? payload?.banners ?? []
  return list.filter((b) => b?.imageUrl).map((b) => ({ id: b._id, imageUrl: b.imageUrl, targetUrl: b.targetUrl || '' }))
}

/**
 * Loads every public dataset the landing page renders. Each request fails
 * independently so one slow endpoint never blanks the whole page.
 */
export function useLandingData() {
  const [state, setState] = useState({
    loading: true,
    groups: [],
    banners: [],
  })

  useEffect(() => {
    let alive = true
    Promise.allSettled([
      fetchLandingLabourCatalogue(),
      fetchLandingBanners(),
    ]).then(([cat, banners]) => {
      if (!alive) return
      setState({
        loading: false,
        groups: cat.status === 'fulfilled' ? normaliseGroups(cat.value) : [],
        banners: banners.status === 'fulfilled' ? normaliseBanners(banners.value) : [],
      })
    })
    return () => {
      alive = false
    }
  }, [])

  return state
}

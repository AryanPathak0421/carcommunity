import { useEffect, useState } from 'react'
import { serviceConfigApi } from '../api/serviceConfigApi.js'

/** Same values the backend seeds; used until the request returns (or if it fails). */
export const DEFAULT_SERVICE_UI = {
  carWash: {
    headline: 'Car Wash at your home',
    tagline: 'Verified washers come to you',
    sizes: [
      { label: 'Hatchback', hint: 'Swift, i10, Alto, Tiago', icon: 'hatchback', isActive: true },
      { label: 'Sedan', hint: 'City, Verna, Dzire, Ciaz', icon: 'sedan', isActive: true },
      { label: 'SUV', hint: 'Creta, Nexon, Scorpio, Fortuner', icon: 'suv', isActive: true },
    ],
    steps: [
      { icon: 'calendar', title: 'Book', text: 'Pick a package and a time' },
      { icon: 'map', title: 'We come to you', text: 'Washer arrives at your location' },
      { icon: 'camera', title: 'Photo proof', text: 'Before and after photos' },
      { icon: 'check', title: 'Pay after', text: 'Pay once you are happy' },
    ],
  },
  trustChips: [
    { icon: 'badge', label: 'Verified mechanics' },
    { icon: 'zap', label: 'Quick matching' },
    { icon: 'shield', label: 'Clear pricing' },
  ],
  paymentMethods: [
    { id: 'CASH', label: 'Cash', isActive: true },
    { id: 'ONLINE', label: 'Online', isActive: true },
  ],
  durationOptions: [
    { id: 'few_hours', label: 'Few hours', isActive: true },
    { id: 'full_day', label: 'Full day', isActive: true },
    { id: 'multi_day', label: 'Multi day', isActive: true },
  ],
}

let cache = null
let inflight = null

function load() {
  if (cache) return Promise.resolve(cache)
  if (!inflight) {
    inflight = serviceConfigApi
      .get()
      .then((res) => {
        const c = res?.data?.config
        cache = c ? { ...DEFAULT_SERVICE_UI, ...c, carWash: { ...DEFAULT_SERVICE_UI.carWash, ...(c.carWash || {}) } } : DEFAULT_SERVICE_UI
        return cache
      })
      .catch(() => DEFAULT_SERVICE_UI)
      .finally(() => {
        inflight = null
      })
  }
  return inflight
}

/** Admin changes apply on the next app load; this lets the settings page drop the cache after saving. */
export function resetServiceUiConfigCache() {
  cache = null
}

export function useServiceUiConfig() {
  const [config, setConfig] = useState(cache || DEFAULT_SERVICE_UI)
  useEffect(() => {
    let alive = true
    load().then((c) => alive && setConfig(c))
    return () => {
      alive = false
    }
  }, [])
  return config
}

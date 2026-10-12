const R = 6371 // km

const rad = (d) => (d * Math.PI) / 180

/** Great-circle distance in km. */
export function haversineKm(a, b) {
  if (!a || !b) return 0
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)))
}

/** Rough ETA (minutes) when no routing service is available: city speed ~22 km/h. */
export function fallbackEtaMinutes(km) {
  return Math.max(1, Math.round((km / 22) * 60))
}

/** "850 m" / "2.4 km" */
export function formatDistance(km) {
  if (km == null || !Number.isFinite(km)) return ''
  return km < 1 ? `${Math.max(10, Math.round(km * 100) * 10)} m` : `${km.toFixed(km < 10 ? 1 : 0)} km`
}

/** "just now" / "12s ago" / "3 min ago" */
export function formatAgo(ts, now = Date.now()) {
  if (!ts) return ''
  const s = Math.max(0, Math.round((now - new Date(ts).getTime()) / 1000))
  if (s < 5) return 'just now'
  if (s < 60) return `${s}s ago`
  return `${Math.round(s / 60)} min ago`
}

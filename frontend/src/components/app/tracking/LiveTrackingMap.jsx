import { useCallback, useEffect, useRef, useState } from 'react'
import { LocateFixed } from 'lucide-react'
import { loadGoogleMaps } from '../../../lib/googleMaps.js'
import { fallbackEtaMinutes, haversineKm } from '../../../lib/geo.js'
import { ICON_NODES } from '../../../lib/fallbackIconNodes.js'

const BRAND = '#F97316'
const NAVY = '#0B2A5B'

function nodesToSvg(name) {
  return (ICON_NODES[name] || [])
    .map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ')}/>`)
    .join('')
}

const svgUrl = (svg) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`

/** Customer's service location: classic teardrop pin. */
const DESTINATION_ICON = svgUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="56" viewBox="0 0 44 56">` +
    `<ellipse cx="22" cy="52" rx="9" ry="3" fill="#000" opacity=".18"/>` +
    `<path d="M22 2C11.5 2 3 10.3 3 20.5 3 33.5 22 52 22 52S41 33.5 41 20.5C41 10.3 32.5 2 22 2z" fill="${NAVY}"/>` +
    `<circle cx="22" cy="20.5" r="8" fill="#fff"/><circle cx="22" cy="20.5" r="3.5" fill="${BRAND}"/></svg>`,
)

/** The mechanic: orange disc with a white ring and a car glyph. */
const MECHANIC_ICON = svgUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56">` +
    `<circle cx="28" cy="28" r="26" fill="${BRAND}" opacity=".18"/>` +
    `<circle cx="28" cy="28" r="19" fill="#fff"/><circle cx="28" cy="28" r="16" fill="${BRAND}"/>` +
    `<g transform="translate(17 17) scale(0.92)" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${nodesToSvg('car-front')}</g></svg>`,
)

const MAP_STYLES = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
]

const ROUTE_REFRESH_MS = 30_000
const ROUTE_REFRESH_KM = 0.12

/**
 * Live tracking map (Rapido/Uber style): customer pin, moving mechanic marker (smoothly animated
 * between GPS fixes), road route and an ETA reported through `onEta`.
 *
 * @param {{
 *   destination: { lat: number, lng: number },
 *   mechanic?: { lat: number, lng: number } | null,
 *   onEta?: (eta: { minutes: number, km: number, source: 'google' | 'estimate' } | null) => void,
 *   bottomInset?: number,   // px covered by the sheet, so the route is framed above it
 *   className?: string,
 * }} props
 */
export function LiveTrackingMap({ destination, mechanic, onEta, bottomInset = 0, className = '' }) {
  const divRef = useRef(null)
  const mapRef = useRef(null)
  const destMarkerRef = useRef(null)
  const mechMarkerRef = useRef(null)
  const lineRef = useRef(null)
  const animRef = useRef(0)
  const routeRef = useRef({ from: null, at: 0, busy: false })
  const followRef = useRef(true)
  const insetRef = useRef(bottomInset)
  const onEtaRef = useRef(onEta)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [following, setFollowing] = useState(true)

  // keep the latest props readable from async callbacks without re-creating the map
  useEffect(() => {
    insetRef.current = bottomInset
    onEtaRef.current = onEta
  })

  // 1) create the map once
  useEffect(() => {
    let cancelled = false
    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !divRef.current || mapRef.current) return
        const map = new maps.Map(divRef.current, {
          center: destination,
          zoom: 15,
          disableDefaultUI: true,
          clickableIcons: false,
          gestureHandling: 'greedy',
          styles: MAP_STYLES,
        })
        mapRef.current = map
        destMarkerRef.current = new maps.Marker({
          position: destination,
          map,
          icon: { url: DESTINATION_ICON, scaledSize: new maps.Size(40, 51), anchor: new maps.Point(20, 49) },
          zIndex: 5,
        })
        lineRef.current = new maps.Polyline({
          map,
          strokeColor: NAVY,
          strokeOpacity: 0.9,
          strokeWeight: 5,
          geodesic: true,
        })
        map.addListener('dragstart', () => {
          followRef.current = false
          setFollowing(false)
        })
        setReady(true)
      })
      .catch((e) => !cancelled && setError(e.message || 'Map unavailable'))
    return () => {
      cancelled = true
      cancelAnimationFrame(animRef.current)
      destMarkerRef.current?.setMap(null)
      mechMarkerRef.current?.setMap(null)
      lineRef.current?.setMap(null)
      destMarkerRef.current = mechMarkerRef.current = lineRef.current = mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- map is created once per mount
  }, [])

  const frame = useCallback(() => {
    const map = mapRef.current
    const maps = window.google?.maps
    if (!map || !maps) return
    const b = new maps.LatLngBounds()
    b.extend(destination)
    if (mechMarkerRef.current) b.extend(mechMarkerRef.current.getPosition())
    map.fitBounds(b, { top: 110, left: 48, right: 48, bottom: insetRef.current + 36 })
    const z = map.getZoom()
    if (z && z > 17) map.setZoom(17)
  }, [destination])

  // 2) route + ETA (Directions API; falls back to a straight line and a speed estimate)
  const refreshRoute = useCallback(
    (from) => {
      const maps = window.google?.maps
      if (!maps || !from) return
      const r = routeRef.current
      if (r.busy) return
      r.busy = true
      r.from = from
      r.at = Date.now()

      const estimate = () => {
        const km = haversineKm(from, destination)
        lineRef.current?.setOptions({ strokeOpacity: 0.55 })
        lineRef.current?.setPath([from, destination])
        onEtaRef.current?.({ minutes: fallbackEtaMinutes(km), km, source: 'estimate' })
      }

      try {
        new maps.DirectionsService().route(
          { origin: from, destination, travelMode: maps.TravelMode.DRIVING },
          (res, status) => {
            r.busy = false
            if (status === 'OK' && res?.routes?.[0]) {
              const leg = res.routes[0].legs[0]
              lineRef.current?.setOptions({ strokeOpacity: 0.9 })
              lineRef.current?.setPath(res.routes[0].overview_path)
              onEtaRef.current?.({
                minutes: Math.max(1, Math.round(leg.duration.value / 60)),
                km: leg.distance.value / 1000,
                source: 'google',
              })
            } else {
              estimate()
            }
          },
        )
      } catch {
        r.busy = false
        estimate()
      }
    },
    [destination],
  )

  // 3) mechanic position: animate the marker, keep the route fresh
  useEffect(() => {
    const maps = window.google?.maps
    if (!ready || !maps) return
    if (!mechanic) {
      mechMarkerRef.current?.setMap(null)
      mechMarkerRef.current = null
      lineRef.current?.setPath([])
      onEtaRef.current?.(null)
      return
    }

    const target = { lat: mechanic.lat, lng: mechanic.lng }
    if (!mechMarkerRef.current) {
      mechMarkerRef.current = new maps.Marker({
        position: target,
        map: mapRef.current,
        icon: { url: MECHANIC_ICON, scaledSize: new maps.Size(52, 52), anchor: new maps.Point(26, 26) },
        zIndex: 10,
      })
      refreshRoute(target)
      frame()
    } else {
      const start = mechMarkerRef.current.getPosition()
      const from = { lat: start.lat(), lng: start.lng() }
      const t0 = performance.now()
      const DURATION = 1600
      cancelAnimationFrame(animRef.current)
      const step = (now) => {
        const k = Math.min(1, (now - t0) / DURATION)
        const e = 1 - (1 - k) * (1 - k) // ease-out
        mechMarkerRef.current?.setPosition({
          lat: from.lat + (target.lat - from.lat) * e,
          lng: from.lng + (target.lng - from.lng) * e,
        })
        if (k < 1) animRef.current = requestAnimationFrame(step)
      }
      animRef.current = requestAnimationFrame(step)

      const r = routeRef.current
      const movedKm = r.from ? haversineKm(r.from, target) : Infinity
      if (movedKm > ROUTE_REFRESH_KM || Date.now() - r.at > ROUTE_REFRESH_MS) refreshRoute(target)
      if (followRef.current) frame()
    }
  }, [mechanic, ready, refreshRoute, frame])

  // re-frame when the sheet height changes
  useEffect(() => {
    if (ready && followRef.current) frame()
  }, [bottomInset, ready, frame])

  const recenter = () => {
    followRef.current = true
    setFollowing(true)
    frame()
  }

  return (
    <div className={`relative h-full w-full bg-slate-100 ${className}`}>
      <div ref={divRef} className="absolute inset-0" />
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50 p-6 text-center text-sm font-semibold text-slate-500">
          Map unavailable right now. Your mechanic details are shown below.
        </div>
      ) : null}
      {ready && !following ? (
        <button
          type="button"
          onClick={recenter}
          style={{ bottom: bottomInset + 16 }}
          className="absolute right-4 flex h-11 w-11 items-center justify-center rounded-full bg-white text-navy shadow-lg ring-1 ring-slate-200 transition active:scale-95"
          aria-label="Recenter map"
        >
          <LocateFixed className="h-5 w-5" aria-hidden />
        </button>
      ) : null}
    </div>
  )
}

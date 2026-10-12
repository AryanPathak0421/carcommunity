import { ICON_NODES } from './fallbackIconNodes.js'

/**
 * Offline fallback art for service / category tiles that have no photo (or whose photo fails).
 * A soft coloured tile with a car-themed pictogram, chosen from the name. Returned as a data URL so
 * it works in any <img>/background and never depends on the network.
 */

/** [name test, icon, background, stroke colour] — first match wins. */
const RULES = [
  [/tow|roadside|recovery|jump|lockout|fuel|breakdown/i, 'truck', '#FFF1D6', '#D97706'],
  [/puncture|tyre|tire|wheel|alignment|balanc/i, 'circle-dot', '#FFE9EC', '#F43F5E'],
  [/battery|electrical|alternator|starter|lights?|wiring/i, 'battery-charging', '#F1E9FF', '#7C3AED'],
  [/wash|detail|clean|polish/i, 'droplets', '#E3F5FF', '#0284C7'],
  [/dent|paint|body|scratch/i, 'paintbrush', '#FFE8F3', '#DB2777'],
  [/\bac\b|air.?con|cooling|compressor/i, 'snowflake', '#E0F7FA', '#0891B2'],
  [/periodic|general service|oil|filter|service/i, 'cog', '#E9F7EF', '#059669'],
  [/repair|brake|clutch|engine|gear|transmission|suspension|mechanic|gearbox/i, 'wrench', '#E8F0FF', '#2563EB'],
]

const BIKE_TONES = [
  ['#FFEFE0', '#EA580C'],
  ['#EAF1FF', '#2563EB'],
  ['#F3EDFF', '#7C3AED'],
  ['#E6F8F6', '#0D9488'],
]

function hash(str) {
  let h = 0
  for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) | 0
  return Math.abs(h)
}

function pick(name) {
  const text = String(name || '')
  if (/\bbike|motorcycle|scooter|two.?wheeler/i.test(text)) {
    const [bg, fg] = BIKE_TONES[hash(text) % BIKE_TONES.length]
    return { icon: 'bike', bg, fg }
  }
  for (const [re, icon, bg, fg] of RULES) if (re.test(text)) return { icon, bg, fg }
  return { icon: 'car-front', bg: '#FFF1E6', fg: '#EA580C' }
}

const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;')

const cache = new Map()

/** @param {string} name service/category name used to choose the pictogram */
export function fallbackArtDataUrl(name) {
  const { icon, bg, fg } = pick(name)
  const key = `${icon}|${bg}`
  if (cache.has(key)) return cache.get(key)

  const body = (ICON_NODES[icon] || [])
    .map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).map(([k, v]) => `${k}="${esc(v)}"`).join(' ')}/>`)
    .join('')
  // lucide icons are drawn on a 24x24 grid; scale to ~52% of the tile and centre
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">` +
    `<rect width="120" height="120" fill="${bg}"/>` +
    `<g transform="translate(30 30) scale(2.5)" fill="none" stroke="${fg}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${body}</g>` +
    `</svg>`
  const url = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
  cache.set(key, url)
  return url
}

/** True for the generated fallback (so callers can tell "no real photo"). */
export const isFallbackArt = (url) => typeof url === 'string' && url.startsWith('data:image/svg+xml')

/**
 * Real photo for an item that has none of its own: the closest of the shipped service photos,
 * chosen from the name. Every service/category therefore shows a picture, never an icon or a blank.
 * Add a new photo to public/assets/images and a rule here to give a service its own picture.
 */
const PHOTO_RULES = [
  [/tow|roadside|recovery|jump|lockout|fuel|breakdown|assistance/i, '/assets/images/roadside-assistance.webp'],
  [/\bbike.*(puncture|tyre|tire|wheel)|(puncture|tyre|tire|wheel).*\bbike/i, '/assets/images/bike-puncture-tyres.webp'],
  [/puncture|tyre|tire|wheel|alignment|balanc/i, '/assets/images/tyres-wheels.webp'],
  [/\bbike.*(battery|electrical|light|starter)|(battery|electrical|light|starter).*\bbike/i, '/assets/images/bike-battery-electrical.png'],
  [/battery|electrical|alternator|starter|lights?|wiring/i, '/assets/images/car-ac-electrical.webp'],
  [/brake|disc|caliper/i, '/assets/images/bike-brakes.webp'],
  [/\bbike|motorcycle|scooter|two.?wheeler|chain/i, '/assets/images/bike-service.webp'],
  [/periodic|general service|oil|filter|service|maintenance/i, '/assets/images/instant-mechanic.webp'],
]

const DEFAULT_PHOTO = '/assets/images/car-repair.webp'

/** @param {string} name */
export function fallbackPhotoUrl(name) {
  const text = String(name || '')
  for (const [re, url] of PHOTO_RULES) if (re.test(text)) return url
  return DEFAULT_PHOTO
}

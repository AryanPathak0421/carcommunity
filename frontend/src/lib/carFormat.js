/** Indian-style short price: 4,50,000 -> "₹4.50 Lakh", 1,25,00,000 -> "₹1.25 Cr". */
export function formatCarPrice(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return ''
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2).replace(/\.00$/, '')} Cr`
  if (n >= 100000) return `₹${(n / 100000).toFixed(2).replace(/\.00$/, '')} Lakh`
  return `₹${n.toLocaleString('en-IN')}`
}

export const formatKm = (km) => `${Number(km || 0).toLocaleString('en-IN')} km`

const titleCase = (v) =>
  String(v || '')
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())

/** Known labels; admin-added values (e.g. HYDROGEN) fall back to a readable Title Case. */
const withFallback = (labels) => new Proxy(labels, { get: (t, k) => (typeof k === 'string' ? t[k] ?? titleCase(k) : t[k]) })

export const FUEL_LABEL = withFallback({
  PETROL: 'Petrol',
  DIESEL: 'Diesel',
  CNG: 'CNG',
  ELECTRIC: 'Electric',
  HYBRID: 'Hybrid',
  LPG: 'LPG',
})

export const TRANSMISSION_LABEL = withFallback({ MANUAL: 'Manual', AUTOMATIC: 'Automatic' })

export const LISTING_STATUS = {
  PENDING: { label: 'Under review', tone: 'bg-amber-50 text-amber-700 ring-amber-200' },
  APPROVED: { label: 'Live', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  REJECTED: { label: 'Needs changes', tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
  SOLD: { label: 'Sold', tone: 'bg-slate-100 text-slate-600 ring-slate-200' },
}

export const INQUIRY_STATUS = {
  NEW: { label: 'New', tone: 'bg-orange-50 text-orange-700 ring-orange-200' },
  CONTACTED: { label: 'Contacted', tone: 'bg-sky-50 text-sky-700 ring-sky-200' },
  CLOSED: { label: 'Closed', tone: 'bg-slate-100 text-slate-600 ring-slate-200' },
}

export function timeAgo(date) {
  const t = new Date(date).getTime()
  if (!Number.isFinite(t)) return ''
  const s = Math.max(0, Math.round((Date.now() - t) / 1000))
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.round(s / 60)} min ago`
  if (s < 86400) return `${Math.round(s / 3600)} h ago`
  return `${Math.round(s / 86400)} d ago`
}

/** Percentage off when an MRP above the selling price is set. */
export const discountPct = (price, mrp) => (mrp && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0)

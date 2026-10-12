import { fallbackPhotoUrl } from './fallbackArt.js'

/**
 * Flatten active trade subcategories from grouped API response.
 * @param {Array} tradeGroups
 */
export function flattenTradeSubcategories(tradeGroups) {
  const items = []
  for (const g of tradeGroups || []) {
    for (const c of g.categories || []) {
      items.push({
        _id: c._id,
        name: c.name,
        slug: c.slug,
        subtitle: c.subtitle,
        imageUrl: c.imageUrl || '',
        sortOrder: c.sortOrder ?? 0,
        groupId: g._id,
        groupName: g.name,
        // Lets search match a skill by the services under it ("plumber" → Plumbing & Electrical).
        serviceNames: (c.services || []).map((s) => s?.name || '').join(' '),
      })
    }
  }
  return items.sort((a, b) => (a.sortOrder - b.sortOrder) || String(a.name).localeCompare(String(b.name)))
}

export function getCategoryImageUrl(category) {
  const url = String(category?.imageUrl || '').trim()
  if (url.startsWith('data:image/') || url.startsWith('https://') || url.startsWith('http://')) {
    return url
  }
  // Images shipped with the web app itself live on the web origin, not the API origin.
  if (url.startsWith('/assets/')) return url
  if (url.startsWith('/')) {
    try {
      const origin = new URL(import.meta.env.VITE_API_URL || 'http://localhost:5005/api/v1', window.location.origin).origin
      return `${origin}${url}`
    } catch (e) {
      // ignore
    }
  }
  // No photo set: the closest shipped service photo (never a blank, an icon or an external stock photo).
  return fallbackPhotoUrl(category?.name || category?.slug)
}

/** Cover image for a trade group tile — group imageUrl, else first subcategory, else fallback. */
export function getGroupImageUrl(group) {
  const groupUrl = String(group?.imageUrl || '').trim()
  if (groupUrl.startsWith('data:image/') || groupUrl.startsWith('https://') || groupUrl.startsWith('http://')) {
    return groupUrl
  }
  if (groupUrl.startsWith('/assets/')) return groupUrl
  if (groupUrl.startsWith('/')) {
    try {
      const origin = new URL(import.meta.env.VITE_API_URL || 'http://localhost:5005/api/v1', window.location.origin).origin
      return `${origin}${groupUrl}`
    } catch (e) {
      // ignore
    }
  }
  const cats = group?.categories || []
  const withImage = cats.find((c) => String(c?.imageUrl || '').trim())
  if (withImage) return getCategoryImageUrl(withImage)
  return getCategoryImageUrl({ slug: group?.slug, name: group?.name })
}

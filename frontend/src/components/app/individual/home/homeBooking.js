import { readBookingDraft, writeBookingDraft } from '../../../../lib/individualBookingDraft.js'
import { buildBookingFlowPath } from '../../../../lib/bookingFlowNavigation.js'

/**
 * Flatten grouped categories into bookable service rows. Each row carries the
 * group + subcategory context the booking flow expects in its draft.
 */
export function flattenServices(tradeGroups) {
  const rows = []
  for (const group of tradeGroups || []) {
    for (const cat of group.categories || []) {
      for (const service of cat.services || []) {
        if (service?.isActive === false) continue
        rows.push({ group, cat, service })
      }
    }
  }
  return rows
}

/** Opens an admin-set banner link: in-app paths via the router, full URLs in a new tab. */
export function openBannerTarget(navigate, targetUrl) {
  const target = String(targetUrl || '').trim()
  if (target.startsWith('/')) navigate(target)
  else if (/^https?:\/\//i.test(target)) window.open(target, '_blank', 'noopener,noreferrer')
}

export function formatRupees(amount) {
  return `₹${Number(amount || 0).toLocaleString('en-IN')}`
}

/** Same draft shape the sub-category page writes, so the booking flow resumes identically. */
export function startServiceBooking(navigate, { group, cat, service, bookingType }) {
  const prev = readBookingDraft() || {}
  writeBookingDraft({
    ...prev,
    entryPoint: 'category',
    groupId: String(group?._id || ''),
    groupName: group?.name || '',
    categoryId: String(cat._id),
    categoryName: cat.name || '',
    serviceId: String(service._id),
    serviceName: service.name || '',
    bookingType,
    matchMode: 'smart',
    selectedWorkers: [],
  })
  navigate(buildBookingFlowPath('details', { categoryId: cat._id }))
}

/** State object the sub-category page reads from `location.state.cat`. */
export function subcategoryRouteState(group, cat) {
  return { cat: { ...cat, groupId: group?._id, groupName: group?.name } }
}

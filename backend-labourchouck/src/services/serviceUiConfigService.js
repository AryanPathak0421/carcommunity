import { ServiceUiConfig } from '../models/ServiceUiConfig.js'

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

let seeding = null

async function ensureConfig() {
  if (seeding) return seeding
  seeding = ServiceUiConfig.updateOne(
    { key: 'default' },
    { $setOnInsert: { key: 'default', ...DEFAULT_SERVICE_UI } },
    { upsert: true },
  )
    .catch(() => {}) // concurrent first request: the unique key protects us
    .finally(() => {
      seeding = null
    })
  return seeding
}

/** The stored config, or the defaults if the database has none yet. */
export async function getServiceUiConfig() {
  await ensureConfig()
  const doc = await ServiceUiConfig.findOne({ key: 'default' }).lean()
  if (!doc) return DEFAULT_SERVICE_UI
  return {
    carWash: { ...DEFAULT_SERVICE_UI.carWash, ...(doc.carWash || {}) },
    trustChips: doc.trustChips?.length ? doc.trustChips : DEFAULT_SERVICE_UI.trustChips,
    paymentMethods: doc.paymentMethods?.length ? doc.paymentMethods : DEFAULT_SERVICE_UI.paymentMethods,
    durationOptions: doc.durationOptions?.length ? doc.durationOptions : DEFAULT_SERVICE_UI.durationOptions,
  }
}

/** Payment methods customers may currently use (admin can switch Cash or Online off). */
export async function getActivePaymentMethodIds() {
  const cfg = await getServiceUiConfig()
  return cfg.paymentMethods.filter((m) => m.isActive !== false).map((m) => m.id)
}

import { asyncHandler } from '../utils/asyncHandler.js'
import { HTTP_STATUS, sendError, sendSuccess } from '../utils/apiResponse.js'
import { ServiceUiConfig } from '../models/ServiceUiConfig.js'
import { getServiceUiConfig, DEFAULT_SERVICE_UI } from '../services/serviceUiConfigService.js'

const str = (v, max) => (v == null ? '' : String(v).trim().slice(0, max))
const list = (v) => (Array.isArray(v) ? v : null)

/** Public: the customer app reads this to render sizes, steps, chips and options. */
export const getPublicConfig = asyncHandler(async (_req, res) => {
  return sendSuccess(res, { data: { config: await getServiceUiConfig() } })
})

export const getAdminConfig = asyncHandler(async (_req, res) => {
  return sendSuccess(res, { data: { config: await getServiceUiConfig(), defaults: DEFAULT_SERVICE_UI } })
})

const SIZE_ICONS = ['hatchback', 'sedan', 'suv', 'bike']
const STEP_ICONS = ['calendar', 'map', 'camera', 'check', 'clock', 'shield']
const CHIP_ICONS = ['badge', 'zap', 'shield', 'clock', 'wallet']

function dedupeBy(items, keyFn) {
  const seen = new Set()
  return items.filter((i) => {
    const k = keyFn(i).toLowerCase()
    if (!k || seen.has(k)) return false
    seen.add(k)
    return true
  })
}

export const saveAdminConfig = asyncHandler(async (req, res) => {
  const body = req.body || {}
  const $set = {}
  const bad = (message) => sendError(res, { message, statusCode: HTTP_STATUS.BAD_REQUEST })

  if (body.carWash !== undefined) {
    const cw = body.carWash || {}
    if (cw.headline !== undefined) $set['carWash.headline'] = str(cw.headline, 60) || DEFAULT_SERVICE_UI.carWash.headline
    if (cw.tagline !== undefined) $set['carWash.tagline'] = str(cw.tagline, 80)
    if (cw.sizes !== undefined) {
      const raw = list(cw.sizes)
      if (!raw) return bad('sizes must be a list')
      const sizes = dedupeBy(
        raw
          .map((s) => ({
            label: str(s?.label, 30),
            hint: str(s?.hint, 80),
            icon: SIZE_ICONS.includes(s?.icon) ? s.icon : 'sedan',
            isActive: s?.isActive !== false,
          }))
          .filter((s) => s.label),
        (s) => s.label,
      ).slice(0, 8)
      if (!sizes.some((s) => s.isActive)) return bad('Keep at least one active car size')
      $set['carWash.sizes'] = sizes
    }
    if (cw.steps !== undefined) {
      const raw = list(cw.steps)
      if (!raw) return bad('steps must be a list')
      $set['carWash.steps'] = raw
        .map((s) => ({
          icon: STEP_ICONS.includes(s?.icon) ? s.icon : 'check',
          title: str(s?.title, 40),
          text: str(s?.text, 80),
        }))
        .filter((s) => s.title)
        .slice(0, 6)
    }
  }

  if (body.trustChips !== undefined) {
    const raw = list(body.trustChips)
    if (!raw) return bad('trustChips must be a list')
    $set.trustChips = raw
      .map((c) => ({ icon: CHIP_ICONS.includes(c?.icon) ? c.icon : 'badge', label: str(c?.label, 30) }))
      .filter((c) => c.label)
      .slice(0, 3)
  }

  if (body.paymentMethods !== undefined) {
    const raw = list(body.paymentMethods)
    if (!raw) return bad('paymentMethods must be a list')
    const methods = ['CASH', 'ONLINE'].map((id) => {
      const m = raw.find((x) => x?.id === id) || {}
      const fallback = DEFAULT_SERVICE_UI.paymentMethods.find((d) => d.id === id)
      return { id, label: str(m.label, 30) || fallback.label, isActive: m.isActive !== false }
    })
    if (!methods.some((m) => m.isActive)) return bad('Keep at least one payment method active')
    $set.paymentMethods = methods
  }

  if (body.durationOptions !== undefined) {
    const raw = list(body.durationOptions)
    if (!raw) return bad('durationOptions must be a list')
    const opts = ['few_hours', 'full_day', 'multi_day'].map((id) => {
      const o = raw.find((x) => x?.id === id) || {}
      const fallback = DEFAULT_SERVICE_UI.durationOptions.find((d) => d.id === id)
      return { id, label: str(o.label, 30) || fallback.label, isActive: o.isActive !== false }
    })
    if (!opts.some((o) => o.isActive)) return bad('Keep at least one duration option active')
    $set.durationOptions = opts
  }

  if (Object.keys($set).length === 0) return bad('Nothing to update')

  await getServiceUiConfig() // make sure the document exists
  await ServiceUiConfig.updateOne({ key: 'default' }, { $set })
  return sendSuccess(res, { message: 'Settings saved', data: { config: await getServiceUiConfig() } })
})

import { asyncHandler } from '../utils/asyncHandler.js'
import { HTTP_STATUS, sendError, sendSuccess } from '../utils/apiResponse.js'
import { ContactSettings } from '../models/ContactSettings.js'

export const DEFAULT_CONTACT = {
  heading: 'Contact us',
  intro: 'Questions about a booking, payment or your account? Reach out and we will get back to you.',
  phone: '8668337344',
  whatsapp: '8668337344',
  email: 'hello@carcommunity.com',
  address: '',
  mapUrl: '',
  hours: 'Every day, 9 AM – 9 PM',
  links: [],
}

/** The mechanic app has its own contact details (payouts, KYC, jobs) next to the customer ones. */
export const MECHANIC_CONTACT = {
  ...DEFAULT_CONTACT,
  intro: 'Need help with jobs, payouts, KYC or your account? Reach out and we will get back to you.',
}

const audienceOf = (req) => (req.query?.audience === 'mechanic' ? 'mechanic' : 'default')
const defaultsFor = (key) => (key === 'mechanic' ? MECHANIC_CONTACT : DEFAULT_CONTACT)

const FIELDS = ['heading', 'intro', 'phone', 'whatsapp', 'email', 'address', 'mapUrl', 'hours']
const MAX = { heading: 60, intro: 300, phone: 20, whatsapp: 20, email: 120, address: 300, mapUrl: 300, hours: 120 }

const str = (v, max) => (v == null ? '' : String(v).trim().slice(0, max))
const digits = (v) => String(v || '').replace(/[^\d+]/g, '')
const isHttpUrl = (u) => /^https?:\/\/[^\s]+$/i.test(u)
const isEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

async function readContact(key = 'default') {
  const defaults = defaultsFor(key)
  await ContactSettings.updateOne(
    { key },
    { $setOnInsert: { key, ...defaults } },
    { upsert: true },
  ).catch(() => {}) // concurrent first request: the unique key protects us
  const doc = await ContactSettings.findOne({ key }).lean()
  if (!doc) return defaults
  const out = {}
  for (const f of FIELDS) out[f] = doc[f] ?? defaults[f]
  out.links = Array.isArray(doc.links) ? doc.links.map((l) => ({ label: l.label, url: l.url })) : []
  return out
}

/** Public: the Contact us page. */
export const getPublicContact = asyncHandler(async (req, res) => {
  return sendSuccess(res, { data: { contact: await readContact(audienceOf(req)) } })
})

export const getAdminContact = asyncHandler(async (req, res) => {
  const key = audienceOf(req)
  return sendSuccess(res, { data: { contact: await readContact(key), defaults: defaultsFor(key) } })
})

export const saveAdminContact = asyncHandler(async (req, res) => {
  const key = audienceOf(req)
  const body = req.body || {}
  const bad = (message) => sendError(res, { message, statusCode: HTTP_STATUS.BAD_REQUEST })
  const $set = {}

  for (const f of FIELDS) {
    if (body[f] === undefined) continue
    $set[f] = str(body[f], MAX[f])
  }
  if ($set.heading === '') $set.heading = DEFAULT_CONTACT.heading
  if ($set.phone !== undefined) $set.phone = digits($set.phone).slice(0, 20)
  if ($set.whatsapp !== undefined) $set.whatsapp = digits($set.whatsapp).slice(0, 20)
  if ($set.email && !isEmail($set.email)) return bad('Enter a valid email address')
  if ($set.mapUrl && !isHttpUrl($set.mapUrl)) return bad('Map link must start with http:// or https://')

  if (body.links !== undefined) {
    if (!Array.isArray(body.links)) return bad('links must be a list')
    const links = body.links
      .map((l) => ({ label: str(l?.label, 30), url: str(l?.url, 300) }))
      .filter((l) => l.label && l.url)
      .slice(0, 8)
    if (links.some((l) => !isHttpUrl(l.url))) return bad('Every link must start with http:// or https://')
    $set.links = links
  }

  if (!Object.keys($set).length) return bad('Nothing to update')
  await ContactSettings.updateOne({ key }, { $set }, { upsert: true })
  return sendSuccess(res, { message: 'Contact details saved', data: { contact: await readContact(key) } })
})

import { CarPart } from '../models/CarPart.js'
import { Booking } from '../models/Booking.js'

export const LOW_STOCK_AT = 3
export const MAX_PART_LINES = 10
export const MAX_PART_QTY = 10

export function stockStatus(stock) {
  if (!(stock > 0)) return 'OUT_OF_STOCK'
  return stock <= LOW_STOCK_AT ? 'LOW_STOCK' : 'IN_STOCK'
}

/** What a customer is allowed to see of a part. */
export function publicPart(p) {
  return {
    _id: p._id,
    name: p.name,
    brand: p.brand,
    partNumber: p.partNumber,
    description: p.description,
    imageUrl: p.imageUrl,
    price: p.price,
    mrp: p.mrp,
    stock: p.stock,
    status: stockStatus(p.stock),
    available: p.stock > 0,
  }
}

const round2 = (n) => Math.round(n * 100) / 100

/**
 * Turn the customer's `[{ partId, quantity }]` into priced booking lines.
 * Read-only: nothing is reserved here (see reserveParts).
 *
 * @returns {Promise<{ok:true, lines:object[], partsTotal:number} | {ok:false, message:string, code:string}>}
 */
export async function priceParts(items, subcategoryId) {
  if (items == null || (Array.isArray(items) && items.length === 0)) {
    return { ok: true, lines: [], partsTotal: 0 }
  }
  if (!Array.isArray(items) || items.length > MAX_PART_LINES) {
    return { ok: false, code: 'INVALID_PARTS', message: `You can add up to ${MAX_PART_LINES} different parts` }
  }

  // merge duplicate ids, validate quantities
  const wanted = new Map()
  for (const it of items) {
    const id = String(it?.partId ?? '')
    const qty = Number(it?.quantity ?? 1)
    if (!/^[a-f0-9]{24}$/i.test(id) || !Number.isInteger(qty) || qty < 1 || qty > MAX_PART_QTY) {
      return { ok: false, code: 'INVALID_PARTS', message: `Choose a valid part and a quantity between 1 and ${MAX_PART_QTY}` }
    }
    wanted.set(id, (wanted.get(id) || 0) + qty)
  }

  const parts = await CarPart.find({ _id: { $in: [...wanted.keys()] }, isActive: true }).lean()
  const byId = new Map(parts.map((p) => [String(p._id), p]))

  const lines = []
  for (const [id, quantity] of wanted) {
    const p = byId.get(id)
    if (!p) return { ok: false, code: 'PART_UNAVAILABLE', message: 'One of the parts you chose is no longer available' }
    const fits = !p.subcategoryIds?.length || p.subcategoryIds.some((s) => String(s) === String(subcategoryId))
    if (!fits) return { ok: false, code: 'PART_NOT_COMPATIBLE', message: `${p.name} is not offered with this service` }
    if (p.stock < quantity) {
      return {
        ok: false,
        code: 'PART_OUT_OF_STOCK',
        message: p.stock > 0 ? `${p.name}: only ${p.stock} left in stock` : `${p.name} is out of stock`,
      }
    }
    lines.push({
      partId: p._id,
      name: p.name,
      brand: p.brand || '',
      unitPrice: p.price,
      quantity,
      lineTotal: round2(p.price * quantity),
    })
  }

  return { ok: true, lines, partsTotal: round2(lines.reduce((s, l) => s + l.lineTotal, 0)) }
}

/**
 * Take the units off the shelf, atomically per part (stock can never go below zero, even when two
 * customers book the last unit at the same time). All-or-nothing: on a failure the earlier lines
 * are put back.
 */
export async function reserveParts(lines) {
  const done = []
  for (const line of lines || []) {
    const hit = await CarPart.findOneAndUpdate(
      { _id: line.partId, isActive: true, stock: { $gte: line.quantity } },
      { $inc: { stock: -line.quantity } },
      { new: true },
    )
    if (!hit) {
      await releaseParts(done)
      return { ok: false, code: 'PART_OUT_OF_STOCK', message: `${line.name} just went out of stock. Please review your parts.` }
    }
    done.push(line)
  }
  return { ok: true }
}

export async function releaseParts(lines) {
  for (const line of lines || []) {
    await CarPart.updateOne({ _id: line.partId }, { $inc: { stock: line.quantity } }).catch((e) =>
      console.error('[parts] stock release failed:', e?.message || e),
    )
  }
}

/**
 * Put a booking's reserved parts back on the shelf when it will never happen
 * (cancelled / failed / expired). Idempotent: only the first call wins the claim.
 */
export async function releaseBookingParts(booking) {
  try {
    if (!booking?.parts?.length || booking.partsReleasedAt) return false
    const claimed = await Booking.findOneAndUpdate(
      { _id: booking._id, partsReleasedAt: { $exists: false } },
      { $set: { partsReleasedAt: new Date() } },
      { new: true },
    )
    if (!claimed) return false
    await releaseParts(claimed.parts)
    return true
  } catch (err) {
    console.error('[parts] booking release failed:', err?.message || err)
    return false
  }
}

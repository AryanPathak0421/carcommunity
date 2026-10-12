/**
 * Cloudinary-aware image helper. Adds `f_auto,q_auto,w_<n>` to Cloudinary
 * upload URLs so the landing page never downloads a 700 KB original for a
 * 300 px tile. Non-Cloudinary URLs are returned untouched.
 * @param {string} url
 * @param {{ w?: number, h?: number, crop?: string }} [opts]
 */
export function optimizeImage(url, { w = 800, h, crop } = {}) {
  const src = String(url || '').trim()
  if (!src) return ''
  if (!src.includes('res.cloudinary.com') || !src.includes('/upload/')) return src
  if (/\/upload\/[^/]*(f_auto|q_auto|w_\d+)/.test(src)) return src
  const parts = [`f_auto`, `q_auto`, `w_${w}`]
  if (h) parts.push(`h_${h}`)
  if (crop) parts.push(`c_${crop}`)
  return src.replace('/upload/', `/upload/${parts.join(',')}/`)
}

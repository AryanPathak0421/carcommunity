/**
 * Single shared Google Maps JS loader (same <script id> the booking/address screens already use,
 * so the library is never loaded twice). Resolves with `google.maps` once the Map class exists.
 */
let pending = null

const SCRIPT_ID = 'google-maps-script'

export function loadGoogleMaps() {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'))
  if (window.google?.maps?.Map) return Promise.resolve(window.google.maps)
  if (pending) return pending

  pending = new Promise((resolve, reject) => {
    const done = () => (window.google?.maps?.Map ? resolve(window.google.maps) : reject(new Error('Google Maps unavailable')))

    let script = document.getElementById(SCRIPT_ID)
    if (!script) {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
      if (!apiKey) {
        reject(new Error('VITE_GOOGLE_MAPS_API_KEY is not set'))
        return
      }
      script = document.createElement('script')
      script.id = SCRIPT_ID
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
      script.async = true
      document.head.appendChild(script)
    }
    script.addEventListener('load', done)
    script.addEventListener('error', () => reject(new Error('Google Maps failed to load')))
    if (window.google?.maps?.Map) done()
  })

  pending.catch(() => {
    pending = null
  })
  return pending
}

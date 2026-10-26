import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

/** Sticky notice while the device has no connection (a mechanic offline cannot receive job requests). */
export function OfflineBar() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  if (online) return null

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-2 bg-slate-900 px-4 py-2 text-xs font-bold text-white"
    >
      <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden />
      You are offline — new job requests won&apos;t reach you
    </div>
  )
}

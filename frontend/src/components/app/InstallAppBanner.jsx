import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

const DISMISS_KEY = 'cc_install_dismissed'

function readDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
}

/** "Install app" prompt: Chrome/Android one-tap install, plus a hint for iPhone Safari. */
export function InstallAppBanner() {
  const [deferred, setDeferred] = useState(null)
  const [dismissed, setDismissed] = useState(readDismissed)
  const [installed, setInstalled] = useState(() => isStandalone())

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault()
      setDeferred(e)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferred(null)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
  if (installed || dismissed || (!deferred && !isIos)) return null

  const dismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* private mode: just hide for this visit */
    }
  }

  const install = async () => {
    if (!deferred) return
    deferred.prompt()
    await deferred.userChoice.catch(() => {})
    setDeferred(null)
  }

  return (
    <div className="fixed inset-x-0 bottom-3 z-50 mx-auto flex w-[calc(100%-1.5rem)] max-w-lg items-center gap-3 rounded-2xl bg-white p-3 shadow-[0_12px_36px_-10px_rgba(15,23,42,0.45)] ring-1 ring-slate-200">
      <img src="/icon-192.png" alt="" className="h-11 w-11 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-extrabold text-slate-900">Install CarCommunity</p>
        <p className="truncate text-[11px] font-medium text-slate-500">
          {deferred ? 'Add to your home screen for quick access' : 'Tap Share, then "Add to Home Screen"'}
        </p>
      </div>
      {deferred ? (
        <button
          type="button"
          onClick={install}
          className="flex shrink-0 items-center gap-1 rounded-xl bg-brand px-3 py-2 text-xs font-extrabold text-white"
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
          Install
        </button>
      ) : null}
      <button type="button" onClick={dismiss} aria-label="Dismiss" className="shrink-0 p-1 text-slate-400">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

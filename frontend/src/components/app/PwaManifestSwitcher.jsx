import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { USER_ROLES } from '../../constants/userRoles.js'
import { useAuth } from '../../hooks/useAuth.js'

const CUSTOMER = { href: '/manifest.webmanifest', title: 'CarCommunity' }
const MECHANIC = { href: '/manifest-mechanic.webmanifest', title: 'CC Partner' }

function setHead(selector, create, apply) {
  let el = document.head.querySelector(selector)
  if (!el) {
    el = create()
    document.head.appendChild(el)
  }
  apply(el)
}

/**
 * One site, two installable apps: mechanics (the `/mechanic` entry or a signed-in mechanic) get the
 * "CarCommunity Partner" manifest, everyone else the customer app. Renders nothing.
 */
export function PwaManifestSwitcher() {
  const { pathname } = useLocation()
  const { realUser } = useAuth()
  const isMechanic = pathname.startsWith('/mechanic') || realUser?.role === USER_ROLES.MECHANIC

  useEffect(() => {
    const cfg = isMechanic ? MECHANIC : CUSTOMER
    setHead(
      'link[rel="manifest"]',
      () => Object.assign(document.createElement('link'), { rel: 'manifest' }),
      (el) => {
        if (el.getAttribute('href') !== cfg.href) el.setAttribute('href', cfg.href)
      },
    )
    setHead(
      'meta[name="apple-mobile-web-app-title"]',
      () => Object.assign(document.createElement('meta'), { name: 'apple-mobile-web-app-title' }),
      (el) => el.setAttribute('content', cfg.title),
    )
  }, [isMechanic])

  return null
}

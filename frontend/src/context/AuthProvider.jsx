import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchMe } from '../api/authApi.js'
import { clearSession, renewToken, setLoading, setUser } from '../store/slices/authSlice.js'

/** Waits between retries when the server is unreachable (restart, cold start, bad network). */
const RETRY_DELAYS_MS = [1000, 2000, 4000, 8000, 15000]

/** Only a rejected token means "signed out". Everything else (offline, 5xx, timeouts) is temporary. */
const isAuthRejection = (err) => err?.status === 401

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export function AuthProvider({ children }) {
  const dispatch = useDispatch()
  const token = useSelector((s) => s.auth.token)

  useEffect(() => {
    let cancelled = false

    if (!token) {
      queueMicrotask(() => {
        if (!cancelled) {
          dispatch(setUser(null))
          dispatch(setLoading(false))
        }
      })
      return () => {
        cancelled = true
      }
    }

    queueMicrotask(() => {
      if (!cancelled) dispatch(setLoading(true))
    })

    async function restoreSession() {
      for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
        try {
          const res = await fetchMe()
          if (cancelled) return
          dispatch(setUser(res.data?.user ?? null))
          // Sliding session: the server sends a fresh token when the current one is half-way through.
          if (res.data?.token) dispatch(renewToken(res.data.token))
          return
        } catch (err) {
          if (cancelled) return
          // Token really rejected: sign out. Never do this for a network hiccup.
          if (isAuthRejection(err)) {
            dispatch(clearSession())
            return
          }
          if (attempt === RETRY_DELAYS_MS.length) return
          await sleep(RETRY_DELAYS_MS[attempt])
        }
      }
    }

    restoreSession().finally(() => {
      if (!cancelled) dispatch(setLoading(false))
    })

    return () => {
      cancelled = true
    }
  }, [token, dispatch])

  // Server was unreachable for a while: try again as soon as the device is back online / the tab is shown.
  const user = useSelector((s) => s.auth.user)
  useEffect(() => {
    if (!token || user) return undefined
    let busy = false
    const retry = async () => {
      if (busy || document.visibilityState === 'hidden') return
      busy = true
      try {
        const res = await fetchMe()
        dispatch(setUser(res.data?.user ?? null))
        if (res.data?.token) dispatch(renewToken(res.data.token))
      } catch (err) {
        if (isAuthRejection(err)) dispatch(clearSession())
      } finally {
        busy = false
      }
    }
    window.addEventListener('online', retry)
    document.addEventListener('visibilitychange', retry)
    return () => {
      window.removeEventListener('online', retry)
      document.removeEventListener('visibilitychange', retry)
    }
  }, [token, user, dispatch])

  return children
}

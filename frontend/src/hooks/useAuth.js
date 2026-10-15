import { useCallback, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { clearBootRole, readBootRole, writeBootRole } from '../lib/bootPersona.js'
import { clearSession, setCredentials } from '../store/slices/authSlice.js'
import { baseApi } from '../store/api/baseApi.js'
import { apiRequest } from '../api/http.js'

export function useAuth() {
  const dispatch = useDispatch()
  const { token, user: realUser, loading } = useSelector((s) => s.auth)
  const [bootRole, setBootRoleState] = useState(() => readBootRole())

  // Guest browsing is gone: only a real signed-in session counts. `bootRole` is just the role
  // someone picked on the first screen, used as the default on the sign-in page.
  const effectiveUser = useMemo(() => realUser || null, [realUser])

  const isGuest = false

  const isAuthenticated = Boolean(token && realUser)

  const setBootRole = useCallback((role) => {
    writeBootRole(role)
    setBootRoleState(role)
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' })
    } catch (e) {
      // Ignore network errors on logout
    }
    clearBootRole()
    setBootRoleState(null)
    dispatch(clearSession())
    try {
      dispatch(baseApi.util.resetApiState())
    } catch (err) {
      // Ignore if store is not ready
    }
  }, [dispatch])

  const applySession = useCallback(
    (accessToken, nextUser) => {
      clearBootRole()
      setBootRoleState(null)
      dispatch(setCredentials({ accessToken, user: nextUser }))
    },
    [dispatch],
  )

  return {
    token,
    user: effectiveUser,
    realUser,
    bootRole,
    loading,
    isGuest,
    isAuthenticated,
    setBootRole,
    applySession,
    logout,
  }
}

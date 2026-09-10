import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import type { FacilitatorAuthState } from '../types'

const anonymous: FacilitatorAuthState = { isAuthenticated: false, name: null }
let current = anonymous
let expired = false
let checked = false
let generation = 0
let refreshing: Promise<void> | null = null
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('frameit-auth') : null
export function publishAuth(state: FacilitatorAuthState, broadcast = true) {
  generation++
  if (state.isAuthenticated) expired = false
  current = state
  checked = true
  window.dispatchEvent(new CustomEvent('frameit-auth-changed', { detail: state }))
  if (broadcast) channel?.postMessage(state.isAuthenticated ? 'refresh' : 'logout')
}
export async function refreshAuth() {
  if (refreshing) return refreshing
  const started = generation
  refreshing = api<FacilitatorAuthState>('/api/auth/me').then(state => {
    if (generation !== started) return
    if (!state.isAuthenticated && current.isAuthenticated) window.dispatchEvent(new Event('frameit-auth-required'))
    else if (!checked || state.isAuthenticated !== current.isAuthenticated || state.name !== current.name || state.isAdmin !== current.isAdmin || state.organizationId !== current.organizationId) publishAuth(state, false)
  }).finally(() => { refreshing = null })
  return refreshing
}
window.addEventListener('frameit-auth-required', () => { expired = true; publishAuth(anonymous) })
if (channel) channel.onmessage = event => {
  if (event.data === 'logout') publishAuth(anonymous, false)
  else { const started = generation; void api<FacilitatorAuthState>('/api/auth/me').then(state => { if (started === generation) publishAuth(state, false) }).catch(() => {}) }
}
export function useFacilitatorAuth() {
  const navigate = useNavigate()
  const location = useLocation()
  const [sessionExpired, setSessionExpired] = useState(expired)
  const [auth, setAuth] = useState(current)
  const [busy, setBusy] = useState(!checked)
  const [error, setError] = useState('')
  useEffect(() => {
    const changed = () => { setAuth(current); setSessionExpired(expired); setBusy(false); setError('') }
    window.addEventListener('frameit-auth-changed', changed)
    if (!checked) void refreshAuth().catch(() => setError('No se pudo comprobar el acceso. Vuelve a intentarlo.')).finally(() => setBusy(false))
    return () => window.removeEventListener('frameit-auth-changed', changed)
  }, [])
  const login = useCallback(async () => { navigate('/acceso?' + new URLSearchParams({ returnTo: location.pathname + location.search + location.hash })) }, [navigate, location])
  const logout = useCallback(async () => {
    try { await api('/api/auth/logout', { method: 'POST' }); expired = false; publishAuth(anonymous); return true }
    catch (reason) { setError((reason as Error).message); return false }
  }, [])
  const refresh = useCallback(async () => {
    setError('')
    if (!current.isAuthenticated) setBusy(true)
    try { await refreshAuth() }
    catch { setError('No se pudo comprobar el acceso. Revisa tu conexión y vuelve a intentarlo.') }
    finally { setBusy(false) }
  }, [])
  return { auth, busy, error, expired: sessionExpired, login, logout, refresh }
}

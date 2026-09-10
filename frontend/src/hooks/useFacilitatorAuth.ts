import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { FacilitatorAuthState } from '../types'

const anonymous: FacilitatorAuthState = { isAuthenticated: false, name: null }
let current = anonymous
let checked = false
let generation = 0
let refreshing: Promise<void> | null = null
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('frameit-auth') : null
export function publishAuth(state: FacilitatorAuthState, broadcast = true) {
  generation++
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
    else publishAuth(state, false)
  }).finally(() => { checked = true; refreshing = null })
  return refreshing
}
if (channel) channel.onmessage = event => {
  if (event.data === 'logout') publishAuth(anonymous, false)
  else { const started = generation; void api<FacilitatorAuthState>('/api/auth/me').then(state => { if (started === generation) publishAuth(state, false) }).catch(() => {}) }
}
export function useFacilitatorAuth() {
  const [auth, setAuth] = useState(current)
  const [busy, setBusy] = useState(!checked)
  const [error, setError] = useState('')
  useEffect(() => {
    const changed = () => { setAuth(current); setBusy(false); setError('') }
    window.addEventListener('frameit-auth-changed', changed)
    if (!checked) void refreshAuth().catch(() => setError('No se pudo comprobar el acceso. Vuelve a intentarlo.')).finally(() => setBusy(false))
    return () => window.removeEventListener('frameit-auth-changed', changed)
  }, [])
  const login = useCallback(async () => { window.dispatchEvent(new Event('frameit-open-auth')) }, [])
  const logout = useCallback(async () => {
    try { await api('/api/auth/logout', { method: 'POST' }); publishAuth(anonymous); return true }
    catch (reason) { setError((reason as Error).message); return false }
  }, [])
  const refresh = useCallback(async () => { await refreshAuth(); setBusy(false) }, [])
  return { auth, busy, error, login, logout, refresh }
}

import { useCallback, useEffect, useState } from 'react'
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr'
import { api } from '../lib/api'
import { normalizeSnapshot } from '../lib/session'
import type { SessionSnapshot } from '../types'

type SessionMode = { kind: 'facilitator'; id: string; authenticated?: boolean } | { kind: 'participant'; code: string }
export type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'offline'

export function useSessionLive(mode: SessionMode) {
  const [snapshot, updateSnapshot] = useState<SessionSnapshot | null>(null)
  const [error, setError] = useState('')
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting')
  const [attempt, setAttempt] = useState(0)
  const privateMode = mode.kind === 'facilitator' && mode.authenticated === true
  const fetchUrl = mode.kind === 'facilitator' ? `/api/sessions/${mode.id}${privateMode ? '/facilitator' : ''}` : `/api/sessions/by-code/${mode.code}`
  const setSnapshot = useCallback((next: SessionSnapshot) => {
    const normalized = normalizeSnapshot(next)
    updateSnapshot(current => current && current.id === normalized.id && Date.parse(current.updatedAtUtc) > Date.parse(normalized.updatedAtUtc) ? current : normalized)
  }, [])
  const retry = useCallback(() => setAttempt(n => n + 1), [])

  useEffect(() => {
    let disposed = false
    let connection: ReturnType<HubConnectionBuilder['build']> | undefined
    const controller = new AbortController()
    const offline = () => { if (!disposed) setConnectionState('offline'); if (connection) void connection.stop() }
    const online = () => { if (!disposed) setAttempt(n => n + 1) }
    window.addEventListener('offline', offline)
    window.addEventListener('online', online)
    const authChanged = () => { if (privateMode && !disposed) setAttempt(n => n + 1) }
    if (privateMode) window.addEventListener('frameit-auth-changed', authChanged)
    const refresh = async () => {
      const next = await api<SessionSnapshot>(fetchUrl, { signal: controller.signal })
      if (!disposed) { setSnapshot(next); setError('') }
      return next
    }
    void (async () => {
      setConnectionState('connecting')
      updateSnapshot(null)
      try {
        const first = await refresh()
        if (disposed) return
        connection = new HubConnectionBuilder().withUrl('/hubs/session').withAutomaticReconnect().configureLogging(LogLevel.Warning).build()
        const join = () => connection!.invoke(privateMode ? 'JoinFacilitatorSession' : 'JoinSession', first.accessCode)
        connection.on('session-updated', (next: SessionSnapshot) => { if (!disposed) setSnapshot(next) })
        connection.on('session-invalidated', () => {
          void refresh().catch(reason => { if (!disposed) { setError((reason as Error).message); setConnectionState('offline') } })
        })
        connection.onreconnecting(() => { if (!disposed) setConnectionState('reconnecting') })
        connection.onreconnected(async () => {
          if (disposed) return
          try { await join(); await refresh(); if (!disposed) setConnectionState('connected') }
          catch { if (!disposed) setConnectionState('offline') }
        })
        connection.onclose(() => { if (!disposed) setConnectionState('offline') })
        await connection.start()
        if (disposed) { await connection.stop(); return }
        await join()
        await refresh()
        if (!disposed) setConnectionState('connected')
      } catch (reason) {
        if (!disposed) { setError((reason as Error).message); setConnectionState('offline') }
      }
    })()
    return () => { disposed = true; controller.abort(); window.removeEventListener('offline', offline); window.removeEventListener('online', online); window.removeEventListener('frameit-auth-changed', authChanged); if (connection) void connection.stop() }
  }, [fetchUrl, privateMode, attempt, setSnapshot])
  return { snapshot, setSnapshot, error, setError, connectionState, retry }
}

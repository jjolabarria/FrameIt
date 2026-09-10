import { useEffect, useMemo, useState } from 'react'
import { isActiveSession } from '../lib/session'
import { api } from '../lib/api'
import type { ClientSummary, SessionSummary, TemplateSummary } from '../types'

export function useWorkspaceData() {
  const [clients, setClients] = useState<ClientSummary[]>([])
  const [templates, setTemplates] = useState<TemplateSummary[]>([])
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function reload() {
    setLoading(true)
    setError('')
    try {
      const [nextClients, nextTemplates, nextSessions] = await Promise.all([
        api<ClientSummary[]>('/api/clients'),
        api<TemplateSummary[]>('/api/templates'),
        api<SessionSummary[]>('/api/sessions'),
      ])
      setClients(nextClients)
      setTemplates(nextTemplates)
      setSessions(nextSessions)
    } catch (reason) {
      setError((reason as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  const totalProjects = useMemo(() => clients.reduce((sum, client) => sum + client.projects.length, 0), [clients])
  const liveSessions = useMemo(() => sessions.filter(isActiveSession).length, [sessions])

  return { clients, templates, sessions, loading, error, reload, totalProjects, liveSessions }
}

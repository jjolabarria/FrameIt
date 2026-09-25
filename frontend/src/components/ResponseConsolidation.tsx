import { useEffect, useState } from 'react'
import { BrainCircuit, Check, RefreshCw } from 'lucide-react'
import { api } from '../lib/api'
import type { ConsolidationGroup, ResponseConsolidation, SessionSnapshot } from '../types'

type ReviewProps = {
  sessionId: string
  questionId: string
  consolidation: ResponseConsolidation
  disabled: boolean
  onSnapshot: (snapshot: SessionSnapshot) => void
}

export function ConsolidationReview({ sessionId, questionId, consolidation, disabled, onSnapshot }: ReviewProps) {
  const [groups, setGroups] = useState(consolidation.groups)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => setGroups(consolidation.groups), [consolidation.groups])
  const base = `/api/sessions/${sessionId}/questions/${questionId}/consolidation`
  async function run(path: string, method: 'POST' | 'PUT', body?: unknown) {
    setBusy(true); setError('')
    try { onSnapshot(await api<SessionSnapshot>(`${base}${path}`, { method, body: body === undefined ? undefined : JSON.stringify(body) })) }
    catch (reason) { setError((reason as Error).message) }
    finally { setBusy(false) }
  }
  async function publish() {
    setBusy(true); setError('')
    try {
      await api<SessionSnapshot>(base, { method: 'PUT', body: JSON.stringify({ groups }) })
      onSnapshot(await api<SessionSnapshot>(`${base}/publish`, { method: 'POST' }))
    } catch (reason) { setError((reason as Error).message) }
    finally { setBusy(false) }
  }

  const working = consolidation.status === 'Pending' || consolidation.status === 'Generating'
  return <section className={`consolidation-panel consolidation-panel--${consolidation.status.toLowerCase()}`} aria-labelledby="consolidation-title">
    <div className="consolidation-head"><div><p className="section-label">Síntesis asistida por IA</p><h3 id="consolidation-title"><BrainCircuit size={20} /> Consolidación de {consolidation.sourceCount} respuestas</h3></div><span className="meta-chip">{working ? 'Procesando' : consolidation.status === 'Ready' ? 'Lista para revisar' : consolidation.status === 'Published' ? 'Publicada' : consolidation.status === 'Stale' ? 'Desactualizada' : 'No disponible'}</span></div>
    {working && <div className="consolidation-progress" role="status"><span />Agrupando ideas sin alterar las respuestas originales…</div>}
    {consolidation.status === 'Ready' && <div className="consolidation-editor">{groups.map((group, index) => <article key={group.id}><span>{group.responseIds.length} aportaciones</span><label>Tema<input value={group.title} maxLength={160} onChange={event => setGroups(current => current.map((item, i) => i === index ? { ...item, title: event.target.value } : item))} /></label><label>Síntesis<textarea rows={3} maxLength={1200} value={group.summary} onChange={event => setGroups(current => current.map((item, i) => i === index ? { ...item, summary: event.target.value } : item))} /></label></article>)}</div>}
    {consolidation.status === 'Published' && <div className="consolidation-published">{groups.map(group => <article key={group.id}><span>{group.responseIds.length} aportaciones</span><h4>{group.title}</h4><p>{group.summary}</p></article>)}</div>}
    {(consolidation.status === 'Failed' || consolidation.status === 'Stale') && <p role="status" className="muted-copy">{consolidation.error || 'Las respuestas han cambiado. Genera una nueva consolidación.'}</p>}
    {error && <p className="error-copy" role="alert">{error}</p>}
    <div className="action-row consolidation-actions">
      {(consolidation.status === 'Ready' || consolidation.status === 'Failed' || consolidation.status === 'Stale' || consolidation.status === 'Published') && <button className="secondary-button" disabled={disabled || busy} onClick={() => void run('/regenerate', 'POST')}><RefreshCw size={16} />Regenerar</button>}
      {consolidation.status === 'Ready' && <><button className="secondary-button" disabled={disabled || busy} onClick={() => void run('', 'PUT', { groups })}>Guardar borrador</button><button className="primary-button" disabled={disabled || busy || groups.some(group => !group.title.trim() || !group.summary.trim())} onClick={() => void publish()}><Check size={16} />Publicar consolidación</button></>}
      {consolidation.status === 'Published' && <div className="segmented-control" aria-label="Vista de resultados"><button aria-pressed={!consolidation.showConsolidated} disabled={disabled || busy} onClick={() => void run('/display', 'PUT', { showConsolidated: false })}>Originales</button><button aria-pressed={consolidation.showConsolidated} disabled={disabled || busy} onClick={() => void run('/display', 'PUT', { showConsolidated: true })}>Consolidado</button></div>}
    </div>
  </section>
}

export function ProjectedConsolidation({ groups }: { groups: ConsolidationGroup[] }) {
  const [selected, setSelected] = useState(0)
  const group = groups[Math.min(selected, Math.max(0, groups.length - 1))]
  return <section className="projected-responses projected-consolidation">
    <div className="projection-response-heading"><span>Síntesis del grupo</span><span>{group?.responseIds.length ?? 0} aportaciones</span></div>
    <div className="projected-consolidation-copy"><p className="section-label">Tema {selected + 1}</p><h2>{group?.title}</h2><p>{group?.summary}</p></div>
    <nav className="projection-pagination" aria-label="Temas consolidados"><button className="secondary-button" disabled={selected === 0} onClick={() => setSelected(value => value - 1)}>Anterior</button><span role="status">{groups.length ? selected + 1 : 0} / {groups.length}</span><button className="secondary-button" disabled={selected >= groups.length - 1} onClick={() => setSelected(value => value + 1)}>Siguiente</button></nav>
  </section>
}

import { useEffect, useMemo, useState } from 'react'
import { CheckSquare, Plus, X } from 'lucide-react'
import { api } from '../lib/api'
import type { QuestionOption, SessionSnapshot } from '../types'

type Candidate = QuestionOption & { selected: boolean }

function sourceCandidates(snapshot: SessionSnapshot): Candidate[] {
  const source = snapshot.consolidation?.status === 'Published' && snapshot.consolidation.groups.length
    ? snapshot.consolidation.groups.map(group => ({ id: `grupo-${group.id}`, label: group.title }))
    : snapshot.options.length
      ? snapshot.options.map(option => ({ id: `opcion-${option.id}`, label: option.label }))
      : snapshot.responses.map(response => ({ id: `respuesta-${response.id}`, label: response.value }))
  const seen = new Set<string>()
  return source.filter(item => {
    const normalized = item.label.trim().toLocaleLowerCase('es')
    if (!normalized || seen.has(normalized)) return false
    seen.add(normalized); return true
  }).slice(0, 12).map(item => ({ ...item, selected: true }))
}

export function VoteFromResults({ snapshot, disabled, onCreated }: { snapshot: SessionSnapshot; disabled: boolean; onCreated: (next: SessionSnapshot) => void }) {
  const initial = useMemo(() => sourceCandidates(snapshot), [snapshot])
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState(`¿Qué opción debería orientar el siguiente paso?`)
  const [candidates, setCandidates] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { if (!open) setCandidates(initial) }, [initial, open])
  if (snapshot.questionKind === 'Voting' || snapshot.questionKind === 'Presentation' || initial.length < 2) return null
  const selected = candidates.filter(candidate => candidate.selected && candidate.label.trim())
  async function create() {
    setBusy(true); setError('')
    try {
      const next = await api<SessionSnapshot>(`/api/sessions/${snapshot.id}/voting-rounds`, {
        method: 'POST', body: JSON.stringify({ sourceQuestionId: snapshot.activeQuestionId, title: title.trim(), options: selected.map(({ label }, index) => ({ id: `voto-${index + 1}-${crypto.randomUUID().slice(0, 8)}`, label: label.trim() })) }),
      })
      onCreated(next)
    } catch (reason) { setError((reason as Error).message) }
    finally { setBusy(false) }
  }
  return <section className="vote-builder">
    {!open ? <button className="secondary-button" disabled={disabled} onClick={() => setOpen(true)}><CheckSquare size={17} />Crear votación con estos resultados</button> : <>
      <div className="vote-builder-head"><div><p className="section-label">Siguiente dinámica</p><h3>Convertir resultados en una decisión</h3></div><button className="icon-button" aria-label="Cerrar creador de votación" onClick={() => setOpen(false)}><X size={17} /></button></div>
      <label>Pregunta de votación<input maxLength={300} value={title} onChange={event => setTitle(event.target.value)} /></label>
      <div className="vote-candidates">{candidates.map((candidate, index) => <label key={candidate.id} className={candidate.selected ? 'vote-candidate vote-candidate--selected' : 'vote-candidate'}><input type="checkbox" checked={candidate.selected} onChange={event => setCandidates(current => current.map((item, i) => i === index ? { ...item, selected: event.target.checked } : item))} /><input aria-label={`Opción ${index + 1}`} maxLength={240} value={candidate.label} disabled={!candidate.selected} onChange={event => setCandidates(current => current.map((item, i) => i === index ? { ...item, label: event.target.value } : item))} /></label>)}</div>
      {candidates.length < 12 && <button className="text-button" onClick={() => setCandidates(current => [...current, { id: `manual-${crypto.randomUUID()}`, label: '', selected: true }])}><Plus size={15} />Añadir opción</button>}
      {error && <p className="micro-error" role="alert">{error}</p>}
      <div className="action-row"><button className="secondary-button" disabled={busy} onClick={() => setOpen(false)}>Cancelar</button><button className="primary-button" disabled={disabled || busy || !title.trim() || selected.length < 2} onClick={() => void create()}>{busy ? 'Creando…' : `Crear votación · ${selected.length} opciones`}</button></div>
    </>}
  </section>
}

export function VotingResults({ options, responses, projected = false }: { options: QuestionOption[]; responses: SessionSnapshot['responses']; projected?: boolean }) {
  const total = responses.length
  const results = options.map(option => ({ ...option, count: responses.filter(response => response.value === option.label).length }))
    .sort((a, b) => b.count - a.count)
  return <section className={projected ? 'projected-responses voting-results voting-results--projected' : 'voting-results'}>
    {projected && <div className="projection-response-heading"><span>Votación del grupo</span><span>{total} votos</span></div>}
    <div className="voting-result-list">{results.map((result, index) => <article key={result.id}><div><span>{index + 1}</span><strong>{result.label}</strong><b>{result.count}</b></div><div className="vote-meter"><span style={{ transform: `scaleX(${total ? result.count / total : 0})` }} /></div></article>)}</div>
  </section>
}

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { api } from '../lib/api'
import { label } from '../lib/session'
import type { TemplateDraft } from '../types'
import './TemplateAssistant.css'

type Message = { role: 'user' | 'assistant'; content: string }
type Proposal = { message: string; draft: TemplateDraft | null }
type Pending = { draft: TemplateDraft; revision: string; scope: string }
type Props = { draft: TemplateDraft; sectionKey?: string; questionKey?: string; onApply: (draft: TemplateDraft) => void; hidden: boolean }

export function TemplateAssistant({ draft, sectionKey, questionKey, onApply, hidden }: Props) {
  const [available, setAvailable] = useState<boolean | null>(null)
  const [capabilityError, setCapabilityError] = useState('')
  const [history, setHistory] = useState<Message[]>([])
  const [instruction, setInstruction] = useState('')
  const [duration, setDuration] = useState('60')
  const [scope, setScope] = useState('template')
  const [pending, setPending] = useState<Pending | null>(null)
  const [undo, setUndo] = useState<{ before: TemplateDraft; after: string } | null>(null)
  const [confirmUndo, setConfirmUndo] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const controller = useRef<AbortController | null>(null)
  const instructionInput = useRef<HTMLTextAreaElement>(null)
  const conversationPanel = useRef<HTMLDivElement>(null)
  const revision = JSON.stringify(draft)
  const stale = pending !== null && pending.revision !== revision
  const workingDraft = pending && !stale ? pending.draft : draft
  const selectedSection = workingDraft.sections.find(s => s.key === sectionKey) ?? workingDraft.sections[0]
  const selectedQuestion = selectedSection?.questions.find(q => q.key === questionKey) ?? selectedSection?.questions[0]
  async function loadAvailability() {
    setCapabilityError('')
    try { setAvailable((await api<{ available: boolean }>('/api/templates/assistant/capabilities')).available) }
    catch (reason) { setCapabilityError((reason as Error).message) }
  }
  useEffect(() => { void loadAvailability(); return () => controller.current?.abort() }, [])
  useEffect(() => { if (conversationPanel.current) conversationPanel.current.scrollTop = conversationPanel.current.scrollHeight }, [history])
  async function generate(event: FormEvent) {
    event.preventDefault()
    if (busy || !instruction.trim()) return
    const requestController = new AbortController()
    controller.current = requestController
    setBusy(true); setError(''); setNotice('')
    const currentRevision = revision
    const input = instruction.trim()
    // Refinements use the last unapplied proposal, unless manual edits made it stale.
    const base = pending && !stale ? pending.draft : draft
    const conversation = history.slice(-18)
    setHistory([...conversation, { role: 'user', content: input }]); setInstruction('')
    try {
      const response = await api<Proposal>('/api/templates/assistant', {
        method: 'POST', signal: requestController.signal,
        body: JSON.stringify({ instruction: `Duración orientativa del taller: ${duration} minutos. ${input}`, history: conversation, draft: base, scope, sectionKey: selectedSection?.key, questionKey: selectedQuestion?.key }),
      })
      if (requestController.signal.aborted) return
      setHistory([...conversation, { role: 'user', content: input }, { role: 'assistant', content: response.message }])
      if (response.draft) setPending({ draft: response.draft, revision: currentRevision, scope })
    } catch (reason) {
      if (requestController.signal.aborted) setNotice('Generación cancelada. Tu borrador se conserva.')
      else { setError((reason as Error).message); setInstruction(input) }
    } finally { setBusy(false); controller.current = null }
  }
  function apply() {
    if (!pending || stale) return
    setUndo({ before: structuredClone(draft), after: JSON.stringify(pending.draft) }); setConfirmUndo(false)
    onApply(pending.draft); setPending(null); setNotice('Propuesta aplicada al borrador. Guarda la plantilla cuando esté lista.')
  }
  function revert() {
    if (!undo) return
    if (undo.after !== revision && !confirmUndo) { setConfirmUndo(true); return }
    onApply(undo.before); setUndo(null); setPending(null); setConfirmUndo(false); setNotice('Se ha recuperado el borrador anterior.')
  }
  return <aside className="template-assistant" hidden={hidden} aria-label="Asistente de diseño">
    <header><p className="section-label">Diseño asistido</p><h2>Del objetivo a la conversación</h2><p>Describe el taller. Revisaremos la propuesta antes de incorporarla al editor.</p></header>
    <p className="micro-copy">Se envían al proveedor de IA el borrador y esta conversación. El chat no se guarda en FrameIt al salir.</p>
    {capabilityError && <p role="alert">{capabilityError} <button type="button" className="secondary-button" onClick={() => void loadAvailability()}>Reintentar conexión</button></p>}
    {available === false && <p role="status">El asistente aún no está configurado. Puedes seguir diseñando manualmente.</p>}
    {available === null && !capabilityError && <p role="status">Comprobando disponibilidad…</p>}
    <div ref={conversationPanel} className="assistant-conversation" role="log" aria-label="Conversación con el asistente" aria-live="polite">{history.map((m, i) => <article key={i} className={`assistant-message assistant-message--${m.role}`}><strong>{m.role === 'user' ? 'Tú' : 'Asistente'}</strong><p>{m.content}</p></article>)}</div>
    <form onSubmit={event => void generate(event)}>
      <label>Aplicar el ajuste a<select value={scope} onChange={event => setScope(event.target.value)} disabled={busy}>
        <option value="template">Toda la dinámica</option><option value="section" disabled={!sectionKey}>Bloque seleccionado</option><option value="question" disabled={!questionKey}>Pregunta seleccionada</option>
      </select></label>
      <p className="micro-copy">{scope === 'template' ? workingDraft.title : scope === 'section' ? selectedSection?.title : selectedQuestion?.title}</p>
      {history.length === 0 && <><label>Objetivo del taller<textarea rows={2} required maxLength={6000} disabled={busy} value={draft.objective} onChange={e => onApply({ ...draft, objective: e.target.value })} /></label><label>Audiencia del taller<input required maxLength={2000} disabled={busy} value={draft.audience} onChange={e => onApply({ ...draft, audience: e.target.value })} /></label><label>Duración orientativa (minutos)<input type="number" min="5" max="1440" required value={duration} disabled={busy} onChange={e => setDuration(e.target.value)} /></label></>}
      <label>{history.length ? '¿Qué quieres ajustar?' : 'Contexto del taller'}<textarea ref={instructionInput} rows={4} maxLength={5800} required value={instruction} disabled={busy || !available} onChange={e => setInstruction(e.target.value)} placeholder="Por ejemplo: un equipo de 12 personas debe priorizar mejoras de su intranet. Necesitamos terminar con tres acuerdos." /></label>
      <div className="action-row"><button className="primary-button" disabled={busy || !available || !instruction.trim()}>{busy ? 'Preparando propuesta…' : history.length ? 'Pedir ajuste' : 'Generar propuesta'}</button>{busy && <button className="secondary-button" type="button" onClick={() => controller.current?.abort()}>Cancelar generación</button>}</div>
    </form>
    {error && <p className="error-banner" role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    {pending && <section className="assistant-proposal" aria-label="Propuesta pendiente"><p className="section-label">Propuesta · {pending.scope === 'template' ? 'Dinámica completa' : pending.scope === 'section' ? 'Bloque' : 'Pregunta'}</p><h3>{pending.draft.title}</h3><p>{pending.draft.objective}</p><p>{pending.draft.audience}</p><p className="assistant-guidance">{pending.draft.facilitatorGuidance}</p>
      {pending.draft.sections.map(s => <details key={s.key} open><summary>{s.title} · {s.questions.length} {s.questions.length === 1 ? 'pregunta' : 'preguntas'}</summary><p>{s.objective}</p>{s.questions.map(q => <article key={q.key}><h4>{q.title}</h4><p>{q.prompt}</p><p className="micro-copy">{label(q.kind)} · {q.presentation.timerSeconds}s · {label(q.presentation.responseVisibility)} · {label(q.presentation.responseIdentityMode)}</p>{q.options.length > 0 && <ul>{q.options.map(o => <li key={o.id}>{o.label}{o.description ? ` — ${o.description}` : ''}</li>)}</ul>}</article>)}</details>)}
      {stale && <p role="alert">El borrador ha cambiado. Pide una nueva propuesta para incorporar tus últimos cambios.</p>}
      <div className="action-row"><button className="primary-button" type="button" disabled={busy || stale} onClick={apply}>Aplicar al borrador</button><button className="secondary-button" type="button" disabled={busy} onClick={() => { setPending(null); setNotice('Propuesta descartada. El borrador no ha cambiado.') }}>Descartar</button><button className="secondary-button" type="button" disabled={busy} onClick={() => instructionInput.current?.focus()}>Seguir ajustando</button></div>
    </section>}
    {undo && <div className="assistant-undo">{confirmUndo && <p role="alert">Hay cambios manuales posteriores. Recuperar el borrador anterior también los descartará.</p>}<button type="button" className="secondary-button" disabled={busy} onClick={revert}>{confirmUndo ? 'Confirmar recuperación' : 'Deshacer aplicación'}</button>{confirmUndo && <button type="button" className="secondary-button" onClick={() => setConfirmUndo(false)}>Conservar cambios</button>}</div>}
  </aside>
}

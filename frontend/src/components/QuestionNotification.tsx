import { useEffect, useRef, useState } from 'react'
import { Bell, MessageSquare, X } from 'lucide-react'
import { readSession, writeSession } from '../lib/storage'
import type { SessionSnapshot } from '../types'

type Inbox = { initialized: boolean; seen: string[]; pending: string[] }

export function QuestionNotification({ sessionId, snapshot }: { sessionId: string; snapshot: SessionSnapshot | null }) {
  const storageKey = `frameit.question-notifications:${sessionId}`
  const [inbox, setInbox] = useState(() => readSession<Inbox>(storageKey, { initialized: false, seen: [], pending: [] }))
  const [observed, setObserved] = useState<SessionSnapshot['questionsToFacilitator'] | null>(null)
  const entryButton = useRef<HTMLButtonElement>(null)
  const questions = snapshot?.id === sessionId ? snapshot.questionsToFacilitator : null

  // Track IDs, not array length: replacement/removal and repeated snapshots are harmless.
  // Keep the baseline across temporary null snapshots during reconnection.
  if (questions && questions !== observed) {
    const ids = questions.map(question => question.id)
    const seen = new Set(inbox.seen)
    const added = inbox.initialized ? ids.filter(id => !seen.has(id)) : []
    const current = new Set(ids)
    setObserved(questions)
    setInbox({ initialized: true, seen: [...new Set([...inbox.seen, ...ids])], pending: [...new Set([...inbox.pending, ...added])].filter(id => current.has(id)) })
  }
  useEffect(() => { writeSession(storageKey, inbox) }, [storageKey, inbox])

  const available = questions !== null
  useEffect(() => {
    if (!available) return
    const details = document.querySelector<HTMLDetailsElement>('#facilitator-questions details')
    const markRead = () => { if (details?.open) setInbox(current => current.pending.length ? { ...current, pending: [] } : current) }
    details?.addEventListener('toggle', markRead)
    return () => details?.removeEventListener('toggle', markRead)
  }, [available])

  function openQuestions() {
    const details = document.querySelector<HTMLDetailsElement>('#facilitator-questions details')
    if (!details) return
    details.open = true
    details.querySelector('summary')?.focus()
    details.scrollIntoView({ block: 'start', behavior: 'instant' })
    setInbox(current => ({ ...current, pending: [] }))
  }
  const count = questions ? inbox.pending.length : 0
  const message = count === 1 ? 'Nueva pregunta del grupo' : `${count} preguntas nuevas del grupo`
  return <>
    <button ref={entryButton} className="secondary-button" disabled={!questions} onClick={openQuestions}><MessageSquare size={17} aria-hidden="true" />Preguntas ({questions?.length ?? 0}){count > 0 && <span className="question-notification-badge">{count} {count === 1 ? 'nueva' : 'nuevas'}</span>}</button>
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{count > 0 ? message : ''}</div>
    {count > 0 && <aside className="question-notification" aria-label="Aviso de preguntas nuevas">
      <Bell size={20} aria-hidden="true" />
      <div><strong>{message}</strong><p>Hay dudas pendientes de consultar en esta sesión.</p><button className="primary-button" onClick={openQuestions}>Ver preguntas</button></div>
      <button className="question-notification-dismiss" aria-label="Descartar aviso de preguntas" onClick={() => { setInbox(current => ({ ...current, pending: [] })); entryButton.current?.focus() }}><X size={20} aria-hidden="true" /></button>
    </aside>}
  </>
}

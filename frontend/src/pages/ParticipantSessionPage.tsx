import { ParticipationPrivacyNotice } from '../components/LegalFooter'
import { Brand } from '../components/Brand'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Check, ArrowRight, LockKeyhole } from 'lucide-react'
import { api, formatBytes, getTimeRemaining } from '../lib/api'
import { formatTime, privacyText, label, hasAnswerOptions } from '../lib/session'
import { readSession, writeSession, clearParticipantStorage } from '../lib/storage'
import { useSessionLive } from '../hooks/useSessionLive'
import { ConnectionNotice, Disclosure, ErrorNotice, PhaseBadge } from '../components/SessionUI'
import type { SessionSnapshot } from '../types'
import { QuestionContext } from '../components/QuestionContext'
import { SessionConfetti } from '../components/SessionConfetti'

type Identity = { id: string; alias: string; sessionId: string; confirmedAt: string }
const ratings = ['Muy mala', 'Mejorable', 'Correcta', 'Buena', 'Excelente']

function AnswerForm({ snapshot, identity, connected, onSnapshot }: { snapshot: SessionSnapshot; identity: Identity; connected: boolean; onSnapshot: (next: SessionSnapshot) => void }) {
  const storageKey = `frameit.answer:${snapshot.id}:${identity.id}:${snapshot.activeQuestionId}`
  const [draft, setDraft] = useState(() => readSession(storageKey, { value: '', sent: false, editing: false }))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  function update(patch: Partial<typeof draft>) { setDraft(current => { const next = { ...current, ...patch }; writeSession(storageKey, next); return next }) }
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (busy || !connected || !snapshot.roundOpen || !draft.value.trim()) return
    const questionId = snapshot.activeQuestionId
    const value = draft.value.trim()
    setBusy(true); setError('')
    try {
      const next = await api<SessionSnapshot>(`/api/sessions/${snapshot.id}/responses`, { method: 'POST', body: JSON.stringify({ participantId: identity.id, questionId, value }) })
      writeSession(storageKey, { value, sent: true, editing: false })
      onSnapshot(next)
      if (mounted.current) setDraft({ value, sent: true, editing: false })
    } catch (reason) { if (mounted.current) setError((reason as Error).message) }
    finally { if (mounted.current) setBusy(false) }
  }
  return <div className="answer-zone">
    <ErrorNotice message={error} />
    {draft.sent && !draft.editing ? <section className="answer-receipt"><div className="receipt-mark"><Check size={24} /></div><h3 role="status">Tu respuesta está guardada</h3><p className="submitted-answer">{draft.value}</p><p className="muted-copy">{snapshot.roundOpen ? 'Puedes cambiarla mientras la ronda esté abierta.' : 'Espera las indicaciones del facilitador.'}</p>{snapshot.roundOpen && <button className="secondary-button" onClick={() => update({ editing: true })}>Editar respuesta</button>}</section>
    : snapshot.roundOpen ? <form onSubmit={submit} className="answer-form">
      {hasAnswerOptions(snapshot.questionKind) && snapshot.options.length > 0 && <fieldset className="answer-options"><legend>Elige una opción</legend>{snapshot.options.map(option => <label className={draft.value === option.label ? 'option-radio option-radio--selected' : 'option-radio'} key={option.id}><input type="radio" name="answer-option" checked={draft.value === option.label} onChange={() => update({ value: option.label })} disabled={busy} /><span>{option.label}</span></label>)}</fieldset>}
      <label>{hasAnswerOptions(snapshot.questionKind) && snapshot.options.length ? 'Tu respuesta · puedes matizar la opción' : 'Tu respuesta'}<textarea autoFocus rows={4} value={draft.value} disabled={busy} onChange={e => update({ value: e.target.value })} placeholder="Comparte tu idea con el grupo…" /></label>
      <div className="answer-submit"><button className="primary-button" disabled={busy || !connected || !draft.value.trim()}>{busy ? 'Enviando…' : draft.sent ? 'Guardar cambios' : 'Enviar respuesta'}<ArrowRight size={18} /></button><span className="micro-copy">{connected ? 'Tu borrador se guarda en este dispositivo.' : 'Reconecta para enviar. Tu borrador se conserva.'}</span></div>
    </form> : <div className="waiting-message" role="status"><span className="waiting-orbit" aria-hidden="true" /><h3>{snapshot.phase === 'Lobby' ? 'Ya estás dentro' : snapshot.phase === 'Results' ? 'Es momento de compartir' : snapshot.roundOpenedAtUtc ? 'Ronda cerrada' : 'La ronda está en espera'}</h3><p>{snapshot.phase === 'Lobby' ? 'El facilitador abrirá la primera pregunta. Mantén esta pantalla abierta.' : snapshot.phase === 'Results' ? 'Revisa los resultados con el grupo.' : 'El facilitador indicará el siguiente paso.'}</p>{draft.value && !draft.sent && <p className="draft-retained">Tu borrador sigue guardado para esta pregunta.</p>}</div>}
    <p className="privacy-note"><LockKeyhole size={14} />{privacyText(snapshot)}</p>
  </div>
}

type FeedbackReceipt = { submitted: boolean; canSubmit: boolean }
function Survey({ snapshot, participantId, connected, onSnapshot }: { snapshot: SessionSnapshot; participantId: string; connected: boolean; onSnapshot: (s: SessionSnapshot) => void }) {
  const key = `frameit.answer:${snapshot.id}:${participantId}:survey`
  const statusUrl = `/api/sessions/${snapshot.id}/feedback-status?participantId=${encodeURIComponent(participantId)}`
  const [data, setData] = useState(() => readSession(key, { rating: 0, comment: '' }))
  const [receipt, setReceipt] = useState<FeedbackReceipt | null>(null)
  const [acknowledged, setAcknowledged] = useState(false)
  const [revision, setRevision] = useState(0)
  const [checkingError, setCheckingError] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [showThanks, setShowThanks] = useState(false)
  const sending = useRef(false)
  const thanksDialog = useRef<HTMLDialogElement>(null)
  const receiptHeading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    const controller = new AbortController()
    void api<FeedbackReceipt>(statusUrl, { signal: controller.signal, cache: 'no-store' }).then(next => {
      if (controller.signal.aborted) return
      setReceipt(next); setCheckingError('')
      if (next.submitted) setAcknowledged(true)
    }).catch(reason => { if (!controller.signal.aborted) { setReceipt(null); setCheckingError(reason.message) } })
    return () => controller.abort()
  }, [statusUrl, snapshot.satisfactionSurvey.responseCount, revision])
  useEffect(() => {
    if (showThanks && !thanksDialog.current?.open) thanksDialog.current?.showModal()
  }, [showThanks])
  function update(patch: Partial<typeof data>) {
    if (acknowledged || receipt?.submitted || sending.current) return
    setData(current => { const next = { ...current, ...patch }; writeSession(key, next); return next })
  }
  const submitted = acknowledged || receipt?.submitted
  return <>
    {submitted ? <section className="answer-receipt"><div className="receipt-mark"><Check size={24} /></div><h3 ref={receiptHeading} tabIndex={-1}>Tu valoración ya está registrada</h3><p>Gracias por participar. Solo se admite una valoración por participante y sesión.</p></section>
    : !receipt ? <section aria-live="polite">{checkingError ? <><ErrorNotice message={checkingError} /><button type="button" className="secondary-button" onClick={() => setRevision(value => value + 1)}>Comprobar valoración</button></> : <p role="status">Comprobando si ya has valorado…</p>}</section>
    : !receipt.canSubmit ? <section className="waiting-message"><h3>Valoración cerrada</h3><p>Ya no se admiten valoraciones en esta sesión.</p></section>
    : <form className="participant-survey" onSubmit={async event => {
      event.preventDefault()
      if (sending.current || !connected || !data.rating || submitted || !receipt.canSubmit || snapshot.status === 'Closed' || !snapshot.satisfactionSurveyOpen) return
      sending.current = true; setBusy(true); setError('')
      try {
        const next = await api<SessionSnapshot>(`/api/sessions/${snapshot.id}/feedback`, { method: 'POST', body: JSON.stringify({ participantId, rating: data.rating, comment: data.comment.trim() || null }) })
        setAcknowledged(true); setReceipt({ submitted: true, canSubmit: false }); setShowThanks(true); onSnapshot(next)
      } catch (reason) {
        setError((reason as Error).message)
        try {
          const next = await api<FeedbackReceipt>(statusUrl, { cache: 'no-store' })
          setReceipt(next)
          if (next.submitted) { setAcknowledged(true); setError('') }
        } catch { setReceipt(null); setCheckingError('No se pudo comprobar el envío. Comprueba el estado antes de volver a intentarlo.') }
      } finally { sending.current = false; setBusy(false) }
    }}>
      <fieldset disabled={busy}><legend>¿Cómo ha sido la sesión?</legend><div className="rating-options">{ratings.map((text, i) => <label key={text} className={data.rating === i + 1 ? 'rating-option rating-option--selected' : 'rating-option'}><input type="radio" name="rating" value={i + 1} checked={data.rating === i + 1} onChange={() => update({ rating: i + 1 })} /><strong>{i + 1}</strong><span>{text}</span></label>)}</div></fieldset>
      <label>Comentario opcional<textarea rows={3} maxLength={2000} value={data.comment} onChange={event => update({ comment: event.target.value })} disabled={busy} placeholder="¿Qué te gustaría mejorar?" /></label>
      <p className="micro-copy">El facilitador podrá consultar tu puntuación y comentario, sin tu nombre.</p>
      <p className="micro-copy">Podrás enviar una sola valoración. Una vez enviada, no podrás modificarla.</p>
      <ErrorNotice message={error} /><button className="primary-button" disabled={busy || !connected || !data.rating}>{busy ? 'Guardando…' : 'Enviar valoración'}</button>
    </form>}
    <dialog ref={thanksDialog} className="survey-thanks-dialog" aria-labelledby="survey-thanks-title" aria-describedby="survey-thanks-description" onClose={() => { setShowThanks(false); receiptHeading.current?.focus() }}>
      <div className="receipt-mark" aria-hidden="true"><Check size={28} /></div><p className="section-label">Valoración guardada</p>
      <h2 id="survey-thanks-title">Gracias por participar</h2><p id="survey-thanks-description">Tu opinión nos ayuda a mejorar las próximas sesiones. Gracias por compartir tu tiempo y tus ideas.</p>
      <button autoFocus type="button" className="primary-button" onClick={() => thanksDialog.current?.close()}>Volver a la sesión</button>
    </dialog>
  </>
}

export function ParticipantSessionPage() {
  const { code = '' } = useParams()
  return <ParticipantSession key={code} code={code} />
}

function ParticipantSession({ code }: { code: string }) {
  const { snapshot, setSnapshot, error, setError, connectionState, retry } = useSessionLive({ kind: 'participant', code })
  const identityKey = `frameit.participant:${code}`
  const [identity, setIdentity] = useState<Identity | null>(() => readSession(identityKey, null))
  const [alias, setAlias] = useState('')
  const [busy, setBusy] = useState(false)
  const [joining, setJoining] = useState(false)
  const [removed, setRemoved] = useState(false)
  const [question, setQuestion] = useState('')
  const [questionError, setQuestionError] = useState('')
  const [questionContext, setQuestionContext] = useState<{ questionId: string; openedAt: string | null; title: string } | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const [notice, setNotice] = useState('')
  const [tick, setTick] = useState(Date.now)
  useEffect(() => { const timer = setInterval(() => setTick(Date.now()), 1000); return () => clearInterval(timer) }, [])
  const validIdentity = identity && snapshot?.id === identity.sessionId && snapshot.participants.some(p => p.id === identity.id)
  useEffect(() => {
    if (!identity || !snapshot || joining || Date.parse(snapshot.updatedAtUtc) < Date.parse(identity.confirmedAt)) return
    if (snapshot.id !== identity.sessionId || !snapshot.participants.some(p => p.id === identity.id)) {
      writeSession(identityKey, null); clearParticipantStorage(identity.sessionId, identity.id)
      setIdentity(null); setRemoved(true)
    }
  }, [snapshot, identity, identityKey, joining])
  async function join(event: React.FormEvent) {
    event.preventDefault()
    if (!snapshot || !alias.trim() || joining) return
    setJoining(true); setError('')
    try {
      const result = await api<{ id: string }>(`/api/sessions/${snapshot.id}/join`, { method: 'POST', body: JSON.stringify({ displayName: alias.trim() }) })
      // Persist immediately so a failed refresh can recover without creating a second participant.
      const nextIdentity = { id: result.id, alias: alias.trim(), sessionId: snapshot.id, confirmedAt: new Date(Date.parse(snapshot.updatedAtUtc) + 1).toISOString() }
      writeSession(identityKey, nextIdentity)
      const next = await api<SessionSnapshot>(`/api/sessions/by-code/${code}`)
      nextIdentity.confirmedAt = next.updatedAtUtc
      setSnapshot(next); writeSession(identityKey, nextIdentity); setIdentity(nextIdentity); setRemoved(false)
    } catch (reason) { setError((reason as Error).message); const saved = readSession<Identity | null>(identityKey, null); if (saved) setIdentity(saved) }
    finally { setJoining(false) }
  }
  async function auxiliary(path: string, body: BodyInit) {
    if (busy) return
    setBusy(true); setError(''); setNotice(''); setQuestionError('')
    try { setSnapshot(await api<SessionSnapshot>(`/api/sessions/${snapshot!.id}/${path}`, { method: 'POST', body })); setNotice(path === 'questions' ? 'Pregunta enviada al facilitador.' : 'Archivo compartido.'); if (path === 'questions') setQuestion(''); else { setFile(null); if (fileInput.current) fileInput.current.value = '' } }
    catch (reason) { if (path === 'questions') setQuestionError((reason as Error).message); else setError((reason as Error).message) } finally { setBusy(false) }
  }
  const closed = snapshot?.status === 'Closed' || snapshot?.phase === 'WrapUp'
  const survey = snapshot && !closed && snapshot.satisfactionSurveyOpen
  const connected = connectionState === 'connected'
  const ownQuestions = snapshot?.questionsToFacilitator.filter(item => item.participantName === identity?.alias) ?? []
  const currentQuestionContext = snapshot ? { questionId: snapshot.activeQuestionId, openedAt: snapshot.roundOpenedAtUtc ?? null, title: `${snapshot.sectionTitle} · ${snapshot.questionTitle}` } : null
  const questionRoundChanged = questionContext && currentQuestionContext && (questionContext.questionId !== currentQuestionContext.questionId || questionContext.openedAt !== currentQuestionContext.openedAt)
  async function associateCurrentRound() {
    setBusy(true)
    try {
      const latest = await api<SessionSnapshot>(`/api/sessions/by-code/${code}`)
      setSnapshot(latest)
      setQuestionContext({ questionId: latest.activeQuestionId, openedAt: latest.roundOpenedAtUtc ?? null, title: `${latest.sectionTitle} · ${latest.questionTitle}` })
      setQuestionError('')
    } catch (reason) { setQuestionError((reason as Error).message) } finally { setBusy(false) }
  }
  return <main className="participant-shell">
    <header className="participant-header"><Brand /><ConnectionNotice state={connectionState} retry={retry} /></header>
    <ErrorNotice message={error} retry={retry} />
    {!snapshot && error && <Link className="secondary-button" to="/join">Introducir otro código</Link>}
    {!snapshot && !error && <div className="loading-state" role="status">Buscando tu sesión…</div>}
    {snapshot?.isArchived && <section className="join-surface"><h1>Sesión archivada</h1><p>Esta sesión está en consulta y no admite participación. Contacta con el facilitador si necesitas retomarla.</p><Link className="secondary-button" to="/join">Entrar en otra sesión</Link></section>}
    {snapshot && !snapshot.isArchived && closed && <section className="join-surface session-closing-surface"><SessionConfetti /><p className="section-label">{snapshot.title}</p><h1>Sesión finalizada</h1><p>Gracias por participar. La valoración está cerrada y ya no se admiten envíos.</p><Link className="secondary-button" to="/join">Entrar en otra sesión</Link></section>}
    {snapshot && !snapshot.isArchived && !closed && <>
      {!validIdentity ? <section className="join-surface"><p className="section-label">Te damos la bienvenida</p><h1>{snapshot.title}</h1><p className="join-subtitle">{snapshot.templateTitle}</p>
        {removed && <p className="error-banner" role="alert">El facilitador te ha sacado de la sesión. Consulta con él antes de volver a entrar.</p>}
        {identity ? <div role="status"><p>Recuperando tu participación…</p><button className="secondary-button" onClick={retry}>Reintentar</button></div> : <form className="join-form" onSubmit={join}><label>Tu nombre o alias<input autoFocus autoComplete="nickname" maxLength={80} value={alias} onChange={e => setAlias(e.target.value)} placeholder="Cómo quieres aparecer" disabled={joining} /></label><button className="primary-button" disabled={joining || !alias.trim()}>{joining ? 'Entrando…' : 'Entrar a la sesión'}<ArrowRight size={18} /></button></form>}
        <ParticipationPrivacyNotice />
        <p className="join-footnote">Sin cuentas ni instalaciones. Código <strong>{snapshot.accessCode}</strong></p>
      </section> : <>
        <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{label(snapshot.phase)}. {snapshot.questionTitle}</p><header className="participant-context"><span>{snapshot.title}</span><span>{identity!.alias}</span></header>
        <section className="participant-task">
          <div className="participant-task-status"><PhaseBadge phase={snapshot.phase} />{snapshot.roundOpen && !survey && <strong className="participant-clock" aria-label="Tiempo restante">{formatTime(getTimeRemaining(snapshot.timerSeconds, snapshot.roundOpen, snapshot.roundOpenedAtUtc, tick))}</strong>}</div>
          <div className="participant-question"><p className="section-label">{survey ? 'Tu opinión cuenta' : `${snapshot.sectionTitle} · ${snapshot.questionIndex}/${snapshot.questionCount}`}</p><h1>{survey ? '¿Qué te llevas de hoy?' : snapshot.phase === 'Lobby' ? 'Todo listo para empezar' : snapshot.questionTitle}</h1>{snapshot.phase !== 'Lobby' && <p>{survey ? 'Ayúdanos a mejorar el próximo taller.' : snapshot.questionPrompt}</p>}</div>
          {survey ? <Survey key={identity!.id} snapshot={snapshot} participantId={identity!.id} connected={connected} onSnapshot={setSnapshot} /> : snapshot.questionKind === 'Presentation' ? <div className="waiting-message" role="status"><h3>El facilitador está presentando</h3><p>Presta atención a la pantalla de la sala. La siguiente pregunta aparecerá aquí cuando esté lista.</p></div> : <AnswerForm key={`${snapshot.id}:${identity!.id}:${snapshot.activeQuestionId}`} snapshot={snapshot} identity={identity!} connected={connected} onSnapshot={setSnapshot} />}
          {!survey && snapshot.responses.length > 0 && <section className="participant-results"><h2>Ideas del grupo</h2><div className="response-list">{snapshot.responses.map(r => <article key={r.id}><span>{r.participantName}</span><p>{r.value}</p></article>)}</div></section>}
        </section>
        <section className="participant-tools"><Disclosure title="Preguntar al facilitador" count={ownQuestions.length}><form onSubmit={e => { e.preventDefault(); if (!question.trim() || !connected || questionRoundChanged) return; void auxiliary('questions', JSON.stringify({ participantId: identity!.id, question: question.trim(), expectedQuestionId: questionContext?.questionId, expectedRoundOpenedAtUtc: questionContext?.openedAt })) }}><label>Tu pregunta<textarea rows={3} maxLength={2000} disabled={busy} value={question} onChange={e => { setNotice(current => current === 'Pregunta enviada al facilitador.' ? '' : current); if (!question.trim() && e.target.value.trim()) setQuestionContext(currentQuestionContext); if (!e.target.value.trim()) setQuestionContext(null); setQuestion(e.target.value) }} /></label><button className="secondary-button" disabled={busy || !connected || !question.trim() || Boolean(questionRoundChanged)}>{busy ? 'Enviando…' : 'Enviar pregunta'}</button></form>{question.trim() && questionContext && <p className="micro-copy">Ronda de tu borrador: {questionContext.title}</p>}{question.trim() && (questionRoundChanged || questionError.includes("ronda")) && <div className="question-context-change"><p role="status">La ronda ha cambiado. Tu borrador se conserva; revisa si corresponde a la ronda actual.</p><button type="button" className="secondary-button" disabled={busy} onClick={() => void associateCurrentRound()}>Asociar borrador a la ronda actual</button></div>}<ErrorNotice message={questionError} />{notice === 'Pregunta enviada al facilitador.' && <p role="status" className="success-copy">{notice}</p>}<section className="participant-question-history" aria-labelledby="own-questions-title"><h2 id="own-questions-title">Tus preguntas ({ownQuestions.length})</h2>{ownQuestions.length ? <ol>{ownQuestions.map(item => <li key={item.id}><div><span>Enviada al facilitador</span><time dateTime={item.createdAtUtc}>{new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(item.createdAtUtc))}</time></div><QuestionContext context={item.roundContext} /><p>{item.question}</p></li>)}</ol> : <p className="muted-copy">Aquí aparecerán las preguntas que envíes durante esta sesión.</p>}</section></Disclosure>
          <Disclosure title="Archivos compartidos" count={snapshot.attachments.length}><form onSubmit={e => { e.preventDefault(); if (!file) return; const data = new FormData(); data.append('participantId', identity!.id); data.append('file', file); void auxiliary('attachments', data) }}><label>Selecciona un archivo<input ref={fileInput} type="file" onChange={e => setFile(e.target.files?.[0] ?? null)} /></label><button className="secondary-button" disabled={busy || !connected || !file}>Compartir archivo</button></form><div className="simple-list">{snapshot.attachments.map(a => <article key={a.id}><a href={a.url} target="_blank" rel="noreferrer">{a.fileName}</a><span>{a.uploadedBy} · {formatBytes(a.sizeBytes)}</span></article>)}</div></Disclosure>
          {notice && notice !== 'Pregunta enviada al facilitador.' && <p role="status" className="success-copy">{notice}</p>}
        </section>
      </>}
    </>}
  </main>
}

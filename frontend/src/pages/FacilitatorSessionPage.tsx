import { LifecycleActions } from '../components/LifecycleActions'
import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Play, Square, Eye, MonitorUp, Users, MessageSquare, Paperclip } from 'lucide-react'
import { useFacilitatorAuth } from '../hooks/useFacilitatorAuth'
import { api, formatBytes, getTimeRemaining } from '../lib/api'
import { formatTime, privacyText } from '../lib/session'
import { useSessionLive } from '../hooks/useSessionLive'
import { ConnectionNotice, CopyButton, Disclosure, ErrorNotice, PhaseBadge } from '../components/SessionUI'
import type { SessionAgendaSection, SessionSnapshot } from '../types'
import { useResource } from '../hooks/useResource'
import { projectPath, safeReturnPath, type WorkspaceSession } from '../lib/workspace'
import { Breadcrumbs } from '../components/WorkspaceDataUI'
import { QuestionContext } from '../components/QuestionContext'
import { QuestionNotification } from '../components/QuestionNotification'
import { SessionActionsMenu } from '../components/SessionActionsMenu'

export function FacilitatorSessionPage() {
  const { sessionId = '' } = useParams()
  const { auth, busy: authBusy, error: authError, login } = useFacilitatorAuth()
  const [params] = useSearchParams()
  const returnPath = safeReturnPath(params.get('returnTo'))
  const context = useResource<WorkspaceSession>(auth.isAuthenticated && !authBusy ? `/api/workspace/sessions/${sessionId}` : null)
  const { snapshot, setSnapshot, error, setError, connectionState, retry } = useSessionLive({ kind: 'facilitator', id: sessionId, authenticated: auth.isAuthenticated })
  const [agenda, setAgenda] = useState<SessionAgendaSection[]>([])
  const [busy, setBusy] = useState(false)
  const [tick, setTick] = useState(Date.now)
  const [confirmation, setConfirmation] = useState<{ text: string; action: () => Promise<void> } | null>(null)
  useEffect(() => { const t = window.setInterval(() => setTick(Date.now()), 1000); return () => clearInterval(t) }, [])
  useEffect(() => {
    if (!auth.isAuthenticated) return
    const controller = new AbortController()
    void api<SessionAgendaSection[]>(`/api/sessions/${sessionId}/agenda`, { signal: controller.signal }).then(setAgenda).catch(e => { if (!controller.signal.aborted) setError(e.message) })
    return () => controller.abort()
  }, [auth.isAuthenticated, sessionId, setError])

  async function mutate(path: string, body?: unknown, method = 'POST') {
    if (snapshot?.isArchived) return
    setBusy(true); setError('')
    try { setSnapshot(await api<SessionSnapshot>(`/api/sessions/${sessionId}/${path}`, { method, body: body === undefined ? undefined : JSON.stringify(body) })) }
    catch (reason) { setError((reason as Error).message) }
    finally { setBusy(false); setConfirmation(null) }
  }
  async function changePhase(phase: string, questionId = snapshot?.activeQuestionId, sectionId?: string) {
    await mutate('round-state', { phase, roundOpen: phase === 'RoundOpen', resultsVisible: phase === 'Results' || phase === 'WrapUp', activeQuestionId: questionId, activeSectionId: sectionId })
  }
  function selectQuestion(questionId: string, sectionId: string) {
    if (questionId === snapshot?.activeQuestionId) return
    setConfirmation({ text: 'Se preparará esta pregunta con la ronda cerrada. Las respuestas guardadas se conservan. ¿Cambiar de pregunta?', action: () => changePhase('Waiting', questionId, sectionId) })
  }
  async function downloadDocumentation() {
    setBusy(true); setError('')
    try {
      const response = await fetch(`/api/sessions/${sessionId}/documentation.pdf`, { credentials: 'include' })
      if (!response.ok) throw new Error('No se pudo generar el documento. Inténtalo de nuevo.')
      const url = URL.createObjectURL(await response.blob())
      const link = document.createElement('a'); link.href = url; link.download = 'documentacion-sesion.pdf'; link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (reason) { setError((reason as Error).message) } finally { setBusy(false) }
  }
  const questions = agenda.flatMap(s => s.questions.map(q => ({ ...q, sectionId: s.id })))
  const currentIndex = questions.findIndex(q => q.id === snapshot?.activeQuestionId)
  const nextQuestion = currentIndex >= 0 ? questions[currentIndex + 1] : undefined
  const canControl = !snapshot?.isArchived && auth.isAuthenticated && !authBusy && !busy && connectionState === 'connected'
  const time = getTimeRemaining(snapshot?.timerSeconds ?? 0, snapshot?.roundOpen ?? false, snapshot?.roundOpenedAtUtc, tick)
  const primary = !snapshot ? null : snapshot.phase === 'WrapUp' ? null
    : snapshot.roundOpen ? { text: 'Cerrar ronda', icon: Square, action: () => changePhase('Waiting') }
    : snapshot.phase === 'Lobby' || !snapshot.roundOpenedAtUtc ? { text: 'Abrir ronda', icon: Play, action: () => changePhase('RoundOpen') }
    : snapshot.phase === 'Results' ? nextQuestion
      ? { text: 'Siguiente pregunta', icon: ArrowRight, action: () => changePhase('Waiting', nextQuestion.id, nextQuestion.sectionId) }
      : { text: snapshot.satisfactionSurveyOpen ? 'Finalizar sesión' : 'Lanzar encuesta final', icon: ArrowRight, action: async () => {
        if (snapshot.satisfactionSurveyOpen) setConfirmation({ text: 'Se cerrará la sesión y ya no se admitirán valoraciones.', action: () => changePhase('WrapUp') })
        else await mutate('survey-state', { isOpen: true })
      } }
    : { text: 'Revelar resultados', icon: Eye, action: () => changePhase('Results') }

  return <main className="session-shell facilitator-session-shell">
    {snapshot?.isArchived && <section className="confirmation" role="status"><p>Sesión archivada. Puedes consultar los resultados y exportar la documentación. Restáurala para modificarla.</p><LifecycleActions kind="sessions" id={snapshot.id} name={snapshot.title} archived canDelete={snapshot.status === 'Draft'} onChanged={deleted => deleted ? window.location.assign(returnPath) : retry()} /></section>}
    <header className="live-header">
      <div className="live-heading"><Link to={returnPath} className="back-link"><ArrowLeft size={16} /> {returnPath.startsWith('/clientes/') ? 'Volver al proyecto' : returnPath === '/' ? 'Volver al inicio' : 'Volver al listado'}</Link>{context.data && <Breadcrumbs><Link to={`/clientes/${context.data.clientId}`}>{context.data.clientName}</Link><span aria-hidden="true">/</span><Link to={projectPath(context.data.clientId, context.data.projectId)}>{context.data.projectName} · {context.data.projectCode}</Link></Breadcrumbs>}<h1>{snapshot?.title ?? 'Consola de sesión'}</h1></div>
      <div className="action-row">{auth.isAuthenticated && <QuestionNotification key={sessionId} sessionId={sessionId} snapshot={snapshot} />}{snapshot && (snapshot.satisfactionSurveyOpen || snapshot.phase === 'WrapUp' || snapshot.satisfactionSurvey.responseCount > 0) && <a className="secondary-button" href="#survey-results-title">Valoraciones ({snapshot.satisfactionSurvey.responseCount})</a>}{snapshot && <a className="secondary-button" href={`/proyeccion/${snapshot.accessCode}`} target="_blank" rel="noreferrer"><MonitorUp size={17} /> Abrir proyección</a>}<ConnectionNotice state={connectionState} retry={retry} /></div>
    </header>
    {!auth.isAuthenticated && <div className="auth-notice"><span>Inicia sesión para conducir el taller.</span><button className="secondary-button" disabled={authBusy} onClick={() => void login()}>Entrar como facilitador</button></div>}
    <ErrorNotice message={error || authError} retry={retry} />
    {!snapshot && !error && <div className="loading-state" role="status">Preparando la sala…</div>}
    {snapshot && <>
      <div className="live-workbench">
        <aside className="session-agenda"><div className="panel-head"><h2>Agenda</h2><span className="meta-chip">{questions.length} preguntas</span></div>
          {agenda.length === 0 && <p className="muted-copy">{auth.isAuthenticated ? 'Cargando agenda…' : 'La agenda está disponible para el facilitador.'}</p>}
          {agenda.map((section, i) => <section className="agenda-section" key={section.id}><h3><span>{String(i + 1).padStart(2, '0')}</span>{section.title}</h3><ol>{section.questions.map(q => <li key={q.id}><button aria-current={q.id === snapshot.activeQuestionId ? 'step' : undefined} disabled={!canControl} onClick={() => selectQuestion(q.id, section.id)}>{q.title}</button></li>)}</ol></section>)}
        </aside>
        <section className="live-stage">
          <div className="live-stage-toolbar">
            <div className="live-stage-status"><PhaseBadge phase={snapshot.phase} /><span className="muted-copy">Bloque {snapshot.sectionIndex} de {snapshot.sectionCount} · Pregunta {snapshot.questionIndex} de {snapshot.questionCount}</span></div>
            <SessionActionsMenu key={sessionId} disabled={!canControl} actions={[
              { label: 'Volver a la sala de espera', run: () => void changePhase('Lobby') },
              { label: 'Reabrir ronda', run: () => void changePhase('RoundOpen') },
              { label: snapshot.satisfactionSurveyOpen ? 'Ocultar encuesta' : 'Lanzar encuesta', disabled: snapshot.status === 'Closed', run: () => void mutate('survey-state', { isOpen: !snapshot.satisfactionSurveyOpen }) },
              { label: 'Finalizar sesión', danger: true, disabled: snapshot.status === 'Closed', run: () => setConfirmation({ text: 'Se cerrará la sesión y ya no se admitirán valoraciones. Lanza la encuesta antes de finalizar si quieres recoger la opinión del grupo.', action: () => changePhase('WrapUp') }) },
            ]} />
          </div>
          {(snapshot.satisfactionSurveyOpen || snapshot.phase === 'WrapUp' || snapshot.satisfactionSurvey.responseCount > 0) && <section className="survey-results" aria-labelledby="survey-results-title">
            <div className="panel-head"><h2 id="survey-results-title" tabIndex={-1}>Valoraciones de la sesión</h2><span className="meta-chip">{auth.isAuthenticated ? 'Solo facilitador' : 'Resumen'}</span></div>
            <div className="survey-results-summary" role="status" aria-live="polite" aria-atomic="true">
              <strong>{snapshot.satisfactionSurvey.responseCount ? `${snapshot.satisfactionSurvey.averageRating.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} / 5` : 'Sin valoraciones'}</strong>
              <span>{snapshot.satisfactionSurvey.responseCount} {snapshot.satisfactionSurvey.responseCount === 1 ? 'valoración registrada' : 'valoraciones registradas'} · {snapshot.participants.length} participantes</span>
            </div>
            <p className="muted-copy">Las valoraciones quedan guardadas en esta sesión. {auth.isAuthenticated ? 'Las puntuaciones y los comentarios se muestran sin nombres.' : 'Inicia sesión como facilitador para consultar cada puntuación y comentario.'}</p>
            {!auth.isAuthenticated ? <button className="secondary-button" disabled={authBusy} onClick={() => void login()}>{authBusy ? 'Comprobando acceso…' : 'Consultar valoraciones'}</button> : snapshot.satisfactionSurvey.responseCount === 0 ? <p className="survey-results-empty">Las valoraciones aparecerán aquí a medida que el grupo las envíe.</p> : <ul className="survey-feedback-list" tabIndex={0} aria-label="Valoraciones recibidas">
              {(snapshot.satisfactionSurvey.responses ?? []).map(response => <li key={response.id}>
                <div><strong aria-label={`Puntuación: ${response.rating} de 5`}>{response.rating} / 5</strong><time dateTime={response.submittedAtUtc}>{new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(response.submittedAtUtc))}</time></div>
                <p>{response.comment || 'Sin comentario adicional.'}</p>
              </li>)}
            </ul>}
          </section>}

          <div className="live-question"><div><p className="section-label">{snapshot.sectionTitle}</p><h2>{snapshot.questionTitle}</h2><p>{snapshot.questionPrompt}</p></div><div className="live-timer"><span>{snapshot.roundOpen ? 'Tiempo restante' : 'Duración'}</span><strong>{formatTime(time)}</strong></div></div>
          {snapshot.roundOpen && <p className="muted-copy">La ronda se cerrará automáticamente al llegar a cero.</p>}
          {!snapshot.roundOpen && snapshot.phase === 'Waiting' && snapshot.roundOpenedAtUtc && <p role="status" className="success-copy">Ronda cerrada. Las respuestas se conservan; puedes revelar los resultados o reabrir la ronda.</p>}
          <div className="session-pulse"><span><Users size={18} /><strong>{snapshot.participants.length}</strong> participantes</span><span><strong>{snapshot.responseCount ?? snapshot.responses.length}</strong> respuestas recibidas</span><span><MessageSquare size={17} />{snapshot.questionsToFacilitator.length} dudas</span></div>
          <div className="command-bar">
            {primary && <button className="primary-button command-primary" disabled={!canControl} onClick={() => void primary.action()}><primary.icon size={19} />{busy ? 'Guardando…' : primary.text}</button>}
            {snapshot.phase === 'WrapUp' && <p role="status" className="success-copy">Sesión finalizada. La valoración está cerrada.</p>}

          </div>
          {confirmation && <div className="confirmation" role="alert"><p>{confirmation.text}</p><div className="action-row"><button autoFocus className="secondary-button" disabled={busy} onClick={() => setConfirmation(null)}>Cancelar</button><button className="primary-button" disabled={!canControl} onClick={() => void confirmation.action()}>Confirmar</button></div></div>}
          <p className="privacy-note">{privacyText(snapshot).replaceAll('tu respuesta', 'las respuestas').replaceAll('Tu respuesta', 'Las respuestas').replace('verá las respuestas', 'verá las respuestas').replace('se comparte', 'se comparten').replace('aparecerá', 'aparecerán').replace('Se mostrará', 'Se mostrarán').replace('tu nombre', 'el nombre de cada participante')}</p>
          {snapshot.phase === 'Lobby' ? <section className="lobby-share"><div className="access-qr" role="img" aria-label="Código QR para entrar a la sesión" dangerouslySetInnerHTML={{ __html: snapshot.qrSvg }} /><div><p className="section-label">Todo listo para empezar</p><h3>Invita al grupo</h3><strong className="access-code">{snapshot.accessCode}</strong><a className="access-url" href={snapshot.joinUrl} target="_blank" rel="noreferrer">{snapshot.joinUrl}</a><CopyButton value={snapshot.joinUrl} /></div></section>
            : <section className="response-section"><div className="panel-head"><h3>Respuestas del grupo</h3><span className="meta-chip">{snapshot.responseVisibility === 'FacilitatorOnly' ? 'Solo facilitador' : snapshot.resultsVisible || snapshot.responseVisibility === 'Live' ? 'Compartidas con el grupo' : 'Pendientes de publicar'}</span></div>
              {snapshot.responses.length ? <div className="response-list">{snapshot.responses.map(r => <article key={r.id}><span>{r.participantName}</span><p>{r.value}</p></article>)}</div> : <div className="empty-state"><strong>Aún no hay respuestas</strong><p>{snapshot.roundOpen ? 'El grupo puede responder desde su dispositivo.' : 'Abre la ronda para empezar a recoger ideas.'}</p></div>}
            </section>}
        </section>
      </div>
      <section className="session-resources">
        <Disclosure title="Participantes" count={snapshot.participants.length}><div className="simple-list">{snapshot.participants.map(p => <article className="participant-admin-row" key={p.id}><strong>{p.displayName}</strong><button className="danger-button" disabled={!canControl} onClick={() => setConfirmation({ text: `Se eliminará a ${p.displayName} y sus aportaciones de esta sesión. Esta acción no se puede deshacer.`, action: () => mutate(`participants/${p.id}`, undefined, 'DELETE') })}>Sacar de la sesión</button></article>)}</div></Disclosure>
        <div id="facilitator-questions"><Disclosure title="Preguntas del grupo" count={snapshot.questionsToFacilitator.length}>{snapshot.questionsToFacilitator.length ? <div className="response-list">{snapshot.questionsToFacilitator.map(q => <article key={q.id}><span>{q.participantName}</span><QuestionContext context={q.roundContext} /><time dateTime={q.createdAtUtc}>{new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(q.createdAtUtc))}</time><p>{q.question}</p></article>)}</div> : <p className="muted-copy">Las dudas del grupo aparecerán aquí.</p>}</Disclosure></div>
        <Disclosure title="Materiales y cierre" count={snapshot.attachments.length}><div className="simple-list">{snapshot.attachments.map(a => <article key={a.id}><a href={a.url} target="_blank" rel="noreferrer"><Paperclip size={15} /> {a.fileName}</a><span>{a.uploadedBy} · {formatBytes(a.sizeBytes)}</span></article>)}</div><p>{snapshot.satisfactionSurvey.responseCount ? `Valoración: ${snapshot.satisfactionSurvey.averageRating.toFixed(1)} / 5 · ${snapshot.satisfactionSurvey.responseCount} respuestas` : 'Todavía no hay valoraciones.'}</p><div className="action-row"><button className="secondary-button" disabled={busy || !auth.isAuthenticated} onClick={() => void downloadDocumentation()}>Exportar documentación PDF</button><CopyButton value={snapshot.joinUrl} /></div></Disclosure>
      </section>
    </>}
  </main>
}

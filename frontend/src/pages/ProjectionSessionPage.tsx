import { Brand } from '../components/Brand'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getTimeRemaining } from '../lib/api'
import { formatTime } from '../lib/session'
import { useSessionLive } from '../hooks/useSessionLive'
import { ConnectionNotice, ErrorNotice, PhaseBadge } from '../components/SessionUI'
import { ProjectedResponses } from '../components/ProjectedResponses'

export function ProjectionSessionPage() {
  const { code = '' } = useParams()
  const { snapshot, error, connectionState, retry } = useSessionLive({ kind: 'participant', code })
  const [tick, setTick] = useState(Date.now)
  useEffect(() => { const timer = setInterval(() => setTick(Date.now()), 1000); return () => clearInterval(timer) }, [])
  const closed = snapshot?.status === 'Closed' || snapshot?.phase === 'WrapUp'
  const survey = snapshot && !closed && snapshot.satisfactionSurveyOpen
  return <main className="projection-shell">
    <header className="projection-header"><Brand /><ConnectionNotice state={connectionState} retry={retry} /></header>
    <ErrorNotice message={error} retry={retry} />
    {!snapshot && error && <Link className="secondary-button" to="/proyeccion">Introducir otro código</Link>}
    {!snapshot && !error && <div className="loading-state" role="status">Preparando la pantalla de sala…</div>}
    {snapshot && <section className="projection-canvas">
      <div className="projection-context"><span>{snapshot.title}</span><PhaseBadge phase={snapshot.phase} /></div>
      {snapshot.isArchived ? <section className="projection-closing"><h1>Sesión archivada</h1><p>La participación está cerrada. El facilitador conserva el historial de la sesión.</p></section> : closed ? <section className="projection-closing"><p className="section-label">Gracias por participar</p><h1>Sesión finalizada</h1><p>La valoración está cerrada. Gracias por compartir tus ideas.</p><p className="projection-feedback-count">{snapshot.satisfactionSurvey.responseCount} valoraciones recibidas</p></section>
      : snapshot.phase === 'Lobby' && !survey ? <section className="projection-welcome"><div><p className="section-label">La próxima idea empieza contigo</p><h1>Entra.<br />Comparte.<br /><span>Construyamos juntos.</span></h1><p>Escanea el QR con tu móvil para unirte a la sesión.</p><strong className="projection-code">{snapshot.accessCode}</strong><p className="projection-url">{snapshot.joinUrl}</p></div><div className="projection-qr-block"><div className="projection-qr" role="img" aria-label="Código QR para unirse a la sesión" dangerouslySetInnerHTML={{ __html: snapshot.qrSvg }} /><p>Tu nombre o alias.<br />Y ya estás dentro.</p></div></section>
      : survey ? <section className="projection-closing"><p className="section-label">Gracias por construir juntos</p><h1>¿Qué te llevas de hoy?</h1><p>Valora la sesión desde tu dispositivo.</p><div className="projection-rating-scale">{['Muy mala', 'Mejorable', 'Correcta', 'Buena', 'Excelente'].map((text, i) => <div key={text}><strong>{i + 1}</strong><span>{text}</span></div>)}</div><p className="projection-feedback-count">{snapshot.satisfactionSurvey.responseCount} valoraciones recibidas</p></section>
      : <section className="projection-round"><div className="projection-question-row"><div><p className="section-label">{snapshot.sectionTitle} · Pregunta {snapshot.questionIndex}/{snapshot.questionCount}</p><h1>{snapshot.questionTitle}</h1></div>{snapshot.roundOpen && <div className="projection-clock"><span>Tiempo restante</span><strong>{formatTime(getTimeRemaining(snapshot.timerSeconds, snapshot.roundOpen, snapshot.roundOpenedAtUtc, tick))}</strong></div>}</div>
        {snapshot.responses.length > 0 ? <ProjectedResponses key={snapshot.activeQuestionId} responses={snapshot.responses} /> : <div className="projection-prompt"><p>{snapshot.questionPrompt}</p><div className="projection-guidance"><span className="status-dot" /><p role="status">{snapshot.roundOpen ? 'Es tu turno. Responde desde tu dispositivo.' : snapshot.phase === 'Results' ? 'No hay respuestas públicas para esta pregunta.' : snapshot.roundOpenedAtUtc ? 'Ronda cerrada. Sigue las indicaciones del facilitador.' : 'Hacemos una pausa. Sigue las indicaciones del facilitador.'}</p></div></div>}
        <footer className="projection-footer"><span>Bloque {snapshot.sectionIndex} de {snapshot.sectionCount}</span><span>¿Te incorporas ahora? <strong>{snapshot.accessCode}</strong></span></footer>
      </section>}
    </section>}
  </main>
}

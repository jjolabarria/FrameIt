import type { QuestionRoundContext } from '../types'
import { label } from '../lib/session'

function elapsed(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

export function QuestionContext({ context }: { context?: QuestionRoundContext | null }) {
  if (!context) return <div className="question-round-context"><span>Ronda no registrada</span></div>
  return <div className="question-round-context">
    <strong>{context.roundNumber ? `Ronda ${context.roundNumber} · ${context.roundTitle}` : 'Sin ronda activa'}</strong>
    {context.sectionTitle && <span>{context.sectionTitle}</span>}
    <span>{context.sessionElapsedSeconds != null ? `+${elapsed(context.sessionElapsedSeconds)} de sesión` : context.sessionClockTracked ? 'Antes del inicio' : 'Tiempo de sesión no registrado'} · {context.roundElapsedSeconds != null ? `+${elapsed(context.roundElapsedSeconds)} desde apertura de ronda` : 'Ronda aún no abierta'}</span>
    <span>{label(context.phase)}{context.roundOpenedAtUtc && <> · Apertura <time dateTime={context.roundOpenedAtUtc}>{new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(context.roundOpenedAtUtc))}</time></>}</span>
  </div>
}

import type { SessionSnapshot } from '../types'

const phases = ['Lobby', 'RoundOpen', 'Waiting', 'Results', 'WrapUp']
const visibility = ['AfterClose', 'Live', 'FacilitatorOnly']
const identities = ['Anonymous', 'Named', 'Mixed']
const kinds = ['ShortText', 'RichText', 'StickyNotes', 'ColumnSort', 'Choice', 'Ranking', 'Voting', 'Matrix']
const labels: Record<string, string> = {
  Lobby: 'Sala de espera', RoundOpen: 'Ronda abierta', Waiting: 'En espera', Results: 'Resultados', WrapUp: 'Finalizada',
  Draft: 'Preparada', Live: 'En directo', Closed: 'Finalizada', AfterClose: 'Al publicar resultados', FacilitatorOnly: 'Solo facilitador',
  Anonymous: 'Sin nombre', Named: 'Con nombre', Mixed: 'Con nombre', ShortText: 'Texto breve', RichText: 'Texto libre',
  StickyNotes: 'Ideas', ColumnSort: 'Clasificación', Choice: 'Selección', Ranking: 'Ordenación', Voting: 'Votación', Matrix: 'Matriz',
}
export function label(value: string) { return labels[value] ?? value }
export function hasAnswerOptions(kind: string) { return ['Choice', 'Voting', 'Ranking', 'ColumnSort', 'Matrix'].includes(kind) }
export function normalizeSnapshot(snapshot: SessionSnapshot): SessionSnapshot {
  const normalize = (value: string, values: string[]) => typeof value === 'number' ? values[value] : value
  return { ...snapshot, phase: normalize(snapshot.phase, phases), status: normalize(snapshot.status, ['Draft', 'Live', 'Closed']),
    responseVisibility: normalize(snapshot.responseVisibility, visibility), responseIdentityMode: normalize(snapshot.responseIdentityMode, identities),
    questionKind: normalize(snapshot.questionKind, kinds),
    questionsToFacilitator: (snapshot.questionsToFacilitator ?? []).map(question => ({ ...question,
      roundContext: question.roundContext ? { ...question.roundContext, phase: normalize(question.roundContext.phase, phases) } : question.roundContext })) }
}
export function privacyText(snapshot: Pick<SessionSnapshot, 'responseVisibility' | 'responseIdentityMode'>) {
  const audience = snapshot.responseVisibility === 'FacilitatorOnly' ? 'Solo el facilitador verá tu respuesta.'
    : snapshot.responseVisibility === 'Live' ? 'Tu respuesta se comparte en directo.' : 'Tu respuesta aparecerá cuando el facilitador publique los resultados.'
  return `${audience} ${snapshot.responseIdentityMode === 'Anonymous' ? 'Se mostrará sin tu nombre.' : 'Se mostrará con tu nombre.'}`
}
export function isActiveSession(session: { status: string; phase: string }) {
  return session.status !== 'Closed' && session.phase !== 'WrapUp' && session.status === 'Live'
}
export function formatTime(seconds: number) { return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` }

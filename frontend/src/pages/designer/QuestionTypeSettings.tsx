import type { Dispatch } from 'react'
import { label } from '../../lib/session'
import { answerSettingsIssues } from '../../lib/answers'
import type { DesignerQuestionDraft } from '../../types'
import type { DesignerAction, QuestionRef } from './draftReducer'
import { questionTypeConfig } from './questionTypeConfig'

export function QuestionTypeSettings({ question, at, dispatch }: { question: DesignerQuestionDraft; at: QuestionRef; dispatch: Dispatch<DesignerAction> }) {
  const { kind, settings } = question
  const config = questionTypeConfig[kind]
  if (!config) return null
  const set = (key: string, value: string) => dispatch({ type: 'updateSetting', at, key, value })
  const text = ['ShortText', 'RichText', 'StickyNotes'].includes(kind)
  const issues = answerSettingsIssues(kind, settings)
  return <section className="question-type-settings" aria-label={`Configuración de ${label(kind)}`}>
    <div><p className="section-label">{label(kind)}</p><h3>Cómo se responde</h3><p className="micro-copy">{config.rule}</p></div>
    {text && <>
      <label>{kind === 'StickyNotes' ? 'Caracteres por nota' : 'Límite de caracteres'}<input type="number" min={1} max={kind === 'ShortText' ? 300 : kind === 'StickyNotes' ? 2000 : 12000} value={settings?.maxLength ?? (kind === 'RichText' ? '6000' : '300')} onChange={event => set('maxLength', event.target.value)} /></label>
      <label>Texto de ayuda del campo<input maxLength={200} value={settings?.answerPlaceholder ?? ''} placeholder={kind === 'StickyNotes' ? 'Escribe una idea concreta…' : kind === 'ShortText' ? 'Resume tu respuesta en una frase…' : 'Desarrolla tu respuesta…'} onChange={event => set('answerPlaceholder', event.target.value)} /></label>
    </>}
    {kind === 'StickyNotes' && <label>Máximo de notas por participante<input type="number" min={1} max={50} value={settings?.maxIdeas ?? '20'} onChange={event => set('maxIdeas', event.target.value)} /></label>}
    {kind === 'Ranking' && <label>Sentido de la ordenación<select value={settings?.rankingDirection ?? 'descending'} onChange={event => set('rankingDirection', event.target.value)}><option value="descending">De mayor a menor prioridad</option><option value="ascending">De menor a mayor prioridad</option></select></label>}
    {kind === 'ColumnSort' && <label>Columnas · una por línea<textarea rows={4} value={settings?.columns ?? 'Por explorar\nEn marcha\nResuelto'} onChange={event => set('columns', event.target.value)} /><span className="micro-copy">Entre 2 y 20 columnas distintas.</span></label>}
    {kind === 'Matrix' && <label>Escala · un valor por línea<textarea rows={5} value={settings?.matrixScale ?? '1\n2\n3\n4\n5'} onChange={event => set('matrixScale', event.target.value)} /><span className="micro-copy">Entre 2 y 20 valores distintos, de menor a mayor.</span></label>}
    {issues.length > 0 && <ul className="micro-error" role="alert">{issues.map(issue => <li key={issue}>{issue}</li>)}</ul>}
  </section>
}

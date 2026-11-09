import type { Dispatch } from 'react'
import { hasAnswerOptions, label } from '../../lib/session'
import type { DesignerQuestionDraft, DesignerSectionDraft, QuestionModelCatalogItem } from '../../types'
import type { DesignerAction } from './draftReducer'
import { OptionsEditor } from './OptionsEditor'
import { SlideFields } from './SlideFields'

type Props = {
  section: DesignerSectionDraft
  question: DesignerQuestionDraft
  index: number
  catalog: QuestionModelCatalogItem[]
  busy: boolean
  onUploadImage: (file: File) => void
  dispatch: Dispatch<DesignerAction>
}

export function QuestionFields({ section, question, index, catalog, busy, onUploadImage, dispatch }: Props) {
  const at = { sectionKey: section.key, questionKey: question.key }
  const slide = question.kind === 'Presentation'
  const description = catalog.find(item => item.kind === question.kind)?.description
  return <>
    <div className="panel-head"><div><p className="section-label">{section.title} · {slide ? 'Diapositiva' : 'Pregunta'} {index + 1}</p><h2>{question.title || 'Sin título'}</h2></div></div>
    <div className="form-grid">
      <label>Tipo
        <select value={question.kind} onChange={event => dispatch({ type: 'changeKind', at, kind: event.target.value })}>
          {catalog.map(item => <option key={item.kind} value={item.kind}>{label(item.kind)}</option>)}
        </select>
      </label>
      <label>{slide ? 'Título de la diapositiva' : 'Título de la pregunta'}<input value={question.title} onChange={event => dispatch({ type: 'updateQuestion', at, patch: { title: event.target.value } })} /></label>
    </div>
    {description && <p className="micro-copy">{description}</p>}
    <label>{slide ? 'Texto de la diapositiva' : 'Enunciado'}<textarea rows={slide ? 6 : 4} value={question.prompt} onChange={event => dispatch({ type: 'updateQuestion', at, patch: { prompt: event.target.value } })} /></label>
    {slide ? <SlideFields at={at} slide={question} busy={busy} onUploadImage={onUploadImage} dispatch={dispatch} />
      : hasAnswerOptions(question.kind) && <OptionsEditor at={at} question={question} dispatch={dispatch} />}
    {question.kind === 'ColumnSort' && <label>Columnas · una por línea<textarea rows={3} value={question.settings?.columns ?? 'Por explorar\nEn marcha\nResuelto'} onChange={event => dispatch({ type: 'updateSetting', at, key: 'columns', value: event.target.value })} /><span className="micro-copy">Define al menos dos columnas para clasificar las opciones.</span></label>}
    {question.kind === 'Matrix' && <label>Escala · un valor por línea<textarea rows={5} value={question.settings?.matrixScale ?? '1\n2\n3\n4\n5'} onChange={event => dispatch({ type: 'updateSetting', at, key: 'matrixScale', value: event.target.value })} /><span className="micro-copy">Cada opción será una fila. Define al menos dos valores para evaluarla.</span></label>}
  </>
}

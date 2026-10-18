import type { Dispatch } from 'react'
import { Plus, Presentation } from 'lucide-react'
import { label } from '../../lib/session'
import type { DesignerSectionDraft } from '../../types'
import type { DesignerAction } from './draftReducer'

type Props = { section: DesignerSectionDraft; index: number; defaultKind: string; dispatch: Dispatch<DesignerAction> }

export function SectionFields({ section, index, defaultKind, dispatch }: Props) {
  return <>
    <div className="panel-head"><div><p className="section-label">Bloque {index + 1}</p><h2>{section.title || 'Sin título'}</h2></div></div>
    <label>Título del bloque<input value={section.title} onChange={event => dispatch({ type: 'updateSection', sectionKey: section.key, patch: { title: event.target.value } })} /></label>
    <label>Objetivo del bloque<textarea rows={3} value={section.objective} onChange={event => dispatch({ type: 'updateSection', sectionKey: section.key, patch: { objective: event.target.value } })} /></label>
    <section className="section-summary" aria-label="Preguntas del bloque">
      <h3>{section.questions.length} {section.questions.length === 1 ? 'pregunta' : 'preguntas'}</h3>
      <ol>
        {section.questions.map((question, questionIndex) => <li key={question.key}>
          <button type="button" className="section-summary-item" onClick={() => dispatch({ type: 'select', selection: { kind: 'question', sectionKey: section.key, questionKey: question.key } })}>
            <span className="outline-kind">{questionIndex + 1} · {label(question.kind)}</span>
            <strong>{question.title || 'Sin título'}</strong>
            <span className="muted-copy">{question.prompt}</span>
          </button>
        </li>)}
      </ol>
      <div className="action-row">
        <button className="secondary-button" type="button" onClick={() => dispatch({ type: 'addQuestion', sectionKey: section.key, kind: defaultKind })}><Plus size={16} />Añadir pregunta</button>
        <button className="secondary-button" type="button" onClick={() => dispatch({ type: 'addQuestion', sectionKey: section.key, kind: 'Presentation' })}><Presentation size={16} />Añadir diapositiva</button>
      </div>
    </section>
  </>
}

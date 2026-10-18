import type { Dispatch } from 'react'
import { Plus, X } from 'lucide-react'
import type { DesignerQuestionDraft } from '../../types'
import type { DesignerAction, QuestionRef } from './draftReducer'

export function OptionsEditor({ at, question, dispatch }: { at: QuestionRef; question: DesignerQuestionDraft; dispatch: Dispatch<DesignerAction> }) {
  const setOptions = (options: DesignerQuestionDraft['options']) => dispatch({ type: 'updateQuestion', at, patch: { options } })
  return <section className="option-editor">
    <h3>Opciones de respuesta</h3>
    {question.options.map((option, index) => <div className="option-editor-row" key={option.id}>
      <label className="sr-only" htmlFor={option.id}>Opción {index + 1}</label>
      <input id={option.id} value={option.label} placeholder={`Opción ${index + 1}`} onChange={event => setOptions(question.options.map(o => o.id === option.id ? { ...o, label: event.target.value } : o))} />
      <button className="icon-button" type="button" aria-label={`Eliminar opción ${index + 1}`} onClick={() => setOptions(question.options.filter(o => o.id !== option.id))}><X size={16} /></button>
    </div>)}
    <button className="secondary-button" type="button" disabled={question.options.length >= 50} onClick={() => setOptions([...question.options, { id: crypto.randomUUID(), label: '' }])}><Plus size={16} /> Añadir opción</button>
  </section>
}

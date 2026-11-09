import type { Dispatch } from 'react'
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react'
import type { DesignerQuestionDraft } from '../../types'
import type { DesignerAction, QuestionRef } from './draftReducer'
import { questionTypeConfig } from './questionTypeConfig'

export function OptionsEditor({ at, question, dispatch }: { at: QuestionRef; question: DesignerQuestionDraft; dispatch: Dispatch<DesignerAction> }) {
  const setOptions = (options: DesignerQuestionDraft['options']) => dispatch({ type: 'updateQuestion', at, patch: { options } })
  const config = questionTypeConfig[question.kind]
  const item = config?.item || 'Opción'
  function move(index: number, direction: number) {
    const next = [...question.options]
    ;[next[index], next[index + direction]] = [next[index + direction], next[index]]
    setOptions(next)
  }
  return <section className="option-editor">
    <h3>{config?.title ?? 'Opciones de respuesta'}</h3>
    {question.options.map((option, index) => <div className="typed-option-editor" key={option.id}>
      <div className="typed-option-fields"><label htmlFor={option.id}>{question.kind === 'Ranking' ? `${index + 1}. ${item}` : `${item} ${index + 1}`}</label>
        <input id={option.id} maxLength={1000} value={option.label} placeholder={`${item} ${index + 1}`} onChange={event => setOptions(question.options.map(o => o.id === option.id ? { ...o, label: event.target.value } : o))} />
        {['Choice', 'Voting'].includes(question.kind) && <label className="option-description-label">Descripción opcional<input maxLength={3000} value={option.description ?? ''} onChange={event => setOptions(question.options.map(o => o.id === option.id ? { ...o, description: event.target.value } : o))} placeholder="Contexto para decidir" /></label>}
      </div>
      <div className="typed-option-actions">{question.kind === 'Ranking' && <><button className="icon-button" type="button" aria-label={`Subir elemento ${index + 1}`} disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={16} /></button><button className="icon-button" type="button" aria-label={`Bajar elemento ${index + 1}`} disabled={index === question.options.length - 1} onClick={() => move(index, 1)}><ArrowDown size={16} /></button></>}
        <button className="icon-button" type="button" aria-label={`Eliminar ${item.toLocaleLowerCase('es')} ${index + 1}`} onClick={() => setOptions(question.options.filter(o => o.id !== option.id))}><X size={16} /></button>
      </div>
    </div>)}
    <button className="secondary-button" type="button" disabled={question.options.length >= 50} onClick={() => setOptions([...question.options, { id: crypto.randomUUID(), label: '' }])}><Plus size={16} /> Añadir {item.toLocaleLowerCase('es')}</button>
  </section>
}

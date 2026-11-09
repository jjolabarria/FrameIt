import { useId, useState } from 'react'
import { ArrowDown, ArrowUp, Check, Plus, X } from 'lucide-react'
import type { QuestionOption } from '../types'
import './QuestionAnswerInput.css'
import { answerLimit, answerScale, assignments } from '../lib/answers'
import { choiceLimit, encodeChoice, multipleChoice, selectedChoiceIds } from '../lib/choice'

type Props = { kind: string; options: QuestionOption[]; settings?: Record<string, string> | null; value: string; disabled?: boolean; onChange: (value: string) => void }

function IdeaNotes({ value, disabled, settings, onChange }: Pick<Props, 'value' | 'disabled' | 'settings' | 'onChange'>) {
  const [notes, setNotes] = useState(() => value ? value.split('\n\n') : [''])
  const maxLength = answerLimit(settings, 'maxLength', 300, 2000)
  const maxIdeas = answerLimit(settings, 'maxIdeas', 20, 50)
  function update(next: string[]) { setNotes(next); onChange(next.map(note => note.trim()).filter(Boolean).join('\n\n')) }
  return <fieldset className="idea-notes" disabled={disabled}><legend>Una idea por nota</legend>
    <p className="micro-copy">Hasta {maxIdeas} notas · {maxLength} caracteres por nota.</p>
    {notes.map((note, index) => <div className="idea-note" key={index}><label>Idea {index + 1}<textarea aria-label={`Idea ${index + 1}`} rows={3} maxLength={maxLength} value={note} onChange={event => update(notes.map((item, i) => i === index ? event.target.value : item))} placeholder={settings?.answerPlaceholder || 'Escribe una idea concreta…'} /><small className="micro-copy">{note.length}/{maxLength}</small></label><button type="button" className="icon-button" aria-label={`Eliminar idea ${index + 1}`} disabled={notes.length === 1} onClick={() => update(notes.filter((_, i) => i !== index))}><X size={16} /></button></div>)}
    <button type="button" className="secondary-button" disabled={disabled || notes.length >= maxIdeas} onClick={() => update([...notes, ''])}><Plus size={16} />Añadir idea</button>
  </fieldset>
}

export function QuestionAnswerInput({ kind, options, settings, value, disabled, onChange }: Props) {
  const group = useId()
  if (kind === 'StickyNotes') return <IdeaNotes value={value} disabled={disabled} settings={settings} onChange={onChange} />
  if (kind === 'Choice' && multipleChoice(settings)) {
    const selected = selectedChoiceIds(value, options) ?? []
    const limit = choiceLimit(options, settings)
    return <fieldset disabled={disabled} className="answer-options answer-multiple"><legend>Selecciona una o varias opciones</legend>
      <p className="micro-copy" role="status">{selected.length} seleccionadas · {limit < options.length ? `máximo ${limit}` : 'puedes marcar todas'}</p>
      {options.map(option => <label className={`option-radio ${selected.includes(option.id) ? 'option-radio--selected' : ''}`} key={option.id}><input type="checkbox" checked={selected.includes(option.id)} disabled={disabled || (!selected.includes(option.id) && selected.length >= limit)} onChange={event => onChange(encodeChoice(event.target.checked ? [...selected, option.id] : selected.filter(id => id !== option.id), options))} /><span>{option.label || 'Opción sin texto'}{option.description && <small>{option.description}</small>}</span></label>)}
    </fieldset>
  }
  if (kind === 'Choice' || kind === 'Voting') return <fieldset disabled={disabled} className={`answer-options ${kind === 'Voting' ? 'answer-voting' : ''}`}>
    <legend>{kind === 'Voting' ? 'Da tu voto a una opción' : 'Selecciona una opción'}</legend>
    {kind === 'Voting' && <p className="micro-copy">Un voto por participante. Puedes cambiarlo mientras la ronda esté abierta.</p>}
    {options.map(option => <label className={`option-radio ${value === option.label ? 'option-radio--selected' : ''}`} key={option.id}><input type="radio" name={group} checked={value === option.label} onChange={() => onChange(option.label)} /><span>{option.label || 'Opción sin texto'}{option.description && <small>{option.description}</small>}</span>{kind === 'Voting' && <Check size={18} aria-hidden="true" />}</label>)}
  </fieldset>
  if (kind === 'Ranking') {
    const lines = value.split('\n')
    const ordered = options.slice().sort((a, b) => {
      const position = (option: QuestionOption) => { const index = lines.findIndex(line => /^\d+\. /.test(line) && line.replace(/^\d+\. /, '') === option.label); return index < 0 ? options.length + options.indexOf(option) : index }
      return position(a) - position(b)
    })
    const save = (next: QuestionOption[]) => onChange(next.map((option, index) => `${index + 1}. ${option.label}`).join('\n'))
    function move(index: number, direction: number) { const next = [...ordered]; [next[index], next[index + direction]] = [next[index + direction], next[index]]; save(next) }
    return <fieldset disabled={disabled} className="answer-ranking"><legend>{settings?.rankingDirection === 'ascending' ? 'Ordena de menor a mayor prioridad' : 'Ordena de mayor a menor prioridad'}</legend><p className="micro-copy">Usa las flechas para cambiar la posición.</p><ol>{ordered.map((option, index) => <li key={option.id}><strong>{index + 1}</strong><span>{option.label || 'Opción sin texto'}</span><div><button type="button" className="icon-button" aria-label={`Subir ${option.label}`} disabled={disabled || index === 0} onClick={() => move(index, -1)}><ArrowUp size={16} /></button><button type="button" className="icon-button" aria-label={`Bajar ${option.label}`} disabled={disabled || index === ordered.length - 1} onClick={() => move(index, 1)}><ArrowDown size={16} /></button></div></li>)}</ol>{!value && <button type="button" className="secondary-button" onClick={() => save(ordered)}>Usar este orden</button>}</fieldset>
  }
  if (kind === 'ColumnSort' || kind === 'Matrix') {
    const selected = assignments(value, options)
    const columns = kind === 'ColumnSort' ? answerScale(settings, 'columns', ['Por explorar', 'En marcha', 'Resuelto']) : answerScale(settings, 'matrixScale', ['1', '2', '3', '4', '5'])
    const update = (index: number, choice: string) => onChange(options.flatMap((option, i) => (i === index ? choice : selected[i]) ? [`${option.label}: ${i === index ? choice : selected[i]}`] : []).join('\n'))
    return <fieldset disabled={disabled} className={kind === 'Matrix' ? 'answer-matrix' : 'answer-classification'}><legend>{kind === 'Matrix' ? 'Valora cada opción' : 'Clasifica cada opción en una columna'}</legend>
      {kind === 'Matrix' && <p className="micro-copy">Elige un valor por fila · {columns[0]} → {columns.at(-1)}</p>}
      {options.map((option, index) => kind === 'ColumnSort' ? <label key={option.id}>{option.label || 'Opción sin texto'}<select value={selected[index]} onChange={event => update(index, event.target.value)}><option value="">Selecciona una columna</option>{columns.map(column => <option key={column}>{column}</option>)}</select></label> : <fieldset className="matrix-row" key={option.id}><legend>{option.label || 'Opción sin texto'}</legend><div>{columns.map(column => <label key={column} className={selected[index] === column ? 'matrix-cell matrix-cell--selected' : 'matrix-cell'}><input type="radio" name={`${group}-${option.id}`} checked={selected[index] === column} onChange={() => update(index, column)} /><span>{column}</span></label>)}</div></fieldset>)}
    </fieldset>
  }
  const maxLength = answerLimit(settings, 'maxLength', kind === 'ShortText' ? 300 : 6000, kind === 'ShortText' ? 300 : 12000)
  return <label>{kind === 'ShortText' ? 'Tu respuesta breve' : 'Tu respuesta'}{kind === 'ShortText' ? <input aria-label="Tu respuesta breve" value={value} disabled={disabled} maxLength={maxLength} onChange={event => onChange(event.target.value)} placeholder={settings?.answerPlaceholder || 'Resume tu respuesta en una frase…'} /> : <textarea aria-label="Tu respuesta" rows={6} maxLength={maxLength} value={value} disabled={disabled} onChange={event => onChange(event.target.value)} placeholder={settings?.answerPlaceholder || 'Desarrolla tu respuesta…'} />}<small className="micro-copy">{value.length}/{maxLength} caracteres</small></label>
}

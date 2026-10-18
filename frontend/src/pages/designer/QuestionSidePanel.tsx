import { useState, type Dispatch } from 'react'
import { Clock, Eye, Settings2 } from 'lucide-react'
import type { DesignerQuestionDraft, DesignerSectionDraft, TemplateDraft } from '../../types'
import type { DesignerAction } from './draftReducer'
import { QuestionPreview } from './QuestionPreview'

type Tab = 'rules' | 'preview'

function QuestionRules({ section, question, dispatch }: { section: DesignerSectionDraft; question: DesignerQuestionDraft; dispatch: Dispatch<DesignerAction> }) {
  const at = { sectionKey: section.key, questionKey: question.key }
  const set = (patch: Partial<DesignerQuestionDraft['presentation']>) => dispatch({ type: 'updatePresentation', at, patch })
  if (question.kind === 'Presentation') return <p className="muted-copy">Las diapositivas no recogen respuestas: se proyectan mientras avanzas la agenda.</p>
  return <div className="designer-rules">
    <label><span><Clock size={14} /> Tiempo (segundos)</span><input min={15} max={86400} step={15} type="number" value={question.presentation.timerSeconds} onChange={event => set({ timerSeconds: Number(event.target.value) || 60 })} /></label>
    <label><span><Eye size={14} /> Visibilidad</span>
      <select value={question.presentation.responseVisibility} onChange={event => set({ responseVisibility: event.target.value })}>
        <option value="AfterClose">Cuando publique resultados</option>
        <option value="Live">En directo</option>
        <option value="FacilitatorOnly">Solo facilitador</option>
      </select>
    </label>
    <label>Autoría
      <select value={question.presentation.responseIdentityMode} onChange={event => set({ responseIdentityMode: event.target.value })}>
        <option value="Anonymous">Anónima</option>
        <option value="Named">Con nombre</option>
        <option value="Mixed">A elección del participante</option>
      </select>
    </label>
  </div>
}

function DraftSummary({ draft }: { draft: TemplateDraft }) {
  const questions = draft.sections.flatMap(section => section.questions)
  const slides = questions.filter(question => question.kind === 'Presentation').length
  const minutes = Math.round(questions.filter(question => question.kind !== 'Presentation').reduce((sum, question) => sum + question.presentation.timerSeconds, 0) / 60)
  return <dl className="designer-summary">
    <div><dt>Bloques</dt><dd>{draft.sections.length}</dd></div>
    <div><dt>Preguntas</dt><dd>{questions.length - slides}</dd></div>
    <div><dt>Diapositivas</dt><dd>{slides}</dd></div>
    <div><dt>Tiempo de respuesta</dt><dd>~{minutes} min</dd></div>
  </dl>
}

type Props = { draft: TemplateDraft; section?: DesignerSectionDraft; question?: DesignerQuestionDraft; dispatch: Dispatch<DesignerAction> }

export function QuestionSidePanel({ draft, section, question, dispatch }: Props) {
  const [tab, setTab] = useState<Tab>('rules')
  if (!section || !question) return <aside className="designer-config" aria-label="Resumen de la plantilla">
    <div className="panel-head"><div><p className="section-label">Resumen</p><h2>La dinámica</h2></div></div>
    <DraftSummary draft={draft} />
    <p className="micro-copy">Selecciona una pregunta en la estructura para ajustar sus reglas y ver cómo la vivirá la sala.</p>
  </aside>
  return <aside className="designer-config" aria-label="Reglas y vista previa">
    <div className="designer-tabs" role="tablist" aria-label="Panel de la pregunta">
      <button type="button" role="tab" id="designer-tab-rules" aria-controls="designer-panel-rules" aria-selected={tab === 'rules'} onClick={() => setTab('rules')}><Settings2 size={15} />Reglas</button>
      <button type="button" role="tab" id="designer-tab-preview" aria-controls="designer-panel-preview" aria-selected={tab === 'preview'} onClick={() => setTab('preview')}><Eye size={15} />Vista previa</button>
    </div>
    {tab === 'rules'
      ? <div role="tabpanel" id="designer-panel-rules" aria-labelledby="designer-tab-rules"><QuestionRules section={section} question={question} dispatch={dispatch} /></div>
      : <div role="tabpanel" id="designer-panel-preview" aria-labelledby="designer-tab-preview"><p className="micro-copy">{question.kind === 'Presentation' ? 'Así verá la diapositiva la sala' : 'Así verá la pregunta el participante'} · no envía respuestas</p><QuestionPreview sectionTitle={section.title} question={question} /></div>}
  </aside>
}

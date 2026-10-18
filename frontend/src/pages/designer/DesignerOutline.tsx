import { useState, type Dispatch } from 'react'
import { ChevronRight, FileText, ListPlus, Plus, Presentation } from 'lucide-react'
import { SessionActionsMenu } from '../../components/SessionActionsMenu'
import { label } from '../../lib/session'
import type { TemplateDraft } from '../../types'
import type { DesignerAction, Selection } from './draftReducer'
import { nodeId } from './validateDraft'

type Props = { draft: TemplateDraft; selection: Selection; issueIds: Set<string>; defaultKind: string; dispatch: Dispatch<DesignerAction> }
type PendingDelete = { kind: 'section'; sectionKey: string; name: string } | { kind: 'question'; sectionKey: string; questionKey: string; name: string }

function IssueDot({ show }: { show: boolean }) {
  return show ? <span className="outline-issue" title="Incompleto"><span className="sr-only">Incompleto</span></span> : null
}

export function DesignerOutline({ draft, selection, issueIds, defaultKind, dispatch }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)
  const select = (next: Selection) => dispatch({ type: 'select', selection: next })
  const isSelected = (node: Selection) => nodeId(node) === nodeId(selection)
  function toggle(sectionKey: string) {
    setCollapsed(current => { const next = new Set(current); if (next.has(sectionKey)) next.delete(sectionKey); else next.add(sectionKey); return next })
  }
  function confirmDelete() {
    if (!pendingDelete) return
    dispatch({ type: 'remove', target: pendingDelete.kind === 'section' ? { kind: 'section', sectionKey: pendingDelete.sectionKey } : { kind: 'question', sectionKey: pendingDelete.sectionKey, questionKey: pendingDelete.questionKey } })
    setPendingDelete(null)
  }
  const deleteConfirmation = (matches: boolean) => matches && pendingDelete && <div className="outline-confirm" role="alert">
    <p>¿Eliminar «{pendingDelete.name}»{pendingDelete.kind === 'section' ? ' y todas sus preguntas' : ''}?</p>
    <div className="action-row"><button type="button" className="danger-button" onClick={confirmDelete}>Eliminar</button><button type="button" className="secondary-button" autoFocus onClick={() => setPendingDelete(null)}>Cancelar</button></div>
  </div>

  return <nav className="designer-outline" aria-label="Estructura de la plantilla">
    <div className="panel-head"><div><p className="section-label">Estructura</p><h2>{draft.sections.length} {draft.sections.length === 1 ? 'bloque' : 'bloques'}</h2></div></div>
    <div className="outline-tree">
      <div className={`outline-node outline-node--template${isSelected({ kind: 'template' }) ? ' outline-node--active' : ''}`}>
        <button type="button" className="outline-select" aria-current={isSelected({ kind: 'template' }) ? 'true' : undefined} onClick={() => select({ kind: 'template' })}>
          <FileText size={15} aria-hidden="true" /><strong>Ficha de la plantilla</strong>
        </button>
        <IssueDot show={issueIds.has('template')} />
      </div>
      <ol className="outline-sections">
        {draft.sections.map((section, sectionIndex) => {
          const sectionNode: Selection = { kind: 'section', sectionKey: section.key }
          const open = !collapsed.has(section.key) || (selection.kind === 'question' && selection.sectionKey === section.key)
          const childIssues = section.questions.some(q => issueIds.has(nodeId({ kind: 'question', sectionKey: section.key, questionKey: q.key })))
          const name = section.title || `Bloque ${sectionIndex + 1}`
          return <li key={section.key}>
            <div className={`outline-node outline-node--section${isSelected(sectionNode) ? ' outline-node--active' : ''}`}>
              <button type="button" className="outline-toggle" aria-expanded={open} aria-label={`${open ? 'Plegar' : 'Desplegar'} ${name}`} onClick={() => toggle(section.key)}><ChevronRight size={15} aria-hidden="true" /></button>
              <button type="button" className="outline-select" aria-current={isSelected(sectionNode) ? 'true' : undefined} onClick={() => select(sectionNode)}>
                <strong>{sectionIndex + 1}. {name}</strong>
                <span>{section.questions.length} {section.questions.length === 1 ? 'pregunta' : 'preguntas'}</span>
              </button>
              <IssueDot show={issueIds.has(nodeId(sectionNode)) || (!open && childIssues)} />
              <SessionActionsMenu disabled={false} label={`Acciones de ${name}`} ariaLabel={`Acciones de ${name}`} actions={[
                { label: 'Subir bloque', disabled: sectionIndex === 0, run: () => dispatch({ type: 'move', target: sectionNode, direction: -1 }) },
                { label: 'Bajar bloque', disabled: sectionIndex === draft.sections.length - 1, run: () => dispatch({ type: 'move', target: sectionNode, direction: 1 }) },
                { label: 'Duplicar bloque', disabled: draft.sections.length >= 20, run: () => dispatch({ type: 'duplicate', target: sectionNode }) },
                { label: 'Eliminar bloque', danger: true, disabled: draft.sections.length < 2, run: () => setPendingDelete({ kind: 'section', sectionKey: section.key, name }) },
              ]} />
            </div>
            {deleteConfirmation(pendingDelete?.kind === 'section' && pendingDelete.sectionKey === section.key)}
            {open && <ol className="outline-questions">
              {section.questions.map((question, questionIndex) => {
                const questionNode: Selection = { kind: 'question', sectionKey: section.key, questionKey: question.key }
                const questionName = question.title || `Pregunta ${questionIndex + 1}`
                return <li key={question.key}>
                  <div className={`outline-node outline-node--question${isSelected(questionNode) ? ' outline-node--active' : ''}`}>
                    <button type="button" className="outline-select" aria-current={isSelected(questionNode) ? 'true' : undefined} onClick={() => select(questionNode)}>
                      <span className="outline-kind">{questionIndex + 1} · {label(question.kind)}</span>
                      <strong>{questionName}</strong>
                    </button>
                    <IssueDot show={issueIds.has(nodeId(questionNode))} />
                    <SessionActionsMenu disabled={false} label={`Acciones de ${questionName}`} ariaLabel={`Acciones de ${questionName}`} actions={[
                      { label: 'Subir', disabled: questionIndex === 0, run: () => dispatch({ type: 'move', target: questionNode, direction: -1 }) },
                      { label: 'Bajar', disabled: questionIndex === section.questions.length - 1, run: () => dispatch({ type: 'move', target: questionNode, direction: 1 }) },
                      { label: 'Duplicar', run: () => dispatch({ type: 'duplicate', target: questionNode }) },
                      ...draft.sections.flatMap((target, targetIndex) => target.key === section.key ? [] : [{
                        label: `Mover a ${targetIndex + 1}. ${target.title || 'Bloque'}`,
                        disabled: section.questions.length < 2,
                        run: () => dispatch({ type: 'moveToSection', at: { sectionKey: section.key, questionKey: question.key }, targetSectionKey: target.key }),
                      }]),
                      { label: 'Eliminar', danger: true, disabled: section.questions.length < 2, run: () => setPendingDelete({ kind: 'question', sectionKey: section.key, questionKey: question.key, name: questionName }) },
                    ]} />
                  </div>
                  {deleteConfirmation(pendingDelete?.kind === 'question' && pendingDelete.questionKey === question.key)}
                </li>
              })}
              <li className="outline-add">
                <button type="button" className="text-button" onClick={() => dispatch({ type: 'addQuestion', sectionKey: section.key, kind: defaultKind })}><Plus size={14} aria-hidden="true" />Pregunta</button>
                <button type="button" className="text-button" onClick={() => dispatch({ type: 'addQuestion', sectionKey: section.key, kind: 'Presentation' })}><Presentation size={14} aria-hidden="true" />Diapositiva</button>
              </li>
            </ol>}
          </li>
        })}
      </ol>
    </div>
    <button type="button" className="secondary-button outline-add-section" disabled={draft.sections.length >= 20} onClick={() => dispatch({ type: 'addSection', questionKind: defaultKind })}><ListPlus size={16} aria-hidden="true" />Añadir bloque</button>
  </nav>
}

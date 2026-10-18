import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { WorkspaceLayout } from '../components/WorkspaceLayout'
import { useFacilitatorAuth } from '../hooks/useFacilitatorAuth'
import { api } from '../lib/api'
import { ErrorNotice } from '../components/SessionUI'
import { TemplateAssistant } from '../components/TemplateAssistant'
import type { QuestionModelCatalogItem } from '../types'
import { useTemplateDraft } from './designer/useTemplateDraft'
import { nodeId, validateDraft } from './designer/validateDraft'
import { DesignerOutline } from './designer/DesignerOutline'
import { TemplateFields } from './designer/TemplateFields'
import { SectionFields } from './designer/SectionFields'
import { QuestionFields } from './designer/QuestionFields'
import { QuestionSidePanel } from './designer/QuestionSidePanel'

export function DesignerPage() {
  const [searchParams] = useSearchParams()
  const sourceId = searchParams.get('from')
  const editId = searchParams.get('edit')
  return <DesignerEditor key={editId ? `edit-${editId}` : sourceId ? `from-${sourceId}` : 'new'} sourceId={editId ?? sourceId} editId={editId} />
}

function DesignerEditor({ sourceId, editId }: { sourceId: string | null; editId: string | null }) {
  const navigate = useNavigate()
  const { draft, selection, dispatch, sourceLoading, sourceError, dirty, blocker, markSaved } = useTemplateDraft(sourceId, editId)
  const { auth, busy: authBusy, error: authError, login } = useFacilitatorAuth()
  const [catalog, setCatalog] = useState<QuestionModelCatalogItem[]>([])
  const [showAssistant, setShowAssistant] = useState(false)
  const [showIssues, setShowIssues] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    void api<QuestionModelCatalogItem[]>('/api/catalog/question-models').then(setCatalog).catch((reason: Error) => setError(reason.message))
  }, [])

  useEffect(() => {
    const restored = () => setError(current => current === 'Inicia sesión como facilitador para continuar.' ? '' : current)
    window.addEventListener('frameit-auth-changed', restored)
    return () => window.removeEventListener('frameit-auth-changed', restored)
  }, [])

  const issues = useMemo(() => validateDraft(draft), [draft])
  const issueIds = useMemo(() => new Set(issues.map(issue => nodeId(issue.target))), [issues])
  const defaultKind = catalog[0]?.kind ?? 'ShortText'
  const sectionIndex = selection.kind === 'template' ? -1 : draft.sections.findIndex(s => s.key === selection.sectionKey)
  const section = draft.sections[sectionIndex]
  const questionIndex = selection.kind === 'question' && section ? section.questions.findIndex(q => q.key === selection.questionKey) : -1
  const question = section?.questions[questionIndex]
  // The assistant scopes partial edits to the focused block/question, or the first ones when the template card is open.
  const focusSection = section ?? draft.sections[0]
  const focusQuestion = question ?? focusSection?.questions[0]
  const unavailable = sourceLoading || !!sourceError

  async function uploadSlideImage(file: File) {
    if (!section || !question) return
    const at = { sectionKey: section.key, questionKey: question.key }
    setBusy(true); setError('')
    try {
      const form = new FormData(); form.append('file', file)
      const result = await api<{ url: string }>('/api/templates/assets', { method: 'POST', body: form })
      dispatch({ type: 'updateSetting', at, key: 'slideImageUrl', value: result.url })
    } catch (reason) { setError((reason as Error).message) } finally { setBusy(false) }
  }

  async function saveTemplate() {
    if (unavailable) return
    if (!auth.isAuthenticated) {
      setError('Debes iniciar sesión como facilitador para guardar plantillas.')
      return
    }
    if (issues.length) {
      setError('')
      setShowIssues(true)
      dispatch({ type: 'select', selection: issues[0].target })
      return
    }
    setBusy(true)
    setError('')
    try {
      await api(editId ? `/api/templates/${encodeURIComponent(editId)}` : '/api/templates', { method: editId ? 'PUT' : 'POST', body: JSON.stringify(draft) })
      markSaved()
      navigate('/plantillas')
    } catch (reason) {
      setError((reason as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <WorkspaceLayout
      title="Diseñador"
      eyebrow="Plantillas"
      description="Diseña una conversación que lleve al grupo hacia un objetivo."
      actions={
        <>
          <button className="secondary-button" type="button" disabled={unavailable} aria-expanded={showAssistant} onClick={() => setShowAssistant(!showAssistant)}>{showAssistant ? 'Volver al editor manual' : 'Diseñar con IA'}</button>
          <Link className="secondary-link" to="/plantillas"><ArrowLeft size={16} /> Biblioteca</Link>
          {!auth.isAuthenticated ? <button className="secondary-button" disabled={authBusy} onClick={() => void login()} type="button">Entrar</button> : null}
          <button className="primary-button" disabled={busy || authBusy || !auth.isAuthenticated || unavailable} onClick={saveTemplate} type="button"><Save size={16} /> {editId ? 'Guardar cambios' : sourceId ? 'Guardar variante' : 'Guardar'}</button>
        </>
      }
    >
      <ErrorNotice message={error || authError} />
      {sourceLoading && <p role="status">{editId ? 'Cargando plantilla…' : 'Preparando variante…'}</p>}
      <ErrorNotice message={sourceError} />
      {blocker.state === 'blocked' && <div className="confirmation" role="alert"><strong>Tienes cambios sin guardar</strong><p>Si sales ahora perderás los cambios de esta plantilla.</p><div className="action-row"><button autoFocus className="primary-button" onClick={() => blocker.reset()}>Seguir editando</button><button className="secondary-button" onClick={() => blocker.proceed()}>Salir sin guardar</button></div></div>}
      {showIssues && issues.length > 0 && <div className="designer-issues" role="alert">
        <strong>{issues.length === 1 ? 'Falta completar 1 elemento antes de guardar' : `Faltan por completar ${issues.length} elementos antes de guardar`}</strong>
        <ul>{issues.map(issue => <li key={nodeId(issue.target)}><button type="button" className="text-button" onClick={() => dispatch({ type: 'select', selection: issue.target })}>{issue.label}</button> {issue.message}</li>)}</ul>
      </div>}
      {!unavailable && <p className="micro-copy designer-status" role="status">
        {editId ? 'Estás editando esta plantilla. Las sesiones ya creadas conservan su contenido original.' : sourceId ? 'Estás creando una variante. La plantilla original se conserva.' : 'Nueva plantilla.'}
        {' '}<strong>{dirty ? 'Cambios sin guardar' : 'Sin cambios'}</strong>
      </p>}

      <div className={showAssistant ? 'designer-with-assistant' : undefined}>
        <section className="designer-workbench" hidden={unavailable}>
          <DesignerOutline draft={draft} selection={selection} issueIds={issueIds} defaultKind={defaultKind} dispatch={dispatch} />
          <article className="designer-editor panel panel--fill">
            {section && question
              ? <QuestionFields key={question.key} section={section} question={question} index={questionIndex} catalog={catalog} busy={busy} onUploadImage={file => void uploadSlideImage(file)} dispatch={dispatch} />
              : section
                ? <SectionFields section={section} index={sectionIndex} defaultKind={defaultKind} dispatch={dispatch} />
                : <TemplateFields draft={draft} dispatch={dispatch} />}
          </article>
          {!showAssistant && <QuestionSidePanel draft={draft} section={question ? section : undefined} question={question} dispatch={dispatch} />}
        </section>
        {!sourceLoading && !sourceError && <TemplateAssistant draft={draft} sectionKey={focusSection?.key} questionKey={focusQuestion?.key} onApply={next => dispatch({ type: 'replace', draft: next })} hidden={!showAssistant} />}
      </div>
    </WorkspaceLayout>
  )
}

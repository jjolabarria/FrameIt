import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useBlocker } from 'react-router-dom'
import { ArrowLeft, Clock, Eye, ListPlus, Save, Settings2, Plus, X } from 'lucide-react'
import { WorkspaceLayout } from '../components/WorkspaceLayout'
import { useFacilitatorAuth } from '../hooks/useFacilitatorAuth'
import { api } from '../lib/api'
import { label, privacyText, hasAnswerOptions } from '../lib/session'
import { Disclosure, ErrorNotice } from '../components/SessionUI'
import type { DesignerQuestionDraft, DesignerSectionDraft, QuestionModelCatalogItem } from '../types'

function createQuestion(kind = 'ShortText'): DesignerQuestionDraft {
  return {
    key: `pregunta-${crypto.randomUUID().slice(0, 8)}`,
    kind,
    title: 'Nueva pregunta',
    prompt: 'Escribe el enunciado de la pregunta',
    options: [],
    presentation: {
      timerSeconds: 60,
      responseVisibility: 'AfterClose',
      responseIdentityMode: 'Named',
      showProgress: true,
      allowLateResponses: false,
      celebrationStyle: 'Subtle',
    },
  }
}

export function DesignerPage() {
  const navigate = useNavigate()
  const { auth, busy: authBusy, error: authError, login } = useFacilitatorAuth()
  const [catalog, setCatalog] = useState<QuestionModelCatalogItem[]>([])
  const [title, setTitle] = useState('Nueva dinámica')
  const [key, setKey] = useState(() => `dinamica-${crypto.randomUUID().slice(0, 8)}`)
  const [objective, setObjective] = useState('Objetivo de la dinámica')
  const [audience, setAudience] = useState('Participantes del taller')
  const [guidance, setGuidance] = useState('Instrucciones internas para el facilitador')
  const [activeSectionIndex, setActiveSectionIndex] = useState(0)
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0)
  const [showJson, setShowJson] = useState(false)
  const [preview, setPreview] = useState(false)
  const saved = useRef(false)
  const [sections, setSections] = useState<DesignerSectionDraft[]>([
    { key: 'inicio', title: 'Bloque 1', objective: 'Primer objetivo', order: 1, questions: [createQuestion()] },
  ])
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

  const activeSection = sections[activeSectionIndex] ?? sections[0]
  const activeQuestion = activeSection?.questions[activeQuestionIndex] ?? activeSection?.questions[0]
  const questionCount = useMemo(() => sections.reduce((sum, section) => sum + section.questions.length, 0), [sections])
  const jsonPreview = useMemo(() => JSON.stringify({ key, title, objective, audience, facilitatorGuidance: guidance, sections }, null, 2), [audience, guidance, key, objective, sections, title])

  const initial = useRef(jsonPreview)
  const dirty = jsonPreview !== initial.current
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && !saved.current && currentLocation.pathname !== nextLocation.pathname)
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty && !saved.current) { event.preventDefault(); event.returnValue = '' } }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  function updateSection(patch: Partial<DesignerSectionDraft>) {
    setSections((current) => current.map((section, index) => (index === activeSectionIndex ? { ...section, ...patch } : section)))
  }

  function updateQuestion(patch: Partial<DesignerQuestionDraft>) {
    setSections((current) =>
      current.map((section, sectionIndex) =>
        sectionIndex === activeSectionIndex
          ? { ...section, questions: section.questions.map((question, questionIndex) => (questionIndex === activeQuestionIndex ? { ...question, ...patch } : question)) }
          : section,
      ),
    )
  }

  function updateQuestionPresentation(patch: Partial<DesignerQuestionDraft['presentation']>) {
    if (!activeQuestion) return
    updateQuestion({ presentation: { ...activeQuestion.presentation, ...patch } })
  }

  function addSection() {
    setSections((current) => {
      const next = [...current, { key: `bloque-${current.length + 1}`, title: `Bloque ${current.length + 1}`, objective: 'Nuevo objetivo', order: current.length + 1, questions: [createQuestion(catalog[0]?.kind ?? 'ShortText')] }]
      setActiveSectionIndex(next.length - 1)
      setActiveQuestionIndex(0)
      return next
    })
  }

  function addQuestion() {
    setSections((current) =>
      current.map((section, index) => {
        if (index !== activeSectionIndex) return section
        const questions = [...section.questions, createQuestion(catalog[0]?.kind ?? 'ShortText')]
        setActiveQuestionIndex(questions.length - 1)
        return { ...section, questions }
      }),
    )
  }

  async function saveTemplate() {
    if (!auth.isAuthenticated) {
      setError('Debes iniciar sesión como facilitador para guardar plantillas.')
      return
    }
    if (!title.trim() || !objective.trim() || !audience.trim() || sections.some(s => !s.title.trim() || s.questions.some(q => !q.title.trim() || !q.prompt.trim() || (['Choice', 'Voting', 'Ranking', 'ColumnSort', 'Matrix'].includes(q.kind) && (q.options.length < 2 || q.options.some(o => !o.label.trim())))))) {
      setError('Completa título, objetivo, audiencia y cada pregunta. Las preguntas con opciones necesitan al menos dos opciones con texto.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await api('/api/templates', { method: 'POST', body: JSON.stringify({ key, title, objective, audience, facilitatorGuidance: guidance, sections }) })
      saved.current = true
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
          <button className="secondary-button" aria-pressed={preview} onClick={() => setPreview(!preview)}><Eye size={16} />{preview ? 'Volver al editor' : 'Vista del participante'}</button><Link className="secondary-link" to="/plantillas"><ArrowLeft size={16} /> Biblioteca</Link>
          {!auth.isAuthenticated ? <button className="secondary-button" disabled={authBusy} onClick={() => void login()} type="button">Entrar</button> : null}
          <button className="primary-button" disabled={busy || authBusy || !auth.isAuthenticated} onClick={saveTemplate} type="button"><Save size={16} /> Guardar</button>
        </>
      }
    >
      <ErrorNotice message={error || authError} />
      {blocker.state === 'blocked' && <div className="confirmation" role="alert"><strong>Tienes cambios sin guardar</strong><p>Si sales ahora perderás los cambios de esta plantilla.</p><div className="action-row"><button autoFocus className="primary-button" onClick={() => blocker.reset()}>Seguir editando</button><button className="secondary-button" onClick={() => blocker.proceed()}>Salir sin guardar</button></div></div>}
      <p className="micro-copy" role="status">{dirty ? 'Cambios sin guardar' : 'Nueva plantilla'}</p>
      {preview && activeQuestion && <section className="panel"><div className="panel-head"><h2>Así verá la pregunta el participante</h2><span className="meta-chip">Vista previa · no envía respuestas</span></div><div className="participant-shell"><div className="preview-question"><p className="section-label">{activeSection.title}</p><h2>{activeQuestion.title}</h2><p>{activeQuestion.prompt}</p>{hasAnswerOptions(activeQuestion.kind) && activeQuestion.options.map(o => <label className="option-radio" key={o.id}><input type="radio" name="preview" /><span>{o.label || 'Opción sin texto'}</span></label>)}<label>Tu respuesta<textarea rows={3} placeholder="Comparte tu idea…" /></label><button className="primary-button" disabled>Enviar respuesta</button><p className="privacy-note">{privacyText(activeQuestion.presentation)}</p></div></div></section>}

      <section className="designer-workbench" hidden={preview}>
        <aside className="designer-outline panel">
          <div className="panel-head">
            <div><p className="section-label">Agenda</p><h2>{sections.length} {sections.length === 1 ? 'bloque' : 'bloques'}</h2></div>
            <button className="icon-button" onClick={addSection} type="button" title="Añadir bloque" aria-label="Añadir bloque"><ListPlus size={18} /></button>
          </div>
          <div className="outline-list">
            {sections.map((section, sectionIndex) => (
              <button aria-pressed={activeSectionIndex === sectionIndex} className={`outline-item ${activeSectionIndex === sectionIndex ? 'outline-item--active' : ''}`} key={section.key} onClick={() => { setActiveSectionIndex(sectionIndex); setActiveQuestionIndex(0) }} type="button">
                <strong>{section.title}</strong>
                <span>{section.questions.length} {section.questions.length === 1 ? 'pregunta' : 'preguntas'}</span>
              </button>
            ))}
          </div>
        </aside>

        <article className="designer-editor panel panel--fill">
          <div className="panel-head">
            <div><p className="section-label">Ficha de plantilla</p><h2>{title}</h2></div>
            <span className="meta-chip">{questionCount} {questionCount === 1 ? 'pregunta' : 'preguntas'}</span>
          </div>

          <div className="form-grid">

            <label>Título<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
            <label>Audiencia<input value={audience} onChange={(event) => setAudience(event.target.value)} /></label>
          </div>
          <label>Objetivo<textarea rows={3} value={objective} onChange={(event) => setObjective(event.target.value)} /></label>
          <label>Guía interna<textarea rows={3} value={guidance} onChange={(event) => setGuidance(event.target.value)} /></label>

          {activeSection && activeQuestion ? (
            <section className="question-editor">
              <div className="panel-head">
                <div><p className="section-label">Bloque activo</p><h2>{activeSection.title}</h2></div>
                <button className="secondary-button" onClick={addQuestion} type="button">Añadir pregunta</button>
              </div>
              <div className="form-grid">
                <label>Título bloque<input value={activeSection.title} onChange={(event) => updateSection({ title: event.target.value })} /></label>
                <label>Objetivo bloque<input value={activeSection.objective} onChange={(event) => updateSection({ objective: event.target.value })} /></label>
              </div>

              <div className="question-tabs">
                {activeSection.questions.map((question, questionIndex) => (
                  <button aria-pressed={activeQuestionIndex === questionIndex} className={activeQuestionIndex === questionIndex ? 'question-tab question-tab--active' : 'question-tab'} key={question.key} onClick={() => setActiveQuestionIndex(questionIndex)} type="button">
                    {questionIndex + 1}. {question.title}
                  </button>
                ))}
              </div>

              <div className="form-grid">
                <label>Tipo
                  <select value={activeQuestion.kind} onChange={(event) => updateQuestion({ kind: event.target.value })}>
                    {catalog.map((item) => <option key={item.kind} value={item.kind}>{label(item.kind)}</option>)}
                  </select>
                </label>
                <label>Título pregunta<input value={activeQuestion.title} onChange={(event) => updateQuestion({ title: event.target.value })} /></label>
              </div>
              <label>Enunciado<textarea rows={4} value={activeQuestion.prompt} onChange={(event) => updateQuestion({ prompt: event.target.value })} /></label>
              {['Choice', 'Voting', 'Ranking', 'ColumnSort', 'Matrix'].includes(activeQuestion.kind) && <section className="option-editor"><h3>Opciones de respuesta</h3>{activeQuestion.options.map((option, index) => <div className="option-editor-row" key={option.id}><label className="sr-only" htmlFor={option.id}>Opción {index + 1}</label><input id={option.id} value={option.label} placeholder={`Opción ${index + 1}`} onChange={e => updateQuestion({ options: activeQuestion.options.map(o => o.id === option.id ? { ...o, label: e.target.value } : o) })} /><button className="icon-button" aria-label={`Eliminar opción ${index + 1}`} onClick={() => updateQuestion({ options: activeQuestion.options.filter(o => o.id !== option.id) })}><X size={16} /></button></div>)}<button className="secondary-button" onClick={() => updateQuestion({ options: [...activeQuestion.options, { id: crypto.randomUUID(), label: '' }] })}><Plus size={16} /> Añadir opción</button></section>}
            </section>
          ) : null}
        </article>

        <aside className="designer-config panel">
          <div className="panel-head">
            <div><p className="section-label">Reglas</p><h2>Presentación</h2></div>
            <Settings2 size={18} />
          </div>
          {activeQuestion ? (
            <>
              <label><span><Clock size={14} /> Tiempo</span><input min={15} step={15} type="number" value={activeQuestion.presentation.timerSeconds} onChange={(event) => updateQuestionPresentation({ timerSeconds: Number(event.target.value) || 60 })} /></label>
              <label><span><Eye size={14} /> Visibilidad</span>
                <select value={activeQuestion.presentation.responseVisibility} onChange={(event) => updateQuestionPresentation({ responseVisibility: event.target.value })}>
                  <option value="AfterClose">Cuando publique resultados</option>
                  <option value="Live">En directo</option>
                  <option value="FacilitatorOnly">Solo facilitador</option>
                </select>
              </label>
              <label>Autoría
                <select value={activeQuestion.presentation.responseIdentityMode} onChange={(event) => updateQuestionPresentation({ responseIdentityMode: event.target.value })}>

                  <option value="Anonymous">Anónima</option>
                  <option value="Named">Con nombre</option>
                </select>
              </label>

              <Disclosure title="Opciones avanzadas"><label>Clave de la plantilla<input value={key} onChange={e => setKey(e.target.value)} /></label><button className="secondary-button" onClick={() => setShowJson((current) => !current)} type="button">{showJson ? 'Ocultar JSON' : 'Ver JSON'}</button>
              {showJson ? <pre className="json-preview">{jsonPreview}</pre> : null}</Disclosure>
            </>
          ) : null}
        </aside>
      </section>
    </WorkspaceLayout>
  )
}

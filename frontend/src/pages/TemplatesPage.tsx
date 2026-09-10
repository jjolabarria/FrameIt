import { ArchiveFilter, LifecycleActions } from '../components/LifecycleActions'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, ArrowRight } from 'lucide-react'
import { WorkspaceLayout, EmptyState } from '../components/WorkspaceLayout'
import { ErrorNotice } from '../components/SessionUI'
import { useResource } from '../hooks/useResource'
import { api } from '../lib/api'
import type { TemplateDefinition, TemplateSummary } from '../types'

function TemplateDetail({ id, archived }: { id: string; archived: boolean }) {
  const [detail, setDetail] = useState<TemplateDefinition | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    void api<TemplateDefinition>(`/api/templates/${id}`, { signal: controller.signal }).then(setDetail).catch(e => { if (!controller.signal.aborted) setError(e.message) })
    return () => controller.abort()
  }, [id])
  return <div className="template-detail"><ErrorNotice message={error} />{!detail && !error && <p role="status">Cargando dinámica…</p>}{detail && <><p className="muted-copy">{detail.audience}</p>{detail.sections.map(s => <section key={s.key}><h3>{s.title}</h3><p className="muted-copy">{s.objective}</p><ol>{s.questions.map(q => <li key={q.key}><strong>{q.title}</strong><p>{q.prompt}</p></li>)}</ol></section>)}<Link className="secondary-button" to={`/disenador?from=${encodeURIComponent(id)}`}>Crear variante</Link>{!archived && <Link className="primary-button" to={`/sesiones?crear=1&templateId=${encodeURIComponent(id)}`}>Usar esta plantilla <ArrowRight size={17} /></Link>}</>}</div>
}
export function TemplatesPage() {
  const [archived, setArchived] = useState(false)
  const { data, loading, error, reload } = useResource<TemplateSummary[]>(`/api/templates?archived=${archived}`)
  const templates = data ?? []
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState('')
  const visible = templates.filter(t => `${t.title} ${t.objective}`.toLowerCase().includes(query.trim().toLowerCase()))
  return <WorkspaceLayout title="Dinámicas para avanzar" eyebrow="Plantillas" description="Preguntas con intención. Elige un punto de partida y hazlo tuyo." search={{ value: query, placeholder: 'Buscar dinámica', onChange: setQuery }} actions={<Link className="primary-button" to="/disenador"><Plus size={17} /> Nueva plantilla</Link>}>
    <ArchiveFilter archived={archived} onChange={value => { setArchived(value); setSelected('') }} />
    <ErrorNotice message={error} retry={reload} />
    {loading ? <div className="loading-state" role="status">Cargando plantillas…</div> : error ? null : <section className="panel collection-list">
      {visible.length ? visible.map(t => <article key={t.id}><div className="collection-row"><div><p className="section-label">{t.questionCount} preguntas</p><h2>{t.title}</h2><p>{t.objective}</p></div><div className="action-row">{!t.isBuiltIn && <LifecycleActions kind="templates" id={t.id} name={t.title} archived={t.isArchived} onChanged={() => { setSelected(''); reload() }} />}<button className="secondary-button" aria-expanded={selected === t.id} aria-controls={`template-${t.id}`} onClick={() => setSelected(selected === t.id ? '' : t.id)}>{selected === t.id ? 'Cerrar detalle' : 'Ver dinámica'}</button>{!t.isArchived && <Link className="secondary-link" to={`/sesiones?crear=1&templateId=${encodeURIComponent(t.id)}`}>Usar <ArrowRight size={16} /></Link>}</div></div>{selected === t.id && <div id={`template-${t.id}`}><TemplateDetail key={t.id} id={t.id} archived={t.isArchived} /></div>}</article>) : <EmptyState title={archived ? 'No hay dinámicas archivadas en esta vista' : query ? 'No encontramos esta dinámica' : 'Tu primera dinámica empieza con una pregunta'} action={query ? <button className="secondary-button" onClick={() => setQuery('')}>Limpiar búsqueda</button> : <Link className="primary-button" to="/disenador">Crear plantilla</Link>}>{query ? 'Prueba otra búsqueda.' : 'Organiza tus preguntas en bloques y reutilízalas en tus talleres.'}</EmptyState>}
    </section>}
  </WorkspaceLayout>
}

import { ArchiveFilter, FilterBar, LifecycleActions } from '../components/LifecycleActions'
import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Plus, Pencil } from 'lucide-react'
import { WorkspaceLayout, EmptyState } from '../components/WorkspaceLayout'
import { Breadcrumbs, Pagination, SearchPicker, SessionDirectory, WorkspaceAccess } from '../components/WorkspaceDataUI'
import { EntityEditor } from '../components/EntityEditor'
import { ErrorNotice } from '../components/SessionUI'
import { useResource } from '../hooks/useResource'
import { api } from '../lib/api'
import { type PageResult, type WorkspaceProject, type WorkspaceSession } from '../lib/workspace'
import type { TemplateSummary } from '../types'

export function SessionsPage() {
  const route = useParams()
  return <WorkspaceAccess><SessionCatalog key={route.projectId ?? 'all'} routeClientId={route.clientId} routeProjectId={route.projectId} /></WorkspaceAccess>
}
function CreateSessionForm({ clientId, projectId, templateId, onCancel, onSaved }: { clientId: string; projectId: string; templateId: string; onCancel: () => void; onSaved: (id: string) => void }) {
  const [draftClient, setDraftClient] = useState(clientId)
  const [draftProject, setDraftProject] = useState(projectId)
  const [draftTemplate, setDraftTemplate] = useState(templateId)
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const templates = useResource<TemplateSummary[]>('/api/templates')
  return <section className="panel creation-panel"><div className="panel-head"><h2>Nueva sesión</h2></div><ErrorNotice message={error || templates.error} retry={templates.reload} /><form onSubmit={async event => {
    event.preventDefault(); if (busy || !draftClient || !draftProject || !draftTemplate || !title.trim()) return
    setBusy(true); setError('')
    try { const result = await api<{ id: string }>('/api/sessions', { method: 'POST', body: JSON.stringify({ clientId: draftClient, projectId: draftProject, templateId: draftTemplate, title: title.trim() }) }); onSaved(result.id) }
    catch (reason) { setError((reason as Error).message); setBusy(false) }
  }}><label>Nombre de la sesión<input autoFocus required maxLength={160} value={title} disabled={busy} onChange={event => setTitle(event.target.value)} placeholder="Ej. Diseñamos nuestra forma de trabajar" /></label><div className="form-grid"><SearchPicker label="Cliente de la nueva sesión" kind="clients" value={draftClient} disabled={busy} onChange={id => { setDraftClient(id); setDraftProject('') }} /><SearchPicker label="Proyecto de la nueva sesión" kind="projects" clientId={draftClient} disabled={busy || !draftClient} value={draftProject} onChange={setDraftProject} /></div><label>Dinámica<select required disabled={busy || templates.loading} value={draftTemplate} onChange={event => setDraftTemplate(event.target.value)}><option value="">{templates.loading ? 'Cargando dinámicas…' : 'Selecciona una dinámica'}</option>{templates.data?.map(template => <option value={template.id} key={template.id}>{template.title} · {template.questionCount} preguntas</option>)}</select></label><div className="action-row"><button className="primary-button" disabled={busy || !draftClient || !draftProject || !draftTemplate || !title.trim()}>{busy ? 'Creando…' : 'Crear y abrir sala'}</button><button type="button" className="ghost-button" disabled={busy} onClick={onCancel}>Cancelar</button><Link className="secondary-link" to="/clientes">Gestionar clientes y proyectos</Link></div></form></section>
}
function SessionCatalog({ routeClientId, routeProjectId }: { routeClientId?: string; routeProjectId?: string }) {
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [notice, setNotice] = useState('')
  const project = useResource<WorkspaceProject>(routeProjectId ? `/api/workspace/projects/${routeProjectId}` : null)
  const clientId = routeClientId ?? params.get('clientId') ?? ''
  const projectId = routeProjectId ?? params.get('projectId') ?? ''
  const query = params.get('q') ?? ''
  const archived = params.get('archived') === 'true'
  const creating = params.get('crear') === '1'
  const update = (patch: Record<string, string>, reset = true) => setParams(previous => {
    const next = new URLSearchParams(previous)
    for (const [key, value] of Object.entries(patch)) { if (value) next.set(key, value); else next.delete(key) }
    if (reset) next.delete('page')
    return next
  }, { replace: Object.hasOwn(patch, 'q') })
  const listParams = new URLSearchParams({ archived: String(archived), q: query, status: params.get('status') ?? '', sort: params.get('sort') ?? 'recent', page: params.get('page') ?? '1', pageSize: params.get('pageSize') ?? '25' })
  if (clientId) listParams.set('clientId', clientId)
  if (projectId) listParams.set('projectId', projectId)
  const sessions = useResource<PageResult<WorkspaceSession>>(`/api/workspace/sessions?${listParams}`, 200)
  const invalidContext = project.data && project.data.clientId !== routeClientId
  const activeFilterCount = [archived, query.trim(), clientId, projectId, params.get('status'), params.get('sort') && params.get('sort') !== 'recent' ? params.get('sort') : ''].filter(Boolean).length
  const clearFilters = () => update({ q: '', status: '', sort: '', archived: '', clientId: '', projectId: '' })
  return <WorkspaceLayout title={routeProjectId ? project.data?.name ?? 'Detalle del proyecto' : 'Sesiones'} eyebrow={routeProjectId ? 'Proyecto' : 'Catálogo'} description={routeProjectId ? `${project.data?.clientName ?? ''} · ${project.data?.code ?? ''}` : 'Consulta el historial de todos tus clientes o acota el trabajo por proyecto.'} search={{ value: query, placeholder: 'Buscar sesión, cliente, proyecto o código', onChange: value => update({ q: value }) }} actions={<div className="action-row">{project.data && !invalidContext && <button className="secondary-button" onClick={() => { setEditing(true); update({ crear: '' }, false) }}><Pencil size={16} /> Editar proyecto</button>}<button className="primary-button" disabled={Boolean(routeProjectId && (!project.data || project.data.isArchived || invalidContext))} onClick={() => { setEditing(false); update({ crear: '1' }, false) }}><Plus size={17} /> Crear sesión</button></div>}>
    {project.data && !invalidContext && <div className="action-row">{project.data.isArchived && <p role="status">Proyecto archivado. Su historial se conserva.</p>}<LifecycleActions kind="projects" id={project.data.id} name={project.data.name} archived={project.data.isArchived} canDelete={!project.data.sessionCount} onChanged={deleted => deleted ? navigate(`/clientes/${project.data!.clientId}`) : project.reload()} /></div>}
    {routeProjectId && <Breadcrumbs><Link to="/clientes">Clientes</Link><span aria-hidden="true">/</span><Link to={`/clientes/${routeClientId}`}>{project.data?.clientName ?? 'Cliente'}</Link><span aria-hidden="true">/</span><span aria-current="page">{project.data?.name ?? 'Proyecto'}</span></Breadcrumbs>}
    <ErrorNotice message={invalidContext ? 'Este proyecto no pertenece al cliente de la dirección.' : project.error || sessions.error} retry={() => { project.reload(); sessions.reload() }} />
    {notice && <p role="status" className="success-copy">{notice}</p>}
    {!invalidContext && !project.error && <>
      {editing && project.data && <EntityEditor kind="project" id={project.data.id} clientId={project.data.clientId} clientName={project.data.clientName} initialName={project.data.name} initialSecondary={project.data.code} onCancel={() => setEditing(false)} onSaved={() => { setEditing(false); project.reload(); sessions.reload(); setNotice('Proyecto actualizado. Sus sesiones se conservan.') }} />}
      {creating && (!routeProjectId || (project.data && !project.data.isArchived)) && <CreateSessionForm clientId={clientId} projectId={projectId} templateId={params.get('templateId') ?? ''} onCancel={() => update({ crear: '' }, false)} onSaved={id => { const back = new URLSearchParams(params); back.delete('crear'); navigate(`/sesion/${id}?returnTo=${encodeURIComponent(location.pathname + (back.size ? `?${back}` : ''))}`) }} />}
      <section className="panel directory-panel"><FilterBar activeCount={activeFilterCount} onClear={clearFilters}><ArchiveFilter archived={archived} onChange={value => update({ archived: String(value) })} />{!routeProjectId && <><SearchPicker label="Cliente" kind="clients" value={clientId} onChange={id => update({ clientId: id, projectId: '' })} /><SearchPicker label="Proyecto" kind="projects" value={projectId} clientId={clientId} disabled={!clientId} onChange={id => update({ projectId: id })} /></>}<label>Estado<select value={params.get('status') ?? ''} onChange={event => update({ status: event.target.value })}><option value="">Todos los estados</option><option value="Draft">Preparadas</option><option value="Live">En curso</option><option value="Closed">Finalizadas</option></select></label><label>Ordenar por<select value={params.get('sort') ?? 'recent'} onChange={event => update({ sort: event.target.value })}><option value="recent">Actividad más reciente</option><option value="oldest">Actividad más antigua</option><option value="title">Nombre de sesión</option></select></label></FilterBar>
        <div className="panel-head"><h2>{routeProjectId ? 'Sesiones del proyecto' : 'Todas las sesiones'}</h2>{sessions.data && <span className="meta-chip">{sessions.data.totalCount} sesiones</span>}</div>
        {sessions.loading ? <p className="loading-state" role="status">Buscando sesiones…</p> : !sessions.error && sessions.data && <>{sessions.data.items.length ? <SessionDirectory items={sessions.data.items} onChanged={sessions.reload} /> : <EmptyState title="No hay sesiones en esta vista" action={<button className="secondary-button" onClick={clearFilters}>Limpiar filtros</button>}>Revisa los filtros o crea una sesión para este proyecto.</EmptyState>}<Pagination result={sessions.data} onPage={page => update({ page: String(page) }, false)} onSize={size => update({ pageSize: String(size) })} /></>}
      </section>
    </>}
  </WorkspaceLayout>
}

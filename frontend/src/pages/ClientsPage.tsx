import { ArchiveFilter, LifecycleActions } from '../components/LifecycleActions'
import { useState } from 'react'
import { Plus, Pencil, ArrowRight } from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { WorkspaceLayout, EmptyState } from '../components/WorkspaceLayout'
import { Breadcrumbs, Pagination, WorkspaceAccess } from '../components/WorkspaceDataUI'
import { EntityEditor } from '../components/EntityEditor'
import { ErrorNotice } from '../components/SessionUI'
import { useResource } from '../hooks/useResource'
import { projectPath, type PageResult, type WorkspaceClient, type WorkspaceProject } from '../lib/workspace'

export function ClientsPage() {
  const { clientId } = useParams()
  return <WorkspaceAccess><ClientDirectory key={clientId ?? 'directory'} clientId={clientId} /></WorkspaceAccess>
}
function ClientDirectory({ clientId }: { clientId?: string }) {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [editor, setEditor] = useState<'client' | 'project' | null>(null)
  const [notice, setNotice] = useState('')
  const query = params.get('q') ?? ''
  const archived = params.get('archived') === 'true'
  const update = (key: string, value: string) => setParams(previous => { const next = new URLSearchParams(previous); if (value) next.set(key, value); else next.delete(key); if (key !== 'page') next.delete('page'); return next }, { replace: key === 'q' })
  const client = useResource<WorkspaceClient>(clientId ? `/api/workspace/clients/${clientId}` : null)
  const listParams = new URLSearchParams({ archived: String(archived), q: query, page: params.get('page') ?? '1', pageSize: params.get('pageSize') ?? '25' })
  if (clientId) listParams.set('clientId', clientId)
  const clients = useResource<PageResult<WorkspaceClient>>(!clientId ? `/api/workspace/clients?${listParams}` : null, 200)
  const projects = useResource<PageResult<WorkspaceProject>>(clientId ? `/api/workspace/projects?${listParams}` : null, 200)
  const list = clientId ? projects : clients
  const title = clientId ? client.data?.name ?? 'Detalle de cliente' : 'Clientes'
  return <WorkspaceLayout title={title} eyebrow={clientId ? 'Cliente' : 'Directorio'} description={clientId ? `${client.data?.industry ?? ''} · Proyectos y sesiones de este cliente.` : 'Encuentra cada cliente y organiza sus proyectos desde un único lugar.'} search={{ value: query, placeholder: clientId ? 'Buscar proyecto o código' : 'Buscar cliente o sector', onChange: value => update('q', value) }} actions={<div className="action-row">{client.data && <button className="secondary-button" onClick={() => setEditor('client')}><Pencil size={16} /> Editar cliente</button>}<button className="primary-button" disabled={Boolean(clientId && (!client.data || client.data.isArchived))} onClick={() => setEditor(clientId ? 'project' : 'client')}><Plus size={17} /> {clientId ? 'Nuevo proyecto' : 'Nuevo cliente'}</button></div>}>
    <ArchiveFilter archived={archived} onChange={value => update('archived', String(value))} />
    {client.data && <div className="action-row">{client.data.isArchived && <p role="status">Cliente archivado. Su historial se conserva.</p>}<LifecycleActions kind="clients" id={client.data.id} name={client.data.name} archived={client.data.isArchived} canDelete={!client.data.projectCount && !client.data.sessionCount} onChanged={deleted => deleted ? navigate('/clientes') : client.reload()} /></div>}
    {clientId && <Breadcrumbs><Link to="/clientes">Clientes</Link><span aria-hidden="true">/</span><span aria-current="page">{title}</span></Breadcrumbs>}
    <ErrorNotice message={client.error || list.error} retry={() => { client.reload(); list.reload() }} />
    {notice && <p role="status" className="success-copy">{notice}</p>}
    {client.data && <div className="metric-strip"><article><span>Proyectos</span><strong>{client.data.projectCount}</strong></article><article><span>Sesiones</span><strong>{client.data.sessionCount}</strong></article><Link className="secondary-link" to={`/sesiones?clientId=${clientId}`}>Ver todas las sesiones del cliente <ArrowRight size={16} /></Link></div>}
    {editor && !(editor === 'project' && client.data?.isArchived) && <EntityEditor key={`${editor}:${clientId ?? 'new'}`} kind={editor} id={editor === 'client' ? clientId : undefined} clientId={clientId} clientName={client.data?.name} initialName={editor === 'client' ? client.data?.name : ''} initialSecondary={editor === 'client' ? client.data?.industry : ''} onCancel={() => setEditor(null)} onSaved={id => {
      setEditor(null)
      if (editor === 'project') navigate(projectPath(clientId!, id))
      else if (!clientId) navigate(`/clientes/${id}`)
      else { client.reload(); setNotice('Datos del cliente actualizados.') }
    }} />}
    {(list.loading || (clientId && client.loading)) ? <p className="loading-state" role="status">Cargando {clientId ? 'proyectos' : 'clientes'}…</p> : !client.error && !list.error && list.data && <section className="panel directory-panel"><div className="panel-head"><h2>{clientId ? 'Proyectos del cliente' : 'Directorio de clientes'}</h2><span className="meta-chip">{list.data.totalCount} {clientId ? 'proyectos' : 'clientes'}</span></div>
      {!list.data.items.length ? <EmptyState title={archived ? 'No hay elementos archivados' : query ? 'Sin coincidencias' : clientId ? 'Este cliente aún no tiene proyectos' : 'Añade tu primer cliente'} action={<button className="secondary-button" disabled={!archived && Boolean(clientId && client.data?.isArchived)} onClick={() => archived ? update('archived', '') : query ? update('q', '') : setEditor(clientId ? 'project' : 'client')}>{archived ? 'Ver activos' : query ? 'Limpiar búsqueda' : clientId ? 'Nuevo proyecto' : 'Nuevo cliente'}</button>}>{archived ? 'No hay elementos archivados en esta vista.' : query ? 'Prueba con otro nombre o código.' : 'Crea el primer registro para empezar a organizar el trabajo.'}</EmptyState> : <div className="directory-table-wrap"><table className="directory-table"><caption className="sr-only">{clientId ? 'Proyectos de este cliente' : 'Clientes y volumen de trabajo'}</caption><thead><tr><th scope="col">{clientId ? 'Proyecto' : 'Cliente'}</th><th scope="col">{clientId ? 'Código' : 'Sector'}</th>{!clientId && <th scope="col">Proyectos</th>}<th scope="col">Sesiones</th><th scope="col"><span className="sr-only">Acciones</span></th></tr></thead><tbody>
        {clientId ? projects.data?.items.map(project => <tr key={project.id}><td data-label="Proyecto"><Link className="directory-title" to={projectPath(clientId, project.id)}>{project.name}</Link></td><td data-label="Código"><span className="code-pill">{project.code}</span></td><td data-label="Sesiones">{project.sessionCount}</td><td data-label="Acciones"><div className="action-row"><Link className="secondary-link" to={projectPath(clientId, project.id)}>Ver sesiones</Link>{!project.isArchived && !client.data?.isArchived && <Link className="secondary-button" to={`${projectPath(clientId, project.id)}?crear=1`}>Crear sesión</Link>}<LifecycleActions kind="projects" id={project.id} name={project.name} archived={project.isArchived} canDelete={!project.sessionCount} onChanged={() => { projects.reload(); client.reload() }} /></div></td></tr>) : clients.data?.items.map(item => <tr key={item.id}><td data-label="Cliente"><Link className="directory-title" to={`/clientes/${item.id}`}>{item.name}</Link></td><td data-label="Sector">{item.industry}</td><td data-label="Proyectos">{item.projectCount}</td><td data-label="Sesiones">{item.sessionCount}</td><td data-label="Acciones"><div className="action-row"><Link className="secondary-link" to={`/clientes/${item.id}`}>Ver proyectos <ArrowRight size={15} /></Link><LifecycleActions kind="clients" id={item.id} name={item.name} archived={item.isArchived} canDelete={!item.projectCount && !item.sessionCount} onChanged={() => clients.reload()} /></div></td></tr>)}
      </tbody></table></div>}
      <Pagination result={list.data} onPage={page => update('page', String(page))} onSize={size => update('pageSize', String(size))} />
    </section>}
  </WorkspaceLayout>
}

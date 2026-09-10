import { Link } from 'react-router-dom'
import { Activity, ArrowRight, Building2, Library, Radio } from 'lucide-react'
import { WorkspaceLayout, EmptyState } from '../components/WorkspaceLayout'
import { SessionDirectory, WorkspaceAccess } from '../components/WorkspaceDataUI'
import { ErrorNotice } from '../components/SessionUI'
import { useResource } from '../hooks/useResource'
import type { WorkspaceOverview } from '../lib/workspace'

export function HomePage() { return <WorkspaceAccess><WorkspaceHome /></WorkspaceAccess> }
function WorkspaceHome() {
  const { data, loading, error, reload } = useResource<WorkspaceOverview>('/api/workspace/overview')
  return <WorkspaceLayout title="Tu espacio de trabajo" description="Una visión de la actividad de tus clientes y acceso directo a cada proyecto." actions={<Link className="primary-button" to="/sesiones?crear=1">Crear sesión</Link>}>
    <ErrorNotice message={error} retry={reload} />
    {loading ? <p className="loading-state" role="status">Cargando actividad…</p> : data && <>
      <section className="metric-strip"><article><Building2 size={18} /><Link to="/clientes">Clientes</Link><strong>{data.clients}</strong></article><article><Activity size={18} /><span>Proyectos</span><strong>{data.projects}</strong></article><article><Radio size={18} /><Link to="/sesiones?status=Live">En curso</Link><strong>{data.liveSessions}</strong></article><article><Library size={18} /><Link to="/plantillas">Plantillas</Link><strong>{data.templates}</strong></article></section>
      <section className="panel directory-panel"><div className="panel-head"><div><p className="section-label">Ahora</p><h2>Sesiones en curso</h2></div><Link className="secondary-link" to="/sesiones?status=Live">Ver todas ({data.liveSessions}) <ArrowRight size={16} /></Link></div>{data.active.length ? <SessionDirectory items={data.active} /> : <EmptyState title="No hay sesiones en curso">Entra en un proyecto para preparar el próximo taller.</EmptyState>}</section>
      <section className="panel directory-panel"><div className="panel-head"><div><p className="section-label">Historial</p><h2>Últimas sesiones</h2></div><Link className="secondary-link" to="/sesiones">Consultar historial <ArrowRight size={16} /></Link></div>{data.recent.length ? <SessionDirectory items={data.recent} /> : <EmptyState title="Tu historial comienza aquí" action={<Link className="primary-button" to="/clientes">Organizar clientes</Link>}>Crea un cliente y su proyecto para preparar la primera sesión.</EmptyState>}</section>
    </>}
  </WorkspaceLayout>
}

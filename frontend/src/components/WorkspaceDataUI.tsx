import { LifecycleActions } from './LifecycleActions'
import { useEffect, useId, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react'
import { useFacilitatorAuth } from '../hooks/useFacilitatorAuth'
import { useResource } from '../hooks/useResource'
import { projectPath, type PageResult, type WorkspaceSession } from '../lib/workspace'
import { WorkspaceLayout } from './WorkspaceLayout'
import { ErrorNotice, PhaseBadge } from './SessionUI'

export function WorkspaceAccess({ children }: { children: ReactNode }) {
  const { auth, busy, error, login } = useFacilitatorAuth()
  if (busy) return <WorkspaceLayout title="Tu espacio de trabajo"><p role="status">Comprobando acceso…</p></WorkspaceLayout>
  if (!auth.isAuthenticated) return <WorkspaceLayout title="Clientes, proyectos y sesiones" description="Accede a tu espacio para organizar el trabajo y consultar su historial."><section className="panel access-panel"><h2>Entrar como facilitador</h2><p>Gestiona tus clientes y retoma cada proyecto desde su contexto.</p><ErrorNotice message={error} /><button className="primary-button" onClick={() => void login()}>Entrar al espacio de trabajo</button></section></WorkspaceLayout>
  return children
}

export function Breadcrumbs({ children }: { children: ReactNode }) {
  return <nav className="workspace-breadcrumbs" aria-label="Ruta de navegación">{children}</nav>
}

export function Pagination({ result, onPage, onSize }: { result: { totalCount: number; page: number; pageSize: number; totalPages: number }; onPage: (page: number) => void; onSize: (size: number) => void }) {
  const start = result.totalCount ? (result.page - 1) * result.pageSize + 1 : 0
  return <nav className="pagination" aria-label="Paginación"><p role="status">{start}–{Math.min(result.page * result.pageSize, result.totalCount)} de {result.totalCount}</p><label>Por página<select value={result.pageSize} onChange={event => onSize(Number(event.target.value))}>{[10, 25, 50, 100].map(size => <option key={size}>{size}</option>)}</select></label><div className="action-row"><button className="icon-button" aria-label="Página anterior" disabled={result.page <= 1} onClick={() => onPage(result.page - 1)}><ChevronLeft size={18} /></button><span>Página {result.page} de {result.totalPages}</span><button className="icon-button" aria-label="Página siguiente" disabled={result.page >= result.totalPages} onClick={() => onPage(result.page + 1)}><ChevronRight size={18} /></button></div></nav>
}

type Choice = { id: string; name?: string; title?: string; code?: string; clientName?: string }
export function SearchPicker({ label, kind, value, onChange, clientId, disabled = false }: { label: string; kind: 'clients' | 'projects'; value: string; onChange: (id: string) => void; clientId?: string; disabled?: boolean }) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [active, setActive] = useState(-1)
  const selected = useResource<Choice>(value ? `/api/workspace/${kind}/${value}` : null)
  const params = new URLSearchParams({ selectable: 'true', q: search, pageSize: '10' })
  if (clientId) params.set('clientId', clientId)
  const choices = useResource<PageResult<Choice>>(open && !disabled ? `/api/workspace/${kind}?${params}` : null, 200)
  const items = choices.data?.items ?? []
  useEffect(() => { if (open && active >= 0) document.getElementById(`${id}-${active}`)?.scrollIntoView({ block: 'nearest' }) }, [active, open, id])
  const text = (choice: Choice) => `${choice.name}${choice.code ? ` · ${choice.code}` : ''}`
  const choose = (choice: Choice) => { onChange(choice.id); setOpen(false); setSearch(''); setActive(-1) }
  return <div className="search-picker" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }}>
    <label htmlFor={id}>{label}</label><div className="picker-input"><Search size={16} /><input id={id} role="combobox" autoComplete="off" aria-autocomplete="list" aria-expanded={open} aria-controls={`${id}-choices`} aria-activedescendant={open && active >= 0 && items[active] ? `${id}-${active}` : undefined} disabled={disabled} value={open ? search : selected.data ? text(selected.data) : ''} placeholder={disabled ? 'Selecciona primero un cliente' : `Buscar ${label.toLowerCase()}…`} onFocus={() => { setOpen(true); setSearch(''); setActive(-1) }} onChange={event => { setSearch(event.target.value); setActive(-1); setOpen(true) }} onKeyDown={event => {
      if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); setActive(Math.min(active + 1, items.length - 1)) }
      if (event.key === 'ArrowUp') { event.preventDefault(); setActive(Math.max(active - 1, 0)) }
      if (event.key === 'Escape') { setOpen(false); setActive(-1) }
      if (event.key === 'Enter' && open) { event.preventDefault(); if (items[active]) choose(items[active]) }
    }} />{value && !disabled && <button type="button" className="icon-button" aria-label={`Quitar ${label.toLowerCase()}`} onClick={() => { onChange(''); setSearch('') }}><X size={15} /></button>}</div>
    {selected.error && !open && <p role="alert" className="micro-error">{selected.error}</p>}
    {open && <div className="picker-menu"><div id={`${id}-choices`} role="listbox" aria-label={label}>{items.map((choice, index) => <button type="button" role="option" tabIndex={-1} id={`${id}-${index}`} aria-selected={value === choice.id} className={active === index ? 'picker-option picker-option--active' : 'picker-option'} key={choice.id} onMouseDown={event => event.preventDefault()} onClick={() => choose(choice)}>{text(choice)}{!clientId && choice.clientName && <small>{choice.clientName}</small>}</button>)}</div>{choices.loading ? <p role="status">Buscando…</p> : choices.error ? <p role="alert">{choices.error}</p> : !items.length ? <p>Sin coincidencias.</p> : choices.data!.totalCount > items.length ? <p>Mostrando 10 de {choices.data!.totalCount}. Afina la búsqueda.</p> : null}</div>}
  </div>
}

export function SessionDirectory({ items, onChanged }: { items: WorkspaceSession[]; onChanged?: () => void }) {
  const location = useLocation()
  const returnTo = encodeURIComponent(location.pathname + location.search)
  return <div className="directory-table-wrap"><table className="directory-table session-directory"><caption className="sr-only">Sesiones con cliente, proyecto, estado y última actividad</caption><thead><tr><th scope="col">Sesión</th><th scope="col">Cliente / Proyecto</th><th scope="col">Estado</th><th scope="col">Última actividad</th>{onChanged && <th scope="col">Acciones</th>}</tr></thead><tbody>{items.map(session => <tr key={session.id}>
    <td data-label="Sesión"><Link className="directory-title" to={`/sesion/${session.id}?returnTo=${returnTo}`}>{session.title}</Link><small>{session.templateTitle} · {session.accessCode}</small>{session.ratingCount > 0 && <small>{session.ratingCount} {session.ratingCount === 1 ? 'valoración' : 'valoraciones'}</small>}</td>
    <td data-label="Cliente / Proyecto"><Link to={`/clientes/${session.clientId}`}>{session.clientName}</Link><Link className="directory-project" to={projectPath(session.clientId, session.projectId)}>{session.projectName} <span>· {session.projectCode}</span></Link></td>
    <td data-label="Estado">{session.isArchived && <span className="meta-chip">Archivada</span>}<PhaseBadge phase={session.status === 'Closed' ? 'WrapUp' : session.status === 'Draft' ? 'Draft' : session.phase} /></td>
    <td data-label="Última actividad"><time dateTime={session.updatedAtUtc}>{new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(session.updatedAtUtc))}</time></td>
    {onChanged && <td data-label="Acciones"><LifecycleActions kind="sessions" id={session.id} name={session.title} archived={session.isArchived} canDelete={session.status === 'Draft'} onChanged={onChanged} /></td>}
  </tr>)}</tbody></table></div>
}

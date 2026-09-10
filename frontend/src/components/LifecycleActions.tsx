import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { api } from '../lib/api'
import { SessionActionsMenu } from './SessionActionsMenu'

type Kind = 'clients' | 'projects' | 'templates' | 'sessions'
export function ArchiveFilter({ archived, onChange }: { archived: boolean; onChange: (value: boolean) => void }) {
  return <label>Mostrar<select aria-label="Mostrar" value={archived ? 'archived' : 'active'} onChange={event => onChange(event.target.value === 'archived')}><option value="active">Activos</option><option value="archived">Archivados</option></select></label>
}

export function LifecycleActions({ kind, id, name, archived, onChanged, canDelete = true }: { kind: Kind; id: string; name: string; archived: boolean; onChanged: (deleted: boolean) => void; canDelete?: boolean }) {
  const [action, setAction] = useState<'archive' | 'restore' | 'delete' | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => { if (action) dialog.current?.showModal(); else dialog.current?.close() }, [action])
  const verb = action === 'delete' ? 'Eliminar' : action === 'restore' ? 'Restaurar' : 'Archivar'
  return <>
    <span className="lifecycle-actions"><SessionActionsMenu label="Gestionar" ariaLabel={`Gestionar ${name}`} disabled={busy} actions={[{ label: archived ? 'Restaurar' : 'Archivar', run: () => { setError(''); setAction(archived ? 'restore' : 'archive') } }, ...(canDelete ? [{ label: 'Eliminar', danger: true, run: () => { setError(''); setAction('delete') } }] : [])]} /></span>
    {createPortal(<dialog ref={dialog} className="lifecycle-dialog" aria-labelledby={`lifecycle-${kind}-${id}`} onCancel={event => { if (busy) event.preventDefault(); else setAction(null) }} onClose={() => setAction(null)}><h2 id={`lifecycle-${kind}-${id}`}>{verb} «{name}»</h2><p>{action === 'delete' ? 'Esta acción es definitiva. Solo se eliminará si no tiene datos asociados; las sesiones deben estar preparadas y vacías.' : action === 'restore' ? 'Volverá al listado de activos. Los elementos relacionados conservan su estado de archivo.' : kind === 'sessions' ? 'La sesión quedará en consulta. No se podrán añadir participantes ni modificarla hasta restaurarla. Los datos se conservan.' : 'Se ocultará de los listados habituales y de la selección para crear trabajo nuevo. Su historial y los elementos relacionados se conservan.'}</p>{error && <p role="alert" className="error-banner">{error}</p>}<div className="action-row"><button autoFocus type="button" className="secondary-button" disabled={busy} onClick={() => setAction(null)}>Cancelar</button><button type="button" className={action === 'delete' ? 'danger-button' : 'primary-button'} disabled={busy} onClick={async () => {
      if (!action || busy) return
      setBusy(true); setError('')
      try { await api(`/api/lifecycle/${kind}/${id}`, { method: action === 'delete' ? 'DELETE' : 'PUT', ...(action === 'delete' ? {} : { body: JSON.stringify({ archived: action === 'archive' }) }) }); setAction(null); onChanged(action === 'delete') }
      catch (reason) { setError((reason as Error).message) } finally { setBusy(false) }
    }}>{busy ? 'Guardando…' : verb}</button></div></dialog>, document.body)}
  </>
}

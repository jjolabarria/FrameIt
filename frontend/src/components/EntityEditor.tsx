import { useState } from 'react'
import { api } from '../lib/api'
import { ErrorNotice } from './SessionUI'

export function EntityEditor({ kind, id, clientId, clientName, initialName = '', initialSecondary = '', onSaved, onCancel }: {
  kind: 'client' | 'project'; id?: string; clientId?: string; clientName?: string; initialName?: string; initialSecondary?: string;
  onSaved: (id: string) => void; onCancel: () => void
}) {
  const [name, setName] = useState(initialName)
  const [secondary, setSecondary] = useState(initialSecondary)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return <section className="panel creation-panel"><div className="panel-head"><h2>{id ? 'Editar' : 'Nuevo'} {kind === 'client' ? 'cliente' : 'proyecto'}</h2></div>{clientName && <p className="editor-context">Cliente: <strong>{clientName}</strong></p>}<ErrorNotice message={error} /><form onSubmit={async event => {
    event.preventDefault(); if (busy || !name.trim() || !secondary.trim() || (kind === 'project' && !id && !clientId)) return
    setBusy(true); setError('')
    try {
      const result = await api<string | undefined>(`/api/${kind === 'client' ? 'clients' : 'projects'}${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(kind === 'client' ? { name: name.trim(), industry: secondary.trim() } : { clientId, name: name.trim(), code: secondary.trim() }) })
      onSaved(id ?? result!)
    } catch (reason) { setError((reason as Error).message); setBusy(false) }
  }}><div className="form-grid"><label>Nombre del {kind === 'client' ? 'cliente' : 'proyecto'}<input autoFocus required maxLength={160} value={name} onChange={event => setName(event.target.value)} disabled={busy} /></label><label>{kind === 'client' ? 'Sector' : 'Código del proyecto'}<input required maxLength={kind === 'client' ? 100 : 30} value={secondary} onChange={event => setSecondary(kind === 'client' ? event.target.value : event.target.value.toUpperCase())} disabled={busy} /></label></div><div className="action-row"><button className="primary-button" disabled={busy || !name.trim() || !secondary.trim()}>{busy ? 'Guardando…' : id ? 'Guardar cambios' : kind === 'client' ? 'Crear cliente' : 'Crear proyecto'}</button><button type="button" className="ghost-button" disabled={busy} onClick={onCancel}>Cancelar</button></div></form></section>
}

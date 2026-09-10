import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { WorkspaceLayout } from '../components/WorkspaceLayout'
import { useFacilitatorAuth } from '../hooks/useFacilitatorAuth'
import { useResource } from '../hooks/useResource'
import { api } from '../lib/api'
import './TeamPage.css'

type Organization = { id: string; name: string }
type Invitation = { id: string; email: string; organizationName: string; expiresAtUtc: string; revokedAtUtc: string | null; acceptedAtUtc: string | null }
type Team = { organizations: Organization[]; users: { id: string; name: string; email: string | null; isAdmin: boolean; organizationName: string | null }[]; invitations: Invitation[] }

export function TeamPage() {
  const { auth } = useFacilitatorAuth()
  return auth.isAdmin ? <TeamManagement /> : <WorkspaceLayout title="Acceso restringido"><p>Solo el administrador de la plataforma puede gestionar organizaciones e invitaciones.</p><Link to="/espacio">Volver a mi espacio</Link></WorkspaceLayout>
}

function TeamManagement() {
  const { data, loading, error: loadError, reload } = useResource<Team>('/api/auth/team')
  const [email, setEmail] = useState('')
  const [organizationId, setOrganizationId] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [link, setLink] = useState('')
  const [confirmId, setConfirmId] = useState<string | null>(null)
  async function createOrganization(event: FormEvent) {
    event.preventDefault(); if (busy) return; setBusy(true); setError(''); setMessage('')
    try { const org = await api<Organization>('/api/auth/organizations', { method: 'POST', body: JSON.stringify({ name }) }); setName(''); setOrganizationId(org.id); setMessage('Organización creada. Ya puedes invitar a su equipo.'); reload() }
    catch (reason) { setError((reason as Error).message) } finally { setBusy(false) }
  }
  async function invite(event: FormEvent) {
    event.preventDefault(); if (busy) return; setBusy(true); setError(''); setMessage(''); setLink('')
    try { const result = await api<{ invitationUrl: string }>('/api/auth/invitations', { method: 'POST', body: JSON.stringify({ email, organizationId }) }); setLink(result.invitationUrl); setEmail(''); reload() }
    catch (reason) { setError((reason as Error).message) } finally { setBusy(false) }
  }
  async function revoke(id: string) {
    if (busy) return; setBusy(true); setError(''); setMessage('')
    try { await api(`/api/auth/invitations/${id}/revoke`, { method: 'POST' }); setConfirmId(null); setLink(''); setMessage('Invitación revocada. El enlace ya no permite activar una cuenta.'); reload() }
    catch (reason) { setError((reason as Error).message) } finally { setBusy(false) }
  }
  return <WorkspaceLayout title="Organizaciones y equipo" eyebrow="Administración" description="Cada facilitador trabaja en su organización. Como administrador puedes consultar todas.">
    {(error || loadError) && <p className="error-banner" role="alert">{error || loadError}</p>}
    {loadError && <button className="secondary-button" onClick={reload}>Reintentar</button>}
    {message && <p className="auth-success" role="status">{message}</p>}
    <div className="team-forms"><section><h2>Nueva organización</h2><form onSubmit={event => void createOrganization(event)}><label>Nombre de la organización<input required maxLength={160} value={name} onChange={event => setName(event.target.value)} disabled={busy} /></label><button className="secondary-button" disabled={busy || !name.trim()}>Crear organización</button></form></section>
    <section><h2>Invitar a un facilitador</h2><p>La persona elegirá su contraseña y activará el segundo factor. El enlace es de un solo uso y caduca en 7 días.</p><form onSubmit={event => void invite(event)}><label>Organización del facilitador<select required value={organizationId} onChange={event => setOrganizationId(event.target.value)} disabled={busy || !data}><option value="">Selecciona una organización</option>{data?.organizations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}</select></label><label>Correo de la persona invitada<input type="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} disabled={busy} /></label><button className="primary-button" disabled={busy || !organizationId || !email.trim()}>Crear enlace de invitación</button></form></section></div>
    {link && <section className="team-invite-result" aria-label="Invitación creada"><h2>Comparte este enlace</h2><p>No se ha enviado ningún correo automáticamente. Copia el enlace y envíalo solo a la persona invitada. Se muestra una única vez.</p><label>Enlace de invitación<input readOnly value={link} onFocus={event => event.target.select()} /></label><button className="secondary-button" onClick={() => void navigator.clipboard.writeText(link).then(() => setMessage('Enlace copiado.')).catch(() => setError('No se pudo copiar. Selecciona el enlace y cópialo manualmente.'))}>Copiar enlace</button><button className="ghost-button" onClick={() => setLink('')}>Ocultar enlace</button></section>}
    <section className="team-list"><h2>Facilitadores activos</h2>{loading && <p role="status">Cargando equipo…</p>}{data?.users.map(user => <article key={user.id}><div><strong>{user.name}</strong><p>{user.isAdmin ? 'Administrador · Todas las organizaciones' : user.organizationName}</p></div><span>{user.email}</span></article>)}</section>
    <section className="team-list"><h2>Invitaciones recientes</h2>{data?.invitations.length === 0 && <p>Todavía no hay invitaciones.</p>}{data?.invitations.map(invitation => {
      const status = invitation.acceptedAtUtc ? 'Aceptada' : invitation.revokedAtUtc ? 'Revocada' : Date.parse(invitation.expiresAtUtc) <= Date.now() ? 'Caducada' : 'Pendiente'
      return <article key={invitation.id}><div><strong>{invitation.email}</strong><p>{invitation.organizationName} · {status}</p><small>Caduca: {new Date(invitation.expiresAtUtc).toLocaleString('es-ES')}</small></div>{status === 'Pendiente' && (confirmId === invitation.id ? <div><p>¿Revocar este enlace?</p><button className="danger-button" disabled={busy} onClick={() => void revoke(invitation.id)}>Confirmar revocación</button><button className="ghost-button" disabled={busy} onClick={() => setConfirmId(null)}>Cancelar</button></div> : <button className="ghost-button" disabled={busy} onClick={() => setConfirmId(invitation.id)}>Revocar</button>)}</article>
    })}</section>
  </WorkspaceLayout>
}

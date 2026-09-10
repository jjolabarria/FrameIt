import { useFacilitatorAuth } from '../hooks/useFacilitatorAuth'
import { useResource } from '../hooks/useResource'

export function OrganizationScope() {
  const { auth } = useFacilitatorAuth()
  const { data, error } = useResource<{ organizations: { id: string; name: string }[] }>(auth.isAdmin ? '/api/auth/team' : null)
  if (!auth.isAdmin) return auth.organizationName ? <p className="organization-label" title={auth.organizationName}>{auth.organizationName}</p> : null
  let selected = ''
  try { selected = sessionStorage.getItem('frameit.admin-organization') ?? '' } catch { /* Optional storage. */ }
  return <div className="organization-scope"><label>Organización<select aria-label="Organización de trabajo" title={data?.organizations.find(org => org.id === selected)?.name ?? 'Todas las organizaciones'} value={selected} disabled={!data} onChange={event => {
    try { sessionStorage.setItem('frameit.admin-organization', event.target.value) } catch { return }
    // Reload at the workspace boundary so no cached data crosses organization scopes.
    window.location.assign('/espacio')
  }}><option value="">Todas las organizaciones</option>{data?.organizations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}</select></label>{error && <p role="alert">{error}</p>}</div>
}

import { BrandSymbol } from '../components/Brand'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useFacilitatorAuth } from '../hooks/useFacilitatorAuth'
import { api, titleCase } from '../lib/api'
import type { ClientSummary, SessionSummary, TemplateSummary } from '../types'

export function DashboardPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { auth, busy: authBusy, error: authError, login } = useFacilitatorAuth()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [navWorkspaceOpen, setNavWorkspaceOpen] = useState(true)
  const [navLibraryOpen, setNavLibraryOpen] = useState(true)
  const [clients, setClients] = useState<ClientSummary[]>([])
  const [templates, setTemplates] = useState<TemplateSummary[]>([])
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [sessionTitle, setSessionTitle] = useState('Sesión de descubrimiento')
  const [newClientName, setNewClientName] = useState('')
  const [newClientIndustry, setNewClientIndustry] = useState('')
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectCode, setNewProjectCode] = useState('')
  const [globalQuery, setGlobalQuery] = useState('')
  const [sessionQuery, setSessionQuery] = useState('')
  const [sessionStatusFilter, setSessionStatusFilter] = useState('all')
  const [sessionClientFilter, setSessionClientFilter] = useState('all')
  const [sessionProjectFilter, setSessionProjectFilter] = useState('all')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const selectedClient = useMemo(() => clients.find((item) => item.id === selectedClientId) ?? null, [clients, selectedClientId])
  const selectedProject = useMemo(() => selectedClient?.projects.find((project) => project.id === selectedProjectId) ?? null, [selectedClient, selectedProjectId])
  const selectedTemplate = useMemo(() => templates.find((item) => item.id === selectedTemplateId) ?? null, [templates, selectedTemplateId])
  const totalProjects = useMemo(() => clients.reduce((sum, client) => sum + client.projects.length, 0), [clients])
  const liveSessions = useMemo(() => sessions.filter((session) => session.status === 'Live' || session.phase !== 'Lobby').length, [sessions])
  const visibleClients = useMemo(() => {
    const query = globalQuery.trim().toLowerCase()
    if (!query) return clients
    return clients.filter((client) => {
      if (client.name.toLowerCase().includes(query) || client.industry.toLowerCase().includes(query)) return true
      return client.projects.some((project) => project.name.toLowerCase().includes(query) || project.code.toLowerCase().includes(query))
    })
  }, [clients, globalQuery])
  const visibleTemplates = useMemo(() => {
    const query = globalQuery.trim().toLowerCase()
    if (!query) return templates
    return templates.filter((template) => template.title.toLowerCase().includes(query) || template.objective.toLowerCase().includes(query))
  }, [globalQuery, templates])
  const filteredSessions = useMemo(() => {
    const query = `${globalQuery} ${sessionQuery}`.trim().toLowerCase()

    return sessions.filter((session) => {
      const matchesQuery =
        query.length === 0 ||
        session.title.toLowerCase().includes(query) ||
        session.templateTitle.toLowerCase().includes(query) ||
        session.accessCode.toLowerCase().includes(query)

      const matchesStatus = sessionStatusFilter === 'all' || session.status === sessionStatusFilter || session.phase === sessionStatusFilter
      const matchesClient = sessionClientFilter === 'all' || session.clientId === sessionClientFilter
      const matchesProject = sessionProjectFilter === 'all' || session.projectId === sessionProjectFilter

      return matchesQuery && matchesStatus && matchesClient && matchesProject
    })
  }, [globalQuery, sessionClientFilter, sessionProjectFilter, sessionQuery, sessionStatusFilter, sessions])

  async function loadDashboard() {
    const [nextClients, nextTemplates, nextSessions] = await Promise.all([
      api<ClientSummary[]>('/api/clients'),
      api<TemplateSummary[]>('/api/templates'),
      api<SessionSummary[]>('/api/sessions'),
    ])

    setClients(nextClients)
    setTemplates(nextTemplates)
    setSessions(nextSessions)
    setSelectedClientId((current) => (current && nextClients.some((client) => client.id === current) ? current : (nextClients[0]?.id ?? '')))
    setSelectedTemplateId((current) => (current && nextTemplates.some((template) => template.id === current) ? current : (nextTemplates[0]?.id ?? '')))
  }

  useEffect(() => {
    void loadDashboard().catch((reason: Error) => setError(reason.message))
  }, [])

  useEffect(() => {
    const nextProjectId = selectedClient?.projects[0]?.id ?? ''
    setSelectedProjectId((current) => {
      if (!selectedClient) return ''
      return selectedClient.projects.some((project) => project.id === current) ? current : nextProjectId
    })
  }, [selectedClient])

  async function createSession() {
    if (!auth.isAuthenticated) {
      setError('Debes iniciar sesión como facilitador para crear una sesión.')
      return
    }
    if (!selectedClientId || !selectedProjectId || !selectedTemplateId) {
      setError('Selecciona cliente, proyecto y plantilla.')
      return
    }

    setBusy(true)
    setError('')
    try {
      const created = await api<SessionSummary>('/api/sessions', {
        method: 'POST',
        body: JSON.stringify({
          clientId: selectedClientId,
          projectId: selectedProjectId,
          templateId: selectedTemplateId,
          title: sessionTitle,
        }),
      })
      navigate(`/sesion/${created.id}`)
    } catch (reason) {
      setError((reason as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function createClient() {
    if (!auth.isAuthenticated) {
      setError('Debes iniciar sesión como facilitador para crear clientes.')
      return
    }
    if (!newClientName.trim() || !newClientIndustry.trim()) {
      setError('Indica nombre e industria para crear cliente.')
      return
    }

    setBusy(true)
    setError('')
    try {
      const createdId = await api<string>('/api/clients', {
        method: 'POST',
        body: JSON.stringify({
          name: newClientName.trim(),
          industry: newClientIndustry.trim(),
        }),
      })
      await loadDashboard()
      setSelectedClientId(createdId)
      setNewClientName('')
      setNewClientIndustry('')
    } catch (reason) {
      setError((reason as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function createProject() {
    if (!auth.isAuthenticated) {
      setError('Debes iniciar sesión como facilitador para crear proyectos.')
      return
    }
    if (!selectedClientId || !newProjectName.trim() || !newProjectCode.trim()) {
      setError('Selecciona cliente y completa nombre y código del proyecto.')
      return
    }

    setBusy(true)
    setError('')
    try {
      const createdId = await api<string>('/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          clientId: selectedClientId,
          name: newProjectName.trim(),
          code: newProjectCode.trim().toUpperCase(),
        }),
      })
      await loadDashboard()
      setSelectedClientId(selectedClientId)
      setSelectedProjectId(createdId)
      setNewProjectName('')
      setNewProjectCode('')
    } catch (reason) {
      setError((reason as Error).message)
    } finally {
      setBusy(false)
    }
  }

  function formatSessionDate(value: string) {
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value))
  }

  return (
    <main className={`app-shell ${sidebarCollapsed ? 'app-shell-sidebar-collapsed' : ''}`}>
      <aside className={`sidebar ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <div className="brand-block">
          <BrandSymbol />
          <div className={sidebarCollapsed ? 'sidebar-copy-hidden' : ''}>
            <p className="kicker">FrameIt</p>
            <h1>Sala de operaciones</h1>
            <p className="sidebar-caption">Planifica talleres, lanza sesiones y controla la sala en vivo.</p>
          </div>
        </div>

        <section className="sidebar-panel">
          <p className="section-label">Navegación</p>
          <nav className="sidebar-nav">
            <div className="sidebar-group">
              <button className="sidebar-group-toggle" onClick={() => setNavWorkspaceOpen((current) => !current)} type="button">
                <span className="sidebar-icon">01</span>
                {!sidebarCollapsed ? <strong>Workspace</strong> : null}
              </button>
              {navWorkspaceOpen ? (
                <div className="sidebar-group-items">
                  <Link className={`sidebar-link-card ${location.pathname === '/' ? 'sidebar-link-card-active' : ''}`} to="/">
                    <div>
                      <strong>Centro de control</strong>
                      {!sidebarCollapsed ? <span>Portfolio, pipeline y sesiones activas.</span> : null}
                    </div>
                  </Link>
                </div>
              ) : null}
            </div>

            <div className="sidebar-group">
              <button className="sidebar-group-toggle" onClick={() => setNavLibraryOpen((current) => !current)} type="button">
                <span className="sidebar-icon">02</span>
                {!sidebarCollapsed ? <strong>Biblioteca</strong> : null}
              </button>
              {navLibraryOpen ? (
                <div className="sidebar-group-items">
                  <Link className={`sidebar-link-card ${location.pathname === '/disenador' ? 'sidebar-link-card-active' : ''}`} to="/disenador">
                    <div>
                      <strong>Diseñador de dinámicas</strong>
                      {!sidebarCollapsed ? <span>Plantillas, bloques y estructura reusable.</span> : null}
                    </div>
                  </Link>
                </div>
              ) : null}
            </div>
          </nav>
        </section>

        {!sidebarCollapsed ? (
          <section className="sidebar-panel">
            <p className="section-label">Vista rápida</p>
            <div className="sidebar-status">
              <article>
                <span>Clientes activos</span>
                <strong>{clients.length}</strong>
              </article>
              <article>
                <span>Proyectos activos</span>
                <strong>{totalProjects}</strong>
              </article>
              <article>
                <span>Sesiones vivas</span>
                <strong>{liveSessions}</strong>
              </article>
              <article>
                <span>Plantillas listas</span>
                <strong>{templates.length}</strong>
              </article>
            </div>
          </section>
        ) : null}

        {!sidebarCollapsed ? (
          <section className="sidebar-panel">
            <p className="section-label">Sesiones recientes</p>
            <div className="session-list">
              {sessions.slice(0, 5).map((session) => (
                <article className="session-list-item" key={session.id}>
                  <div>
                    <strong>{session.title}</strong>
                    <p>{session.templateTitle}</p>
                  </div>
                  <Link className="meta-chip" to={`/sesion/${session.id}`}>
                    {session.accessCode}
                  </Link>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </aside>

      <section className="workspace">
        <header className="dashboard-topbar">
          <div className="dashboard-topbar-main">
            <button className="ghost-button sidebar-toggle" onClick={() => setSidebarCollapsed((current) => !current)} type="button">
              {sidebarCollapsed ? 'Expandir menu' : 'Colapsar menu'}
            </button>
            <div className="dashboard-breadcrumbs">
              <span className="section-label">Workspace</span>
              <strong>{location.pathname === '/disenador' ? 'Diseñador' : 'Centro de control'}</strong>
            </div>
            <label className="dashboard-search">
              <span className="section-label">Buscar</span>
              <input placeholder="Clientes, proyectos, plantillas o sesiones" value={globalQuery} onChange={(event) => setGlobalQuery(event.target.value)} />
            </label>
          </div>
          <div className="dashboard-topbar-actions">
            <Link className="secondary-link" to="/disenador">
              Nueva plantilla
            </Link>
            <button className="primary-button" disabled={busy || authBusy || !auth.isAuthenticated} onClick={createSession} type="button">
              Nueva sesión
            </button>
            <span className="meta-chip">{clients.length} cuentas</span>
            <span className="meta-chip">{filteredSessions.length} sesiones filtradas</span>
            <div className="dashboard-avatar">
              <span>{(auth.name ?? 'FI').slice(0, 2).toUpperCase()}</span>
              {!sidebarCollapsed ? <strong>{auth.isAuthenticated ? auth.name ?? 'Facilitador' : 'Guest'}</strong> : null}
            </div>
          </div>
        </header>

        <div className="workspace-body">
        <header className="page-header">
          <div className="page-header-title">
            <h2>Centro de control</h2>
            {liveSessions > 0 && (
              <span className="live-indicator">
                <span className="live-dot" />
                {liveSessions} {liveSessions === 1 ? 'sesión activa' : 'sesiones activas'}
              </span>
            )}
          </div>
          <div className="page-header-stats">
            <span><strong>{clients.length}</strong> clientes</span>
            <span><strong>{totalProjects}</strong> proyectos</span>
            <span><strong>{sessions.length}</strong> sesiones</span>
          </div>
        </header>

        {!auth.isAuthenticated && (
          <div className="auth-notice">
            <span>Modo lectura — crear sesiones y clientes requiere autenticación.</span>
            <button className="auth-notice-action" disabled={authBusy} onClick={() => void login()} type="button">
              Entrar como facilitador
            </button>
          </div>
        )}

        {error ? <div className="error-banner">{error}</div> : null}
        {authError ? <div className="error-banner">{authError}</div> : null}

        <section className="dashboard-main-grid">
          <article className={`surface ${auth.isAuthenticated ? '' : 'surface-locked'}`}>
            <div className="surface-head">
              <div>
                <p className="section-label">Launchpad</p>
                <h3>Lanza una sala desde plantilla</h3>
              </div>
              {selectedTemplate ? <span className="meta-chip">{selectedTemplate.questionCount} preguntas</span> : null}
            </div>

            <div className="form-grid">
              <label>
                Cliente
                <select value={selectedClientId} onChange={(event) => setSelectedClientId(event.target.value)}>
                {visibleClients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                  ))}
                </select>
              </label>
              <label>
                Proyecto
                <select value={selectedProjectId} onChange={(event) => setSelectedProjectId(event.target.value)}>
                  {(selectedClient?.projects ?? []).map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label>
              Plantilla
              <select value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)}>
                {visibleTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.title}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Título de sesión
              <input value={sessionTitle} onChange={(event) => setSessionTitle(event.target.value)} />
            </label>

            <div className="simple-list">
              <article>
                <strong>Cliente activo</strong>
                <span>{selectedClient?.name ?? 'Selecciona un cliente'}</span>
              </article>
              <article>
                <strong>Proyecto activo</strong>
                <span>{selectedProject ? `${selectedProject.name} · ${selectedProject.code}` : 'Selecciona proyecto'}</span>
              </article>
              <article>
                <strong>Objetivo base</strong>
                <span>{selectedTemplate?.objective ?? 'Selecciona una plantilla para ver su enfoque.'}</span>
              </article>
            </div>

            <div className="action-row">
              <button className="primary-button" disabled={busy || authBusy || !auth.isAuthenticated} onClick={createSession} type="button">
                Crear y abrir sesión
              </button>
              <Link className="secondary-link" to="/disenador">
                Abrir diseñador
              </Link>
            </div>
          </article>

          <section className="workspace-section-stack">
            <article className="surface">
              <div className="surface-head">
                <div>
                  <p className="section-label">CRM ligero</p>
                  <h3>Clientes y proyectos</h3>
                </div>
                <span className="meta-chip">{totalProjects} proyectos</span>
              </div>

              <div className="management-grid">
                <section className="management-panel">
                  <div className="mini-head">
                    <div>
                      <p className="section-label">Nuevo cliente</p>
                      <h4>Alta rápida</h4>
                    </div>
                  </div>
                  <label>
                    Nombre
                    <input placeholder="Contoso" value={newClientName} onChange={(event) => setNewClientName(event.target.value)} />
                  </label>
                  <label>
                    Industria
                    <input placeholder="Servicios financieros" value={newClientIndustry} onChange={(event) => setNewClientIndustry(event.target.value)} />
                  </label>
                  <button className="secondary-button" disabled={busy || authBusy || !auth.isAuthenticated} onClick={createClient} type="button">
                    Crear cliente
                  </button>
                </section>

                <section className="management-panel">
                  <div className="mini-head">
                    <div>
                      <p className="section-label">Nuevo proyecto</p>
                      <h4>Asociado a cliente</h4>
                    </div>
                  </div>
                  <label>
                    Cliente
                    <select value={selectedClientId} onChange={(event) => setSelectedClientId(event.target.value)}>
                      {visibleClients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="form-grid">
                    <label>
                      Nombre
                      <input placeholder="Copilot adoption Q2" value={newProjectName} onChange={(event) => setNewProjectName(event.target.value)} />
                    </label>
                    <label>
                      Código
                      <input placeholder="M365-01" value={newProjectCode} onChange={(event) => setNewProjectCode(event.target.value.toUpperCase())} />
                    </label>
                  </div>
                  <button className="secondary-button" disabled={busy || authBusy || !auth.isAuthenticated} onClick={createProject} type="button">
                    Crear proyecto
                  </button>
                </section>
              </div>

              <div className="portfolio-list">
                {visibleClients.map((client) => (
                  <article className="portfolio-item" key={client.id}>
                    <div>
                      <strong>{client.name}</strong>
                      <p>{client.industry}</p>
                    </div>
                    <div className="stat-stack">
                      <span className="meta-chip">{client.projects.length} proyectos</span>
                      <span>{client.projects.reduce((sum, project) => sum + project.sessionCount, 0)} sesiones</span>
                    </div>
                  </article>
                ))}
              </div>
            </article>

            <article className="surface">
              <div className="surface-head">
                <div>
                  <p className="section-label">Portfolio live</p>
                  <h3>Sesiones, pipeline y seguimiento</h3>
                </div>
                <span className="meta-chip">{filteredSessions.length} visibles</span>
              </div>

              <div className="session-filter-grid">
                <label>
                  Buscar
                  <input placeholder="Título, plantilla o código" value={sessionQuery} onChange={(event) => setSessionQuery(event.target.value)} />
                </label>
                <label>
                  Estado
                  <select value={sessionStatusFilter} onChange={(event) => setSessionStatusFilter(event.target.value)}>
                    <option value="all">Todo</option>
                    <option value="Draft">Draft</option>
                    <option value="Live">Live</option>
                    <option value="Closed">Closed</option>
                    <option value="Lobby">Lobby</option>
                    <option value="RoundOpen">Round open</option>
                    <option value="Waiting">Waiting</option>
                    <option value="Results">Results</option>
                    <option value="WrapUp">Wrap up</option>
                  </select>
                </label>
                <label>
                  Cliente
                  <select value={sessionClientFilter} onChange={(event) => setSessionClientFilter(event.target.value)}>
                    <option value="all">Todos</option>
                    {visibleClients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Proyecto
                  <select value={sessionProjectFilter} onChange={(event) => setSessionProjectFilter(event.target.value)}>
                    <option value="all">Todos</option>
                    {visibleClients.flatMap((client) => client.projects).map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="session-board">
                {filteredSessions.map((session) => (
                  <article className="session-board-item" key={session.id}>
                    <div>
                      <strong>{session.title}</strong>
                      <p>{session.templateTitle}</p>
                      <span className="session-board-meta">Código {session.accessCode} · Actualizada {formatSessionDate(session.updatedAtUtc)}</span>
                    </div>
                    <div className="stat-stack">
                      <span className="meta-chip">{titleCase(session.phase)}</span>
                      <span className={`status-pill status-pill-${session.status.toLowerCase()}`}>{session.status}</span>
                      <Link className="secondary-link" to={`/sesion/${session.id}`}>
                        Abrir
                      </Link>
                    </div>
                  </article>
                ))}
              </div>

              {filteredSessions.length === 0 ? (
                <div className="empty-panel">
                  <strong>No hay sesiones con ese filtro.</strong>
                  <p>Ajusta búsqueda o crea nueva sala desde launchpad.</p>
                </div>
              ) : null}
            </article>

            <article className="surface">
              <div className="surface-head">
                <div>
                  <p className="section-label">Plantillas</p>
                  <h3>Biblioteca operativa</h3>
                </div>
                <Link className="secondary-link" to="/disenador">
                  Gestionar
                </Link>
              </div>
              <div className="catalog-list">
                {visibleTemplates.map((template) => (
                  <article className="catalog-item" key={template.id}>
                    <div>
                      <strong>{template.title}</strong>
                      <p>{template.objective}</p>
                    </div>
                    <span>{template.questionCount} preguntas</span>
                  </article>
                ))}
              </div>
            </article>
          </section>
        </section>
        </div>
      </section>
    </main>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr'
import './App.css'

type ProjectSummary = {
  id: string
  name: string
  code: string
  sessionCount: number
}

type ClientSummary = {
  id: string
  name: string
  industry: string
  projects: ProjectSummary[]
}

type TemplateSummary = {
  id: string
  title: string
  objective: string
  questionCount: number
}

type SessionSummary = {
  id: string
  title: string
  accessCode: string
  status: string
  phase: string
  roundOpen: boolean
  resultsVisible: boolean
  templateTitle: string
}

type ParticipantSummary = {
  id: string
  displayName: string
  isConnected: boolean
}

type ResponseSummary = {
  id: string
  participantName: string
  value: string
}

type OutcomeItem = {
  bucket: string
  text: string
}

type QuestionOption = {
  id: string
  label: string
}

type SessionSnapshot = {
  id: string
  title: string
  accessCode: string
  status: string
  phase: string
  roundOpen: boolean
  resultsVisible: boolean
  timerSeconds: number
  roundOpenedAtUtc?: string | null
  activeQuestionId: string
  sectionIndex: number
  sectionCount: number
  questionIndex: number
  questionCount: number
  responseVisibility: string
  responseIdentityMode: string
  celebrationStyle: string
  joinUrl: string
  qrSvg: string
  templateTitle: string
  sectionTitle: string
  questionTitle: string
  questionPrompt: string
  questionKind: string
  options: QuestionOption[]
  participants: ParticipantSummary[]
  responses: ResponseSummary[]
  outcomes: OutcomeItem[]
}

const joinRoute = /^\/join\/(?<code>[A-Z0-9]+)$/i

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  })

  if (!response.ok) {
    throw new Error(await response.text())
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

function getTimeRemaining(snapshot: SessionSnapshot | null, now: number) {
  if (!snapshot?.roundOpen || !snapshot.roundOpenedAtUtc) {
    return snapshot?.timerSeconds ?? 0
  }

  const opened = new Date(snapshot.roundOpenedAtUtc).getTime()
  const elapsed = Math.floor((now - opened) / 1000)
  return Math.max(snapshot.timerSeconds - elapsed, 0)
}

function App() {
  const [clients, setClients] = useState<ClientSummary[]>([])
  const [templates, setTemplates] = useState<TemplateSummary[]>([])
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [sessionTitle, setSessionTitle] = useState('Discovery Session')
  const [joinCodeInput, setJoinCodeInput] = useState(() => window.location.pathname.match(joinRoute)?.groups?.code?.toUpperCase() ?? '')
  const [joinAlias, setJoinAlias] = useState('')
  const [participantId, setParticipantId] = useState('')
  const [answer, setAnswer] = useState('')
  const [snapshot, setSnapshot] = useState<SessionSnapshot | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [tick, setTick] = useState(() => Date.now())

  const selectedClient = useMemo(() => clients.find((x) => x.id === selectedClientId) ?? null, [clients, selectedClientId])
  const selectedProject = useMemo(() => selectedClient?.projects.find((x) => x.id === selectedProjectId) ?? null, [selectedClient, selectedProjectId])
  const isJoinMode = Boolean(window.location.pathname.match(joinRoute))
  const timeRemaining = getTimeRemaining(snapshot, tick)

  useEffect(() => {
    const timer = window.setInterval(() => setTick(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    void Promise.all([
      api<ClientSummary[]>('/api/clients'),
      api<TemplateSummary[]>('/api/templates'),
      api<SessionSummary[]>('/api/sessions'),
    ])
      .then(([nextClients, nextTemplates, nextSessions]) => {
        setClients(nextClients)
        setTemplates(nextTemplates)
        setSessions(nextSessions)
        setSelectedClientId(nextClients[0]?.id ?? '')
        setSelectedProjectId(nextClients[0]?.projects[0]?.id ?? '')
        setSelectedTemplateId(nextTemplates[0]?.id ?? '')
      })
      .catch((reason: Error) => setError(reason.message))
  }, [])

  useEffect(() => {
    if (!joinCodeInput) {
      return
    }

    void api<SessionSnapshot>(`/api/sessions/by-code/${joinCodeInput}`)
      .then(setSnapshot)
      .catch(() => undefined)
  }, [joinCodeInput])

  useEffect(() => {
    if (!snapshot?.accessCode) {
      return
    }

    const connection = new HubConnectionBuilder()
      .withUrl('/hubs/session')
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build()

    connection.on('session-updated', (nextSnapshot: SessionSnapshot) => {
      setSnapshot(nextSnapshot)
      setSessions((current) =>
        current.map((session) =>
          session.id === nextSnapshot.id
            ? {
                ...session,
                phase: nextSnapshot.phase,
                status: nextSnapshot.status,
                roundOpen: nextSnapshot.roundOpen,
                resultsVisible: nextSnapshot.resultsVisible,
              }
            : session,
        ),
      )
    })

    void connection.start().then(() => connection.invoke('JoinSession', snapshot.accessCode)).catch((reason: Error) => setError(reason.message))

    return () => {
      void connection.invoke('LeaveSession', snapshot.accessCode).catch(() => undefined)
      void connection.stop()
    }
  }, [snapshot?.accessCode])

  async function facilitatorLogin() {
    await api('/api/auth/login', { method: 'POST' })
  }

  async function createSession() {
    if (!selectedClientId || !selectedProjectId || !selectedTemplateId) {
      setError('Selecciona cliente, proyecto y plantilla.')
      return
    }

    setBusy(true)
    setError('')
    try {
      await facilitatorLogin()
      const created = await api<SessionSummary>('/api/sessions', {
        method: 'POST',
        body: JSON.stringify({
          clientId: selectedClientId,
          projectId: selectedProjectId,
          templateId: selectedTemplateId,
          title: sessionTitle,
        }),
      })
      setSessions((current) => [created, ...current])
      setJoinCodeInput(created.accessCode)
      window.history.replaceState(null, '', `/join/${created.accessCode}`)
      setSnapshot(await api<SessionSnapshot>(`/api/sessions/${created.id}`))
    } catch (reason) {
      setError((reason as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function loadByCode() {
    setBusy(true)
    setError('')
    try {
      const loaded = await api<SessionSnapshot>(`/api/sessions/by-code/${joinCodeInput}`)
      setSnapshot(loaded)
      window.history.replaceState(null, '', `/join/${loaded.accessCode}`)
    } catch (reason) {
      setError((reason as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function joinSession() {
    if (!snapshot || !joinAlias.trim()) {
      setError('Escribe tu alias.')
      return
    }

    setBusy(true)
    setError('')
    try {
      const result = await api<{ id: string }>(`/api/sessions/${snapshot.id}/join`, {
        method: 'POST',
        body: JSON.stringify({ displayName: joinAlias.trim() }),
      })
      setParticipantId(result.id)
    } catch (reason) {
      setError((reason as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function sendResponse() {
    if (!snapshot || !participantId || !answer.trim()) {
      setError('No hay respuesta que enviar.')
      return
    }

    setBusy(true)
    setError('')
    try {
      const next = await api<SessionSnapshot>(`/api/sessions/${snapshot.id}/responses`, {
        method: 'POST',
        body: JSON.stringify({
          participantId,
          questionId: snapshot.activeQuestionId,
          value: answer.trim(),
        }),
      })
      setSnapshot(next)
      setAnswer('')
    } catch (reason) {
      setError((reason as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function updateRoundState(phase: 'Lobby' | 'RoundOpen' | 'Waiting' | 'Results' | 'WrapUp', roundOpen: boolean, resultsVisible: boolean) {
    if (!snapshot) {
      return
    }

    setBusy(true)
    setError('')
    try {
      await facilitatorLogin()
      const next = await api<SessionSnapshot>(`/api/sessions/${snapshot.id}/round-state`, {
        method: 'POST',
        body: JSON.stringify({
          phase,
          roundOpen,
          resultsVisible,
          activeSectionId: undefined,
          activeQuestionId: snapshot.activeQuestionId,
        }),
      })
      setSnapshot(next)
    } catch (reason) {
      setError((reason as Error).message)
    } finally {
      setBusy(false)
    }
  }

  function participantStateLabel() {
    if (!snapshot) return 'No session'
    if (!participantId) return 'Join'
    if (snapshot.resultsVisible || snapshot.phase === 'Results') return 'Results'
    if (snapshot.roundOpen) return 'Answer now'
    if (snapshot.phase === 'Waiting') return 'Waiting'
    return 'Lobby'
  }

  return (
    <main className="shell">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">FrameIt</p>
          <h1>Rapid, hybrid workshop facilitation with a Kahoot-like join flow.</h1>
          <p className="lede">
            Interna por naturaleza, profesional ante cliente. El participante entra en segundos con código y alias, siga la ronda desde cualquier ubicación y recibe feedback claro sin fricción.
          </p>
        </div>
        {error ? <p className="error">{error}</p> : null}
        <div className="hero-stats">
          <article><strong>{clients.length}</strong><span>Clientes</span></article>
          <article><strong>{templates.length}</strong><span>Plantillas</span></article>
          <article><strong>{sessions.length}</strong><span>Sesiones</span></article>
        </div>
      </section>

      <section className="grid">
        <article className="panel">
          <header className="panel-header">
            <div>
              <p className="eyebrow">Facilitator</p>
              <h2>Launch and control</h2>
            </div>
            <span className="badge">{selectedProject?.code ?? 'NO PROJECT'}</span>
          </header>

          <label>
            Cliente
            <select value={selectedClientId} onChange={(event) => setSelectedClientId(event.target.value)}>
              {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
            </select>
          </label>

          <label>
            Proyecto
            <select value={selectedProjectId} onChange={(event) => setSelectedProjectId(event.target.value)}>
              {(selectedClient?.projects ?? []).map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </label>

          <label>
            Plantilla
            <select value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)}>
              {templates.map((template) => <option key={template.id} value={template.id}>{template.title}</option>)}
            </select>
          </label>

          <label>
            Título de sesión
            <input value={sessionTitle} onChange={(event) => setSessionTitle(event.target.value)} />
          </label>

          <button className="primary" disabled={busy} onClick={createSession} type="button">Create session</button>

          {snapshot ? (
            <div className="collection">
              <h3>Round controls</h3>
              <div className="action-grid">
                <button disabled={busy} onClick={() => void updateRoundState('Lobby', false, false)} type="button">Open lobby</button>
                <button disabled={busy} onClick={() => void updateRoundState('RoundOpen', true, false)} type="button">Open round</button>
                <button disabled={busy} onClick={() => void updateRoundState('Waiting', false, false)} type="button">Close round</button>
                <button disabled={busy} onClick={() => void updateRoundState('Results', false, true)} type="button">Reveal results</button>
                <button disabled={busy} onClick={() => void updateRoundState('WrapUp', false, true)} type="button">Wrap up</button>
              </div>
            </div>
          ) : null}

          <div className="collection">
            <h3>Recent sessions</h3>
            {sessions.map((session) => (
              <article className="list-item" key={session.id}>
                <div>
                  <strong>{session.title}</strong>
                  <p>{session.templateTitle}</p>
                </div>
                <span>{session.accessCode}</span>
              </article>
            ))}
          </div>
        </article>

        <article className="panel">
          <header className="panel-header">
            <div>
              <p className="eyebrow">Participant</p>
              <h2>{isJoinMode ? 'Join in seconds' : 'Live session'}</h2>
            </div>
            <span className="badge">{participantStateLabel()}</span>
          </header>

          {!snapshot ? (
            <div className="empty-state">
              <p>Introduce el código y entra sin depender de una pantalla compartida.</p>
              <label>
                Código de acceso
                <input value={joinCodeInput} onChange={(event) => setJoinCodeInput(event.target.value.toUpperCase())} />
              </label>
              <button disabled={busy || joinCodeInput.length < 4} onClick={loadByCode} type="button">Load session</button>
            </div>
          ) : (
            <>
              <div className="session-summary">
                <div>
                  <strong>{snapshot.title}</strong>
                  <p>{snapshot.templateTitle}</p>
                </div>
                <span>{snapshot.sectionIndex}/{snapshot.sectionCount} · {snapshot.questionIndex}/{snapshot.questionCount}</span>
              </div>

              <div className="progress-rail">
                <div className="progress-fill" style={{ width: `${(snapshot.questionIndex / Math.max(snapshot.questionCount, 1)) * 100}%` }} />
              </div>

              <div className="timer-card">
                <div>
                  <p className="eyebrow">Round timer</p>
                  <strong>{timeRemaining}s</strong>
                </div>
                <div className={`pulse ${snapshot.roundOpen ? 'is-live' : ''}`}>
                  {snapshot.roundOpen ? 'LIVE' : snapshot.resultsVisible ? 'RESULTS' : snapshot.phase.toUpperCase()}
                </div>
              </div>

              <div className="question-block">
                <p className="eyebrow">{snapshot.sectionTitle}</p>
                <h3>{snapshot.questionTitle}</h3>
                <p>{snapshot.questionPrompt}</p>
                {snapshot.options.length > 0 ? (
                  <ul className="options">
                    {snapshot.options.map((option) => <li key={option.id}>{option.label}</li>)}
                  </ul>
                ) : null}
              </div>

              <div className="join-controls">
                <input placeholder="Tu alias" value={joinAlias} onChange={(event) => setJoinAlias(event.target.value)} />
                <button disabled={busy || !joinAlias.trim()} onClick={joinSession} type="button">{participantId ? 'Connected' : 'Join session'}</button>
              </div>

              <div className="join-controls">
                <textarea
                  rows={4}
                  placeholder={
                    snapshot.roundOpen
                      ? 'Escribe tu respuesta y envíala antes de que cierre la ronda'
                      : snapshot.resultsVisible
                        ? 'La ronda está cerrada. Revisa los resultados.'
                        : 'Espera a que el facilitador abra la siguiente ronda'
                  }
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  disabled={!snapshot.roundOpen || !participantId}
                />
                <button disabled={busy || !snapshot.roundOpen || !participantId || !answer.trim()} onClick={sendResponse} type="button">
                  Send answer
                </button>
              </div>

              <div className="status-strip">
                <span>Visibilidad: {snapshot.responseVisibility}</span>
                <span>Autoría: {snapshot.responseIdentityMode}</span>
                <span>Celebración: {snapshot.celebrationStyle}</span>
              </div>

              <div className="two-cols">
                <section className="collection">
                  <h3>Participants</h3>
                  {snapshot.participants.map((participant) => (
                    <article className="list-item" key={participant.id}>
                      <strong>{participant.displayName}</strong>
                      <span>{participant.isConnected ? 'Online' : 'Offline'}</span>
                    </article>
                  ))}
                </section>

                <section className={`collection ${snapshot.resultsVisible ? 'celebrate' : ''}`}>
                  <h3>Responses</h3>
                  {snapshot.responses.length === 0 ? <p>Aun no hay resultados visibles para el grupo.</p> : null}
                  {snapshot.responses.map((response) => (
                    <article className="list-item" key={response.id}>
                      <strong>{response.participantName}</strong>
                      <p>{response.value}</p>
                    </article>
                  ))}
                </section>
              </div>

              {snapshot.outcomes.length > 0 ? (
                <section className="collection">
                  <h3>Session outcomes</h3>
                  {snapshot.outcomes.map((outcome, index) => (
                    <article className="list-item" key={`${outcome.bucket}-${index}`}>
                      <strong>{outcome.bucket}</strong>
                      <p>{outcome.text}</p>
                    </article>
                  ))}
                </section>
              ) : null}
            </>
          )}
        </article>

        <article className="panel wide">
          <header className="panel-header">
            <div>
              <p className="eyebrow">Operating model</p>
              <h2>Client, project and template context</h2>
            </div>
          </header>
          <div className="three-cols">
            <section className="collection">
              <h3>Clients</h3>
              {clients.map((client) => (
                <article className="list-item" key={client.id}>
                  <div>
                    <strong>{client.name}</strong>
                    <p>{client.industry}</p>
                  </div>
                  <span>{client.projects.length} projects</span>
                </article>
              ))}
            </section>
            <section className="collection">
              <h3>Projects</h3>
              {(selectedClient?.projects ?? []).map((project) => (
                <article className="list-item" key={project.id}>
                  <div>
                    <strong>{project.name}</strong>
                    <p>{project.code}</p>
                  </div>
                  <span>{project.sessionCount} sessions</span>
                </article>
              ))}
            </section>
            <section className="collection">
              <h3>Templates</h3>
              {templates.map((template) => (
                <article className="list-item" key={template.id}>
                  <div>
                    <strong>{template.title}</strong>
                    <p>{template.objective}</p>
                  </div>
                  <span>{template.questionCount} qs</span>
                </article>
              ))}
            </section>
          </div>
        </article>
      </section>
    </main>
  )
}

export default App

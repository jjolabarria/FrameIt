import { TeamPage } from './pages/TeamPage'
import { LegalPage } from './pages/LegalPage'
import { JoinPage } from './pages/JoinPage'
import { LandingPage } from './pages/LandingPage'
import { AuthPage, AuthGate, SecurityPage } from './components/LocalAuth'
import { Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { ClientsPage } from './pages/ClientsPage'
import { DesignerPage } from './pages/DesignerPage'
import { FacilitatorSessionPage } from './pages/FacilitatorSessionPage'
import { HomePage } from './pages/HomePage'
import { ParticipantSessionPage } from './pages/ParticipantSessionPage'
import { ProjectionSessionPage } from './pages/ProjectionSessionPage'
import { SessionsPage } from './pages/SessionsPage'
import { TemplatesPage } from './pages/TemplatesPage'

function App() {
  return (
    <Routes>
      <Route path="/aviso-legal" element={<LegalPage kind="notice" />} />
      <Route path="/privacidad" element={<LegalPage kind="privacy" />} />
      <Route path="/cookies" element={<LegalPage kind="cookies" />} />
      <Route path="/invitacion" element={<AuthPage invitation />} />
      <Route path="/equipo" element={<AuthGate><TeamPage /></AuthGate>} />
      <Route path="/acceso" element={<AuthPage />} />
      <Route path="/seguridad" element={<AuthGate><SecurityPage /></AuthGate>} />
      <Route path="/" element={<LandingPage />} />
      <Route path="/espacio" element={<AuthGate><HomePage /></AuthGate>} />
      <Route path="/sesiones" element={<AuthGate><SessionsPage /></AuthGate>} />
      <Route path="/clientes" element={<AuthGate><ClientsPage /></AuthGate>} />
      <Route path="/clientes/:clientId" element={<AuthGate><ClientsPage /></AuthGate>} />
      <Route path="/clientes/:clientId/proyectos/:projectId" element={<AuthGate><SessionsPage /></AuthGate>} />
      <Route path="/plantillas" element={<AuthGate><TemplatesPage /></AuthGate>} />
      <Route path="/disenador" element={<AuthGate><DesignerPage /></AuthGate>} />
      <Route path="/sesion/:sessionId" element={<AuthGate><FacilitatorSessionPage /></AuthGate>} />
      <Route path="/proyeccion/:code" element={<ProjectionSessionPage />} />
      <Route path="/join" element={<JoinPage />} />
      <Route path="/proyeccion" element={<JoinPage readOnly />} />
      <Route path="/join/:code" element={<ParticipantSessionPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App

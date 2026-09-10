import { LegalFooter } from '../components/LegalFooter'
import { Brand } from '../components/Brand'
import { Link } from 'react-router-dom'
import { SessionCodeForm } from '../components/SessionCodeForm'

export function JoinPage({ readOnly = false }: { readOnly?: boolean }) {
  return <div className="public-join-page">
    <header className="public-join-header"><Link to="/" aria-label="FrameIt, inicio"><Brand /></Link></header>
    <main className="public-join-card"><p className="section-label">Entrada a una sesión</p><h1>{readOnly ? 'Sigue la sesión.' : 'Conecta con tu sesión.'}</h1><p>Introduce el código que te ha compartido el facilitador. Puedes participar con tu alias o seguir la sesión como lector.</p><SessionCodeForm key={readOnly ? 'read' : 'participate'} initialMode={readOnly ? 'read' : 'participate'} /><Link className="public-join-back" to="/">Volver a FrameIt</Link></main>
    <LegalFooter />
  </div>
}

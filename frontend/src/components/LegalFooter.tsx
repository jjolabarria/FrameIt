import { Link, NavLink } from 'react-router-dom'
import './Legal.css'

const legalLinks = [
  { to: '/aviso-legal', label: 'Aviso legal' },
  { to: '/privacidad', label: 'Privacidad' },
  { to: '/cookies', label: 'Cookies' },
]

export function LegalFooter() {
  return <footer className="legal-footer">
    <div><p>FrameIt es un servicio de <a href="https://olatic.es/">OLATIC</a>.</p><p>© {new Date().getFullYear()} OLATIC GROUP SOLUTIONS, S.L.</p></div>
    <nav aria-label="Información legal">{legalLinks.map(link => <NavLink key={link.to} to={link.to}>{link.label}</NavLink>)}<a href="mailto:info@olatic.es">Contacto</a></nav>
    <p className="legal-cookie-note">Utilizamos cookies técnicas y almacenamiento de sesión para el acceso y la participación. Sin cookies de analítica ni publicidad. <Link to="/cookies">Consultar su uso</Link>.</p>
  </footer>
}

export function ParticipationPrivacyNotice() {
  return <p className="privacy-notice">OLATIC presta FrameIt para gestionar el taller. Tu alias y aportaciones se guardan en la sesión y pueden compartirse con el grupo según su configuración. Consulta las finalidades, el uso de IA y tus derechos en la <Link to="/privacidad">política de privacidad</Link>. Evita incluir datos sensibles o de terceros sin autorización.</p>
}

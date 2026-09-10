import { OrganizationScope } from './OrganizationScope'
import { Brand } from './Brand'
import type { ReactNode } from 'react'

import { Link, NavLink } from 'react-router-dom'

import { ShieldCheck, UsersRound, UserRound, Building2, LayoutDashboard, Library, Radio, Search } from 'lucide-react'

import { useFacilitatorAuth } from '../hooks/useFacilitatorAuth'



type WorkspaceLayoutProps = {

  children: ReactNode

  title: string

  eyebrow?: string

  description?: string

  search?: {

    value: string

    placeholder: string

    onChange: (value: string) => void

  }

  actions?: ReactNode

}



const navItems = [

  { to: '/espacio', label: 'Inicio', icon: LayoutDashboard },

  { to: '/sesiones', label: 'Sesiones', icon: Radio },

  { to: '/clientes', label: 'Clientes', icon: Building2 },

  { to: '/plantillas', label: 'Plantillas', icon: Library },


]



export function WorkspaceLayout({ children, title, eyebrow = 'FrameIt', description, search, actions }: WorkspaceLayoutProps) {

  const { auth, busy, error, login, logout } = useFacilitatorAuth()



  return (

    <div className="workspace-shell"><a className="skip-link" href="#main-content">Saltar al contenido</a>

      <aside className="workspace-sidebar">

        <Link className="brand-link" to="/espacio">

          <Brand tagline="Talleres que avanzan" />

        </Link>



        <nav className="workspace-nav" aria-label="Navegación principal">

          {[...navItems, ...(auth.isAdmin ? [{ to: '/equipo', label: 'Equipo', icon: UsersRound }] : [])].map((item) => {

            const Icon = item.icon

            return (

              <NavLink className={({ isActive }) => `workspace-nav-link ${isActive ? 'workspace-nav-link--active' : ''}`} end={item.to === '/espacio'} key={item.to} to={item.to}>

                <Icon size={18} strokeWidth={1.9} />

                <span>{item.label}</span>

              </NavLink>

            )

          })}

        </nav>



        <section className="workspace-sidebar-status">

          {auth.isAuthenticated ? <>
            <OrganizationScope />
            <details className="user-settings" onKeyDown={event => {
              if (event.key === 'Escape') { event.currentTarget.open = false; event.currentTarget.querySelector('summary')?.focus() }
            }}>
              <summary><UserRound size={18} /><span>{auth.name ?? 'Facilitador'}</span></summary>
              <nav aria-label="Configuración del usuario">
                <NavLink className={({ isActive }) => `workspace-nav-link ${isActive ? 'workspace-nav-link--active' : ''}`} to="/configuracion/seguridad"><ShieldCheck size={16} /><span>Seguridad</span></NavLink>
                <button className="secondary-button" disabled={busy} onClick={() => void logout()} type="button">Cerrar sesión</button>
              </nav>
            </details>
          </> : <><div className="operator-chip"><UserRound size={16} /><span>Sin acceso</span></div><button className="secondary-button" disabled={busy} onClick={() => void login()} type="button">Entrar</button></>}

          {error ? <p role="alert" className="micro-error">{error}</p> : null}

        </section>

      </aside>



      <main className="workspace-main" id="main-content">

        <header className="workspace-topbar">

          <div className="workspace-title">

            <p className="section-label">{eyebrow}</p>

            <h1>{title}</h1>

            {description ? <p>{description}</p> : null}

          </div>



          <div className="workspace-topbar-actions">

            {search ? (

              <label className="workspace-search">

                <Search size={16} />

                <input aria-label={search.placeholder} placeholder={search.placeholder} value={search.value} onChange={(event) => search.onChange(event.target.value)} />

              </label>

            ) : null}

            {actions}

          </div>

        </header>



        <section className="workspace-content">{children}</section>

      </main>

    </div>

  )

}



export function EmptyState({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {

  return (

    <div className="empty-state">

      <strong>{title}</strong>

      <p>{children}</p>

      {action ? <div className="action-row">{action}</div> : null}

    </div>

  )

}

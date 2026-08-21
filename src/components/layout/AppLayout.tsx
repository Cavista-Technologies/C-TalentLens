import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../features/auth/authContext'

type AppLayoutProps = {
  title: string
  children: ReactNode
}

export function AppLayout({ title, children }: AppLayoutProps) {
  const { logout, user } = useAuth()

  return (
    <main className="app-layout">
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <img className="sidebar-logo" src="/cavista-logo.png" alt="Cavista" />
          <div>
            <strong>TalentLens</strong>
            <span>Recruitment dashboard</span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            Dashboard
          </NavLink>
        </nav>

        <div className="sidebar-account">
          {user && (
            <div>
              <strong>{user.fullName}</strong>
              <span>{user.roles.join(', ')}</span>
            </div>
          )}
          <button type="button" onClick={logout}>
            Logout
          </button>
        </div>
      </aside>

      <section className="app-main">
        <header className="app-topbar">
          <div>
            <p className="eyebrow">TalentLens</p>
            <h1>{title}</h1>
          </div>
        </header>

        {children}
      </section>
    </main>
  )
}

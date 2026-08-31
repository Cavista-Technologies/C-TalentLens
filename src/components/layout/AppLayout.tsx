import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../features/auth/authContext'
import { canUseRecruitmentWrite, canViewAnalytics } from '../../features/auth/roleAccess'

type AppLayoutProps = {
  title: string
  eyebrow?: string
  children: ReactNode
}

export function AppLayout({ title, eyebrow = 'C-TalentLens', children }: AppLayoutProps) {
  const { logout, user } = useAuth()
  const showAnalytics = canViewAnalytics(user)
  const showImport = canUseRecruitmentWrite(user)

  return (
    <main className="app-layout">
      <header className="app-header">
        <div className="app-brand">
          <img className="app-logo" src="/cavista-logo.png" alt="Cavista" />
          <div>
            <strong>C-TalentLens</strong>
          </div>
        </div>

        <nav className="app-nav" aria-label="Main navigation">
          <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            Dashboard
          </NavLink>
          <NavLink to="/requisitions" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            Requisitions
          </NavLink>
          <NavLink to="/referrals" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            Referrals
          </NavLink>
          {showAnalytics && (
            <NavLink to="/analytics" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              Analytics
            </NavLink>
          )}
          {showImport && (
            <NavLink to="/imports" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              Import
            </NavLink>
          )}
          <NavLink to="/alerts" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            Alerts
          </NavLink>
        </nav>

        <div className="app-account">
          {user && (
            <div>
              <strong>{user.fullName}</strong>
              <span>{formatRole(user.roles[0])}</span>
            </div>
          )}
          <button type="button" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <section className="app-main">
        <header className="app-topbar">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
          </div>
        </header>

        {children}
      </section>
    </main>
  )
}

function formatRole(role?: string) {
  return role ? role.replace(/([a-z])([A-Z])/g, '$1 $2') : 'User'
}

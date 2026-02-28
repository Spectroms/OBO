import { Outlet, NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import './Layout.css'

export default function Layout() {
  const { user, profile, canViewTeam } = useAuth()

  return (
    <div className="layout">
      <header className="layout-header">
        <div className="layout-brand">
          <img src="/logo.png" alt="OBO" className="layout-logo" onError={(e) => { e.target.style.display = 'none' }} />
          <span className="layout-title">OBO <em>horaires</em></span>
        </div>
        <nav className="layout-nav">
          <NavLink to="/" end>Aujourd'hui</NavLink>
          <NavLink to="/calendrier">Calendrier</NavLink>
          {canViewTeam && <NavLink to="/dashboard">Tableau de bord</NavLink>}
          <NavLink to="/settings">Paramètres</NavLink>
        </nav>
      </header>
      <main className="layout-main">
        <Outlet />
      </main>
    </div>
  )
}

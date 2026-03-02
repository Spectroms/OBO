import { useState, useEffect } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import './Layout.css'

export default function Layout() {
  const { user, profile, canViewTeam } = useAuth()
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)

  useEffect(() => {
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  return (
    <div className="layout">
      {!online && (
        <div className="layout-offline-banner" role="status" aria-live="polite">
          Vous êtes hors ligne. Les modifications seront synchronisées à la reconnexion.
        </div>
      )}
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

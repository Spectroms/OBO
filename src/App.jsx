import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { useTheme } from './hooks/useTheme'
import Layout from './components/Layout'
import Login from './pages/Login'
import Today from './pages/Today'
import Calendar from './pages/Calendar'
import Settings from './pages/Settings'
import Dashboard from './pages/Dashboard'

function ProtectedRoute({ children }) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()
  const onSettings = location.pathname === '/settings'
  if (loading) return <div className="app-loading">Chargement…</div>
  if (!user) return <Navigate to="/login" replace />
  if (profile && !profile.display_name?.trim() && !onSettings) return <Navigate to="/settings" replace state={{ requireName: true }} />
  return children
}

function App() {
  useTheme()
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Today />} />
        <Route path="calendrier" element={<Calendar />} />
        <Route path="settings" element={<Settings />} />
        <Route path="dashboard" element={<Dashboard />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App

import { useState, useEffect } from 'react'
import { supabase, hasSupabase } from '../lib/supabaseClient'
import { formatDuration } from '../lib/utils'
import ExportButton from '../components/ExportButton'
import './Dashboard.css'

export default function Dashboard() {
  const [profiles, setProfiles] = useState([])
  const [entriesByUser, setEntriesByUser] = useState({})
  const [loading, setLoading] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [y, m] = selectedMonth.split('-').map(Number)

  useEffect(() => {
    if (!hasSupabase()) {
      setLoading(false)
      return
    }
    supabase.from('profiles').select('id, display_name, email').eq('role', 'employee').order('display_name').then(({ data }) => {
      setProfiles(data || [])
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!hasSupabase() || !selectedUserId || !selectedMonth) return
    const [y, m] = selectedMonth.split('-').map(Number)
    const start = `${selectedMonth}-01`
    const lastDay = new Date(y, m, 0).getDate()
    const end = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`
    supabase
      .from('entries')
      .select('*')
      .eq('user_id', selectedUserId)
      .gte('date', start)
      .lte('date', end)
      .order('date')
      .then(({ data }) => {
        const byDate = {}
        ;(data || []).forEach((row) => { byDate[row.date] = row })
        setEntriesByUser((prev) => ({ ...prev, [selectedUserId]: byDate }))
      })
  }, [selectedUserId, selectedMonth])

  const entries = selectedUserId ? (entriesByUser[selectedUserId] || {}) : {}
  const totalMinutes = Object.values(entries).reduce((sum, e) => sum + (e.total_minutes || 0), 0)
  const profile = profiles.find((p) => p.id === selectedUserId)

  if (loading) return <div className="dashboard-loading">Chargement…</div>

  return (
    <div className="dashboard-page">
      <h1>Tableau de bord</h1>
      <p className="dashboard-desc">Consulter les horaires par personne.</p>

      <div className="dashboard-controls">
        <label>
          Personne
          <select value={selectedUserId || ''} onChange={(e) => setSelectedUserId(e.target.value || null)}>
            <option value="">— Choisir —</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>{p.display_name || p.email}</option>
            ))}
          </select>
        </label>
        <label>
          Mois
          <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
        </label>
      </div>

      {selectedUserId && (
        <section className="dashboard-summary">
          <h2>{profile?.display_name || profile?.email}</h2>
          <ExportButton entries={entries} year={y} month={m} displayName={profile?.display_name || profile?.email} />
          <p><strong>Total du mois :</strong> {formatDuration(totalMinutes)}</p>
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Durée</th>
                <th>Activité / Note</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(entries)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([date, ent]) => (
                  <tr key={date}>
                    <td>{date}</td>
                    <td>{ent.day_type === 'cp' ? 'CP' : ent.day_type === 'recup' ? 'Récup' : ent.day_type === 'ferie' ? (ent.slots?.length ? 'Férié travaillé' : 'Férié chômé') : 'Normal'}</td>
                    <td>{ent.total_minutes ? formatDuration(ent.total_minutes) : '—'}</td>
                    <td>{(ent.activity || ent.note) ? [ent.activity, ent.note].filter(Boolean).join(' — ') : '—'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          {Object.keys(entries).length === 0 && <p className="no-entries">Aucune entrée pour ce mois.</p>}
        </section>
      )}
    </div>
  )
}

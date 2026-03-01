import { useState, useMemo, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useEntries } from '../hooks/useEntries'
import { useReminder } from '../hooks/useReminder'
import ExportButton from '../components/ExportButton'
import { supabase, hasSupabase } from '../lib/supabaseClient'
import { getJoursFeries } from '../lib/joursFeries'
import { getMonthRecap, formatDuration, formatDateStrFromDate } from '../lib/utils'
import DayEditor from '../components/DayEditor'
import './Calendar.css'

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const ACTIVITY_LEGEND = [
  { name: 'Dépôt', color: '#223E7E' },
  { name: 'Foire', color: '#c1121f' },
  { name: 'Contenaire', color: '#2d6a4f' },
  { name: 'Déplacement', color: '#7b2cbf' },
  { name: 'Déménagement', color: '#e85d04' },
]

export default function Calendar() {
  const { user, profile } = useAuth()
  const { entries, loading, upsertEntry } = useEntries(user?.id)
  useReminder(entries, true)
  const today = useMemo(() => {
    const t = new Date()
    return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0')
  }, [])

  const [viewDate, setViewDate] = useState(() => new Date())
  const [editorDate, setEditorDate] = useState(null)
  const [exportDisplayName, setExportDisplayName] = useState('')
  const [legendOpen, setLegendOpen] = useState(false)

  useEffect(() => {
    if (profile?.display_name?.trim()) {
      setExportDisplayName(profile.display_name.trim())
      return
    }
    if (!user?.id || !hasSupabase()) return
    supabase.rpc('get_my_display_name').then(({ data }) => {
      if (data != null && String(data).trim()) setExportDisplayName(String(data).trim())
    })
  }, [user?.id, profile?.display_name])

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth() + 1
  const joursFeriesSet = useMemo(() => getJoursFeries(year), [year])

  const recap = useMemo(() => getMonthRecap(entries, year, month, joursFeriesSet), [entries, year, month, joursFeriesSet])

  const { calendarRows, firstDay } = useMemo(() => {
    const first = new Date(year, month - 1, 1)
    const last = new Date(year, month, 0)
    const firstDay = (first.getDay() + 6) % 7
    const rows = []
    let row = []
    for (let i = 0; i < firstDay; i++) row.push(null)
    for (let d = 1; d <= last.getDate(); d++) {
      row.push(new Date(year, month - 1, d))
      if (row.length === 7) {
        rows.push(row)
        row = []
      }
    }
    if (row.length) {
      while (row.length < 7) row.push(null)
      rows.push(row)
    }
    return { calendarRows: rows, firstDay }
  }, [year, month])

  function prevMonth() {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1))
  }

  function nextMonth() {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1))
  }

  function openEditor(dateStr) {
    setEditorDate(dateStr)
  }

  if (loading) return <div className="calendar-loading">Chargement…</div>

  return (
    <div className="calendar-page">
      <div className="calendar-nav">
        <button type="button" onClick={prevMonth}>←</button>
        <h1>{MONTHS[month - 1]} {year}</h1>
        <button type="button" onClick={nextMonth}>→</button>
      </div>

      <button
        type="button"
        className="calendar-legend-toggle"
        onClick={() => setLegendOpen((o) => !o)}
        title="Légende des couleurs par activité"
        aria-expanded={legendOpen}
      >
        <span className="calendar-legend-icon" aria-hidden>◇</span>
        <span className="calendar-legend-label">{legendOpen ? 'Masquer la légende' : 'Légende activités'}</span>
      </button>

      {legendOpen && (
        <div className="calendar-legend-panel" role="region" aria-label="Légende des couleurs par activité">
          <h3 className="calendar-legend-title">Activités</h3>
          <ul className="calendar-legend-list">
            {ACTIVITY_LEGEND.map(({ name, color }) => (
              <li key={name} className="calendar-legend-item">
                <span className="calendar-legend-bar" style={{ background: color }} />
                <span>{name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="calendar-grid-wrap">
        <table className="calendar-grid">
          <thead>
            <tr>
              {WEEKDAYS.map((w) => (
                <th key={w}>{w}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {calendarRows.map((row, ri) => (
              <tr key={ri}>
                {row.map((d, di) => {
                  if (!d) return <td key={di} className="empty" />
                  const dateStr = formatDateStrFromDate(d)
                  const ent = entries[dateStr]
                  const isFerie = joursFeriesSet.has(dateStr)
                  const isDimanche = d.getDay() === 0
                  const isToday = dateStr === today
                  const hasEntry = !!ent
                  const dayTypeClass = !ent ? '' : ent.day_type === 'cp' ? 'day-cp' : ent.day_type === 'recup' ? 'day-recup' : ent.day_type === 'ferie' && !ent?.slots?.length ? 'day-ferie' : ent.day_type === 'ferie' && ent?.slots?.length ? 'day-ferie-worked' : 'day-normal'
                  const activityClass = ent?.activity && ent.activity.trim() ? `activity-${ent.activity.trim().toLowerCase().replace(/\s/g, '-').replace(/é/g, 'e').replace(/è/g, 'e')}` : ''
                  const label = ent?.day_type === 'cp' ? 'CP' : ent?.day_type === 'recup' ? 'Récup' : ent?.day_type === 'ferie' && !ent?.slots?.length ? 'Férié chômé' : ent?.total_minutes ? formatDuration(ent.total_minutes) : ''
                  return (
                    <td key={di} className={`cell ${isToday ? 'today' : ''} ${hasEntry ? 'has-entry' : ''} ${isDimanche ? 'dimanche' : ''} ${isFerie ? 'ferie' : ''} ${dayTypeClass} ${activityClass}`}>
                      <button type="button" className="cell-inner" onClick={() => openEditor(dateStr)}>
                        <span className="cell-day">{d.getDate()}</span>
                        {label && <span className="cell-label">{label}</span>}
                        {ent?.activity && ent.activity.trim() && <span className="cell-activity-bar" title={ent.activity} aria-hidden />}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="calendar-recap">
        <h2>Récap du mois</h2>
        <p>Total : {formatDuration(recap.totalMinutes)}</p>
        <ul>
          {recap.ferieCount - recap.ferieTravaillesCount > 0 && <li>{recap.ferieCount - recap.ferieTravaillesCount} jour(s) férié(s) chômé(s)</li>}
          {recap.ferieTravaillesCount > 0 && <li>{recap.ferieTravaillesCount} jour(s) férié(s) travaillé(s)</li>}
          {recap.cpCount > 0 && <li>{recap.cpCount} CP</li>}
          {recap.recupCount > 0 && <li>{recap.recupCount} récup</li>}
          {recap.dimancheCount > 0 && <li>{recap.dimancheCount} dimanche(s) travaillé(s)</li>}
        </ul>
      </section>

      <ExportButton entries={entries} year={year} month={month} displayName={profile?.display_name?.trim() || exportDisplayName} />

      {editorDate && (
        <DayEditor
          dateStr={editorDate}
          initialEntry={entries[editorDate]}
          onSave={upsertEntry}
          onClose={() => setEditorDate(null)}
        />
      )}
    </div>
  )
}

import { useState, useMemo } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useEntries } from '../hooks/useEntries'
import { useReminder } from '../hooks/useReminder'
import ExportButton from '../components/ExportButton'
import { getJoursFeries } from '../lib/joursFeries'
import { getMonthRecap, formatDuration, formatDateStrFromDate } from '../lib/utils'
import DayEditor from '../components/DayEditor'
import './Calendar.css'

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

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
      <ExportButton entries={entries} year={year} month={month} displayName={profile?.display_name} />

      <div className="calendar-nav">
        <button type="button" onClick={prevMonth}>←</button>
        <h1>{MONTHS[month - 1]} {year}</h1>
        <button type="button" onClick={nextMonth}>→</button>
      </div>

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
                  const isToday = dateStr === today
                  const hasEntry = !!ent
                  const label = ent?.day_type === 'cp' ? 'CP' : ent?.day_type === 'recup' ? 'Récup' : ent?.day_type === 'ferie' && !ent?.slots?.length ? 'Férié' : ent?.total_minutes ? formatDuration(ent.total_minutes) : ''
                  return (
                    <td key={di} className={`cell ${isToday ? 'today' : ''} ${hasEntry ? 'has-entry' : ''} ${isFerie ? 'ferie' : ''}`}>
                      <button type="button" className="cell-inner" onClick={() => openEditor(dateStr)}>
                        <span className="cell-day">{d.getDate()}</span>
                        {label && <span className="cell-label">{label}</span>}
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
          {recap.ferieCount > 0 && <li>{recap.ferieCount} jour(s) férié(s){recap.ferieTravaillesCount > 0 ? ` dont ${recap.ferieTravaillesCount} travaillé(s)` : ''}</li>}
          {recap.cpCount > 0 && <li>{recap.cpCount} CP</li>}
          {recap.recupCount > 0 && <li>{recap.recupCount} récup</li>}
          {recap.dimancheCount > 0 && <li>{recap.dimancheCount} dimanche(s) travaillé(s)</li>}
        </ul>
      </section>

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

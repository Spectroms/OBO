import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useEntries } from '../hooks/useEntries'
import { slotsToMinutes, formatDuration, DAY_NAMES, MONTH_NAMES, ACTIVITIES, getDefaultSlots, getDefaultSlotForAdd } from '../lib/utils'
import { getJoursFeries } from '../lib/joursFeries'
import './Today.css'

const DAY_TYPES = [
  { value: 'normal', label: 'Normal' },
  { value: 'cp', label: 'CP' },
  { value: 'recup', label: 'Récup' },
]

function todayStr() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

export default function Today() {
  const { user } = useAuth()
  const { entries, loading, upsertEntry, deleteEntry } = useEntries(user?.id)
  const dateStr = todayStr()
  const d = new Date(dateStr + 'T12:00:00')
  const dayName = DAY_NAMES[d.getDay()]
  const monthName = MONTH_NAMES[d.getMonth()]
  const dateLabel = `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${d.getDate()} ${monthName ? monthName.charAt(0).toUpperCase() + monthName.slice(1) : ''} ${d.getFullYear()}`
  const initialEntry = entries[dateStr]

  const [dayType, setDayType] = useState(initialEntry?.day_type === 'ferie' ? 'normal' : (initialEntry?.day_type || 'normal'))
  const [slots, setSlots] = useState(initialEntry?.slots?.length ? [...initialEntry.slots] : getDefaultSlots())
  const [activity, setActivity] = useState(initialEntry?.activity || 'Dépôt')
  const [note, setNote] = useState(initialEntry?.note || '')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setDayType(initialEntry?.day_type === 'ferie' ? 'normal' : (initialEntry?.day_type || 'normal'))
    setSlots(initialEntry?.slots?.length ? [...initialEntry.slots] : getDefaultSlots())
    setActivity(initialEntry?.activity || 'Dépôt')
    setNote(initialEntry?.note || '')
  }, [initialEntry])

  const totalMinutes = dayType === 'normal' ? slotsToMinutes(slots) : 0
  const showSlots = dayType === 'normal'

  function addSlot() {
    setSlots((s) => [...s, getDefaultSlotForAdd()])
  }

  function removeSlot(i) {
    setSlots((s) => s.filter((_, idx) => idx !== i))
  }

  function updateSlot(i, field, value) {
    setSlots((s) => s.map((slot, idx) => (idx === i ? { ...slot, [field]: value } : slot)))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    let savedDayType = dayType
    if (showSlots && slots.length > 0 && dateStr) {
      const year = parseInt(dateStr.slice(0, 4), 10)
      if (getJoursFeries(year).has(dateStr)) savedDayType = 'ferie'
    }
    const payload = {
      day_type: savedDayType,
      slots: (savedDayType === 'normal' || savedDayType === 'ferie') ? slots : [],
      activity: activity || null,
      note: note || null,
      total_minutes: totalMinutes,
    }
    await upsertEntry(dateStr, payload)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) return <div className="today-loading">Chargement…</div>

  return (
    <div className="today-page">
      <h1 className="today-title">Horaires du jour</h1>
      <p className="today-date">{dateLabel}</p>

      <form onSubmit={handleSubmit} className="today-form">
        <label>
          Type de jour
          <select value={dayType} onChange={(e) => setDayType(e.target.value)}>
            {DAY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </label>
        {showSlots && (
          <>
            <div className="slots-block">
              <div className="slots-header">
                <span>Créneaux</span>
                <button type="button" onClick={addSlot}>+ Ajouter</button>
              </div>
              {slots.map((slot, i) => (
                <div key={i} className="slot-row">
                  <input type="time" value={slot.start} onChange={(e) => updateSlot(i, 'start', e.target.value)} />
                  <span>–</span>
                  <input type="time" value={slot.end} onChange={(e) => updateSlot(i, 'end', e.target.value)} />
                  {slots.length > 1 && <button type="button" onClick={() => removeSlot(i)}>×</button>}
                </div>
              ))}
              <p className="day-total">Total : {formatDuration(totalMinutes)}</p>
            </div>
            <label>
              Activité
              <select value={activity} onChange={(e) => setActivity(e.target.value)}>
                {ACTIVITIES.map((a) => (
                  <option key={a || 'none'} value={a}>{a || '—'}</option>
                ))}
              </select>
            </label>
          </>
        )}
        <label>
          Note / lieu
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex. VILLENEUVE, AVIGNON" />
        </label>
        <div className="today-actions">
          <button type="submit" className="btn-primary btn-save">
            {saved ? 'Enregistré' : 'Enregistrer'}
          </button>
          {initialEntry && (
            <button
              type="button"
              className="btn-reset-day"
              onClick={() => deleteEntry(dateStr)}
            >
              Réinitialiser
            </button>
          )}
        </div>
      </form>

      <p className="today-link">
        <Link to="/calendrier">Saisir un autre jour / Voir le calendrier</Link>
      </p>
    </div>
  )
}

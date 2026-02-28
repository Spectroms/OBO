import { useState, useEffect } from 'react'
import { slotsToMinutes, formatDuration, DAY_NAMES, ACTIVITIES } from '../lib/utils'
import './DayEditor.css'

const DAY_TYPES = [
  { value: 'normal', label: 'Normal' },
  { value: 'ferie', label: 'Férié' },
  { value: 'cp', label: 'CP' },
  { value: 'recup', label: 'Récup' },
]

export default function DayEditor({ dateStr, initialEntry, onSave, onClose }) {
  const d = dateStr ? new Date(dateStr + 'T12:00:00') : new Date()
  const dayName = DAY_NAMES[d.getDay()]
  const [dayType, setDayType] = useState(initialEntry?.day_type || 'normal')
  const [ferieTravaille, setFerieTravaille] = useState(!!(initialEntry?.day_type === 'ferie' && initialEntry?.slots?.length))
  const [slots, setSlots] = useState(initialEntry?.slots?.length ? [...initialEntry.slots] : [{ start: '08:00', end: '12:00' }, { start: '13:00', end: '17:00' }])
  const [activity, setActivity] = useState(initialEntry?.activity || '')
  const [note, setNote] = useState(initialEntry?.note || '')

  useEffect(() => {
    setDayType(initialEntry?.day_type || 'normal')
    setFerieTravaille(!!(initialEntry?.day_type === 'ferie' && initialEntry?.slots?.length))
    setSlots(initialEntry?.slots?.length ? [...initialEntry.slots] : [{ start: '08:00', end: '12:00' }, { start: '13:00', end: '17:00' }])
    setActivity(initialEntry?.activity || '')
    setNote(initialEntry?.note || '')
  }, [dateStr, initialEntry])

  const totalMinutes = (dayType === 'normal' || (dayType === 'ferie' && ferieTravaille)) ? slotsToMinutes(slots) : 0

  function addSlot() {
    setSlots((s) => [...s, { start: '09:00', end: '17:00' }])
  }

  function removeSlot(i) {
    setSlots((s) => s.filter((_, idx) => idx !== i))
  }

  function updateSlot(i, field, value) {
    setSlots((s) => s.map((slot, idx) => (idx === i ? { ...slot, [field]: value } : slot)))
  }

  function handleSubmit(e) {
    e.preventDefault()
    const payload = {
      day_type: dayType,
      slots: (dayType === 'normal' || (dayType === 'ferie' && ferieTravaille)) ? slots : [],
      activity: activity || null,
      note: note || null,
      total_minutes: totalMinutes,
    }
    onSave(dateStr, payload)
    onClose()
  }

  const showSlots = dayType === 'normal' || (dayType === 'ferie' && ferieTravaille)

  return (
    <div className="day-editor-overlay" onClick={onClose}>
      <div className="day-editor" onClick={(e) => e.stopPropagation()}>
        <h2>
          {d.getDate()} {dayName} {d.getMonth() + 1}/{d.getFullYear()}
        </h2>
        <form onSubmit={handleSubmit}>
          <label>
            Type de jour
            <select value={dayType} onChange={(e) => setDayType(e.target.value)}>
              {DAY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </label>
          {dayType === 'ferie' && (
            <label className="checkbox-label">
              <input type="checkbox" checked={ferieTravaille} onChange={(e) => setFerieTravaille(e.target.checked)} />
              Férié travaillé
            </label>
          )}
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
          <div className="day-editor-actions">
            <button type="button" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn-primary">Enregistrer</button>
          </div>
        </form>
      </div>
    </div>
  )
}

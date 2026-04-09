import { useState, useEffect, useMemo } from 'react'
import { slotsToMinutes, formatDuration, DAY_NAMES, ACTIVITIES, getDefaultSlots, getDefaultSlotForAdd, normalizeActivityLabel } from '../lib/utils'
import { DAY_TYPES } from '../lib/constants'
import { getJoursFeries } from '../lib/joursFeries'
import './DayEditor.css'

export default function DayEditor({ dateStr, initialEntry, onSave, onClose, onDelete }) {
  const d = dateStr ? new Date(dateStr + 'T12:00:00') : new Date()
  const dayName = DAY_NAMES[d.getDay()]
  const initialKey = useMemo(() => (
    dateStr + (initialEntry?.updated_at ?? '') + JSON.stringify(initialEntry?.slots ?? [])
  ), [dateStr, initialEntry?.updated_at, initialEntry?.slots])

  const [dayType, setDayType] = useState(initialEntry?.day_type === 'ferie' ? 'normal' : (initialEntry?.day_type || 'normal'))
  const [slots, setSlots] = useState(initialEntry?.slots?.length ? [...initialEntry.slots] : getDefaultSlots())
  const [activity, setActivity] = useState(normalizeActivityLabel(initialEntry?.activity) || 'Dépôt')
  const [note, setNote] = useState(initialEntry?.note || '')
  const [decouche, setDecouche] = useState(!!initialEntry?.decouche)
  const [decoucheZone, setDecoucheZone] = useState(initialEntry?.decouche_zone === 'etranger' ? 'etranger' : 'france')
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setDayType(initialEntry?.day_type === 'ferie' ? 'normal' : (initialEntry?.day_type || 'normal'))
    setSlots(initialEntry?.slots?.length ? [...initialEntry.slots] : getDefaultSlots())
    setActivity(normalizeActivityLabel(initialEntry?.activity) || 'Dépôt')
    setNote(initialEntry?.note || '')
    setDecouche(!!initialEntry?.decouche)
    setDecoucheZone(initialEntry?.decouche_zone === 'etranger' ? 'etranger' : 'france')
  }, [initialKey])

  const totalMinutes = dayType === 'normal' ? slotsToMinutes(slots) : 0
  const showDetails = dayType === 'normal'

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
    setSaveError('')
    setSaving(true)
    let savedDayType = dayType
    const hasSlots = dayType === 'normal' && slots.length > 0
    if (hasSlots && dateStr) {
      const year = parseInt(dateStr.slice(0, 4), 10)
      if (getJoursFeries(year).has(dateStr)) savedDayType = 'ferie'
    }
    const payload = {
      day_type: savedDayType,
      slots: (savedDayType === 'normal' || savedDayType === 'ferie') ? slots : [],
      activity: (savedDayType === 'normal' || savedDayType === 'ferie') ? (activity || null) : null,
      note: (savedDayType === 'normal' || savedDayType === 'ferie') ? (note || null) : null,
      decouche,
      decouche_zone: decouche ? decoucheZone : null,
      total_minutes: totalMinutes,
    }
    try {
      const saveResult = onSave(dateStr, payload)
      if (saveResult && typeof saveResult.then === 'function') await saveResult
      onClose()
    } catch (err) {
      setSaveError(err?.message || 'Erreur lors de l’enregistrement.')
    } finally {
      setSaving(false)
    }
  }

  const showSlots = dayType === 'normal'

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
          {showDetails && (
            <>
              <label>
                Note / lieu
                <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex. VILLENEUVE, AVIGNON" />
              </label>
              <label className="checkbox-label">
                <input type="checkbox" checked={decouche} onChange={(e) => setDecouche(e.target.checked)} />
                Découcher
              </label>
              {decouche && (
                <label>
                  Zone du découcher
                  <select value={decoucheZone} onChange={(e) => setDecoucheZone(e.target.value)}>
                    <option value="france">France</option>
                    <option value="etranger">Étranger</option>
                  </select>
                </label>
              )}
            </>
          )}
          {saveError && <p className="day-editor-error" role="alert">{saveError}</p>}
          <div className="day-editor-actions">
            {initialEntry && onDelete && (
              <button
                type="button"
                className="day-editor-delete"
                onClick={() => { onDelete(dateStr); onClose(); }}
              >
                Réinitialiser
              </button>
            )}
            <button type="button" onClick={onClose} disabled={saving}>Annuler</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? '…' : 'Enregistrer'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

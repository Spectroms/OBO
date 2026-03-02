import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  slotsToMinutes,
  formatDuration,
  formatDurationDecimal,
  getMonthRecap,
  getDefaultSlots,
  getDefaultSlotForAdd,
} from './utils'
import { getJoursFeries } from './joursFeries'

describe('slotsToMinutes', () => {
  it('retourne 0 pour tableau vide ou non-tableau', () => {
    expect(slotsToMinutes([])).toBe(0)
    expect(slotsToMinutes(null)).toBe(0)
    expect(slotsToMinutes(undefined)).toBe(0)
  })

  it('calcule la somme des créneaux valides', () => {
    expect(slotsToMinutes([
      { start: '08:00', end: '12:00' },
      { start: '13:00', end: '17:00' },
    ])).toBe(4 * 60 + 4 * 60)
    expect(slotsToMinutes([{ start: '09:00', end: '09:30' }])).toBe(30)
  })

  it('ignore les créneaux avec end <= start', () => {
    expect(slotsToMinutes([{ start: '12:00', end: '08:00' }])).toBe(0)
  })
})

describe('formatDuration', () => {
  it('formate en heures et minutes', () => {
    expect(formatDuration(0)).toBe('0h')
    expect(formatDuration(60)).toBe('1h')
    expect(formatDuration(90)).toBe('1h30')
    expect(formatDuration(480)).toBe('8h')
  })

  it('gère null/NaN', () => {
    expect(formatDuration(null)).toBe('0h')
    expect(formatDuration(NaN)).toBe('0h')
  })
})

describe('formatDurationDecimal', () => {
  it('formate en décimal avec virgule', () => {
    expect(formatDurationDecimal(0)).toBe('0,0')
    expect(formatDurationDecimal(60)).toBe('1,0')
    expect(formatDurationDecimal(90)).toBe('1,5')
  })
})

describe('getMonthRecap', () => {
  it('calcule le total et les compteurs pour un mois', () => {
    const joursFeries = getJoursFeries(2024)
    const entries = {
      '2024-01-02': { day_type: 'normal', total_minutes: 480, slots: [{ start: '08:00', end: '17:00' }] },
      '2024-01-03': { day_type: 'cp' },
      '2024-01-04': { day_type: 'recup' },
    }
    const recap = getMonthRecap(entries, 2024, 1, joursFeries)
    expect(recap.totalMinutes).toBe(480)
    expect(recap.cpCount).toBe(1)
    expect(recap.recupCount).toBe(1)
  })

  it('compte les dimanches travaillés', () => {
    const entries = {
      '2024-01-07': { day_type: 'normal', total_minutes: 420 }, // dimanche
    }
    const recap = getMonthRecap(entries, 2024, 1, new Set())
    expect(recap.dimancheCount).toBe(1)
  })
})

describe('getDefaultSlots / getDefaultSlotForAdd', () => {
  const origLocalStorage = global.localStorage
  beforeEach(() => {
    global.localStorage = { getItem: () => null }
  })
  afterEach(() => {
    global.localStorage = origLocalStorage
  })

  it('getDefaultSlots retourne des créneaux par défaut', () => {
    const slots = getDefaultSlots()
    expect(Array.isArray(slots)).toBe(true)
    expect(slots.length).toBeGreaterThanOrEqual(1)
    expect(slots[0]).toHaveProperty('start')
    expect(slots[0]).toHaveProperty('end')
  })

  it('getDefaultSlotForAdd retourne un créneau avec start/end', () => {
    const slot = getDefaultSlotForAdd()
    expect(slot).toHaveProperty('start')
    expect(slot).toHaveProperty('end')
  })
})

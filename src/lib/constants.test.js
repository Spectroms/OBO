import { describe, it, expect } from 'vitest'
import { DAY_TYPES, VALID_DAY_TYPES, getDayTypeLabel, getDayTypeClass } from './constants'

describe('DAY_TYPES', () => {
  it('contient normal, cp, recup', () => {
    const values = DAY_TYPES.map((t) => t.value)
    expect(values).toContain('normal')
    expect(values).toContain('cp')
    expect(values).toContain('recup')
  })
})

describe('VALID_DAY_TYPES', () => {
  it('contient ferie en plus des types de saisie', () => {
    expect(VALID_DAY_TYPES).toContain('ferie')
    expect(VALID_DAY_TYPES).toContain('normal')
  })
})

describe('getDayTypeLabel', () => {
  it('retourne le libellé pour chaque type', () => {
    expect(getDayTypeLabel('normal')).toBe('Normal')
    expect(getDayTypeLabel('cp')).toBe('CP')
    expect(getDayTypeLabel('recup')).toBe('Récup')
  })

  it('distingue férié chômé et travaillé avec entry', () => {
    expect(getDayTypeLabel('ferie', { slots: [] })).toBe('Férié chômé')
    expect(getDayTypeLabel('ferie', { slots: [{ start: '08:00', end: '12:00' }] })).toBe('Férié travaillé')
  })
})

describe('getDayTypeClass', () => {
  it('retourne la classe selon day_type', () => {
    expect(getDayTypeClass({ day_type: 'cp' })).toBe('day-cp')
    expect(getDayTypeClass({ day_type: 'recup' })).toBe('day-recup')
    expect(getDayTypeClass({ day_type: 'normal' })).toBe('day-normal')
  })

  it('distingue day-ferie et day-ferie-worked', () => {
    expect(getDayTypeClass({ day_type: 'ferie', slots: [] })).toBe('day-ferie')
    expect(getDayTypeClass({ day_type: 'ferie', slots: [{}] })).toBe('day-ferie-worked')
  })

  it('retourne une chaîne vide sans entrée', () => {
    expect(getDayTypeClass(null)).toBe('')
    expect(getDayTypeClass(undefined)).toBe('')
  })
})

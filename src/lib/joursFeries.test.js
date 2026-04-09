import { describe, it, expect } from 'vitest'
import { getJoursFeries, isJourFerie } from './joursFeries'

describe('getJoursFeries', () => {
  it('retourne un Set de chaînes YYYY-MM-DD', () => {
    const set = getJoursFeries(2024)
    expect(set).toBeInstanceOf(Set)
    for (const key of set) {
      expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('contient le 1er janvier et le 25 décembre', () => {
    expect(getJoursFeries(2024).has('2024-01-01')).toBe(true)
    expect(getJoursFeries(2024).has('2024-12-25')).toBe(true)
  })

  it('contient des jours dépendants de Pâques pour l’année donnée', () => {
    const set = getJoursFeries(2024)
    expect(set.size).toBeGreaterThan(8)
  })
})

describe('isJourFerie', () => {
  it('retourne true pour un jour férié', () => {
    expect(isJourFerie('2024-05-01', 2024)).toBe(true)
  })

  it('retourne false pour un jour non férié', () => {
    expect(isJourFerie('2024-06-15', 2024)).toBe(false)
  })

  it('ne marque pas le dimanche de Pâques comme férié (ex: 2026-04-05)', () => {
    expect(isJourFerie('2026-04-05', 2026)).toBe(false)
    expect(isJourFerie('2026-04-06', 2026)).toBe(true)
  })
})

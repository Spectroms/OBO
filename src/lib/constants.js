/** Valeurs valides pour day_type (stockage, validation). */
export const VALID_DAY_TYPES = ['normal', 'ferie', 'cp', 'recup']

/**
 * Types de jour pour la saisie (liste pour les selects).
 * "ferie" n'est pas proposé : il est assigné automatiquement si la date est un jour férié.
 */
export const DAY_TYPES = [
  { value: 'normal', label: 'Normal' },
  { value: 'cp', label: 'CP' },
  { value: 'recup', label: 'Récup' },
]

const DAY_TYPE_LABELS = {
  normal: 'Normal',
  cp: 'CP',
  recup: 'Récup',
  ferie: 'Férié',
}

/**
 * Retourne le libellé affiché pour un day_type (tableau de bord, export, récap).
 * Pour "ferie", précise "chômé" ou "travaillé" si une entrée est fournie.
 */
export function getDayTypeLabel(dayType, entry = null) {
  if (dayType === 'ferie' && entry) {
    return entry?.slots?.length ? 'Férié travaillé' : 'Férié chômé'
  }
  return DAY_TYPE_LABELS[dayType] ?? 'Normal'
}

/**
 * Retourne la classe CSS pour une cellule calendrier selon le day_type et l’entrée.
 */
export function getDayTypeClass(entry) {
  if (!entry) return ''
  if (entry.day_type === 'cp') return 'day-cp'
  if (entry.day_type === 'recup') return 'day-recup'
  if (entry.day_type === 'ferie') {
    return entry?.slots?.length ? 'day-ferie-worked' : 'day-ferie'
  }
  return 'day-normal'
}

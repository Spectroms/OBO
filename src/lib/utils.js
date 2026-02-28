export function slotsToMinutes(slots) {
  if (!Array.isArray(slots) || slots.length === 0) return 0
  let total = 0
  for (const s of slots) {
    const start = timeToMinutes(s.start)
    const end = timeToMinutes(s.end)
    if (typeof start === 'number' && typeof end === 'number' && end > start) total += end - start
  }
  return total
}

function timeToMinutes(t) {
  if (!t) return NaN
  const [h, m] = String(t).split(':').map(Number)
  if (isNaN(h)) return NaN
  return (h || 0) * 60 + (m || 0)
}

export function formatDuration(minutes) {
  if (minutes == null || isNaN(minutes)) return '0h'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

export function formatDurationDecimal(minutes) {
  if (minutes == null || isNaN(minutes)) return '0'
  return (minutes / 60).toFixed(1).replace('.', ',')
}

export function getWeekTotals(entries, year, month) {
  const weeks = {}
  const first = new Date(year, month - 1, 1)
  const last = new Date(year, month, 0)
  for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
    const key = formatWeekKey(d)
    if (!weeks[key]) weeks[key] = { minutes: 0, days: [] }
    const dateStr = formatDateStr(d)
    const ent = entries[dateStr]
    if (ent && (ent.day_type === 'normal' || (ent.day_type === 'ferie' && ent.slots?.length))) {
      weeks[key].minutes += ent.total_minutes || 0
      weeks[key].days.push(dateStr)
    }
  }
  return weeks
}

export function getMonthRecap(entries, year, month, joursFeriesSet) {
  let totalMinutes = 0
  let ferieTravaillesCount = 0
  let cpCount = 0
  let recupCount = 0
  let dimancheCount = 0
  const first = new Date(year, month - 1, 1)
  const last = new Date(year, month, 0)
  let ferieCount = 0
  if (joursFeriesSet) {
    for (const key of joursFeriesSet) {
      const [y, m] = key.split('-').map(Number)
      if (y === year && m === month) ferieCount++
    }
  }
  for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
    const dateStr = formatDateStr(d)
    const ent = entries[dateStr]
    const isDimanche = d.getDay() === 0
    if (ent) {
      if (ent.day_type === 'ferie') {
        if (ent.slots?.length) {
          ferieTravaillesCount++
          totalMinutes += ent.total_minutes || 0
        }
      } else if (ent.day_type === 'cp') cpCount++
      else if (ent.day_type === 'recup') recupCount++
      else if (ent.day_type === 'normal' && (ent.total_minutes || ent.slots?.length)) {
        totalMinutes += ent.total_minutes || 0
        if (isDimanche) dimancheCount++
      }
    }
  }
  return { totalMinutes, ferieCount, ferieTravaillesCount, cpCount, recupCount, dimancheCount }
}

function formatWeekKey(d) {
  const start = new Date(d)
  start.setDate(d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1))
  return start.toISOString().slice(0, 10)
}

function formatDateStr(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

export function formatDateStrFromDate(d) {
  return formatDateStr(d)
}

export const DAY_NAMES = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
export const MONTH_NAMES = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
export const ACTIVITIES = ['', 'Dépôt', 'Contenaire', 'Déplacement', 'Déménagement']

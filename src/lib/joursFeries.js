// Jours fériés France : dates fixes + calcul Pâques (algorithme de Meeus)

function getEasterSunday(year) {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

function formatDateKey(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

export function getJoursFeries(year) {
  const fixed = [
    [1, 1],   // 1er janvier
    [5, 1],   // 1er mai
    [5, 8],   // 8 mai
    [7, 14],  // 14 juillet
    [8, 15],  // 15 août
    [11, 1],  // 1er novembre
    [11, 11], // 11 novembre
    [12, 25], // 25 décembre
  ]
  const set = new Set()
  fixed.forEach(([month, day]) => {
    set.add(formatDateKey(new Date(year, month - 1, day)))
  })
  const easter = getEasterSunday(year)
  set.add(formatDateKey(easter)) // Pâques
  set.add(formatDateKey(new Date(easter.getTime() + 1 * 24 * 60 * 60 * 1000))) // Lundi de Pâques
  set.add(formatDateKey(new Date(easter.getTime() + 39 * 24 * 60 * 60 * 1000))) // Ascension
  set.add(formatDateKey(new Date(easter.getTime() + 50 * 24 * 60 * 60 * 1000))) // Lundi de Pentecôte
  return set
}

export function isJourFerie(dateStr, year) {
  const y = year ?? (dateStr ? parseInt(dateStr.slice(0, 4), 10) : new Date().getFullYear())
  return getJoursFeries(y).has(dateStr)
}

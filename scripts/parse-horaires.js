/**
 * Parse le fichier "Nouveau Document texte.txt" des horaires perso
 * et génère entries-import.json pour import dans l'app OBO.
 * Usage: node scripts/parse-horaires.js
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const MONTHS = {
  JANVIER: 1, FÉVRIER: 2, FEVRIER: 2, MARS: 3, AVRIL: 4, MAI: 5,
  JUIN: 6, JUILLET: 7, AOÛT: 8, AOUT: 8, SEPTEMBRE: 9, OCTOBRE: 10,
  NOVEMBRE: 11, DÉCEMBRE: 12, DECEMBRE: 12
}

function timeToHHMM(s) {
  if (!s) return null
  s = String(s).trim().toLowerCase().replace(/\s/g, '')
  const match = s.match(/^(\d{1,2})h(\d{0,2})?$/)
  if (!match) return null
  const h = parseInt(match[1], 10)
  const m = parseInt(match[2] || '0', 10)
  if (h > 23 || m > 59) return null
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function parseSlotsFromLine(line) {
  const slots = []
  const part = line.replace(/\([\dh,']+\)/g, '').trim()
  const slotRegex = /(\d{1,2})h(\d{0,2})?\s*-\s*(\d{1,2})h(\d{0,2})?/gi
  let m
  while ((m = slotRegex.exec(part)) !== null) {
    const start = timeToHHMM(m[1] + 'h' + (m[2] || ''))
    const end = timeToHHMM(m[3] + 'h' + (m[4] || ''))
    if (start && end) slots.push({ start, end })
  }
  return slots
}

function durationToMinutes(s) {
  if (!s) return 0
  const match = String(s).match(/\((\d{1,3})h(\d{0,2})?\)/)
  if (!match) return 0
  const h = parseInt(match[1], 10)
  const m = parseInt(match[2] || '0', 10)
  return h * 60 + m
}

function slotsToMinutes(slots) {
  let total = 0
  for (const s of slots) {
    const [sh, sm] = (s.start || '0:0').split(':').map(Number)
    const [eh, em] = (s.end || '0:0').split(':').map(Number)
    total += (eh * 60 + em) - (sh * 60 + sm)
  }
  return total
}

const inputPath = path.join(__dirname, '..', 'horraire perso', 'Nouveau Document texte.txt')
const outputPath = path.join(__dirname, '..', 'horraire perso', 'entries-import.json')

const raw = fs.readFileSync(inputPath, 'utf8')
const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean)

let year = null
let month = null
const entries = []
const seen = new Set()

function addEntry(dateStr, day_type, slots, note, total_minutes) {
  if (seen.has(dateStr)) return
  seen.add(dateStr)
  const mins = total_minutes != null ? total_minutes : (slots.length ? slotsToMinutes(slots) : 0)
  entries.push({
    date: dateStr,
    day_type: day_type || 'normal',
    slots: slots || [],
    activity: 'Dépôt',
    note: note || null,
    total_minutes: mins
  })
}

function dateStr(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

for (let i = 0; i < lines.length; i++) {
  const line = lines[i]
  const numMatch = line.match(/^(\d{4})\s*$/)
  if (numMatch) {
    year = parseInt(numMatch[1], 10)
    continue
  }
  const monthName = line.replace(/\s+/g, ' ').trim().toUpperCase()
  if (MONTHS[monthName] !== undefined) {
    month = MONTHS[monthName]
    continue
  }
  if (year == null || month == null) continue

  const dayWithWeekday = line.match(/^(\d{1,2})\s*\/\s*(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|DIMANCHE|Lundi|Mardi|Mercredi|Jeudi|Vendredi|Samedi|Dimanche)\s+(.+)$/i)
  const dayWithTimeOnly = line.match(/^(\d{1,2})\s*\/\s*(\d{1,2})h/)
  const dayNum = dayWithWeekday ? parseInt(dayWithWeekday[1], 10) : (dayWithTimeOnly ? parseInt(dayWithTimeOnly[1], 10) : null)
  const rest = dayWithWeekday ? dayWithWeekday[2].trim() : (dayWithTimeOnly ? line.slice(line.indexOf('/') + 1).trim() : null)

  if (dayNum != null && rest != null && dayNum >= 1 && dayNum <= 31) {
    if (/^FÉRIÉ\s*$/i.test(rest) || /^FÉRIE\s*$/i.test(rest) || /^FERIE\s*$/i.test(rest)) {
      addEntry(dateStr(year, month, dayNum), 'ferie', [], null, 0)
      continue
    }
    if (/^CP\s*$/i.test(rest) || /^CONGÉS?\s*PAYÉS?\s*$/i.test(rest) || /^CONGES?\s*PAYES?\s*$/i.test(rest)) {
      addEntry(dateStr(year, month, dayNum), 'cp', [], null, 0)
      continue
    }
    if (/^RÉCUP\s*$/i.test(rest) || /^RECUP\s*$/i.test(rest) || /^Recup\s*$/i.test(rest)) {
      addEntry(dateStr(year, month, dayNum), 'recup', [], null, 0)
      continue
    }
    if (/absent|^repos\s*$/i.test(rest) && !/\d+h/.test(rest)) continue
    const slots = parseSlotsFromLine(rest)
    const isFerie = /FÉRIÉ|FÉRIE|FERIE/i.test(rest)
    let note = null
    const noteMatch = rest.match(/(?:\)|h)\s*([A-Za-zÀ-ÿ0-9\s\-',\.]+)$/)
    if (noteMatch) note = noteMatch[1].replace(/\s*(DIMANCHE|FÉRIÉ|FÉRIE)\s*$/gi, '').trim() || null
    const mins = durationToMinutes(rest)
    if (slots.length) {
      addEntry(dateStr(year, month, dayNum), isFerie ? 'ferie' : 'normal', slots, note, mins || slotsToMinutes(slots))
    } else if (isFerie) {
      addEntry(dateStr(year, month, dayNum), 'ferie', [], note, 0)
    }
    continue
  }

  const rangeCp = line.match(/(?:(\d{1,2})\s*au\s*(\d{1,2})|Du\s*(\d{1,2})\s*au\s*(\d{1,2})(?:\s+inclus)?)\s*\/?\s*(?:CONGÉS?\s*PAYÉS?|CONGES?\s*PAYES?|CP)/i)
  if (rangeCp && month != null && year != null) {
    const d1 = parseInt(rangeCp[1] || rangeCp[3], 10)
    const d2 = parseInt(rangeCp[2] || rangeCp[4], 10)
    for (let d = d1; d <= d2; d++) addEntry(dateStr(year, month, d), 'cp', [], null, 0)
    continue
  }

  const singleDayCp = line.match(/^(\d{1,2})\s*\/\s*(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s+(?:CONGÉS?\s*PAYÉS?|CONGES?\s*PAYES?|CP)/i)
  if (singleDayCp) {
    addEntry(dateStr(year, month, parseInt(singleDayCp[1], 10)), 'cp', [], null, 0)
    continue
  }
}

entries.sort((a, b) => a.date.localeCompare(b.date))
fs.writeFileSync(outputPath, JSON.stringify(entries, null, 2), 'utf8')
console.log('Généré:', outputPath, '|', entries.length, 'entrées')

import { createClient } from '@supabase/supabase-js'
import { jsPDF } from 'jspdf'
import { getJoursFeries } from '../src/lib/joursFeries.js'

const MONTH_NAMES = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const DAY_NAMES = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']

function formatDateStr(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function formatDuration(minutes) {
  if (minutes == null || isNaN(minutes)) return '0h'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

function normalizeActivityLabel(activity) {
  if (activity == null || activity === '') return ''
  const value = String(activity).trim()
  if (!value) return ''
  if (value.toLowerCase() === 'contenaire' || value.toLowerCase() === 'containaire' || value.toLowerCase() === 'conteneur maritime' || value.toLowerCase() === 'conteneur') return 'Container'
  return value
}

function getMonthRecap(entriesMap, year, month, joursFeriesSet) {
  let totalMinutes = 0
  let ferieTravaillesCount = 0
  let cpCount = 0
  let recupCount = 0
  let dimancheCount = 0
  let decoucheFranceCount = 0
  let decoucheEtrangerCount = 0
  let ferieCount = 0
  if (joursFeriesSet) {
    for (const key of joursFeriesSet) {
      const [y, m] = key.split('-').map(Number)
      if (y === year && m === month) ferieCount++
    }
  }
  const first = new Date(year, month - 1, 1)
  const last = new Date(year, month, 0)
  for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
    const dateStr = formatDateStr(d)
    const ent = entriesMap[dateStr]
    const isDimanche = d.getDay() === 0
    if (ent) {
      if (ent.decouche) {
        if (ent.decouche_zone === 'etranger') decoucheEtrangerCount++
        else decoucheFranceCount++
      }
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
  return { totalMinutes, ferieCount, ferieTravaillesCount, cpCount, recupCount, dimancheCount, decoucheFranceCount, decoucheEtrangerCount }
}

export const config = {
  runtime: 'nodejs',
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Méthode non autorisée' })

  const token = req.query.token || (req.headers.authorization && req.headers.authorization.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null)
  if (!token) return res.status(401).json({ error: 'Non authentifié' })
  const authHeader = `Bearer ${token}`

  const year = parseInt(req.query.year, 10)
  const month = parseInt(req.query.month, 10)
  if (!year || !month || month < 1 || month > 12) {
    return res.status(400).json({ error: 'Paramètres year et month requis et valides' })
  }

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) {
    return res.status(500).json({ error: 'Configuration Supabase manquante. Définir SUPABASE_URL et SUPABASE_ANON_KEY (sans VITE_) en production.' })
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return res.status(401).json({ error: 'Utilisateur introuvable' })

  const dateStart = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const dateEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const [{ data: profileRow }, { data: entriesRows }] = await Promise.all([
    supabase.from('profiles').select('display_name').eq('id', user.id).single(),
    supabase.from('entries').select('date, day_type, slots, activity, note, decouche, decouche_zone, total_minutes')
      .eq('user_id', user.id)
      .gte('date', dateStart)
      .lte('date', dateEnd),
  ])

  const entriesMap = {}
  if (entriesRows) {
    for (const row of entriesRows) {
      let dateStr = row.date
      if (dateStr instanceof Date) dateStr = dateStr.toISOString().slice(0, 10)
      else if (typeof dateStr === 'string') dateStr = dateStr.slice(0, 10)
      else dateStr = String(dateStr).slice(0, 10)
      entriesMap[dateStr] = row
    }
  }

  const displayName = (profileRow?.display_name && String(profileRow.display_name).trim()) ? String(profileRow.display_name).trim() : '—'
  const monthLabel = MONTH_NAMES[month - 1] ? MONTH_NAMES[month - 1].charAt(0).toUpperCase() + MONTH_NAMES[month - 1].slice(1) : ''
  const periodLabel = `${monthLabel} ${year}`
  const joursFeriesSet = getJoursFeries(year)
  const recap = getMonthRecap(entriesMap, year, month, joursFeriesSet)

  const monthName = MONTH_NAMES[month - 1] || ''
  const rows = []
  for (let d = 1; d <= lastDay; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const ent = entriesMap[dateStr]
    const dayDate = new Date(year, month - 1, d)
    const dayName = DAY_NAMES[dayDate.getDay()] || ''
    const dayLabel = dayName ? dayName.charAt(0).toUpperCase() + dayName.slice(1) : ''
    const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6
    const isFerie = joursFeriesSet.has(dateStr)
    const duration = ent ? formatDuration(ent.total_minutes || 0) : ''
    const type = ent
      ? (ent.day_type === 'cp' ? 'CP' : ent.day_type === 'recup' ? 'Récup' : ent.day_type === 'ferie' ? (ent.slots?.length ? 'Férié travaillé' : 'Férié chômé') : 'Normal')
      : (isFerie ? 'Férié chômé' : '')
    const decoucheText = ent?.decouche ? `Découché (${ent?.decouche_zone === 'etranger' ? 'Étranger' : 'France'})` : ''
    rows.push({
      date: `${d} ${monthName} (${dayLabel})`,
      type,
      créneaux: (ent?.slots || []).map((s) => `${s.start}-${s.end}`).join(' '),
      durée: duration,
      activité: normalizeActivityLabel(ent?.activity) || '',
      note: [ent?.note || '', decoucheText].filter(Boolean).join(' — '),
      isWeekend,
      isFerie,
    })
  }

  const doc = new jsPDF()
  doc.setFontSize(11)
  doc.text(`Employé : ${displayName}`, 14, 15)
  doc.text(`Horaires ${periodLabel}`, 14, 22)
  const pageHeight = doc.internal.pageSize.getHeight()
  const lineHeight = 5
  const maxY = pageHeight - 15
  let y = 28

  function drawTableHeader() {
    doc.setFontSize(9)
    doc.text('Date', 14, y)
    doc.text('Type', 40, y)
    doc.text('Créneaux / Durée', 70, y)
    doc.text('Activité / Note', 130, y)
    y += 6
  }

  function ensurePageForNextRow() {
    if (y + lineHeight <= maxY) return
    doc.addPage()
    y = 20
    drawTableHeader()
  }

  if (rows.length) {
    drawTableHeader()
    rows.forEach((r) => {
      ensurePageForNextRow()
      if (r.isFerie) {
        doc.setFillColor(243, 244, 246)
        doc.rect(12, y - 3.5, 186, 5, 'F')
      } else if (r.isWeekend) {
        doc.setFillColor(235, 235, 235)
        doc.rect(12, y - 3.5, 186, 5, 'F')
      }
      doc.text(r.date, 14, y)
      doc.text(r.type || '—', 40, y)
      doc.text(r.créneaux || r.durée || '—', 70, y)
      doc.text([r.activité, r.note].filter(Boolean).join(' — '), 130, y)
      y += 5
    })
    y += 4
  }
  if (y + 20 > maxY) {
    doc.addPage()
    y = 20
  }
  doc.text(`Total : ${formatDuration(recap.totalMinutes)}`, 14, y)
  y += 5
  if (recap.ferieCount - recap.ferieTravaillesCount > 0) doc.text(`${recap.ferieCount - recap.ferieTravaillesCount} jour(s) férié(s) chômé(s)`, 14, y), (y += 5)
  if (recap.ferieTravaillesCount > 0) doc.text(`${recap.ferieTravaillesCount} jour(s) férié(s) travaillé(s)`, 14, y), (y += 5)
  if (recap.cpCount) doc.text(`${recap.cpCount} CP`, 14, y), (y += 5)
  if (recap.dimancheCount) doc.text(`${recap.dimancheCount} dimanche(s) travaillé(s)`, 14, y), (y += 5)
  if (recap.decoucheFranceCount) doc.text(`${recap.decoucheFranceCount} découché(s) France`, 14, y), (y += 5)
  if (recap.decoucheEtrangerCount) doc.text(`${recap.decoucheEtrangerCount} découché(s) Étranger`, 14, y), (y += 5)
  if (y + 12 > maxY) {
    doc.addPage()
    y = 20
  }
  doc.setFontSize(8)
  doc.text('Légende export : gris clair = jour férié, gris = week-end.', 14, y + 3)

  const safeName = `Horaires-${monthLabel}-${year}.pdf`.normalize('NFD').replace(/\p{Diacritic}/gu, '')
  const buf = doc.output('arraybuffer')
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`)
  return res.end(Buffer.from(buf))
}

import { useState } from 'react'
import { jsPDF } from 'jspdf'
import * as XLSX from 'xlsx'
import { getMonthRecap, formatDuration, formatDurationDecimal, MONTH_NAMES } from '../lib/utils'
import { getJoursFeries } from '../lib/joursFeries'
import { supabase, hasSupabase } from '../lib/supabaseClient'
import './ExportButton.css'

export default function ExportButton({ entries, year, month, displayName }) {
  const [format, setFormat] = useState('pdf')
  const [useDecimal, setUseDecimal] = useState(false)
  const [loading, setLoading] = useState(false)
  const joursFeriesSet = getJoursFeries(year)
  const recap = getMonthRecap(entries, year, month, joursFeriesSet)
  const monthLabel = MONTH_NAMES[month - 1] ? MONTH_NAMES[month - 1].charAt(0).toUpperCase() + MONTH_NAMES[month - 1].slice(1) : ''
  const periodLabel = `${monthLabel} ${year}`

  // Nom de fichier sans accents pour que le navigateur l’utilise bien (export PDF/Excel)
  function safeFilename(extension) {
    const base = `Horaires-${monthLabel}-${year}`.normalize('NFD').replace(/\p{Diacritic}/gu, '')
    return `${base}.${extension}`
  }

  function getEntriesForMonth() {
    const result = []
    const lastDay = new Date(year, month, 0).getDate()
    const monthName = MONTH_NAMES[month - 1] || ''
    for (let d = 1; d <= lastDay; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const ent = entries[dateStr]
      if (!ent) continue
      const duration = useDecimal ? formatDurationDecimal(ent.total_minutes || 0) : formatDuration(ent.total_minutes || 0)
      const type = ent.day_type === 'cp' ? 'CP' : ent.day_type === 'recup' ? 'Récup' : ent.day_type === 'ferie' ? (ent.slots?.length ? 'Férié travaillé' : 'Férié chômé') : 'Normal'
      result.push({ date: `${d} ${monthName}`, type, créneaux: (ent.slots || []).map((s) => `${s.start}-${s.end}`).join(' '), durée: duration, activité: ent.activity || '', note: ent.note || '' })
    }
    return result
  }

  function exportPDF() {
    setLoading(true)
    const doc = new jsPDF()
    const rows = getEntriesForMonth()
    const employeeName = (displayName && displayName.trim()) ? displayName.trim() : '—'
    doc.setFontSize(11)
    doc.text(`Employé : ${employeeName}`, 14, 15)
    doc.text(`Horaires ${periodLabel}`, 14, 22)
    let y = 28
    if (rows.length) {
      doc.setFontSize(9)
      doc.text('Date', 14, y)
      doc.text('Type', 40, y)
      doc.text('Créneaux / Durée', 70, y)
      doc.text('Activité / Note', 130, y)
      y += 6
      rows.forEach((r) => {
        doc.text(r.date, 14, y)
        doc.text(r.type, 40, y)
        doc.text(r.créneaux || r.durée || '', 70, y)
        doc.text([r.activité, r.note].filter(Boolean).join(' — '), 130, y)
        y += 5
      })
      y += 4
    }
    doc.text(`Total : ${formatDuration(recap.totalMinutes)}`, 14, y)
    y += 5
    if (recap.ferieCount - recap.ferieTravaillesCount > 0) doc.text(`${recap.ferieCount - recap.ferieTravaillesCount} jour(s) férié(s) chômé(s)`, 14, y), (y += 5)
    if (recap.ferieTravaillesCount > 0) doc.text(`${recap.ferieTravaillesCount} jour(s) férié(s) travaillé(s)`, 14, y), (y += 5)
    if (recap.cpCount) doc.text(`${recap.cpCount} CP`, 14, y), (y += 5)
    if (recap.recupCount) doc.text(`${recap.recupCount} récup`, 14, y), (y += 5)
    if (recap.dimancheCount) doc.text(`${recap.dimancheCount} dimanche(s) travaillé(s)`, 14, y)
    const filename = safeFilename('pdf')
    const blob = doc.output('blob')
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 500)
    setLoading(false)
  }

  function exportExcel() {
    setLoading(true)
    const rows = getEntriesForMonth()
    const employeeName = (displayName && displayName.trim()) ? displayName.trim() : '—'
    const headerRows = [
      ['Employé', employeeName],
      ['Période', periodLabel],
      [],
      ['Date', 'Type', 'Créneaux / Durée', 'Durée', 'Activité', 'Note'],
    ]
    const dataRows = rows.map((r) => [r.date, r.type, r.créneaux || r.durée || '', r.durée, r.activité || '', r.note || ''])
    const ws = XLSX.utils.aoa_to_sheet([...headerRows, ...dataRows])
    const recapSheet = XLSX.utils.aoa_to_sheet([
      ['Employé', employeeName],
      ['Période', periodLabel],
      [],
      ['Total heures', formatDuration(recap.totalMinutes)],
      ['Jours fériés chômés', recap.ferieCount - recap.ferieTravaillesCount],
      ['Jours fériés travaillés', recap.ferieTravaillesCount],
      ['CP', recap.cpCount],
      ['Récup', recap.recupCount],
      ['Dimanches travaillés', recap.dimancheCount],
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Horaires')
    XLSX.utils.book_append_sheet(wb, recapSheet, 'Récap')
    XLSX.writeFile(wb, safeFilename('xlsx'))
    setLoading(false)
  }

  async function handleExport() {
    if (format === 'excel') {
      exportExcel()
      return
    }
    // En production, télécharger via l’API pour que le nom du fichier soit correct (Content-Disposition)
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const isVercel = origin.includes('vercel.app')
    if (isVercel && hasSupabase()) {
      setLoading(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          const url = `${origin}/api/export-pdf?year=${year}&month=${month}&token=${encodeURIComponent(session.access_token)}`
          window.location.href = url
          return
        }
      } catch (_) {}
      setLoading(false)
    }
    exportPDF()
  }

  return (
    <div className="export-block">
      <label>
        Format
        <select value={format} onChange={(e) => setFormat(e.target.value)}>
          <option value="pdf">PDF</option>
          <option value="excel">Excel</option>
        </select>
      </label>
      <label className="export-checkbox">
        <input type="checkbox" checked={useDecimal} onChange={(e) => setUseDecimal(e.target.checked)} />
        Heures en décimal (ex. 7,5)
      </label>
      <button type="button" className="btn-primary" onClick={handleExport} disabled={loading}>
        {loading ? '…' : 'Télécharger l’export'}
      </button>
    </div>
  )
}

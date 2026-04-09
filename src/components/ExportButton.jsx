import { useState } from 'react'
import { jsPDF } from 'jspdf'
import * as XLSX from 'xlsx'
import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { getMonthRecap, formatDuration, formatDurationDecimal, MONTH_NAMES, DAY_NAMES, normalizeActivityLabel } from '../lib/utils'
import { getDayTypeLabel } from '../lib/constants'
import { getJoursFeries } from '../lib/joursFeries'
import { supabase, hasSupabase } from '../lib/supabaseClient'
import './ExportButton.css'

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result.split(',')[1])
    r.onerror = reject
    r.readAsDataURL(blob)
  })
}

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
      const dayDate = new Date(year, month - 1, d)
      const dayName = DAY_NAMES[dayDate.getDay()] || ''
      const dayLabel = dayName ? dayName.charAt(0).toUpperCase() + dayName.slice(1) : ''
      const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6
      const isFerie = joursFeriesSet.has(dateStr)
      const duration = ent ? (useDecimal ? formatDurationDecimal(ent.total_minutes || 0) : formatDuration(ent.total_minutes || 0)) : ''
      const type = ent ? getDayTypeLabel(ent.day_type, ent) : (isFerie ? 'Férié chômé' : '')
      const decoucheText = ent?.decouche ? `Découché (${ent?.decouche_zone === 'etranger' ? 'Étranger' : 'France'})` : ''
      result.push({
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
    return result
  }

  function buildPdfDoc() {
    const doc = new jsPDF()
    const rows = getEntriesForMonth()
    const employeeName = (displayName && displayName.trim()) ? displayName.trim() : '—'
    doc.setFontSize(11)
    doc.text(`Employé : ${employeeName}`, 14, 15)
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
    return doc
  }

  function exportPDF() {
    setLoading(true)
    const doc = buildPdfDoc()
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

  function buildExcelWb() {
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
    rows.forEach((r, idx) => {
      if (!r.isWeekend && !r.isFerie) return
      const rowNumber = headerRows.length + idx + 1
      for (let col = 0; col < 6; col++) {
        const addr = XLSX.utils.encode_cell({ r: rowNumber - 1, c: col })
        ws[addr] = ws[addr] || { t: 's', v: '' }
        ws[addr].s = ws[addr].s || {}
        ws[addr].s.fill = {
          patternType: 'solid',
          fgColor: { rgb: r.isFerie ? 'FFF3F4F6' : 'FFECECEC' },
        }
      }
    })
    const recapSheet = XLSX.utils.aoa_to_sheet([
      ['Employé', employeeName],
      ['Période', periodLabel],
      [],
      ['Total heures', formatDuration(recap.totalMinutes)],
      ['Jours fériés chômés', recap.ferieCount - recap.ferieTravaillesCount],
      ['Jours fériés travaillés', recap.ferieTravaillesCount],
      ['CP', recap.cpCount],
      ['Dimanches travaillés', recap.dimancheCount],
      ['Découchés France', recap.decoucheFranceCount],
      ['Découchés Étranger', recap.decoucheEtrangerCount],
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Horaires')
    XLSX.utils.book_append_sheet(wb, recapSheet, 'Récap')
    return wb
  }

  function exportExcel() {
    setLoading(true)
    XLSX.writeFile(buildExcelWb(), safeFilename('xlsx'))
    setLoading(false)
  }

  async function handleExport() {
    const isNative = Capacitor.isNativePlatform()

    if (isNative) {
      setLoading(true)
      try {
        const filename = format === 'pdf' ? safeFilename('pdf') : safeFilename('xlsx')
        let uri
        if (format === 'pdf') {
          const doc = buildPdfDoc()
          const blob = doc.output('blob')
          const base64 = await blobToBase64(blob)
          await Filesystem.writeFile({
            path: filename,
            data: base64,
            directory: Directory.Cache,
          })
          const result = await Filesystem.getUri({ directory: Directory.Cache, path: filename })
          uri = result.uri
        } else {
          const wb = buildExcelWb()
          const base64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' })
          await Filesystem.writeFile({
            path: filename,
            data: base64,
            directory: Directory.Cache,
          })
          const result = await Filesystem.getUri({ directory: Directory.Cache, path: filename })
          uri = result.uri
        }
        await Share.share({
          title: filename,
          url: uri,
          dialogTitle: "Enregistrer ou partager l'export",
        })
      } catch (err) {
        console.error('Export (native):', err)
      } finally {
        setLoading(false)
      }
      return
    }

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
          setTimeout(() => setLoading(false), 3000)
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

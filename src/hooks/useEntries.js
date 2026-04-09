import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, hasSupabase } from '../lib/supabaseClient'
import { VALID_DAY_TYPES } from '../lib/constants'
import { slotsToMinutes, normalizeActivityLabel } from '../lib/utils'

const STORAGE_KEY = 'obo_entries'

function getLocalKey(userId) {
  return `${STORAGE_KEY}_${userId || 'anon'}`
}

function loadFromStorage(userId) {
  try {
    const raw = localStorage.getItem(getLocalKey(userId))
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveToStorage(userId, entries) {
  try {
    localStorage.setItem(getLocalKey(userId), JSON.stringify(entries))
  } catch (e) {
    console.warn('localStorage save failed', e)
  }
}

function mergeEntries(local, remote, lastWriteWins = true) {
  const merged = { ...local }
  for (const [date, entry] of Object.entries(remote)) {
    const localEntry = merged[date]
    if (!localEntry) {
      merged[date] = entry
    } else if (lastWriteWins) {
      const localUpdated = new Date(localEntry.updated_at || 0).getTime()
      const remoteUpdated = new Date(entry.updated_at || 0).getTime()
      merged[date] = remoteUpdated >= localUpdated ? entry : localEntry
    }
  }
  return merged
}

function buildRow(dateStr, entry) {
  const rawSlots = Array.isArray(entry?.slots) ? entry.slots : []
  const slots = rawSlots.map((s) => ({
    start: typeof s?.start === 'string' ? s.start : '08:00',
    end: typeof s?.end === 'string' ? s.end : '17:00',
  }))
  const total_minutes = Math.round(Number(entry?.total_minutes)) || 0
  const day_type = VALID_DAY_TYPES.includes(entry?.day_type) ? entry.day_type : 'normal'
  const isInfoOnlyDay = day_type === 'cp' || day_type === 'recup'
  const decouche = !!entry?.decouche
  const decouche_zone = decouche && ['france', 'etranger'].includes(entry?.decouche_zone) ? entry.decouche_zone : null
  return {
    date: dateStr,
    day_type,
    slots: isInfoOnlyDay ? [] : slots,
    activity: isInfoOnlyDay ? null : (normalizeActivityLabel(entry?.activity) || null),
    note: isInfoOnlyDay ? null : (entry?.note != null && entry.note !== '' ? String(entry.note) : null),
    decouche: isInfoOnlyDay ? false : decouche,
    decouche_zone: isInfoOnlyDay ? null : decouche_zone,
    total_minutes: isInfoOnlyDay ? 0 : total_minutes,
    updated_at: entry?.updated_at || new Date().toISOString(),
  }
}

async function upsertToSupabase(userId, dateStr, entry) {
  const row = buildRow(dateStr, entry)
  const payload = { user_id: userId, ...row }
  const opts = { onConflict: 'user_id,date' }
  let lastErr = null
  for (let attempt = 0; attempt <= 2; attempt++) {
    const { error } = await supabase.from('entries').upsert(payload, opts)
    if (!error) return
    lastErr = error
    if (attempt < 2) await new Promise((r) => setTimeout(r, 800))
  }
  if (lastErr) throw lastErr
}

function addOneDay(dateStr) {
  const d = new Date(`${dateStr}T12:00:00`)
  d.setDate(d.getDate() + 1)
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function toMinutes(timeStr) {
  if (typeof timeStr !== 'string') return NaN
  const [h, m] = timeStr.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return NaN
  return h * 60 + m
}

function splitSlotsOverMidnight(slots) {
  const currentDaySlots = []
  const nextDaySlots = []
  let hasCrossMidnight = false

  for (const slot of (Array.isArray(slots) ? slots : [])) {
    const start = typeof slot?.start === 'string' ? slot.start : '08:00'
    const end = typeof slot?.end === 'string' ? slot.end : '17:00'
    const startMins = toMinutes(start)
    const endMins = toMinutes(end)

    if (!isNaN(startMins) && !isNaN(endMins) && endMins < startMins) {
      hasCrossMidnight = true
      // Sur le jour saisi: de l'heure de départ à minuit.
      currentDaySlots.push({ start, end: '00:00' })
      // Sur le jour suivant: de minuit à l'heure de fin.
      if (end !== '00:00') nextDaySlots.push({ start: '00:00', end })
    } else {
      currentDaySlots.push({ start, end })
    }
  }

  return { hasCrossMidnight, currentDaySlots, nextDaySlots }
}

function mergeSlotsUnique(baseSlots, extraSlots) {
  const out = []
  const seen = new Set()
  for (const slot of [...(baseSlots || []), ...(extraSlots || [])]) {
    const start = typeof slot?.start === 'string' ? slot.start : null
    const end = typeof slot?.end === 'string' ? slot.end : null
    if (!start || !end) continue
    const key = `${start}-${end}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ start, end })
  }
  return out
}

export function useEntries(userId) {
  const [entries, setEntries] = useState({})
  const [loading, setLoading] = useState(true)
  const entriesRef = useRef({})

  const persist = useCallback((next) => {
    setEntries((prev) => {
      const nextEntries = typeof next === 'function' ? next(prev) : next
      if (userId) saveToStorage(userId, nextEntries)
      return nextEntries
    })
  }, [userId])

  useEffect(() => {
    if (!userId) {
      setEntries({})
      setLoading(false)
      return
    }
    const local = loadFromStorage(userId)
    setEntries(local)
    if (!hasSupabase()) {
      setLoading(false)
      return
    }
    supabase
      .from('entries')
      .select('*')
      .eq('user_id', userId)
      .then(({ data, error }) => {
        if (error) {
          setLoading(false)
          return
        }
        const remote = (data || []).reduce((acc, row) => {
          acc[row.date] = {
            ...row,
            date: row.date,
            day_type: row.day_type,
            slots: row.slots || [],
            activity: row.activity,
            note: row.note,
            decouche: !!row.decouche,
            decouche_zone: row.decouche_zone ?? null,
            total_minutes: row.total_minutes,
            updated_at: row.updated_at,
          }
          return acc
        }, {})
        const merged = mergeEntries(local, remote)
        setEntries(merged)
        saveToStorage(userId, merged)
        setLoading(false)
        if (navigator.onLine) {
          ;(async () => {
            for (const date of Object.keys(merged)) {
              const entry = merged[date]
              const rem = remote[date]
              const localNewer = !rem || new Date(entry?.updated_at || 0) > new Date(rem?.updated_at || 0)
              if (localNewer) {
                try {
                  await upsertToSupabase(userId, date, entry)
                } catch (err) {
                  console.warn('[OBO] Sync entrée', date, err?.message || err)
                }
                if (Object.keys(merged).length > 100) await new Promise((r) => setTimeout(r, 30))
              }
            }
          })()
        }
      })
  }, [userId])

  useEffect(() => {
    entriesRef.current = entries
  }, [entries])

  useEffect(() => {
    if (!hasSupabase() || !userId) return
    const onOnline = async () => {
      const current = entriesRef.current
      for (const [date, entry] of Object.entries(current)) {
        try {
          await upsertToSupabase(userId, date, entry)
        } catch (err) {
          console.warn('[OBO] Sync en ligne', date, err?.message || err)
        }
        if (Object.keys(current).length > 50) await new Promise((r) => setTimeout(r, 30))
      }
    }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [userId])

  const upsertEntry = useCallback(async (date, entry) => {
    let dateStr = null
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) dateStr = date
    else if (date instanceof Date && !isNaN(date)) dateStr = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0')
    if (!dateStr) return
    const updatedAt = new Date().toISOString()
    const row = buildRow(dateStr, { ...entry, updated_at: updatedAt })

    const canSplit = row.day_type === 'normal' || row.day_type === 'ferie'
    const { hasCrossMidnight, currentDaySlots, nextDaySlots } = canSplit
      ? splitSlotsOverMidnight(row.slots)
      : { hasCrossMidnight: false, currentDaySlots: row.slots, nextDaySlots: [] }

    const currentRow = hasCrossMidnight
      ? buildRow(dateStr, { ...row, slots: currentDaySlots, total_minutes: slotsToMinutes(currentDaySlots), updated_at: updatedAt })
      : row

    let nextDateStr = null
    let nextRow = null
    if (hasCrossMidnight && nextDaySlots.length) {
      nextDateStr = addOneDay(dateStr)
      const existingNext = entriesRef.current[nextDateStr]
      const mergedSlots = mergeSlotsUnique(existingNext?.slots || [], nextDaySlots)
      const nextDayType = existingNext?.day_type && VALID_DAY_TYPES.includes(existingNext.day_type) && existingNext.day_type !== 'cp' && existingNext.day_type !== 'recup'
        ? existingNext.day_type
        : 'normal'
      nextRow = buildRow(nextDateStr, {
        ...existingNext,
        day_type: nextDayType,
        slots: mergedSlots,
        total_minutes: slotsToMinutes(mergedSlots),
        updated_at: updatedAt,
      })
    }

    persist((prev) => {
      const next = { ...prev, [dateStr]: { ...currentRow, user_id: userId } }
      if (nextDateStr && nextRow) next[nextDateStr] = { ...nextRow, user_id: userId }
      return next
    })
    if (!navigator.onLine) return
    if (hasSupabase() && userId) {
      await upsertToSupabase(userId, dateStr, { ...entry, ...currentRow })
      if (nextDateStr && nextRow) await upsertToSupabase(userId, nextDateStr, nextRow)
    }
  }, [userId, persist])

  const deleteEntry = useCallback(async (date) => {
    persist((prev) => {
      const next = { ...prev }
      delete next[date]
      return next
    })
    if (hasSupabase() && userId) {
      await supabase.from('entries').delete().eq('user_id', userId).eq('date', date)
    }
  }, [userId, persist])

  return { entries, loading, upsertEntry, deleteEntry, persist }
}

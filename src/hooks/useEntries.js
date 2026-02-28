import { useState, useEffect, useCallback } from 'react'
import { supabase, hasSupabase } from '../lib/supabaseClient'

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

export function useEntries(userId) {
  const [entries, setEntries] = useState({})
  const [loading, setLoading] = useState(true)

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
            total_minutes: row.total_minutes,
            updated_at: row.updated_at,
          }
          return acc
        }, {})
        const merged = mergeEntries(local, remote)
        setEntries(merged)
        saveToStorage(userId, merged)
        setLoading(false)
      })
  }, [userId])

  const upsertEntry = useCallback(async (date, entry) => {
    const rawSlots = Array.isArray(entry.slots) ? entry.slots : []
    const slots = rawSlots.map((s) => ({
      start: typeof s?.start === 'string' ? s.start : '08:00',
      end: typeof s?.end === 'string' ? s.end : '17:00',
    }))
    const total_minutes = Math.round(Number(entry.total_minutes)) || 0
    const day_type = ['normal', 'ferie', 'cp', 'recup'].includes(entry.day_type) ? entry.day_type : 'normal'
    const dateStr = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : date
    const row = {
      date: dateStr,
      day_type,
      slots,
      activity: entry.activity != null && entry.activity !== '' ? String(entry.activity) : null,
      note: entry.note != null && entry.note !== '' ? String(entry.note) : null,
      total_minutes,
      updated_at: new Date().toISOString(),
    }
    persist((prev) => ({ ...prev, [dateStr]: { ...row, user_id: userId } }))
    if (hasSupabase() && userId) {
      const payload = { user_id: userId, ...row }
      const opts = { onConflict: 'user_id,date' }
      let lastErr = null
      for (let attempt = 0; attempt <= 2; attempt++) {
        const { error } = await supabase.from('entries').upsert(payload, opts)
        if (!error) break
        lastErr = error
        if (attempt < 2) await new Promise((r) => setTimeout(r, 800))
      }
      if (lastErr) throw lastErr
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

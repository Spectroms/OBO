import { useEffect, useRef } from 'react'

const REMINDER_KEY = 'obo_reminder_time'

function parseTime(str) {
  if (!str) return null
  const [h, m] = str.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

export function useReminder(entries, enabled) {
  const checkedRef = useRef(false)

  useEffect(() => {
    if (!enabled) return
    const today = new Date()
    const dateStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0')
    const hasEntry = entries[dateStr] && (entries[dateStr].day_type === 'cp' || entries[dateStr].day_type === 'recup' || entries[dateStr].total_minutes > 0 || (entries[dateStr].day_type === 'ferie' && entries[dateStr].slots?.length))

    const run = () => {
      const stored = localStorage.getItem(REMINDER_KEY) || '17:00'
      const reminderMins = parseTime(stored)
      if (reminderMins == null) return
      const now = new Date()
      const currentMins = now.getHours() * 60 + now.getMinutes()
      if (currentMins < reminderMins - 2 || currentMins > reminderMins + 2) return
      if (hasEntry) return
      if (checkedRef.current) return
      checkedRef.current = true
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('OBO Horaires', { body: 'Pensez à saisir vos horaires du jour.' })
      }
    }

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    const id = setInterval(run, 60 * 1000)
    run()
    return () => clearInterval(id)
  }, [enabled, entries])
}

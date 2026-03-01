import { useEffect, useRef } from 'react'

const REMINDER_KEY = 'obo_reminder_time'
export const REMINDER_ENABLED_KEY = 'obo_reminder_enabled'
const REMINDER_NOTIF_ID = 1

function parseTime(str) {
  if (!str) return null
  const [h, m] = str.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

function hasEntryForDate(entries, dateStr) {
  const ent = entries[dateStr]
  return ent && (ent.day_type === 'cp' || ent.day_type === 'recup' || ent.total_minutes > 0 || (ent.day_type === 'ferie' && ent.slots?.length))
}

export function useReminder(entries, enabled) {
  const checkedRef = useRef(false)

  useEffect(() => {
    if (!enabled) return
    if (localStorage.getItem(REMINDER_ENABLED_KEY) === '0') return

    const isNative = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()
    const today = new Date()
    const dayOfWeek = today.getDay()
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5
    const dateStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0')
    const hasEntry = hasEntryForDate(entries, dateStr)

    if (isNative) {
      ;(async () => {
        try {
          const { LocalNotifications } = await import('@capacitor/local-notifications')
          const perm = (await LocalNotifications.checkPermissions()).display
          if (perm !== 'granted') return
          const stored = localStorage.getItem(REMINDER_KEY) || '17:00'
          const [h, m] = stored.split(':').map(Number)
          if (!isWeekday || hasEntry || !Number.isFinite(h)) return
          const nowMins = today.getHours() * 60 + today.getMinutes()
          const reminderMins = (h || 0) * 60 + (m || 0)
          if (nowMins >= reminderMins) return
          await LocalNotifications.createChannel({ id: 'obo-reminder', name: 'Rappels OBO' })
          await LocalNotifications.cancel({ notifications: [{ id: REMINDER_NOTIF_ID }] })
          const at = new Date(today.getFullYear(), today.getMonth(), today.getDate(), h || 17, m || 0, 0, 0)
          await LocalNotifications.schedule({
            notifications: [{
              id: REMINDER_NOTIF_ID,
              title: 'OBO Horaires',
              body: 'Pensez à saisir vos horaires du jour.',
              channelId: 'obo-reminder',
              smallIcon: 'ic_stat_obo',
              largeIcon: 'ic_launcher_logo',
              iconColor: '#223E7E',
              schedule: { at, allowWhileIdle: true },
            }],
          })
        } catch (_) {}
      })()
      return
    }

    const run = () => {
      if (localStorage.getItem(REMINDER_ENABLED_KEY) === '0') return
      const now = new Date()
      if (now.getDay() < 1 || now.getDay() > 5) return
      const stored = localStorage.getItem(REMINDER_KEY) || '17:00'
      const reminderMins = parseTime(stored)
      if (reminderMins == null) return
      const currentMins = now.getHours() * 60 + now.getMinutes()
      if (currentMins < reminderMins - 2 || currentMins > reminderMins + 2) return
      const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0')
      if (hasEntryForDate(entries, todayStr)) return
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

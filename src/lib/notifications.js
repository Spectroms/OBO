/**
 * Demande l’autorisation d’afficher les notifications (pour les rappels).
 * À appeler dès l’activation des rappels ou au chargement si les rappels sont déjà activés.
 * Web : Notification.requestPermission()
 * APK : LocalNotifications.requestPermissions() + création du canal Android.
 * @returns {Promise<{ granted: boolean }>}
 */
export async function requestNotificationPermission() {
  const isNative = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()

  if (isNative) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications')
      const perm = await LocalNotifications.checkPermissions()
      const display = perm.display ?? perm.status
      if (display === 'granted') {
        await ensureNotificationChannel()
        return { granted: true }
      }
      const requestedPerm = await LocalNotifications.requestPermissions()
      const requested = requestedPerm.display ?? requestedPerm.status
      if (requested === 'granted') {
        await ensureNotificationChannel()
        return { granted: true }
      }
      return { granted: false }
    } catch (e) {
      console.warn('requestNotificationPermission (native):', e)
      return { granted: false }
    }
  }

  if (typeof window === 'undefined' || typeof Notification === 'undefined') return { granted: false }
  if (Notification.permission === 'granted') return { granted: true }
  if (Notification.permission === 'denied') return { granted: false }
  try {
    const permission = await Notification.requestPermission()
    return { granted: permission === 'granted' }
  } catch {
    return { granted: false }
  }
}

async function ensureNotificationChannel() {
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    await LocalNotifications.createChannel({ id: 'obo-reminder', name: 'Rappels OBO' })
  } catch (_) {}
}

/**
 * Envoie une notification de test (pour vérifier que les rappels fonctionnent).
 * @returns {Promise<{ ok: boolean, message?: string, native?: boolean }>}
 */
export async function sendTestNotification() {
  const isNative = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()

  if (isNative) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications')
      const perm = await LocalNotifications.checkPermissions()
      const display = perm.display ?? perm.status
      if (display !== 'granted') {
        const requestedPerm = await LocalNotifications.requestPermissions()
        const requested = requestedPerm.display ?? requestedPerm.status
        if (requested !== 'granted') {
          return { ok: false, message: 'Autorisez les notifications dans les paramètres de l’appareil pour tester.' }
        }
      }
      await ensureNotificationChannel()
      const id = Math.floor(Date.now() % 2147483647)
      await LocalNotifications.schedule({
        notifications: [{
          id,
          title: 'OBO Horaires',
          body: 'Pensez à saisir vos horaires du jour.',
          channelId: 'obo-reminder',
          smallIcon: 'ic_stat_obo',
          largeIcon: 'ic_launcher_logo',
          iconColor: '#223E7E',
          schedule: { at: new Date(Date.now() + 8000), allowWhileIdle: true },
        }],
      })
      return { ok: true, native: true }
    } catch (e) {
      console.warn('Test notification (native):', e)
      return { ok: false, message: e?.message || 'Impossible d’envoyer la notification.' }
    }
  }

  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return { ok: false, message: 'Les notifications ne sont pas disponibles dans ce navigateur.' }
  }
  if (Notification.permission === 'granted') {
    try {
      new Notification('OBO Horaires', { body: 'Pensez à saisir vos horaires du jour.', tag: 'obo-reminder-test' })
      return { ok: true }
    } catch (e) {
      return { ok: false, message: e?.message || 'Erreur lors de l’envoi.' }
    }
  }
  if (Notification.permission === 'denied') {
    return { ok: false, message: 'Notifications refusées. Autorisez-les dans les paramètres du site.' }
  }
  try {
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      new Notification('OBO Horaires', { body: 'Pensez à saisir vos horaires du jour.', tag: 'obo-reminder-test' })
      return { ok: true }
    }
    return { ok: false, message: 'Autorisation refusée.' }
  } catch (e) {
    return { ok: false, message: e?.message || 'Impossible de demander l’autorisation.' }
  }
}

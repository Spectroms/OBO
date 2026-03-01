/**
 * Envoie une notification de test (rappel horaires).
 * Utilise l'API Web sur le navigateur, et Local Notifications sur l'APK Android.
 * @returns {Promise<{ ok: boolean, message?: string }>}
 */
export async function sendTestNotification() {
  // Détection Capacitor (APK / app native)
  const isNative = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()

  if (isNative) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications')
      const { status } = await LocalNotifications.checkPermissions()
      if (status !== 'granted') {
        const { status: requested } = await LocalNotifications.requestPermissions()
        if (requested !== 'granted') {
          return { ok: false, message: 'Autorisez les notifications dans les paramètres de l’appareil pour tester.' }
        }
      }
      const channelId = 'obo-reminder'
      await LocalNotifications.createChannel({ id: channelId, name: 'Rappels OBO' })
      const id = Math.floor(Date.now() % 2147483647)
      await LocalNotifications.schedule({
        notifications: [{
          id,
          title: 'OBO Horaires',
          body: 'Pensez à saisir vos horaires du jour.',
          channelId,
          schedule: { at: new Date(Date.now() + 500), allowWhileIdle: true },
        }],
      })
      return { ok: true }
    } catch (e) {
      console.warn('Test notification (native):', e)
      return { ok: false, message: e?.message || 'Impossible d’envoyer la notification.' }
    }
  }

  // Web : API Notifications
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
    return { ok: false, message: 'Notifications refusées. Autorisez-les dans les paramètres du site (icône cadenas ou menu).' }
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

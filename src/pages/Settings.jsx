import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useEntries } from '../hooks/useEntries'
import { useTheme } from '../hooks/useTheme'
import { supabase, hasSupabase } from '../lib/supabaseClient'
import { SUMMER_HOURS_KEY } from '../lib/utils'
import { REMINDER_ENABLED_KEY } from '../hooks/useReminder'
import './Settings.css'

const REMINDER_KEY = 'obo_reminder_time'

export default function Settings() {
  const { user, profile, refreshProfile } = useAuth()
  const { upsertEntry } = useEntries(user?.id)
  const [theme, setTheme] = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const requireName = location.state?.requireName
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [reminderTime, setReminderTime] = useState(() => localStorage.getItem(REMINDER_KEY) || '17:00')
  const [reminderEnabled, setReminderEnabled] = useState(() => localStorage.getItem(REMINDER_ENABLED_KEY) !== '0')
  const [summerHours, setSummerHours] = useState(() => localStorage.getItem(SUMMER_HOURS_KEY) === '1')
  const [saved, setSaved] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [isEditingName, setIsEditingName] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [lastSavedName, setLastSavedName] = useState('')
  const [fetchedDisplayName, setFetchedDisplayName] = useState(null)
  const [profileNameLoaded, setProfileNameLoaded] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)

  useEffect(() => {
    const name = profile?.display_name || ''
    setDisplayName(name)
    if (name.trim()) setLastSavedName(name.trim())
  }, [profile])

  useEffect(() => {
    if (user) refreshProfile?.()
  }, [user])

  useEffect(() => {
    if (!user || !hasSupabase()) {
      setProfileNameLoaded(true)
      return
    }
    setProfileNameLoaded(false)
    supabase.rpc('get_my_display_name')
      .then(({ data, error }) => {
        setProfileNameLoaded(true)
        const name = !error && data != null && String(data).trim() !== '' ? String(data).trim() : ''
        if (name) {
          setFetchedDisplayName(name)
          setDisplayName((prev) => prev || name)
          setLastSavedName((prev) => prev || name)
        }
      })
      .catch(() => setProfileNameLoaded(true))
  }, [user?.id])

  useEffect(() => {
    const stored = localStorage.getItem(REMINDER_KEY)
    if (stored) setReminderTime(stored)
  }, [])
  useEffect(() => {
    setSummerHours(localStorage.getItem(SUMMER_HOURS_KEY) === '1')
  }, [])

  function handleReminderChange(e) {
    const v = e.target.value
    setReminderTime(v)
    localStorage.setItem(REMINDER_KEY, v)
  }

  function handleSummerHoursChange(checked) {
    setSummerHours(checked)
    localStorage.setItem(SUMMER_HOURS_KEY, checked ? '1' : '0')
  }

  function handleReminderEnabledChange(checked) {
    setReminderEnabled(checked)
    localStorage.setItem(REMINDER_ENABLED_KEY, checked ? '1' : '0')
  }

  async function handleSaveProfile(e) {
    e.preventDefault()
    setProfileError('')
    const nomPrenom = displayName.trim()
    if (!nomPrenom) {
      setProfileError('Veuillez renseigner votre nom et prénom.')
      return
    }
    if (!hasSupabase() || !user) {
      setProfileError('Connexion au serveur indisponible. Vérifiez votre configuration.')
      return
    }
    const { error } = await supabase.rpc('update_my_display_name', { new_name: nomPrenom })
    if (error) {
      setProfileError(error.message || 'Erreur lors de l’enregistrement.')
      return
    }
    await refreshProfile?.()
    setLastSavedName(nomPrenom)
    setSaved(true)
    setIsEditingName(false)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleLogout() {
    if (hasSupabase()) await supabase.auth.signOut()
    navigate('/login')
  }

  function getSupabaseAuthUsersUrl() {
    try {
      const url = import.meta.env.VITE_SUPABASE_URL || ''
      const match = url.match(/https:\/\/([^.]+)\.supabase\.co/)
      return match ? `https://supabase.com/dashboard/project/${match[1]}/auth/users` : null
    } catch {
      return null
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText.toLowerCase() !== 'supprimer') return
    setDeleteError('')
    setDeleting(true)
    const authUsersUrl = getSupabaseAuthUsersUrl()
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const tryApiRoute = async () => {
        if (!token) return false
        const res = await fetch('/api/delete-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        })
        const body = await res.json().catch(() => ({}))
        if (res.ok && body.success) return true
        throw new Error(body.error || res.statusText)
      }

      const tryEdgeFunction = async () => {
        const { data, error } = await supabase.functions.invoke('delete-account')
        if (!error && !data?.error) return true
        throw new Error(data?.error || error?.message || 'Erreur')
      }

      let ok = false
      try {
        ok = await tryApiRoute()
      } catch (_e) {
        try {
          ok = await tryEdgeFunction()
        } catch (_e2) {
          throw _e2
        }
      }
      if (!ok) throw new Error('Échec')

      if (ok) {
        await supabase.auth.signOut()
        setShowDeleteConfirm(false)
        setDeleteConfirmText('')
        navigate('/login', { state: { message: 'Compte supprimé. Vous pouvez vous réinscrire avec le même email.', deleteSuccess: true } })
        return
      }
    } catch (_err) {
      if (hasSupabase()) {
        const { error: rpcError } = await supabase.rpc('delete_my_profile')
        if (!rpcError) {
          await supabase.auth.signOut()
          setShowDeleteConfirm(false)
          setDeleteConfirmText('')
          navigate('/login', {
            state: {
              message: 'Vos données ont été supprimées. Votre compte (email/mot de passe) existe encore : vous pouvez vous reconnecter. Pour le supprimer définitivement et vous réinscrire avec le même email, supprimez votre utilisateur dans le tableau de bord Supabase.',
              authUsersUrl,
              deleteDataOnly: true,
            },
          })
          return
        }
      }
      setDeleteError('Impossible de supprimer. En production, ajoutez SUPABASE_SERVICE_ROLE_KEY dans les variables d’environnement Vercel.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="settings-page">
      <h1>Paramètres</h1>

      <section className="settings-section">
        <h2>Profil</h2>
        {requireName && <p className="settings-require-name">Veuillez renseigner votre nom et prénom pour continuer.</p>}
        {user?.email && <p className="settings-email">Connecté avec : <strong>{user.email}</strong></p>}
        {!profileNameLoaded ? (
          <p className="settings-hint">Chargement du profil…</p>
        ) : (profile?.display_name?.trim() || lastSavedName?.trim() || fetchedDisplayName) && !isEditingName ? (
          <div className="settings-name-display">
            <p className="settings-name-value"><strong>Nom et prénom :</strong> {profile?.display_name?.trim() || lastSavedName || fetchedDisplayName || ''}</p>
            <button type="button" className="btn-edit-name" onClick={() => setIsEditingName(true)}>Modifier</button>
          </div>
        ) : (
          <form onSubmit={handleSaveProfile}>
            {profileError && <p className="settings-error">{profileError}</p>}
            <label>
              Nom et prénom <span className="required">*</span>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                placeholder="Ex. Marie Martin"
                required
              />
            </label>
            {hasSupabase() && (
              <div className="settings-form-actions">
                <button type="submit" className="btn-primary">{saved ? 'Enregistré' : 'Enregistrer'}</button>
                {(profile?.display_name?.trim() || lastSavedName?.trim() || fetchedDisplayName) && <button type="button" className="btn-secondary" onClick={() => { setIsEditingName(false); setProfileError(''); setDisplayName(profile?.display_name || lastSavedName || ''); }}>Annuler</button>}
              </div>
            )}
          </form>
        )}
      </section>

      <section className="settings-section">
        <h2>Apparence</h2>
        <label className="settings-toggle-row">
          <span className="settings-toggle-label">Thème sombre</span>
          <span className="settings-toggle-switch">
            <input
              type="checkbox"
              className="settings-toggle-input"
              checked={theme === 'dark'}
              onChange={(e) => setTheme(e.target.checked ? 'dark' : 'light')}
              aria-label="Activer le thème sombre"
            />
            <span className="settings-toggle-slider" aria-hidden />
          </span>
        </label>
      </section>

      <section className="settings-section">
        <h2>Horaires</h2>
        <label className="settings-toggle-row">
          <span className="settings-toggle-label">Activer les horaires d’été</span>
          <span className="settings-toggle-switch">
            <input
              type="checkbox"
              className="settings-toggle-input"
              checked={summerHours}
              onChange={(e) => handleSummerHoursChange(e.target.checked)}
              aria-label="Activer les horaires d'été"
            />
            <span className="settings-toggle-slider" aria-hidden />
          </span>
        </label>
      </section>

      <section className="settings-section">
        <h2>Rappel en fin de journée</h2>
        <label className="settings-toggle-row">
          <span className="settings-toggle-label">Activer les rappels</span>
          <span className="settings-toggle-switch">
            <input
              type="checkbox"
              className="settings-toggle-input"
              checked={reminderEnabled}
              onChange={(e) => handleReminderEnabledChange(e.target.checked)}
              aria-label="Activer les rappels"
            />
            <span className="settings-toggle-slider" aria-hidden />
          </span>
        </label>
        <p className="settings-hint">Rappel en semaine (lundi–vendredi) si la journée n’est pas encore renseignée.</p>
        <label>
          Heure du rappel
          <input type="time" value={reminderTime} onChange={handleReminderChange} disabled={!reminderEnabled} />
        </label>
        <button
          type="button"
          className="btn-secondary"
          style={{ marginTop: '0.25rem' }}
          onClick={() => {
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              new Notification('OBO Horaires', { body: 'Pensez à saisir vos horaires du jour.', tag: 'obo-reminder-test' })
            } else if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
              Notification.requestPermission().then((p) => {
                if (p === 'granted') new Notification('OBO Horaires', { body: 'Pensez à saisir vos horaires du jour.', tag: 'obo-reminder-test' })
              })
            } else {
              alert('Pour autoriser les notifications : menu Chrome (⋮) → Paramètres du site → Notifications → Autoriser. Ou Paramètres Chrome → Confidentialité → Paramètres des sites → Notifications.')
            }
          }}
        >
          Tester la notification
        </button>
      </section>

      <section className="settings-section">
        <h2>Importer des horaires</h2>
        <p className="settings-hint">Fichier JSON généré à partir de tes horaires (ex. horraire perso/entries-import.json). Les entrées sont ajoutées à ton compte.</p>
        <label>
          Fichier JSON
          <input
            type="file"
            accept=".json"
            disabled={importing}
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file || !user?.id || !upsertEntry) return
              setImporting(true)
              setImportResult(null)
              try {
                const text = await file.text()
                const data = JSON.parse(text)
                const list = Array.isArray(data) ? data : []
                let ok = 0
                let err = 0
                for (const entry of list) {
                  if (!entry?.date) continue
                  try {
                    await upsertEntry(entry.date, {
                      day_type: entry.day_type || 'normal',
                      slots: entry.slots || [],
                      activity: entry.activity || null,
                      note: entry.note || null,
                      total_minutes: entry.total_minutes ?? 0,
                    })
                    ok++
                  } catch (_) {
                    err++
                  }
                }
                setImportResult(`Import terminé : ${ok} entrée(s) importée(s)${err ? `, ${err} erreur(s)` : ''}.`)
              } catch (err) {
                setImportResult('Erreur : fichier invalide ou illisible.')
              }
              setImporting(false)
              e.target.value = ''
            }}
          />
        </label>
        {importing && <p className="settings-hint">Import en cours…</p>}
        {importResult && <p className="settings-hint" style={{ marginTop: '0.5rem', color: 'var(--obo-primary)' }}>{importResult}</p>}
      </section>

      <section className="settings-section">
        <h2>Compte</h2>
        <button type="button" className="btn-logout" onClick={handleLogout}>Déconnexion</button>
        <p className="settings-hint" style={{ marginTop: '1rem' }}>Supprimer définitivement votre compte et toutes vos données pour pouvoir vous réinscrire (même email possible).</p>
        <button type="button" className="btn-delete-account" onClick={() => { setShowDeleteConfirm(true); setDeleteError(''); setDeleteConfirmText(''); }}>
          Supprimer mon compte
        </button>
      </section>

      {showDeleteConfirm && (
        <div className="settings-delete-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-title">
          <div className="settings-delete-modal">
            <h2 id="delete-title">Supprimer mon compte</h2>
            <p>Toutes vos données (profil, horaires) seront supprimées. Vous pourrez vous réinscrire avec le même email.</p>
            <p className="settings-delete-warning">Pour confirmer, tapez <strong>supprimer</strong> ci-dessous.</p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="supprimer"
              className="settings-delete-input"
              autoComplete="off"
            />
            {deleteError && <p className="settings-error">{deleteError}</p>}
            <div className="settings-delete-actions">
              <button type="button" className="btn-secondary" onClick={() => { setShowDeleteConfirm(false); setDeleteError(''); setDeleteConfirmText(''); }} disabled={deleting}>
                Annuler
              </button>
              <button
                type="button"
                className="btn-delete-confirm"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText.toLowerCase() !== 'supprimer' || deleting}
              >
                {deleting ? '…' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

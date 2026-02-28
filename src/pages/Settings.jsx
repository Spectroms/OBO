import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { supabase, hasSupabase } from '../lib/supabaseClient'
import './Settings.css'

const REMINDER_KEY = 'obo_reminder_time'

export default function Settings() {
  const { user, profile, refreshProfile } = useAuth()
  const [theme, setTheme] = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const requireName = location.state?.requireName
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [reminderTime, setReminderTime] = useState(() => localStorage.getItem(REMINDER_KEY) || '17:00')
  const [saved, setSaved] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [isEditingName, setIsEditingName] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setDisplayName(profile?.display_name || '')
  }, [profile])

  useEffect(() => {
    const stored = localStorage.getItem(REMINDER_KEY)
    if (stored) setReminderTime(stored)
  }, [])

  function handleReminderChange(e) {
    const v = e.target.value
    setReminderTime(v)
    localStorage.setItem(REMINDER_KEY, v)
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
        {profile?.display_name?.trim() && !isEditingName ? (
          <div className="settings-name-display">
            <p className="settings-name-value"><strong>Nom et prénom :</strong> {profile.display_name.trim()}</p>
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
                {profile?.display_name?.trim() && <button type="button" className="btn-secondary" onClick={() => { setIsEditingName(false); setProfileError(''); setDisplayName(profile?.display_name || ''); }}>Annuler</button>}
              </div>
            )}
          </form>
        )}
      </section>

      <section className="settings-section">
        <h2>Apparence</h2>
        <label className="settings-toggle-row">
          <span className="settings-toggle-label">Thème sombre</span>
          <input
            type="checkbox"
            className="settings-toggle-input"
            checked={theme === 'dark'}
            onChange={(e) => setTheme(e.target.checked ? 'dark' : 'light')}
            aria-label="Activer le thème sombre"
          />
          <span className="settings-toggle-slider" aria-hidden />
        </label>
      </section>

      <section className="settings-section">
        <h2>Rappel en fin de journée</h2>
        <p className="settings-hint">Heure à laquelle vous souhaitez recevoir un rappel pour saisir vos horaires (si la journée n’est pas encore renseignée).</p>
        <label>
          Heure du rappel
          <input type="time" value={reminderTime} onChange={handleReminderChange} />
        </label>
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

import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase, hasSupabase } from '../lib/supabaseClient'
import './Login.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [isRecoveryMode, setIsRecoveryMode] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const successMessage = location.state?.message
  const authUsersUrl = location.state?.authUsersUrl
  const deleteDataOnly = location.state?.deleteDataOnly
  const errorRef = useRef(null)

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.focus({ preventScroll: true })
    }
  }, [error])

  useEffect(() => {
    if (!hasSupabase()) return undefined

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !isRecoveryMode) navigate('/')
    })

    if (typeof window !== 'undefined' && /type=recovery/.test(window.location.hash || '')) {
      setIsRecoveryMode(true)
      setIsSignUp(false)
      setInfo('Lien de récupération détecté. Définissez votre nouveau mot de passe.')
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session && !isRecoveryMode) {
        navigate('/')
      }
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true)
        setIsSignUp(false)
        setInfo('Lien de récupération détecté. Définissez votre nouveau mot de passe.')
      }
    })
    return () => subscription.unsubscribe()
  }, [navigate, isRecoveryMode])

  async function handleForgotPassword() {
    setError('')
    setInfo('')
    if (!email.trim()) {
      setError('Renseignez votre email pour recevoir le lien de réinitialisation.')
      return
    }
    if (!hasSupabase()) {
      setError('Supabase n’est pas configuré. Créez un fichier .env avec VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.')
      return
    }
    setLoading(true)
    try {
      const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), redirectTo ? { redirectTo } : undefined)
      if (resetError) throw resetError
      setInfo('Email de réinitialisation envoyé. Vérifiez votre boîte mail.')
    } catch (err) {
      setError(err.message || 'Impossible d’envoyer l’email de réinitialisation.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleSignIn() {
    setError('')
    setInfo('')
    if (!hasSupabase()) {
      setError('Supabase n’est pas configuré. Créez un fichier .env avec VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.')
      return
    }
    setLoading(true)
    try {
      const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/` : undefined
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: redirectTo ? { redirectTo } : undefined,
      })
      if (oauthError) throw oauthError
    } catch (err) {
      setError(err.message || 'Impossible de lancer la connexion Google.')
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    if (!hasSupabase()) {
      setError('Supabase n’est pas configuré. Créez un fichier .env avec VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.')
      setLoading(false)
      return
    }
    try {
      if (isRecoveryMode) {
        if (newPassword.length < 6) {
          setError('Le nouveau mot de passe doit contenir au moins 6 caractères.')
          setLoading(false)
          return
        }
        if (newPassword !== confirmPassword) {
          setError('Les mots de passe ne correspondent pas.')
          setLoading(false)
          return
        }
        const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
        if (updateError) throw updateError
        setInfo('Mot de passe mis à jour. Vous pouvez vous connecter.')
        setIsRecoveryMode(false)
        setNewPassword('')
        setConfirmPassword('')
      } else if (isSignUp) {
        const nomPrenom = displayName.trim()
        if (!nomPrenom) {
          setError('Veuillez renseigner votre nom et prénom.')
          setLoading(false)
          return
        }
        const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/` : ''
        const { data, error: signUpError } = await supabase.auth.signUp(
          { email, password },
          redirectUrl ? { emailRedirectTo: redirectUrl } : undefined
        )
        if (signUpError) throw signUpError
        if (data?.user) {
          if (data.session) await supabase.auth.setSession(data.session)
          const { error: rpcError } = await supabase.rpc('update_my_display_name', { new_name: nomPrenom })
          if (rpcError) {
            setError(rpcError.message || 'Le profil n’a pas pu être créé.')
            setLoading(false)
            return
          }
        }
        navigate('/')
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) throw signInError
        navigate('/')
      }
    } catch (err) {
      setError(err.message || 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <img src="/logo.png" alt="OBO" className="login-logo" onError={(e) => { e.target.style.display = 'none' }} />
          <h1>OBO <em>horaires</em></h1>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          {successMessage && (
            <div className="login-success">
              <p style={{ margin: 0 }}>{successMessage}</p>
              {deleteDataOnly && authUsersUrl && (
                <p style={{ margin: '0.5rem 0 0' }}>
                  <a href={authUsersUrl} target="_blank" rel="noopener noreferrer" className="login-success-link">
                    Ouvrir le tableau de bord Supabase → Auth / Users
                  </a>
                  {' '}puis supprimez votre utilisateur (votre email) pour pouvoir vous réinscrire.
                </p>
              )}
            </div>
          )}
          {error && (
            <div id="login-error" className="login-error" role="alert" ref={errorRef} tabIndex={-1}>
              {error}
            </div>
          )}
          {info && <div className="login-success"><p style={{ margin: 0 }}>{info}</p></div>}
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" disabled={isRecoveryMode} />
          </label>
          {isSignUp && !isRecoveryMode && (
            <label>
              Nom et prénom <span className="required">*</span>
              <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Ex. Marie Martin" required />
            </label>
          )}
          {isRecoveryMode ? (
            <>
              <label>
                Nouveau mot de passe
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} autoComplete="new-password" />
              </label>
              <label>
                Confirmer le nouveau mot de passe
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} autoComplete="new-password" />
              </label>
            </>
          ) : (
            <label>
              Mot de passe
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete={isSignUp ? 'new-password' : 'current-password'} />
            </label>
          )}
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? '…' : isRecoveryMode ? 'Mettre à jour le mot de passe' : isSignUp ? 'Créer le compte' : 'Connexion'}
          </button>
          {!isRecoveryMode && (
            <>
              <div className="login-separator"><span>ou</span></div>
              <button type="button" className="btn-google" onClick={handleGoogleSignIn} disabled={loading}>
                Continuer avec Google
              </button>
              <button type="button" className="btn-link" onClick={() => { setIsSignUp(!isSignUp); setError(''); setInfo('') }}>
                {isSignUp ? 'Déjà un compte ? Se connecter' : 'Pas de compte ? S’inscrire'}
              </button>
              <button type="button" className="btn-link" onClick={handleForgotPassword} disabled={loading}>
                Mot de passe oublié ?
              </button>
            </>
          )}
          {isRecoveryMode && (
            <button
              type="button"
              className="btn-link"
              onClick={() => {
                setIsRecoveryMode(false)
                setError('')
                setInfo('')
                if (typeof window !== 'undefined') window.location.hash = ''
              }}
              disabled={loading}
            >
              Retour à la connexion
            </button>
          )}
        </form>
      </div>
    </div>
  )
}

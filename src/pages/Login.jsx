import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase, hasSupabase } from '../lib/supabaseClient'
import './Login.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const successMessage = location.state?.message
  const authUsersUrl = location.state?.authUsersUrl
  const deleteDataOnly = location.state?.deleteDataOnly

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    if (!hasSupabase()) {
      setError('Supabase n’est pas configuré. Créez un fichier .env avec VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.')
      setLoading(false)
      return
    }
    try {
      if (isSignUp) {
        const nomPrenom = displayName.trim()
        if (!nomPrenom) {
          setError('Veuillez renseigner votre nom et prénom.')
          setLoading(false)
          return
        }
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
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
          {error && <div className="login-error">{error}</div>}
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </label>
          {isSignUp && (
            <label>
              Nom et prénom <span className="required">*</span>
              <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Ex. Marie Martin" required />
            </label>
          )}
          <label>
            Mot de passe
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete={isSignUp ? 'new-password' : 'current-password'} />
          </label>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? '…' : isSignUp ? 'Créer le compte' : 'Connexion'}
          </button>
          <button type="button" className="btn-link" onClick={() => { setIsSignUp(!isSignUp); setError(''); }}>
            {isSignUp ? 'Déjà un compte ? Se connecter' : 'Pas de compte ? S’inscrire'}
          </button>
        </form>
      </div>
    </div>
  )
}

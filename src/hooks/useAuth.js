import { useState, useEffect } from 'react'
import { supabase, hasSupabase } from '../lib/supabaseClient'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!hasSupabase()) {
      setLoading(false)
      return
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id, session.user.email)
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id, session.user.email)
      else {
        setProfile(null)
        setLoading(false)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId, userEmail) {
    if (!hasSupabase()) return
    let { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (!data) {
      await supabase.from('profiles').upsert(
        { id: userId, email: userEmail || '', display_name: null, role: 'employee' },
        { onConflict: 'id' }
      )
      const res = await supabase.from('profiles').select('*').eq('id', userId).single()
      data = res.data
    }
    setProfile(data ?? null)
    setLoading(false)
  }

  const canViewTeam = profile?.role === 'chef_depot' || profile?.role === 'patronne'

  return { user, profile, loading, canViewTeam, refreshProfile: () => user && fetchProfile(user.id, user.email) }
}

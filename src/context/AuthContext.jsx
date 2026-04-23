import { createContext, useContext, useState, useEffect } from 'react'
import { supabase, verifyPassword } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = sessionStorage.getItem('siri_profile')
    if (stored) {
      try { setProfile(JSON.parse(stored)) } catch {}
    }
    setLoading(false)
  }, [])

  async function signIn(cedula, password) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('cedula', cedula)
      .single()

    if (error || !data) return { error: { message: 'Cédula o contraseña incorrecta.' } }

    const valid = await verifyPassword(password, data.password_hash)
    if (!valid) return { error: { message: 'Cédula o contraseña incorrecta.' } }

    sessionStorage.setItem('siri_profile', JSON.stringify(data))
    setProfile(data)
    return { error: null, profile: data }
  }

  async function signOut() {
    sessionStorage.removeItem('siri_profile')
    setProfile(null)
  }

  async function refreshProfile() {
    if (!profile) return
    const { data } = await supabase.from('profiles').select('*').eq('id', profile.id).single()
    if (data) {
      sessionStorage.setItem('siri_profile', JSON.stringify(data))
      setProfile(data)
    }
  }

  return (
    <AuthContext.Provider value={{ profile, loading, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)


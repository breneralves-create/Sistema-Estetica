import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

type Role = 'admin' | 'user'

interface AuthContextType {
  user: User | null
  role: Role | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<Role | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let isMounted = true

    // Safety timeout: give gotrue-js 10 seconds. It needs 5 seconds just to recover orphaned locks!
    const timeoutId = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('Auth initialization timed out after 10s. Forcing loading to false.')
        setLoading(false)
      }
    }, 10000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return
      console.log('Auth state changed:', event, session?.user?.id)
      setUser(session?.user ?? null)
      if (session?.user) {
        await fetchRole(session.user.id)
      } else {
        setRole(null)
        setLoading(false)
      }
    })

    return () => {
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [])

  const fetchRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single()
      
      if (error) {
        console.warn('Role not found for user in public.users table:', error.message)
        setRole(null)
      } else if (data) {
        setRole(data.role as Role)
      }
    } catch (e) {
      console.error('Error in fetchRole:', e)
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within a AuthProvider')
  }
  return context
}

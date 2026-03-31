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
    // Safety timeout: force loading to false after 8 seconds no matter what
    const timeoutId = setTimeout(() => {
      setLoading(current => {
        if (current) {
          console.warn('Auth initialization timed out after 8s. Forcing loading to false.')
          return false
        }
        return current
      })
    }, 8000)

    const initAuth = async () => {
      try {
        console.log('Starting auth initialization...')
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Error fetching session:', sessionError)
        }

        setUser(session?.user ?? null)
        
        if (session?.user) {
          console.log('User found, fetching role...')
          await fetchRole(session.user.id)
        } else {
          console.log('No active session found.')
          setLoading(false)
        }
      } catch (err) {
        console.error('Fatal error in auth initialization:', err)
        setLoading(false)
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
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

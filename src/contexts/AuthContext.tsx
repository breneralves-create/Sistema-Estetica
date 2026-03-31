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

    // Safety timeout: force loading to false after 5 seconds to prevent permanent blank screens
    const timeoutId = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('Auth initialization timed out after 5s. Forcing loading to false.')
        setLoading(false)
      }
    }, 5000)

    const initAuth = async () => {
      try {
        console.log('Starting auth initialization...')
        
        // Use Promise.race to guarantee we don't hang forever on purely local auth getting stuck
        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise<{data: {session: null}, error: Error}>((_, reject) => 
          setTimeout(() => reject(new Error('Auth getSession timeout internal')), 4000)
        )
        
        const { data: { session }, error: sessionError } = await Promise.race([sessionPromise, timeoutPromise])
        
        if (sessionError) {
          console.error('Error fetching session:', sessionError)
        }

        if (isMounted) {
          setUser(session?.user ?? null)
          
          if (session?.user) {
            console.log('User found, fetching role...')
            await fetchRole(session.user.id)
          } else {
            console.log('No active session found.')
            setLoading(false)
          }
        }
      } catch (err: any) {
        console.error('Fatal error in auth initialization:', err.message)
        // If auth completely fails or times out locally, assume user is logged out to unblock app
        if (isMounted) {
          setUser(null)
          setRole(null)
          setLoading(false)
        }
      }
    }

    initAuth()

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

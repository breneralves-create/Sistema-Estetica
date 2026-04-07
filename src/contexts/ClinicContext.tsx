import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '../lib/supabase'

interface ClinicData {
  nome: string
  logo_url: string | null
}

interface ClinicContextType {
  clinic: ClinicData | null
  loading: boolean
  refreshClinic: () => Promise<void>
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined)

export function ClinicProvider({ children }: { children: ReactNode }) {
  const [clinic, setClinic] = useState<ClinicData | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshClinic = async () => {
    const timeoutId = setTimeout(() => {
      setLoading(false)
    }, 8000)

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('clinic_config')
        .select('nome, logo_url')
        .limit(1)
        .single()
      
      if (error) {
        console.error('ClinicContext: error loading clinic_config:', error)
        setClinic({ nome: 'Clínica de Estética', logo_url: null })
      } else if (data) {
        setClinic(data)
      } else {
        setClinic({ nome: 'Clínica de Estética', logo_url: null })
      }
    } catch (error) {
      console.error('ClinicContext: Exception fetching clinic config:', error)
      setClinic({ nome: 'Clínica de Estética', logo_url: null })
    } finally {
      clearTimeout(timeoutId)
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshClinic()
  }, [])

  return (
    <ClinicContext.Provider value={{ clinic, loading, refreshClinic }}>
      {children}
    </ClinicContext.Provider>
  )
}

export function useClinic() {
  const context = useContext(ClinicContext)
  if (context === undefined) {
    throw new Error('useClinic must be used within a ClinicProvider')
  }
  return context
}

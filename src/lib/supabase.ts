import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Diagnostic logs for production issues
if (import.meta.env.PROD && !import.meta.env.VITE_SUPABASE_URL) {
  console.warn('--- SUPABASE CONFIGURATION WARNING ---')
  console.error('❌ ERRO CRÍTICO: Variáveis do Supabase ausentes no Vercel!')
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage
  },
  global: {
    headers: {
      'x-my-custom-header': 'sistema-estetica',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    }
  }
})

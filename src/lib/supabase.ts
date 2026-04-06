import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// ✅ DIAGNÓSTICO DE PRODUÇÃO
if (import.meta.env.PROD) {
  console.log('--- SUPABASE DIAGNOSTIC ---')
  console.log('URL definida:', !!supabaseUrl)
  console.log('Key definida:', !!supabaseAnonKey)
  if (supabaseUrl) console.log('URL Host:', new URL(supabaseUrl).hostname)
  if (supabaseAnonKey) console.log('Key Prefix:', supabaseAnonKey.substring(0, 10) + '...')
  console.log('---------------------------')
}

if (!supabaseUrl || !supabaseAnonKey) {
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

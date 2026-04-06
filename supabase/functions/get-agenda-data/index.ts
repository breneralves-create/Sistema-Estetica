import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders, handleCors } from "../_shared/cors.ts"

serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } }
    })

    // Validação de Usuário Logado
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Cliente Admin para busca rápida bypassando CORS/RLS de rede externa
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    console.log('Buscando dados da agenda para o usuário:', user.email)

    const [resAgendas, resHours, resAgendamentos] = await Promise.all([
      supabaseAdmin.from('agendas').select('*').eq('ativo', true).order('created_at'),
      supabaseAdmin.from('agenda_hours').select('*'),
      supabaseAdmin.from('agendamentos_estetica').select(`
        *,
        data_hora_fim,
        leads_estetica(nome_lead, whatsapp_lead)
      `).neq('status', 'cancelado')
    ])

    return new Response(
      JSON.stringify({
        success: true,
        agendas: resAgendas.data,
        hours: resHours.data,
        agendamentos: resAgendamentos.data
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Erro na função get-agenda-data:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

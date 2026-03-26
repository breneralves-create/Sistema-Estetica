import { handleCors, buildResponse } from '../_shared/cors.ts'
import { validateAuth, validateAgenda } from '../_shared/auth.ts'
import { calcularSlotsDisponiveis } from '../_shared/slots.ts'
import { supabaseAdmin } from '../_shared/supabaseClient.ts'

Deno.serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    if (req.method !== 'POST') {
      return buildResponse(405, false, 'METODO_NAO_PERMITIDO', 'Método HTTP não permitido.')
    }

    const { errorResponse } = await validateAuth(req)
    if (errorResponse) return errorResponse

    const body = await req.json().catch(() => ({}))
    const { agenda_id, lead_id, cliente_id, data, hora, procedimento_nome, nome_lead, whatsapp_lead, observacoes } = body

    if (!agenda_id || !data || !hora) {
      return buildResponse(422, false, 'CAMPO_OBRIGATORIO_AUSENTE', 'agenda_id, data e hora são obrigatórios.', { campo: (!agenda_id ? 'agenda_id ' : '') + (!data ? 'data ' : '') + (!hora ? 'hora' : '') })
    }

    if (!lead_id && !cliente_id) {
      return buildResponse(422, false, 'CAMPO_OBRIGATORIO_AUSENTE', 'É necessário informar lead_id ou cliente_id.', { campo: 'lead_id ou cliente_id' })
    }

    // Validate formats
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      return buildResponse(422, false, 'FORMATO_INVALIDO', 'Formato de data inválido. Use YYYY-MM-DD.')
    }
    if (!/^\d{2}:\d{2}$/.test(hora)) {
      return buildResponse(422, false, 'FORMATO_INVALIDO', 'Formato de hora inválido. Use HH:MM.')
    }

    const { errorResponse: agendaError } = await validateAgenda(agenda_id)
    if (agendaError) return agendaError

    // Check if lead_id or cliente_id exists
    if (lead_id) {
      const { data: lead } = await supabaseAdmin.from('leads_estetica').select('id').eq('id', lead_id).single()
      if (!lead) return buildResponse(404, false, 'LEAD_NAO_ENCONTRADO', 'lead_id não existe.')
    }
    if (cliente_id) {
      const { data: cliente } = await supabaseAdmin.from('clientes_estetica').select('id').eq('id', cliente_id).single()
      if (!cliente) return buildResponse(404, false, 'CLIENTE_NAO_ENCONTRADO', 'cliente_id não existe.')
    }

    const slotsResult = await calcularSlotsDisponiveis(agenda_id, data)

    if (slotsResult.past) {
      return buildResponse(200, false, 'DATA_PASSADA', 'Não é possível agendar para uma data que já passou.')
    }

    if (slotsResult.fechada) {
      return buildResponse(200, false, 'AGENDA_FECHADA', 'A agenda não tem atendimentos no dia solicitado.')
    }

    if (!slotsResult.slots.includes(hora)) {
      const sugestoes = slotsResult.slots.filter((s: string) => s > hora).slice(0, 3).map((s: string) => `${data}T${s}:00-03:00`)
      return buildResponse(200, false, 'HORARIO_OCUPADO', 'O horário solicitado não está disponível. Aqui estão os próximos horários livres:', { sugestoes })
    }

    // Insert
    const data_hora_inicio = `${data}T${hora}:00-03:00`
    const horaParts = hora.split(':')
    const fimH = (parseInt(horaParts[0]) + 1).toString().padStart(2, '0')
    const data_hora_fim_str = `${data}T${fimH}:${horaParts[1]}:00-03:00`

    const { data: insertData, error: insertError } = await supabaseAdmin.from('agendamentos_estetica').insert({
      agenda_id,
      lead_id: lead_id || null,
      cliente_id: cliente_id || null,
      procedimento_nome,
      nome_lead,
      whatsapp_lead,
      data_hora_inicio,
      data_hora_fim: data_hora_fim_str,
      status: 'agendado',
      observacoes
    }).select().single()

    if (insertError) {
      return buildResponse(500, false, 'ERRO_INTERNO', 'Erro ao inserir agendamento', { detalhe: insertError.message })
    }

    return buildResponse(201, true, 'AGENDAMENTO_CRIADO', 'Agendamento criado com sucesso.', { agendamento: insertData })

  } catch (err: any) {
    return buildResponse(500, false, 'ERRO_INTERNO', 'Erro interno do servidor', { detalhe: err.message })
  }
})

import { handleCors, buildResponse } from '../_shared/cors.ts'
import { validateAuth } from '../_shared/auth.ts'
import { calcularSlotsDisponiveis } from '../_shared/slots.ts'
import { supabaseAdmin } from '../_shared/supabaseClient.ts'

Deno.serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const { errorResponse } = await validateAuth(req)
    if (errorResponse) return errorResponse

    const url = new URL(req.url)
    const segments = url.pathname.split('/')
    // path is /agendamentos-id/:id OR /functions/v1/agendamentos/:id
    let id = segments[segments.length - 1]
    
    // Fallback if ID is poorly mapped 
    if (!id || id === 'agendamentos-id' || id === 'agendamentos') {
      return buildResponse(404, false, 'CAMPO_OBRIGATORIO_AUSENTE', 'ID do agendamento não informado na URL.')
    }

    if (req.method === 'PUT') {
      const body = await req.json().catch(() => ({}))
      const { agenda_id, data, hora } = body

      if (!agenda_id || !data || !hora) {
        return buildResponse(422, false, 'CAMPO_OBRIGATORIO_AUSENTE', 'agenda_id, data e hora são obrigatórios.')
      }

      // Validate formats
      if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
        return buildResponse(422, false, 'FORMATO_INVALIDO', 'Formato de data inválido. Use YYYY-MM-DD.')
      }
      if (!/^\d{2}:\d{2}$/.test(hora)) {
        return buildResponse(422, false, 'FORMATO_INVALIDO', 'Formato de hora inválido. Use HH:MM.')
      }

      // Fetch
      const { data: agendamento, error: aError } = await supabaseAdmin.from('agendamentos_estetica').select('*').eq('id', id).single()

      if (aError || !agendamento) {
        return buildResponse(404, false, 'AGENDAMENTO_NAO_ENCONTRADO', 'ID do agendamento não existe.')
      }

      if (agendamento.agenda_id !== agenda_id) {
        return buildResponse(403, false, 'ACESSO_NEGADO', 'Agendamento não pertence à agenda.')
      }

      if (agendamento.status === 'cancelado') {
        return buildResponse(422, false, 'AGENDAMENTO_CANCELADO_NAO_REAGENDAVEL', 'Não é possível reagendar um agendamento que foi cancelado.')
      }

      const slotsResult = await calcularSlotsDisponiveis(agenda_id, data, id)

      if (slotsResult.past) {
        return buildResponse(200, false, 'DATA_PASSADA', 'Não é possível reagendar para uma data que já passou.')
      }
  
      if (slotsResult.fechada) {
        return buildResponse(200, false, 'AGENDA_FECHADA', 'A agenda não tem atendimentos no dia solicitado.')
      }
  
      if (!slotsResult.slots.includes(hora)) {
        const sugestoes = slotsResult.slots.filter((s: string) => s > hora).slice(0, 3).map((s: string) => `${data}T${s}:00-03:00`)
        return buildResponse(200, false, 'HORARIO_OCUPADO', 'O horário solicitado não está disponível. Aqui estão os próximos horários livres:', { sugestoes })
      }
  
      const data_hora_inicio = `${data}T${hora}:00-03:00`

      const { data: updated, error: updateError } = await supabaseAdmin.from('agendamentos_estetica').update({
        data_hora_inicio,
        status: 'agendado'
      }).eq('id', id).select().single()

      if (updateError) {
        return buildResponse(500, false, 'ERRO_INTERNO', 'Erro ao atualizar agendamento', { detalhe: updateError.message })
      }

      return buildResponse(200, true, 'AGENDAMENTO_REAGENDADO', 'Agendamento reagendado com sucesso.', { agendamento: updated })
    } 
    
    // DELETE
    if (req.method === 'DELETE') {
      const body = await req.json().catch(() => ({}))
      const { agenda_id } = body

      if (!agenda_id) {
        return buildResponse(422, false, 'CAMPO_OBRIGATORIO_AUSENTE', 'agenda_id é obrigatório.')
      }

      const { data: agendamento, error: aError } = await supabaseAdmin.from('agendamentos_estetica').select('*').eq('id', id).single()

      if (aError || !agendamento) {
        return buildResponse(404, false, 'AGENDAMENTO_NAO_ENCONTRADO', 'ID do agendamento não existe.')
      }

      if (agendamento.agenda_id !== agenda_id) {
        return buildResponse(403, false, 'ACESSO_NEGADO', 'Agendamento não pertence à agenda.')
      }

      if (agendamento.status === 'cancelado') {
        return buildResponse(422, false, 'AGENDAMENTO_JA_CANCELADO', 'Este agendamento já foi cancelado anteriormente.')
      }

      const { data: updated, error: updateError } = await supabaseAdmin.from('agendamentos_estetica').update({
        status: 'cancelado'
      }).eq('id', id).select().single()

      if (updateError) {
        return buildResponse(500, false, 'ERRO_INTERNO', 'Erro ao cancelar agendamento')
      }

      return buildResponse(200, true, 'AGENDAMENTO_CANCELADO', 'Agendamento cancelado com sucesso.', { agendamento: updated })
    }

    return buildResponse(405, false, 'METODO_NAO_PERMITIDO', 'Método HTTP não permitido.')

  } catch (err: any) {
    return buildResponse(500, false, 'ERRO_INTERNO', 'Erro interno do servidor', { detalhe: err.message })
  }
})

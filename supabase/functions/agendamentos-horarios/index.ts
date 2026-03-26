import { handleCors, buildResponse } from '../_shared/cors.ts'
import { validateAuth, validateAgenda } from '../_shared/auth.ts'
import { calcularSlotsDisponiveis } from '../_shared/slots.ts'

Deno.serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    if (req.method !== 'GET') {
      return buildResponse(405, false, 'METODO_NAO_PERMITIDO', 'Método HTTP não permitido.')
    }

    const { errorResponse } = await validateAuth(req)
    if (errorResponse) return errorResponse

    const url = new URL(req.url)
    const agenda_id = url.searchParams.get('agenda_id')
    const data = url.searchParams.get('data')
    const hora = url.searchParams.get('hora')

    if (!agenda_id || !data) {
      return buildResponse(422, false, 'CAMPO_OBRIGATORIO_AUSENTE', 'agenda_id e data são obrigatórios.', { campo: 'agenda_id ou data' })
    }

    const { errorResponse: agendaError } = await validateAgenda(agenda_id)
    if (agendaError) return agendaError

    // Validate date format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      return buildResponse(422, false, 'FORMATO_INVALIDO', 'Formato de data inválido. Use YYYY-MM-DD.')
    }

    if (hora && !/^\d{2}:\d{2}$/.test(hora)) {
      return buildResponse(422, false, 'FORMATO_INVALIDO', 'Formato de hora inválido. Use HH:MM.')
    }

    const slotsResult = await calcularSlotsDisponiveis(agenda_id, data)

    if (slotsResult.past) {
      return buildResponse(200, false, 'DATA_PASSADA', 'Não é possível agendar para uma data que já passou.')
    }

    if (slotsResult.fechada) {
      return buildResponse(200, false, 'AGENDA_FECHADA', 'A agenda não tem atendimentos no dia solicitado.')
    }

    if (hora) {
      if (slotsResult.slots.includes(hora)) {
        return buildResponse(200, true, 'HORARIO_DISPONIVEL', 'O horário solicitado está disponível.', { horario: `${data}T${hora}:00-03:00` })
      } else {
        // find suggestions
        const sugestoes = slotsResult.slots.filter((s: string) => s > hora).slice(0, 3).map((s: string) => `${data}T${s}:00-03:00`)
        return buildResponse(200, false, 'HORARIO_OCUPADO', 'O horário solicitado não está disponível. Aqui estão os próximos horários livres:', { sugestoes })
      }
    } else {
      return buildResponse(200, true, 'HORARIOS_DISPONIVEIS', `Horários disponíveis para o dia ${data.split('-').reverse().join('/')}.`, {
        data,
        duracao_minutos: 60,
        slots_disponiveis: slotsResult.slots
      })
    }

  } catch (err: any) {
    return buildResponse(500, false, 'ERRO_INTERNO', 'Erro interno do servidor', { detalhe: err.message })
  }
})

import { supabaseAdmin } from './supabaseClient.ts'

export async function calcularSlotsDisponiveis(agenda_id: string, data: string, ignorar_agendamento_id?: string) {
  // Check if date is in the past
  const now = new Date();
  const spDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(now);
  if (data < spDateStr) {
    return { fechada: false, past: true, slots: [] };
  }

  // Create Date object in UTC but representing the saopaulo date.
  const dateObj = new Date(data + 'T00:00:00-03:00')
  const daysOfWeek = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado']
  const dayName = daysOfWeek[dateObj.getDay()]

  const { data: agendaHour } = await supabaseAdmin
    .from('agenda_hours')
    .select('*')
    .eq('agenda_id', agenda_id)
    .eq('dia', dayName)
    .single()

  if (!agendaHour || agendaHour.aberto === false) {
    return { fechada: true }
  }

  // Generate slots
  let slots = []
  const horaInicioParts = agendaHour.hora_inicio.split(':')
  const horaFimParts = agendaHour.hora_fim.split(':')
  const startMins = parseInt(horaInicioParts[0]) * 60 + parseInt(horaInicioParts[1])
  const endMins = parseInt(horaFimParts[0]) * 60 + parseInt(horaFimParts[1])

  for (let m = startMins; m + 60 <= endMins; m += 60) {
    const h = Math.floor(m / 60).toString().padStart(2, '0')
    const min = (m % 60).toString().padStart(2, '0')
    slots.push(`${h}:${min}`)
  }

  // Fetch appointments for that day
  let query = supabaseAdmin
    .from('agendamentos_estetica')
    .select('id, data_hora_inicio, data_hora_fim')
    .eq('agenda_id', agenda_id)
    .neq('status', 'cancelado')
    .gte('data_hora_inicio', `${data}T00:00:00-03:00`)
    .lt('data_hora_inicio', `${data}T23:59:59-03:00`)

  if (ignorar_agendamento_id) {
    query = query.neq('id', ignorar_agendamento_id)
  }

  const { data: agendamentos } = await query

  // Filter overlapping slots
  let freeSlots = slots.filter(slot => {
    const slotStartStr = `${data}T${slot}:00-03:00`
    const slotDateStart = new Date(slotStartStr)
    const slotDateEnd = new Date(slotDateStart.getTime() + 60 * 60 * 1000)

    const isConflict = agendamentos?.some(a => {
      const aStart = new Date(a.data_hora_inicio)
      const aEnd = new Date(a.data_hora_fim)
      // Conflict if slot_inicio < a.fim AND slot_fim > a.inicio
      return slotDateStart < aEnd && slotDateEnd > aStart
    })

    return !isConflict
  })

  if (data === spDateStr) {
    const spTimeStr = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Sao_Paulo', timeStyle: 'short' }).format(now); // "HH:mm"
    freeSlots = freeSlots.filter(slot => slot > spTimeStr);
  }

  return { fechada: false, past: false, slots: freeSlots };
}

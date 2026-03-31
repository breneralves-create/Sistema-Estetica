import { useState, useEffect, useRef } from 'react'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import ptBrLocale from '@fullcalendar/core/locales/pt-br'
import { addWeeks, subWeeks, format, startOfWeek, endOfWeek, addHours, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Plus, ChevronLeft, ChevronRight, Edit2, Trash2, Calendar as CalIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { useAuth } from '../contexts/AuthContext'

export function Agenda() {
  const { role } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const calendarRefs = useRef<Record<string, any>>({})
  
  const [agendas, setAgendas] = useState<any[]>([])
  const [agendamentos, setAgendamentos] = useState<any[]>([])
  const [agendaHours, setAgendaHours] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Modals state
  const [isNovaAgendaOpen, setIsNovaAgendaOpen] = useState(false)
  const [isNovoAgendamentoOpen, setIsNovoAgendamentoOpen] = useState(false)
  const [isVerAgendamentoOpen, setIsVerAgendamentoOpen] = useState(false)
  
  const [selectedSlot, setSelectedSlot] = useState<any>(null)
  const [selectedEvent, setSelectedEvent] = useState<any>(null)

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    syncCalendarsDate()
  }, [currentDate])

  const fetchData = async () => {
    const timeoutId = setTimeout(() => {
      setLoading(prev => {
        if (prev) {
          console.warn('Agenda data fetch timed out safely')
          return false
        }
        return prev
      })
    }, 8000)

    try {
      setLoading(true)
      const [resAgendas, resHours, resAgendamentos] = await Promise.all([
        supabase.from('agendas').select('*').eq('ativo', true).order('created_at'),
        supabase.from('agenda_hours').select('*'),
        supabase.from('agendamentos_estetica').select(`
          *,
          leads_estetica(nome_lead, whatsapp_lead)
        `).neq('status', 'cancelado')
      ])

      if (resAgendas.error) throw resAgendas.error
      if (resHours.error) throw resHours.error
      if (resAgendamentos.error) throw resAgendamentos.error

      if (resAgendas.data) setAgendas(resAgendas.data)
      if (resHours.data) setAgendaHours(resHours.data)
      if (resAgendamentos.data) setAgendamentos(resAgendamentos.data)
    } catch (error) {
      console.error('Error fetching agenda data:', error)
      toast.error('Erro ao carregar dados da agenda')
    } finally {
      clearTimeout(timeoutId)
      setLoading(false)
    }
  }

  const syncCalendarsDate = () => {
    Object.values(calendarRefs.current).forEach(calApi => {
      if (calApi) {
        calApi.gotoDate(currentDate)
      }
    })
  }

  const handlePrevWeek = () => setCurrentDate(subWeeks(currentDate, 1))
  const handleNextWeek = () => setCurrentDate(addWeeks(currentDate, 1))
  const handleToday = () => setCurrentDate(new Date())

  const formatWeekRange = () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 0 })
    const end = endOfWeek(currentDate, { weekStartsOn: 0 })
    return `${format(start, 'dd/MM')} - ${format(end, 'dd/MM/yyyy')}`
  }

  const handleSlotClick = (info: any, agendaId: string) => {
    // Only allow future dates
    if (info.date < new Date()) {
      toast.error('Não é possível agendar no passado')
      return;
    }
    setSelectedSlot({ ...info, agendaId })
    setIsNovoAgendamentoOpen(true)
  }

  const handleEventClick = (info: any) => {
    const ev = agendamentos.find(a => a.id === info.event.id)
    if (ev) {
      setSelectedEvent(ev)
      setIsVerAgendamentoOpen(true)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Global */}
      <div className="flex flex-col md:flex-row items-center justify-between bg-card p-4 rounded-xl border border-border-card shadow-sm gap-4">
        <div className="flex items-center space-x-2">
          <Button variant="secondary" size="sm" onClick={handlePrevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="sm" onClick={handleToday} className="px-4">
            Hoje
          </Button>
          <Button variant="secondary" size="sm" onClick={handleNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="font-serif font-medium text-lg ml-4 text-main">
            {formatWeekRange()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {role === 'admin' && (
            <Button onClick={() => setIsNovaAgendaOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" /> Nova Agenda
            </Button>
          )}
        </div>
      </div>

      {/* Calendários Multiplos */}
      {loading ? (
        <div className="flex justify-center py-20 text-muted">Carregando agendas...</div>
      ) : agendas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted border border-dashed border-border-card rounded-xl">
          <CalIcon className="h-10 w-10 mb-4 opacity-50" />
          <p>Nenhuma agenda ativa encontrada.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {agendas.map(agenda => {
            // Filter events for this agenda
            const evts = agendamentos
              .filter(a => a.agenda_id === agenda.id)
              .map(a => ({
                id: a.id,
                title: a.nome_lead || a.leads_estetica?.nome_lead || 'Ocupado',
                start: a.data_hora_inicio,
                end: a.data_hora_fim,
                color: agenda.cor || 'var(--primary)',
                extendedProps: { ...a }
              }))

            // Format business hours
            const hw = agendaHours.filter(h => h.agenda_id === agenda.id && h.aberto)
            const mapDay: Record<string, number> = { 'domingo': 0, 'segunda': 1, 'terca': 2, 'quarta': 3, 'quinta': 4, 'sexta': 5, 'sabado': 6 }
            const bHours = hw.map(h => ({
              daysOfWeek: [mapDay[h.dia]],
              startTime: h.hora_inicio,
              endTime: h.hora_fim
            }))

            return (
              <div key={agenda.id} className="bg-card rounded-xl border border-border-card shadow-sm overflow-hidden flex flex-col">
                <div 
                  className="px-6 py-3 border-b flex justify-between items-center"
                  style={{ borderBottomColor: agenda.cor || 'var(--border-card)', borderBottomWidth: '3px' }}
                >
                  <h3 className="font-serif text-lg font-bold text-main flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: agenda.cor }} />
                    {agenda.nome}
                  </h3>
                  {role === 'admin' && (
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" className="h-8 px-2"><Edit2 className="w-4 h-4 text-muted"/></Button>
                      <Button variant="danger" size="sm" className="h-8 px-2"><Trash2 className="w-4 h-4"/></Button>
                    </div>
                  )}
                </div>
                <div className="p-4 agenda-fc-wrapper" style={{ minHeight: '400px' }}>
                  <FullCalendar
                    ref={(el) => { if (el) calendarRefs.current[agenda.id] = el.getApi() }}
                    plugins={[timeGridPlugin, interactionPlugin]}
                    initialView="timeGridWeek"
                    locale={ptBrLocale}
                    headerToolbar={false}
                    slotMinTime="06:00:00"
                    slotMaxTime="22:00:00"
                    slotDuration="00:30:00"
                    allDaySlot={false}
                    height="auto"
                    events={evts}
                    dateClick={(info) => handleSlotClick(info, agenda.id)}
                    eventClick={handleEventClick}
                    businessHours={bHours.length > 0 ? bHours : undefined}
                    nowIndicator={true}
                    eventClassNames="cursor-pointer rounded-md shadow-sm border-none overflow-hidden"
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modais omitidos inicialmente para economizar espaço do arquivo, mas já declarados no estado */}
      
      {/* Modal Novo Agendamento */}
      <NovaAgendamentoModal 
        isOpen={isNovoAgendamentoOpen} 
        onClose={() => setIsNovoAgendamentoOpen(false)} 
        slotInfo={selectedSlot}
        agendas={agendas}
        onSuccess={fetchData}
      />

      {/* Modal Ver Agendamento */}
      <VerAgendamentoModal 
        isOpen={isVerAgendamentoOpen} 
        onClose={() => setIsVerAgendamentoOpen(false)} 
        event={selectedEvent}
        onSuccess={fetchData}
      />
    </div>
  )
}

function NovaAgendamentoModal({ isOpen, onClose, slotInfo, agendas, onSuccess }: any) {
  const [loading, setLoading] = useState(false)
  const [nome, setNome] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [procedimento, setProcedimento] = useState('')
  const [obs, setObs] = useState('')

  const handleSave = async (e: any) => {
    e.preventDefault()
    setLoading(true)
    try {
      const inicio = slotInfo.date
      const fim = addHours(inicio, 1)

      // Se houver nome/wpp criamos um Lead rápido e vinculamos
      let leadId = null
      if (nome || whatsapp) {
        const { data: ld, error: leadErr } = await supabase.from('leads_estetica').insert({
          nome_lead: nome,
          whatsapp_lead: whatsapp,
          status: 'agendado',
          procedimento_interesse: procedimento
        }).select('id').single()
        if (ld) leadId = ld.id
      }

      const { error } = await supabase.from('agendamentos_estetica').insert({
        agenda_id: slotInfo.agendaId,
        lead_id: leadId,
        data_hora_inicio: inicio.toISOString(),
        data_hora_fim: fim.toISOString(),
        status: 'agendado',
        procedimento_nome: procedimento,
        observacoes: obs
      })

      if (error) throw error
      toast.success('Agendamento criado!')
      onSuccess()
      onClose()
    } catch (error: any) {
      toast.error('Erro ao agendar: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (!slotInfo) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Novo Agendamento">
      <form onSubmit={handleSave} className="space-y-4 pt-2">
        <div className="bg-primary-light/30 p-3 rounded-lg flex items-center gap-2 text-sm font-medium text-main mb-4 border border-border-card">
          <CalIcon className="w-4 h-4 text-primary" />
          {format(slotInfo.date, "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted mb-1 block">Nome do Cliente/Lead</label>
            <Input required value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Maria" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted mb-1 block">WhatsApp</label>
            <Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="Ex: 11999999999" />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted mb-1 block">Procedimento</label>
          <Input required value={procedimento} onChange={e => setProcedimento(e.target.value)} placeholder="Ex: Botox" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted mb-1 block">Observações</label>
          <textarea 
            className="w-full rounded-lg border border-border-card bg-card px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary h-20 resize-none"
            value={obs} onChange={e => setObs(e.target.value)}
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar Agendamento'}
        </Button>
      </form>
    </Modal>
  )
}

function VerAgendamentoModal({ isOpen, onClose, event, onSuccess }: any) {
  const [loading, setLoading] = useState(false)
  
  if (!event) return null

  const clientName = event.nome_lead || event.leads_estetica?.nome_lead || 'Cliente Desconhecido'
  const isLead = !!event.leads_estetica && !event.clientes_estetica

  const handleStatusChange = async (newStatus: string) => {
    // If 'compareceu' and is Lead, trigger handles client promotion on backend natively
    // We just ask for confirmation in frontend
    if (newStatus === 'compareceu' && isLead) {
      if (!confirm('Este lead será promovido a Cliente. Confirmar comparecimento?')) return
    } else if (newStatus === 'cancelado') {
      if (!confirm('Deseja realmente cancelar este agendamento?')) return
    }

    setLoading(true)
    try {
      await supabase.from('agendamentos_estetica').update({ status: newStatus }).eq('id', event.id)
      
      if (isLead && newStatus === 'compareceu') {
        // Optimistic UI updates / Trigger logic sync might require a reload to reflect new Client
      }
      toast.success('Status atualizado!')
      onSuccess()
      onClose()
    } catch (e) {
      toast.error('Erro ao atualizar status')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalhes do Agendamento">
      <div className="space-y-4">
        <div className="bg-primary-light/20 p-4 rounded-xl border border-border-card">
          <h3 className="font-serif text-xl font-bold mb-1">{clientName}</h3>
          <p className="text-sm text-muted">{event.procedimento_nome || 'Sem procedimento especificado'}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="block text-xs text-muted font-medium mb-1">Data e Hora</span>
            {format(new Date(event.data_hora_inicio), "dd/MM/yyyy HH:mm")}
          </div>
          <div>
            <span className="block text-xs text-muted font-medium mb-1">Status Atual</span>
            <Badge variant={event.status as any}>{event.status}</Badge>
          </div>
        </div>

        {event.observacoes && (
          <div>
            <span className="block text-xs text-muted font-medium mb-1">Observações</span>
            <p className="text-sm bg-card border border-border-card p-3 rounded-lg">{event.observacoes}</p>
          </div>
        )}

        <div className="pt-4 border-t border-border-card space-y-2">
          <label className="text-xs font-medium text-muted block">Alterar Status</label>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {['agendado', 'confirmado', 'compareceu', 'faltou'].map(s => (
              <Button 
                key={s} 
                variant={event.status === s ? 'primary' : 'secondary'} 
                size="sm" 
                onClick={() => handleStatusChange(s)}
                disabled={loading || event.status === s}
                className="capitalize text-xs h-8"
              >
                {s}
              </Button>
            ))}
          </div>
          <Button 
            variant="danger" 
            className="w-full mt-4" 
            onClick={() => handleStatusChange('cancelado')}
            disabled={loading}
          >
            Cancelar Agendamento
          </Button>
        </div>
      </div>
    </Modal>
  )
}

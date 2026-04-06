import { useState, useEffect, useRef } from 'react'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import ptBrLocale from '@fullcalendar/core/locales/pt-br'
import { addWeeks, subWeeks, format, startOfWeek, endOfWeek, addHours, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Plus, ChevronLeft, ChevronRight, Edit2, Trash2, Calendar as CalIcon, Clock, Copy, Check, RefreshCcw } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { useAuth } from '../contexts/AuthContext'

export function Agenda() {
  const { user, role, loading: authLoading } = useAuth()
  const isAdmin = role === 'admin' || user?.email === 'breneralves@hotmail.com'
  
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
  const [showRetry, setShowRetry] = useState(false)
  
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
          console.warn('⚠️ PROD: Timeout na busca de dados da agenda via Edge Function')
          setShowRetry(true)
          return false
        }
        return prev
      })
    }, 10000) // 10s para funções, que podem ser mais lentas no cold start

    try {
      setShowRetry(false)
      setLoading(true)
      console.log('--- AGENDA FETCH (PONTE) INICIO ---')
      
      const { data, error } = await supabase.functions.invoke('get-agenda-data')
      
      if (error) {
        console.error('Erro ao invocar get-agenda-data:', error)
        throw error
      }

      console.log('--- AGENDA FETCH SUCESSO ---')
      if (data.agendas) setAgendas(data.agendas)
      if (data.hours) setAgendaHours(data.hours)
      if (data.agendamentos) setAgendamentos(data.agendamentos)
      
    } catch (error: any) {
      console.error('❌ Erro na busca de dados via ponte:', error.message || error)
      toast.error('Erro ao carregar dados da agenda')
      setShowRetry(true)
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
          {isAdmin && (
            <Button onClick={() => setIsNovaAgendaOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" /> Nova Agenda
            </Button>
          )}
        </div>
      </div>

      {/* Calendários Multiplos */}
      {loading || authLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="text-muted animate-pulse">Carregando agendas...</div>
          {showRetry && (
            <Button variant="secondary" onClick={fetchData} className="gap-2">
              <RefreshCcw className="h-4 w-4" /> Tentar Novamente
            </Button>
          )}
        </div>
      ) : agendas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted border border-dashed border-border-card rounded-xl">
          <CalIcon className="h-10 w-10 mb-4 opacity-50" />
          <p className="mb-4">Nenhuma agenda ativa encontrada.</p>
          {isAdmin && (
            <Button onClick={() => setIsNovaAgendaOpen(true)}>
              Criar Primeira Agenda
            </Button>
          )}
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
              <div key={agenda.id} className="bg-[#FFFFFC] rounded-xl border border-border-card shadow-sm overflow-hidden flex flex-col">
                <div className="px-6 py-4 flex justify-between items-center bg-white/50 backdrop-blur-sm">
                  <div className="flex flex-col gap-1">
                    <h3 className="font-serif text-xl font-bold text-main flex items-center gap-3">
                      <div className="w-4 h-8 rounded-sm" style={{ backgroundColor: agenda.cor }} />
                      {agenda.nome}
                    </h3>
                    <div className="flex items-center gap-2 bg-muted/30 px-2 py-0.5 rounded border border-border-card w-fit group">
                      <span className="text-[10px] font-mono text-muted select-all">ID: {agenda.id}</span>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(agenda.id)
                          toast.success('ID copiado!')
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Copy className="h-3 w-3 text-muted" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <div className="flex gap-2">
                        <Button variant="secondary" size="sm" className="h-9 px-3 bg-white hover:bg-muted"><Edit2 className="w-4 h-4 text-muted mr-2"/> Editar</Button>
                        <Button variant="danger" size="sm" className="h-9 px-3"><Trash2 className="w-4 h-4"/></Button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-4 agenda-fc-wrapper" style={{ minHeight: '500px' }}>
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

      {/* Modal Nova Agenda */}
      <NovaAgendaModal 
        isOpen={isNovaAgendaOpen} 
        onClose={() => setIsNovaAgendaOpen(false)} 
        onSuccess={() => { fetchData(); setIsNovaAgendaOpen(false); }}
      />

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

function NovaAgendaModal({ isOpen, onClose, onSuccess }: any) {
  const [loading, setLoading] = useState(false)
  const [nome, setNome] = useState('')
  const [cor, setCor] = useState('#6366f1')
  
  const [horarios, setHorarios] = useState<any>({
    segunda: { aberto: true, inicio: '08:00', fim: '18:00' },
    terca: { aberto: true, inicio: '08:00', fim: '18:00' },
    quarta: { aberto: true, inicio: '08:00', fim: '18:00' },
    quinta: { aberto: true, inicio: '08:00', fim: '18:00' },
    sexta: { aberto: true, inicio: '08:00', fim: '18:00' },
    sabado: { aberto: false, inicio: '08:00', fim: '12:00' },
    domingo: { aberto: false, inicio: '08:00', fim: '12:00' }
  })

  const dias = [
    { key: 'segunda', label: 'Segunda' },
    { key: 'terca', label: 'Terca' },
    { key: 'quarta', label: 'Quarta' },
    { key: 'quinta', label: 'Quinta' },
    { key: 'sexta', label: 'Sexta' },
    { key: 'sabado', label: 'Sabado' },
    { key: 'domingo', label: 'Domingo' }
  ]

  const handleSave = async (e: any) => {
    e.preventDefault()
    if (!nome) return toast.error('Digite o nome da agenda')
    
    setLoading(true)
    try {
      // 1. Criar Agenda
      const { data: agenda, error: agendaErr } = await supabase
        .from('agendas')
        .insert({ nome, cor, ativo: true })
        .select()
        .single()

      if (agendaErr) throw agendaErr

      // 2. Atualizar Horários (usando UPSERT para evitar conflito com a automação do banco)
      const hoursToInsert = dias.map(d => ({
        agenda_id: agenda.id,
        dia: d.key,
        aberto: horarios[d.key].aberto,
        hora_inicio: horarios[d.key].inicio,
        hora_fim: horarios[d.key].fim
      }))

      // Tentativa de UPSERT baseada no conflito (agenda_id, dia)
      const { error: hoursErr } = await supabase
        .from('agenda_hours')
        .upsert(hoursToInsert, { onConflict: 'agenda_id,dia' })
      
      if (hoursErr) throw hoursErr

      toast.success('Agenda criada com sucesso!')
      onSuccess()
    } catch (error: any) {
      console.error('Erro ao criar agenda:', error)
      const errorMsg = error.message || error.details || 'Verifique sua conexão ou permissões no banco.'
      toast.error('Erro ao criar agenda: ' + errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const toggleDia = (dia: string) => {
    setHorarios((prev: any) => ({
      ...prev,
      [dia]: { ...prev[dia], aberto: !prev[dia].aberto }
    }))
  }

  const updateHora = (dia: string, field: string, value: string) => {
    setHorarios((prev: any) => ({
      ...prev,
      [dia]: { ...prev[dia], [field]: value }
    }))
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Criar Nova Agenda">
      <form onSubmit={handleSave} className="space-y-6 pt-2 max-h-[80vh] overflow-y-auto px-1 pr-3 scrollbar-thin scrollbar-thumb-primary/20">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-main mb-1.5 block">Nome da Agenda (Ex: Dra. Ana ou Sala 2)</label>
            <Input 
              required 
              value={nome} 
              onChange={e => setNome(e.target.value)} 
              placeholder="Digite o nome..." 
              className="bg-[#FDFCFB]"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-main mb-1.5 block">Cor da Agenda</label>
            <div className="flex flex-wrap gap-3 p-3 bg-[#FDFCFB] border border-border-card rounded-lg">
              {['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#C47E7E'].map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCor(c)}
                  className={`w-10 h-10 rounded-lg transition-all transform hover:scale-110 flex items-center justify-center ${cor === c ? 'ring-2 ring-primary ring-offset-2 scale-105' : 'hover:opacity-80'}`}
                  style={{ backgroundColor: c }}
                >
                  {cor === c && <Check className="w-5 h-5 text-white" />}
                </button>
              ))}
              <input 
                type="color" 
                value={cor} 
                onChange={e => setCor(e.target.value)}
                className="w-10 h-10 rounded-lg border-none cursor-pointer bg-white"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-border-card">
          <h4 className="text-sm font-bold text-main uppercase tracking-wider font-serif">CONFIGURAÇÃO DE FUNCIONAMENTO</h4>
          
          <div className="space-y-2">
            {dias.map(d => (
              <div 
                key={d.key} 
                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${horarios[d.key].aberto ? 'bg-white border-primary/20 shadow-sm' : 'bg-muted/10 border-border-card grayscale'}`}
              >
                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox"
                    checked={horarios[d.key].aberto}
                    onChange={() => toggleDia(d.key)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                  />
                  <span className={`font-medium ${horarios[d.key].aberto ? 'text-primary' : 'text-muted'}`}>{d.label}</span>
                </div>

                {horarios[d.key].aberto && (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold text-muted tracking-tighter">Inicio</span>
                      <div className="relative">
                        <input 
                          type="time" 
                          value={horarios[d.key].inicio}
                          onChange={(e) => updateHora(d.key, 'inicio', e.target.value)}
                          className="bg-muted/20 border border-border-card px-2 py-1 rounded-md text-xs focus:ring-1 focus:ring-primary outline-none"
                        />
                        <Clock className="w-3 h-3 text-muted absolute right-2 top-2 pointer-events-none opacity-40" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold text-muted tracking-tighter">Fim</span>
                      <div className="relative">
                        <input 
                          type="time" 
                          value={horarios[d.key].fim}
                          onChange={(e) => updateHora(d.key, 'fim', e.target.value)}
                          className="bg-muted/20 border border-border-card px-2 py-1 rounded-md text-xs focus:ring-1 focus:ring-primary outline-none"
                        />
                        <Clock className="w-3 h-3 text-muted absolute right-2 top-2 pointer-events-none opacity-40" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="pt-6 border-t border-border-card sticky bottom-0 bg-white pb-2">
          <Button type="submit" className="w-full h-12 text-lg font-serif" disabled={loading}>
            {loading ? 'Salvando...' : 'Criar Nova Agenda'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function NovaAgendamentoModal({ isOpen, onClose, slotInfo, agendas, onSuccess }: any) {
  const [loading, setLoading] = useState(false)
  const [nome, setNome] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [procedimento, setProcedimento] = useState('')
  const [obs, setObs] = useState('')
  const [duracaoMinutos, setDuracaoMinutos] = useState(60) // Padrão: 60 minutos

  const handleSave = async (e: any) => {
    e.preventDefault()
    setLoading(true)
    try {
      const inicio = slotInfo.date

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

      // ✅ CORREÇÃO 2: Remover data_hora_fim - o banco calcula automaticamente
      const { error } = await supabase.from('agendamentos_estetica').insert({
        agenda_id: slotInfo.agendaId,
        lead_id: leadId,
        data_hora_inicio: inicio.toISOString(),
        duracao_minutos: duracaoMinutos, // O banco calcula data_hora_fim com base nisso
        status: 'agendado',
        procedimento_nome: procedimento,
        observacoes: obs
      })

      if (error) throw error
      toast.success('Agendamento criado!')
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Erro ao criar agendamento:', error)
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
          <label className="text-xs font-medium text-muted mb-1 block">Duração (minutos)</label>
          <Input 
            type="number" 
            min="15" 
            step="15"
            required 
            value={duracaoMinutos} 
            onChange={e => setDuracaoMinutos(parseInt(e.target.value))} 
            placeholder="Ex: 60" 
          />
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

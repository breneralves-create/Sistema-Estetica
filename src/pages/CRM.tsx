import { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { Plus, Clock, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { LeadDrawer } from '../components/LeadDrawer'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const COLUNAS = [
  { id: 'iniciou_atendimento', label: 'Iniciou o Atendimento', color: 'bg-primary/20', variant: 'agendado' },
  { id: 'conversando', label: 'Conversando', color: 'bg-blue-100 dark:bg-blue-900/30', variant: 'follow_up' },
  { id: 'agendado', label: 'Agendado', color: 'bg-success/20', variant: 'confirmado' },
  { id: 'compareceu', label: 'Compareceu', color: 'bg-success/40', variant: 'compareceu' },
  { id: 'cancelou_agendamento', label: 'Cancelou o Agendamento', color: 'bg-warning/20', variant: 'cancelou_agendamento' },
  { id: 'follow_up', label: 'Follow Up', color: 'bg-orange-100 dark:bg-orange-900/30', variant: 'follow_up' },
  { id: 'abandonou_conversa', label: 'Abandonou a Conversa', color: 'bg-zinc-200 dark:bg-zinc-800', variant: 'abandonou_conversa' },
]

export function CRM() {
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [isNovoLeadOpen, setIsNovoLeadOpen] = useState(false)
  const [newWhatsapp, setNewWhatsapp] = useState('')
  const [newNome, setNewNome] = useState('')
  const [newProc, setNewProc] = useState('')
  const [newMotivo, setNewMotivo] = useState('')

  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; lead: any; prevStatus: string } | null>(null)

  const [selectedLead, setSelectedLead] = useState<any>(null)
  
  useEffect(() => {
    fetchLeads()
  }, [])

  const fetchLeads = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from('leads_estetica').select('*').order('ultima_mensagem', { ascending: false, nullsFirst: false })
      if (!error && data) setLeads(data)
    } catch (error) {
      console.error('Error fetching leads:', error)
      toast.error('Erro ao carregar leads')
    } finally {
      setLoading(false)
    }
  }

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return

    const { source, destination, draggableId } = result
    if (source.droppableId === destination.droppableId) return

    const leadId = draggableId
    const newStatus = destination.droppableId
    const prevStatus = source.droppableId

    const leadToMove = leads.find(l => l.id === leadId)
    if (!leadToMove) return

    if (newStatus === 'compareceu') {
      setConfirmModal({ isOpen: true, lead: leadToMove, prevStatus })
      return
    }

    await performStatusUpdate(leadToMove, newStatus, prevStatus)
  }

  const performStatusUpdate = async (lead: any, newStatus: string, prevStatus: string) => {
    // Optimistic UI
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: newStatus } : l))

    const { error } = await supabase.from('leads_estetica').update({ status: newStatus }).eq('id', lead.id)
    
    if (error) {
      toast.error('Erro ao mover card')
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: prevStatus } : l))
    }
  }

  const handleConfirmCompareceu = async () => {
    if (!confirmModal) return
    const { lead, prevStatus } = confirmModal
    setConfirmModal(null)
    
    await performStatusUpdate(lead, 'compareceu', prevStatus)
    toast.success('Lead promovido a Cliente!')
  }

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newWhatsapp) return

    const { data, error } = await supabase.from('leads_estetica').insert({
      whatsapp_lead: newWhatsapp,
      nome_lead: newNome || null,
      procedimento_interesse: newProc || null,
      motivo_contato: newMotivo || null,
      status: 'iniciou_atendimento',
      inicio_atendimento: new Date().toISOString()
    }).select().single()

    if (error) {
      toast.error('Erro ao criar lead')
    } else if (data) {
      toast.success('Lead criado')
      setLeads(prev => [data, ...prev])
      setIsNovoLeadOpen(false)
      // reset
      setNewWhatsapp('')
      setNewNome('')
      setNewProc('')
      setNewMotivo('')
    }
  }

  const getLeadsByStatus = (status: string) => leads.filter(l => l.status === status)

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h2 className="text-2xl font-serif font-bold text-main">CRM — Funil de Atendimento</h2>
          <p className="text-sm text-muted">Acompanhe e mova seus leads pelo funil</p>
        </div>
        <Button onClick={() => setIsNovoLeadOpen(true)} size="sm">
          <Plus className="w-4 h-4 mr-2" /> Novo Lead
        </Button>
      </div>

      <div className="flex-1 overflow-x-auto pb-4">
        {loading ? (
          <div className="flex items-center justify-center h-full text-muted">Carregando CRM...</div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex h-full gap-4 min-w-max items-start">
              {COLUNAS.map(coluna => {
                const columnLeads = getLeadsByStatus(coluna.id)
                return (
                  <div key={coluna.id} className="w-[300px] shrink-0 flex flex-col h-full bg-base/50 rounded-xl border border-border-card">
                    <div className={`p-3 rounded-t-xl border-b border-border-card flex items-center justify-between ${coluna.color}`}>
                      <h3 className="font-semibold text-sm text-main">{coluna.label}</h3>
                      <span className="bg-white/50 text-main text-xs font-bold px-2 py-0.5 rounded-full">{columnLeads.length}</span>
                    </div>

                    <Droppable droppableId={coluna.id}>
                      {(provided, snapshot) => (
                        <div 
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`flex-1 p-2 overflow-y-auto space-y-2 transition-colors ${snapshot.isDraggingOver ? 'bg-primary-light/40' : ''}`}
                        >
                          {columnLeads.map((lead, index) => (
                            <Draggable key={lead.id} draggableId={lead.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  onClick={() => setSelectedLead(lead)}
                                  className={`bg-card p-4 rounded-lg border border-border-card shadow-sm cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors ${
                                    snapshot.isDragging ? 'rotate-2 scale-105 shadow-xl opacity-90' : ''
                                  }`}
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-semibold text-sm text-main leading-tight max-w-[80%] break-words">
                                      {lead.nome_lead || 'Lead sem nome'}
                                    </h4>
                                  </div>
                                  <p className="text-xs text-muted mb-2 font-mono bg-base px-2 py-1 rounded inline-block">{lead.whatsapp_lead}</p>
                                  
                                  {lead.procedimento_interesse && (
                                    <p className="text-xs text-main mb-3 line-clamp-1">{lead.procedimento_interesse}</p>
                                  )}
                                  
                                  <div className="flex items-center justify-between mt-auto pt-2 border-t border-border-card text-xs text-muted">
                                    <Badge variant={coluna.variant as any} className="text-[10px] px-1.5 py-0 h-4">{coluna.id.replace('_', ' ')}</Badge>
                                    <span className="flex items-center" title="Tempo desde a última mensagem">
                                      <Clock className="w-3 h-3 mr-1" />
                                      {lead.minutos_ultima_mensagem ? `${lead.minutos_ultima_mensagem}m` : '-'}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                )
              })}
            </div>
          </DragDropContext>
        )}
      </div>

      <LeadDrawer 
        isOpen={selectedLead !== null} 
        onClose={() => setSelectedLead(null)} 
        lead={selectedLead} 
      />

      <Modal isOpen={isNovoLeadOpen} onClose={() => setIsNovoLeadOpen(false)} title="Criar Novo Lead Manualmente">
        <form onSubmit={handleCreateLead} className="space-y-4">
          <div>
            <label className="text-sm font-medium">WhatsApp <span className="text-error">*</span></label>
            <Input required value={newWhatsapp} onChange={e => setNewWhatsapp(e.target.value)} placeholder="5511999999999" />
          </div>
          <div>
            <label className="text-sm font-medium">Nome</label>
            <Input value={newNome} onChange={e => setNewNome(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Procedimento de Interesse</label>
            <Input value={newProc} onChange={e => setNewProc(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Motivo do Contato</label>
            <Input value={newMotivo} onChange={e => setNewMotivo(e.target.value)} />
          </div>
          <Button type="submit" className="w-full">Adicionar Lead</Button>
        </form>
      </Modal>

      <Modal isOpen={confirmModal !== null} onClose={() => setConfirmModal(null)} title="Confirmar Comparecimento">
        <div className="space-y-4">
          <p className="text-sm text-main">
            Confirmar que <strong>{confirmModal?.lead?.nome_lead || confirmModal?.lead?.whatsapp_lead}</strong> compareceu à clínica? 
            <br/><br/>
            Este lead será promovido permanentemente para <strong>Cliente</strong> pela base de dados.
          </p>
          <div className="flex justify-end space-x-2">
            <Button variant="secondary" onClick={() => setConfirmModal(null)}>Cancelar</Button>
            <Button onClick={handleConfirmCompareceu}>Confirmar Comparecimento</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

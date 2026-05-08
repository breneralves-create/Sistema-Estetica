import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Edit2, Save, Calendar as CalIcon, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { Button } from './ui/Button'
import { Modal } from './ui/Modal'
import { Input } from './ui/Input'
import { Badge } from './ui/Badge'

interface VerAgendamentoModalProps {
  isOpen: boolean
  onClose: () => void
  event: any
  onSuccess: () => void
}

export function VerAgendamentoModal({ isOpen, onClose, event, onSuccess }: VerAgendamentoModalProps) {
  const [loading, setLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  
  const [nome, setNome] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [procedimento, setProcedimento] = useState('')

  useEffect(() => {
    if (event && isOpen) {
      setNome(event.nome_lead || event.leads_estetica?.nome_lead || '')
      setWhatsapp(event.whatsapp_lead || event.leads_estetica?.whatsapp_lead || '')
      setProcedimento(event.procedimento_nome || '')
    }
  }, [event, isOpen])

  if (!event) return null

  const clientName = event.nome_lead || event.leads_estetica?.nome_lead || 'Cliente Desconhecido'
  const isLead = !!event.leads_estetica && !event.clientes_estetica

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === 'compareceu' && isLead) {
      if (!confirm('Este lead será promovido a Cliente. Confirmar comparecimento?')) return
    } else if (newStatus === 'cancelado') {
      if (!confirm('Deseja realmente cancelar este agendamento?')) return
    }

    setLoading(true)
    try {
      // 1. Atualiza o agendamento
      await supabase.from('agendamentos_estetica').update({ status: newStatus }).eq('id', event.id)
      
      // 2. Sincroniza com o Lead se existir
      if (event.lead_id) {
        let leadStatus = newStatus
        // Mapeamento para garantir que caia na coluna certa do CRM
        if (newStatus === 'cancelado') leadStatus = 'cancelou_agendamento'
        if (newStatus === 'confirmado') leadStatus = 'agendado'
        if (newStatus === 'faltou') leadStatus = 'follow_up' // Opcional: move para follow up se faltar
        
        await supabase.from('leads_estetica').update({ status: leadStatus }).eq('id', event.lead_id)
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

  const handleSaveInfo = async () => {
    setLoading(true)
    try {
      // 1. Atualiza no agendamento
      await supabase.from('agendamentos_estetica').update({ 
        nome_lead: nome, 
        whatsapp_lead: whatsapp,
        procedimento_nome: procedimento
      }).eq('id', event.id)

      // 2. Atualiza no Lead para persistência global
      if (event.lead_id) {
        await supabase.from('leads_estetica').update({ 
          nome_lead: nome, 
          whatsapp_lead: whatsapp,
          procedimento_interesse: procedimento
        }).eq('id', event.lead_id)
      }

      toast.success('Dados atualizados!')
      setIsEditing(false)
      onSuccess()
    } catch (e) {
      toast.error('Erro ao salvar dados')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalhes do Agendamento">
      <div className="space-y-4">
        {/* Card de Informações Principais */}
        <div className="bg-primary/5 p-5 rounded-2xl border border-primary/10 relative">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-primary uppercase ml-1">Nome do Paciente</label>
                    <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome" className="bg-white" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-primary uppercase ml-1">WhatsApp</label>
                    <Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="WhatsApp" className="bg-white" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-primary uppercase ml-1">Procedimento</label>
                    <Input value={procedimento} onChange={e => setProcedimento(e.target.value)} placeholder="Procedimento" className="bg-white" />
                  </div>
                </div>
              ) : (
                <>
                  <h3 className="font-serif text-2xl font-bold text-main mb-1">{clientName}</h3>
                  <p className="text-sm text-primary font-semibold">{whatsapp}</p>
                  <p className="text-xs text-muted mt-1 uppercase tracking-wider">{procedimento || 'Sem procedimento'}</p>
                </>
              )}
            </div>
            
            <div className="ml-4">
              {!isEditing ? (
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={() => setIsEditing(true)}
                  className="bg-primary/10 hover:bg-primary/20 text-primary border-primary/20"
                >
                  <Edit2 className="w-4 h-4 mr-2" /> Editar Dados
                </Button>
              ) : (
                <div className="flex flex-col gap-2">
                  <Button size="sm" onClick={handleSaveInfo} disabled={loading} className="w-full">
                    <Save className="w-4 h-4 mr-2" /> {loading ? '...' : 'Salvar'}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setIsEditing(false)} className="w-full">
                    Cancelar
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Detalhes de Data e Status */}
        <div className="grid grid-cols-2 gap-4 text-sm bg-muted/5 p-4 rounded-xl border border-border-card">
          <div>
            <span className="block text-[10px] text-muted font-bold uppercase mb-1">Data e Hora</span>
            <div className="flex items-center gap-2 text-main">
              <CalIcon className="w-4 h-4 text-primary/60" />
              {format(new Date(event.data_hora_inicio), "dd/MM/yyyy HH:mm")}
            </div>
          </div>
          <div>
            <span className="block text-[10px] text-muted font-bold uppercase mb-1">Status Atual</span>
            <Badge variant={event.status as any}>{event.status?.toUpperCase()}</Badge>
          </div>
        </div>

        {event.observacoes && (
          <div className="bg-muted/5 p-3 rounded-xl border border-border-card">
            <span className="block text-[10px] text-muted font-bold uppercase mb-1">Observações</span>
            <p className="text-sm text-main italic">"{event.observacoes}"</p>
          </div>
        )}

        {/* Ações de Status */}
        <div className="pt-4 border-t border-border-card space-y-3">
          <label className="text-[10px] font-bold text-muted uppercase block text-center">Alterar para:</label>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {['agendado', 'confirmado', 'compareceu', 'faltou'].map(s => (
              <Button
                key={s}
                variant={event.status === s ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => handleStatusChange(s)}
                disabled={loading || event.status === s}
                className="capitalize text-xs h-9"
              >
                {s}
              </Button>
            ))}
          </div>
          <Button
            variant="danger"
            className="w-full h-10 mt-2"
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

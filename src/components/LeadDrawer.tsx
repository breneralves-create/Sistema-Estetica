import { useState, useEffect } from 'react'
import { X, Calendar as CalIcon, MessageSquare, Clock, Edit2, Save, Trash2 } from 'lucide-react'
import { formatDistanceToNow, format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useNavigate } from 'react-router-dom'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { cn } from '../lib/utils'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export function LeadDrawer({ lead, isOpen, onClose, onUpdated }: any) {
  const navigate = useNavigate()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const [editNome, setEditNome] = useState('')
  const [editWhatsapp, setEditWhatsapp] = useState('')
  const [editProcedimento, setEditProcedimento] = useState('')
  const [editMotivo, setEditMotivo] = useState('')
  const [editStatus, setEditStatus] = useState('')

  // Sync state when lead or drawer changes
  useEffect(() => {
    if (lead && isOpen) {
      setEditNome(lead.nome_lead || '')
      setEditWhatsapp(lead.whatsapp_lead || '')
      setEditProcedimento(lead.procedimento_interesse || '')
      setEditMotivo(lead.motivo_contato || '')
      setEditStatus(lead.status || 'iniciou_atendimento')
    }
  }, [lead, isOpen])

  const handleSave = async () => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('leads_estetica')
        .update({
          nome_lead: editNome,
          whatsapp_lead: editWhatsapp,
          procedimento_interesse: editProcedimento,
          motivo_contato: editMotivo,
          status: editStatus
        })
        .eq('id', lead.id)

      if (error) throw error
      toast.success('Lead atualizado!')
      setIsEditing(false)
      if (onUpdated) onUpdated()
    } catch (err: any) {
      toast.error('Erro ao atualizar: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Deseja realmente excluir o lead "${lead.nome_lead || lead.whatsapp_lead}"?\n\nEsta ação também removerá todos os agendamentos vinculados a este lead.`)) return

    setLoading(true)
    try {
      const leadId = lead.id

      const { error } = await supabase
        .from('leads_estetica')
        .delete()
        .eq('id', leadId)

      if (error) {
        console.error('Erro ao deletar lead:', error)
        throw error
      }

      toast.success('Lead excluído com sucesso!')
      onClose()
      if (onUpdated) onUpdated()
    } catch (err: any) {
      toast.error('Erro ao excluir lead: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmCompareceu = async () => {
    if (!confirm(`Confirmar comparecimento de "${lead.nome_lead || lead.whatsapp_lead}"?\n\nIsso irá convertê-lo em cliente.`)) return
    setLoading(true)
    try {
      // 1. Atualiza status do lead
      const { error: statusError } = await supabase
        .from('leads_estetica')
        .update({ status: 'compareceu' })
        .eq('id', lead.id)
      if (statusError) throw statusError

      // 2. Cria cliente (upsert para não duplicar)
      const { data: clienteData, error: clienteError } = await supabase
        .from('clientes_estetica')
        .upsert(
          { lead_id: lead.id, data_primeira_visita: new Date().toISOString().split('T')[0] },
          { onConflict: 'lead_id' }
        )
        .select('id')
        .single()

      if (clienteError) {
        toast.error('Status atualizado, mas erro ao criar cliente: ' + clienteError.message)
      } else {
        // 3. Vincula cliente_id ao agendamento se existir
        if (lead.id_agendamento && clienteData?.id) {
          await supabase
            .from('agendamentos_estetica')
            .update({ cliente_id: clienteData.id })
            .eq('id', lead.id_agendamento)
        }
        toast.success('Lead convertido em cliente!')
      }

      if (onUpdated) onUpdated()
      onClose()
    } catch (err: any) {
      toast.error('Erro ao confirmar comparecimento: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !lead) return null

  const renderRelativeTime = (isoString: string) => {
    if (!isoString) return '-'
    try {
      return formatDistanceToNow(parseISO(isoString), { locale: ptBR, addSuffix: true })
    } catch {
      return '-'
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity" onClick={onClose} />
      <div className={cn(
        "fixed right-0 top-0 h-full w-full sm:w-[500px] bg-base shadow-2xl z-50 transform transition-transform duration-300 flex flex-col border-l border-border-card overflow-y-auto"
      )}>
        <div className="flex items-center justify-between p-6 border-b border-border-card bg-card sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-serif font-bold text-main">
              {isEditing ? editNome : (lead.nome_lead || 'Lead sem nome')}
            </h2>
            <p className="text-sm text-muted">{isEditing ? editWhatsapp : lead.whatsapp_lead}</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-main p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1">
          <div className="flex items-center space-x-3">
            {isEditing ? (
              <Badge variant={editStatus as any}>{editStatus}</Badge>
            ) : (
              <Badge variant={lead.status as any}>{lead.status}</Badge>
            )}
            
            {!isEditing ? (
              <Button variant="secondary" size="sm" className="h-7 text-xs px-2" onClick={() => setIsEditing(true)}>
                <Edit2 className="w-3 h-3 mr-1"/>Editar
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="primary" size="sm" className="h-7 text-xs px-2" onClick={handleSave} disabled={loading}>
                  <Save className="w-3 h-3 mr-1"/> {loading ? '...' : 'Salvar'}
                </Button>
                <Button variant="secondary" size="sm" className="h-7 text-xs px-2" onClick={() => setIsEditing(false)} disabled={loading}>
                  Cancelar
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {isEditing ? (
              <>
                <div>
                  <label className="text-xs font-medium text-muted mb-1 block">Status do Lead</label>
                  <select 
                    value={editStatus} 
                    onChange={e => setEditStatus(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-border-card bg-base text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="iniciou_atendimento">Iniciou Atendimento</option>
                    <option value="conversando">Conversando</option>
                    <option value="agendado">Agendado</option>
                    <option value="compareceu">Compareceu</option>
                    <option value="cancelou_agendamento">Cancelou Agendamento</option>
                    <option value="follow_up">Follow Up</option>
                    <option value="abandonou_conversa">Abandonou a Conversa</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted mb-1 block">Nome Completo</label>
                  <Input value={editNome} onChange={e => setEditNome(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted mb-1 block">WhatsApp</label>
                  <Input value={editWhatsapp} onChange={e => setEditWhatsapp(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted mb-1 block">Procedimento de Interesse</label>
                  <Input value={editProcedimento} onChange={e => setEditProcedimento(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted mb-1 block">Motivo do Contato</label>
                  <Input value={editMotivo} onChange={e => setEditMotivo(e.target.value)} />
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-card p-3 rounded-lg border border-border-card">
                    <span className="block text-xs text-muted mb-1 flex items-center gap-1"><Clock className="w-3 h-3"/> Última msg</span>
                    <span className="font-medium text-main">{renderRelativeTime(lead.ultima_mensagem)}</span>
                  </div>
                  <div className="bg-card p-3 rounded-lg border border-border-card">
                    <span className="block text-xs text-muted mb-1 flex items-center gap-1"><CalIcon className="w-3 h-3"/> Entrou em</span>
                    <span className="font-medium text-main">
                      {lead.inicio_atendimento ? format(parseISO(lead.inicio_atendimento), 'dd/MM/yy HH:mm') : '-'}
                    </span>
                  </div>
                  <div className="bg-card p-3 rounded-lg border border-border-card col-span-2">
                    <span className="block text-xs text-muted mb-1 flex items-center gap-1">DOC.API (ID Único)</span>
                    <span className="font-mono text-[11px] text-primary/80 break-all">{lead.id}</span>
                  </div>
                  <div className="bg-card p-3 rounded-lg border border-border-card col-span-2">
                    <span className="block text-xs text-muted mb-1 flex items-center gap-1">ID do Agendamento</span>
                    {lead.id_agendamento ? (
                      <span className="font-mono text-[11px] text-main break-all">{lead.id_agendamento}</span>
                    ) : (
                      <span className="text-xs text-muted/60 italic">Nenhum agendamento ainda</span>
                    )}
                  </div>
                  {lead.data_agendamento && (
                    <div className="bg-card p-3 rounded-lg border border-border-card col-span-2">
                      <span className="block text-xs text-muted mb-1 flex items-center gap-1"><CalIcon className="w-3 h-3"/> Data do Agendamento</span>
                      <span className="font-medium text-main">
                        {format(parseISO(lead.data_agendamento), 'dd/MM/yyyy HH:mm')}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-main mb-2">Detalhes Operacionais</h4>
                  <div className="bg-card rounded-lg border border-border-card divide-y divide-border-card text-sm">
                    <div className="p-3 flex justify-between">
                      <span className="text-muted">Procedimento Agendado:</span>
                      <span className="font-medium text-main text-right">{lead.procedimento_interesse || '-'}</span>
                    </div>
                    <div className="p-3 flex justify-between">
                      <span className="text-muted">Procedimento Interesse:</span>
                      <span className="font-medium text-main text-right">{lead.procedimento_interesse || '-'}</span>
                    </div>
                    <div className="p-3 flex justify-between">
                      <span className="text-muted">Motivo Contato:</span>
                      <span className="font-medium text-main text-right">{lead.motivo_contato || '-'}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {lead.resumo_conversa && (
            <div>
              <h4 className="text-sm font-semibold text-main mb-2 flex items-center"><MessageSquare className="w-4 h-4 mr-1"/> Resumo da Conversa (IA)</h4>
              <p className="text-sm text-main bg-primary-light/30 p-4 rounded-lg border border-border-card italic">
                {lead.resumo_conversa}
              </p>
            </div>
          )}

          {/* Follow ups - only display if exist or simple text */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-main">Datas de Follow Up</h4>
            <div className="flex gap-2 text-xs">
              <span className="bg-card border border-border-card px-2 py-1 rounded">F1: {lead.horario_envio_f1 ? format(parseISO(lead.horario_envio_f1), 'dd/MM') : 'Pendente'}</span>
              <span className="bg-card border border-border-card px-2 py-1 rounded">F2: {lead.horario_envio_f2 ? format(parseISO(lead.horario_envio_f2), 'dd/MM') : 'Pendente'}</span>
              <span className="bg-card border border-border-card px-2 py-1 rounded">F3: {lead.horario_envio_f3 ? format(parseISO(lead.horario_envio_f3), 'dd/MM') : 'Pendente'}</span>
            </div>
          </div>

        </div>

        <div className="p-6 border-t border-border-card bg-card space-y-2">
          {lead.status !== 'compareceu' && (
            <Button
              variant="secondary"
              className="w-full text-green-600 border-green-500/30 hover:bg-green-500/10 hover:border-green-500/60"
              onClick={handleConfirmCompareceu}
              disabled={loading}
            >
              ✓ {loading ? 'Processando...' : 'Confirmar Comparecimento'}
            </Button>
          )}
          {lead.id_agendamento && (
            <Button className="w-full" onClick={() => {
              onClose()
              navigate('/agenda')
            }}>
              Ver Agendamento na Agenda
            </Button>
          )}
          <Button
            variant="secondary"
            className="w-full text-error border-error/30 hover:bg-error/10 hover:border-error/60"
            onClick={handleDelete}
            disabled={loading}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {loading ? 'Excluindo...' : 'Excluir Lead'}
          </Button>
        </div>
      </div>
    </>
  )
}

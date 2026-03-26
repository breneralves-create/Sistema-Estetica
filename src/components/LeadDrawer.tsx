import { X, Calendar as CalIcon, MessageSquare, Clock, Edit2 } from 'lucide-react'
import { formatDistanceToNow, format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useNavigate } from 'react-router-dom'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import { cn } from '../lib/utils'

export function LeadDrawer({ lead, isOpen, onClose, onUpdated }: any) {
  const navigate = useNavigate()

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
            <h2 className="text-xl font-serif font-bold text-main">{lead.nome_lead || 'Lead sem nome'}</h2>
            <p className="text-sm text-muted">{lead.whatsapp_lead}</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-main p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1">
          <div className="flex items-center space-x-3">
            <Badge variant={lead.status as any}>{lead.status}</Badge>
            <Button variant="secondary" size="sm" className="h-7 text-xs px-2"><Edit2 className="w-3 h-3 mr-1"/>Editar</Button>
          </div>

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
          </div>

          <div>
            <h4 className="text-sm font-semibold text-main mb-2">Detalhes Operacionais</h4>
            <div className="bg-card rounded-lg border border-border-card divide-y divide-border-card text-sm">
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

        {lead.id_agendamento && (
          <div className="p-6 border-t border-border-card bg-card">
            <Button className="w-full" onClick={() => {
              onClose()
              navigate('/agenda')
            }}>
              Ver Agendamento na Agenda
            </Button>
          </div>
        )}
      </div>
    </>
  )
}

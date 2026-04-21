import { useState, useEffect } from 'react'
import { format, parseISO, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, subWeeks, startOfMonth, startOfYear, endOfMonth, endOfYear } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { UserSearch, UserCheck, ChevronRight, X, Clock, Calendar as CalendarIcon, DollarSign, Activity, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { LeadDrawer } from '../components/LeadDrawer'
import { formatDistanceToNow } from 'date-fns'

type DateFilter = 'hoje' | 'ontem' | '7dias' | '14semanas' | 'mes' | 'ano' | 'custom'

export function LeadsClientes() {
  const [activeTab, setActiveTab] = useState<'leads' | 'clientes'>('leads')
  const [filter, setFilter] = useState<DateFilter>('hoje')
  const [dateRange, setDateRange] = useState({ start: new Date(), end: new Date() })
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  
  const [leads, setLeads] = useState<any[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  
  const [busca, setBusca] = useState('')

  const [selectedLead, setSelectedLead] = useState<any>(null)
  const [selectedCliente, setSelectedCliente] = useState<any>(null)

  const FILTROS: { id: DateFilter; label: string }[] = [
    { id: 'hoje', label: 'Hoje' },
    { id: 'ontem', label: 'Ontem' },
    { id: '7dias', label: '7 dias' },
    { id: '14semanas', label: '14 semanas' },
    { id: 'mes', label: 'Mês' },
    { id: 'ano', label: 'Ano' },
  ]

  useEffect(() => {
    applyFilter(filter)
  }, [filter])

  useEffect(() => {
    fetchData()
  }, [dateRange, activeTab, busca])

  const applyFilter = (f: DateFilter) => {
    const now = new Date()
    let start = new Date()
    let end = new Date()

    switch (f) {
      case 'hoje':
        start = new Date()
        start.setHours(0, 0, 0, 0)
        end = new Date()
        end.setHours(23, 59, 59, 999)
        break
      case 'ontem':
        const ontem = subDays(now, 1)
        start = startOfDay(ontem)
        end = endOfDay(ontem)
        break
      case '7dias':
        start = startOfDay(subDays(now, 6))
        end = endOfDay(now)
        break
      case '14semanas':
        start = startOfDay(subWeeks(now, 14))
        end = endOfDay(now)
        break
      case 'mes':
        start = startOfMonth(now)
        end = endOfMonth(now)
        break
      case 'ano':
        start = startOfYear(now)
        end = endOfYear(now)
        break
      case 'custom':
        if (customStart && customEnd) {
          start = startOfDay(new Date(customStart + 'T00:00:00'))
          end = endOfDay(new Date(customEnd + 'T23:59:59'))
        }
        break
    }
    setDateRange({ start, end })
  }

  const handleCustomDate = () => {
    if (customStart && customEnd) {
      setFilter('custom')
      applyFilter('custom')
    }
  }

  const fetchData = async () => {
    const timeoutId = setTimeout(() => {
      setLoading(false)
    }, 8000)

    try {
      setLoading(true)
      const { start, end } = dateRange
      const startIso = start.toISOString()
      const endIso = end.toISOString()

      if (activeTab === 'leads') {
        let q = supabase
          .from('leads_estetica')
          .select('*')
          .gte('inicio_atendimento', startIso)
          .lte('inicio_atendimento', endIso)
          .order('inicio_atendimento', { ascending: false })

        if (busca) {
          q = q.or(`nome_lead.ilike.%${busca}%,whatsapp_lead.ilike.%${busca}%`)
        }

        const { data } = await q
        if (data) {
          const { data: clientsObj } = await supabase.from('clientes_estetica').select('lead_id')
          const clientLeadIds = new Set(clientsObj?.map(c => c.lead_id) || [])
          setLeads(data.filter(l => !clientLeadIds.has(l.id)))
        }
      } else {
        let q = supabase
          .from('clientes_estetica')
          .select(`
            *,
            leads_estetica!inner(*)
          `)
          .gte('created_at', startIso)
          .lte('created_at', endIso)
          .order('created_at', { ascending: false })

        if (busca) {
          q = q.or(`leads_estetica.nome_lead.ilike.%${busca}%,leads_estetica.whatsapp_lead.ilike.%${busca}%`)
        }

        const { data } = await q
        if (data) {
          const clientIds = data.map(c => c.id)
          let procedureStats: Record<string, any> = {}
          if (clientIds.length > 0) {
            const { data: ags } = await supabase.from('agendamentos_estetica')
              .select('cliente_id, status, data_hora_inicio')
              .in('cliente_id', clientIds)
            
            if (ags) {
              ags.forEach(ag => {
                if (!procedureStats[ag.cliente_id]) procedureStats[ag.cliente_id] = { count: 0, next: null }
                if (ag.status === 'compareceu') procedureStats[ag.cliente_id].count++
                if (new Date(ag.data_hora_inicio) > new Date() && ag.status !== 'cancelado') {
                  if (!procedureStats[ag.cliente_id].next || new Date(ag.data_hora_inicio) < new Date(procedureStats[ag.cliente_id].next)) {
                    procedureStats[ag.cliente_id].next = ag.data_hora_inicio
                  }
                }
              })
            }
          }

          const enhanced = data.map(c => ({
            ...c,
            procedimentos_realizados: procedureStats[c.id]?.count || 0,
            proximo_agendamento: procedureStats[c.id]?.next || null
          }))
          setClientes(enhanced)
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Erro ao carregar dados')
    } finally {
      clearTimeout(timeoutId)
      setLoading(false)
    }
  }

  const handleDeleteLead = async (e: React.MouseEvent, lead: any) => {
    e.stopPropagation()
    if (!confirm(`Excluir o lead "${lead.nome_lead || lead.whatsapp_lead}"?\n\nTodos os agendamentos vinculados serão removidos automaticamente.`)) return

    setDeletingId(lead.id)
    try {
      const { error } = await supabase
        .from('leads_estetica')
        .delete()
        .eq('id', lead.id)

      if (error) {
        console.error('Erro ao deletar lead:', error)
        throw error
      }

      toast.success('Lead excluído!')
      setLeads(prev => prev.filter(l => l.id !== lead.id))
    } catch (err: any) {
      toast.error('Erro ao excluir: ' + err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const renderRelativeTime = (isoString?: string) => {
    if (!isoString) return '-'
    try {
      return formatDistanceToNow(parseISO(isoString), { locale: ptBR, addSuffix: true })
    } catch {
      return '-'
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row gap-4">
        <Card className="flex-1 bg-primary-light/50 border-primary/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-full text-primary">
              <UserSearch className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-main">Leads</h3>
              <p className="text-sm text-muted">Contatos que chegaram, mas ainda não compareceram em consulta.</p>
            </div>
          </CardContent>
        </Card>
        <Card className="flex-1 bg-success/10 border-success/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-success/20 rounded-full text-success">
              <UserCheck className="h-6 w-6 text-success" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-main">Clientes</h3>
              <p className="text-sm text-muted">Leads que já agendaram e compareceram na clínica pelo menos 1x.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border-card shadow-sm">
        <div className="flex flex-wrap gap-2">
          {FILTROS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                filter === f.id ? 'bg-primary text-white' : 'bg-transparent text-muted hover:bg-primary-light hover:text-primary'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="w-36 h-9 text-xs" max={format(new Date(), 'yyyy-MM-dd')} />
          <span className="text-muted text-sm">até</span>
          <Input type="date" value={customEnd} onChange={e => {
            setCustomEnd(e.target.value)
            if (customStart && e.target.value) setFilter('custom')
          }} onBlur={handleCustomDate} className="w-36 h-9 text-xs" max={format(new Date(), 'yyyy-MM-dd')} />
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border-card shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        <div className="border-b border-border-card flex items-center justify-between p-2">
          <div className="flex">
            <button
              onClick={() => setActiveTab('leads')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'leads' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-main'}`}
            >
              Leads
            </button>
            <button
              onClick={() => setActiveTab('clientes')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'clientes' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-main'}`}
            >
              Clientes
            </button>
          </div>
          <div className="px-4 w-72">
            <Input placeholder="Buscar nome ou WhatsApp..." value={busca} onChange={e => setBusca(e.target.value)} className="h-9" />
          </div>
        </div>

        <div className="flex-1 overflow-x-auto relative">
          {loading && (
             <div className="absolute inset-0 bg-base/50 backdrop-blur-[2px] z-10 flex items-center justify-center">
               <span className="text-muted font-medium">Buscando...</span>
             </div>
          )}
          
          {activeTab === 'leads' ? (
            <table className="w-full text-left text-sm text-main">
              <thead className="bg-primary-light/50 text-muted uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">WhatsApp</th>
                  <th className="px-4 py-3 font-medium">Status / Procedimento</th>
                  <th className="px-4 py-3 font-medium">Última Mensagem</th>
                  <th className="px-4 py-3 font-medium">Iniciou em</th>
                  <th className="px-4 py-3 font-medium w-12"></th>
                </tr>
              </thead>
              <tbody>
                {leads.length > 0 ? leads.map(l => (
                  <tr key={l.id} onClick={() => setSelectedLead(l)} className="border-b border-border-card hover:bg-primary-light/20 cursor-pointer transition-colors group">
                    <td className="px-4 py-3 font-semibold">{l.nome_lead || 'Sem nome'}</td>
                    <td className="px-4 py-3 font-mono text-xs">{l.whatsapp_lead}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col space-y-1 items-start">
                        <Badge variant={l.status as any}>{l.status}</Badge>
                        <span className="text-xs text-muted truncate max-w-[150px]" title={l.procedimento_interesse}>{l.procedimento_interesse || '-'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{renderRelativeTime(l.ultima_mensagem)}</td>
                    <td className="px-4 py-3">{l.inicio_atendimento ? format(new Date(l.inicio_atendimento), 'dd/MM/yyyy HH:mm') : '-'}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => handleDeleteLead(e, l)}
                        disabled={deletingId === l.id}
                        title="Excluir lead"
                        className="text-muted/40 hover:text-error transition-colors p-1 rounded disabled:opacity-50"
                      >
                        {deletingId === l.id
                          ? <span className="text-xs">...</span>
                          : <Trash2 className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={6} className="text-center py-8 text-muted">Nenhum lead encontrado para este período.</td></tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-sm text-main">
              <thead className="bg-primary-light/50 text-muted uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">WhatsApp</th>
                  <th className="px-4 py-3 font-medium">Procedimentos Realizados</th>
                  <th className="px-4 py-3 font-medium">Próximo Agendamento</th>
                  <th className="px-4 py-3 font-medium">Cliente desde</th>
                </tr>
              </thead>
              <tbody>
                {clientes.length > 0 ? clientes.map(c => {
                  const lead = c.leads_estetica || {}
                  return (
                    <tr key={c.id} onClick={() => setSelectedCliente(c)} className="border-b border-border-card hover:bg-primary-light/20 cursor-pointer transition-colors">
                      <td className="px-4 py-3 font-semibold">{lead.nome_lead || 'Cliente sem nome'}</td>
                      <td className="px-4 py-3 font-mono text-xs">{lead.whatsapp_lead}</td>
                      <td className="px-4 py-3 font-medium text-center">{c.procedimentos_realizados}</td>
                      <td className="px-4 py-3 text-primary font-medium">
                        {c.proximo_agendamento ? format(new Date(c.proximo_agendamento), 'dd/MM/yyyy HH:mm') : '-'}
                      </td>
                      <td className="px-4 py-3">{c.data_primeira_visita ? format(new Date(c.data_primeira_visita), 'dd/MM/yyyy') : '-'}</td>
                    </tr>
                  )
                }) : (
                  <tr><td colSpan={5} className="text-center py-8 text-muted">Nenhum cliente encontrado para este período.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <LeadDrawer 
        isOpen={selectedLead !== null} 
        lead={selectedLead} 
        onClose={() => setSelectedLead(null)} 
        onUpdated={fetchData} 
      />
      
      {/* Drawer do Cliente (Reuso modificado base lead + client extra info) */}
      <ClienteDrawer isOpen={selectedCliente !== null} cliente={selectedCliente} onClose={() => setSelectedCliente(null)} />
    </div>
  )
}

function ClienteDrawer({ cliente, isOpen, onClose }: any) {
  if (!isOpen || !cliente) return null
  const lead = cliente.leads_estetica || {}

  const formatValor = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full sm:w-[500px] bg-base shadow-2xl z-50 transform transition-transform duration-300 flex flex-col border-l border-border-card overflow-y-auto translate-x-0">
        <div className="flex items-center justify-between p-6 border-b border-border-card bg-card sticky top-0 z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-serif font-bold text-main">{lead.nome_lead || 'Cliente sem nome'}</h2>
              <Badge variant="compareceu">Cliente</Badge>
            </div>
            <p className="text-sm text-muted">{lead.whatsapp_lead}</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-main p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1">
          <div className="grid grid-cols-2 gap-4 text-sm text-main">
            <div className="bg-card p-3 rounded-lg border border-border-card">
              <span className="block text-xs text-muted mb-1 text-primary flex items-center gap-1"><CalendarIcon className="w-3 h-3"/> Desde</span>
              <span className="font-semibold">{cliente.data_primeira_visita ? format(new Date(cliente.data_primeira_visita), 'dd/MM/yyyy') : '-'}</span>
            </div>
            <div className="bg-card p-3 rounded-lg border border-border-card">
              <span className="block text-xs text-muted mb-1 text-success flex items-center gap-1"><DollarSign className="w-3 h-3"/> Valor Gasto</span>
              <span className="font-semibold">{formatValor(cliente.valor_pago)}</span>
            </div>
            <div className="bg-card p-3 rounded-lg border border-border-card">
              <span className="block text-xs text-muted mb-1">Nascimento</span>
              <span className="font-medium">{lead.data_nascimento ? format(new Date(lead.data_nascimento), 'dd/MM/yyyy') : '-'}</span>
            </div>
            <div className="bg-card p-3 rounded-lg border border-border-card">
              <span className="block text-xs text-muted mb-1">Gênero</span>
              <span className="font-medium capitalize">{lead.genero || '-'}</span>
            </div>
          </div>

          <div>
             <h4 className="text-sm font-semibold text-main mb-2">Observações Internas</h4>
             <p className="text-sm bg-card border border-border-card p-3 rounded-lg min-h-16 text-muted">
               {cliente.observacoes || 'Nenhuma observação cadastrada.'}
             </p>
          </div>
        </div>

        <div className="p-6 border-t border-border-card bg-card">
          <Button className="w-full" onClick={() => {
            onClose()
            window.location.href = '/crm'
          }}>
            Ver no Kanban CRM
          </Button>
        </div>
      </div>
    </>
  )
}

import { useState, useEffect } from 'react'
import { 
  startOfDay, endOfDay, subDays, startOfMonth, startOfYear, 
  endOfMonth, endOfYear, format, isAfter, subWeeks, eachDayOfInterval 
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Calendar as CalendarIcon, Users, UserCheck, CalendarDays, Bot } from 'lucide-react'
import toast from 'react-hot-toast'
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Input } from '../components/ui/Input'
import { useClinic } from '../contexts/ClinicContext'
import { supabase } from '../lib/supabase'

type DateFilter = 'hoje' | 'ontem' | '7dias' | '14semanas' | 'mes' | 'ano' | 'custom'

export function Dashboard() {
  const { clinic } = useClinic()
  const [filter, setFilter] = useState<DateFilter>('7dias')
  const [dateRange, setDateRange] = useState({ start: new Date(), end: new Date() })
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  // Metrics
  const [metrics, setMetrics] = useState({
    agendamentos: 0,
    comparecimentos: 0,
    novosLeads: 0,
    novosClientes: 0,
  })

  // Data for Charts
  const [leadsPorDia, setLeadsPorDia] = useState<any[]>([])
  const [leadsPorDiaSemana, setLeadsPorDiaSemana] = useState<any[]>([])
  const [leadsForaHorario, setLeadsForaHorario] = useState({ dentro: 0, fora: 0 })
  const [procedimentos, setProcedimentos] = useState<any[]>([])
  
  // Future Appointments
  const [futuros, setFuturos] = useState<any[]>([])

  // Horários de funcionamento
  const [businessHours, setBusinessHours] = useState<any[]>([])

  useEffect(() => {
    fetchBusinessHours()
  }, [])

  useEffect(() => {
    applyFilter(filter)
  }, [filter])

  useEffect(() => {
    if (dateRange.start && dateRange.end) {
      fetchDashboardData()
      fetchFuturos()
    }
  }, [dateRange, businessHours])

  const fetchBusinessHours = async () => {
    const { data } = await supabase.from('agenda_hours').select('*')
    if (data) setBusinessHours(data)
  }

  const applyFilter = (f: DateFilter) => {
    const now = new Date()
    let start = new Date()
    let end = new Date()

    switch (f) {
      case 'hoje':
        start = startOfDay(now)
        end = endOfDay(now)
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

  const fetchDashboardData = async () => {
    try {
      const startIso = dateRange.start.toISOString()
      const endIso = dateRange.end.toISOString()

      // Métricas
      const [agendamentosRes, comparecimentosRes, leadsRes, clientesRes] = await Promise.all([
        supabase.from('agendamentos_estetica').select('id', { count: 'exact' }).gte('data_hora_inicio', startIso).lte('data_hora_inicio', endIso),
        supabase.from('agendamentos_estetica').select('id', { count: 'exact' }).eq('status', 'compareceu').gte('data_hora_inicio', startIso).lte('data_hora_inicio', endIso),
        supabase.from('leads_estetica').select('id, inicio_atendimento', { count: 'exact' }).gte('inicio_atendimento', startIso).lte('inicio_atendimento', endIso),
        supabase.from('clientes_estetica').select('id', { count: 'exact' }).gte('created_at', startIso).lte('created_at', endIso)
      ])

      setMetrics({
        agendamentos: agendamentosRes.count || 0,
        comparecimentos: comparecimentosRes.count || 0,
        novosLeads: leadsRes.count || 0,
        novosClientes: clientesRes.count || 0
      })

      // Gráfico 1: Atendimentos por dia
      const { data: leadsData } = await supabase.from('leads_estetica').select('inicio_atendimento').gte('inicio_atendimento', startIso).lte('inicio_atendimento', endIso)
      
      if (leadsData) {
        // Pre-populate interval with 0s
        const interval = eachDayOfInterval({ start: dateRange.start, end: dateRange.end })
        const dias: Record<string, number> = {}
        interval.forEach(day => {
          dias[format(day, 'dd/MM')] = 0
        })

        const semanas: Record<number, number> = { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0 }
        let dentro = 0
        let fora = 0

        leadsData.forEach(lead => {
          const d = new Date(lead.inicio_atendimento)
          const dayStr = format(d, 'dd/MM')
          dias[dayStr] = (dias[dayStr] || 0) + 1
          
          // Dia da semana para Gráfico 2. 0 = Domingo
          semanas[d.getDay()] = (semanas[d.getDay()] || 0) + 1

          // Dentro/Fora horário
          const dayNameMap = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado']
          const gDay = dayNameMap[d.getDay()]
          const gHour = format(d, 'HH:mm')
          
          // Encontra hours config
          const hw = businessHours.find(h => h.dia === gDay)
          if (hw && hw.aberto && gHour >= hw.hora_inicio && gHour <= hw.hora_fim) {
            dentro++
          } else {
            fora++
          }
        })

        // Gráfico 1 formatting - Sort by timestamp to avoid dd/MM alphabetical bug
        const chart1 = interval.map(day => {
          const key = format(day, 'dd/MM')
          return { name: key, leads: dias[key], timestamp: day.getTime() }
        })
        setLeadsPorDia(chart1)

        // Gráfico 2 formatting
        const chart2Keys = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
        const chart2 = chart2Keys.map((k, i) => ({ name: k, leads: semanas[i] }))
        setLeadsPorDiaSemana(chart2)

        // Gráfico 3
        setLeadsForaHorario({ dentro, fora })
      }

      // Gráfico 4: Procedimentos mais procurados (Leads + Agendamentos)
      const [procAgendamentos, procLeads] = await Promise.all([
        supabase.from('agendamentos_estetica').select('procedimento_nome').gte('data_hora_inicio', startIso).lte('data_hora_inicio', endIso),
        supabase.from('leads_estetica').select('procedimento_interesse').gte('inicio_atendimento', startIso).lte('inicio_atendimento', endIso)
      ])

      const pCount: Record<string, number> = {}
      
      if (procAgendamentos.data) {
        procAgendamentos.data.forEach(p => {
          if (p.procedimento_nome) {
            const nm = p.procedimento_nome.trim()
            pCount[nm] = (pCount[nm] || 0) + 1
          }
        })
      }

      if (procLeads.data) {
        procLeads.data.forEach(p => {
          if (p.procedimento_interesse) {
            const nm = p.procedimento_interesse.trim()
            pCount[nm] = (pCount[nm] || 0) + 1
          }
        })
      }

      const sorted = Object.keys(pCount)
        .map(k => ({ name: k, total: pCount[k] }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 8)
      
      setProcedimentos(sorted)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast.error('Erro ao carregar dados do dashboard')
    }
  }

  const fetchFuturos = async () => {
    const nowIso = new Date().toISOString()
    const { data } = await supabase
      .from('agendamentos_estetica')
      .select('*, agendas(nome), leads_estetica(nome_lead)')
      .gte('data_hora_inicio', nowIso)
      .order('data_hora_inicio', { ascending: true })
      .limit(5)
    
    if (data) setFuturos(data)
  }

  const FILTROS: { id: DateFilter; label: string }[] = [
    { id: 'hoje', label: 'Hoje' },
    { id: 'ontem', label: 'Ontem' },
    { id: '7dias', label: '7 dias' },
    { id: '14semanas', label: '14 semanas' },
    { id: 'mes', label: 'Mês' },
    { id: 'ano', label: 'Ano' },
  ]

  const maxProcedimento = procedimentos.length > 0 ? procedimentos[0].total : 1

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Filtro de datas */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border-card shadow-card">
        <div className="flex flex-wrap gap-2">
          {FILTROS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                filter === f.id 
                  ? 'bg-primary text-white' 
                  : 'bg-transparent text-muted hover:bg-primary-light hover:text-primary'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Input 
            type="date" 
            value={customStart} 
            onChange={e => setCustomStart(e.target.value)}
            className="w-36 h-9 text-xs"
            max={format(new Date(), 'yyyy-MM-dd')}
          />
          <span className="text-muted text-sm">até</span>
          <Input 
            type="date" 
            value={customEnd} 
            onChange={e => {
              setCustomEnd(e.target.value)
              if (customStart && e.target.value) setFilter('custom')
            }}
            onBlur={handleCustomDate}
            className="w-36 h-9 text-xs"
            max={format(new Date(), 'yyyy-MM-dd')}
          />
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="flex flex-col p-6 items-center text-center justify-center rounded-[2rem] border border-border-card/60 bg-white/80 backdrop-blur-sm">
          <div className="h-16 w-16 rounded-full bg-[#f8e5e5] flex items-center justify-center mb-6 ring-8 ring-white">
            <CalendarDays className="h-7 w-7 text-primary" />
          </div>
          <h3 className="text-3xl text-main font-bold leading-tight">{metrics.agendamentos}</h3>
          <p className="text-sm text-muted font-medium mt-1">Agendamentos do período</p>
        </Card>
        <Card className="flex flex-col p-6 items-center text-center justify-center rounded-[2rem] border border-border-card/60 bg-white/80 backdrop-blur-sm">
          <div className="h-16 w-16 rounded-full bg-[#e8f3ec] flex items-center justify-center mb-6 ring-8 ring-white">
            <UserCheck className="h-7 w-7 text-success" />
          </div>
          <h3 className="text-3xl text-main font-bold leading-tight">{metrics.comparecimentos}</h3>
          <p className="text-sm text-muted font-medium mt-1">Comparecimentos</p>
        </Card>
        <Card className="flex flex-col p-6 items-center text-center justify-center rounded-[2rem] border border-border-card/60 bg-white/80 backdrop-blur-sm">
          <div className="h-16 w-16 rounded-full bg-[#fff0e5] flex items-center justify-center mb-6 ring-8 ring-white">
            <Users className="h-7 w-7 text-warning" />
          </div>
          <h3 className="text-3xl text-main font-bold leading-tight">{metrics.novosLeads}</h3>
          <p className="text-sm text-muted font-medium mt-1">Novos leads</p>
        </Card>
        <Card className="flex flex-col p-6 items-center text-center justify-center rounded-[2rem] border border-border-card/60 bg-white/80 backdrop-blur-sm">
          <div className="h-16 w-16 rounded-full bg-[#eef1ff] flex items-center justify-center mb-6 ring-8 ring-white">
            <UserCheck className="h-7 w-7 text-[#6366f1]" />
          </div>
          <h3 className="text-3xl text-main font-bold leading-tight">{metrics.novosClientes}</h3>
          <p className="text-sm text-muted font-medium mt-1">Novos clientes</p>
        </Card>
      </div>

      {/* Gráfico 1 - Atendimentos no WhatsApp */}
      <Card>
        <CardHeader>
          <CardTitle>Atendimentos no WhatsApp</CardTitle>
          <p className="text-sm text-muted">Total de leads atendidos pelo agente de IA por dia no período selecionado</p>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={leadsPorDia} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-card)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: '1px solid var(--border-card)', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }} 
              />
              <Line type="monotone" dataKey="leads" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Gráfico 2 - Dias com mais movimento (60%) */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Dias com mais movimento</CardTitle>
            <p className="text-sm text-muted">Veja em quais dias da semana sua clínica recebe mais contatos</p>
          </CardHeader>
          <CardContent className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leadsPorDiaSemana} margin={{ top: 5, right: 0, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-card)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                <Tooltip cursor={{ fill: 'var(--primary-light)', opacity: 0.4 }} contentStyle={{ borderRadius: '8px', border: '1px solid var(--border-card)', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }} />
                <Bar dataKey="leads" fill="var(--primary)" fillOpacity={0.8} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico 3 - Pizza (40%) */}
        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader>
            <CardTitle>Horário dos contatos</CardTitle>
            <p className="text-sm text-muted">Quantos leads chegaram dentro e fora do horário de funcionamento</p>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center items-center h-[250px]">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Dentro do horário', value: leadsForaHorario.dentro },
                    { name: 'Fora do horário', value: leadsForaHorario.fora },
                  ]}
                  cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value"
                >
                  <Cell fill="var(--success)" />
                  <Cell fill="var(--warning)" />
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--border-card)', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }} />
                <Legend wrapperStyle={{ fontSize: '12px', marginTop: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 text-xs text-muted font-medium bg-primary-light/30 px-3 py-1.5 rounded-md flex items-center">
              ⚙️ Horário considerado: Personalizado em Configurações
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Gráfico 4 - Barras Horizontais (60%) */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Procedimentos mais procurados</CardTitle>
            <p className="text-sm text-muted">Os serviços mais solicitados no período</p>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={procedimentos} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-card)" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-main)' }} width={120} />
                <Tooltip cursor={{ fill: 'var(--primary-light)', opacity: 0.4 }} contentStyle={{ borderRadius: '8px', border: '1px solid var(--border-card)', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }} />
                <Bar dataKey="total" fill="var(--primary)" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Card - Em destaque (40%) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Procedimentos em destaque</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {procedimentos.length > 0 ? procedimentos.map((proc, idx) => (
                <div key={idx} className="relative">
                  <div className="flex justify-between text-sm mb-1 text-main font-medium">
                    <span>{idx + 1}º {proc.name}</span>
                    <span>{proc.total}</span>
                  </div>
                  <div className="h-2 w-full bg-border-card rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full" 
                      style={{ 
                        width: `${(proc.total / maxProcedimento) * 100}%`,
                        opacity: 1 - (idx * 0.1)
                      }}
                    />
                  </div>
                </div>
              )) : (
                <p className="text-sm text-muted text-center py-4">Nenhum dado encontrado</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Aviso IA */}
      {leadsForaHorario.fora > 0 && (
        <div className="bg-primary-light p-5 rounded-xl border-l-4 border-primary shadow-sm flex items-start gap-4">
          <div className="p-2 bg-white rounded-full shadow-sm">
            <Bot className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h4 className="font-serif text-lg font-semibold text-main mb-1">Impacto do Agente de IA</h4>
            <p className="text-sm text-main leading-relaxed">
              <strong className="text-primary">{leadsForaHorario.fora} pessoas</strong> tentaram falar com sua clínica fora do horário de atendimento. Sem o agente de IA no WhatsApp, esses contatos teriam ido embora sem resposta — e provavelmente procurado a concorrência.
            </p>
          </div>
        </div>
      )}

      {/* Próximos Agendamentos */}
      <Card>
        <CardHeader>
          <CardTitle>Próximos agendamentos</CardTitle>
        </CardHeader>
        <CardContent>
          {futuros.length > 0 ? (
            <div className="flex flex-col gap-3">
              <div className="hidden md:grid grid-cols-5 gap-4 px-6 py-2 text-xs font-semibold text-muted tracking-wider uppercase mt-2">
                <div className="col-span-1">Cliente</div>
                <div className="col-span-1">Procedimento</div>
                <div className="col-span-1">Data / Hora</div>
                <div className="col-span-1">Agenda</div>
                <div className="col-span-1">Status</div>
              </div>
              
              {futuros.map((ag) => {
                const clientName = ag.nome_lead || ag.leads_estetica?.nome_lead || 'Desconhecido'
                return (
                  <div key={ag.id} className="grid grid-cols-1 md:grid-cols-5 gap-4 px-6 py-5 bg-[#F6Fcf6]/60 border border-[#e5ecd6] rounded-2xl items-center hover:bg-white hover:shadow-md transition-all">
                    <div className="col-span-1 font-semibold text-main text-sm">{clientName}</div>
                    <div className="col-span-1 text-sm text-muted">{ag.procedimento_nome || '-'}</div>
                    <div className="col-span-1 text-sm font-medium text-main">
                      {format(new Date(ag.data_hora_inicio), 'dd/MM/yyyy HH:mm')}
                    </div>
                    <div className="col-span-1">
                      <Badge variant="confirmado" className="bg-transparent border border-border-card text-muted shadow-sm rounded-lg px-3 py-1">
                        {ag.agendas?.nome || '-'}
                      </Badge>
                    </div>
                    <div className="col-span-1">
                      <Badge variant={ag.status as any} className="rounded-lg px-3 py-1">{ag.status}</Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-muted">
              <CalendarIcon className="h-10 w-10 mb-2 opacity-50" />
              <p>Não há agendamentos futuros.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

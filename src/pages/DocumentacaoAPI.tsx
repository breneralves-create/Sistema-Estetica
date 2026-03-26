import { useState, useEffect, useRef } from 'react'
import { Copy, Check, Terminal, Info, ChevronRight, Globe, Key, Calendar } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'
import { Card, CardContent } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { cn } from '../lib/utils'

const BASE_URL = import.meta.env.VITE_SUPABASE_URL 
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1` 
  : 'https://seu-projeto.supabase.co/functions/v1'

interface Token {
  id: string
  label: string
  token: string
}

interface Agenda {
  id: string
  nome: string
}

export function DocumentacaoAPI() {
  const [tokens, setTokens] = useState<Token[]>([])
  const [agendas, setAgendas] = useState<Agenda[]>([])
  const [selectedToken, setSelectedToken] = useState<string>('')
  const [selectedAgenda, setSelectedAgenda] = useState<string>('')
  const [activeSection, setActiveSection] = useState('marcar')

  useEffect(() => {
    fetchData()
    setupIntersectionObserver()
  }, [])

  const fetchData = async () => {
    const [resTokens, resAgendas] = await Promise.all([
      supabase.from('api_tokens').select('id, label, token').eq('ativo', true),
      supabase.from('agendas').select('id, nome').eq('ativo', true)
    ])

    if (resTokens.data) {
      setTokens(resTokens.data)
      if (resTokens.data.length > 0) setSelectedToken(resTokens.data[0].token)
    }
    if (resAgendas.data) {
      setAgendas(resAgendas.data)
      if (resAgendas.data.length > 0) setSelectedAgenda(resAgendas.data[0].id)
    }
  }

  const setupIntersectionObserver = () => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        })
      },
      { threshold: 0.5, rootMargin: '-10% 0px -40% 0px' }
    )

    document.querySelectorAll('section[id]').forEach((section) => {
      observer.observe(section)
    })

    return () => observer.disconnect()
  }

  const maskToken = (token: string) => {
    if (!token) return '{TOKEN}'
    return `••••••${token.slice(-8)}`
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // Toast or feedback would be nice here
  }

  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8 animate-in fade-in duration-500">
      {/* Sidebar de Navegação */}
      <aside className="hidden lg:block w-64 shrink-0">
        <div className="sticky top-24 space-y-6">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-4 px-2">Endpoints</h3>
            <nav className="space-y-1">
              {[
                { id: 'marcar', label: 'Marcar agendamento', method: 'POST', color: 'text-success' },
                { id: 'reagendar', label: 'Reagendar agendamento', method: 'PUT', color: 'text-blue-500' },
                { id: 'cancelar', label: 'Cancelar agendamento', method: 'DELETE', color: 'text-error' },
                { id: 'horarios', label: 'Consultar horários', method: 'GET', color: 'text-muted' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollTo(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all",
                    activeSection === item.id 
                      ? "bg-primary text-white shadow-sm shadow-primary/20" 
                      : "text-muted hover:bg-card hover:text-main"
                  )}
                >
                  <span className={cn("text-[10px] font-bold w-10 text-left", activeSection === item.id ? "text-white/80" : item.color)}>
                    {item.method}
                  </span>
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-4 bg-primary-light/30 rounded-xl border border-primary/10">
            <h4 className="text-xs font-bold text-primary uppercase mb-2 flex items-center gap-1">
              <Info className="w-3 h-3" /> Dica de Integração
            </h4>
            <p className="text-xs text-main leading-relaxed">
              Use estes endpoints no <strong>N8N</strong> ou em seus <strong>Agentes de IA</strong> para automatizar o atendimento via WhatsApp.
            </p>
          </div>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <div className="flex-1 space-y-12 pb-24">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="font-serif text-4xl font-bold text-main">Documentação da API</h1>
          <p className="text-muted text-lg">
            Use os endpoints abaixo para integrar seu agente de IA e N8N com o sistema de agendamento da clínica.
          </p>
        </div>

        {/* Painel de Configuração Rápida */}
        <Card className="bg-primary-light/20 border-primary rounded-xl overflow-hidden">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-primary flex items-center gap-1.5">
                  <Key className="w-3 h-3" /> Token ativo
                </label>
                <select 
                  value={selectedToken}
                  onChange={(e) => setSelectedToken(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-primary/20 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {tokens.length > 0 ? (
                    tokens.map(tk => <option key={tk.id} value={tk.token}>{tk.label}</option>)
                  ) : (
                    <option value="">Nenhum token ativo</option>
                  )}
                </select>
                <p className="text-[10px] text-muted italic mt-1">
                  O token real não é exibido por segurança. Substitua pelo token completo gerado em Configurações.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-primary flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" /> Agenda
                </label>
                <select 
                  value={selectedAgenda}
                  onChange={(e) => setSelectedAgenda(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-primary/20 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {agendas.length > 0 ? (
                    agendas.map(ag => <option key={ag.id} value={ag.id}>{ag.nome}</option>)
                  ) : (
                    <option value="">Nenhuma agenda ativa</option>
                  )}
                </select>
              </div>

              <div className="space-y-1.5 lg:col-span-1 md:col-span-2">
                <label className="text-xs font-bold uppercase text-primary flex items-center gap-1.5">
                  <Globe className="w-3 h-3" /> Base URL
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 h-10 px-3 flex items-center rounded-lg border border-primary/20 bg-white/50 dark:bg-zinc-950/50 text-sm font-mono truncate">
                    {BASE_URL}
                  </div>
                  <Button variant="secondary" size="sm" className="shrink-0 h-10" onClick={() => copyToClipboard(BASE_URL)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
            
            {tokens.length === 0 && (
              <div className="mt-4 p-3 bg-error/10 border border-error/20 rounded-lg flex items-center gap-3 text-error text-sm">
                <Info className="w-4 h-4 shrink-0" />
                Nenhum token ativo encontrado. Crie um token em Configurações → Token de API.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Seções de Endpoints */}
        <div className="space-y-24">
          <EndpointSection 
            id="marcar"
            method="POST"
            title="Marcar Agendamento"
            description="Cria um novo agendamento na agenda informada para um lead ou cliente existente no sistema. Duração fixa de 60 minutos."
            token={maskToken(selectedToken)}
            agendaId={selectedAgenda || '{AGENDA_ID}'}
            params={[
              { field: 'agenda_id', type: 'UUID', required: 'SIM', desc: 'ID da agenda — preenchido automaticamente acima' },
              { field: 'lead_id', type: 'UUID', required: 'CONDICIONAL', desc: 'Obrigatório se não informar cliente_id' },
              { field: 'cliente_id', type: 'UUID', required: 'CONDICIONAL', desc: 'Obrigatório se não informar lead_id' },
              { field: 'data', type: 'String', required: 'SIM', desc: 'Formato YYYY-MM-DD' },
              { field: 'hora', type: 'String', required: 'SIM', desc: 'Formato HH:MM' },
              { field: 'procedimento_nome', type: 'String', required: 'NÃO', desc: 'Nome do procedimento (texto livre)' },
            ]}
            curl={`curl -X POST ${BASE_URL}/agendamentos \\
  -H "Authorization: Bearer {TOKEN}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agenda_id": "{AGENDA_ID}",
    "lead_id": "UUID_DO_LEAD",
    "procedimento_nome": "Limpeza de Pele",
    "nome_lead": "Maria Silva",
    "whatsapp_lead": "5548999999999",
    "data": "2025-03-15",
    "hora": "14:00"
  }'`}
            response={`{
  "sucesso": true,
  "situacao": "AGENDAMENTO_CRIADO",
  "mensagem": "Agendamento criado com sucesso.",
  "agendamento": {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "agenda_id": "{AGENDA_ID}",
    "status": "agendado",
    ...
  }
}`}
            statusCodes={[
              { http: '201', situacao: 'AGENDAMENTO_CRIADO', motivo: 'Agendamento criado com sucesso' },
              { http: '200', situacao: 'HORARIO_OCUPADO', motivo: 'Slot indisponível — resposta inclui 3 sugestões' },
              { http: '200', situacao: 'AGENDA_FECHADA', motivo: 'Agenda fechada no dia solicitado' },
              { http: '401', situacao: 'TOKEN_INVALIDO', motivo: 'Token ausente ou inválido' },
            ]}
          />

          <EndpointSection 
            id="reagendar"
            method="PUT"
            title="Reagendar Agendamento"
            description="Altera a data e/ou hora de um agendamento existente. O ID do agendamento é retornado no momento da criação."
            token={maskToken(selectedToken)}
            agendaId={selectedAgenda || '{AGENDA_ID}'}
            params={[
              { field: ':id', type: 'URL', required: 'SIM', desc: 'ID do agendamento a reagendar' },
              { field: 'agenda_id', type: 'Body', required: 'SIM', desc: 'ID da agenda — preenchido automaticamente' },
              { field: 'data', type: 'Body', required: 'SIM', desc: 'Nova data no formato YYYY-MM-DD' },
              { field: 'hora', type: 'Body', required: 'SIM', desc: 'Novo horário no formato HH:MM' },
            ]}
            curl={`curl -X PUT ${BASE_URL}/agendamentos/ID_DO_AGENDAMENTO \\
  -H "Authorization: Bearer {TOKEN}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agenda_id": "{AGENDA_ID}",
    "data": "2025-03-20",
    "hora": "10:00"
  }'`}
            response={`{
  "sucesso": true,
  "situacao": "AGENDAMENTO_REAGENDADO",
  "mensagem": "Agendamento reagendado com sucesso.",
  "agendamento": { ... }
}`}
            statusCodes={[
              { http: '200', situacao: 'AGENDAMENTO_REAGENDADO', motivo: 'Reagendado com sucesso' },
              { http: '200', situacao: 'HORARIO_OCUPADO', motivo: 'Novo slot indisponível' },
              { http: '404', situacao: 'AGENDAMENTO_NAO_ENCONTRADO', motivo: 'ID do agendamento não existe' },
            ]}
          />

          <EndpointSection 
            id="cancelar"
            method="DELETE"
            title="Cancelar Agendamento"
            description="Cancela um agendamento existente. O registro não é deletado — o status é alterado para cancelado."
            token={maskToken(selectedToken)}
            agendaId={selectedAgenda || '{AGENDA_ID}'}
            params={[
              { field: ':id', type: 'URL', required: 'SIM', desc: 'ID do agendamento a cancelar' },
              { field: 'agenda_id', type: 'Body', required: 'SIM', desc: 'ID da agenda — preenchido automaticamente' },
            ]}
            curl={`curl -X DELETE ${BASE_URL}/agendamentos/ID_DO_AGENDAMENTO \\
  -H "Authorization: Bearer {TOKEN}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agenda_id": "{AGENDA_ID}"
  }'`}
            response={`{
  "sucesso": true,
  "situacao": "AGENDAMENTO_CANCELADO",
  "mensagem": "Agendamento cancelado com sucesso."
}`}
            statusCodes={[
              { http: '200', situacao: 'AGENDAMENTO_CANCELADO', motivo: 'Cancelado com sucesso' },
              { http: '403', situacao: 'ACESSO_NEGADO', motivo: 'Agendamento não pertence à agenda informada' },
            ]}
          />

          <section id="horarios" className="space-y-8 scroll-mt-24">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Badge className="bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">GET</Badge>
                <h2 className="text-2xl font-serif font-bold text-main">Consultar Horários Disponíveis</h2>
              </div>
              <p className="text-muted leading-relaxed">
                Consulta a disponibilidade de horários em uma agenda. Informe data + hora para verificar um horário específico, ou apenas data para listar todos os slots livres do dia. Slots têm duração fixa de 60 minutos.
              </p>
            </div>

            <div className="space-y-12">
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-main">Variação 1 — Verificar horário específico</h3>
                <p className="text-sm text-muted italic">Informe data + hora para verificar se um horário está disponível. Se estiver ocupado, recebe 3 sugestões de horários próximos.</p>
                <EndpointDocs 
                  token={maskToken(selectedToken)}
                  agendaId={selectedAgenda || '{AGENDA_ID}'}
                  params={[
                    { field: 'agenda_id', type: 'Query', required: 'SIM', desc: 'ID da agenda — preenchido automaticamente acima' },
                    { field: 'data', type: 'Query', required: 'SIM', desc: 'Data no formato YYYY-MM-DD' },
                    { field: 'hora', type: 'Query', required: 'SIM', desc: 'Hora no formato HH:MM' },
                  ]}
                  curl={`curl -X GET "${BASE_URL}/agendamentos/horarios?agenda_id={AGENDA_ID}&data=2025-03-15&hora=14:00" \\
  -H "Authorization: Bearer {TOKEN}"`}
                  response={`{
  "sucesso": true,
  "situacao": "HORARIO_DISPONIVEL",
  "mensagem": "O horário solicitado está disponível.",
  "horario": "2025-03-15T14:00:00-03:00"
}`}
                />
              </div>

              <div className="space-y-6">
                <h3 className="text-lg font-bold text-main">Variação 2 — Listar todos os slots livres do dia</h3>
                <p className="text-sm text-muted italic">Informe apenas a data para receber todos os horários disponíveis do dia, respeitando o horário de funcionamento da agenda.</p>
                <EndpointDocs 
                  token={maskToken(selectedToken)}
                  agendaId={selectedAgenda || '{AGENDA_ID}'}
                  params={[
                    { field: 'agenda_id', type: 'Query', required: 'SIM', desc: 'ID da agenda — preenchido automaticamente acima' },
                    { field: 'data', type: 'Query', required: 'SIM', desc: 'Data no formato YYYY-MM-DD' },
                  ]}
                  curl={`curl -X GET "${BASE_URL}/agendamentos/horarios?agenda_id={AGENDA_ID}&data=2025-03-15" \\
  -H "Authorization: Bearer {TOKEN}"`}
                  response={`{
  "sucesso": true,
  "situacao": "HORARIOS_DISPONIVEIS",
  "mensagem": "Horários disponíveis para o dia 15/03/2025.",
  "slots_disponiveis": ["08:00", "09:00", "10:00", "14:00", "15:00", "16:00"]
}`}
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function EndpointSection({ id, method, title, description, token, agendaId, params, curl, response, statusCodes }: any) {
  const methodColors: Record<string, string> = {
    POST: 'bg-success text-white',
    PUT: 'bg-blue-500 text-white',
    DELETE: 'bg-error text-white',
    GET: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
  }

  return (
    <section id={id} className="space-y-8 scroll-mt-24">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Badge className={cn("px-2 py-0.5", methodColors[method])}>{method}</Badge>
          <h2 className="text-2xl font-serif font-bold text-main">{title}</h2>
        </div>
        <p className="text-muted leading-relaxed">{description}</p>
      </div>

      <EndpointDocs 
        token={token} 
        agendaId={agendaId} 
        params={params} 
        curl={curl} 
        response={response} 
        statusCodes={statusCodes} 
      />
    </section>
  )
}

function EndpointDocs({ token, agendaId, params, curl, response, statusCodes }: any) {
  return (
    <div className="space-y-6">
      {/* Tabela de Parâmetros */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-main uppercase tracking-wider flex items-center gap-2">
          <ChevronRight className="w-4 h-4 text-primary" /> Parâmetros
        </h4>
        <div className="overflow-x-auto rounded-xl border border-border-card shadow-sm">
          <table className="w-full text-left text-sm text-main">
            <thead className="bg-card text-muted uppercase text-[10px] font-bold tracking-widest">
              <tr>
                <th className="px-4 py-3 border-b border-border-card">Campo</th>
                <th className="px-4 py-3 border-b border-border-card">Tipo/Local</th>
                <th className="px-4 py-3 border-b border-border-card">Obrigatório</th>
                <th className="px-4 py-3 border-b border-border-card">Descrição</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-card">
              {params.map((p: any) => (
                <tr key={p.field} className="hover:bg-primary-light/10 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-primary">{p.field}</td>
                  <td className="px-4 py-3">{p.type}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase",
                      p.required === 'SIM' ? 'bg-error/10 text-error' : 
                      p.required === 'CONDICIONAL' ? 'bg-warning/10 text-warning' : 
                      'bg-zinc-100 text-zinc-500'
                    )}>
                      {p.required}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted leading-snug">{p.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* cURL */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-main uppercase tracking-wider flex items-center gap-2">
          <Terminal className="w-4 h-4 text-primary" /> Exemplo de cURL
        </h4>
        <CodeBlock code={curl} replacements={{ '{TOKEN}': token, '{AGENDA_ID}': agendaId }} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Resposta */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-main uppercase tracking-wider flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" /> Resposta de Sucesso
          </h4>
          <CodeBlock code={response} language="json" replacements={{ '{TOKEN}': token, '{AGENDA_ID}': agendaId }} />
        </div>

        {/* Status Codes */}
        {statusCodes && (
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-main uppercase tracking-wider flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" /> Situações e Erros
            </h4>
            <div className="overflow-x-auto rounded-xl border border-border-card shadow-sm h-[200px] overflow-y-auto">
              <table className="w-full text-left text-sm text-main">
                <thead className="bg-card text-muted uppercase text-[10px] font-bold tracking-widest sticky top-0">
                  <tr>
                    <th className="px-4 py-2 border-b border-border-card">HTTP</th>
                    <th className="px-4 py-2 border-b border-border-card">SITUACAO</th>
                    <th className="px-4 py-2 border-b border-border-card">Motivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-card">
                  {statusCodes.map((s: any) => (
                    <tr key={s.situacao}>
                      <td className="px-4 py-2 font-bold">{s.http}</td>
                      <td className="px-4 py-2 font-mono text-xs text-primary">{s.situacao}</td>
                      <td className="px-4 py-2 text-xs text-muted">{s.motivo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function CodeBlock({ code, language = 'bash', replacements }: { code: string; language?: string; replacements: Record<string, string> }) {
  const [copied, setCopied] = useState(false)
  
  // Replace tokens and agendas precisely
  let processed = code
  Object.entries(replacements).forEach(([key, val]) => {
    processed = processed.replaceAll(key, val)
  })

  // Syntax highlighting logic (simplified for the prompt's specific colors)
  const renderHighlighted = (c: string) => {
    // This is a simple regex-based highligher for bash/json strings
    // Strings in double quotes -> primary-light color
    // Manual placeholders (CAPS_WITH_UNDERSCORE) -> yellow amber with underline
    
    const lines = c.split('\n')
    return lines.map((line, i) => {
      // Manual placeholders highlight
      const segments = line.split(/([A-Z]{4,}(?:_[A-Z0-9]+)*|ID_DO_AGENDAMENTO|UUID_DO_LEAD|UUID_DO_CLIENTE)/g)
      const renderedLine = segments.map((seg, j) => {
        if (seg.match(/^[A-Z]{4,}(?:_[A-Z0-9]+)*$/) || seg === 'ID_DO_AGENDAMENTO' || seg === 'UUID_DO_LEAD' || seg === 'UUID_DO_CLIENTE') {
          return (
            <span 
              key={j} 
              className="text-[#FBBF24] border-b border-dashed border-[#FBBF24] cursor-help" 
              title="Substitua pelo valor real"
            >
              {seg}
            </span>
          )
        }
        
        // Basic string highlighting for the rest
        const stringSegments = seg.split(/("[^"]*")/g)
        return stringSegments.map((s, k) => {
          if (s.startsWith('"') && s.endsWith('"')) {
            return <span key={k} className="text-[#FF80AB]">{s}</span>
          }
          return <span key={k}>{s}</span>
        })
      })

      return (
        <div key={i} className="min-h-[1.25rem]">
          {renderedLine}
        </div>
      )
    })
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(processed)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group">
      <div className="absolute right-2 top-2 z-10">
        <button 
          onClick={handleCopy}
          className="bg-white/10 hover:bg-white/20 text-white p-1.5 rounded-lg transition-colors flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider border border-white/10"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      <pre 
        className="bg-[#1A1218] text-white p-6 rounded-xl font-mono text-xs overflow-x-auto border border-white/5 shadow-2xl leading-relaxed"
        style={{ fontFamily: "'Fira Code', 'Cascadia Code', monospace" }}
      >
        <code>{renderHighlighted(processed)}</code>
      </pre>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Copy, Plus, Trash2, ShieldAlert } from 'lucide-react'
import toast from 'react-hot-toast'
import { Card, CardHeader, CardContent, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { useClinic } from '../contexts/ClinicContext'
import { supabase } from '../lib/supabase'

export function Configuracoes() {
  const [activeTab, setActiveTab] = useState<'geral' | 'usuarios' | 'api' | 'kanban'>('geral')

  return (
    <div className="space-y-6">
      <div className="border-b border-border-card">
        <nav className="-mb-px flex space-x-8">
          {['Geral', 'Usuários', 'Token de API', 'Kanban'].map((tab) => {
            const key = tab.toLowerCase().replace(/ /g, '-').replace('á', 'a').replace('ó', 'o')
            const mappedKey = key === 'token-de-api' ? 'api' : key as any
            const isActive = activeTab === mappedKey
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(mappedKey)}
                className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted hover:border-border-card hover:text-main'
                }`}
              >
                {tab}
              </button>
            )
          })}
        </nav>
      </div>

      <div className="mt-6">
        {activeTab === 'geral' && <TabGeral />}
        {activeTab === 'usuarios' && <TabUsuarios />}
        {activeTab === 'api' && <TabApi />}
        {activeTab === 'kanban' && <TabKanban />}
      </div>
    </div>
  )
}

function TabGeral() {
  const { clinic, refreshClinic } = useClinic()
  const [nome, setNome] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [hoursLoading, setHoursLoading] = useState(false)
  
  const diasSemana = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado']
  const [hours, setHours] = useState<Record<string, { aberto: boolean; hora_inicio: string; hora_fim: string }>>({})

  useEffect(() => {
    if (clinic) {
      setNome(clinic.nome)
    }
  }, [clinic])

  useEffect(() => {
    fetchHours()
  }, [])

  const fetchHours = async () => {
    try {
      const { data, error } = await supabase.from('agenda_hours').select('*')
      if (!error && data) {
        const parsed: any = {}
        diasSemana.forEach(dia => {
          const f = data.find(d => d.dia === dia)
          parsed[dia] = f ? { aberto: f.aberto, hora_inicio: f.hora_inicio.slice(0,5), hora_fim: f.hora_fim.slice(0,5) } : { aberto: false, hora_inicio: '08:00', hora_fim: '18:00' }
        })
        setHours(parsed)
      }
    } catch (e) {
      console.error('Error fetching hours:', e)
    }
  }

  const handleSaveIdentity = async () => {
    const timeoutId = setTimeout(() => {
      setLoading(false)
      toast.error('Tempo limite de conexão excedido.')
    }, 8000)

    setLoading(true)
    try {
      let logoUrl = clinic?.logo_url

      if (logoFile) {
        if (logoFile.size > 2 * 1024 * 1024) {
          toast.error('Imagem excedeu 2MB')
          return
        }
        const fileExt = logoFile.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `logos/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('clinic-assets')
          .upload(filePath, logoFile)

        if (uploadError) throw uploadError

        const { data } = supabase.storage.from('clinic-assets').getPublicUrl(filePath)
        logoUrl = data.publicUrl
      }

      const { error } = await supabase
        .from('clinic_config')
        .update({ nome, logo_url: logoUrl })
        .eq('id', 1)

      if (error) {
         // fallback to indiscriminante update if id=1 fails
         await supabase.from('clinic_config').update({ nome, logo_url: logoUrl }).neq('id', 0)
      }

      await refreshClinic()
      setLogoFile(null)
      toast.success('Identidade atualizada com sucesso')
    } catch (error: any) {
      toast.error('Erro ao salvar identidade')
      console.error(error)
    } finally {
      setLoading(false)
      clearTimeout(timeoutId)
    }
  }

  const handleRemoveLogo = async () => {
    try {
      await supabase.from('clinic_config').update({ logo_url: null }).neq('id', 0)
      await refreshClinic()
      toast.success('Logo removida')
    } catch (e) {
      toast.error('Erro ao remover logo')
    }
  }

  const handleSaveHours = async () => {
    const timeoutId = setTimeout(() => {
      setHoursLoading(false)
      toast.error('Tempo limite de conexão excedido.')
    }, 8000)

    setHoursLoading(true)
    try {
      for (const dia of diasSemana) {
        const val = hours[dia]
        if (val.aberto && val.hora_inicio >= val.hora_fim) {
          throw new Error(`Horário inválido em ${dia}`)
        }
        // Assuming there is a default agenda_id like 1 or querying the agenda
        const { data: agenda } = await supabase.from('agendas').select('id').limit(1).single()
        if (agenda) {
          await supabase.from('agenda_hours').upsert({
            agenda_id: agenda.id,
            dia,
            aberto: val.aberto,
            hora_inicio: val.hora_inicio,
            hora_fim: val.hora_fim
          }, { onConflict: 'agenda_id, dia' })
        }
      }
      toast.success('Horários atualizados')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setHoursLoading(false)
      clearTimeout(timeoutId)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Identidade da Clínica</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-main mb-1 block">Nome da Clínica</label>
            <Input value={nome} onChange={e => setNome(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-main mb-1 block">Logo da Clínica (máx 2MB)</label>
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 bg-primary-light rounded overflow-hidden flex items-center justify-center">
                {logoFile ? (
                  <img src={URL.createObjectURL(logoFile)} alt="Preview" className="h-full w-full object-cover" />
                ) : clinic?.logo_url ? (
                  <img src={clinic.logo_url} alt="Logo Atual" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-muted text-xs">Sem logo</span>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <Input type="file" accept="image/png, image/jpeg, image/svg+xml" onChange={e => setLogoFile(e.target.files?.[0] || null)} />
                {clinic?.logo_url && (
                  <button onClick={handleRemoveLogo} className="text-sm text-error hover:underline">
                    Remover logo atual
                  </button>
                )}
              </div>
            </div>
          </div>
          <Button onClick={handleSaveIdentity} disabled={loading} className="w-full">
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Horário de Funcionamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {diasSemana.map(dia => {
            const val = hours[dia] || { aberto: false, hora_inicio: '08:00', hora_fim: '18:00' }
            return (
              <div key={dia} className="flex items-center justify-between space-x-2">
                <div className="w-24 capitalize text-sm font-medium text-main">{dia}</div>
                <label className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input type="checkbox" className="sr-only" checked={val.aberto} onChange={e => setHours({...hours, [dia]: {...val, aberto: e.target.checked}})} />
                    <div className={`block w-10 h-6 rounded-full transition-colors ${val.aberto ? 'bg-primary' : 'bg-border-card'}`}></div>
                    <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${val.aberto ? 'transform translate-x-4' : ''}`}></div>
                  </div>
                </label>
                <div className="flex items-center space-x-2">
                  <Input type="time" value={val.hora_inicio} disabled={!val.aberto} onChange={e => setHours({...hours, [dia]: {...val, hora_inicio: e.target.value}})} className="w-24 h-8 px-2 text-xs" />
                  <span className="text-muted text-sm">às</span>
                  <Input type="time" value={val.hora_fim} disabled={!val.aberto} onChange={e => setHours({...hours, [dia]: {...val, hora_fim: e.target.value}})} className="w-24 h-8 px-2 text-xs" />
                </div>
              </div>
            )
          })}
          <Button onClick={handleSaveHours} disabled={hoursLoading} className="w-full mt-4">
            {hoursLoading ? 'Salvando...' : 'Salvar Horários'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function TabUsuarios() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from('users').select('*')
      if (!error && data) setUsers(data)
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Erro ao carregar usuários')
    } finally {
      setLoading(false)
    }
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // In a real scenario, adding a user requires Admin API.
      // Assuming a custom edge function or direct insert if allowed. 
      // Often we use supabase.auth.admin.createUser but it's not available in anon client.
      // We'll mock the success for phase 1 or try insert if RLS permits.
      // "Criar via Supabase Auth Admin API"
      toast.error('Criação remota via Admin Auth necessária no backend.')
      setIsModalOpen(false)
    } catch (error) {
      toast.error('Erro ao adicionar usuário')
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Usuários do Sistema</CardTitle>
        <Button size="sm" onClick={() => setIsModalOpen(true)}><Plus className="w-4 h-4 mr-2"/> Adicionar usuário</Button>
      </CardHeader>
      <CardContent>
        {loading ? <p className="text-muted">Carregando...</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-main">
              <thead className="bg-primary-light/50 text-muted uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">E-mail</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Data de Criação</th>
                  <th className="px-4 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-border-card">
                    <td className="px-4 py-3">{u.email || u.id}</td>
                    <td className="px-4 py-3">
                      <Badge variant={u.role === 'admin' ? 'follow_up' : 'agendado'}>{u.role}</Badge>
                    </td>
                    <td className="px-4 py-3">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <button className="text-error hover:text-error/80"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Novo Usuário">
          <form onSubmit={handleAddUser} className="space-y-4">
            <div>
              <label className="text-sm font-medium">E-mail</label>
              <Input type="email" required value={newEmail} onChange={e => setNewEmail(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Senha</label>
              <Input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full">Adicionar</Button>
          </form>
        </Modal>
      </CardContent>
    </Card>
  )
}

function TabApi() {
  const [tokens, setTokens] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [rawToken, setRawToken] = useState('')

  useEffect(() => {
    fetchTokens()
  }, [])

  const fetchTokens = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from('api_tokens').select('*').order('created_at', { ascending: false })
      if (!error && data) setTokens(data)
    } catch (error) {
      console.error('Error fetching tokens:', error)
      toast.error('Erro ao carregar tokens')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateAndHash = async (token: string) => {
    const msgUint8 = new TextEncoder().encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!label) return

    const newToken = crypto.randomUUID()
    const hashed = await handleGenerateAndHash(newToken)

    try {
      const { user } = (await supabase.auth.getUser()).data
      const { error } = await supabase.from('api_tokens').insert({
        label,
        token_hash: hashed,
        ativo: true,
        created_by: user?.id
      })
      if (error) throw error

      setRawToken(newToken)
      setIsModalOpen(false)
      setLabel('')
      setIsCopyModalOpen(true)
      fetchTokens()
      toast.success('Token criado com sucesso')
    } catch (e) {
      toast.error('Erro ao gerar token')
    }
  }

  const handleDisable = async (id: string) => {
    if (!confirm('Tem certeza? Esta ação é permanente e não pode ser desfeita. O token será desabilitado imediatamente.')) return
    try {
      await supabase.from('api_tokens').update({ ativo: false }).eq('id', id)
      fetchTokens()
      toast.success('Token desabilitado')
    } catch (e) {
      toast.error('Erro ao desabilitar token')
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-warning/10 border border-warning/20 text-warning px-4 py-3 rounded-lg flex items-center">
        <ShieldAlert className="w-5 h-5 mr-3" />
        <span className="text-sm font-medium">Os tokens são necessários para todas as chamadas de API. Guarde-os em local seguro.</span>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Tokens Ativos</CardTitle>
          <Button size="sm" onClick={() => setIsModalOpen(true)}><Plus className="w-4 h-4 mr-2"/> Novo token</Button>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-muted">Carregando...</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-main">
                <thead className="bg-primary-light/50 text-muted uppercase">
                  <tr>
                    <th className="px-4 py-3 font-medium">Label</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Criado em</th>
                    <th className="px-4 py-3 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {tokens.map(t => (
                    <tr key={t.id} className="border-b border-border-card">
                      <td className="px-4 py-3 font-medium">{t.label}</td>
                      <td className="px-4 py-3">
                        {t.ativo ? <Badge variant="confirmado">Ativo</Badge> : <Badge variant="faltou">Desabilitado</Badge>}
                      </td>
                      <td className="px-4 py-3">{new Date(t.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">
                        {t.ativo && (
                          <Button variant="danger" size="sm" onClick={() => handleDisable(t.id)}>Desabilitar</Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Criar Novo Token">
            <form onSubmit={handleCreateToken} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Label (ex: N8N Produção)</label>
                <Input required value={label} onChange={e => setLabel(e.target.value)} />
              </div>
              <Button type="submit" className="w-full">Gerar Token</Button>
            </form>
          </Modal>

          <Modal isOpen={isCopyModalOpen} onClose={() => setIsCopyModalOpen(false)} title="Copie seu Token">
            <div className="space-y-4">
              <div className="bg-warning/10 text-warning px-3 py-2 border border-warning/20 rounded-md text-sm">
                Copie agora — este token não será exibido novamente
              </div>
              <div className="flex space-x-2">
                <Input readOnly value={rawToken} />
                <Button onClick={() => {
                  navigator.clipboard.writeText(rawToken)
                  toast.success('Copiado!')
                }}>Copiar</Button>
              </div>
              <Button onClick={() => setIsCopyModalOpen(false)} className="w-full" variant="secondary">Fechar</Button>
            </div>
          </Modal>
        </CardContent>
      </Card>
    </div>
  )
}

function TabKanban() {
  const references = [
    { label: 'Iniciou o Atendimento', value: 'iniciou_atendimento', variant: 'agendado' },
    { label: 'Conversando', value: 'conversando', variant: 'follow_up' },
    { label: 'Agendado', value: 'agendado', variant: 'confirmado' },
    { label: 'Compareceu', value: 'compareceu', variant: 'compareceu' },
    { label: 'Cancelou o Agendamento', value: 'cancelou_agendamento', variant: 'cancelou_agendamento' },
    { label: 'Follow Up', value: 'follow_up', variant: 'follow_up' },
    { label: 'Abandonou a Conversa', value: 'abandonou_conversa', variant: 'abandonou_conversa' },
  ]

  const handleCopy = (val: string) => {
    navigator.clipboard.writeText(val)
    toast.success('Copiado!')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Referência do CRM</CardTitle>
        <p className="text-sm text-muted">Use os valores abaixo para atualizar o status dos leads via N8N ou agente de IA</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto border border-border-card rounded-lg">
          <table className="w-full text-left text-sm text-main">
            <thead className="bg-primary-light/50 text-muted uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Coluna do Kanban</th>
                <th className="px-4 py-3 font-medium">Valor no banco</th>
              </tr>
            </thead>
            <tbody>
              {references.map((r, i) => (
                <tr key={i} className="border-b border-border-card last:border-0 hover:bg-primary-light/20">
                  <td className="px-4 py-3">
                    <Badge variant={r.variant as any}>{r.label}</Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs flex items-center justify-between">
                    <span>{r.value}</span>
                    <button onClick={() => handleCopy(r.value)} className="text-muted hover:text-primary transition-colors" title="Copiar valor">
                      <Copy className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-primary-light p-4 rounded-lg text-sm text-main italic">
          "Para atualizar o status de um lead via N8N, envie uma requisição ao Supabase atualizando o campo status da tabela leads_estetica com um dos valores acima."
        </div>
      </CardContent>
    </Card>
  )
}

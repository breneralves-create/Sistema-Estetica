import { useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useClinic } from '../../contexts/ClinicContext'
import { Avatar } from '../ui/Avatar'

export function Header() {
  const location = useLocation()
  const { user } = useAuth()
  const { clinic } = useClinic()

  const getPageTitle = () => {
    const path = location.pathname
    if (path.startsWith('/dashboard')) return 'Dashboard'
    if (path.startsWith('/crm')) return 'CRM'
    if (path.startsWith('/leads-clientes')) return 'Leads & Clientes'
    if (path.startsWith('/agenda')) return 'Agenda'
    if (path.startsWith('/configuracoes')) return 'Configurações'
    if (path.startsWith('/documentacao-api')) return 'Documentação API'
    return clinic?.nome || 'Sistema'
  }

  return (
    <header className="flex h-[72px] shrink-0 items-center justify-between bg-card mx-6 mt-4 rounded-2xl border border-border-card/60 shadow-sm px-6 md:px-8 pl-14 md:pl-8">
      <div className="flex-1"></div>
      <h1 className="text-xl font-sans font-bold text-main !text-center flex-1">
        {getPageTitle()}
      </h1>
      <div className="flex items-center space-x-4 flex-1 justify-end">
        <Avatar fallback={user?.email?.charAt(0).toUpperCase() || 'U'} />
      </div>
    </header>
  )
}

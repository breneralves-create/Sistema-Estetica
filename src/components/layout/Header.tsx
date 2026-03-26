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
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border-card bg-base px-6 md:px-8 pl-14 md:pl-8">
      <h1 className="text-2xl font-serif font-semibold text-main">
        {getPageTitle()}
      </h1>
      <div className="flex items-center space-x-4">
        <Avatar fallback={user?.email?.charAt(0).toUpperCase() || 'U'} />
      </div>
    </header>
  )
}

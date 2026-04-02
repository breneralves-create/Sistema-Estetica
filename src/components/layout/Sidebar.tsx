import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Kanban, Users, Calendar, Settings, Code, LogOut, Sun, Moon, Menu } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useClinic } from '../../contexts/ClinicContext'
import { useTheme } from '../../contexts/ThemeContext'
import { Avatar } from '../ui/Avatar'
import { cn } from '../../lib/utils'
import { useState } from 'react'

export function Sidebar() {
  const { user, role, signOut } = useAuth()
  const { clinic } = useClinic()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'CRM', path: '/crm', icon: Kanban },
    { name: 'Leads / Clientes', path: '/leads-clientes', icon: Users },
    { name: 'Agenda', path: '/agenda', icon: Calendar },
    { name: 'Configurações', path: '/configuracoes', icon: Settings },
    { name: 'Doc. API', path: '/documentacao-api', icon: Code },
  ]

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="flex flex-col items-center justify-center p-6 border-b border-border-card">
        {clinic?.logo_url ? (
          <img src={clinic.logo_url} alt={clinic.nome} className="max-h-20 object-contain mb-4" />
        ) : (
          <Avatar 
            fallback={clinic?.nome?.charAt(0).toUpperCase() || 'C'} 
            className="h-16 w-16 mb-4 text-2xl" 
          />
        )}
        <h2 className="font-serif text-lg text-center font-medium leading-tight flex items-center justify-center gap-2">
          {clinic?.nome || 'Clínica de Estética'}
          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full border border-primary/20">V2</span>
        </h2>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path)
            const Icon = item.icon
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center space-x-3 rounded-lg px-3 py-2 transition-colors text-sm font-medium",
                    isActive 
                      ? "bg-sidebar-active text-primary" 
                      : "text-muted hover:bg-sidebar-active/50 hover:text-main"
                  )}
                  style={{ borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent' }}
                >
                  <Icon className="h-[18px] w-[18px]" />
                  <span>{item.name}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-border-card mt-auto space-y-4">
        <div className="flex items-center space-x-3 px-2">
          <Avatar fallback={user?.email?.charAt(0).toUpperCase() || 'U'} className="h-8 w-8 text-xs" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{user?.email}</p>
          </div>
        </div>
        <div className="flex items-center justify-between px-2 text-muted">
          <button 
            onClick={signOut}
            className="flex items-center space-x-2 text-sm hover:text-main transition-colors"
          >
            <LogOut className="h-[18px] w-[18px]" />
            <span>Sair</span>
          </button>
          <button onClick={toggleTheme} className="hover:text-main transition-colors p-1" title="Toggle theme">
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="md:hidden fixed top-3 left-4 z-50 p-2 text-main focus:outline-none"
      >
        <Menu className="h-5 w-5" />
      </button>

      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity" 
          onClick={() => setIsOpen(false)} 
        />
      )}

      <aside 
        className={cn(
          "fixed top-0 left-0 z-50 h-screen w-[240px] bg-sidebar border-r border-border-card shadow-sm transition-transform duration-300 ease-in-out md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent />
      </aside>
    </>
  )
}

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ClinicProvider } from './contexts/ClinicContext'
import { Layout } from './components/layout/Layout'

import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { CRM } from './pages/CRM'
import { LeadsClientes } from './pages/LeadsClientes'
import { Agenda } from './pages/Agenda'
import { Configuracoes } from './pages/Configuracoes'
import { DocumentacaoAPI } from './pages/DocumentacaoAPI'

function PrivateRoute({ children, reqAdmin = false }: { children: React.ReactNode, reqAdmin?: boolean }) {
  const { user, role, loading } = useAuth()

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-base text-main">Carregando...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (reqAdmin && role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ClinicProvider>
          <Router>
            <Toaster position="top-right" />
            <Routes>
              <Route path="/login" element={<Login />} />
              
              <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/crm" element={<CRM />} />
                <Route path="/leads-clientes" element={<LeadsClientes />} />
                <Route path="/agenda" element={<Agenda />} />
                <Route path="/documentacao-api" element={<DocumentacaoAPI />} />
                
                {/* Admin Only */}
                <Route 
                  path="/configuracoes" 
                  element={
                    <PrivateRoute reqAdmin>
                      <Configuracoes />
                    </PrivateRoute>
                  } 
                />
              </Route>

              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Router>
        </ClinicProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

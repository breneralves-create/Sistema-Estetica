import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Preencha os campos de e-mail e senha')
      return
    }

    try {
      setLoading(true)
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast.error('E-mail ou senha inválidos')
      } else {
        navigate('/dashboard')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-base">
      <div className="hidden w-[40%] flex-col justify-center bg-primary p-12 text-white lg:flex relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="mb-4 font-serif text-5xl font-semibold leading-tight">Clínica de Estética</h1>
          <p className="font-sans text-primary-light text-lg">Excelência e cuidado para a sua beleza.</p>
        </div>
        <div className="absolute -left-12 -top-12 h-64 w-64 rounded-full bg-primary-hover opacity-50 blur-3xl"></div>
        <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-white opacity-10 blur-3xl"></div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center p-8 sm:p-12 sm:w-[60%] w-full">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center lg:text-left">
            <h2 className="font-serif text-3xl font-semibold text-main">Bem-vindo(a)</h2>
            <p className="mt-2 text-sm text-muted">Acesse o sistema com suas credenciais.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <Input
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail className="h-5 w-5" />}
                required
              />
              
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  icon={<Lock className="h-5 w-5" />}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-main focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full text-base"
              disabled={loading}
              size="lg"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

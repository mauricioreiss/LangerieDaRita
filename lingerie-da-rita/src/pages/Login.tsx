import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Store, Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { showToast, ToastContainer } from '@/components/ui/Toast'

export function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { signIn } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) {
      showToast('Preencha todos os campos', 'warning')
      return
    }

    setIsLoading(true)
    // Se ja tem @ e um email real, usa direto. Senao, adiciona @app.interno
    const email = username.includes('@')
      ? username.trim().toLowerCase()
      : username.trim().toLowerCase() + '@app.interno'
    const { error } = await signIn(email, password)
    setIsLoading(false)

    if (error) {
      showToast('Usuário ou senha incorretos', 'error')
      return
    }

    showToast('Bem-vinda de volta!', 'success')
    navigate('/admin')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary to-primary-dark flex flex-col items-center justify-center px-6">
      <ToastContainer />

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Store className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Lingerie da Rita</h1>
          <p className="text-white/70 text-sm mt-1">Painel Administrativo</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 shadow-xl space-y-4">
          <Input
            label="Usuário"
            type="text"
            placeholder="Seu email ou usuario"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoComplete="username"
          />

          <div className="relative">
            <Input
              label="Senha"
              type={showPassword ? 'text' : 'password'}
              placeholder="Sua senha"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[38px] p-1 text-text-light hover:text-text"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <Button
            type="submit"
            isLoading={isLoading}
            className="w-full"
            size="lg"
          >
            Entrar
          </Button>
        </form>

        <p className="text-center text-white/50 text-xs mt-6">
          Acesso exclusivo para administradoras
        </p>
      </div>
    </div>
  )
}

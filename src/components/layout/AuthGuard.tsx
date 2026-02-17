import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { Loader2 } from 'lucide-react'

interface AuthGuardProps {
  children: React.ReactNode
  requireAdmin?: boolean
}

export function AuthGuard({ children, requireAdmin = false }: AuthGuardProps) {
  const { user, isLoading, isAdmin } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/login')
    }
    if (!isLoading && requireAdmin && !isAdmin) {
      navigate('/')
    }
  }, [user, isLoading, isAdmin, requireAdmin, navigate])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-text-light">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!user) return null
  if (requireAdmin && !isAdmin) return null

  return <>{children}</>
}

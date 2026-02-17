import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Home, DollarSign, BarChart3, Package, LogOut, Settings } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { ToastContainer } from '@/components/ui/Toast'
import { OfflineBar } from '@/components/ui/OfflineBar'

const navItems = [
  { path: '/admin', icon: Home, label: 'Início' },
  { path: '/admin/financeiro', icon: DollarSign, label: 'Financeiro' },
  { path: '/admin/relatorios', icon: BarChart3, label: 'Relatórios' },
  { path: '/admin/estoque', icon: Package, label: 'Estoque' },
  { path: '/admin/configuracoes', icon: Settings, label: 'Config' },
]

export function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { signOut, profile } = useAuthStore()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-surface pb-20">
      <OfflineBar />
      <ToastContainer />

      {/* Header */}
      <header className="bg-white border-b border-border px-4 py-3 sticky top-0 z-40">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div>
            <h1 className="text-lg font-bold text-primary">Lingerie da Rita</h1>
            <p className="text-xs text-text-light">Olá, {profile?.full_name?.split(' ')[0] || 'Rita'}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="p-2 rounded-xl hover:bg-surface transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Sair"
          >
            <LogOut className="w-5 h-5 text-text-light" />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-4">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-border z-40 safe-area-bottom">
        <div className="max-w-lg mx-auto flex">
          {navItems.map(item => {
            const isActive = location.pathname === item.path
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex-1 flex flex-col items-center gap-1 py-2 pt-3 min-h-[56px] transition-colors ${
                  isActive ? 'text-primary' : 'text-text-light'
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
                <span className={`text-xs ${isActive ? 'font-semibold' : ''}`}>
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

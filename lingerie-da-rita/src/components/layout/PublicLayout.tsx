import { Outlet, useNavigate } from 'react-router-dom'
import { ShoppingBag, Store } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { ToastContainer } from '@/components/ui/Toast'
import { OfflineBar } from '@/components/ui/OfflineBar'

export function PublicLayout() {
  const navigate = useNavigate()
  const itemCount = useCartStore(state => state.getItemCount())

  return (
    <div className="min-h-screen bg-surface pb-20">
      <OfflineBar />
      <ToastContainer />

      {/* Header */}
      <header className="bg-primary text-white px-4 py-3 sticky top-0 z-40">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <button onClick={() => navigate('/')} className="flex items-center gap-2">
            <Store className="w-6 h-6" />
            <h1 className="text-lg font-bold">Lingerie da Rita</h1>
          </button>
          <button
            onClick={() => navigate('/carrinho')}
            className="relative p-2 rounded-xl hover:bg-white/10 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <ShoppingBag className="w-5 h-5" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-white text-primary text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-4">
        <Outlet />
      </main>
    </div>
  )
}

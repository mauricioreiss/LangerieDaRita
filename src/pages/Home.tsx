import { useNavigate } from 'react-router-dom'
import { Store, ShoppingBag, Lock } from 'lucide-react'

export function Home() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary to-primary-dark flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
          <Store className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Lingerie da Rita</h1>
        <p className="text-white/60 text-sm mb-10">Moda intima com carinho</p>

        <div className="space-y-3">
          <button
            onClick={() => navigate('/catalogo')}
            className="w-full flex items-center justify-center gap-3 bg-white text-primary font-bold py-4 px-6 rounded-2xl text-lg shadow-lg active:scale-[0.98] transition-transform"
          >
            <ShoppingBag className="w-6 h-6" />
            Ver Catalogo
          </button>

          <button
            onClick={() => navigate('/login')}
            className="w-full flex items-center justify-center gap-3 bg-white/15 text-white font-medium py-4 px-6 rounded-2xl text-lg backdrop-blur-sm active:scale-[0.98] transition-transform"
          >
            <Lock className="w-5 h-5" />
            Painel Admin
          </button>
        </div>

        <p className="text-white/30 text-xs mt-10">
          Lingerie da Rita &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}

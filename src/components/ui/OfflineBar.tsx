import { WifiOff } from 'lucide-react'
import { useOnline } from '@/hooks/useOnline'

export function OfflineBar() {
  const isOnline = useOnline()

  if (isOnline) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[110] bg-warning text-white px-4 py-2 flex items-center justify-center gap-2 animate-slide-down">
      <WifiOff className="w-4 h-4" />
      <p className="text-sm font-medium">Sem internet - Verifique sua conexão</p>
    </div>
  )
}

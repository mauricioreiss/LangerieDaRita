import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react'

export interface ToastData {
  id: string
  message: string
  type: 'success' | 'error' | 'warning'
}

let toastListeners: ((toast: ToastData) => void)[] = []

export function showToast(message: string, type: ToastData['type'] = 'success') {
  const toast: ToastData = { id: Date.now().toString(), message, type }
  toastListeners.forEach(listener => listener(toast))

  if (type === 'success' && navigator.vibrate) {
    navigator.vibrate(100)
  }
}

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
}

const colors = {
  success: 'bg-success text-white',
  error: 'bg-danger text-white',
  warning: 'bg-warning text-white',
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastData[]>([])

  useEffect(() => {
    const listener = (toast: ToastData) => {
      setToasts(prev => [...prev, toast])
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toast.id))
      }, 3000)
    }
    toastListeners.push(listener)
    return () => {
      toastListeners = toastListeners.filter(l => l !== listener)
    }
  }, [])

  return (
    <div className="fixed top-4 right-4 left-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => {
        const Icon = icons[toast.type]
        return (
          <div
            key={toast.id}
            className={`${colors[toast.type]} px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 pointer-events-auto animate-slide-down`}
          >
            <Icon className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium flex-1">{toast.message}</p>
            <button
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="p-1 rounded-lg hover:bg-white/20"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

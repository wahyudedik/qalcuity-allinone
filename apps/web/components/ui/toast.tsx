'use client'

import { useState, useEffect, useCallback, createContext, useContext, type PropsWithChildren } from 'react'
import { Check, X, AlertTriangle, Info } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastContextType {
  addToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    // Fallback if used outside provider — return a simple function
    return {
      addToast: (message: string, type: ToastType = 'success') => {
        // Create a temporary toast element
        const id = `toast-${Date.now()}`
        const toastEl = document.createElement('div')
        toastEl.id = id
        toastEl.className = `fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all duration-300 ${type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : type === 'warning' ? 'bg-yellow-600' : 'bg-blue-600'
          }`
        toastEl.innerHTML = `<span class="inline-flex items-center gap-1.5">${message}</span>`
        document.body.appendChild(toastEl)
        setTimeout(() => {
          if (document.getElementById(id)) {
            toastEl.remove()
          }
        }, 4000)
      }
    }
  }
  return context
}

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setToasts(prev => [...prev, { id, message, type }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

const iconMap: Record<ToastType, typeof Check> = {
  success: Check,
  error: X,
  warning: AlertTriangle,
  info: Info,
}

const bgMap: Record<ToastType, string> = {
  success: 'bg-green-600',
  error: 'bg-red-600',
  warning: 'bg-yellow-600',
  info: 'bg-blue-600',
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id)
    }, 4000)
    return () => clearTimeout(timer)
  }, [toast.id, onRemove])

  const Icon = iconMap[toast.type]

  return (
    <div
      className={`px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all duration-300 animate-slide-in ${bgMap[toast.type]}`}
    >
      <span className="inline-flex items-center gap-1.5">
        <Icon className="h-4 w-4" />
        {toast.message}
      </span>
      <button
        onClick={() => onRemove(toast.id)}
        className="ml-2 inline-flex items-center rounded-full p-0.5 hover:bg-white/20 transition-colors"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}
